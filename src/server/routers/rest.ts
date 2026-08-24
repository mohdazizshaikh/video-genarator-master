import express from "express";
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";
import fs from "fs-extra";
import path from "path";

import { validateCreateShortInput, validateVideoId } from "../validator";
import { ShortCreator } from "../../short-creator/ShortCreator";
import { logger } from "../../logger";
import { Config } from "../../config";
import { ReportStore } from "../../db/ReportStore";
import { ScriptPlanStore } from "../../db/ScriptPlanStore";
import { VideoMetadataStore } from "../../db/VideoMetadataStore";
import { CustomNewsSourceStore } from "../../db/CustomNewsSourceStore";
import { ReportMerger } from "../../aggregator/ReportMerger";
import { RssFetcher } from "../../news-fetcher/RssFetcher";
import { AiLlmGenerator, configureLlmDefaults, type AutoScriptStyle, type HookOption } from "../../script-generator/AiLlmGenerator";
import { getAuthenticatedTenantId } from "../auth";

// Resolve a user-supplied file name safely inside a base directory,
// rejecting any path traversal attempt (e.g. ../../.env or %2e%2e).
function safePathInDir(dirPath: string, fileName: string): string | null {
  const base = path.resolve(dirPath);
  const candidate = path.resolve(base, path.basename(fileName));
  if (candidate !== path.join(base, path.basename(fileName))) return null;
  if (path.dirname(candidate) !== base) return null;
  if (!candidate.startsWith(base + path.sep)) return null;
  return candidate;
}

// todo abstract class
export class APIRouter {
  public router: express.Router;
  private shortCreator: ShortCreator;
  private config: Config;
  private reportStore: ReportStore;
  private scriptPlanStore: ScriptPlanStore;
  private videoMetadataStore: VideoMetadataStore;
  private customNewsSourceStore: CustomNewsSourceStore;

  constructor(config: Config, shortCreator: ShortCreator) {
    this.config = config;
    this.router = express.Router();
    this.shortCreator = shortCreator;
    this.reportStore = new ReportStore(config.dataDirPath);
    this.scriptPlanStore = new ScriptPlanStore(config.dataDirPath);
    this.videoMetadataStore = new VideoMetadataStore(config.dataDirPath);
    this.customNewsSourceStore = new CustomNewsSourceStore(config.dataDirPath);

    configureLlmDefaults({
      provider: config.aiLlmProvider,
      openrouterApiKey: config.openrouterApiKey,
      openrouterUrl: config.openrouterUrl,
      openrouterModel: config.openrouterModel,
      openrouterModels: config.openrouterModels,
    });

    this.router.use(express.json());

    this.setupRoutes();
  }

  private setupRoutes() {
    this.router.post(
      "/short-video",
      async (req: ExpressRequest, res: ExpressResponse) => {
        try {
          const input = validateCreateShortInput(req.body);
          logger.info({ input }, "Queueing short video");

          const category = input.category || input.contentCategory || input.config.category || "News";
          if (!input.config.category) {
            input.config.category = category;
          }

          const videoId = this.shortCreator.addToQueue(
            input.scenes,
            input.config,
            input.config.videoType,
            input.config.subtitleLanguage,
          );

          res.status(201).json({
            videoId,
          });
        } catch (error: unknown) {
          logger.error(error, "Error validating input");

          // Handle validation errors specifically
          if (error instanceof Error && error.message.startsWith("{")) {
            try {
              const errorData = JSON.parse(error.message);
              res.status(400).json({
                error: "Validation failed",
                message: errorData.message,
                missingFields: errorData.missingFields,
              });
              return;
            } catch (parseError: unknown) {
              logger.error(parseError, "Error parsing validation error");
            }
          }

          // Fallback for other errors
          res.status(400).json({
            error: "Invalid input",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      },
    );

    this.router.get(
      "/short-video/:videoId/status",
      async (req: ExpressRequest, res: ExpressResponse) => {
        try {
          const videoId = validateVideoId(req.params.videoId);
          const status = this.shortCreator.status(videoId);
          res.status(200).json({
            status,
          });
        } catch (error: unknown) {
          logger.error(error, "Error validating video ID");
          res.status(400).json({
            error: error instanceof Error ? error.message : "Invalid video ID",
          });
        }
      },
    );

    this.router.get(
      "/music-tags",
      (req: ExpressRequest, res: ExpressResponse) => {
        res.status(200).json(this.shortCreator.ListAvailableMusicTags());
      },
    );

    this.router.get("/voices", (req: ExpressRequest, res: ExpressResponse) => {
      res.status(200).json(this.shortCreator.ListAvailableVoices());
    });

    this.router.get(
      "/short-video/:videoId/metadata",
      async (req: ExpressRequest, res: ExpressResponse) => {
        try {
          const videoId = validateVideoId(req.params.videoId);
          const metadata = await this.videoMetadataStore.get(videoId, getAuthenticatedTenantId(req) ?? undefined);
          if (!metadata) {
            res.status(404).json({ error: "Video metadata not found" });
            return;
          }
          res.status(200).json(metadata);
        } catch (error: unknown) {
          logger.error(error, "Error fetching video metadata");
          res.status(400).json({
            error: error instanceof Error ? error.message : "Invalid video ID",
          });
        }
      },
    );

    this.router.get(
      "/short-video/:videoId/render-path",
      (req: ExpressRequest, res: ExpressResponse) => {
        const videoId = req.params.videoId;
        if (!videoId) {
          res.status(400).json({ error: "videoId is required" });
          return;
        }
        const videoPath = this.shortCreator.getVideoPath(videoId);
        if (!videoPath || !fs.existsSync(videoPath)) {
          res.status(404).json({ error: "Rendered video not found" });
          return;
        }
        res.status(200).json({ path: videoPath });
      },
    );

    this.router.get(
      "/short-videos",
      (req: ExpressRequest, res: ExpressResponse) => {
        const videos = this.shortCreator.listAllVideos();
        res.status(200).json({
          videos,
        });
      },
    );

    this.router.delete(
      "/short-video/:videoId",
      (req: ExpressRequest, res: ExpressResponse) => {
        const { videoId } = req.params;
        if (!videoId) {
          res.status(400).json({
            error: "videoId is required",
          });
          return;
        }
        this.shortCreator.deleteVideo(videoId);
        res.status(200).json({
          success: true,
        });
      },
    );

    this.router.get(
      "/tmp/:tmpFile",
      (req: ExpressRequest, res: ExpressResponse) => {
        const { tmpFile } = req.params;
        if (!tmpFile) {
          res.status(400).json({
            error: "tmpFile is required",
          });
          return;
        }
        const tmpFilePath = safePathInDir(this.config.tempDirPath, tmpFile);
        if (!tmpFilePath || !fs.existsSync(tmpFilePath)) {
          res.status(404).json({
            error: "tmpFile not found",
          });
          return;
        }

        if (tmpFile.endsWith(".mp3")) {
          res.setHeader("Content-Type", "audio/mpeg");
        }
        if (tmpFile.endsWith(".wav")) {
          res.setHeader("Content-Type", "audio/wav");
        }
        if (tmpFile.endsWith(".mp4")) {
          res.setHeader("Content-Type", "video/mp4");
        }
        if (tmpFile.endsWith(".jpg") || tmpFile.endsWith(".jpeg")) {
          res.setHeader("Content-Type", "image/jpeg");
        }
        if (tmpFile.endsWith(".png")) {
          res.setHeader("Content-Type", "image/png");
        }

        const tmpFileStream = fs.createReadStream(tmpFilePath);
        tmpFileStream.on("error", (error) => {
          logger.error(error, "Error reading tmp file");
          res.status(500).json({
            error: "Error reading tmp file",
            tmpFile,
          });
        });
        tmpFileStream.pipe(res);
      },
    );

    this.router.get(
      "/music/:fileName",
      (req: ExpressRequest, res: ExpressResponse) => {
        const { fileName } = req.params;
        if (!fileName) {
          res.status(400).json({
            error: "fileName is required",
          });
          return;
        }
        const musicFilePath = safePathInDir(this.config.musicDirPath, fileName);
        if (!musicFilePath || !fs.existsSync(musicFilePath)) {
          res.status(404).json({
            error: "music file not found",
          });
          return;
        }
        const musicFileStream = fs.createReadStream(musicFilePath);
        musicFileStream.on("error", (error) => {
          logger.error(error, "Error reading music file");
          res.status(500).json({
            error: "Error reading music file",
            fileName,
          });
        });
        musicFileStream.pipe(res);
      },
    );

    this.router.get(
      "/short-video/:videoId",
      (req: ExpressRequest, res: ExpressResponse) => {
        try {
          const { videoId } = req.params;
          if (!videoId) {
            res.status(400).json({
              error: "videoId is required",
            });
            return;
          }
          const video = this.shortCreator.getVideo(videoId);
          res.setHeader("Content-Type", "video/mp4");
          res.setHeader(
            "Content-Disposition",
            `inline; filename=${videoId}.mp4`,
          );
          res.send(video);
        } catch (error: unknown) {
          logger.error(error, "Error getting video");
          res.status(404).json({
            error: "Video not found",
          });
        }
      },
    );

    this.router.get(
      "/news-sources",
      async (req: ExpressRequest, res: ExpressResponse) => {
        const rssFetcher = new RssFetcher(this.config.dataDirPath);
        res.status(200).json(rssFetcher.listSourcesSync());
      },
    );

    this.router.post(
      "/news-sources/custom",
      async (req: ExpressRequest, res: ExpressResponse) => {
        try {
          const { name, url, category, subCategory } = req.body;
          if (!name || !url || !category) {
            res.status(400).json({ error: "name, url, and category are required" });
            return;
          }

          let parsedUrl: URL;
          try {
            parsedUrl = new URL(String(url));
          } catch {
            res.status(400).json({ error: "Invalid source URL" });
            return;
          }

          if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            res.status(400).json({ error: "Source URL must use http or https" });
            return;
          }

          const rssFetcher = new RssFetcher(this.config.dataDirPath);
          const validation = await rssFetcher.validateFeedUrl(parsedUrl.toString());
          if (!validation.ok) {
            res.status(400).json({ error: `Feed validation failed: ${validation.reason}` });
            return;
          }

          const record = await this.customNewsSourceStore.add({
            name: String(name),
            url: parsedUrl.toString(),
            category: String(category),
            subCategory: subCategory ? String(subCategory) : undefined,
          });

          res.status(201).json({ source: record });
        } catch (error: unknown) {
          logger.error(error, "Error adding custom news source");
          const message = error instanceof Error ? error.message : "Failed to add custom news source";
          const statusCode = message.includes("already exists") ? 400 : 500;
          res.status(statusCode).json({ error: message });
        }
      },
    );

    this.router.get(
      "/reports",
      async (req: ExpressRequest, res: ExpressResponse) => {
        try {
          const reports = await this.reportStore.listForTenant(getAuthenticatedTenantId(req) ?? "");
          res.status(200).json({ reports });
        } catch (error: unknown) {
          logger.error(error, "Error listing reports");
          res.status(500).json({ error: "Failed to list reports" });
        }
      },
    );

    this.router.get(
      "/reports/:reportId",
      async (req: ExpressRequest, res: ExpressResponse) => {
        try {
          const report = await this.reportStore.getForTenant(getAuthenticatedTenantId(req) ?? "", req.params.reportId);
          if (!report) {
            res.status(404).json({ error: "Report not found" });
            return;
          }
          res.status(200).json({ report });
        } catch (error: unknown) {
          logger.error(error, "Error fetching report");
          res.status(500).json({ error: "Failed to fetch report" });
        }
      },
    );

    this.router.post(
      "/reports/fetch",
      async (req: ExpressRequest, res: ExpressResponse) => {
        try {
          const rssFetcher = new RssFetcher(this.config.dataDirPath);
          const availableSources = rssFetcher.listSourcesSync();
          const sourceId = req.body.sourceId || availableSources[0]?.id;
          if (!sourceId) {
            res.status(400).json({ error: "No sourceId provided and no default source available" });
            return;
          }

          const source = availableSources.find((item) => item.id === sourceId);
          if (!source) {
            res.status(404).json({ error: "Source not found" });
            return;
          }

          const stories = await rssFetcher.fetchStories(sourceId);

          const insertedReports = [];
          for (const story of stories) {
            const record = await this.reportStore.add({
              tenantId: getAuthenticatedTenantId(req) ?? "",
              sourceId: source.id,
              sourceName: source.name,
              category: source.category || "General",
              title: story.title,
              content: story.content,
              link: story.link,
              pubDate: story.pubDate,
            });
            insertedReports.push(record);
          }

          res.status(201).json({
            inserted: insertedReports.length,
            reports: insertedReports,
          });
        } catch (error: unknown) {
          logger.error(error, "Error fetching reports");
          res.status(500).json({ error: "Failed to fetch reports" });
        }
      },
    );

    this.router.post(
      "/reports/merge",
      async (req: ExpressRequest, res: ExpressResponse) => {
        try {
          const category = req.body.category || "World";
          const maxDuration = Number(req.body.maxDuration) || 120;

          const reports = await this.reportStore.listForTenant(getAuthenticatedTenantId(req) ?? "");
          if (reports.length === 0) {
            res.status(404).json({ error: "No reports available to merge" });
            return;
          }

          const plan = ReportMerger.mergeReports(reports, category, maxDuration);
          const saved = await this.scriptPlanStore.add({ ...plan, tenantId: getAuthenticatedTenantId(req) ?? "" });

          await Promise.all(
            reports
              .filter((item) => item.category.toLowerCase() === category.toLowerCase())
              .map((item) => this.reportStore.updateStatusForTenant(getAuthenticatedTenantId(req) ?? "", item.id, "merged")),
          );

          res.status(201).json({ plan: saved });
        } catch (error: unknown) {
          logger.error(error, "Error merging reports");
          res.status(500).json({ error: "Failed to merge reports" });
        }
      },
    );

    this.router.get(
      "/script-plans",
      async (req: ExpressRequest, res: ExpressResponse) => {
        try {
          const plans = await this.scriptPlanStore.listForTenant(getAuthenticatedTenantId(req) ?? "");
          res.status(200).json({ plans });
        } catch (error: unknown) {
          logger.error(error, "Error listing script plans");
          res.status(500).json({ error: "Failed to list script plans" });
        }
      },
    );

    this.router.post(
      "/auto-script/translate",
      async (req: ExpressRequest, res: ExpressResponse) => {
        try {
          const {
            text,
            sourceLanguage,
            targetLanguage,
          }: {
            text?: string;
            sourceLanguage?: string;
            targetLanguage?: string;
          } = req.body;

          if (!text || !sourceLanguage || !targetLanguage) {
            res.status(400).json({ error: "text, sourceLanguage, and targetLanguage are required" });
            return;
          }

          if (sourceLanguage === targetLanguage) {
            res.status(200).json({ text });
            return;
          }

          const aiLlm = new AiLlmGenerator(this.config.aiLlmUrl, this.config.aiLlmModel);
          const translated = await aiLlm.translateText(String(text), String(sourceLanguage), String(targetLanguage));
          res.status(200).json({ text: translated });
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          logger.error({ err: message, body: req.body }, "Error in preview translation");
          res.status(500).json({
            error: "Failed to translate preview text",
            message,
          });
        }
      },
    );

    this.router.post(
      "/auto-script/topics",
      async (req: ExpressRequest, res: ExpressResponse) => {
        try {
          const {
            sourceId,
            sourceIds,
            category,
            keywords = [],
          }: {
            sourceId?: string;
            sourceIds?: string[];
            category?: string;
            keywords?: string[];
          } = req.body;
          const selectedSourceIds = Array.from(new Set(
            (Array.isArray(sourceIds) ? sourceIds : [])
              .concat(sourceId ? [sourceId] : [])
              .filter(Boolean),
          ));
          if (selectedSourceIds.length === 0) {
            res.status(400).json({ error: "sourceId or sourceIds is required" });
            return;
          }

          const rssFetcher = new RssFetcher();
          const stories = await rssFetcher.fetchStoriesFromSources(selectedSourceIds);
          if (stories.length === 0) {
            res.status(404).json({ error: "No news stories found for this source" });
            return;
          }

          const aiLlm = new AiLlmGenerator(this.config.aiLlmUrl, this.config.aiLlmModel);
          const topics = await aiLlm.suggestTopics(stories, { category, keywords });

          res.status(200).json({ topics });
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          logger.error({ err: message, body: req.body }, "Error in auto-script topic generation");
          res.status(500).json({
            error: "Failed to generate topics",
            message,
          });
        }
      },
    );

    this.router.post(
      "/auto-script/hooks",
      async (req: ExpressRequest, res: ExpressResponse) => {
        try {
          const {
            sourceId,
            sourceIds,
            category,
            topic,
            style = "News",
            keywords = [],
          }: {
            sourceId?: string;
            sourceIds?: string[];
            category?: string;
            topic?: string;
            style?: AutoScriptStyle;
            keywords?: string[];
          } = req.body;

          const selectedSourceIds = Array.from(new Set(
            (Array.isArray(sourceIds) ? sourceIds : [])
              .concat(sourceId ? [sourceId] : [])
              .filter(Boolean),
          ));
          if (selectedSourceIds.length === 0) {
            res.status(400).json({ error: "sourceId or sourceIds is required" });
            return;
          }

          const rssFetcher = new RssFetcher();
          const stories = await rssFetcher.fetchStoriesFromSources(selectedSourceIds);
          if (stories.length === 0) {
            res.status(404).json({ error: "No news stories found for this source" });
            return;
          }

          const aiLlm = new AiLlmGenerator(this.config.aiLlmUrl, this.config.aiLlmModel);
          const hooks: HookOption[] = await aiLlm.suggestHooks(stories, { category, topic, style, keywords });

          res.status(200).json({ hooks });
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          logger.error({ err: message, body: req.body }, "Error in auto-script hook generation");
          res.status(500).json({
            error: "Failed to generate hooks",
            message,
          });
        }
      },
    );

    this.router.post(
      "/auto-script",
      async (req: ExpressRequest, res: ExpressResponse) => {
        try {
          const {
            sourceId,
            sourceIds,
            category,
            topic,
            style = "News",
            hook,
            scriptLanguage,
            keywords = [],
            videoType,
            durationLimit,
          }: {
            sourceId?: string;
            sourceIds?: string[];
            category?: string;
            topic?: string;
            style?: AutoScriptStyle;
            hook?: string;
            scriptLanguage?: string;
            keywords?: string[];
            videoType?: "short" | "long";
            durationLimit?: number;
          } = req.body;
          const selectedSourceIds = Array.from(new Set(
            (Array.isArray(sourceIds) ? sourceIds : [])
              .concat(sourceId ? [sourceId] : [])
              .filter(Boolean),
          ));
          if (selectedSourceIds.length === 0) {
            res.status(400).json({ error: "sourceId or sourceIds is required" });
            return;
          }

          logger.info({ selectedSourceIds, scriptLanguage }, "Auto-generating script from news");

          const rssFetcher = new RssFetcher();
          const stories = await rssFetcher.fetchStoriesFromSources(selectedSourceIds);

          if (stories.length === 0) {
            res.status(404).json({ error: "No news stories found for this source" });
            return;
          }

          const aiLlm = new AiLlmGenerator(this.config.aiLlmUrl, this.config.aiLlmModel);
          const scenes = await aiLlm.generateScript(stories, {
            category,
            topic,
            style,
            hook,
            scriptLanguage,
            keywords,
            videoType,
            durationLimit,
          });

          res.status(200).json({ scenes });
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          const details = error instanceof Error ? error.stack ?? "No stack trace available" : "No stack trace available";
          const rawOllamaOutput = (error as { rawResponse?: string }).rawResponse || "No output captured";
          logger.error({ err: message, body: req.body }, "Error in auto-script generation");
          res.status(500).json({
            error: "Failed to generate script",
            message,
            details,
            rawOllamaOutput,
          });
        }
      },
    );
  }

}
