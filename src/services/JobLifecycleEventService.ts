import { JobEventStore } from "../db/JobEventStore";
import { JobEventOutboxStore } from "../db/JobEventOutboxStore";

export class JobLifecycleEventService {
  constructor(
    private readonly store: JobEventStore,
    private readonly outbox: JobEventOutboxStore,
  ) {}

  emit(input: {
    tenantId?: string;
    jobId?: string | number;
    type: string;
    payload?: Record<string, unknown>;
    attempt?: number;
  }): void {
    if (!input.tenantId || !input.jobId) {
      throw new Error("tenantId and jobId are required for lifecycle events");
    }
    const attempt = input.attempt ?? 0;
    const event = this.store.append({
      tenantId: input.tenantId,
      jobId: String(input.jobId),
      type: input.type,
      idempotencyKey: `${String(input.jobId)}:${input.type}:${attempt}`,
      payload: input.payload ?? {},
    });
    this.outbox.enqueue({ tenantId: input.tenantId, eventId: event.id });
  }
}

export default JobLifecycleEventService;
