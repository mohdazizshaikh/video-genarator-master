import fs from "fs-extra";
import path from "path";
import cuid from "cuid";

export type LearningOutcome = "success" | "failed";

export interface LearningEvent {
  id: string;
  jobId: string;
  tenantId?: string;
  videoId?: string;
  phase: "ingest" | "plan" | "render" | "publish" | "analytics";
  outcome: LearningOutcome;
  latencyMs: number;
  errorCode?: string;
  engagement?: {
    views: number;
    likes: number;
    shares: number;
    comments: number;
  };
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface LearningModelState {
  updatedAt: string;
  version: number;
  weights: {
    successRate: number;
    engagementRate: number;
    speedScore: number;
  };
  samples: number;
  metrics: {
    accuracy: number;
    drift: number;
    biasRisk: "low" | "medium" | "high";
  };
}

export class AiLearningStore {
  private eventsPath: string;
  private modelPath: string;

  constructor(basePath: string) {
    this.eventsPath = path.join(basePath, "ai-learning-events.json");
    this.modelPath = path.join(basePath, "ai-learning-model.json");
    fs.ensureFileSync(this.eventsPath);
    fs.ensureFileSync(this.modelPath);

    if (!fs.readFileSync(this.eventsPath, "utf-8").trim()) {
      fs.writeFileSync(this.eventsPath, "[]", "utf-8");
    }

    if (!fs.readFileSync(this.modelPath, "utf-8").trim()) {
      const initial: LearningModelState = {
        updatedAt: new Date().toISOString(),
        version: 1,
        weights: {
          successRate: 0.5,
          engagementRate: 0.3,
          speedScore: 0.2,
        },
        samples: 0,
        metrics: {
          accuracy: 0.5,
          drift: 0,
          biasRisk: "low",
        },
      };
      fs.writeFileSync(this.modelPath, JSON.stringify(initial, null, 2), "utf-8");
    }
  }

  private async readEvents(): Promise<LearningEvent[]> {
    const content = await fs.readFile(this.eventsPath, "utf-8");
    if (!content.trim()) return [];
    try {
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  private async writeEvents(events: LearningEvent[]): Promise<void> {
    await fs.writeFile(this.eventsPath, JSON.stringify(events, null, 2), "utf-8");
  }

  public async addEventForTenant(
    tenantId: string,
    payload: Omit<LearningEvent, "id" | "createdAt" | "tenantId">,
  ): Promise<LearningEvent> {
    if (!tenantId.trim()) throw new Error("tenantId is required");
    const events = await this.readEvents();
    const event: LearningEvent = {
      id: cuid(),
      createdAt: new Date().toISOString(),
      tenantId,
      ...payload,
    };
    events.push(event);
    await this.writeEvents(events);
    return event;
  }

  public async listEventsForTenant(tenantId: string, limit = 200): Promise<LearningEvent[]> {
    if (!tenantId.trim()) return [];
    return (await this.readEvents())
      .filter((event) => event.tenantId === tenantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, Math.max(1, limit));
  }

  private defaultModelState(): LearningModelState {
    return {
      updatedAt: new Date().toISOString(),
      version: 1,
      weights: { successRate: 0.5, engagementRate: 0.3, speedScore: 0.2 },
      samples: 0,
      metrics: { accuracy: 0.5, drift: 0, biasRisk: "low" },
    };
  }

  public async getModelStateForTenant(tenantId: string): Promise<LearningModelState> {
    if (!tenantId.trim()) throw new Error("tenantId is required");
    const content = await fs.readFile(this.modelPath, "utf-8");
    let models: Record<string, LearningModelState> = {};
    try {
      const parsed = JSON.parse(content) as Record<string, LearningModelState> | LearningModelState;
      if (parsed && !("version" in parsed) && typeof parsed === "object") models = parsed;
      // A legacy single model is deliberately quarantined and never returned to a tenant.
    } catch {
      models = {};
    }
    return models[tenantId] ?? this.defaultModelState();
  }

  public async saveModelStateForTenant(tenantId: string, state: LearningModelState): Promise<LearningModelState> {
    if (!tenantId.trim()) throw new Error("tenantId is required");
    const content = await fs.readFile(this.modelPath, "utf-8");
    let models: Record<string, LearningModelState> = {};
    try {
      const parsed = JSON.parse(content) as Record<string, LearningModelState>;
      if (parsed && !("version" in parsed) && typeof parsed === "object") models = parsed;
    } catch {
      models = {};
    }
    models[tenantId] = state;
    await fs.writeFile(this.modelPath, JSON.stringify(models, null, 2), "utf-8");
    return state;
  }
}
