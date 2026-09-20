/*
 * Dashboard style reminder: preserve the dark Material UI shell, keep loading/error/
 * empty states mutually exclusive, and use the shared authenticated API client.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import { api, ApiError } from "../services/apiClient";
import useAuthStore from "../store/authStore";

interface VideoItem {
  id: string;
  status?: string;
  title?: string;
  createdAt?: string;
}

const PAGE_SIZE = 10;

const VideoList: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => Boolean(state.token && state.user));
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    if (!isAuthenticated) {
      setVideos([]);
      setError("Authentication required. Sign in before loading your videos.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setVideos((await api.videos.list()) as VideoItem[]);
    } catch (err) {
      const apiError = err instanceof ApiError ? err : null;
      const message = apiError?.status === 503
        ? "Video service is still starting. Use Refresh in a few seconds."
        : apiError?.status === 401
          ? "Your session is no longer valid. Sign in again."
          : "Unable to load videos right now.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void fetchVideos();
  }, [fetchVideos]);

  const filteredVideos = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return videos.filter((video) => {
      const status = video.status || "unknown";
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      const haystack = `${video.id} ${video.title || ""} ${status}`.toLowerCase();
      return matchesStatus && (!normalizedSearch || haystack.includes(normalizedSearch));
    });
  }, [search, statusFilter, videos]);

  const pageCount = Math.max(1, Math.ceil(filteredVideos.length / PAGE_SIZE));
  const visibleVideos = filteredVideos.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => {
    if (page >= pageCount) setPage(Math.max(0, pageCount - 1));
  }, [page, pageCount]);

  const handleDeleteVideo = async (id: string, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setDeletingId(id);
    setError(null);
    try {
      await api.videos.delete(id);
      await fetchVideos();
    } catch (err) {
      setError(err instanceof ApiError && err.status === 404 ? "Video was already removed." : "Unable to delete this video.");
    } finally {
      setDeletingId(null);
    }
  };

  const titleFor = (video: VideoItem) => video.title?.trim() || `Video ${(video.id || "").slice(0, 8)}...`;
  const statusFor = (video: VideoItem) => video.status || "unknown";

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh" aria-label="Loading videos">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box maxWidth="md" mx="auto" py={4} px={{ xs: 2, sm: 0 }}>
      <Box display="flex" justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={2} mb={3} flexWrap="wrap">
        <Box>
          <Typography variant="h4" component="h1">Your Videos</Typography>
          <Typography variant="body2" color="text.secondary">Review, filter, and manage rendered content.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/create")}>Create New Video</Button>
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mb: 3 }} action={<Button color="inherit" size="small" startIcon={<RefreshIcon />} onClick={() => void fetchVideos()}>Refresh</Button>}>
          {error}
        </Alert>
      ) : (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
            <TextField
              size="small"
              label="Search videos"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(0); }}
              InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: "text.secondary" }} /> }}
              sx={{ flex: 1, minWidth: 220 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="video-status-filter-label">Status</InputLabel>
              <Select labelId="video-status-filter-label" label="Status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(0); }}>
                <MenuItem value="all">All statuses</MenuItem>
                <MenuItem value="ready">Ready</MenuItem>
                <MenuItem value="processing">Processing</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Paper>
      )}

      {!error && filteredVideos.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {videos.length === 0 ? "You haven't created any videos yet." : "No videos match the current search or filter."}
          </Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => navigate("/create")} sx={{ mt: 2 }}>
            {videos.length === 0 ? "Create Your First Video" : "Create New Video"}
          </Button>
        </Paper>
      ) : !error ? (
        <Paper>
          <List>
            {visibleVideos.map((video, index) => {
              const videoId = video.id || "";
              const status = statusFor(video);
              return (
                <React.Fragment key={videoId}>
                  {index > 0 && <Box sx={{ borderTop: 1, borderColor: "divider" }} />}
                  <ListItem button onClick={() => navigate(`/video/${videoId}`)}>
                    <ListItemText
                      primary={titleFor(video)}
                      secondary={status.charAt(0).toUpperCase() + status.slice(1)}
                      secondaryTypographyProps={{ color: status === "ready" ? "success.main" : status === "failed" ? "error.main" : "text.secondary" }}
                    />
                    <ListItemSecondaryAction>
                      {status === "ready" && <IconButton edge="end" aria-label="play" onClick={() => navigate(`/video/${videoId}`)} color="primary"><PlayArrowIcon /></IconButton>}
                      <IconButton edge="end" aria-label="delete" onClick={(event) => void handleDeleteVideo(videoId, event)} color="error" disabled={deletingId === videoId} sx={{ ml: 1 }}><DeleteIcon /></IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                </React.Fragment>
              );
            })}
          </List>
          <Box display="flex" justifyContent="space-between" alignItems="center" px={2} py={1.5}>
            <Typography variant="caption" color="text.secondary">{filteredVideos.length} result{filteredVideos.length === 1 ? "" : "s"}</Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Button size="small" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>Previous</Button>
              <Typography variant="caption">Page {page + 1} of {pageCount}</Typography>
              <Button size="small" disabled={page + 1 >= pageCount} onClick={() => setPage((current) => current + 1)}>Next</Button>
            </Box>
          </Box>
        </Paper>
      ) : null}
    </Box>
  );
};

export default VideoList;
