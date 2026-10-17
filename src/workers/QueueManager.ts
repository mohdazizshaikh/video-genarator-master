/**
 * QueueManager – Phase 4.1
 *
 * Manages BullMQ queue instances backed by Redis.
 * Falls back gracefully when Redis is unavailable (dev mode).
 */
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { Config } from "../config";
import { logger } from "../logger";

export const QUEUE_NAMES = {
  INGEST: "ingest_queue",
  PLANNING: "planning_queue",
  RENDER: "render_queue",
  PUBLISH: "publish_queue",
  DEADLETTER: "deadletter_queue",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

let redisConnection: IORedis | null = null;

export function getRedisConnection(config: Config): IORedis {
  if (!redisConnection) {
    redisConnection = new IORedis({
      host: config.redisHost,
      port: config.redisPort,
      password: config.redisPassword || undefined,
      maxRetriesPerRequest: null, // required by BullMQ
      enableReadyCheck: false,
      lazyConnect: true,
    });

    redisConnection.on("error", (err) => {
      logger.warn({ err: err.message }, "Redis connection error – queue features degraded");
    });
  }
  return redisConnection;
}

export async function testRedisConnection(config: Config): Promise<boolean> {
  try {
    const conn = getRedisConnection(config);
    if (conn.status !== "ready" && conn.status !== "connecting") {
      await conn.connect();
    }
    await conn.ping();
    logger.info({ host: config.redisHost, port: config.redisPort }, "Redis connected");
    return true;
  } catch (err) {
    logger.warn({ err }, "Redis unavailable – BullMQ queues disabled. Using in-memory queue fallback.");
    return false;
  }
}

export function createQueue(name: QueueName, config: Config): Queue {
  return new Queue(name, {
    connection: getRedisConnection(config),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { age: 86400 }, // 24h
      removeOnFail: { age: 604800 },    // 7 days
    },
  });
}

export function createRenderQueue(config: Config): Queue {
  return new Queue(QUEUE_NAMES.RENDER, {
    connection: getRedisConnection(config),
    defaultJobOptions: {
      attempts: 2,                       // max 2 retries, then skip
      backoff: { type: "fixed", delay: 30000 },
      removeOnComplete: { age: 86400 },
      removeOnFail: { age: 604800 },
    },
  });
}

export function createPublishQueue(config: Config): Queue {
  return new Queue(QUEUE_NAMES.PUBLISH, {
    connection: getRedisConnection(config),
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "exponential", delay: 60000 },
      removeOnComplete: { age: 86400 },
      removeOnFail: { age: 604800 },
    },
  });
}

export async function closeRedis(): Promise<void> {
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
  }
}
