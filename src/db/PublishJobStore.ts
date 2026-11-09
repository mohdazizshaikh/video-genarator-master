import fs from "fs-extra";
import path from "path";
import cuid from "cuid";
import crypto from "node:crypto";
import type { PublishJobRecord, PublishAttemptRecord, PublishJobStatus, PlatformType } from "../types/shorts";

export class PublishJobStore {
  private jobsPath: string;
  private attemptsPath: string;

  constructor(basePath: string) {
    this.jobsPath = path.join(basePath, "publishJobs.json");
    this.attemptsPath = path.join(basePath, "publishAttempts.json");
    fs.ensureDirSync(basePath);
    for (const file of [this.jobsPath, this.attemptsPath]) {
      if (!fs.existsSync(file)) fs.writeFileSync(file, "[]", { flag: "wx", mode: 0o600 });
    }
  }

  private read<T>(file: string): T[] {
    const rows: unknown = fs.readJsonSync(file);
    if (!Array.isArray(rows)) throw new Error("Invalid publish store; reconciliation is required");
    return rows as T[];
  }
  private mutate<T, R>(file: string, change: (rows: T[]) => R): R {
    const rows = this.read<T>(file);
    const result = change(rows);
    const temporary = `${file}.${crypto.randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temporary, JSON.stringify(rows, null, 2), { flag: "wx", mode: 0o600 });
      fs.renameSync(temporary, file);
    } finally { fs.removeSync(temporary); }
    return result;
  }
  private async readJobs(): Promise<PublishJobRecord[]> { return this.read(this.jobsPath); }
  private async readAttempts(): Promise<PublishAttemptRecord[]> { return this.read(this.attemptsPath); }

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
    releaseTargetId?: string;
    connectorId?: string;
    destinationId?: string;
  }): Promise<PublishJobRecord> {
    if (!params.tenantId?.trim()) throw new Error("Publish workspace is required");
    return this.mutate<PublishJobRecord, PublishJobRecord>(this.jobsPath, (jobs) => {
    if (params.releaseTargetId) {
      const existing = jobs.find((job) => job.tenantId === params.tenantId && job.releaseTargetId === params.releaseTargetId);
      if (existing) {
        if (existing.connectorId !== params.connectorId || existing.destinationId !== params.destinationId || existing.platform !== params.platform) throw new Error("Publish target identity mismatch");
        return existing;
      }
    }
    const now = new Date().toISOString();
    const record: PublishJobRecord = {
      tenantId: params.tenantId,
      releaseTargetId: params.releaseTargetId,
      connectorId: params.connectorId,
      destinationId: params.destinationId,
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
    return record;
    });
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
    extras: Partial<Pick<PublishJobRecord, "externalId" | "publishedUrl" | "error" | "attemptCount" | "scheduleAt">> = {},
  ): Promise<PublishJobRecord | undefined> {
    return this.mutate<PublishJobRecord, PublishJobRecord | undefined>(this.jobsPath, (jobs) => this.setStatus(jobs, jobs.findIndex((job) => job.id === id), status, extras));
  }

  private setStatus(jobs: PublishJobRecord[], index: number, status: PublishJobStatus, extras: Partial<Pick<PublishJobRecord, "externalId" | "publishedUrl" | "error" | "attemptCount" | "scheduleAt">>) {
    if (index < 0) return undefined;
    jobs[index] = { ...jobs[index], ...extras, status, updatedAt: new Date().toISOString() };
    return jobs[index];
  }

  public async updateJobStatusForTenant(
    tenantId: string, id: string, status: PublishJobStatus,
    extras: Partial<Pick<PublishJobRecord, "externalId" | "publishedUrl" | "error" | "attemptCount" | "scheduleAt">> = {},
  ): Promise<PublishJobRecord | undefined> {
    if (!tenantId) return undefined;
    return this.mutate<PublishJobRecord, PublishJobRecord | undefined>(this.jobsPath, (jobs) => this.setStatus(jobs, jobs.findIndex((job) => job.tenantId === tenantId && job.id === id), status, extras));
  }

  public async incrementAttempt(id: string): Promise<PublishJobRecord | undefined> {
    return this.mutate<PublishJobRecord, PublishJobRecord | undefined>(this.jobsPath, (jobs) => this.increment(jobs, jobs.findIndex((job) => job.id === id)));
  }
  private increment(jobs: PublishJobRecord[], index: number) {
    if (index < 0) return undefined;
    jobs[index] = { ...jobs[index], attemptCount: jobs[index].attemptCount + 1, updatedAt: new Date().toISOString() };
    return jobs[index];
  }
  public async incrementAttemptForTenant(tenantId: string, id: string): Promise<PublishJobRecord | undefined> {
    if (!tenantId) return undefined;
    return this.mutate<PublishJobRecord, PublishJobRecord | undefined>(this.jobsPath, (jobs) => this.increment(jobs, jobs.findIndex((job) => job.tenantId === tenantId && job.id === id)));
  }

  public async addAttempt(params: {
    publishJobId: string;
    attemptNumber: number;
    status: "success" | "failed";
    responseCode?: number;
    responseBody?: string;
  }): Promise<PublishAttemptRecord> {
    return this.mutate<PublishAttemptRecord, PublishAttemptRecord>(this.attemptsPath, (attempts) => {
    const existing = attempts.find((row) => row.publishJobId === params.publishJobId && row.attemptNumber === params.attemptNumber && row.status === params.status && row.responseBody === (params.responseBody ?? null));
    if (existing) return existing;
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
    return record;
    });
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
