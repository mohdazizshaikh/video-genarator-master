/**
 * Releases — approved content versions to verified destinations.
 *
 * Backed only by tested server capabilities:
 *   GET    /api/content-versions
 *   GET    /api/releases                    (workspace-scoped list)
 *   POST   /api/releases                    (create from a content version)
 *   GET    /api/releases/:releaseId         (release + targets)
 *   POST   /api/releases/:releaseId/approve
 *   POST   /api/releases/:releaseId/targets (verified destination required)
 *   POST   /api/releases/:releaseId/queue   (enqueue publish for an approved target)
 *
 * Queueing requires approval permission and a connected connector with a
 * verified destination. Provider posting itself requires owner-provided
 * credentials; this page never fabricates provider results.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Container, Divider, FormControl, InputLabel, MenuItem, Paper,
  Select, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import RefreshIcon from "@mui/icons-material/Refresh";
import { authenticatedJson, jsonPost } from "../services/authenticatedJson";

interface ContentVersion {
  id: string;
  workspaceId: string;
  title: string;
  status: string;
  createdAt: string;
}

interface ReleaseRecord {
  id: string;
  workspaceId: string;
  contentVersionId: string;
  approvalStatus: string;
  status: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ReleaseTarget {
  id: string;
  releaseId: string;
  connectorId: string;
  destinationId: string;
  status: string;
  idempotencyKey: string;
  externalId?: string;
  publishedUrl?: string;
  lastErrorCode?: string;
  attempts: number;
}

interface ConnectorRecord {
  id: string;
  platform: string;
  displayName: string;
  status: string;
}

interface DestinationRecord {
  id: string;
  displayName: string;
  status: string;
}

const statusColor = (status: string): "success" | "warning" | "error" | "info" | "default" => {
  if (status === "approved" || status === "published" || status === "ready") return "success";
  if (status === "pending_approval" || status === "queued" || status === "rendering" || status === "draft") return "warning";
  if (status === "failed" || status === "rejected" || status === "retryable" || status === "cancelled") return "error";
  if (status === "publishing") return "info";
  return "default";
};

function ReleasesPage() {
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [releases, setReleases] = useState<ReleaseRecord[]>([]);
  const [selected, setSelected] = useState<ReleaseRecord | null>(null);
  const [targets, setTargets] = useState<ReleaseTarget[]>([]);
  const [connectors, setConnectors] = useState<ConnectorRecord[]>([]);
  const [destinations, setDestinations] = useState<DestinationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Add-target form state
  const [connectorId, setConnectorId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");

  // Queue form state
  const [queueTargetId, setQueueTargetId] = useState("");
  const [renderOutputPath, setRenderOutputPath] = useState("");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [versionsPayload, releasesPayload, connectorsPayload] = await Promise.all([
        authenticatedJson<{ versions: ContentVersion[] }>("/api/content-versions"),
        authenticatedJson<{ releases: ReleaseRecord[] }>("/api/releases"),
        authenticatedJson<{ connectors: ConnectorRecord[] }>("/api/connectors"),
      ]);
      setVersions(versionsPayload.versions || []);
      setReleases(releasesPayload.releases || []);
      setConnectors(connectorsPayload.connectors || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load releases data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const openRelease = async (release: ReleaseRecord) => {
    setSelected(release);
    setError(null);
    setNotice(null);
    setQueueTargetId("");
    try {
      const payload = await authenticatedJson<{ release: ReleaseRecord; targets: ReleaseTarget[] }>(
        `/api/releases/${release.id}`,
      );
      setSelected(payload.release);
      setTargets(payload.targets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load release detail");
    }
  };

  const createRelease = async (version: ContentVersion) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const payload = await authenticatedJson<{ release: ReleaseRecord }>(
        "/api/releases",
        jsonPost({ contentVersionId: version.id }),
      );
      setNotice(`Release ${payload.release.id} created with approval status "${payload.release.approvalStatus}".`);
      await loadAll();
      await openRelease(payload.release);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Release creation failed");
    } finally {
      setBusy(false);
    }
  };

  const approveRelease = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const payload = await authenticatedJson<{ release: ReleaseRecord }>(
        `/api/releases/${selected.id}/approve`,
        { method: "POST" },
      );
      setNotice(`Release ${payload.release.id} approved by ${payload.release.approvedBy}.`);
      await loadAll();
      await openRelease(payload.release);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Release approval failed");
    } finally {
      setBusy(false);
    }
  };

  const loadDestinations = async (selectedConnectorId: string) => {
    setConnectorId(selectedConnectorId);
    setDestinationId("");
    try {
      const payload = await authenticatedJson<{ destinations: DestinationRecord[] }>(
        `/api/connectors/${selectedConnectorId}/destinations`,
      );
      setDestinations(payload.destinations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load destinations");
    }
  };

  const addTarget = async () => {
    if (!selected || !connectorId || !destinationId) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const key = idempotencyKey.trim() || `target-${selected.id}-${destinationId}`;
      const payload = await authenticatedJson<{ target: ReleaseTarget }>(
        `/api/releases/${selected.id}/targets`,
        jsonPost({ connectorId, destinationId, idempotencyKey: key }),
      );
      setNotice(`Target ${payload.target.id} added (idempotency key "${payload.target.idempotencyKey}").`);
      setIdempotencyKey("");
      await openRelease(selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Target creation failed");
    } finally {
      setBusy(false);
    }
  };

  const queueTarget = async () => {
    if (!selected || !queueTargetId || !renderOutputPath.trim() || !title.trim()) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const tagList = tags.split(",").map((tag) => tag.trim()).filter(Boolean);
      const payload = await authenticatedJson<{ jobId: string; targetId: string; queued: boolean }>(
        `/api/releases/${selected.id}/queue`,
        jsonPost({
          targetId: queueTargetId,
          renderOutputPath: renderOutputPath.trim(),
          title: title.trim(),
          tags: tagList,
        }),
      );
      setNotice(`Publish job ${payload.jobId} queued for target ${payload.targetId}.`);
      setRenderOutputPath("");
      setTitle("");
      setTags("");
      await openRelease(selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Queueing failed");
    } finally {
      setBusy(false);
    }
  };

  const verifiedDestinations = destinations.filter((d) => d.status === "verified");
  const queuedTargets = targets.filter((t) => t.status === "queued");
  const canApprove = selected ? selected.approvalStatus !== "approved" : false;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
        <RocketLaunchIcon color="primary" />
        <Typography variant="h4" fontWeight={700}>Releases</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        A release pins one approved content version to verified destinations.
        Publishing requires a connected connector, a verified destination, and an approved release.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>Content Versions</Typography>
            <Button size="small" startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />} onClick={() => void loadAll()}>
              Reload
            </Button>
          </Stack>
          {versions.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No content versions yet. Create one through the content pipeline before building a release.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Version ID</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {versions.map((version) => (
                    <TableRow key={version.id} hover>
                      <TableCell>{version.title || "Untitled"}</TableCell>
                      <TableCell><Chip size="small" label={version.status} color={statusColor(version.status)} /></TableCell>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{version.id}</TableCell>
                      <TableCell>{new Date(version.createdAt).toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <Button size="small" disabled={busy} onClick={() => void createRelease(version)}>
                          Create Release
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Workspace Releases</Typography>
          {releases.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No releases yet for this workspace.</Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Release ID</TableCell>
                    <TableCell>Content version</TableCell>
                    <TableCell>Approval</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {releases.map((release) => (
                    <TableRow key={release.id} hover selected={selected?.id === release.id}>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{release.id}</TableCell>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{release.contentVersionId}</TableCell>
                      <TableCell><Chip size="small" label={release.approvalStatus} color={statusColor(release.approvalStatus)} /></TableCell>
                      <TableCell><Chip size="small" label={release.status} color={statusColor(release.status)} /></TableCell>
                      <TableCell>{new Date(release.createdAt).toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <Button size="small" onClick={() => void openRelease(release)}>Open</Button>
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
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
              Release Detail — <span style={{ fontFamily: "monospace", fontSize: 14 }}>{selected.id}</span>
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Chip size="small" label={`approval: ${selected.approvalStatus}`} color={statusColor(selected.approvalStatus)} />
              <Chip size="small" label={`status: ${selected.status}`} color={statusColor(selected.status)} />
              {selected.approvedBy && <Chip size="small" label={`approved by ${selected.approvedBy}`} />}
            </Stack>

            <Button variant="contained" disabled={busy || !canApprove} onClick={approveRelease} sx={{ mb: 2 }}>
              {canApprove ? "Approve Release" : "Approved"}
            </Button>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Targets</Typography>
            {targets.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                No targets yet. Add a verified destination below.
              </Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Target ID</TableCell>
                      <TableCell>Connector</TableCell>
                      <TableCell>Destination</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Attempts</TableCell>
                      <TableCell>Published URL / Error</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {targets.map((target) => (
                      <TableRow key={target.id} hover>
                        <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{target.id}</TableCell>
                        <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{target.connectorId}</TableCell>
                        <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{target.destinationId}</TableCell>
                        <TableCell><Chip size="small" label={target.status} color={statusColor(target.status)} /></TableCell>
                        <TableCell>{target.attempts}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>
                          {target.publishedUrl || (target.lastErrorCode ? `error: ${target.lastErrorCode}` : "—")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Connector</InputLabel>
                <Select value={connectorId} label="Connector" onChange={(e) => void loadDestinations(e.target.value)}>
                  {connectors.map((connector) => (
                    <MenuItem key={connector.id} value={connector.id}>
                      {connector.displayName} ({connector.platform} · {connector.status})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel>Verified destination</InputLabel>
                <Select value={destinationId} label="Verified destination" onChange={(e) => setDestinationId(e.target.value)}>
                  {verifiedDestinations.map((destination) => (
                    <MenuItem key={destination.id} value={destination.id}>{destination.displayName}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField size="small" label="Idempotency key (optional)" value={idempotencyKey} onChange={(e) => setIdempotencyKey(e.target.value)} />
              <Button variant="outlined" onClick={addTarget} disabled={busy || !connectorId || !destinationId}>
                Add Target
              </Button>
            </Box>
            {connectorId && verifiedDestinations.length === 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                This connector has no verified destinations yet. Verify one on the Connectors page first.
              </Alert>
            )}

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Queue Publish</Typography>
            {queuedTargets.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No queued targets. Add a target to an approved release to make it queueable.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <InputLabel>Queued target</InputLabel>
                  <Select value={queueTargetId} label="Queued target" onChange={(e) => setQueueTargetId(e.target.value)}>
                    {queuedTargets.map((target) => (
                      <MenuItem key={target.id} value={target.id}>{target.id}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField size="small" label="Render output path (absolute)" value={renderOutputPath} onChange={(e) => setRenderOutputPath(e.target.value)} sx={{ minWidth: 280 }} />
                <TextField size="small" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                <TextField size="small" label="Tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} />
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={queueTarget}
                  disabled={busy || !queueTargetId || !renderOutputPath.trim() || !title.trim()}
                >
                  Queue Publish
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Container>
  );
}

export default ReleasesPage;
