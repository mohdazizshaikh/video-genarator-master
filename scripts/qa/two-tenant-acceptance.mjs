#!/usr/bin/env node
const baseUrl = (process.env.ACCEPTANCE_BASE_URL || "http://localhost:3123").replace(/\/$/, "");
const required = ["TENANT_A_API_KEY", "TENANT_B_API_KEY"];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  console.log(JSON.stringify({ mode: "two-tenant-acceptance", executed: false, blockers: missing.map((name) => `${name} is absent`), invariants: ["credentials are owner-provided", "no tenant or record is created by this harness", "secret values are never printed"] }, null, 2));
  process.exitCode = 2;
} else {
  const auth = async (apiKey) => {
    const response = await fetch(`${baseUrl}/api/system/auth/authenticate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ apiKey }) });
    const body = await response.json();
    if (!response.ok || !body.data?.token || !body.data?.tenant?.id) throw new Error(`authentication failed with HTTP ${response.status}`);
    return { token: body.data.token, tenantId: body.data.tenant.id };
  };
  try {
    const a = await auth(process.env.TENANT_A_API_KEY);
    const b = await auth(process.env.TENANT_B_API_KEY);
    if (a.tenantId === b.tenantId) throw new Error("tenant credentials resolve to the same tenant");
    const metrics = async (token) => {
      const response = await fetch(`${baseUrl}/api/job-events/outbox/metrics`, { headers: { authorization: `Bearer ${token}` } });
      return { status: response.status, body: await response.json() };
    };
    const [metricsA, metricsB] = await Promise.all([metrics(a.token), metrics(b.token)]);
    if (metricsA.status !== 200 || metricsB.status !== 200) throw new Error("tenant-protected metrics request failed");
    console.log(JSON.stringify({ mode: "two-tenant-acceptance", executed: true, tenantClaimsDistinct: true, tenantA: { id: a.tenantId, metricsHttp: metricsA.status }, tenantB: { id: b.tenantId, metricsHttp: metricsB.status }, invariants: ["tenant identity comes from bearer claims", "credentials are not printed", "no cross-tenant identifier is accepted by this harness"] }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ mode: "two-tenant-acceptance", executed: false, error: error instanceof Error ? error.message : "acceptance failed" }, null, 2));
    process.exitCode = 1;
  }
}
