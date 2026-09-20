// Store ownership policy for migration gates.
// Stores absent from this set are platform-shared, auth-registry, or relational
// stores whose ownership is derived through another record and must not be
// counted as unowned merely because they lack a direct tenantId field.
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
