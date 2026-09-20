import { authenticatedFetch } from "../services/authenticatedFetch";
import React, { useState, useEffect } from "react";
import {
  Container, Paper, TextField, Button, FormControl, InputLabel,
  Select, MenuItem, Box, Typography, Alert, Stack, Chip,
  Grid, Slider, Switch, FormControlLabel,
} from "@mui/material";
import BrandingWatermarkIcon from "@mui/icons-material/BrandingWatermark";
import CodeIcon from "@mui/icons-material/Code";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

interface WatermarkConfig {
  text?: string;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
  opacity: number;
  fontSize?: number;
  color?: string;
  logoPath?: string;
}

function WatermarkPage() {
  const [config, setConfig] = useState<WatermarkConfig>({
    text: "@YourBrand",
    position: "bottom-right",
    opacity: 0.6,
    fontSize: 24,
    color: "white",
  });
  const [ffmpegFilter, setFfmpegFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [useLogoMode, setUseLogoMode] = useState(false);
  const [logoPath, setLogoPath] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = { ...config };
      if (useLogoMode && logoPath) payload.logoPath = logoPath;
      const res = await authenticatedFetch("/api/watermark/filter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setFfmpegFilter(data.filter);
    } catch (err: any) {
      setError(err?.message || "Failed to generate watermark filter");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDefault = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch("/api/watermark/default", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
    } catch (err: any) {
      setError(err?.message || "Failed to save default watermark");
    } finally {
      setLoading(false);
    }
  };

  const copyFilter = () => {
    navigator.clipboard.writeText(ffmpegFilter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const previewStyle = () => {
    const posMap: Record<string, React.CSSProperties> = {
      "top-left": { top: 12, left: 12 },
      "top-right": { top: 12, right: 12 },
      "bottom-left": { bottom: 12, left: 12 },
      "bottom-right": { bottom: 12, right: 12 },
      center: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
    };
    return posMap[config.position] || { bottom: 12, right: 12 };
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <BrandingWatermarkIcon sx={{ fontSize: 36, color: "#6366f1" }} />
        <Box>
          <Typography variant="h4" fontWeight={700}>Watermark Engine</Typography>
          <Typography variant="body2" color="text.secondary">
            Brand your videos with text or logo watermarks using FFmpeg filters
          </Typography>
        </Box>
        <Chip label="Engine #34" size="small" sx={{ ml: "auto", bgcolor: "#6366f1", color: "white" }} />
      </Box>

      <Grid container spacing={3}>
        {/* Controls */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, bgcolor: "#1e293b", height: "100%" }}>
            <Typography variant="h6" sx={{ mb: 2, color: "#f59e0b" }}>Configuration</Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={useLogoMode}
                  onChange={(e) => setUseLogoMode(e.target.checked)}
                />
              }
              label="Use Logo Image (instead of text)"
              sx={{ mb: 2 }}
            />

            {useLogoMode ? (
              <TextField
                fullWidth size="small" label="Logo File Path"
                value={logoPath} onChange={(e) => setLogoPath(e.target.value)}
                placeholder="/path/to/logo.png"
                sx={{ mb: 2 }}
              />
            ) : (
              <TextField
                fullWidth size="small" label="Watermark Text"
                value={config.text || ""}
                onChange={(e) => setConfig((c) => ({ ...c, text: e.target.value }))}
                placeholder="@YourBrand"
                sx={{ mb: 2 }}
              />
            )}

            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Position</InputLabel>
              <Select
                value={config.position} label="Position"
                onChange={(e) => setConfig((c) => ({ ...c, position: e.target.value as any }))}
              >
                {[
                  { value: "top-left", label: "Top Left" },
                  { value: "top-right", label: "Top Right" },
                  { value: "bottom-left", label: "Bottom Left" },
                  { value: "bottom-right", label: "Bottom Right (Recommended)" },
                  { value: "center", label: "Center" },
                ].map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Opacity: <strong>{(config.opacity * 100).toFixed(0)}%</strong>
              </Typography>
              <Slider
                value={config.opacity}
                onChange={(_, v) => setConfig((c) => ({ ...c, opacity: v as number }))}
                min={0.1} max={1} step={0.05} size="small"
                marks={[{ value: 0.5, label: "50%" }, { value: 1, label: "100%" }]}
              />
            </Box>

            {!useLogoMode && (
              <>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Font Size: <strong>{config.fontSize}px</strong>
                  </Typography>
                  <Slider
                    value={config.fontSize || 24}
                    onChange={(_, v) => setConfig((c) => ({ ...c, fontSize: v as number }))}
                    min={12} max={72} step={2} size="small"
                    marks={[{ value: 24, label: "24" }, { value: 48, label: "48" }]}
                  />
                </Box>

                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Text Color</InputLabel>
                  <Select
                    value={config.color || "white"} label="Text Color"
                    onChange={(e) => setConfig((c) => ({ ...c, color: e.target.value }))}
                  >
                    {["white", "black", "yellow", "red", "blue", "green", "gray"].map((col) => (
                      <MenuItem key={col} value={col}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box sx={{ width: 16, height: 16, borderRadius: "50%", bgcolor: col, border: "1px solid #666" }} />
                          {col.charAt(0).toUpperCase() + col.slice(1)}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained" fullWidth onClick={handleGenerate}
                disabled={loading}
                startIcon={<CodeIcon />}
              >
                {loading ? "Generating..." : "Generate FFmpeg Filter"}
              </Button>
              <Button
                variant="outlined" onClick={handleSaveDefault}
                disabled={loading}
              >
                Save as Default
              </Button>
            </Stack>
          </Paper>
        </Grid>

        {/* Preview + Output */}
        <Grid item xs={12} md={6}>
          <Stack spacing={3} sx={{ height: "100%" }}>
            {/* Live Preview */}
            <Paper sx={{ p: 3, bgcolor: "#1e293b" }}>
              <Typography variant="h6" sx={{ mb: 2, color: "#f59e0b" }}>Live Preview</Typography>
              <Box
                sx={{
                  position: "relative", bgcolor: "#0f172a",
                  borderRadius: 2, height: 200,
                  background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                <Typography color="rgba(255,255,255,0.2)" variant="h6">Video Preview Area</Typography>

                {/* Watermark overlay */}
                <Box
                  sx={{
                    position: "absolute",
                    ...previewStyle(),
                    opacity: config.opacity,
                    pointerEvents: "none",
                  }}
                >
                  {useLogoMode && logoPath ? (
                    <Box sx={{ width: 60, height: 20, bgcolor: "#6366f1", borderRadius: 1, opacity: 0.8 }}>
                      <Typography variant="caption" sx={{ px: 1, fontSize: "0.6rem", color: "white" }}>
                        LOGO
                      </Typography>
                    </Box>
                  ) : (
                    <Typography
                      sx={{
                        fontSize: `${Math.max(10, (config.fontSize || 24) * 0.5)}px`,
                        color: config.color || "white",
                        fontWeight: 700,
                        textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
                        userSelect: "none",
                      }}
                    >
                      {config.text || "@YourBrand"}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Paper>

            {/* FFmpeg Filter Output */}
            <Paper sx={{ p: 3, flex: 1, bgcolor: "#1e293b" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="h6" sx={{ color: "#f59e0b" }}>FFmpeg Filter</Typography>
                {ffmpegFilter && (
                  <Button
                    size="small" startIcon={<ContentCopyIcon />}
                    onClick={copyFilter} variant="outlined"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                )}
              </Box>
              <Box
                sx={{
                  p: 2, bgcolor: "#0f172a", borderRadius: 1, minHeight: 80,
                  fontFamily: "monospace", fontSize: "0.8rem", wordBreak: "break-all",
                  border: "1px solid #334155",
                }}
              >
                {ffmpegFilter || (
                  <Typography color="text.secondary" fontStyle="italic" fontSize="inherit">
                    Generate a filter to see FFmpeg command...
                  </Typography>
                )}
              </Box>
              {ffmpegFilter && (
                <Alert severity="info" sx={{ mt: 1.5 }} icon={<CodeIcon />}>
                  Add this as a video filter in your FFmpeg command:
                  <br />
                  <code>ffmpeg -i input.mp4 -vf "{ffmpegFilter}" output.mp4</code>
                </Alert>
              )}
            </Paper>
          </Stack>
        </Grid>
      </Grid>

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </Container>
  );
}

export default WatermarkPage;
