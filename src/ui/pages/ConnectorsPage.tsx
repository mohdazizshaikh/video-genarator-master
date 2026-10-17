/**
 * Connectors — workspace-owned provider account management.
 *
 * Backed only by tested server capabilities:
 *   GET    /api/connectors
 *   POST   /api/connectors
 *   PATCH  /api/connectors/:connectorId
 *   PUT    /api/connectors/:connectorId/secret
 *   GET    /api/connectors/:connectorId/destinations
 *   POST   /api/connectors/:connectorId/destinations
 *   POST   /api/connectors/:connectorId/destinations/:destinationId/verify  (Telegram only)
 *
 * Destinations are verified against the provider before they can be used by a
 * release target. A connected connector does not by itself enable posting.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Container, Divider, FormControl, InputLabel, MenuItem, Paper,
  Select, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import CableIcon from "@mui/icons-material/Cable";
import RefreshIcon from "@mui/icons-material/Refresh";
import { authenticatedJson, jsonPatch, jsonPost, jsonPut } from "../services/authenticatedJson";

interface ConnectorRecord {
  id: string;
  workspaceId: string;
  platform: string;
  displayName: string;
  status: string;
  credentialRef: string;
  externalAccountId?: string;
  capabilities: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
}

interface DestinationRecord {
  id: string;
  connectorId: string;
  externalDestinationId: string;
  displayName: string;
  status: string;
  verificationEvidence: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

const PLATFORMS = ["telegram", "youtube", "instagram", "facebook", "linkedin", "twitter"];

const statusColor = (status: string): "success" | "warning" | "error" | "default" => {
  if (status === "connected" || status === "verified") return "success";
  if (status === "pending" || status === "pending_verification") return "warning";
  if (status === "error" || status === "permission_error") return "error";
  return "default";
};

function ConnectorsPage() {
  const [connectors, setConnectors] = useState<ConnectorRecord[]>([]);
  const [destinations, setDestinations] = useState<DestinationRecord[]>([]);
  const [selected, setSelected] = useState<ConnectorRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Create form state
  const [platform, setPlatform] = useState("telegram");
  const [displayName, setDisplayName] = useState("");
  const [credentialRef, setCredentialRef] = useState("secret://managed/telegram-bot");
  const [externalAccountId, setExternalAccountId] = useState("");

  // Secret form state
  const [secretJson, setSecretJson] = useState('{\n  "botToken": ""\n}');

  // Destination form state
  const [externalDestinationId, setExternalDestinationId] = useState("");
  const [destinationName, setDestinationName] = useState("");

  const loadConnectors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await authenticatedJson<{ connectors: ConnectorRecord[] }>("/api/connectors");
      setConnectors(payload.connectors || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load connectors");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConnectors();
  }, [loadConnectors]);

  const loadDestinations = useCallback(async (connectorId: string) => {
    try {
      const payload = await authenticatedJson<{ destinations: DestinationRecord[] }>(
        `/api/connectors/${connectorId}/destinations`,
      );
      setDestinations(payload.destinations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load destinations");
    }
  }, []);

  const selectConnector = async (connector: ConnectorRecord) => {
    setSelected(connector);
    setNotice(null);
    setError(null);
    await loadDestinations(connector.id);
  };

  const createConnector = async () => {
    if (!displayName.trim()) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const payload = await authenticatedJson<{ connector: ConnectorRecord }>(
        "/api/connectors",
        jsonPost({
          platform,
          displayName: displayName.trim(),
          credentialRef: credentialRef.trim(),
          externalAccountId: externalAccountId.trim() || undefined,
        }),
      );
      setNotice(`Connector ${payload.connector.id} created with status "${payload.connector.status}".`);
      setDisplayName("");
      setExternalAccountId("");
      await loadConnectors();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connector creation failed");
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (connector: ConnectorRecord, status: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const payload = await authenticatedJson<{ connector: ConnectorRecord }>(
        `/api/connectors/${connector.id}`,
        jsonPatch({ status }),
      );
      setNotice(`Connector ${payload.connector.id} status is now "${payload.connector.status}".`);
      await loadConnectors();
      if (selected?.id === connector.id) setSelected(payload.connector);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setBusy(false);
    }
  };

  const storeSecret = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const secret = JSON.parse(secretJson) as Record<string, string>;
      await authenticatedJson<{ connectorId: string; secretStored: boolean }>(
        `/api/connectors/${selected.id}/secret`,
        jsonPut({ secret }),
      );
      setNotice(`Secret material stored for connector ${selected.id}. Values are encrypted at rest and never returned. Storing again rotates the secret in place.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Secret storage failed");
    } finally {
      setBusy(false);
    }
  };

  const revokeSecret = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const payload = await authenticatedJson<{ connectorId: string; secretRemoved: boolean; connector: ConnectorRecord }>(
        `/api/connectors/${selected.id}/secret`,
        { method: "DELETE" },
      );
      setNotice(payload.secretRemoved
        ? `Secret revoked for connector ${payload.connectorId}. Provider actions for this connector now fail closed until new credentials are stored.`
        : `No stored secret existed for connector ${payload.connectorId}.`);
      await loadConnectors();
      if (payload.connector) setSelected(payload.connector);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Secret revocation failed");
    } finally {
      setBusy(false);
    }
  };

  const createDestination = async () => {
    if (!selected || !externalDestinationId.trim() || !destinationName.trim()) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const payload = await authenticatedJson<{ destination: DestinationRecord }>(
        `/api/connectors/${selected.id}/destinations`,
        jsonPost({
          externalDestinationId: externalDestinationId.trim(),
          displayName: destinationName.trim(),
        }),
      );
      setNotice(`Destination ${payload.destination.id} created with status "pending_verification".`);
      setExternalDestinationId("");
      setDestinationName("");
      await loadDestinations(selected.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Destination creation failed");
    } finally {
      setBusy(false);
    }
  };

  const verifyDestination = async (destination: DestinationRecord) => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const payload = await authenticatedJson<{ destination: DestinationRecord; verified: boolean }>(
        `/api/connectors/${selected.id}/destinations/${destination.id}/verify`,
        { method: "POST" },
      );
      setNotice(`Destination ${payload.destination.displayName} verified against the provider at ${new Date().toISOString()}.`);
      await loadDestinations(selected.id);
      await loadConnectors();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Destination verification failed");
      if (selected) await loadDestinations(selected.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
        <CableIcon color="primary" />
        <Typography variant="h4" fontWeight={700}>Connectors</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Workspace-owned provider accounts. Credentials are referenced only as managed secrets;
        destinations must be verified against the provider before a release can target them.
        Connecting an account does not by itself enable posting.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Create Connector</Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 1 }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Platform</InputLabel>
              <Select value={platform} label="Platform" onChange={(e) => setPlatform(e.target.value)}>
                {PLATFORMS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <TextField
              size="small"
              label="Credential reference"
              value={credentialRef}
              onChange={(e) => setCredentialRef(e.target.value)}
              helperText="Managed reference only, e.g. secret://managed/telegram-bot"
              sx={{ minWidth: 280 }}
            />
            <TextField size="small" label="External account ID (optional)" value={externalAccountId} onChange={(e) => setExternalAccountId(e.target.value)} />
            <Button variant="contained" onClick={createConnector} disabled={busy || !displayName.trim()}>
              Create
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>Workspace Connectors</Typography>
            <Button size="small" startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />} onClick={() => void loadConnectors()}>
              Reload
            </Button>
          </Stack>
          {connectors.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No connectors yet for this workspace.</Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Platform</TableCell>
                    <TableCell>Display name</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Credential ref</TableCell>
                    <TableCell>Connector ID</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {connectors.map((connector) => (
                    <TableRow key={connector.id} hover selected={selected?.id === connector.id}>
                      <TableCell>{connector.platform}</TableCell>
                      <TableCell>{connector.displayName}</TableCell>
                      <TableCell><Chip size="small" label={connector.status} color={statusColor(connector.status)} /></TableCell>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{connector.credentialRef}</TableCell>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{connector.id}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button size="small" onClick={() => void selectConnector(connector)}>Manage</Button>
                          <Button size="small" color="success" disabled={busy} onClick={() => void updateStatus(connector, "connected")}>Connect</Button>
                          <Button size="small" color="inherit" disabled={busy} onClick={() => void updateStatus(connector, "disabled")}>Disable</Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {selected && (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                Secrets — {selected.displayName} ({selected.platform})
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Stored encrypted at rest. Values are never returned by the API and never placed in queue payloads or logs.
                Storing a new value rotates the existing secret in place; revoking removes it and marks the connector as requiring reauthorization.
              </Typography>
              <TextField
                multiline
                minRows={3}
                fullWidth
                value={secretJson}
                onChange={(e) => setSecretJson(e.target.value)}
                sx={{ mb: 2, "& textarea": { fontFamily: "monospace", fontSize: 13 } }}
              />
              <Stack direction="row" spacing={1}>
                <Button variant="contained" onClick={storeSecret} disabled={busy}>Store Secret</Button>
                <Button variant="outlined" color="error" onClick={revokeSecret} disabled={busy}>Revoke Secret</Button>
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Destinations — {selected.displayName}</Typography>
              {destinations.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  No destinations yet. A destination is the provider target (channel, page, or profile) a release can publish to.
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Display name</TableCell>
                        <TableCell>External ID</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Evidence</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {destinations.map((destination) => (
                        <TableRow key={destination.id} hover>
                          <TableCell>{destination.displayName}</TableCell>
                          <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{destination.externalDestinationId}</TableCell>
                          <TableCell><Chip size="small" label={destination.status} color={statusColor(destination.status)} /></TableCell>
                          <TableCell sx={{ fontSize: 12 }}>
                            {Object.entries(destination.verificationEvidence || {}).map(([k, v]) => `${k}: ${v}`).join(" · ") || "—"}
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              disabled={busy || selected.platform !== "telegram"}
                              onClick={() => void verifyDestination(destination)}
                            >
                              Verify (Telegram)
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                <TextField size="small" label="External destination ID" value={externalDestinationId} onChange={(e) => setExternalDestinationId(e.target.value)} helperText="Provider chat/channel/page identifier" />
                <TextField size="small" label="Display name" value={destinationName} onChange={(e) => setDestinationName(e.target.value)} />
                <Button variant="outlined" onClick={createDestination} disabled={busy || !externalDestinationId.trim() || !destinationName.trim()}>
                  Add Destination
                </Button>
              </Box>
            </CardContent>
          </Card>
        </>
      )}
    </Container>
  );
}

export default ConnectorsPage;
