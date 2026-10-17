import { authenticatedFetch } from "../services/authenticatedFetch";
import React, { useState } from "react";
import {
  Container,
  Paper,
  Slider,
  Box,
  Typography,
  Alert,
  Button,
  FormControlLabel,
  Checkbox,
} from "@mui/material";

interface EnhancementResult {
  sharpenAmount: number;
  contrastMultiplier: number;
  colorCorrection: { hue: number; saturation: number; lightness: number };
  gridOverlay: { enabled: boolean; lines: Array<{ x: number; y: number }> };
  safeZoneMargins: { top: number; bottom: number; left: number; right: number };
  estimatedQualityScore: number;
}

function VisualEnhancementPage() {
  const [autoSharpen, setAutoSharpen] = useState(true);
  const [contrastOptimize, setContrastOptimize] = useState(true);
  const [ruleOfThirds, setRuleOfThirds] = useState(true);
  const [saturation, setSaturation] = useState(0);
  const [brightness, setBrightness] = useState(0);
  const [sharpnessLevel, setSharpnessLevel] = useState(1);
  const [enhancement, setEnhancement] = useState<EnhancementResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnhance = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch("/api/visual/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          width: 1920,
          height: 1080,
          autoSharpen,
          contrastOptimize,
          saturation,
          brightness,
          sharpnessLevel,
          noiseReduction: 0.5,
        }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setEnhancement(data.enhancement);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to enhance video";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, color: "#6366f1" }}>
        Visual Enhancement Engine
      </Typography>

      <Paper sx={{ p: 3, mb: 3, bgcolor: "#1e293b" }}>
        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={<Checkbox checked={autoSharpen} onChange={(e) => setAutoSharpen(e.target.checked)} />}
            label="Auto Sharpen"
          />
          <FormControlLabel
            control={
              <Checkbox checked={contrastOptimize} onChange={(e) => setContrastOptimize(e.target.checked)} />
            }
            label="Optimize Contrast"
          />
          <FormControlLabel
            control={<Checkbox checked={ruleOfThirds} onChange={(e) => setRuleOfThirds(e.target.checked)} />}
            label="Rule of Thirds Grid"
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography gutterBottom>
            Sharpness Level: <strong>{sharpnessLevel}</strong>
          </Typography>
          <Slider
            value={sharpnessLevel}
            onChange={(_, v) => setSharpnessLevel(v as number)}
            min={0}
            max={5}
            step={0.5}
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography gutterBottom>
            Saturation: <strong>{saturation}</strong>
          </Typography>
          <Slider value={saturation} onChange={(_, v) => setSaturation(v as number)} min={-50} max={50} />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography gutterBottom>
            Brightness: <strong>{brightness}</strong>
          </Typography>
          <Slider value={brightness} onChange={(_, v) => setBrightness(v as number)} min={-50} max={50} />
        </Box>

        <Button variant="contained" fullWidth onClick={handleEnhance} disabled={loading}>
          {loading ? "Enhancing..." : "Apply Enhancement"}
        </Button>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {enhancement && (
        <Paper sx={{ p: 3, bgcolor: "#1e293b" }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            Enhancement applied! Quality score: {enhancement.estimatedQualityScore}/100
          </Alert>

          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, color: "#f59e0b" }}>
              Enhancement Details
            </Typography>
            <Typography>
              <strong>Sharpen Amount:</strong> {enhancement.sharpenAmount.toFixed(2)}
            </Typography>
            <Typography>
              <strong>Contrast Multiplier:</strong> {enhancement.contrastMultiplier.toFixed(2)}x
            </Typography>
            <Typography>
              <strong>Quality Score:</strong> {enhancement.estimatedQualityScore}/100
            </Typography>
          </Box>

          <Box>
            <Typography variant="h6" sx={{ mb: 2, color: "#f59e0b" }}>
              Safe Zones (Margins)
            </Typography>
            <Typography variant="body2">
              Top: {enhancement.safeZoneMargins.top}px | Bottom: {enhancement.safeZoneMargins.bottom}px
            </Typography>
            <Typography variant="body2">
              Left: {enhancement.safeZoneMargins.left}px | Right: {enhancement.safeZoneMargins.right}px
            </Typography>
          </Box>
        </Paper>
      )}
    </Container>
  );
}

export default VisualEnhancementPage;
