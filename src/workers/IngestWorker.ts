import { Worker, Job } from "bullmq";
import type { Config } from "../config";
import { ReportStore } from "../db/ReportStore";
import { JobEventStore } from "../db/JobEventStore";
import { JobEventOutboxStore } from "../db/JobEventOutboxStore";
import { JobLifecycleEventService } from "../services/JobLifecycleEventService";
import { logger } from "../logger";
import { getRedisConnection, QUEUE_NAMES } from "./QueueManager";

export interface IngestJobPayload {
  tenantId?: string;
  sourceId: string;
  sourceName: string;
  category: string;
  items: Array<{
    title: string;
    content: string;
    link: string;
    pubDate: string;
  }>;
}

export class IngestWorker {
  private worker: Worker;
  private reportStore: ReportStore;
  private lifecycleEvents: JobLifecycleEventService;

  constructor(private readonly config: Config) {
    this.reportStore = new ReportStore(config.dataDirPath);
    this.lifecycleEvents = new JobLifecycleEventService(new JobEventStore(config.dataDirPath), new JobEventOutboxStore(config.dataDirPath));
    this.worker = new Worker(
      QUEUE_NAMES.INGEST,
      async (job: Job<IngestJobPayload>) => this.processJob(job),
      {
        connection: getRedisConnection(config),
        concurrency: 5,
        stalledInterval: 30000,
      },
    );

    this.worker.on("completed", (job) => {
      this.lifecycleEvents.emit({ tenantId: job.data.tenantId, jobId: job.id, type: "completed", payload: { inserted: job.returnvalue } });
      logger.info({ jobId: job.id }, "Ingest job completed");
    });

    logger.info("IngestWorker started");
  }

  private async processJob(job: Job<IngestJobPayload>): Promise<number> {
    this.lifecycleEvents.emit({ tenantId: job.data.tenantId, jobId: job.id, type: "processing" });
    const { tenantId, sourceId, sourceName, category, items } = job.data;
    if (!tenantId) {
      logger.warn({ jobId: job.id }, "Skipping unowned ingest job");
      return 0;
    }
    let inserted = 0;

    for (const item of items) {
      await this.reportStore.add({
        tenantId,
        sourceId,
        sourceName,
        category,
        title: item.title,
        content: item.content,
        link: item.link,
        pubDate: item.pubDate,
      });
      inserted += 1;
    }

    return inserted;
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
