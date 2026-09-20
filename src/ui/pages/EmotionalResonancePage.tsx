import { authenticatedFetch } from "../services/authenticatedFetch";
import React, { useState } from "react";
import {
  Container,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  Chip,
  Stack,
} from "@mui/material";

interface EmotionalScore {
  tone: string;
  intensity: number;
  scriptAlignment: number;
  audioAlignment: number;
  visualAlignment: number;
  overallScore: number;
}

function EmotionalResonancePage() {
  const [script, setScript] = useState("");
  const [audioDuration, setAudioDuration] = useState(30);
  const [visualElements, setVisualElements] = useState(5);
  const [score, setScore] = useState<EmotionalScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScore = async () => {
    if (!script.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch("/api/emotional/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptText: script, audioLength: audioDuration, visualElements }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setScore(data.score);
    } catch (err: any) {
      setError(err?.message || "Failed to analyze emotional content");
    } finally {
      setLoading(false);
    }
  };

  const emotionColors: Record<string, string> = {
    joy: "#FFD700",
    fear: "#E74C3C",
    anger: "#C0392B",
    sadness: "#34495E",
    surprise: "#F39C12",
    trust: "#3498DB",
    disgust: "#6C5CE7",
    anticipation: "#FF7675",
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, color: "#6366f1" }}>
        Emotional Resonance Engine
      </Typography>

      <Paper sx={{ p: 3, mb: 3, bgcolor: "#1e293b" }}>
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Script"
          value={script}
          onChange={(e) => setScript(e.target.value)}
          sx={{ mb: 2 }}
          placeholder="Enter your video script..."
        />

        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <TextField
            type="number"
            label="Audio Duration (sec)"
            value={audioDuration}
            onChange={(e) => setAudioDuration(Number(e.target.value))}
            sx={{ flex: 1 }}
          />
          <TextField
            type="number"
            label="Visual Elements"
            value={visualElements}
            onChange={(e) => setVisualElements(Number(e.target.value))}
            sx={{ flex: 1 }}
          />
        </Box>

        <Button variant="contained" fullWidth onClick={handleScore} disabled={loading}>
          {loading ? "Analyzing..." : "Analyze Emotional Content"}
        </Button>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {score && (
        <Paper sx={{ p: 3, bgcolor: "#1e293b" }}>
          <Alert
            severity={score.overallScore > 0.7 ? "success" : "info"}
            sx={{ mb: 2, bgcolor: emotionColors[score.tone] + "22" }}
          >
            <strong>Emotional Tone:</strong> {score.tone.charAt(0).toUpperCase() + score.tone.slice(1)} (Intensity:{" "}
            {score.intensity.toFixed(2)})
          </Alert>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 3 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Script Alignment: {(score.scriptAlignment * 100).toFixed(0)}%
              </Typography>
              <Box sx={{ bgcolor: "#0f172a", borderRadius: 1, height: 8 }}>
                <Box
                  sx={{
                    bgcolor: "#6366f1",
                    height: "100%",
                    width: `${score.scriptAlignment * 100}%`,
                    borderRadius: 1,
                  }}
                />
              </Box>
            </Box>

            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Audio Alignment: {(score.audioAlignment * 100).toFixed(0)}%
              </Typography>
              <Box sx={{ bgcolor: "#0f172a", borderRadius: 1, height: 8 }}>
                <Box
                  sx={{
                    bgcolor: "#f59e0b",
                    height: "100%",
                    width: `${score.audioAlignment * 100}%`,
                    borderRadius: 1,
                  }}
                />
              </Box>
            </Box>

            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Visual Alignment: {(score.visualAlignment * 100).toFixed(0)}%
              </Typography>
              <Box sx={{ bgcolor: "#0f172a", borderRadius: 1, height: 8 }}>
                <Box
                  sx={{
                    bgcolor: "#22c55e",
                    height: "100%",
                    width: `${score.visualAlignment * 100}%`,
                    borderRadius: 1,
                  }}
                />
              </Box>
            </Box>
          </Stack>

          <Typography variant="h6" sx={{ mb: 2, color: "#f59e0b" }}>
            Overall Score: {(score.overallScore * 100).toFixed(0)}/100
          </Typography>

          <Box>
            <Chip
              label={score.tone}
              sx={{ bgcolor: emotionColors[score.tone], color: "#000", fontWeight: 700 }}
            />
          </Box>
        </Paper>
      )}
    </Container>
  );
}

export default EmotionalResonancePage;
