import { authenticatedFetch } from "../services/authenticatedFetch";
/**
 * SchedulerDashboard – Phase F3
 * Manage automated video creation scheduling, queue health, and job history.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Container,
  Typography,
  Stack,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Divider,
  Tabs,
  Tab,
  Paper,
  Chip,
  Tooltip,
  IconButton,
  FormControlLabel,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import ScheduleIcon from "@mui/icons-material/Schedule";
import RefreshIcon from "@mui/icons-material/Refresh";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ListAltIcon from "@mui/icons-material/ListAlt";
import HistoryIcon from "@mui/icons-material/History";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CalendarViewWeekIcon from "@mui/icons-material/CalendarViewWeek";
import { useScheduledJobs, type QueueCounts } from "../hooks/useScheduledJobs";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { ScheduleForm } from "../components/scheduler/ScheduleForm";
import { ScheduledJobsList } from "../components/scheduler/ScheduledJobsList";
import { ScheduleHistory } from "../components/scheduler/ScheduleHistory";
import { ScheduleCalendar } from "../components/scheduler/ScheduleCalendar";
import EmptyState from "../components/shared/EmptyState";

// ─── Queue Stats Cards ────────────────────────────────────────────────────────

interface QueueCardProps {
  label: string;
  counts: QueueCounts;
  redisEnabled: boolean;
}

const STAT_DEFS = [
  { key: "active" as const, label: "Active", icon: <AutorenewIcon sx={{ fontSize: 18, color: "info.main" }} />, color: "info.main" },
  { key: "waiting" as const, label: "Waiting", icon: <HourglassEmptyIcon sx={{ fontSize: 18, color: "warning.main" }} />, color: "warning.main" },
  { key: "completed" as const, label: "Completed", icon: <CheckCircleIcon sx={{ fontSize: 18, color: "success.main" }} />, color: "success.main" },
  { key: "failed" as const, label: "Failed", icon: <ErrorIcon sx={{ fontSize: 18, color: "error.main" }} />, color: "error.main" },
  { key: "delayed" as const, label: "Delayed", icon: <PauseCircleIcon sx={{ fontSize: 18, color: "secondary.main" }} />, color: "secondary.main" },
];

const QueueCard: React.FC<QueueCardProps> = ({ label, counts, redisEnabled }) => (
  <Card variant="outlined" sx={{ height: "100%" }}>
    <CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" fontWeight={700}>{label} Queue</Typography>
        <Chip
          label={redisEnabled ? "Redis" : "In-memory"}
          size="small"
          color={redisEnabled ? "success" : "default"}
          variant="outlined"
        />
      </Stack>
      <Stack direction="row" spacing={2} flexWrap="wrap">
        {STAT_DEFS.map(({ key, label: statLabel, icon, color }) => (
          <Box key={key} sx={{ textAlign: "center", minWidth: 52 }}>
            <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="center">
              {icon}
              <Typography variant="h6" fontWeight={700} sx={{ color }}>
                {counts[key]}
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">{statLabel}</Typography>
          </Box>
        ))}
      </Stack>
    </CardContent>
  </Card>
);

// ─── Tab panel helper ─────────────────────────────────────────────────────────

interface TabPanelProps {
  value: number;
  index: number;
  children: React.ReactNode;
}

const TabPanel: React.FC<TabPanelProps> = ({ value, index, children }) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ pt: 2 }}>
    {value === index && children}
  </Box>
);

// ─── Upcoming Schedules Tab ───────────────────────────────────────────────────

interface UpcomingSchedule {
  id: string;
  name: string;
  platforms: string[];
  categories: string[];
  nextRun?: string;
  contentType?: string;
  bestTimeRecommendation?: { hour?: number; dayOfWeek?: number; confidence?: number };
  engines?: { enableHumanMimicry?: boolean; enableHashtagOptimization?: boolean };
}

const UpcomingTab: React.FC = () => {
  const [schedules, setSchedules] = useState<UpcomingSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUpcoming = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch("/api/schedule/upcoming?hours=24");
      const data = await res.json();
      setSchedules(Array.isArray(data.schedules) ? data.schedules : []);
    } catch {
      setError("Failed to load upcoming schedules.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchUpcoming(); }, [fetchUpcoming]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (schedules.length === 0) {
    return (
      <EmptyState
        title="No upcoming schedules in the next 24 hours"
        description="Create a schedule with a publishAt time in the next 24 hours to see it here."
        actionLabel="Refresh"
        onAction={() => void fetchUpcoming()}
      />
    );
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          {schedules.length} schedule{schedules.length !== 1 ? "s" : ""} due in the next 24 hours
        </Typography>
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={() => void fetchUpcoming()}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell><Typography variant="caption" fontWeight={700}>Name</Typography></TableCell>
            <TableCell><Typography variant="caption" fontWeight={700}>Platforms</Typography></TableCell>
            <TableCell><Typography variant="caption" fontWeight={700}>Content Type</Typography></TableCell>
            <TableCell><Typography variant="caption" fontWeight={700}>Next Run</Typography></TableCell>
            <TableCell><Typography variant="caption" fontWeight={700}>Best Time</Typography></TableCell>
            <TableCell><Typography variant="caption" fontWeight={700}>Flags</Typography></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {schedules.map((s) => {
            const bestHour = s.bestTimeRecommendation?.hour;
            const bestConfidence = s.bestTimeRecommendation?.confidence;
            return (
              <TableRow key={s.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{s.name}</Typography>
                  {s.categories?.[0] && (
                    <Typography variant="caption" color="text.secondary">{s.categories[0]}</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    {(s.platforms || []).map((p) => (
                      <Chip key={p} label={p} size="small" variant="outlined" sx={{ fontSize: "0.65rem" }} />
                    ))}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip
                    label={s.contentType || "video"}
                    size="small"
                    color={s.contentType === "image" ? "info" : s.contentType === "carousel" ? "secondary" : "primary"}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {s.nextRun ? new Date(s.nextRun).toLocaleString() : "—"}
                  </Typography>
                </TableCell>
                <TableCell>
                  {bestHour !== undefined ? (
                    <Tooltip title={`Confidence: ${Math.round((bestConfidence ?? 0) * 100)}%`}>
                      <Chip
                        label={`${bestHour}:00`}
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ fontSize: "0.65rem" }}
                      />
                    </Tooltip>
                  ) : (
                    <Typography variant="caption" color="text.secondary">—</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    {s.engines?.enableHumanMimicry && (
                      <Chip label="Humanize" size="small" sx={{ fontSize: "0.6rem", bgcolor: "rgba(236,72,153,0.1)", color: "#ec4899" }} />
                    )}
                    {s.engines?.enableHashtagOptimization && (
                      <Chip label="#" size="small" sx={{ fontSize: "0.6rem", bgcolor: "rgba(34,197,94,0.1)", color: "#22c55e" }} />
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const SchedulerDashboard: React.FC = () => {
  const { data, loading, error, refresh } = useScheduledJobs({ autoLoad: false });
  const { autoRefreshEnabled, lastUpdatedAt, setAutoRefreshEnabled, refreshNow } = useAutoRefresh(refresh, {
    intervalMs: 30000,
  });
  const [tab, setTab] = useState(0);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <ScheduleIcon sx={{ fontSize: 32, color: "primary.main" }} />
            <Typography variant="h4" fontWeight={700}>
              Scheduler Dashboard
            </Typography>
          </Stack>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
            Manage automated video creation schedules, queue health, and job history.
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
          <Tooltip title="Refresh all data">
            <IconButton onClick={() => void refreshNow()} disabled={loading} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Error Banner */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => void refreshNow()}>
          {error}
        </Alert>
      )}

      {/* Initial loading */}
      {loading && !data && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && !data && !error && (
        <EmptyState
          title="No scheduler data yet"
          description="Queue health and scheduled jobs will appear here after the first scheduler snapshot is loaded."
          actionLabel="Refresh scheduler"
          onAction={() => void refreshNow()}
        />
      )}

      {data && (
        <>
          {/* Queue Health */}
          <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>
            Queue Health
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <QueueCard
                label="Render"
                counts={data.queueStats.render}
                redisEnabled={data.queueStats.redisEnabled}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <QueueCard
                label="Publish"
                counts={data.queueStats.publish}
                redisEnabled={data.queueStats.redisEnabled}
              />
            </Grid>
          </Grid>

          {!data.queueStats.redisEnabled && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Redis is disabled — queue metrics are not available. Jobs are processed in-memory.
            </Alert>
          )}

          {data.renderJobs.length === 0 && data.publishJobs.length === 0 && (
            <Box sx={{ mb: 3 }}>
              <EmptyState
                title="No scheduled jobs yet"
                description="Create a new render job to start filling the scheduler history, queue activity, and status tables."
              />
            </Box>
          )}

          <Divider sx={{ mb: 2 }} />

          {/* Tabs: New Job | Jobs List | History | Upcoming */}
          <Paper variant="outlined" sx={{ p: 0 }}>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}
            >
              <Tab
                icon={<AddCircleOutlineIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="New Job"
              />
              <Tab
                icon={<ListAltIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label={`Jobs (${data.renderJobs.length + data.publishJobs.length})`}
              />
              <Tab
                icon={<HistoryIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="History"
              />
              <Tab
                icon={<CalendarMonthIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Upcoming"
              />
              <Tab
                icon={<CalendarViewWeekIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Calendar"
              />
            </Tabs>

            <Box sx={{ p: 2 }}>
              {/* New Job Tab */}
              <TabPanel value={tab} index={0}>
                <ScheduleForm onSuccess={refresh} />
              </TabPanel>

              {/* Jobs List Tab */}
              <TabPanel value={tab} index={1}>
                <ScheduledJobsList
                  renderJobs={data.renderJobs}
                  publishJobs={data.publishJobs}
                  loading={loading}
                  onRefresh={refreshNow}
                />
              </TabPanel>

              {/* History Tab */}
              <TabPanel value={tab} index={2}>
                <ScheduleHistory
                  renderJobs={data.renderJobs}
                  publishJobs={data.publishJobs}
                  loading={loading}
                />
              </TabPanel>

              {/* Upcoming Scheduled Tab */}
              <TabPanel value={tab} index={3}>
                <UpcomingTab />
              </TabPanel>

              {/* Calendar Tab */}
              <TabPanel value={tab} index={4}>
                <ScheduleCalendar />
              </TabPanel>
            </Box>
          </Paper>
        </>
      )}
    </Container>
  );
};

export default SchedulerDashboard;
