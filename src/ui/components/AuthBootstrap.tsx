import React, { FormEvent, useState } from "react";
import { Alert, Button, Card, CardContent, Stack, TextField, Typography } from "@mui/material";
import { apiClient } from "../services/apiClient";
import useAuthStore from "../store/authStore";

interface AuthTenant {
  id: string;
  name: string;
  email?: string;
  plan?: string;
}

interface AuthenticateResponse {
  success: boolean;
  tenant?: AuthTenant;
  token?: string;
  error?: string;
}

interface RegisterResponse {
  tenant: AuthTenant;
  plainApiKey: string;
}

const AuthBootstrap: React.FC = () => {
  const login = useAuthStore((state) => state.login);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [apiKey, setApiKey] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [email, setEmail] = useState("");
  const [latestKey, setLatestKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const establishSession = async (key: string, tenantHint?: AuthTenant) => {
    const result = await apiClient.post<AuthenticateResponse>("/api/system-engines/auth/authenticate", { apiKey: key });
    if (!result.success || !result.token || !result.tenant) {
      throw new Error(result.error || "Authentication failed");
    }
    login(
      {
        id: result.tenant.id,
        name: result.tenant.name || tenantHint?.name,
        email: result.tenant.email || tenantHint?.email,
        role: "owner",
        tenantId: result.tenant.id,
      },
      result.token,
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLatestKey(null);
    setBusy(true);
    try {
      if (mode === "register") {
        if (!workspaceName.trim() || !email.trim()) {
          throw new Error("Workspace name and email are required");
        }
        const registration = await apiClient.post<RegisterResponse>("/api/system-engines/auth/register", {
          name: workspaceName.trim(),
          email: email.trim(),
          plan: "free",
        });
        setLatestKey(registration.plainApiKey);
        await establishSession(registration.plainApiKey, registration.tenant);
        await apiClient.post("/api/tenants/bootstrap", {
          workspaceName: registration.tenant.name,
          tier: registration.tenant.plan || "free",
        });
      } else {
        if (!apiKey.trim()) throw new Error("API key is required");
        await establishSession(apiKey.trim());
        setApiKey("");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card sx={{ maxWidth: 620, mx: "auto" }}>
      <CardContent>
        <Stack component="form" spacing={2} onSubmit={submit}>
          <Typography variant="h5">Connect your workspace</Typography>
          <Typography variant="body2" color="text.secondary">
            Use a local Content Factory API key to open the protected console. Keys are never sent to third-party URLs.
          </Typography>
          {mode === "register" ? (
            <>
              <TextField label="Workspace name" value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} required />
              <TextField label="Owner email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </>
          ) : (
            <TextField label="Content Factory API key" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} required />
          )}
          {error ? <Alert severity="error">{error}</Alert> : null}
          {latestKey ? (
            <Alert severity="success">
              Workspace created. Save this API key now; it is shown only once: <strong>{latestKey}</strong>
            </Alert>
          ) : null}
          <Button type="submit" variant="contained" disabled={busy}>
            {busy ? "Connecting…" : mode === "register" ? "Create workspace and connect" : "Connect"}
          </Button>
          <Button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}>
            {mode === "login" ? "Create a new local workspace" : "Use an existing API key"}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default AuthBootstrap;
