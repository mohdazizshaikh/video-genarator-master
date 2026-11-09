import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  CircularProgress, 
  Alert,
  Grid,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import { VideoStatus } from '../../types/shorts';
import apiClient from '../services/apiClient';

const http = apiClient.getAxiosInstance();

const VideoDetails: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<VideoStatus>('processing');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const renewalAttempts = useRef(0);
  const resume = useRef<{ time: number; playing: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setLoading(true);
    setError(null);
    setPlaybackUrl(null);
    setStatus("processing");
    const poll = async () => {
    try {
      const response = await http.get(`/api/short-video/${videoId}/status`);
        if (!active) return;
        const next = response.data.status as VideoStatus;
        setStatus(next);
        setLoading(false);
        if (next === "processing") timer = setTimeout(() => void poll(), 5000);
      } catch {
        if (active) {
          setError("Failed to fetch video status");
          setStatus("failed");
          setLoading(false);
        }
      }
    };
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [videoId]);

  useEffect(() => {
    if (status !== "ready") return;
    let active = true;
    void http
      .get<{ url: string }>(`/api/short-video/${videoId}/playback`)
      .then((response) => {
        if (active) setPlaybackUrl(response.data.url);
      })
      .catch(() => {
        if (active) setError("Failed to authorize video playback");
      });
    return () => {
      active = false;
    };
  }, [status, videoId]);

  const renewPlayback = async () => {
    if (renewalAttempts.current++ >= 1) {
      setError("Video playback failed. Please retry from the library.");
      return;
    }
    const element = videoRef.current;
    if (element)
      resume.current = { time: element.currentTime, playing: !element.paused };
    try {
      const response = await http.get<{ url: string }>(
        `/api/short-video/${videoId}/playback`,
      );
      setPlaybackUrl(response.data.url);
    } catch {
      setError("Video access expired. Reconnect your workspace to continue.");
    }
  };

  const downloadVideo = async (event: React.MouseEvent) => {
    event.preventDefault();
    try {
      const response = await http.get<{ url: string }>(
        `/api/short-video/${videoId}/playback`,
      );
      const link = document.createElement("a");
      link.href = response.data.url;
      link.download = `${videoId}.mp4`;
      link.click();
    } catch {
      setError("Failed to authorize video download");
    }
  };

  const handleBack = () => {
    navigate("/");
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="30vh"
        >
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return <Alert severity="error">{error}</Alert>;
    }

    if (status === "processing") {
      return (
        <Box textAlign="center" py={4}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6">Your video is being created...</Typography>
          <Typography variant="body1" color="text.secondary">
            This may take a few minutes. Please wait.
          </Typography>
        </Box>
      );
    }

    if (status === "ready") {
      return (
        <Box>
          <Box mb={3} textAlign="center">
            <Typography variant="h6" color="success.main" gutterBottom>
              Your video is ready!
            </Typography>
          </Box>

          <Box
            sx={{
              position: "relative",
              paddingTop: "56.25%",
              mb: 3,
              backgroundColor: "#000",
            }}
          >
            <video
              ref={videoRef}
              onError={() => {
                if (playbackUrl) void renewPlayback();
              }}
              onLoadedMetadata={() => {
                renewalAttempts.current = 0;
                const position = resume.current;
                if (position && videoRef.current) {
                  videoRef.current.currentTime = position.time;
                  if (position.playing)
                    void videoRef.current.play().catch(() => undefined);
                  resume.current = null;
                }
              }}
              controls
              autoPlay
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
              }}
              src={playbackUrl || undefined}
            />
          </Box>

          <Box textAlign="center">
            <Button
              component="a"
              href={playbackUrl || undefined}
              onClick={(event) => void downloadVideo(event)}
              disabled={!playbackUrl}
              download
              variant="contained"
              color="primary"
              startIcon={<DownloadIcon />}
              sx={{ textDecoration: "none" }}
            >
              Download Video
            </Button>
          </Box>
        </Box>
      );
    }

    if (status === "failed") {
      return (
        <Alert severity="error" sx={{ mb: 3 }}>
          Video processing failed. Please try again with different settings.
        </Alert>
      );
    }

    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        Unknown video status. Please try refreshing the page.
      </Alert>
    );
  };

  const capitalizeFirstLetter = (str: string) => {
    if (!str || typeof str !== "string") return "Unknown";
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <Box maxWidth="md" mx="auto" py={4}>
      <Box display="flex" alignItems="center" mb={3}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mr: 2 }}
        >
          Back to videos
        </Button>
        <Typography variant="h4" component="h1">
          Video Details
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Video ID
            </Typography>
            <Typography variant="body1">{videoId || "Unknown"}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Status
            </Typography>
            <Typography
              variant="body1"
              color={
                status === "ready"
                  ? "success.main"
                  : status === "processing"
                    ? "info.main"
                    : status === "failed"
                      ? "error.main"
                      : "text.primary"
              }
            >
              {capitalizeFirstLetter(status)}
            </Typography>
          </Grid>
        </Grid>

        {renderContent()}
      </Paper>
    </Box>
  );
};

export default VideoDetails;
