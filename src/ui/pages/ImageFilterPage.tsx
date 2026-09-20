import { authenticatedFetch } from "../services/authenticatedFetch";
/**
 * ImageFilterPage – Advanced image filters with 20+ presets, live preview, and batch apply
 */
import React, { useState, useEffect } from "react";
import {
  Box, Typography, Grid, Card, CardContent, CardActionArea, Button, Slider,
  Chip, CircularProgress, Alert, Stack, Divider, TextField, Tooltip,
  IconButton, Paper, Select, MenuItem, FormControl, InputLabel, Tabs, Tab
} from "@mui/material";
import FilterIcon from "@mui/icons-material/FilterBAndW";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import RefreshIcon from "@mui/icons-material/Refresh";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import PreviewIcon from "@mui/icons-material/Preview";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

interface FilterPreset {
  id: string;
  name: string;
  description: string;
  tags: string[];
  platform: string[];
  defaultOptions: any;
}

interface FilterResult {
  cssFilter: string;
  svgFilter: string;
  filter: string;
}

const PLATFORMS = ["all", "instagram", "tiktok", "youtube", "linkedin", "facebook", "twitter"];

export const ImageFilterPage: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<FilterPreset | null>(null);
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [intensity, setIntensity] = useState(100);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);
  const [cssResult, setCssResult] = useState<FilterResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("Your Content Here");

  useEffect(() => {
    const fetchPresets = async () => {
      try {
        const url = filterPlatform && filterPlatform !== "all"
          ? `/api/image/filters?platform=${filterPlatform}`
          : "/api/image/filters";
        const res = await authenticatedFetch(url);
        const data = await res.json();
        if (data.status === "ok") setPresets(data.filters || []);
      } catch { setError("Failed to load filters"); }
      setLoading(false);
    };
    fetchPresets();
  }, [filterPlatform]);

  const selectFilter = async (preset: FilterPreset) => {
    setSelected(preset);
    setIntensity(100);
    setBrightness(preset.defaultOptions.brightness ?? 100);
    setContrast(preset.defaultOptions.contrast ?? 100);
    setSaturation(preset.defaultOptions.saturation ?? 100);
    setBlur(preset.defaultOptions.blur ?? 0);
    await buildCss(preset.id, 100, preset.defaultOptions.brightness ?? 100, preset.defaultOptions.contrast ?? 100, preset.defaultOptions.saturation ?? 100, preset.defaultOptions.blur ?? 0);
  };

  const buildCss = async (filter: string, int: number, br: number, con: number, sat: number, bl: number) => {
    try {
      const res = await authenticatedFetch("/api/image/filters/css", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filter, intensity: int, brightness: br, contrast: con, saturation: sat, blur: bl }),
      });
      const data = await res.json();
      if (data.status === "ok") setCssResult(data);
    } catch {}
  };

  const updateParam = async (param: string, value: number) => {
    if (!selected) return;
    const vals = { intensity, brightness, contrast, saturation, blur, [param]: value };
    switch (param) {
      case "intensity": setIntensity(value); break;
      case "brightness": setBrightness(value); break;
      case "contrast": setContrast(value); break;
      case "saturation": setSaturation(value); break;
      case "blur": setBlur(value); break;
    }
    await buildCss(selected.id, vals.intensity, vals.brightness, vals.contrast, vals.saturation, vals.blur);
  };

  const generatePreview = async () => {
    if (!selected) return;
    setPreviewLoading(true); setPreviewFileName(null);
    try {
      const res = await authenticatedFetch("/api/image/filters/preview", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filter: selected.id, title: previewTitle, intensity, brightness, contrast, saturation, blur }),
      });
      const data = await res.json();
      if (data.status === "ok") setPreviewFileName(data.preview.fileName);
    } catch { setError("Preview generation failed"); }
    setPreviewLoading(false);
  };

  const copyCss = () => {
    if (!cssResult) return;
    navigator.clipboard.writeText(cssResult.cssFilter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayedPresets = filterPlatform === "all"
    ? presets
    : presets.filter((p) => p.platform.includes("all") || p.platform.includes(filterPlatform));

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" gap={2}>
          <FilterIcon color="primary" sx={{ fontSize: 36 }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">Image Filters</Typography>
            <Typography variant="body2" color="text.secondary">20+ cinematic & social-media-optimized filter presets</Typography>
          </Box>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Filter Gallery" icon={<FilterIcon />} iconPosition="start" />
        <Tab label="CSS Builder" icon={<AutoFixHighIcon />} iconPosition="start" />
        <Tab label="Preview & Export" icon={<PreviewIcon />} iconPosition="start" />
      </Tabs>

      {/* Tab 0: Gallery */}
      {tab === 0 && (
        <Box>
          <Stack direction="row" gap={2} sx={{ mb: 3 }} flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Platform</InputLabel>
              <Select value={filterPlatform} label="Platform" onChange={(e) => setFilterPlatform(e.target.value)}>
                {PLATFORMS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>
              {displayedPresets.length} filters available
            </Typography>
          </Stack>

          {loading ? (
            <Box sx={{ textAlign: "center", py: 6 }}><CircularProgress /></Box>
          ) : (
            <Grid container spacing={2}>
              {displayedPresets.map((preset) => (
                <Grid item xs={6} sm={4} md={3} lg={2} key={preset.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      cursor: "pointer", height: "100%",
                      border: selected?.id === preset.id ? "2px solid #6366f1" : "1px solid rgba(255,255,255,0.1)",
                      transition: "all 0.2s",
                      "&:hover": { borderColor: "primary.main", transform: "translateY(-2px)", boxShadow: "0 8px 20px rgba(99,102,241,0.2)" },
                    }}
                    onClick={() => selectFilter(preset)}
                  >
                    <CardContent sx={{ p: 1.5 }}>
                      {/* Filter preview swatch using CSS filter on a gradient */}
                      <Box sx={{
                        height: 80, borderRadius: 1, mb: 1,
                        background: "linear-gradient(135deg, #6366f1, #f59e0b, #22c55e)",
                        filter: preset.id !== "none"
                          ? `brightness(${(preset.defaultOptions.brightness ?? 100)}%) contrast(${(preset.defaultOptions.contrast ?? 100)}%) saturate(${(preset.defaultOptions.saturation ?? 100)}%) ${preset.defaultOptions.saturation === 0 ? "grayscale(100%)" : ""}`
                          : "none",
                        position: "relative",
                      }}>
                        {selected?.id === preset.id && (
                          <CheckCircleIcon sx={{ position: "absolute", top: 4, right: 4, fontSize: 18, color: "#6366f1", backgroundColor: "white", borderRadius: "50%" }} />
                        )}
                      </Box>
                      <Typography variant="caption" fontWeight={selected?.id === preset.id ? 700 : 400} color={selected?.id === preset.id ? "primary" : "text.primary"}>
                        {preset.name}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: "0.65rem", mt: 0.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {preset.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Tab 1: CSS Builder */}
      {tab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>⚙️ Filter Controls</Typography>
                {selected ? (
                  <Stack gap={3}>
                    <Box>
                      <Typography variant="body2" gutterBottom>Intensity: {intensity}%</Typography>
                      <Slider value={intensity} min={0} max={100} onChange={(_, v) => updateParam("intensity", v as number)} marks={[{ value: 0, label: "0%" }, { value: 50, label: "50%" }, { value: 100, label: "100%" }]} />
                    </Box>
                    <Box>
                      <Typography variant="body2" gutterBottom>Brightness: {brightness}%</Typography>
                      <Slider value={brightness} min={0} max={200} onChange={(_, v) => updateParam("brightness", v as number)} />
                    </Box>
                    <Box>
                      <Typography variant="body2" gutterBottom>Contrast: {contrast}%</Typography>
                      <Slider value={contrast} min={0} max={200} onChange={(_, v) => updateParam("contrast", v as number)} color="secondary" />
                    </Box>
                    <Box>
                      <Typography variant="body2" gutterBottom>Saturation: {saturation}%</Typography>
                      <Slider value={saturation} min={0} max={200} onChange={(_, v) => updateParam("saturation", v as number)} color="success" />
                    </Box>
                    <Box>
                      <Typography variant="body2" gutterBottom>Blur: {blur}px</Typography>
                      <Slider value={blur} min={0} max={10} step={0.5} onChange={(_, v) => updateParam("blur", v as number)} />
                    </Box>
                  </Stack>
                ) : (
                  <Typography color="text.secondary" variant="body2">Select a filter from the Gallery tab to configure it here.</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>📋 Generated CSS Filter</Typography>
                {cssResult ? (
                  <Stack gap={2}>
                    <Box sx={{ backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 2, p: 2, fontFamily: "monospace", fontSize: "0.8rem", wordBreak: "break-all", color: "#22c55e" }}>
                      filter: {cssResult.cssFilter};
                    </Box>
                    <Stack direction="row" gap={1}>
                      <Tooltip title={copied ? "Copied!" : "Copy CSS"}>
                        <Button startIcon={copied ? <CheckCircleIcon /> : <ContentCopyIcon />} variant="outlined" onClick={copyCss} size="small">
                          {copied ? "Copied!" : "Copy CSS"}
                        </Button>
                      </Tooltip>
                    </Stack>
                    {/* Live preview */}
                    <Typography variant="body2" color="text.secondary">Live Preview:</Typography>
                    <Box sx={{
                      height: 160, borderRadius: 2,
                      background: "linear-gradient(135deg, #6366f1 0%, #f59e0b 50%, #22c55e 100%)",
                      filter: cssResult.cssFilter,
                      transition: "filter 0.3s ease",
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      <Typography fontWeight="bold" sx={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
                        {selected?.name || "Preview"}
                      </Typography>
                    </Box>
                    <Alert severity="info" sx={{ fontSize: "0.75rem" }}>
                      Apply this CSS filter to any image or video element using style or className
                    </Alert>
                  </Stack>
                ) : (
                  <Typography color="text.secondary" variant="body2">Select a filter and adjust settings to see CSS output</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 2: Preview & Export */}
      {tab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>🎨 Generate Filter Preview</Typography>
                <Stack gap={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Filter</InputLabel>
                    <Select value={selected?.id || ""} label="Filter" onChange={(e) => { const p = presets.find((x) => x.id === e.target.value); if (p) selectFilter(p); }}>
                      {presets.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <TextField label="Preview Title" value={previewTitle} onChange={(e) => setPreviewTitle(e.target.value)} size="small" />
                  <Box>
                    <Typography variant="body2" gutterBottom>Intensity: {intensity}%</Typography>
                    <Slider value={intensity} min={0} max={100} onChange={(_, v) => setIntensity(v as number)} />
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={previewLoading ? <CircularProgress size={16} color="inherit" /> : <PreviewIcon />}
                    onClick={generatePreview}
                    disabled={!selected || previewLoading}
                    fullWidth
                  >
                    {previewLoading ? "Generating..." : "Generate Preview Card"}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={7}>
            <Card variant="outlined" sx={{ minHeight: 300 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>Preview Output</Typography>
                {previewFileName ? (
                  <Stack gap={2}>
                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                      <img
                        src={`/api/image/filters/preview/file/${previewFileName}`}
                        alt="Filter Preview"
                        style={{ width: "100%", maxWidth: 500, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)" }}
                      />
                    </Box>
                    <Stack direction="row" gap={1} justifyContent="center">
                      <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={() => { const a = document.createElement("a"); a.href = `/api/image/filters/preview/file/${previewFileName}`; a.download = previewFileName; a.click(); }}
                        size="small"
                      >
                        Download SVG
                      </Button>
                    </Stack>
                    <Chip label={`Filter: ${selected?.name}`} color="primary" size="small" sx={{ alignSelf: "center" }} />
                  </Stack>
                ) : (
                  <Paper sx={{ height: 250, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "transparent", border: "2px dashed rgba(255,255,255,0.1)", borderRadius: 2 }}>
                    <Box sx={{ textAlign: "center" }}>
                      <FilterIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Preview will appear here</Typography>
                    </Box>
                  </Paper>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* All presets gallery with live CSS preview */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }}><Typography variant="caption" color="text.secondary">ALL FILTER PREVIEWS (via CSS)</Typography></Divider>
            <Grid container spacing={2}>
              {presets.slice(0, 10).map((p) => (
                <Grid item xs={6} sm={4} md={2.4} key={p.id}>
                  <Box sx={{ textAlign: "center" }}>
                    <Box sx={{
                      height: 100, borderRadius: 2, mb: 1,
                      background: "linear-gradient(135deg, #8b5cf6 0%, #f59e0b 40%, #22c55e 100%)",
                      filter: p.id !== "none"
                        ? `brightness(${p.defaultOptions.brightness ?? 100}%) contrast(${p.defaultOptions.contrast ?? 100}%) saturate(${p.defaultOptions.saturation ?? 100}%) ${p.defaultOptions.saturation === 0 ? "grayscale(100%)" : p.id === "sepia" ? "sepia(80%)" : ""}${p.defaultOptions.blur ? ` blur(${p.defaultOptions.blur}px)` : ""}`
                        : "none",
                      cursor: "pointer", transition: "transform 0.2s",
                      "&:hover": { transform: "scale(1.05)" }
                    } as any}
                      onClick={() => { selectFilter(p); setTab(1); }}
                    />
                    <Typography variant="caption" fontWeight={600}>{p.name}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default ImageFilterPage;
