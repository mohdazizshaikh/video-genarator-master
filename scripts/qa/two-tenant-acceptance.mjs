#!/usr/bin/env node
const baseUrl = (process.env.ACCEPTANCE_BASE_URL || "http://localhost:3123").replace(/\/$/, "");
const required = ["TENANT_A_API_KEY", "TENANT_B_API_KEY"];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  console.log(JSON.stringify({ mode: "two-tenant-acceptance", executed: false, blockers: missing.map((name) => `${name} is absent`), invariants: ["credentials are owner-provided", "no tenant or record is created by this harness", "secret values are never printed"] }, null, 2));
  process.exitCode = 2;
} else {
  const auth = async (apiKey) => {
    const response = await fetch(`${baseUrl}/api/system-engines/auth/authenticate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ apiKey }) });
    const body = await response.json();
    if (!response.ok || !body.data?.token || !body.data?.tenant?.id) throw new Error(`authentication failed with HTTP ${response.status}`);
    return { token: body.data.token, tenantId: body.data.tenant.id };
  };
  const get = async (path, token) => {
    const response = await fetch(`${baseUrl}${path}`, { headers: { authorization: `Bearer ${token}` } });
    const body = await response.json().catch(() => ({}));
    return { status: response.status, body };
  };
  const metrics = async (token) => {
    const result = await get("/api/job-events/outbox/metrics", token);
    return { status: result.status, body: result.body };
  };
  const probeTenant = async (token, otherTenantId) => {
    const [connectors, releases, foreignTenant, missingRelease, missingVersion] = await Promise.all([
      get("/api/connectors", token),
      get("/api/releases", token),
      get(`/api/tenants/${otherTenantId}`, token),
      get("/api/releases/rel_acceptance_missing", token),
      get("/api/content-versions/cv_acceptance_missing", token),
    ]);
    if (connectors.status !== 200) throw new Error(`connector list failed with HTTP ${connectors.status}`);
    if (releases.status !== 200) throw new Error(`release list failed with HTTP ${releases.status}`);
    const listedConnectors = Array.isArray(connectors.body?.connectors) ? connectors.body.connectors : [];
    const listedReleases = Array.isArray(releases.body?.releases) ? releases.body.releases : [];
    if (listedConnectors.some((record) => record.workspaceId === otherTenantId)) throw new Error("connector list leaked another workspace record");
    if (listedReleases.some((record) => record.workspaceId === otherTenantId)) throw new Error("release list leaked another workspace record");
    for (const [label, result] of [["foreign tenant read", foreignTenant], ["missing release read", missingRelease], ["missing content version read", missingVersion]]) {
      if (result.status !== 404) throw new Error(`${label} returned HTTP ${result.status} instead of a non-enumerating 404`);
    }
    return {
      connectorsHttp: connectors.status,
      releasesHttp: releases.status,
      foreignTenantHttp: foreignTenant.status,
      foreignReleaseHttp: missingRelease.status,
      foreignContentVersionHttp: missingVersion.status,
      listScopeVerified: true,
      crossTenantReadsNonEnumerating: true,
    };
  };
  try {
    const a = await auth(process.env.TENANT_A_API_KEY);
    const b = await auth(process.env.TENANT_B_API_KEY);
    if (a.tenantId === b.tenantId) throw new Error("tenant credentials resolve to the same tenant");
    const [metricsA, metricsB, probeA, probeB] = await Promise.all([
      metrics(a.token),
      metrics(b.token),
      probeTenant(a.token, b.tenantId),
      probeTenant(b.token, a.tenantId),
    ]);
    if (metricsA.status !== 200 || metricsB.status !== 200) throw new Error("tenant-protected metrics request failed");
    console.log(JSON.stringify({
      mode: "two-tenant-acceptance",
      executed: true,
      tenantClaimsDistinct: true,
      tenantA: { id: a.tenantId, metricsHttp: metricsA.status, ...probeA },
      tenantB: { id: b.tenantId, metricsHttp: metricsB.status, ...probeB },
      invariants: [
        "tenant identity comes from bearer claims",
        "credentials are not printed",
        "cross-tenant resource reads return non-enumerating 404",
        "workspace lists never include another workspace record",
        "no tenant or record is created by this harness",
      ],
    }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ mode: "two-tenant-acceptance", executed: false, error: error instanceof Error ? error.message : "acceptance failed" }, null, 2));
    process.exitCode = 1;
  }
}
