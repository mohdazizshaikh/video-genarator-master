import React, { useEffect, useMemo, useState } from "react";
import crypto from "crypto";
import { Alert, Grid, Stack, Typography } from "@mui/material";
import WorkspaceSwitcher from "../components/tenant/WorkspaceSwitcher";
import AuthBootstrap from "../components/AuthBootstrap";
import useAuthStore from "../store/authStore";
import { apiClient } from "../services/apiClient";
import WorkspaceSettings from "../components/tenant/WorkspaceSettings";
import TeamMembers from "../components/tenant/TeamMembers";
import APIKeys from "../components/tenant/APIKeys";
import QuotaUsage from "../components/tenant/QuotaUsage";
import BillingPage from "../components/tenant/BillingPage";
import AuditLog, { AuditLogEntry } from "../components/tenant/AuditLog";
import SubscriptionManagement from "../components/tenant/SubscriptionManagement";
import Integrations, { IntegrationRecord } from "../components/tenant/Integrations";
import AutomationRules from "../components/tenant/AutomationRules";
import { useTenantBilling, useTenantDetails, useTenantKeys, useTenantMembers, useTenantQuota, useTenants } from "../hooks/useTenantInfo";
import {
  useCancelSubscriptionMutation,
  useCreateApiKeyMutation,
  useIntegrationToggleMutation,
  useInviteMemberMutation,
  usePlanChangeMutation,
  useRegenerateApiKeyMutation,
  useRemoveMemberMutation,
  useRevokeApiKeyMutation,
  useUpdateWorkspaceMutation,
} from "../hooks/useTenantMutation";

const TenantConsole: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => Boolean(state.token && state.user));
  const authTenantId = useAuthStore((state) => state.user?.tenantId || state.user?.id || "");
  const authUserName = useAuthStore((state) => state.user?.name || "Workspace");
  const { tenants, isLoading: listLoading, error: listError, refetch: refetchTenants } = useTenants(isAuthenticated);
  const [selectedTenantId, setSelectedTenantId] = useState(authTenantId);
  const [latestSecret, setLatestSecret] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!selectedTenantId && authTenantId) {
      setSelectedTenantId(authTenantId);
      return;
    }
    if (!selectedTenantId && tenants.length > 0) {
      setSelectedTenantId(tenants[0].id);
    }
  }, [authTenantId, selectedTenantId, tenants]);

  useEffect(() => {
    if (!isAuthenticated || !authTenantId || listLoading || tenants.length > 0) return;
    let cancelled = false;
    void apiClient.post("/api/tenants/bootstrap", { workspaceName: authUserName, tier: "free" })
      .then(() => { if (!cancelled) void refetchTenants(); })
      .catch(() => { /* The visible console error remains fail-closed; no child request is sent without a tenant ID. */ });
    return () => { cancelled = true; };
  }, [authTenantId, authUserName, isAuthenticated, listLoading, refetchTenants, tenants.length]);

  const { tenant, refetch: refetchTenant } = useTenantDetails(selectedTenantId);
  const { keys, refetch: refetchKeys } = useTenantKeys(selectedTenantId);
  const { quota, refetch: refetchQuota } = useTenantQuota(selectedTenantId);
  const { billing, refetch: refetchBilling } = useTenantBilling(selectedTenantId);
  const members = useTenantMembers(tenant);

  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationRecord[]>([
    { id: "youtube", platform: "youtube", connected: false },
    { id: "instagram", platform: "instagram", connected: false },
    { id: "facebook", platform: "facebook", connected: false },
    { id: "telegram", platform: "telegram", connected: false },
  ]);

  const appendAudit = (action: string, target?: string) => {
    setAuditEntries((prev) => [
      {
        id: `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
        actor: "current-user",
        action,
        target,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const refreshAll = async () => {
    await Promise.all([refetchTenants(), refetchTenant(), refetchKeys(), refetchQuota(), refetchBilling()]);
  };

  const updateWorkspace = useUpdateWorkspaceMutation(selectedTenantId, refreshAll);
  const inviteMember = useInviteMemberMutation(selectedTenantId, refreshAll);
  const removeMember = useRemoveMemberMutation(selectedTenantId, refreshAll);
  const createApiKey = useCreateApiKeyMutation(selectedTenantId, async () => {
    await refreshAll();
  });
  const regenerateApiKey = useRegenerateApiKeyMutation(selectedTenantId, async () => {
    await refreshAll();
  });
  const revokeApiKey = useRevokeApiKeyMutation(selectedTenantId, refreshAll);
  const planChange = usePlanChangeMutation(selectedTenantId, refreshAll);
  const cancelSubscription = useCancelSubscriptionMutation(selectedTenantId, refreshAll);
  const integrationToggle = useIntegrationToggleMutation(selectedTenantId, refreshAll);

  const topError = useMemo(() => {
    if (listError) return listError.message;
    if (!listLoading && tenants.length === 0) return "No workspaces found. Create one via API, then refresh.";
    return null;
  }, [listError, listLoading, tenants.length]);

  if (!isAuthenticated) {
    return (
      <Stack spacing={3}>
        <Typography variant="h4">Multi-Tenant Console</Typography>
        <AuthBootstrap />
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h4">Multi-Tenant Console</Typography>
      <Typography variant="body2" color="text.secondary">
        Manage workspace settings, team access, and API credentials.
      </Typography>

      <WorkspaceSwitcher
        tenants={tenants}
        value={selectedTenantId}
        onChange={(tenantId) => {
          setSelectedTenantId(tenantId);
          setLatestSecret(undefined);
        }}
      />

      {topError ? <Alert severity="info">{topError}</Alert> : null}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <WorkspaceSettings
            tenant={tenant}
            saving={updateWorkspace.isLoading}
            onSave={async (payload) => {
              await updateWorkspace.mutateAsync(payload);
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TeamMembers
            members={members}
            inviting={inviteMember.isLoading}
            removing={removeMember.isLoading}
            onInvite={async (payload) => {
              await inviteMember.mutateAsync(payload);
            }}
            onRemove={async (memberId) => {
              await removeMember.mutateAsync({ memberId });
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <APIKeys
            keys={keys}
            creating={createApiKey.isLoading}
            regenerating={regenerateApiKey.isLoading}
            revoking={revokeApiKey.isLoading}
            latestSecret={latestSecret}
            onCreate={async (name) => {
              const result = await createApiKey.mutateAsync({ name });
              setLatestSecret(result?.value);
              appendAudit("api-key-created", name);
            }}
            onRegenerate={async (keyId) => {
              const result = await regenerateApiKey.mutateAsync({ keyId });
              setLatestSecret(result?.value);
              appendAudit("api-key-regenerated", keyId);
            }}
            onRevoke={async (keyId) => {
              await revokeApiKey.mutateAsync({ keyId });
              setLatestSecret(undefined);
              appendAudit("api-key-revoked", keyId);
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <QuotaUsage
            quotas={[
              {
                label: "API Calls",
                used: quota?.apiCallsUsed ?? 0,
                limit: quota?.apiCallsLimit ?? 1,
              },
              {
                label: "Video Renders",
                used: quota?.rendersUsed ?? 0,
                limit: quota?.rendersLimit ?? 1,
              },
              {
                label: "Storage",
                used: quota?.storageUsedGb ?? 0,
                limit: quota?.storageLimitGb ?? 1,
                unit: "GB",
              },
            ]}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <BillingPage
            billing={billing}
            changingPlan={planChange.isLoading}
            onPlanChange={async (nextPlan) => {
              await planChange.mutateAsync({ plan: nextPlan });
              appendAudit("plan-changed", nextPlan);
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <SubscriptionManagement
            currentPlan={billing?.plan ?? "free"}
            cancelling={cancelSubscription.isLoading}
            onCancel={async () => {
              await cancelSubscription.mutateAsync();
              appendAudit("subscription-canceled");
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Integrations
            items={integrations}
            onToggle={async (id, nextState) => {
              await integrationToggle.mutateAsync({ integrationId: id, connected: nextState });
              setIntegrations((prev) => prev.map((item) => (item.id === id ? { ...item, connected: nextState } : item)));
              appendAudit(nextState ? "integration-connected" : "integration-disconnected", id);
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <AuditLog entries={auditEntries} />
        </Grid>
        <Grid item xs={12}>
          <AutomationRules onAudit={appendAudit} />
        </Grid>
      </Grid>
    </Stack>
  );
};

export default TenantConsole;
