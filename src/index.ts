import path from "path";
import fs from "fs-extra";

import { Config } from "./config";
import { logger } from "./logger";
import { Server } from "./server/server";
import { runEnvironmentValidation } from "./config/validate";
import { MusicManager } from "./short-creator/music";
import { ShutdownCoordinator, installShutdownHandlers } from "./lifecycle/ShutdownCoordinator";
import { closeRedis } from "./workers/QueueManager";
import { shutdownChatterbox } from "./short-creator/libraries/Chatterbox";

async function main() {
  runEnvironmentValidation();

  const config = new Config();
  try {
    config.ensureConfig();
  } catch (err: unknown) {
    logger.error(err, "Error in config");
    process.exit(1);
  }

  logger.info("Initializing applications...");

  const musicManager = new MusicManager(config);
  try {
    logger.debug("checking music files");
    musicManager.ensureMusicFilesExist();
  } catch (error: unknown) {
    logger.error(error, "Missing music files");
    process.exit(1);
  }

  // Create a deferred ShortCreator that resolves once all heavy libs are ready.
  // The server starts immediately so Replit can detect the port.
  let shortCreatorResolve: (sc: import("./short-creator/ShortCreator.js").ShortCreator) => void;
  let shortCreatorReject: (err: unknown) => void;
  const shortCreatorPromise = new Promise<import("./short-creator/ShortCreator.js").ShortCreator>(
    (resolve, reject) => {
      shortCreatorResolve = resolve;
      shortCreatorReject = reject;
    }
  );

  logger.debug("Starting HTTP server (libraries initializing in background)...");
  const server = new Server(config, shortCreatorPromise);
  server.start();
  const shutdown = new ShutdownCoordinator();
  shutdown.register("http-ingress-and-schedule-runner", "stop", () => server.stopAccepting());
  shutdown.register("http-connections", "drain", () => server.drain());
  shutdown.register("redis", "cleanup", () => closeRedis());
  shutdown.register("chatterbox", "cleanup", () => shutdownChatterbox());
  installShutdownHandlers(shutdown, process, (result) => {
    if (result.ok) logger.info("Graceful shutdown completed");
    else logger.error(result, "Shutdown incomplete; unfinished work requires recovery");
  });
  const registerWorker = (name: string, worker: { pause(): Promise<void>; close(): Promise<void> }) => {
    shutdown.register(`${name}-pause`, "stop", () => worker.pause());
    shutdown.register(`${name}-drain`, "drain", () => worker.close());
  };
  let initialization: Promise<void> = Promise.resolve();
  shutdown.register("background-initialization", "drain", () => initialization);

  // Initialize heavy libraries in background
  initialization = (async () => {
    try {
      const skipRuntimeInstall = process.env.SKIP_RUNTIME_INSTALL === "true";
      if (skipRuntimeInstall) {
        logger.info("Skipping runtime install because SKIP_RUNTIME_INSTALL=true");
      } else {
        const { install } = await import("./scripts/install.js");
        await install();
        if (shutdown.isShuttingDown) return;
      }

      logger.debug("initializing remotion");
      const { Remotion } = await import("./short-creator/libraries/Remotion.js");
      const remotion = await Remotion.init(config);
      if (shutdown.isShuttingDown) return;

      logger.debug("initializing kokoro");
      const { Kokoro } = await import("./short-creator/libraries/Kokoro.js");
      const kokoro = await Kokoro.init(config.kokoroModelPrecision);
      if (shutdown.isShuttingDown) return;

      logger.debug("initializing whisper");
      const { Whisper } = await import("./short-creator/libraries/Whisper.js");
      const whisper = await Whisper.init(config);
      if (shutdown.isShuttingDown) return;

      logger.debug("initializing ffmpeg");
      const { FFMpeg } = await import("./short-creator/libraries/FFmpeg.js");
      const ffmpeg = await FFMpeg.init();
      if (shutdown.isShuttingDown) return;

      const { PexelsAPI } = await import("./short-creator/libraries/Pexels.js");
      const pexelsApi = new PexelsAPI(config.pexelsApiKey);

      if (!config.runningInDocker) {
        if (fs.existsSync(config.installationSuccessfulPath)) {
          logger.info("the installation is successful - starting the server");
        } else {
          logger.info(
            "testing if the installation was successful - this may take a while...",
          );
          try {
            const audioBuffer = (await kokoro.generate("hi", "af_heart")).audio;
            const { FFMpeg: FF2 } = await import("./short-creator/libraries/FFmpeg.js");
            const ff2 = await FF2.init();
            await ff2.createMp3DataUri(audioBuffer);
            await pexelsApi.findVideo(["dog"], 2.4);
            const testVideoPath = path.join(config.tempDirPath, "test.mp4");
            await remotion.testRender(testVideoPath);
            fs.rmSync(testVideoPath, { force: true });
            fs.writeFileSync(config.installationSuccessfulPath, "ok", {
              encoding: "utf-8",
            });
            logger.info("the installation was successful");
          } catch (error: unknown) {
            logger.warn(
              error,
              "Installation check failed - some features may not work until dependencies are ready",
            );
          }
        }
      }

      if (shutdown.isShuttingDown) return;
      logger.debug("initializing the short creator");
      const { ShortCreator } = await import("./short-creator/ShortCreator.js");
      if (shutdown.isShuttingDown) return;
      const shortCreator = new ShortCreator(
        config,
        remotion,
        kokoro,
        whisper,
        ffmpeg,
        pexelsApi,
        musicManager,
      );

      shutdown.register("short-creator", "engines", () => shortCreator.close());
      shortCreatorResolve!(shortCreator);
      logger.info("All libraries initialized — video generation is ready");

      // Phase 4: Start BullMQ workers if Redis is available
      if (config.redisEnabled) {
        const { testRedisConnection } = await import("./workers/QueueManager.js");
        const redisOk = await testRedisConnection(config);
        if (shutdown.isShuttingDown) return;
        if (redisOk) {
          const { RenderWorker } = await import("./workers/RenderWorker.js");
          const { PublishWorker } = await import("./workers/PublishWorker.js");
          const { DeadLetterWorker } = await import("./workers/DeadLetterWorker.js");
          if (shutdown.isShuttingDown) return;
          const renderWorker = new RenderWorker(config, shortCreator);
          registerWorker("render-worker", renderWorker);
          const publishWorker = new PublishWorker(config);
          registerWorker("publish-worker", publishWorker);
          const deadLetterWorker = new DeadLetterWorker(config);
          registerWorker("dead-letter-worker", deadLetterWorker);
          logger.info("BullMQ workers started (render, publish, deadletter)");

        } else {
          logger.warn("Redis unavailable – BullMQ workers NOT started.");
        }
      }

      // Phase 6: Start cron scheduler
      const { SchedulerService } = await import("./services/SchedulerService.js");
      if (shutdown.isShuttingDown) return;
      const scheduler = new SchedulerService(config, shortCreator);
      shutdown.register("source-scheduler", "stop", () => scheduler.stop());
      shutdown.register("source-scheduler-drain", "drain", () => scheduler.close());
      scheduler.start();

    } catch (err: unknown) {
      logger.error(err, "Fatal error during library initialization");
      shortCreatorReject!(err);
    }
  })();
}

main().catch((error: unknown) => {
  logger.error(error, "Error starting server");
});
