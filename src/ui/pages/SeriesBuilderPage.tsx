import { authenticatedFetch } from "../services/authenticatedFetch";
import React, { useState, useEffect } from "react";
import {
  Container, Paper, TextField, Button, FormControl, InputLabel,
  Select, MenuItem, Box, Typography, Alert, Stack, Chip,
  Grid, Card, CardContent, CardActions, Divider, Dialog,
  DialogTitle, DialogContent, DialogActions, LinearProgress,
  IconButton, Tooltip,
} from "@mui/material";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import EpisodeIcon from "@mui/icons-material/OndemandVideo";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { CONTENT_CATEGORIES } from "../../config/categories";

interface Episode {
  episodeNumber: number;
  videoId?: string;
  title: string;
  summary: string;
  cliffhanger?: string;
  status: "planned" | "created" | "published";
  createdAt?: string;
}

interface Series {
  id: string;
  title: string;
  category: string;
  platform: string[];
  totalEpisodes: number;
  episodes: Episode[];
  style: "daily" | "weekly" | "mini";
  autoCliffhanger: boolean;
  createdAt: string;
  updatedAt: string;
}

const PLATFORMS = ["youtube", "instagram", "tiktok", "linkedin", "twitter", "facebook"];
const STYLES = [
  { value: "daily", label: "Daily Series" },
  { value: "weekly", label: "Weekly Series" },
  { value: "mini", label: "Mini Series (3-5 parts)" },
];
const CATEGORIES = CONTENT_CATEGORIES;

const STATUS_COLORS: Record<string, string> = {
  planned: "#f59e0b",
  created: "#6366f1",
  published: "#22c55e",
};

function SeriesBuilderPage() {
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newSeries, setNewSeries] = useState({
    title: "",
    category: "Technology",
    platform: ["youtube"],
    totalEpisodes: 7,
    style: "daily" as const,
    autoCliffhanger: true,
  });

  const loadSeries = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch("/api/strategy/series");
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setSeries(Array.isArray(data.data) ? data.data : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load series");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSeries(); }, []);

  const handleCreate = async () => {
    if (!newSeries.title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch("/api/strategy/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSeries),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setCreateOpen(false);
      setNewSeries({ title: "", category: "Technology", platform: ["youtube"], totalEpisodes: 7, style: "daily", autoCliffhanger: true });
      await loadSeries();
    } catch (err: any) {
      setError(err?.message || "Failed to create series");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await authenticatedFetch(`/api/strategy/series/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      await loadSeries();
    } catch (err: any) {
      setError(err?.message || "Failed to delete series");
    }
  };

  const getProgress = (s: Series) => {
    const published = s.episodes.filter((e) => e.status === "published").length;
    const created = s.episodes.filter((e) => e.status === "created").length;
    return { published, created, total: s.episodes.length };
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <PlaylistAddIcon sx={{ fontSize: 36, color: "#6366f1" }} />
        <Box>
          <Typography variant="h4" fontWeight={700}>Series Builder Engine</Typography>
          <Typography variant="body2" color="text.secondary">
            Create and manage multi-part video series with auto-cliffhangers
          </Typography>
        </Box>
        <Chip label="Engine #29" size="small" sx={{ ml: "auto", bgcolor: "#6366f1", color: "white" }} />
        <Button
          variant="contained" startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
        >
          New Series
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Series Grid */}
      {series.length === 0 && !loading && (
        <Paper sx={{ p: 6, textAlign: "center", bgcolor: "#1e293b" }}>
          <PlaylistAddIcon sx={{ fontSize: 64, color: "#334155", mb: 2 }} />
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No series created yet. Create your first multi-part series!
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            Create First Series
          </Button>
        </Paper>
      )}

      <Grid container spacing={2}>
        {series.map((s) => {
          const progress = getProgress(s);
          return (
            <Grid item xs={12} md={6} key={`series-${s.id}`}>
              <Card sx={{ bgcolor: "#1e293b", border: "1px solid #334155", height: "100%" }}>
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                    <Typography variant="h6" fontWeight={700}>{s.title}</Typography>
                    <Chip
                      label={s.style}
                      size="small"
                      sx={{ bgcolor: "#6366f122", color: "#6366f1" }}
                    />
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Chip label={s.category} size="small" variant="outlined" />
                    {s.platform.slice(0, 3).map((p) => (
                      <Chip key={`platform-${s.id}-${p}`} label={p} size="small" />
                    ))}
                  </Stack>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        Progress: {progress.published}/{progress.total} published
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#22c55e" }}>
                        {progress.total > 0 ? ((progress.published / progress.total) * 100).toFixed(0) : 0}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={progress.total > 0 ? (progress.published / progress.total) * 100 : 0}
                      color="success"
                    />
                  </Box>

                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Episodes ({s.episodes.length}):
                    </Typography>
                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: "wrap" }}>
                      {s.episodes.slice(0, 10).map((ep) => (
                        <Tooltip
                          key={`ep-${s.id}-${ep.episodeNumber}`}
                          title={`Ep ${ep.episodeNumber}: ${ep.title} (${ep.status})`}
                        >
                          <Box
                            sx={{
                              width: 20, height: 20, borderRadius: "50%",
                              bgcolor: STATUS_COLORS[ep.status],
                              display: "flex", alignItems: "center", justifyContent: "center",
                              cursor: "pointer",
                            }}
                          >
                            <Typography sx={{ fontSize: "0.55rem", color: "#000", fontWeight: 700 }}>
                              {ep.episodeNumber}
                            </Typography>
                          </Box>
                        </Tooltip>
                      ))}
                      {s.episodes.length > 10 && (
                        <Typography variant="caption" color="text.secondary">+{s.episodes.length - 10}</Typography>
                      )}
                    </Stack>
                  </Box>

                  {s.autoCliffhanger && (
                    <Chip
                      label="Auto-Cliffhanger ON"
                      size="small"
                      icon={<CheckCircleIcon sx={{ fontSize: "14px !important" }} />}
                      sx={{ color: "#22c55e", borderColor: "#22c55e" }}
                      variant="outlined"
                    />
                  )}
                </CardContent>

                <CardActions sx={{ justifyContent: "flex-end", pt: 0 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mr: "auto", pl: 1 }}>
                    Created {new Date(s.createdAt).toLocaleDateString()}
                  </Typography>
                  <IconButton
                    size="small" color="error"
                    onClick={() => handleDelete(s.id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: "#1e293b" } }}
      >
        <DialogTitle>Create New Series</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth size="small" label="Series Title"
              value={newSeries.title}
              onChange={(e) => setNewSeries((s) => ({ ...s, title: e.target.value }))}
              placeholder="e.g. AI Revolution: 7-Part Deep Dive"
            />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={newSeries.category} label="Category"
                    onChange={(e) => setNewSeries((s) => ({ ...s, category: e.target.value }))}
                  >
                    {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Style</InputLabel>
                  <Select
                    value={newSeries.style} label="Style"
                    onChange={(e) => setNewSeries((s) => ({ ...s, style: e.target.value as any }))}
                  >
                    {STYLES.map((st) => <MenuItem key={st.value} value={st.value}>{st.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <TextField
              fullWidth size="small" type="number" label="Total Episodes"
              value={newSeries.totalEpisodes}
              onChange={(e) => setNewSeries((s) => ({ ...s, totalEpisodes: Math.max(2, parseInt(e.target.value) || 3) }))}
              inputProps={{ min: 2, max: 30 }}
            />

            <FormControl fullWidth size="small">
              <InputLabel>Platforms</InputLabel>
              <Select
                multiple value={newSeries.platform} label="Platforms"
                onChange={(e) => setNewSeries((s) => ({ ...s, platform: e.target.value as string[] }))}
                renderValue={(sel) => (sel as string[]).join(", ")}
              >
                {PLATFORMS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </Select>
            </FormControl>

            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5, bgcolor: "#0f172a", borderRadius: 1 }}>
              <Box>
                <Typography variant="body2" fontWeight={600}>Auto-Cliffhanger</Typography>
                <Typography variant="caption" color="text.secondary">
                  Auto-generate cliffhanger endings for each episode
                </Typography>
              </Box>
              <Button
                size="small" variant={newSeries.autoCliffhanger ? "contained" : "outlined"}
                onClick={() => setNewSeries((s) => ({ ...s, autoCliffhanger: !s.autoCliffhanger }))}
              >
                {newSeries.autoCliffhanger ? "ON" : "OFF"}
              </Button>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained" onClick={handleCreate}
            disabled={loading || !newSeries.title.trim()}
          >
            {loading ? "Creating..." : "Create Series"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default SeriesBuilderPage;
