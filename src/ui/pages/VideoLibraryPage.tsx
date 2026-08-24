/**
 * VideoLibraryPage – Full video library management with CRUD, search, filters, stats + analytics
 */
import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "../services/apiClient";
import {
  Box, Typography, Grid, Card, CardContent, CardActions, Button, TextField,
  MenuItem, Select, FormControl, InputLabel, Chip, CircularProgress, Alert,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab,
  Stack, InputAdornment, Badge, Tooltip, Divider, Paper, LinearProgress
} from "@mui/material";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import BarChartIcon from "@mui/icons-material/BarChart";
import FilterListIcon from "@mui/icons-material/FilterList";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArchiveIcon from "@mui/icons-material/Archive";
import PublishIcon from "@mui/icons-material/Publish";
import ScheduleIcon from "@mui/icons-material/Schedule";
import TagIcon from "@mui/icons-material/Tag";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CommentIcon from "@mui/icons-material/Comment";
import ShareIcon from "@mui/icons-material/Share";

interface VideoRecord {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  duration: number;
  platform: string;
  status: "draft" | "published" | "scheduled" | "archived";
  videoPath?: string;
  thumbnailPath?: string;
  tags: string[];
  engagementMetrics?: { views: number; likes: number; comments: number; shares: number };
  publishedAt?: string;
  scheduledFor?: string;
  createdAt: string;
  updatedAt: string;
}

interface LibraryStats {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byPlatform: Record<string, number>;
}

const STATUSES = ["draft", "published", "scheduled", "archived"] as const;
const PLATFORMS = ["youtube", "instagram", "tiktok", "facebook", "linkedin", "x", "telegram"];
const CATEGORIES = ["General", "Tech", "Business", "Motivation", "News", "Health", "Education", "Entertainment"];

const STATUS_COLORS: Record<string, "default" | "primary" | "secondary" | "success" | "warning" | "error"> = {
  draft: "default", published: "success", scheduled: "primary", archived: "error",
};

const emptyForm = { title: "", description: "", category: "General", subcategory: "", platform: "youtube", duration: 0, tags: "", status: "draft" };

export const VideoLibraryPage: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [trendingTags, setTrendingTags] = useState<Array<{ tag: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<VideoRecord | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchVideos = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      let url = "/api/videolibrary?limit=100";
      if (filterStatus) url = `/api/videolibrary?status=${filterStatus}&limit=100`;
      if (filterPlatform) url = `/api/videolibrary?platform=${filterPlatform}&limit=100`;
      if (filterCategory) url = `/api/videolibrary?category=${filterCategory}&limit=100`;
      if (searchQ.trim().length >= 2) url = `/api/videolibrary/search?q=${encodeURIComponent(searchQ)}&limit=100`;
      const data = await apiClient.get<{ videos?: VideoRecord[]; total?: number }>(url);
      const nextVideos = Array.isArray(data.videos) ? data.videos : [];
      setVideos(nextVideos);
      setTotal(data.total || nextVideos.length);
    } catch { setError("Failed to load video library"); }
    setLoading(false);
  }, [searchQ, filterStatus, filterPlatform, filterCategory]);

  const fetchStats = useCallback(async () => {
    try {
      const [s, t] = await Promise.all([
        apiClient.get<{ status?: string; stats?: LibraryStats }>("/api/videolibrary/stats"),
        apiClient.get<{ status?: string; tags?: Array<{ tag: string; count: number }> }>("/api/videolibrary/tags"),
      ]);
      if (s.status === "ok" && s.stats) setStats(s.stats);
      if (t.status === "ok" && Array.isArray(t.tags)) setTrendingTags(t.tags);
    } catch {}
  }, []);

  useEffect(() => { fetchVideos(); fetchStats(); }, [fetchVideos, fetchStats]);

  useEffect(() => {
    const timer = setTimeout(() => fetchVideos(), 400);
    return () => clearTimeout(timer);
  }, [searchQ, fetchVideos]);

  const openAdd = () => { setForm(emptyForm); setEditRecord(null); setAddOpen(true); };
  const openEdit = (v: VideoRecord) => {
    setForm({ title: v.title, description: v.description, category: v.category, subcategory: v.subcategory || "", platform: v.platform, duration: v.duration, tags: v.tags.join(", "), status: v.status });
    setEditRecord(v); setAddOpen(true);
  };

  const saveVideo = async () => {
    setSaving(true); setError(null);
    try {
      const body = { ...form, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) };
      const url = editRecord ? `/api/videolibrary/${editRecord.id}` : "/api/videolibrary";
      const method = editRecord ? "PATCH" : "POST";
      const data = editRecord
        ? await apiClient.patch<{ status?: string; error?: string }>(url, body)
        : await apiClient.post<{ status?: string; error?: string }>(url, body);
      if (data.status && data.status !== "ok") throw new Error(data.error || "Save failed");
      setAddOpen(false); fetchVideos(); fetchStats();
    } catch (err) { setError(err instanceof Error ? err.message : "Save failed"); }
    setSaving(false);
  };

  const deleteVideo = async (id: string) => {
    try {
      await apiClient.delete(`/api/videolibrary/${id}`);
      setDeleteConfirm(null); fetchVideos(); fetchStats();
    } catch { setError("Delete failed"); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await apiClient.patch(`/api/videolibrary/${id}/status`, { status });
      fetchVideos(); fetchStats();
    } catch {}
  };

  const fmtDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString();

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" gap={2}>
          <VideoLibraryIcon color="primary" sx={{ fontSize: 36 }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">Video Library</Typography>
            <Typography variant="body2" color="text.secondary">
              Manage, organize, and track all your video content — {total} videos
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" gap={1}>
          <Tooltip title="Refresh"><IconButton onClick={() => { fetchVideos(); fetchStats(); }}><RefreshIcon /></IconButton></Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>Add Video</Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Library" icon={<VideoLibraryIcon />} iconPosition="start" />
        <Tab label="Stats & Analytics" icon={<BarChartIcon />} iconPosition="start" />
        <Tab label="Engagement Trends" icon={<BarChartIcon />} iconPosition="start" />
        <Tab label="Trending Tags" icon={<TagIcon />} iconPosition="start" />
      </Tabs>

      {/* Tab 0: Library */}
      {tab === 0 && (
        <Box>
          {/* Filters Row */}
          <Stack direction={{ xs: "column", md: "row" }} gap={2} sx={{ mb: 3 }}>
            <TextField
              size="small" placeholder="Search videos..." value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
              sx={{ minWidth: 260 }}
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select value={filterStatus} label="Status" onChange={(e) => setFilterStatus(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Platform</InputLabel>
              <Select value={filterPlatform} label="Platform" onChange={(e) => setFilterPlatform(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                {PLATFORMS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Category</InputLabel>
              <Select value={filterCategory} label="Category" onChange={(e) => setFilterCategory(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            {(filterStatus || filterPlatform || filterCategory || searchQ) && (
              <Button variant="outlined" size="small" onClick={() => { setFilterStatus(""); setFilterPlatform(""); setFilterCategory(""); setSearchQ(""); }}>
                Clear Filters
              </Button>
            )}
          </Stack>

          {loading ? (
            <Box sx={{ textAlign: "center", py: 6 }}><CircularProgress /><Typography sx={{ mt: 2 }} color="text.secondary">Loading library...</Typography></Box>
          ) : videos.length === 0 ? (
            <Paper sx={{ textAlign: "center", py: 8, backgroundColor: "transparent", border: "2px dashed rgba(99,102,241,0.2)" }}>
              <VideoLibraryIcon sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />
              <Typography variant="h6" color="text.secondary">No videos yet</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Add your first video to start building your library</Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>Add Your First Video</Button>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {videos.map((v) => (
                <Grid item xs={12} sm={6} lg={4} key={v.id}>
                  <Card variant="outlined" sx={{ height: "100%", display: "flex", flexDirection: "column", "&:hover": { borderColor: "primary.main", boxShadow: "0 4px 12px rgba(99,102,241,0.15)" } }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                        <Chip label={v.status} size="small" color={STATUS_COLORS[v.status]} />
                        <Typography variant="caption" color="text.secondary">{fmtDate(v.createdAt)}</Typography>
                      </Stack>
                      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 0.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {v.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {v.description || "No description"}
                      </Typography>
                      <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mb: 1 }}>
                        <Chip label={v.platform} size="small" variant="outlined" />
                        <Chip label={v.category} size="small" variant="outlined" />
                        {v.duration > 0 && <Chip label={fmtDuration(v.duration)} size="small" variant="outlined" />}
                      </Stack>
                      {v.tags.slice(0, 3).map((t) => (
                        <Chip key={t} label={`#${t}`} size="small" sx={{ mr: 0.5, mb: 0.5, fontSize: "0.65rem", backgroundColor: "rgba(99,102,241,0.08)" }} />
                      ))}
                      {v.engagementMetrics && (
                        <Stack direction="row" gap={2} sx={{ mt: 1.5, pt: 1.5, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          <Stack direction="row" alignItems="center" gap={0.5}>
                            <VisibilityIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                            <Typography variant="caption" color="text.secondary">{v.engagementMetrics.views.toLocaleString()}</Typography>
                          </Stack>
                          <Stack direction="row" alignItems="center" gap={0.5}>
                            <ThumbUpIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                            <Typography variant="caption" color="text.secondary">{v.engagementMetrics.likes.toLocaleString()}</Typography>
                          </Stack>
                          <Stack direction="row" alignItems="center" gap={0.5}>
                            <CommentIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                            <Typography variant="caption" color="text.secondary">{v.engagementMetrics.comments.toLocaleString()}</Typography>
                          </Stack>
                          <Stack direction="row" alignItems="center" gap={0.5}>
                            <ShareIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                            <Typography variant="caption" color="text.secondary">{v.engagementMetrics.shares.toLocaleString()}</Typography>
                          </Stack>
                        </Stack>
                      )}
                    </CardContent>
                    <CardActions sx={{ px: 2, pb: 2, pt: 0, gap: 0.5 }}>
                      <Tooltip title="Edit"><IconButton size="small" onClick={() => openEdit(v)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteConfirm(v.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                      {v.status === "draft" && (
                        <Tooltip title="Mark Published">
                          <IconButton size="small" color="success" onClick={() => updateStatus(v.id, "published")}><PublishIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      )}
                      {v.status === "published" && (
                        <Tooltip title="Archive">
                          <IconButton size="small" onClick={() => updateStatus(v.id, "archived")}><ArchiveIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Tab 1: Stats */}
      {tab === 1 && (
        <Grid container spacing={3}>
          {stats ? (
            <>
              <Grid item xs={12}>
                <Grid container spacing={2}>
                  {[
                    { label: "Total Videos", value: stats.total, color: "primary.main" },
                    { label: "Published", value: stats.byStatus.published || 0, color: "success.main" },
                    { label: "Drafts", value: stats.byStatus.draft || 0, color: "text.secondary" },
                    { label: "Scheduled", value: stats.byStatus.scheduled || 0, color: "info.main" },
                    { label: "Archived", value: stats.byStatus.archived || 0, color: "error.main" },
                  ].map((s) => (
                    <Grid item xs={6} sm={4} md={2.4} key={s.label}>
                      <Card variant="outlined" sx={{ textAlign: "center", p: 2 }}>
                        <Typography variant="h3" fontWeight="bold" sx={{ color: s.color }}>{s.value}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>By Platform</Typography>
                    {Object.entries(stats.byPlatform).map(([k, v]) => (
                      <Box key={k} sx={{ mb: 1.5 }}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                          <Typography variant="body2">{k}</Typography>
                          <Typography variant="body2" fontWeight="bold">{v}</Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={(v / Math.max(stats.total, 1)) * 100} sx={{ borderRadius: 1 }} />
                      </Box>
                    ))}
                    {Object.keys(stats.byPlatform).length === 0 && <Typography color="text.secondary" variant="body2">No data yet</Typography>}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>By Category</Typography>
                    {Object.entries(stats.byCategory).map(([k, v]) => (
                      <Box key={k} sx={{ mb: 1.5 }}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                          <Typography variant="body2">{k}</Typography>
                          <Typography variant="body2" fontWeight="bold">{v}</Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={(v / Math.max(stats.total, 1)) * 100} color="secondary" sx={{ borderRadius: 1 }} />
                      </Box>
                    ))}
                    {Object.keys(stats.byCategory).length === 0 && <Typography color="text.secondary" variant="body2">No data yet</Typography>}
                  </CardContent>
                </Card>
              </Grid>
            </>
          ) : (
            <Grid item xs={12}><Box sx={{ textAlign: "center", py: 6 }}><CircularProgress /></Box></Grid>
          )}
        </Grid>
      )}

      {/* Tab 2: Engagement Trends */}
      {tab === 2 && (
        <Box>
          {videos.length === 0 ? (
            <Paper sx={{ textAlign: "center", py: 8, backgroundColor: "transparent", border: "2px dashed rgba(255,255,255,0.1)" }}>
              <BarChartIcon sx={{ fontSize: 48, opacity: 0.3, mb: 2 }} />
              <Typography variant="h6" color="text.secondary">No videos to analyze yet</Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {/* Overall Engagement Trends */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>📈 Overall Engagement Trends</Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={videos.map((v, i) => ({ name: v.title.slice(0, 12), views: v.engagementMetrics?.views || 0, likes: v.engagementMetrics?.likes || 0, comments: v.engagementMetrics?.comments || 0, shares: v.engagementMetrics?.shares || 0 }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                        <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                        <RechartsTooltip contentStyle={{ backgroundColor: "rgba(15,23,42,0.9)", border: "1px solid #6366f1" }} />
                        <Legend />
                        <Line type="monotone" dataKey="views" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="likes" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="comments" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="shares" stroke="#ec4899" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Per-Video Performance Comparison */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>👁️ Views vs Engagement</Typography>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={videos.slice(0, 8).map((v) => ({ name: v.title.slice(0, 10), views: v.engagementMetrics?.views || 0, engagement: (v.engagementMetrics?.likes || 0) + (v.engagementMetrics?.comments || 0) + (v.engagementMetrics?.shares || 0) }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={11} angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                        <RechartsTooltip contentStyle={{ backgroundColor: "rgba(15,23,42,0.9)", border: "1px solid #6366f1" }} />
                        <Legend />
                        <Bar dataKey="views" fill="#6366f1" radius={4} />
                        <Bar dataKey="engagement" fill="#f59e0b" radius={4} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Engagement Breakdown Pie */}
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>🎯 Total Engagement Breakdown</Typography>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Likes", value: videos.reduce((s, v) => s + (v.engagementMetrics?.likes || 0), 0) },
                            { name: "Comments", value: videos.reduce((s, v) => s + (v.engagementMetrics?.comments || 0), 0) },
                            { name: "Shares", value: videos.reduce((s, v) => s + (v.engagementMetrics?.shares || 0), 0) },
                          ].filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${entry.value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#6366f1" />
                          <Cell fill="#f59e0b" />
                          <Cell fill="#22c55e" />
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Top Performers */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>🏆 Top Performers (Engagement Rate)</Typography>
                    {videos
                      .map((v) => ({ ...v, engagementRate: v.engagementMetrics?.views ? ((v.engagementMetrics.likes + v.engagementMetrics.comments + v.engagementMetrics.shares) / v.engagementMetrics.views * 100).toFixed(2) : 0 }))
                      .sort((a, b) => parseFloat(b.engagementRate as any) - parseFloat(a.engagementRate as any))
                      .slice(0, 5)
                      .map((v, idx) => (
                        <Box key={v.id} sx={{ mb: 2, pb: 2, borderBottom: idx < 4 ? "1px solid rgba(255,255,255,0.1)" : "none" }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="body2" fontWeight="bold">{idx + 1}. {v.title}</Typography>
                            <Chip label={`${v.engagementRate}% engagement`} color="primary" size="small" />
                          </Stack>
                          <Stack direction="row" gap={2} sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
                            <span>👁️ {v.engagementMetrics?.views.toLocaleString()} views</span>
                            <span>❤️ {v.engagementMetrics?.likes.toLocaleString()} likes</span>
                            <span>💬 {v.engagementMetrics?.comments.toLocaleString()} comments</span>
                            <span>↗️ {v.engagementMetrics?.shares.toLocaleString()} shares</span>
                          </Stack>
                        </Box>
                      ))}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>
      )}

      {/* Tab 3: Trending Tags */}
      {tab === 3 && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>🔥 Trending Tags in Your Library</Typography>
            {trendingTags.length === 0 ? (
              <Typography color="text.secondary">No tags yet. Add tags to your videos to see trends.</Typography>
            ) : (
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {trendingTags.map(({ tag, count }) => (
                  <Chip
                    key={tag}
                    label={`#${tag} · ${count}`}
                    icon={<TagIcon />}
                    onClick={() => { setSearchQ(tag); setTab(0); }}
                    sx={{ cursor: "pointer", fontSize: count > 3 ? "0.875rem" : "0.75rem", fontWeight: count > 3 ? 700 : 400, backgroundColor: count > 3 ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.05)" }}
                  />
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editRecord ? "Edit Video" : "Add Video"}</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ mt: 1 }}>
            <TextField label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required fullWidth autoFocus />
            <TextField label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} multiline rows={3} fullWidth />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select value={form.category} label="Category" onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Platform</InputLabel>
                  <Select value={form.platform} label="Platform" onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                    {PLATFORMS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select value={form.status} label="Status" onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
                    {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField label="Duration (seconds)" type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 0 })} fullWidth />
              </Grid>
            </Grid>
            <TextField label="Tags (comma-separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} fullWidth placeholder="viral, trending, tech, tutorial" />
            <TextField label="Subcategory (optional)" value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} fullWidth />
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveVideo} disabled={saving || !form.title}>
            {saving ? <CircularProgress size={18} /> : editRecord ? "Save Changes" : "Add Video"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={Boolean(deleteConfirm)} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Delete Video?</DialogTitle>
        <DialogContent><Typography>This action cannot be undone.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => deleteConfirm && deleteVideo(deleteConfirm)}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VideoLibraryPage;
