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
  Stack,
} from "@mui/material";

interface ThumbnailDirectives {
  boldTextSize: number;
  contrastRatio: number;
  colorScheme: string[];
  emotionalElement: string;
  curiosityGapPosition: "top" | "bottom" | "center";
  safeZones: { top: number; bottom: number; left: number; right: number };
}

function ThumbnailPage() {
  const [title, setTitle] = useState("Your Viral Title");
  const [emotion, setEmotion] = useState<"surprise" | "curiosity" | "urgency" | "humor" | "fear">("curiosity");
  const [contrast, setContrast] = useState<"low" | "medium" | "high">("high");
  const [bgColor, setBgColor] = useState("#1e293b");
  const [textColor, setTextColor] = useState("#ffffff");
  const [accentColor, setAccentColor] = useState("#6366f1");
  const [directives, setDirectives] = useState<ThumbnailDirectives | null>(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch("/api/thumbnail/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, contrast, emotionalTrigger: emotion, bgColor, textColor, accentColor }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setDirectives(data.directives);
      setScore(data.effectivenessScore);
    } catch (err: any) {
      setError(err?.message || "Failed to generate thumbnail");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, color: "#6366f1" }}>
        Thumbnail Generator
      </Typography>

      <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
        <Paper sx={{ p: 3, flex: 1, bgcolor: "#1e293b" }}>
          <TextField
            fullWidth
            label="Thumbnail Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Emotional Trigger</InputLabel>
            <Select value={emotion} label="Emotional Trigger" onChange={(e) => setEmotion(e.target.value as any)}>
              <MenuItem value="surprise">Surprise</MenuItem>
              <MenuItem value="curiosity">Curiosity</MenuItem>
              <MenuItem value="urgency">Urgency</MenuItem>
              <MenuItem value="humor">Humor</MenuItem>
              <MenuItem value="fear">Fear</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Contrast Level</InputLabel>
            <Select value={contrast} label="Contrast Level" onChange={(e) => setContrast(e.target.value as any)}>
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <TextField
              label="BG Color"
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Text Color"
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Accent Color"
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              sx={{ flex: 1 }}
            />
          </Box>

          <Button fullWidth variant="contained" onClick={handleGenerate} disabled={loading}>
            {loading ? "Generating..." : "Generate Thumbnail"}
          </Button>
        </Paper>

        {error && <Alert severity="error">{error}</Alert>}

        {directives && (
          <Paper
            sx={{
              p: 3,
              flex: 1,
              bgcolor: bgColor,
              color: textColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 300,
              border: `2px solid ${accentColor}`,
            }}
          >
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                {directives.emotionalElement.split(" ")[0]}
              </Typography>
              <Typography variant="h5">{title.substring(0, 20)}</Typography>
              <Typography variant="caption" sx={{ display: "block", mt: 2 }}>
                Effectiveness: {score}/100
              </Typography>
            </Box>
          </Paper>
        )}
      </Stack>

      {directives && (
        <Paper sx={{ p: 3, mt: 3, bgcolor: "#1e293b" }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Effectiveness Score: {score}/100
          </Alert>
          <Typography variant="body2">
            <strong>Bold Text Size:</strong> {directives.boldTextSize}px
          </Typography>
          <Typography variant="body2">
            <strong>Contrast Ratio:</strong> {directives.contrastRatio}:1
          </Typography>
          <Typography variant="body2">
            <strong>Position:</strong> {directives.curiosityGapPosition}
          </Typography>
        </Paper>
      )}
    </Container>
  );
}

export default ThumbnailPage;
