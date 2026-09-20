import { authenticatedFetch } from "../services/authenticatedFetch";
/**
 * SchedulePersistPage – Full schedule management with persistence
 * Create, list, pause/resume, and monitor scheduled publishing jobs
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Grid, Card, CardContent, CardActions, Button, TextField,
  MenuItem, Select, FormControl, InputLabel, Chip, CircularProgress, Alert,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Stack,
  Tooltip, Divider, Switch, FormControlLabel, Paper, Tabs, Tab, Slider,
  Checkbox, FormGroup
} from "@mui/material";
import ScheduleIcon from "@mui/icons-material/Schedule";
import AddIcon from "@mui/icons-material/Add";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import TimerIcon from "@mui/icons-material/Timer";
import BarChartIcon from "@mui/icons-material/BarChart";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";

interface ScheduleRecord {
  id: string;
  name: string;
  videoId: string;
  platforms: string[];
  categories: string[];
  languages: string[];
  engines: {
    enableTranslation: boolean;
    enableCommentCTA: boolean;
    enablePlatformPsych: boolean;
    enableSeries: boolean;
    enableHumanMimicry: boolean;
    enableHashtagOptimization: boolean;
    enableEngagementOptimization: boolean;
  };
  quality: { targetLUFS: number; sharpnessLevel: number; visualQualityTier: string };
  cronExpression: string;
  publishAt: string;
  status: "active" | "paused" | "completed" | "failed";
  lastRun?: string;
  nextRun?: string;
  runCount: number;
  failureCount: number;
  metadata: { tags?: string[]; notes?: string; contentType?: string; alsoGenerate?: Record<string, boolean> };
  createdAt: string;
  updatedAt: string;
}

interface ScheduleStats {
  total: number;
  active: number;
  paused: number;
  completed: number;
  failed: number;
  totalRuns: number;
  totalFailures: number;
}

const PLATFORMS = ["youtube", "instagram", "tiktok", "facebook", "linkedin", "x", "telegram"];
const LANGUAGES = ["en", "es", "fr", "de", "pt", "hi", "ja", "zh", "ar", "ko"];
const CONTENT_TYPES = ["video", "image", "carousel", "banner"];
const CRON_PRESETS = [
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Daily 9AM", value: "0 9 * * *" },
  { label: "Daily 6PM", value: "0 18 * * *" },
  { label: "Weekdays 9AM", value: "0 9 * * 1-5" },
  { label: "Weekly Monday", value: "0 9 * * 1" },
  { label: "Twice Daily", value: "0 9,18 * * *" },
];

const ENGINE_TOOLTIPS: Record<string, string> = {
  enableTranslation: "Auto-translate content into selected languages before publishing",
  enableCommentCTA: "Add a call-to-action comment immediately after publishing",
  enablePlatformPsych: "Adapt script tone and hooks for each platform's psychology",
  enableSeries: "Group this content into a series with auto-numbered titles",
  enableHumanMimicry: "Randomize publish timing by ±45 min to mimic human behavior",
  enableHashtagOptimization: "Auto-generate optimized hashtags for each platform",
  enableEngagementOptimization: "Optimize caption length and CTAs for max engagement",
};

const STATUS_CONFIG: Record<string, { color: "default" | "primary" | "success" | "error" | "warning"; icon: React.ReactNode }> = {
  active: { color: "success", icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
  paused: { color: "warning", icon: <PauseIcon sx={{ fontSize: 14 }} /> },
  completed: { color: "primary", icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
  failed: { color: "error", icon: <ErrorIcon sx={{ fontSize: 14 }} /> },
};

const defaultForm = {
  name: "",
  videoId: "",
  platforms: ["youtube"] as string[],
  categories: ["General"] as string[],
  languages: ["en"] as string[],
  contentType: "video",
  cronExpression: "0 9 * * *",
  publishAt: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
  smartSchedule: false,
  engines: {
    enableTranslation: false,
    enableCommentCTA: true,
    enablePlatformPsych: true,
    enableSeries: false,
    enableHumanMimicry: false,
    enableHashtagOptimization: true,
    enableEngagementOptimization: true,
  },
  quality: { targetLUFS: -14, sharpnessLevel: 5, visualQualityTier: "standard" },
  alsoGenerate: { quoteCard: true, carousel: false, thumbnail: true },
  metadata: { tags: [] as string[], notes: "" },
};

const fmtDate = (d?: string) => d ? new Date(d).toLocaleString() : "—";

export const SchedulePersistPage: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [stats, setStats] = useState<ScheduleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSchedule, setPreviewSchedule] = useState<ScheduleRecord | null>(null);
  const [smartScheduleLoading, setSmartScheduleLoading] = useState(false);
  const [smartScheduleResult, setSmartScheduleResult] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [schedsRes, statsRes] = await Promise.all([
        authenticatedFetch("/api/schedule?limit=100"),
        authenticatedFetch("/api/schedule/stats"),
      ]);
      const sd = await schedsRes.json();
      const st = await statsRes.json();
      setSchedules(sd.schedules || []);
      if (st.status === "ok") setStats(st.stats);
    } catch { setError("Failed to load schedules"); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { const t = setInterval(fetchAll, 30000); return () => clearInterval(t); }, [fetchAll]);

  const handleSmartSchedule = async () => {
    if (!form.platforms[0]) return;
    setSmartScheduleLoading(true);
    setSmartScheduleResult(null);
    try {
      const res = await authenticatedFetch(`/api/schedule/best-times?platform=${form.platforms[0]}&category=${form.categories[0] || "General"}`);
      const data = await res.json();
      if (data.status === "ok" && data.bestTimes?.hour !== undefined) {
        const base = new Date(form.publishAt || new Date().toISOString());
        base.setHours(data.bestTimes.hour, 0, 0, 0);
        setForm((f) => ({ ...f, publishAt: base.toISOString().slice(0, 16), smartSchedule: true }));
        setSmartScheduleResult(`Best time for ${form.platforms[0]}: ${data.bestTimes.hour}:00 (confidence ${Math.round((data.bestTimes.confidence ?? 0) * 100)}%)`);
      } else {
        setSmartScheduleResult("No recommendation available — using default time.");
      }
    } catch {
      setSmartScheduleResult("Could not fetch best times.");
    } finally {
      setSmartScheduleLoading(false);
    }
  };

  const createSchedule = async () => {
    setSaving(true); setError(null);
    try {
      const res = await authenticatedFetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          publishAt: new Date(form.publishAt).toISOString(),
          contentType: form.contentType,
          alsoGenerate: form.alsoGenerate,
          smartSchedule: form.smartSchedule,
        }),
      });
      const data = await res.json();
      if (data.status !== "ok") throw new Error(data.error || "Create failed");
      setAddOpen(false);
      setForm(defaultForm);
      setSmartScheduleResult(null);
      fetchAll();
    } catch (err) { setError(err instanceof Error ? err.message : "Create failed"); }
    setSaving(false);
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await authenticatedFetch(`/api/schedule/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchAll();
    } catch {}
  };

  const triggerRun = async (id: string) => {
    setTriggering(id);
    try {
      const res = await authenticatedFetch(`/api/schedule/${id}/run`, { method: "POST" });
      const data = await res.json();
      if (data.status === "ok") fetchAll();
    } catch {}
    setTriggering(null);
  };

  const deleteSchedule = async (id: string) => {
    try {
      await authenticatedFetch(`/api/schedule/${id}`, { method: "DELETE" });
      fetchAll();
    } catch {}
  };

  const toggleEngine = (key: keyof typeof form.engines) => {
    setForm((f) => ({ ...f, engines: { ...f.engines, [key]: !f.engines[key] } }));
  };

  const toggleAlsoGenerate = (key: keyof typeof form.alsoGenerate) => {
    setForm((f) => ({ ...f, alsoGenerate: { ...f.alsoGenerate, [key]: !f.alsoGenerate[key] } }));
  };

  const openPreview = (sched: ScheduleRecord) => {
    setPreviewSchedule(sched);
    setPreviewOpen(true);
  };

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" gap={2}>
          <ScheduleIcon color="primary" sx={{ fontSize: 36 }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">Schedule Manager</Typography>
            <Typography variant="body2" color="text.secondary">Persistent scheduling with engine settings and quality control</Typography>
          </Box>
        </Stack>
        <Stack direction="row" gap={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchAll}><RefreshIcon /></IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>New Schedule</Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Stats Row */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: "Total", value: stats.total, color: "text.primary" },
            { label: "Active", value: stats.active, color: "success.main" },
            { label: "Paused", value: stats.paused, color: "warning.main" },
            { label: "Completed", value: stats.completed, color: "info.main" },
            { label: "Failed", value: stats.failed, color: "error.main" },
            { label: "Total Runs", value: stats.totalRuns, color: "primary.main" },
          ].map((s) => (
            <Grid item xs={6} sm={4} md={2} key={s.label}>
              <Card variant="outlined" sx={{ textAlign: "center", py: 1.5 }}>
                <Typography variant="h4" fontWeight="bold" sx={{ color: s.color }}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Active Schedules" icon={<ScheduleIcon />} iconPosition="start" />
        <Tab label="All Schedules" icon={<BarChartIcon />} iconPosition="start" />
      </Tabs>

      {loading ? (
        <Box sx={{ textAlign: "center", py: 6 }}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={2}>
          {(tab === 0 ? schedules.filter((s) => s.status === "active") : schedules).map((sched) => (
            <Grid item xs={12} md={6} key={sched.id}>
              <Card variant="outlined" sx={{ "&:hover": { borderColor: "primary.main" } }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">{sched.name}</Typography>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Chip
                        label={sched.metadata?.contentType || "video"}
                        size="small"
                        color="secondary"
                        variant="outlined"
                        sx={{ fontSize: "0.6rem" }}
                      />
                      <Chip
                        icon={STATUS_CONFIG[sched.status]?.icon as any}
                        label={sched.status}
                        size="small"
                        color={STATUS_CONFIG[sched.status]?.color}
                      />
                    </Stack>
                  </Stack>
                  <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mb: 1.5 }}>
                    {sched.platforms.map((p) => <Chip key={p} label={p} size="small" variant="outlined" />)}
                    <Chip label={`LUFS: ${sched.quality.targetLUFS}`} size="small" variant="outlined" color="secondary" />
                    <Chip label={sched.quality.visualQualityTier} size="small" variant="outlined" />
                  </Stack>
                  <Grid container spacing={1.5} sx={{ mb: 1 }}>
                    <Grid item xs={6}>
                      <Stack direction="row" alignItems="center" gap={0.5}>
                        <TimerIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                        <Typography variant="caption" color="text.secondary">Cron: {sched.cronExpression}</Typography>
                      </Stack>
                    </Grid>
                    <Grid item xs={6}>
                      <Stack direction="row" alignItems="center" gap={0.5}>
                        <AccessTimeIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                        <Typography variant="caption" color="text.secondary">Runs: {sched.runCount}</Typography>
                      </Stack>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Last: {fmtDate(sched.lastRun)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Next: {fmtDate(sched.nextRun)}</Typography>
                    </Grid>
                  </Grid>
                  <Stack direction="row" gap={0.5} flexWrap="wrap">
                    {sched.engines.enableHashtagOptimization && <Chip label="Hashtags" size="small" sx={{ fontSize: "0.6rem", backgroundColor: "rgba(34,197,94,0.1)", color: "#22c55e" }} />}
                    {sched.engines.enableCommentCTA && <Chip label="CTA" size="small" sx={{ fontSize: "0.6rem", backgroundColor: "rgba(99,102,241,0.1)", color: "#6366f1" }} />}
                    {sched.engines.enableTranslation && <Chip label="Translate" size="small" sx={{ fontSize: "0.6rem", backgroundColor: "rgba(245,158,11,0.1)", color: "#f59e0b" }} />}
                    {sched.engines.enableHumanMimicry && <Chip label="Humanize" size="small" sx={{ fontSize: "0.6rem", backgroundColor: "rgba(236,72,153,0.1)", color: "#ec4899" }} />}
                  </Stack>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2, gap: 0.5 }}>
                  <Tooltip title="Preview schedule details">
                    <IconButton size="small" color="info" onClick={() => openPreview(sched)}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Run Now">
                    <span>
                      <IconButton size="small" color="primary" onClick={() => triggerRun(sched.id)} disabled={triggering === sched.id}>
                        {triggering === sched.id ? <CircularProgress size={16} /> : <FlashOnIcon fontSize="small" />}
                      </IconButton>
                    </span>
                  </Tooltip>
                  {sched.status === "active" ? (
                    <Tooltip title="Pause">
                      <IconButton size="small" onClick={() => updateStatus(sched.id, "paused")}><PauseIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  ) : sched.status === "paused" ? (
                    <Tooltip title="Resume">
                      <IconButton size="small" color="success" onClick={() => updateStatus(sched.id, "active")}><PlayArrowIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  ) : null}
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => deleteSchedule(sched.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
          {(tab === 0 ? schedules.filter((s) => s.status === "active") : schedules).length === 0 && (
            <Grid item xs={12}>
              <Paper sx={{ textAlign: "center", py: 8, backgroundColor: "transparent", border: "2px dashed rgba(99,102,241,0.2)" }}>
                <ScheduleIcon sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />
                <Typography variant="h6" color="text.secondary">{tab === 0 ? "No active schedules" : "No schedules yet"}</Typography>
                <Button variant="contained" startIcon={<AddIcon />} sx={{ mt: 2 }} onClick={() => setAddOpen(true)}>Create First Schedule</Button>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* ── Create Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={addOpen} onClose={() => { setAddOpen(false); setSmartScheduleResult(null); }} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            <ScheduleIcon color="primary" /> Create Schedule
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack gap={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Schedule Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required fullWidth autoFocus
            />

            {/* Content Type */}
            <FormControl fullWidth size="small">
              <InputLabel>Content Type</InputLabel>
              <Select
                value={form.contentType}
                label="Content Type"
                onChange={(e) => setForm({ ...form, contentType: e.target.value })}
              >
                {CONTENT_TYPES.map((ct) => (
                  <MenuItem key={ct} value={ct}>
                    {ct.charAt(0).toUpperCase() + ct.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Publish At"
                  type="datetime-local"
                  value={form.publishAt}
                  onChange={(e) => setForm({ ...form, publishAt: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Cron Preset</InputLabel>
                  <Select
                    value={form.cronExpression}
                    label="Cron Preset"
                    onChange={(e) => setForm({ ...form, cronExpression: e.target.value })}
                  >
                    {CRON_PRESETS.map((p) => (
                      <MenuItem key={p.value} value={p.value}>{p.label} ({p.value})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Smart Schedule */}
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={smartScheduleLoading ? <CircularProgress size={14} /> : <AutoFixHighIcon />}
                  onClick={() => void handleSmartSchedule()}
                  disabled={smartScheduleLoading || !form.platforms[0]}
                >
                  Smart Schedule
                </Button>
                <Tooltip title="Uses AI engine data to find the best posting time for the selected platform">
                  <InfoOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                </Tooltip>
              </Stack>
              {smartScheduleResult && (
                <Alert severity="info" sx={{ mt: 1 }} onClose={() => setSmartScheduleResult(null)}>
                  {smartScheduleResult}
                </Alert>
              )}
            </Box>

            {/* Platforms */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Platforms</Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {PLATFORMS.map((p) => (
                  <Chip
                    key={p} label={p}
                    onClick={() => setForm((f) => ({
                      ...f,
                      platforms: f.platforms.includes(p)
                        ? f.platforms.filter((x) => x !== p)
                        : [...f.platforms, p],
                    }))}
                    color={form.platforms.includes(p) ? "primary" : "default"}
                    variant={form.platforms.includes(p) ? "filled" : "outlined"}
                    sx={{ cursor: "pointer" }}
                  />
                ))}
              </Stack>
            </Box>

            {/* Languages */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Languages</Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {LANGUAGES.map((l) => (
                  <Chip
                    key={l} label={l.toUpperCase()}
                    onClick={() => setForm((f) => ({
                      ...f,
                      languages: f.languages.includes(l)
                        ? f.languages.filter((x) => x !== l)
                        : [...f.languages, l],
                    }))}
                    color={form.languages.includes(l) ? "secondary" : "default"}
                    variant={form.languages.includes(l) ? "filled" : "outlined"}
                    sx={{ cursor: "pointer" }}
                    size="small"
                  />
                ))}
              </Stack>
            </Box>

            {/* Also Generate */}
            <Box>
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
                <Typography variant="subtitle2">Also Generate</Typography>
                <Tooltip title="Generate supplementary assets alongside the main content">
                  <InfoOutlinedIcon sx={{ fontSize: 15, color: "text.secondary" }} />
                </Tooltip>
              </Stack>
              <FormGroup row>
                {(Object.keys(form.alsoGenerate) as Array<keyof typeof form.alsoGenerate>).map((key) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        size="small"
                        checked={form.alsoGenerate[key]}
                        onChange={() => toggleAlsoGenerate(key)}
                      />
                    }
                    label={
                      <Typography variant="caption">
                        {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                      </Typography>
                    }
                  />
                ))}
              </FormGroup>
            </Box>

            <Divider>
              <Typography variant="caption" color="text.secondary">AI ENGINE SETTINGS</Typography>
            </Divider>

            <Grid container spacing={1}>
              {(Object.keys(form.engines) as Array<keyof typeof form.engines>).map((key) => (
                <Grid item xs={6} sm={4} key={key}>
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={form.engines[key]}
                        onChange={() => toggleEngine(key)}
                        color="primary"
                      />
                    }
                    label={
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography variant="caption">
                          {key.replace("enable", "").replace(/([A-Z])/g, " $1").trim()}
                        </Typography>
                        <Tooltip title={ENGINE_TOOLTIPS[key] || ""} placement="top">
                          <InfoOutlinedIcon sx={{ fontSize: 13, color: "text.disabled", cursor: "help" }} />
                        </Tooltip>
                      </Stack>
                    }
                  />
                </Grid>
              ))}
            </Grid>

            <Divider>
              <Typography variant="caption" color="text.secondary">QUALITY SETTINGS</Typography>
            </Divider>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Target LUFS: {form.quality.targetLUFS} dB
                </Typography>
                <Slider
                  value={form.quality.targetLUFS}
                  min={-24} max={-6} step={1}
                  onChange={(_, v) => setForm((f) => ({ ...f, quality: { ...f.quality, targetLUFS: v as number } }))}
                  marks valueLabelDisplay="auto" color="secondary"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Sharpness: {form.quality.sharpnessLevel}/10
                </Typography>
                <Slider
                  value={form.quality.sharpnessLevel}
                  min={0} max={10} step={1}
                  onChange={(_, v) => setForm((f) => ({ ...f, quality: { ...f.quality, sharpnessLevel: v as number } }))}
                  marks valueLabelDisplay="auto"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Quality Tier</InputLabel>
                  <Select
                    value={form.quality.visualQualityTier}
                    label="Quality Tier"
                    onChange={(e) => setForm((f) => ({ ...f, quality: { ...f.quality, visualQualityTier: e.target.value } }))}
                  >
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="standard">Standard</MenuItem>
                    <MenuItem value="premium">Premium</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <TextField
              label="Notes (optional)"
              value={form.metadata.notes}
              onChange={(e) => setForm((f) => ({ ...f, metadata: { ...f.metadata, notes: e.target.value } }))}
              multiline rows={2} fullWidth
            />

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAddOpen(false); setSmartScheduleResult(null); }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={createSchedule}
            disabled={saving || !form.name || form.platforms.length === 0}
          >
            {saving ? <CircularProgress size={18} /> : "Create Schedule"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Preview Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            <VisibilityIcon color="info" />
            Schedule Preview
          </Stack>
        </DialogTitle>
        <DialogContent>
          {previewSchedule && (
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              <Typography variant="h6">{previewSchedule.name}</Typography>

              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Typography variant="body2" fontWeight={600}>{previewSchedule.status}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Content Type</Typography>
                  <Typography variant="body2" fontWeight={600}>{previewSchedule.metadata?.contentType || "video"}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Cron</Typography>
                  <Typography variant="body2" fontWeight={600}>{previewSchedule.cronExpression}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Total Runs</Typography>
                  <Typography variant="body2" fontWeight={600}>{previewSchedule.runCount}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Next Run</Typography>
                  <Typography variant="body2" fontWeight={600}>{fmtDate(previewSchedule.nextRun)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Last Run</Typography>
                  <Typography variant="body2" fontWeight={600}>{fmtDate(previewSchedule.lastRun)}</Typography>
                </Grid>
              </Grid>

              <Divider />

              <Box>
                <Typography variant="caption" color="text.secondary">Platforms</Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                  {previewSchedule.platforms.map((p) => (
                    <Chip key={p} label={p} size="small" variant="outlined" />
                  ))}
                </Stack>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">Active Engines</Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                  {Object.entries(previewSchedule.engines)
                    .filter(([, v]) => v)
                    .map(([k]) => (
                      <Chip
                        key={k}
                        label={k.replace("enable", "").replace(/([A-Z])/g, " $1").trim()}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontSize: "0.65rem" }}
                      />
                    ))}
                </Stack>
              </Box>

              {previewSchedule.metadata?.alsoGenerate && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Also Generates</Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                    {Object.entries(previewSchedule.metadata.alsoGenerate)
                      .filter(([, v]) => v)
                      .map(([k]) => (
                        <Chip key={k} label={k} size="small" variant="outlined" color="secondary" sx={{ fontSize: "0.65rem" }} />
                      ))}
                  </Stack>
                </Box>
              )}

              {previewSchedule.metadata?.notes && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Notes</Typography>
                  <Typography variant="body2">{previewSchedule.metadata.notes}</Typography>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SchedulePersistPage;
