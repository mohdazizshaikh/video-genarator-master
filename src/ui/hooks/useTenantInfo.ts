import { useMemo } from "react";
import useQuery from "./useQuery";
import { api } from "../services/apiClient";

export interface TenantRecord {
  id: string;
  workspaceName: string;
  tier?: string;
  description?: string;
  logoUrl?: string;
  members?: TenantMember[];
}

export interface TenantMember {
  id: string;
  email: string;
  role: "owner" | "admin" | "editor" | "viewer";
}

export interface TenantApiKey {
  id: string;
  name: string;
  prefix?: string;
  createdAt?: string;
  lastUsedAt?: string;
}

export interface TenantQuotaSnapshot {
  apiCallsUsed: number;
  apiCallsLimit: number;
  rendersUsed: number;
  rendersLimit: number;
  storageUsedGb: number;
  storageLimitGb: number;
}

export interface TenantBillingSnapshot {
  plan: "free" | "starter" | "pro" | "enterprise";
  month: string;
  amountUsd: number;
  usageUsd?: number;
  status?: "active" | "past_due" | "canceled";
}

export function useTenants(enabled = true) {
  const query = useQuery<TenantRecord[]>(() => api.tenants.list() as Promise<TenantRecord[]>, { enabled });

  return {
    ...query,
    tenants: query.data ?? [],
  };
}

export function useTenantDetails(tenantId?: string) {
  const query = useQuery<TenantRecord>(
    () => api.tenants.get(tenantId || "") as Promise<TenantRecord>,
    { enabled: Boolean(tenantId) },
  );

  return {
    ...query,
    tenant: query.data ?? null,
  };
}

export function useTenantKeys(tenantId?: string) {
  const query = useQuery<TenantApiKey[]>(
    () => api.tenants.keys.list(tenantId || "") as Promise<TenantApiKey[]>,
    { enabled: Boolean(tenantId) },
  );

  return {
    ...query,
    keys: query.data ?? [],
  };
}

export function useTenantMembers(tenant?: TenantRecord | null) {
  return useMemo(() => tenant?.members ?? [], [tenant]);
}

export function useTenantQuota(tenantId?: string) {
  const query = useQuery<TenantQuotaSnapshot>(
    async () => {
      const raw = await api.tenants.quota.get(tenantId || "") as { usage?: { renders?: number; storageBytes?: number }; quota?: { limits?: { monthlyRenders?: number; maxStorageBytes?: number } } };
      return {
        apiCallsUsed: 0,
        apiCallsLimit: 1,
        rendersUsed: raw.usage?.renders ?? 0,
        rendersLimit: raw.quota?.limits?.monthlyRenders ?? 1,
        storageUsedGb: (raw.usage?.storageBytes ?? 0) / 1_000_000_000,
        storageLimitGb: (raw.quota?.limits?.maxStorageBytes ?? 1_000_000_000) / 1_000_000_000,
      };
    },
    { enabled: Boolean(tenantId) },
  );

  return {
    ...query,
    quota: query.data ?? null,
  };
}

export function useTenantBilling(tenantId?: string) {
  const month = new Date().toISOString().slice(0, 7);
  const query = useQuery<TenantBillingSnapshot>(
    async () => {
      const raw = await api.tenants.billing.get(tenantId || "", month) as { usage?: { estimatedCostUsd?: number }; plan?: TenantBillingSnapshot["plan"]; amountUsd?: number; usageUsd?: number; status?: TenantBillingSnapshot["status"] };
      return {
        plan: raw.plan ?? "free",
        month,
        amountUsd: raw.amountUsd ?? 0,
        usageUsd: raw.usageUsd ?? raw.usage?.estimatedCostUsd ?? 0,
        status: raw.status ?? "active",
      };
    },
    { enabled: Boolean(tenantId) },
  );

  return {
    ...query,
    billing: query.data ?? null,
  };
}
