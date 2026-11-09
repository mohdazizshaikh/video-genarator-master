// Legacy flat-store policy used by older migration helpers. Absence here does
// not prove a store is shared. Structured stores, derived publish attempts and
// directory ownership must be assessed by inspect-data.mjs.
export const TENANT_SCOPED_STORES = new Set([
  "abVariants.json",
  "ai-learning-events.json",
  "analytics.json",
  "audienceTargets.json",
  "channelConfigs.json",
  "freshness-records.json",
  "job-event-outbox.json",
  "job-events.json",
  "pipeline-comparisons.json",
  "pipeline-jobs.json",
  "pipeline-variations.json",
  "publishAttempts.json",
  "publishJobs.json",
  "renderJobs.json",
  "reports.json",
  "schedules.json",
  "scriptPlans.json",
  "tenantUsage.json",
  "videoLibrary.json",
  "videoMetadata.json",
]);

export function isTenantScopedStore(name) {
  return TENANT_SCOPED_STORES.has(name);
}
