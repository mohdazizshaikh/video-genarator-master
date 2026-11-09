import React from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Container,
  FormControlLabel,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import RefreshIcon from "@mui/icons-material/Refresh";
import StorageIcon from "@mui/icons-material/Storage";
import MemoryIcon from "@mui/icons-material/Memory";
import DnsIcon from "@mui/icons-material/Dns";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useHealthDashboard } from "../hooks/useHealthDashboard";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import EmptyState from "../components/shared/EmptyState";

function formatPercent(value: number | null | undefined) {
  if (value == null) return "N/A";
  return `${Math.round(value * 100)}%`;
}

function formatBytes(value: number | null | undefined) {
  if (value == null) return "N/A";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function SeverityChip({ severity }: { severity: "info" | "warning" | "critical" }) {
  const color = severity === "critical" ? "error" : severity === "warning" ? "warning" : "info";
  return <Chip size="small" color={color} label={severity} variant="outlined" />;
}

function MetricBlock({ label, value, caption }: { label: string; value: string | number; caption?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>{value}</Typography>
      {caption && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {caption}
        </Typography>
      )}
    </Paper>
  );
}

const HealthDashboard: React.FC = () => {
  const { data, loading, error, refresh } = useHealthDashboard({ autoLoad: false });
  const { autoRefreshEnabled, lastUpdatedAt, setAutoRefreshEnabled, refreshNow } = useAutoRefresh(refresh, {
    intervalMs: 30000,
  });

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <MonitorHeartIcon sx={{ fontSize: 34, color: "primary.main" }} />
            <Typography variant="h4" fontWeight={700}>
              System Health Dashboard
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Monitor queue pressure, worker capacity, datastore health, Redis behavior, and resource saturation from one snapshot.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" color="text.secondary">
            {lastUpdatedAt ? `Last updated ${new Date(lastUpdatedAt).toLocaleTimeString()}` : "Waiting for first snapshot"}
          </Typography>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={autoRefreshEnabled}
                onChange={(_, checked) => setAutoRefreshEnabled(checked)}
              />
            }
            label="Auto-refresh"
            sx={{ mr: 0 }}
          />
          {data?.scope === "workspace" && <Alert severity="info" sx={{ mb: 2 }}>Counts and events are limited to this workspace. Worker, database and host details require operations access.</Alert>}
      {data && (
            <Chip
              label={data.status === "ok" ? "Operational" : "Degraded"}
              color={data.status === "ok" ? "success" : "warning"}
              variant="outlined"
            />
          )}
          <Tooltip title="Refresh health snapshot">
            <IconButton onClick={() => void refreshNow()} disabled={loading} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading && !data && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">Loading system health...</Typography>
        </Box>
      )}

      {!loading && !data && !error && (
        <EmptyState
          title="No health snapshot yet"
          description="The dashboard has not received its first monitoring snapshot yet. Try refreshing to request the latest system state."
          actionLabel="Fetch snapshot"
          onAction={() => void refreshNow()}
        />
      )}

      {data?.scope === "workspace" && <Alert severity="info" sx={{ mb: 2 }}>Counts and events are limited to this workspace. Worker, database and host details require operations access.</Alert>}
      {data && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <MetricBlock label="Uptime" value={data.uptime == null ? "N/A" : formatDuration(data.uptime)} caption={data.scope === "workspace" ? "Workspace job telemetry" : `Version ${data.version}`} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricBlock label="Queue Active" value={data.queue.totals.active} caption={`${data.queue.totals.waiting} waiting`} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricBlock label="Worker Capacity" value={data.workers ? `${data.workers.capacity}` : "Admin only"} caption={data.workers ? `${data.workers.online}/${data.workers.total} observed groups online` : "Global operations are restricted"} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricBlock label="Errors Last 24h" value={data.errors.last24h} caption={`Updated ${new Date(data.generatedAt).toLocaleString()}`} />
            </Grid>
          </Grid>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} lg={6}>
              <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <DnsIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>Queue stats</Typography>
                  </Stack>
                  <Grid container spacing={2}>
                    {data.queue.queues.map((queue) => (
                      <Grid item xs={12} md={6} key={queue.id}>
                        <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                            <Typography variant="subtitle1" fontWeight={700}>{queue.label}</Typography>
                            <Chip size="small" label={data.scope === "workspace" ? "Persisted jobs" : data.queue.redisEnabled ? "Redis" : "Direct"} variant="outlined" />
                          </Stack>
                          <Grid container spacing={1}>
                            {[
                              ["Active", queue.counts.active],
                              ["Waiting", queue.counts.waiting],
                              ["Failed", queue.counts.failed],
                              ["Delayed", queue.counts.delayed],
                            ].map(([label, value]) => (
                              <Grid item xs={6} key={String(label)}>
                                <Typography variant="caption" color="text.secondary">{label}</Typography>
                                <Typography variant="h6" fontWeight={700}>{value}</Typography>
                              </Grid>
                            ))}
                          </Grid>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Stack>
              </Paper>
            </Grid>

            {data.workers && (<Grid item xs={12} lg={6}>
              <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <MemoryIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>Worker status</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {data.workers.online} online worker groups, {data.workers.capacity} total capacity, {data.workers.currentJobs ?? "Unknown"} jobs currently in flight.
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Worker</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Capacity</TableCell>
                        <TableCell align="right">Current jobs</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.workers.items.map((worker) => (
                        <TableRow key={worker.id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{worker.label}</Typography>
                            <Typography variant="caption" color="text.secondary">{worker.queue}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={worker.status}
                              color={worker.status === "busy" ? "warning" : worker.status === "online" ? "success" : "default"}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">{worker.capacity}</TableCell>
                          <TableCell align="right">{worker.currentJobs ?? "Unknown"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Stack>
              </Paper>
            </Grid>)}
          </Grid>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            {data.database && (<Grid item xs={12} lg={4}>
              <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <StorageIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>Database health</Typography>
                  </Stack>
                  <Chip
                    size="small"
                    label={data.database.status}
                    color={data.database.status === "ok" ? "success" : "warning"}
                    variant="outlined"
                    sx={{ alignSelf: "flex-start" }}
                  />
                  <Typography variant="body2">Engine: {data.database.engine}</Typography>
                  <Typography variant="body2">Connections: {data.database.connections.active ?? "N/A"}/{data.database.connections.max ?? "N/A"}</Typography>
                  <Typography variant="body2">Latency: {data.database.latencyMs} ms</Typography>
                  <Typography variant="body2">Data size: {formatBytes(data.database.sizeBytes)}</Typography>
                </Stack>
              </Paper>
            </Grid>)}

            {data.redis && (<Grid item xs={12} lg={4}>
              <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <DnsIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>Redis health</Typography>
                  </Stack>
                  <Chip
                    size="small"
                    label={data.redis.status}
                    color={data.redis.status === "ok" ? "success" : data.redis.status === "disabled" ? "default" : "warning"}
                    variant="outlined"
                    sx={{ alignSelf: "flex-start" }}
                  />
                  <Typography variant="body2">Latency: {data.redis.latencyMs ?? "N/A"} {data.redis.latencyMs != null ? "ms" : ""}</Typography>
                  <Typography variant="body2">Memory used: {formatBytes(data.redis.memoryUsedBytes)}</Typography>
                  <Typography variant="body2">Memory peak: {formatBytes(data.redis.memoryPeakBytes)}</Typography>
                  <Typography variant="body2">Hit rate: {formatPercent(data.redis.hitRate)}</Typography>
                  <Typography variant="body2">Keys: {data.redis.keyCount}</Typography>
                </Stack>
              </Paper>
            </Grid>)}

            {data.system && (<Grid item xs={12} lg={4}>
              <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <MonitorHeartIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>System resources</Typography>
                  </Stack>
                  {[
                    ["CPU", data.system.cpuPercent],
                    ["Memory", data.system.memoryPercent],
                    ["Disk", data.system.diskPercent],
                  ].map(([label, value]) => (
                    <Box key={String(label)}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="body2">{label}</Typography>
                        <Typography variant="body2" fontWeight={600}>{value}%</Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={Number(value)}
                        color={Number(value) >= 85 ? "error" : Number(value) >= 70 ? "warning" : "primary"}
                        sx={{ height: 10, borderRadius: 999 }}
                      />
                    </Box>
                  ))}
                  <Typography variant="caption" color="text.secondary">
                    Load average: {data.system.loadAverage.join(", ")}
                  </Typography>
                </Stack>
              </Paper>
            </Grid>)}
          </Grid>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} lg={5}>
              <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
                <Stack spacing={2}>
                  <Typography variant="h6" fontWeight={700}>Error rate trend</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Failures recorded in the last 24 hours, grouped into 4-hour buckets.
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="flex-end" sx={{ minHeight: 180 }}>
                    {data.errors.trend.map((point) => {
                      const max = Math.max(1, ...data.errors.trend.map((item) => item.count));
                      const heightPercent = Math.max(8, Math.round((point.count / max) * 100));
                      return (
                        <Box key={point.label} sx={{ flex: 1, textAlign: "center" }}>
                          <Box
                            sx={{
                              height: `${heightPercent}%`,
                              minHeight: 18,
                              borderRadius: 2,
                              background: point.count > 0 ? "linear-gradient(180deg, #ef5350, #ff8a65)" : "#e0e0e0",
                              mb: 1,
                            }}
                          />
                          <Typography variant="caption" display="block">{point.count}</Typography>
                          <Typography variant="caption" color="text.secondary">{point.label}</Typography>
                        </Box>
                      );
                    })}
                  </Stack>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={7}>
              <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
                <Stack spacing={2}>
                  <Typography variant="h6" fontWeight={700}>Slow requests log</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Telemetry events with latency above 1 second, sorted by slowest first.
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Request</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Latency</TableCell>
                        <TableCell align="right">Created</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.slowRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4}>
                            <Typography variant="body2" color="text.secondary">
                              No slow requests recorded.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        data.slowRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>{request.label}</Typography>
                              <Typography variant="caption" color="text.secondary">Phase {request.phase}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={request.status}
                                color={request.status === "failed" ? "error" : "success"}
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="right">{(request.latencyMs / 1000).toFixed(1)}s</TableCell>
                            <TableCell align="right">{new Date(request.createdAt).toLocaleString()}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} lg={7}>
              <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <WarningAmberIcon color="warning" />
                    <Typography variant="h6" fontWeight={700}>Alerts</Typography>
                  </Stack>
                  {data.alerts.map((alert) => (
                    <Alert
                      key={alert.id}
                      severity={alert.severity === "critical" ? "error" : alert.severity}
                      action={<SeverityChip severity={alert.severity} />}
                    >
                      <Typography variant="subtitle2" fontWeight={700}>{alert.title}</Typography>
                      <Typography variant="body2">{alert.description}</Typography>
                    </Alert>
                  ))}
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={5}>
              <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
                <Stack spacing={2}>
                  <Typography variant="h6" fontWeight={700}>Queue state visibility</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Render jobs</Typography>
                        {Object.entries(data.queueStates.renderStates).length === 0 ? (
                          <Typography variant="body2" color="text.secondary">No render jobs yet.</Typography>
                        ) : (
                          Object.entries(data.queueStates.renderStates).map(([status, count]) => (
                            <Stack key={status} direction="row" justifyContent="space-between">
                              <Typography variant="body2">{status}</Typography>
                              <Typography variant="body2" fontWeight={600}>{count}</Typography>
                            </Stack>
                          ))
                        )}
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Publish jobs</Typography>
                        {Object.entries(data.queueStates.publishStates).length === 0 ? (
                          <Typography variant="body2" color="text.secondary">No publish jobs yet.</Typography>
                        ) : (
                          Object.entries(data.queueStates.publishStates).map(([status, count]) => (
                            <Stack key={status} direction="row" justifyContent="space-between">
                              <Typography variant="body2">{status}</Typography>
                              <Typography variant="body2" fontWeight={600}>{count}</Typography>
                            </Stack>
                          ))
                        )}
                      </Paper>
                    </Grid>
                  </Grid>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Container>
  );
};

export default HealthDashboard;
