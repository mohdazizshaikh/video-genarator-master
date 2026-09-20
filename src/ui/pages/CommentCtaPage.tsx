import { authenticatedFetch } from "../services/authenticatedFetch";
import React, { useState } from "react";
import {
  Container, Paper, TextField, Button, FormControl, InputLabel,
  Select, MenuItem, Box, Typography, Alert, Stack, Chip,
  Grid, Card, CardContent, IconButton, Tooltip,
} from "@mui/material";
import CommentIcon from "@mui/icons-material/Comment";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RefreshIcon from "@mui/icons-material/Refresh";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import { CONTENT_CATEGORIES } from "../../config/categories";

interface CTA {
  id: string;
  text: string;
  platform: string;
  placement: "comment" | "description" | "end-screen";
  language: string;
  category: string;
  engagementScore: number;
  type: "question" | "directive" | "curiosity" | "social-proof" | "urgency";
}

const PLATFORMS = [
  { value: "youtube", label: "YouTube" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "twitter", label: "X/Twitter" },
  { value: "facebook", label: "Facebook" },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "ur", label: "Urdu" },
  { value: "ar", label: "Arabic" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
];

const PLACEMENTS = [
  { value: "comment", label: "Pinned Comment" },
  { value: "description", label: "Video Description" },
  { value: "end-screen", label: "End Screen" },
];

const TYPE_COLORS: Record<string, string> = {
  question: "#6366f1",
  directive: "#f59e0b",
  curiosity: "#22c55e",
  "social-proof": "#3b82f6",
  urgency: "#ef4444",
};

function CommentCtaPage() {
  const [platform, setPlatform] = useState("youtube");
  const [category, setCategory] = useState("Technology");
  const [language, setLanguage] = useState("en");
  const [placement, setPlacement] = useState("comment");
  const [ctas, setCtas] = useState<CTA[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch("/api/strategy/cta/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, category, language }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setCtas(Array.isArray(data.data) ? data.data : []);
    } catch (err: any) {
      setError(err?.message || "Failed to generate CTAs");
    } finally {
      setLoading(false);
    }
  };

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ platform, category, language, placement, limit: "6" });
      const res = await authenticatedFetch(`/api/strategy/cta?${params}`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setCtas(Array.isArray(data.data) ? data.data : []);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch CTAs");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <CommentIcon sx={{ fontSize: 36, color: "#6366f1" }} />
        <Box>
          <Typography variant="h4" fontWeight={700}>Comment CTA Engine</Typography>
          <Typography variant="body2" color="text.secondary">
            Generate AI-powered call-to-action comments to boost engagement
          </Typography>
        </Box>
        <Chip label="Engine #26" size="small" sx={{ ml: "auto", bgcolor: "#6366f1", color: "white" }} />
      </Box>

      {/* Configuration */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: "#1e293b" }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Platform</InputLabel>
              <Select value={platform} label="Platform" onChange={(e) => setPlatform(e.target.value)}>
                {PLATFORMS.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select value={category} label="Category" onChange={(e) => setCategory(e.target.value)}>
                {CONTENT_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Language</InputLabel>
              <Select value={language} label="Language" onChange={(e) => setLanguage(e.target.value)}>
                {LANGUAGES.map((l) => <MenuItem key={l.value} value={l.value}>{l.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Placement</InputLabel>
              <Select value={placement} label="Placement" onChange={(e) => setPlacement(e.target.value)}>
                {PLACEMENTS.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Button
            variant="contained" fullWidth
            onClick={handleGenerate} disabled={loading}
            startIcon={loading ? undefined : <CommentIcon />}
          >
            {loading ? "Generating..." : "Generate New CTAs"}
          </Button>
          <Button
            variant="outlined" fullWidth
            onClick={handleFetch} disabled={loading}
            startIcon={<RefreshIcon />}
          >
            Fetch Best CTAs
          </Button>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* CTA Cards */}
      {ctas.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, color: "#f59e0b" }}>
            Generated CTAs ({ctas.length})
          </Typography>
          <Grid container spacing={2}>
            {ctas.map((cta, idx) => (
              <Grid item xs={12} sm={6} key={`cta-${cta.id || idx}`}>
                <Card sx={{ bgcolor: "#1e293b", border: "1px solid #334155", height: "100%" }}>
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip
                          label={cta.type}
                          size="small"
                          sx={{ bgcolor: TYPE_COLORS[cta.type] + "22", color: TYPE_COLORS[cta.type], fontWeight: 700 }}
                        />
                        {cta.placement && (
                          <Chip label={cta.placement} size="small" variant="outlined" />
                        )}
                      </Stack>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {cta.engagementScore && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <ThumbUpIcon sx={{ fontSize: 14, color: "#22c55e" }} />
                            <Typography variant="caption" sx={{ color: "#22c55e" }}>
                              {(cta.engagementScore * 100).toFixed(0)}
                            </Typography>
                          </Box>
                        )}
                        <Tooltip title={copiedId === (cta.id || String(idx)) ? "Copied!" : "Copy CTA"}>
                          <IconButton
                            size="small"
                            onClick={() => copyToClipboard(cta.text, cta.id || String(idx))}
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>

                    <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                      {cta.text}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {!loading && ctas.length === 0 && !error && (
        <Paper sx={{ p: 6, textAlign: "center", bgcolor: "#1e293b" }}>
          <CommentIcon sx={{ fontSize: 64, color: "#334155", mb: 2 }} />
          <Typography color="text.secondary">
            Generate CTAs or fetch the best performing ones for your platform and category
          </Typography>
        </Paper>
      )}
    </Container>
  );
}

export default CommentCtaPage;
