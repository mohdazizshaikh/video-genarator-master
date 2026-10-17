import { authenticatedFetch } from "../services/authenticatedFetch";
import React, { useState, useEffect } from "react";
import {
  Container, Paper, TextField, Button, FormControl, InputLabel,
  Select, MenuItem, Box, Typography, Alert, Stack, Chip,
  Divider, CircularProgress, IconButton, Tooltip,
} from "@mui/material";
import TranslateIcon from "@mui/icons-material/Translate";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";

interface TranslationResult {
  original: string;
  translated: string;
  sourceLang: string;
  targetLang: string;
  engine: "libretranslate" | "fallback" | "cache";
}

interface SupportedLang {
  code: string;
  name: string;
}

const FALLBACK_LANGUAGES: SupportedLang[] = [
  { code: "en", name: "English" }, { code: "hi", name: "Hindi" },
  { code: "ur", name: "Urdu" }, { code: "ar", name: "Arabic" },
  { code: "es", name: "Spanish" }, { code: "fr", name: "French" },
  { code: "de", name: "German" }, { code: "pt", name: "Portuguese" },
  { code: "ja", name: "Japanese" }, { code: "zh", name: "Chinese" },
  { code: "ko", name: "Korean" }, { code: "bn", name: "Bengali" },
  { code: "it", name: "Italian" }, { code: "ru", name: "Russian" },
  { code: "tr", name: "Turkish" }, { code: "vi", name: "Vietnamese" },
  { code: "id", name: "Indonesian" }, { code: "nl", name: "Dutch" },
  { code: "pl", name: "Polish" }, { code: "sv", name: "Swedish" },
];

function TranslatePage() {
  const [text, setText] = useState("");
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("hi");
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [languages, setLanguages] = useState<SupportedLang[]>(FALLBACK_LANGUAGES);

  const [batchTexts, setBatchTexts] = useState("");
  const [batchResults, setBatchResults] = useState<TranslationResult[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"single" | "batch">("single");

  useEffect(() => {
    authenticatedFetch("/api/translate/languages")
      .then((r) => r.json())
      .then((d) => {
        if (d.data && Array.isArray(d.data)) {
          setLanguages(
            d.data.map((l: Record<string, unknown>) => ({ code: String(l.code || l), name: String(l.name || l) }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const handleTranslate = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await authenticatedFetch("/api/translate/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLang, sourceLang }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setResult(data.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Translation failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchTranslate = async () => {
    const lines = batchTexts.split("\n").filter((l) => l.trim());
    if (lines.length === 0) return;
    setBatchLoading(true);
    setError(null);
    setBatchResults([]);
    try {
      const res = await authenticatedFetch("/api/translate/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: lines, targetLang, sourceLang }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setBatchResults(data.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Batch translation failed";
      setError(message);
    } finally {
      setBatchLoading(false);
    }
  };

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    if (result) setText(result.translated);
  };

  const copyToClipboard = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <TranslateIcon sx={{ fontSize: 36, color: "#6366f1" }} />
        <Box>
          <Typography variant="h4" fontWeight={700}>Translation Engine</Typography>
          <Typography variant="body2" color="text.secondary">
            Translate scripts, captions, and subtitles into 20+ languages
          </Typography>
        </Box>
        <Chip label="Engine #25" size="small" sx={{ ml: "auto", bgcolor: "#6366f1", color: "white" }} />
      </Box>

      {/* Language Selection */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: "#1e293b" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
          <FormControl fullWidth size="small">
            <InputLabel>From Language</InputLabel>
            <Select value={sourceLang} label="From Language" onChange={(e) => setSourceLang(e.target.value)}>
              {languages.map((l) => (
                <MenuItem key={l.code} value={l.code}>{l.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Tooltip title="Swap languages">
            <IconButton onClick={swapLanguages} sx={{ color: "#6366f1", flexShrink: 0 }}>
              <SwapHorizIcon />
            </IconButton>
          </Tooltip>

          <FormControl fullWidth size="small">
            <InputLabel>To Language</InputLabel>
            <Select value={targetLang} label="To Language" onChange={(e) => setTargetLang(e.target.value)}>
              {languages.map((l) => (
                <MenuItem key={l.code} value={l.code}>{l.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Mode Tabs */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button
          variant={activeTab === "single" ? "contained" : "outlined"}
          onClick={() => setActiveTab("single")} size="small"
        >
          Single Text
        </Button>
        <Button
          variant={activeTab === "batch" ? "contained" : "outlined"}
          onClick={() => setActiveTab("batch")} size="small"
        >
          Batch (Multiple Lines)
        </Button>
      </Stack>

      {activeTab === "single" && (
        <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
          {/* Input */}
          <Paper sx={{ flex: 1, p: 3, bgcolor: "#1e293b" }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Source Text
            </Typography>
            <TextField
              fullWidth multiline rows={6}
              placeholder="Enter text, script, or captions to translate..."
              value={text} onChange={(e) => setText(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained" fullWidth
              onClick={handleTranslate}
              disabled={loading || !text.trim()}
              startIcon={loading ? <CircularProgress size={16} /> : <TranslateIcon />}
            >
              {loading ? "Translating..." : "Translate"}
            </Button>
          </Paper>

          {/* Output */}
          <Paper sx={{ flex: 1, p: 3, bgcolor: "#1e293b" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="body2" color="text.secondary">Translation</Typography>
              {result && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={result.engine}
                    size="small"
                    color={result.engine === "cache" ? "success" : result.engine === "fallback" ? "warning" : "info"}
                  />
                  <Tooltip title={copied ? "Copied!" : "Copy translation"}>
                    <IconButton size="small" onClick={() => copyToClipboard(result.translated)}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              )}
            </Box>
            <Box
              sx={{
                minHeight: 160, p: 2, bgcolor: "#0f172a", borderRadius: 1,
                border: "1px solid #334155", whiteSpace: "pre-wrap",
              }}
            >
              {result ? (
                <Typography>{result.translated}</Typography>
              ) : (
                <Typography color="text.secondary" fontStyle="italic">
                  Translation will appear here...
                </Typography>
              )}
            </Box>
          </Paper>
        </Stack>
      )}

      {activeTab === "batch" && (
        <Paper sx={{ p: 3, bgcolor: "#1e293b" }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Enter one text per line for batch translation
          </Typography>
          <TextField
            fullWidth multiline rows={8}
            placeholder={"Line 1: Hello World\nLine 2: Breaking News\nLine 3: Today's update..."}
            value={batchTexts} onChange={(e) => setBatchTexts(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained" fullWidth
            onClick={handleBatchTranslate}
            disabled={batchLoading || !batchTexts.trim()}
            startIcon={batchLoading ? <CircularProgress size={16} /> : <TranslateIcon />}
          >
            {batchLoading ? "Translating batch..." : `Translate ${batchTexts.split("\n").filter((l) => l.trim()).length} Lines`}
          </Button>

          {batchResults.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 2, color: "#f59e0b" }}>
                Batch Results ({batchResults.length} translations)
              </Typography>
              <Stack spacing={2}>
                {batchResults.map((r, idx) => (
                  <Box key={`batch-result-${idx}`} sx={{ p: 2, bgcolor: "#0f172a", borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      [{idx + 1}] {r.sourceLang} → {r.targetLang}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, color: "#94a3b8" }}>
                      {r.original}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, color: "white" }}>
                      → {r.translated}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </Paper>
      )}

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </Container>
  );
}

export default TranslatePage;
