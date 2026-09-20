import { authenticatedFetch } from "../services/authenticatedFetch";
import React, { useState } from "react";
import {
  Container,
  Paper,
  TextField,
  Button,
  Slider,
  Box,
  Typography,
  Alert,
  FormControlLabel,
  Checkbox,
} from "@mui/material";

interface AudioEnhancement {
  normalizationGain: number;
  musicDuckingDb: number;
  fadeInDuration: number;
  fadeOutDuration: number;
  ffmpegFilters: string[];
  estimatedQuality: number;
}

function AudioQualityPage() {
  const [currentLUFS, setCurrentLUFS] = useState(-18);
  const [targetLUFS, setTargetLUFS] = useState(-14);
  const [musicDucking, setMusicDucking] = useState(true);
  const [fadeInMs, setFadeInMs] = useState(500);
  const [fadeOutMs, setFadeOutMs] = useState(800);
  const [enhancement, setEnhancement] = useState<AudioEnhancement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch("/api/audio/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentLUFS, targetLUFS }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setEnhancement(data.enhancement);
    } catch (err: any) {
      setError(err?.message || "Failed to process audio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, color: "#6366f1" }}>
        Audio Quality Engine
      </Typography>

      <Paper sx={{ p: 3, mb: 3, bgcolor: "#1e293b" }}>
        <Box sx={{ mb: 3 }}>
          <Typography gutterBottom>
            Current LUFS: <strong>{currentLUFS}</strong>
          </Typography>
          <Slider
            value={currentLUFS}
            onChange={(_, v) => setCurrentLUFS(v as number)}
            min={-30}
            max={0}
            step={1}
            marks={[
              { value: -30, label: "-30" },
              { value: -14, label: "-14 (Target)" },
              { value: 0, label: "0" },
            ]}
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography gutterBottom>
            Target LUFS: <strong>{targetLUFS}</strong>
          </Typography>
          <Slider
            value={targetLUFS}
            onChange={(_, v) => setTargetLUFS(v as number)}
            min={-30}
            max={0}
            step={1}
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={<Checkbox checked={musicDucking} onChange={(e) => setMusicDucking(e.target.checked)} />}
            label="Enable Music Ducking"
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography gutterBottom>
            Fade In Duration: <strong>{fadeInMs}ms</strong>
          </Typography>
          <Slider
            value={fadeInMs}
            onChange={(_, v) => setFadeInMs(v as number)}
            min={0}
            max={2000}
            step={100}
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography gutterBottom>
            Fade Out Duration: <strong>{fadeOutMs}ms</strong>
          </Typography>
          <Slider
            value={fadeOutMs}
            onChange={(_, v) => setFadeOutMs(v as number)}
            min={0}
            max={2000}
            step={100}
          />
        </Box>

        <Button variant="contained" fullWidth onClick={handleProcess} disabled={loading}>
          {loading ? "Processing..." : "Process Audio"}
        </Button>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {enhancement && (
        <Paper sx={{ p: 3, bgcolor: "#1e293b" }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            Audio enhanced! Quality score: {enhancement.estimatedQuality}/100
          </Alert>

          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, color: "#f59e0b" }}>
              Processing Details
            </Typography>
            <Typography>
              <strong>Normalization Gain:</strong> {enhancement.normalizationGain.toFixed(2)}dB
            </Typography>
            <Typography>
              <strong>Music Ducking:</strong> {enhancement.musicDuckingDb}dB
            </Typography>
            <Typography>
              <strong>Quality Score:</strong> {enhancement.estimatedQuality}/100
            </Typography>
          </Box>

          <Box>
            <Typography variant="h6" sx={{ mb: 2, color: "#f59e0b" }}>
              Applied Filters
            </Typography>
            {enhancement.ffmpegFilters.map((filter, idx) => (
              <Typography key={`filter-${idx}`} variant="body2" sx={{ fontFamily: "monospace" }}>
                {filter}
              </Typography>
            ))}
          </Box>
        </Paper>
      )}
    </Container>
  );
}

export default AudioQualityPage;
