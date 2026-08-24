import fs from "fs-extra";
import path from "path";
import cuid from "cuid";

export type PipelineStatus = "pending" | "running" | "completed" | "failed";

export interface AIScores {
  emotionalScore: number;
  qualityScore: number;
  attentionScore: number;
  engagementScore: number;
  overallScore: number;
}

export interface GeneratedVariation {
  /** Auth-derived owner. Legacy variations without this field are not tenant-visible. */
  tenantId?: string;
  id: string;
  jobId: string;
  hook: string;
  caption: string;
  hashtags: string[];
  humanizedOutput: Record<string, unknown>;
  emotionalDirectives: Record<string, unknown>;
  thumbnailDirectives: Record<string, unknown>;
  watermarkFilter: string;
  aiScores: AIScores;
  rank: number;
  createdAt: string;
}

export interface PipelineJob {
  /** Auth-derived owner. Legacy jobs without this field are not tenant-visible. */
  tenantId?: string;
  id: string;
  topic: string;
  platform: string;
  tone: string;
  bulkCount: number;
  autoSchedule: boolean;
  status: PipelineStatus;
  currentStep: string;
  totalVariations: number;
  topVariations: string[];
  scheduleIds: string[];
  error?: string;
  durationMs?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformComparisonEntry {
  platform: string;
  status: "pending" | "running" | "done" | "failed";
  jobId?: string;
  bestScore?: number;
  scores?: AIScores;
  bestHook?: string;
  bestCaption?: string;
  bestHashtags?: string[];
  emotionalTone?: string;
  musicGenre?: string;
  colorPalette?: string[];
  pacing?: string;
  estimatedViralScore?: number;
  durationMs?: number;
  error?: string;
}

export interface ComparisonRun {
  /** Auth-derived owner. Legacy comparisons without this field are not tenant-visible. */
  tenantId?: string;
  id: string;
  topic: string;
  tone: string;
  platforms: string[];
  status: "running" | "completed" | "partial";
  winner?: string;
  entries: PlatformComparisonEntry[];
  createdAt: string;
  updatedAt: string;
}

export class PipelineStore {
  private jobsPath: string;
  private variationsPath: string;
  private comparisonsPath: string;

  constructor(basePath: string) {
    this.jobsPath = path.join(basePath, "pipeline-jobs.json");
    this.variationsPath = path.join(basePath, "pipeline-variations.json");
    this.comparisonsPath = path.join(basePath, "pipeline-comparisons.json");
    this.initFile(this.jobsPath);
    this.initFile(this.variationsPath);
    this.initFile(this.comparisonsPath);
  }

  private initFile(filePath: string) {
    fs.ensureFileSync(filePath);
    if (!fs.readFileSync(filePath, "utf-8").trim()) {
      fs.writeFileSync(filePath, "[]", "utf-8");
    }
  }

  private async read<T>(filePath: string): Promise<T[]> {
    const raw = await fs.readFile(filePath, "utf-8");
    if (!raw.trim()) return [];
    try { return JSON.parse(raw) as T[]; } catch { return []; }
  }

  private async write<T>(filePath: string, data: T[]): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  async createJob(params: Pick<PipelineJob, "topic" | "platform" | "tone" | "bulkCount" | "autoSchedule"> & { tenantId?: string }): Promise<PipelineJob> {
    const jobs = await this.read<PipelineJob>(this.jobsPath);
    const now = new Date().toISOString();
    const job: PipelineJob = {
      id: `pipe_${cuid()}`,
      ...params,
      status: "pending",
      currentStep: "queued",
      totalVariations: 0,
      topVariations: [],
      scheduleIds: [],
      createdAt: now,
      updatedAt: now,
    };
    jobs.push(job);
    await this.write(this.jobsPath, jobs);
    return job;
  }

  async updateJobForTenant(tenantId: string, id: string, updates: Partial<Omit<PipelineJob, "id" | "tenantId" | "createdAt">>): Promise<PipelineJob | null> {
    if (!(await this.getJobForTenant(tenantId, id))) return null;
    return this.updateJob(id, updates);
  }

  async updateJob(id: string, updates: Partial<PipelineJob>): Promise<PipelineJob | null> {
    const jobs = await this.read<PipelineJob>(this.jobsPath);
    const idx = jobs.findIndex((j) => j.id === id);
    if (idx === -1) return null;
    jobs[idx] = { ...jobs[idx], ...updates, updatedAt: new Date().toISOString() };
    await this.write(this.jobsPath, jobs);
    return jobs[idx];
  }

  async getJobForTenant(tenantId: string, id: string): Promise<PipelineJob | null> {
    if (!tenantId) return null;
    const job = await this.getJob(id);
    return job?.tenantId === tenantId ? job : null;
  }

  async getJob(id: string): Promise<PipelineJob | null> {
    const jobs = await this.read<PipelineJob>(this.jobsPath);
    return jobs.find((j) => j.id === id) ?? null;
  }

  async listJobsForTenant(tenantId: string, limit = 50): Promise<PipelineJob[]> {
    if (!tenantId) return [];
    const jobs = await this.read<PipelineJob>(this.jobsPath);
    return jobs.filter((job) => job.tenantId === tenantId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  }

  async listJobs(limit = 50): Promise<PipelineJob[]> {
    const jobs = await this.read<PipelineJob>(this.jobsPath);
    return jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  }

  async saveVariation(params: Omit<GeneratedVariation, "id" | "createdAt">): Promise<GeneratedVariation> {
    const variations = await this.read<GeneratedVariation>(this.variationsPath);
    const variation: GeneratedVariation = {
      id: `var_${cuid()}`,
      ...params,
      createdAt: new Date().toISOString(),
    };
    variations.push(variation);
    await this.write(this.variationsPath, variations);
    return variation;
  }

  async getVariationsForJobForTenant(tenantId: string, jobId: string): Promise<GeneratedVariation[]> {
    if (!(await this.getJobForTenant(tenantId, jobId))) return [];
    const variations = await this.read<GeneratedVariation>(this.variationsPath);
    return variations.filter((variation) => variation.jobId === jobId && variation.tenantId === tenantId).sort((a, b) => a.rank - b.rank);
  }

  async getVariationsForJob(jobId: string): Promise<GeneratedVariation[]> {
    const variations = await this.read<GeneratedVariation>(this.variationsPath);
    return variations.filter((v) => v.jobId === jobId).sort((a, b) => a.rank - b.rank);
  }

  async getStatsForTenant(tenantId: string): Promise<{ totalJobs: number; completedJobs: number; failedJobs: number; totalVariations: number; avgScore: number }> {
    if (!tenantId) return { totalJobs: 0, completedJobs: 0, failedJobs: 0, totalVariations: 0, avgScore: 0 };
    const [jobs, variations] = await Promise.all([
      this.read<PipelineJob>(this.jobsPath),
      this.read<GeneratedVariation>(this.variationsPath),
    ]);
    const tenantJobs = jobs.filter((job) => job.tenantId === tenantId);
    const tenantJobIds = new Set(tenantJobs.map((job) => job.id));
    const tenantVariations = variations.filter((variation) => variation.tenantId === tenantId && tenantJobIds.has(variation.jobId));
    const avgScore = tenantVariations.length ? tenantVariations.reduce((sum, variation) => sum + variation.aiScores.overallScore, 0) / tenantVariations.length : 0;
    return {
      totalJobs: tenantJobs.length,
      completedJobs: tenantJobs.filter((job) => job.status === "completed").length,
      failedJobs: tenantJobs.filter((job) => job.status === "failed").length,
      totalVariations: tenantVariations.length,
      avgScore: Math.round(avgScore * 100) / 100,
    };
  }

  async getStats(): Promise<{ totalJobs: number; completedJobs: number; failedJobs: number; totalVariations: number; avgScore: number }> {
    const [jobs, variations] = await Promise.all([
      this.read<PipelineJob>(this.jobsPath),
      this.read<GeneratedVariation>(this.variationsPath),
    ]);
    const avgScore = variations.length
      ? variations.reduce((s, v) => s + v.aiScores.overallScore, 0) / variations.length
      : 0;
    return {
      totalJobs: jobs.length,
      completedJobs: jobs.filter((j) => j.status === "completed").length,
      failedJobs: jobs.filter((j) => j.status === "failed").length,
      totalVariations: variations.length,
      avgScore: Math.round(avgScore * 100) / 100,
    };
  }

  async createComparison(params: Pick<ComparisonRun, "topic" | "tone" | "platforms"> & { tenantId?: string }): Promise<ComparisonRun> {
    const runs = await this.read<ComparisonRun>(this.comparisonsPath);
    const now = new Date().toISOString();
    const run: ComparisonRun = {
      id: `cmp_${cuid()}`,
      ...params,
      status: "running",
      entries: params.platforms.map((p) => ({ platform: p, status: "pending" })),
      createdAt: now,
      updatedAt: now,
    };
    runs.push(run);
    await this.write(this.comparisonsPath, runs);
    return run;
  }

  async getComparisonForTenant(tenantId: string, id: string): Promise<ComparisonRun | null> {
    if (!tenantId) return null;
    const run = await this.getComparison(id);
    return run?.tenantId === tenantId ? run : null;
  }

  async updateComparisonEntryForTenant(tenantId: string, runId: string, platform: string, entryUpdates: Partial<PlatformComparisonEntry>): Promise<ComparisonRun | null> {
    if (!(await this.getComparisonForTenant(tenantId, runId))) return null;
    return this.updateComparisonEntry(runId, platform, entryUpdates);
  }

  async updateComparison(id: string, updates: Partial<ComparisonRun>): Promise<ComparisonRun | null> {
    const runs = await this.read<ComparisonRun>(this.comparisonsPath);
    const idx = runs.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    runs[idx] = { ...runs[idx], ...updates, updatedAt: new Date().toISOString() };
    await this.write(this.comparisonsPath, runs);
    return runs[idx];
  }

  async updateComparisonEntry(runId: string, platform: string, entryUpdates: Partial<PlatformComparisonEntry>): Promise<ComparisonRun | null> {
    const runs = await this.read<ComparisonRun>(this.comparisonsPath);
    const idx = runs.findIndex((r) => r.id === runId);
    if (idx === -1) return null;
    const entryIdx = runs[idx].entries.findIndex((e) => e.platform === platform);
    if (entryIdx === -1) return null;
    runs[idx].entries[entryIdx] = { ...runs[idx].entries[entryIdx], ...entryUpdates };
    runs[idx].updatedAt = new Date().toISOString();
    const donePlatforms = runs[idx].entries.filter((e) => e.status === "done");
    const allSettled = runs[idx].entries.every((e) => e.status === "done" || e.status === "failed");
    if (allSettled) {
      runs[idx].status = donePlatforms.length > 0 ? "completed" : "partial";
      if (donePlatforms.length > 0) {
        const best = donePlatforms.reduce((a, b) =>
          (b.scores?.overallScore ?? 0) > (a.scores?.overallScore ?? 0) ? b : a
        );
        runs[idx].winner = best.platform;
      }
    }
    await this.write(this.comparisonsPath, runs);
    return runs[idx];
  }

  async getComparison(id: string): Promise<ComparisonRun | null> {
    const runs = await this.read<ComparisonRun>(this.comparisonsPath);
    return runs.find((r) => r.id === id) ?? null;
  }

  async listComparisonsForTenant(tenantId: string, limit = 20): Promise<ComparisonRun[]> {
    if (!tenantId) return [];
    const runs = await this.read<ComparisonRun>(this.comparisonsPath);
    return runs.filter((run) => run.tenantId === tenantId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  }

  async listComparisons(limit = 20): Promise<ComparisonRun[]> {
    const runs = await this.read<ComparisonRun>(this.comparisonsPath);
    return runs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  }
}
