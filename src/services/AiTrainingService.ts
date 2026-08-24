import type { AiLearningStore } from "../db/AiLearningStore";
import { AiPredictionService } from "./AiPredictionService";

interface JobHandle {
  stop?: () => void;
}

export class AiTrainingService {
  private job: JobHandle | null = null;

  constructor(
    private readonly store: AiLearningStore,
    private readonly predictor: AiPredictionService = new AiPredictionService(),
  ) {}

  public async runTrainingNow(tenantId: string): Promise<void> {
    const events = await this.store.listEventsForTenant(tenantId, 1000);
    const current = await this.store.getModelStateForTenant(tenantId);
    const next = this.predictor.retrain(events, current);
    await this.store.saveModelStateForTenant(tenantId, next);
  }

  public start(tenantId: string, jobFactory: (fn: () => Promise<void>) => JobHandle): void {
    if (this.job) return;
    this.job = jobFactory(async () => {
      await this.runTrainingNow(tenantId);
    });
  }
}
