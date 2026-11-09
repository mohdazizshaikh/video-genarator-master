import { PublishExecutionStore, type PublishBinding, type PublishExecution, type PublishReceipt } from "../db/PublishExecutionStore";
import { PublishJobStore } from "../db/PublishJobStore";
import { ReleaseStore } from "../db/ReleaseStore";
import type { PublishResult } from "../publishers/PlatformPublisher";
import { PublishFailureError, classifyFailure, sanitizeProviderMessage } from "../publishers/failureClassification";

export class PublicationReconciliationError extends Error {}

/** Persist provider dispatch/receipt separately from repairable local projections.
 * A missing acknowledgement is never evidence that an upload was rejected. */
export class PublishDeliveryService {
  readonly executions: PublishExecutionStore;
  private jobs: PublishJobStore;
  private releases: ReleaseStore;
  constructor(directory: string) {
    this.executions = new PublishExecutionStore(directory);
    this.jobs = new PublishJobStore(directory);
    this.releases = new ReleaseStore(directory);
  }

  private async identity(binding: PublishBinding, publishJobId: string) {
    const target = this.releases.getTarget(binding.tenantId, binding.targetId);
    const job = await this.jobs.getJobForTenant(binding.tenantId, publishJobId);
    if (!target || !job || target.releaseId !== binding.releaseId || target.connectorId !== binding.connectorId || target.destinationId !== binding.destinationId || job.releaseTargetId !== binding.targetId || job.connectorId !== binding.connectorId || job.destinationId !== binding.destinationId || job.platform !== binding.platform) throw new PublicationReconciliationError("Publish execution identity mismatch");
    return { target, job };
  }

  async recover(binding: PublishBinding, publishJobId: string): Promise<PublishReceipt | undefined> {
    const { target } = await this.identity(binding, publishJobId);
    const execution = this.executions.get(binding.tenantId, binding.targetId);
    if (execution) {
      this.executions.assertBinding(execution, binding);
      if (execution.state === "accepted") return this.project(execution, publishJobId);
      if (execution.state === "dispatching" || execution.state === "reconciling") return this.hold(binding, publishJobId, execution);
    }
    if (!execution && target.status === "published") {
      await this.jobs.updateJobStatusForTenant(binding.tenantId, publishJobId, "reconciling", { error: "Legacy publication has no bound receipt; verify it before retrying" });
      throw new PublicationReconciliationError("Legacy published target requires receipt reconciliation");
    }
    if (!execution && (target.status === "publishing" || target.status === "reconciling" || (target.status === "failed" && target.retryDisposition !== "not_dispatched"))) {
      // Old target state alone is not a receipt with a bound provider request.
      return this.hold(binding, publishJobId);
    }
    if (target.status === "cancelled" || target.status === "published") throw new PublicationReconciliationError("Release target is not dispatchable");
    return undefined;
  }

  async deliver(binding: PublishBinding, publishJobId: string, upload: () => Promise<PublishResult>, secrets: string[] = []): Promise<PublishReceipt> {
    const recovered = await this.recover(binding, publishJobId);
    if (recovered) return recovered;
    let execution = this.executions.prepare(binding, publishJobId);
    // No await between compare-and-set and entering the adapter: another
    // same-process delivery cannot start the same provider request twice.
    try { execution = this.executions.dispatch(execution); }
    catch { return this.hold(binding, publishJobId, execution); }
    let accepted = false;
    let rejected = false;
    try {
      this.releases.updateTarget(binding.tenantId, binding.targetId, { status: "publishing", providerRequestId: execution.requestId, lastErrorCode: undefined, retryDisposition: undefined });
      await this.jobs.updateJobStatusForTenant(binding.tenantId, publishJobId, "publishing");
      const result = await upload();
      if (!result.success) {
        if (result.deliveryOutcome !== "not_accepted") return this.hold(binding, publishJobId, execution);
        const failure = classifyFailure({ code: result.errorCode, message: sanitizeProviderMessage(result.error || "Provider rejected the upload", secrets), retryAfterSeconds: result.retryAfterSeconds });
        this.executions.reject(execution, failure.code);
        this.releases.updateTarget(binding.tenantId, binding.targetId, { retryDisposition: "not_accepted" });
        rejected = true;
        throw new PublishFailureError(failure);
      }
      const receipt = this.receipt(result);
      if (!receipt) return this.hold(binding, publishJobId, execution);
      execution = this.executions.accept(execution, receipt);
      accepted = true;
      return await this.project(execution, publishJobId);
    } catch (error) {
      // Confirmed receipt survives projection/attempt-log failures for replay.
      if (accepted || rejected || error instanceof PublicationReconciliationError) throw error;
      return this.hold(binding, publishJobId, execution);
    }
  }

  /** An operator observation confirms a historical publication; it never starts
   * an upload or authorizes a negative-outcome retry. */
  async confirmObservedPublication(binding: PublishBinding, publishJobId: string, requestId: string, externalId: string, evidenceReference: string, recordedBy: string): Promise<PublishReceipt> {
    await this.identity(binding, publishJobId);
    const execution = this.executions.get(binding.tenantId, binding.targetId);
    if (!execution || execution.requestId !== requestId || execution.publishJobId !== publishJobId) throw new PublicationReconciliationError("Stale or missing publication request; refresh before resolving");
    this.executions.assertBinding(execution, binding);
    const receipt = this.receipt({ success: true, externalId });
    if (!receipt) throw new Error("A canonical provider publication ID is required");
    const confirmed = this.executions.confirmObserved(execution, receipt, evidenceReference, recordedBy);
    return this.project(confirmed, publishJobId);
  }

  private receipt(result: PublishResult): PublishReceipt | undefined {
    const externalId = result.externalId || result.platformVideoId;
    if (typeof externalId !== "string" || !externalId.trim() || externalId.length > 500 || /\s/.test(externalId) || ["undefined", "null"].includes(externalId)) return undefined;
    let publishedUrl: string | undefined;
    try {
      const url = new URL(result.publishedUrl || "");
      if (url.protocol === "https:" && !url.username && !url.password && url.href.length <= 2048) publishedUrl = url.href;
    } catch { /* A canonical provider ID is sufficient; a malformed link is omitted. */ }
    return { externalId, publishedUrl };
  }

  private async project(execution: PublishExecution, publishJobId: string): Promise<PublishReceipt> {
    if (!execution.receipt?.externalId) throw new PublicationReconciliationError("Confirmed publication receipt is missing");
    this.releases.confirmTargetPublication(execution.tenantId, execution.targetId);
    const job = await this.jobs.updateJobStatusForTenant(execution.tenantId, publishJobId, "published", { externalId: execution.receipt.externalId, publishedUrl: execution.receipt.publishedUrl, error: null });
    if (!job) throw new Error("Publish job projection is unavailable");
    await this.jobs.addAttempt({ publishJobId, attemptNumber: execution.attempt, status: "success", responseBody: execution.receipt.externalId });
    return execution.receipt;
  }

  private async hold(binding: PublishBinding, publishJobId: string, execution?: PublishExecution): Promise<PublishReceipt> {
    if (execution) {
      const current = this.executions.reconcile(execution);
      if (current.state === "accepted") return this.project(current, publishJobId);
    }
    this.releases.updateTarget(binding.tenantId, binding.targetId, { status: "reconciling", lastErrorCode: "publication_outcome_unknown" });
    await this.jobs.updateJobStatusForTenant(binding.tenantId, publishJobId, "reconciling", { error: "Publication outcome is unknown; verify the provider before retrying" });
    throw new PublicationReconciliationError("Publication outcome is unknown; automatic upload retry is blocked");
  }
}
