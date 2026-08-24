import fs from "fs-extra";
import path from "path";
import cuid from "cuid";
import type { PublishJobRecord, PublishAttemptRecord, PublishJobStatus, PlatformType } from "../types/shorts";

export class PublishJobStore {
  private jobsPath: string;
  private attemptsPath: string;

  constructor(basePath: string) {
    this.jobsPath = path.join(basePath, "publishJobs.json");
    this.attemptsPath = path.join(basePath, "publishAttempts.json");
    for (const p of [this.jobsPath, this.attemptsPath]) {
      fs.ensureFileSync(p);
      if (!fs.readFileSync(p, "utf-8").trim()) {
        fs.writeFileSync(p, "[]", "utf-8");
      }
    }
  }

  private async readJobs(): Promise<PublishJobRecord[]> {
    const content = await fs.readFile(this.jobsPath, "utf-8");
    if (!content.trim()) return [];
    try { return JSON.parse(content); } catch { return []; }
  }

  private async writeJobs(records: PublishJobRecord[]): Promise<void> {
    await fs.writeFile(this.jobsPath, JSON.stringify(records, null, 2), "utf-8");
  }

  private async readAttempts(): Promise<PublishAttemptRecord[]> {
    const content = await fs.readFile(this.attemptsPath, "utf-8");
    if (!content.trim()) return [];
    try { return JSON.parse(content); } catch { return []; }
  }

  private async writeAttempts(records: PublishAttemptRecord[]): Promise<void> {
    await fs.writeFile(this.attemptsPath, JSON.stringify(records, null, 2), "utf-8");
  }

  public async createJob(params: {
    tenantId: string;
    renderOutputPath: string;
    platform: PlatformType;
    channelId: string;
    title: string;
    description: string;
    tags: string[];
    category: string;
    language: string;
    thumbnailPath?: string;
    scheduleAt?: string;
    accountId?: string;
  }): Promise<PublishJobRecord> {
    const jobs = await this.readJobs();
    const now = new Date().toISOString();
    const record: PublishJobRecord = {
      tenantId: params.tenantId,
      id: cuid(),
      renderOutputPath: params.renderOutputPath,
      platform: params.platform,
      channelId: params.channelId,
      title: params.title,
      description: params.description,
      tags: params.tags,
      category: params.category,
      language: params.language,
      thumbnailPath: params.thumbnailPath,
      scheduleAt: params.scheduleAt ?? null,
      accountId: params.accountId ?? null,
      status: "queued",
      attemptCount: 0,
      externalId: null,
      publishedUrl: null,
      error: null,
      createdAt: now,
      updatedAt: now,
    };
    jobs.push(record);
    await this.writeJobs(jobs);
    return record;
  }

  public async getJob(id: string): Promise<PublishJobRecord | undefined> {
    return (await this.readJobs()).find((j) => j.id === id);
  }

  public async getJobForTenant(tenantId: string, id: string): Promise<PublishJobRecord | undefined> {
    if (!tenantId) return undefined;
    const job = await this.getJob(id);
    return job?.tenantId === tenantId ? job : undefined;
  }

  public async listJobs(): Promise<PublishJobRecord[]> {
    return (await this.readJobs()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  public async listJobsForTenant(tenantId: string): Promise<PublishJobRecord[]> {
    if (!tenantId) return [];
    return (await this.readJobs()).filter((job) => job.tenantId === tenantId).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  public async listJobsByStatus(status: PublishJobStatus): Promise<PublishJobRecord[]> {
    return (await this.readJobs()).filter((j) => j.status === status);
  }

  public async listJobsByStatusForTenant(tenantId: string, status: PublishJobStatus): Promise<PublishJobRecord[]> {
    if (!tenantId) return [];
    return (await this.readJobs()).filter((job) => job.tenantId === tenantId && job.status === status);
  }

  /** Idempotency check: same render output + platform + channel */
  public async findDuplicate(renderOutputPath: string, platform: PlatformType): Promise<PublishJobRecord | undefined> {
    return (await this.readJobs()).find(
      (j) => j.renderOutputPath === renderOutputPath && j.platform === platform,
    );
  }

  public async findDuplicateForTenant(tenantId: string, renderOutputPath: string, platform: PlatformType): Promise<PublishJobRecord | undefined> {
    if (!tenantId) return undefined;
    return (await this.readJobs()).find(
      (job) => job.tenantId === tenantId && job.renderOutputPath === renderOutputPath && job.platform === platform,
    );
  }

  public async updateJobStatus(
    id: string,
    status: PublishJobStatus,
    extras: Partial<Pick<PublishJobRecord, "externalId" | "publishedUrl" | "error" | "attemptCount">> = {},
  ): Promise<PublishJobRecord | undefined> {
    const jobs = await this.readJobs();
    const idx = jobs.findIndex((j) => j.id === id);
    if (idx < 0) return undefined;
    jobs[idx] = { ...jobs[idx], status, ...extras, updatedAt: new Date().toISOString() };
    await this.writeJobs(jobs);
    return jobs[idx];
  }

  public async updateJobStatusForTenant(
    tenantId: string,
    id: string,
    status: PublishJobStatus,
    extras: Partial<Pick<PublishJobRecord, "externalId" | "publishedUrl" | "error" | "attemptCount">> = {},
  ): Promise<PublishJobRecord | undefined> {
    if (!(await this.getJobForTenant(tenantId, id))) return undefined;
    return this.updateJobStatus(id, status, extras);
  }

  public async incrementAttempt(id: string): Promise<PublishJobRecord | undefined> {
    const jobs = await this.readJobs();
    const idx = jobs.findIndex((j) => j.id === id);
    if (idx < 0) return undefined;
    jobs[idx].attemptCount += 1;
    jobs[idx].updatedAt = new Date().toISOString();
    await this.writeJobs(jobs);
    return jobs[idx];
  }

  public async incrementAttemptForTenant(tenantId: string, id: string): Promise<PublishJobRecord | undefined> {
    if (!(await this.getJobForTenant(tenantId, id))) return undefined;
    return this.incrementAttempt(id);
  }

  public async addAttempt(params: {
    publishJobId: string;
    attemptNumber: number;
    status: "success" | "failed";
    responseCode?: number;
    responseBody?: string;
  }): Promise<PublishAttemptRecord> {
    const attempts = await this.readAttempts();
    const record: PublishAttemptRecord = {
      id: cuid(),
      publishJobId: params.publishJobId,
      attemptNumber: params.attemptNumber,
      status: params.status,
      responseCode: params.responseCode ?? null,
      responseBody: params.responseBody ?? null,
      attemptedAt: new Date().toISOString(),
    };
    attempts.push(record);
    await this.writeAttempts(attempts);
    return record;
  }

  public async getAttempts(publishJobId: string): Promise<PublishAttemptRecord[]> {
    return (await this.readAttempts()).filter((a) => a.publishJobId === publishJobId);
  }

  public async getAttemptsForTenant(tenantId: string, publishJobId: string): Promise<PublishAttemptRecord[]> {
    if (!(await this.getJobForTenant(tenantId, publishJobId))) return [];
    return this.getAttempts(publishJobId);
  }

  public async getStats(): Promise<Record<PublishJobStatus, number>> {
    const jobs = await this.readJobs();
    return jobs.reduce(
      (acc, j) => {
        acc[j.status] = (acc[j.status] || 0) + 1;
        return acc;
      },
      {} as Record<PublishJobStatus, number>,
    );
  }
}
