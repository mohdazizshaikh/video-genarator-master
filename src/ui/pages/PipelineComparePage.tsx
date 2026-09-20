import { authenticatedFetch } from "../services/authenticatedFetch";
import React, { useState, useRef, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import HistoryIcon from "@mui/icons-material/History";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import SyncIcon from "@mui/icons-material/Sync";

interface AIScores {
  emotionalScore: number;
  qualityScore: number;
  attentionScore: number;
  engagementScore: number;
  overallScore: number;
}

interface PlatformEntry {
  platform: string;
  status: "pending" | "running" | "done" | "failed";
  jobId?: string;
  bestScore?: number;
  scores?: AIScores;
  bestHook?: string;
  bestCaption?: string;
  bestHashtags?: string[];
  emotionalTone?: string;
  musicGenre?: string;
  colorPalette?: string[];
  pacing?: string;
  estimatedViralScore?: number;
  durationMs?: number;
  error?: string;
}

interface ComparisonRun {
  id: string;
  topic: string;
  tone: string;
  platforms: string[];
  status: "running" | "completed" | "partial";
  winner?: string;
  entries: PlatformEntry[];
  createdAt: string;
  updatedAt: string;
}

const ALL_PLATFORMS = [
  { value: "tiktok", label: "TikTok", color: "#69C9D0", emoji: "🎵" },
  { value: "instagram", label: "Instagram", color: "#E1306C", emoji: "📸" },
  { value: "youtube", label: "YouTube", color: "#FF0000", emoji: "▶️" },
  { value: "youtube_shorts", label: "YT Shorts", color: "#FF4444", emoji: "⚡" },
  { value: "linkedin", label: "LinkedIn", color: "#0077B5", emoji: "💼" },
];

const TONES = [
  { value: "excited", label: "Excited 🚀" },
  { value: "calm", label: "Calm ✨" },
  { value: "urgent", label: "Urgent ⚠️" },
  { value: "informative", label: "Informative 📌" },
  { value: "humorous", label: "Humorous 😄" },
];

const SCORE_DIMS: { key: keyof AIScores; label: string; color: string }[] = [
  { key: "emotionalScore", label: "Emotional", color: "#a78bfa" },
  { key: "qualityScore", label: "Quality", color: "#60a5fa" },
  { key: "attentionScore", label: "Attention", color: "#34d399" },
  { key: "engagementScore", label: "Engagement", color: "#fbbf24" },
];

function getMeta(p: string) {
  return ALL_PLATFORMS.find((x) => x.value === p) ?? { value: p, label: p, color: "#6366f1", emoji: "🌐" };
}

function ScoreBar({ label, value, color, animate }: { label: string; value: number; color: string; animate: boolean }) {
  const [displayed, setDisplayed] = useState(animate ? 0 : value);
  useEffect(() => {
    if (!animate) { setDisplayed(value); return; }
    let start = 0;
    const step = value / 30;
    const id = setInterval(() => {
      start += step;
      if (start >= value) { setDisplayed(value); clearInterval(id); }
      else setDisplayed(Math.round(start));
    }, 20);
    return () => clearInterval(id);
  }, [value, animate]);

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.4 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>{label}</Typography>
        <Typography variant="caption" fontWeight="bold" sx={{ color, fontSize: "0.7rem" }}>{displayed}</Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={displayed}
        sx={{ height: 5, borderRadius: 3, bgcolor: "rgba(255,255,255,0.07)", "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 3, transition: "none" } }}
      />
    </Box>
  );
}

function PlatformCard({ entry, isWinner, rank }: { entry: PlatformEntry; isWinner: boolean; rank: number }) {
  const meta = getMeta(entry.platform);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const scoreColor = !entry.scores ? "#6b7280" :
    entry.scores.overallScore >= 75 ? "#22c55e" :
    entry.scores.overallScore >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <Card sx={{
      bgcolor: "#1e293b",
      border: isWinner
        ? "2px solid #f59e0b"
        : entry.status === "done"
        ? "1px solid rgba(99,102,241,0.3)"
        : "1px solid rgba(255,255,255,0.07)",
      height: "100%",
      position: "relative",
      overflow: "visible",
      transition: "border 0.3s ease",
    }}>
      {isWinner && (
        <Box sx={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", zIndex: 1 }}>
          <Chip
            icon={<EmojiEventsIcon sx={{ fontSize: 14 }} />}
            label="Best Platform"
            size="small"
            sx={{ bgcolor: "#f59e0b", color: "#000", fontWeight: 700, fontSize: "0.65rem", height: 22 }}
          />
        </Box>
      )}

      <CardContent sx={{ pt: isWinner ? 3.5 : 2, pb: "12px !important" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{
              width: 32, height: 32, borderRadius: 2,
              bgcolor: `${meta.color}22`,
              border: `1px solid ${meta.color}44`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1rem",
            }}>
              {meta.emoji}
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ color: meta.color, lineHeight: 1.2 }}>
                {meta.label}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
                #{rank} rank
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {entry.status === "pending" && <HourglassEmptyIcon sx={{ fontSize: 28, color: "rgba(255,255,255,0.2)" }} />}
            {entry.status === "running" && <CircularProgress size={28} sx={{ color: meta.color }} />}
            {entry.status === "failed" && <ErrorOutlineIcon sx={{ fontSize: 28, color: "#ef4444" }} />}
            {entry.status === "done" && entry.scores && (
              <Box sx={{
                width: 44, height: 44, borderRadius: "50%",
                bgcolor: "rgba(0,0,0,0.3)",
                border: `3px solid ${scoreColor}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Typography variant="caption" fontWeight="bold" sx={{ color: scoreColor, fontSize: "0.8rem" }}>
                  {entry.scores.overallScore}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {entry.status === "pending" && (
          <Box sx={{ py: 2, textAlign: "center" }}>
            <Typography variant="caption" color="rgba(255,255,255,0.25)">Waiting...</Typography>
          </Box>
        )}

        {entry.status === "running" && (
          <Box sx={{ py: 1 }}>
            <LinearProgress sx={{ borderRadius: 2, "& .MuiLinearProgress-bar": { bgcolor: meta.color } }} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block", textAlign: "center" }}>
              Running AI engines...
            </Typography>
          </Box>
        )}

        {entry.status === "failed" && (
          <Alert severity="error" sx={{ py: 0.5, fontSize: "0.75rem" }}>{entry.error || "Failed"}</Alert>
        )}

        {entry.status === "done" && entry.scores && (
          <>
            <Stack spacing={0.8} sx={{ mb: 1.5 }}>
              {SCORE_DIMS.map(({ key, label, color }) => (
                <ScoreBar key={key} label={label} value={entry.scores![key]} color={color} animate />
              ))}
            </Stack>

            {(entry.emotionalTone || entry.musicGenre || entry.pacing) && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1.5 }}>
                {entry.emotionalTone && (
                  <Chip label={entry.emotionalTone} size="small" sx={{ height: 18, fontSize: "0.6rem", bgcolor: "rgba(167,139,250,0.15)", color: "#a78bfa" }} />
                )}
                {entry.musicGenre && (
                  <Chip label={entry.musicGenre} size="small" sx={{ height: 18, fontSize: "0.6rem", bgcolor: "rgba(52,211,153,0.15)", color: "#34d399" }} />
                )}
                {entry.pacing && (
                  <Chip label={`${entry.pacing} pace`} size="small" sx={{ height: 18, fontSize: "0.6rem", bgcolor: "rgba(251,191,36,0.15)", color: "#fbbf24" }} />
                )}
                {entry.colorPalette?.slice(0, 3).map((c) => (
                  <Box key={c} sx={{ width: 16, height: 16, borderRadius: "50%", bgcolor: c, border: "1px solid rgba(255,255,255,0.15)" }} />
                ))}
              </Box>
            )}

            <Divider sx={{ borderColor: "rgba(255,255,255,0.06)", mb: 1 }} />

            {entry.bestHook && (
              <Box sx={{ mb: 1 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.3 }}>
                  <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", letterSpacing: 1 }}>BEST HOOK</Typography>
                  <Tooltip title={copied === `hook-${entry.platform}` ? "Copied!" : "Copy"}>
                    <Button size="small" onClick={() => copy(entry.bestHook!, `hook-${entry.platform}`)} sx={{ minWidth: 0, p: 0.4 }}>
                      <ContentCopyIcon sx={{ fontSize: 12, color: copied === `hook-${entry.platform}` ? "#22c55e" : "rgba(255,255,255,0.25)" }} />
                    </Button>
                  </Tooltip>
                </Box>
                <Typography variant="body2" sx={{ color: "#e2e8f0", fontStyle: "italic", fontSize: "0.78rem", lineHeight: 1.5 }}>
                  "{entry.bestHook}"
                </Typography>
              </Box>
            )}

            {entry.bestHashtags && entry.bestHashtags.length > 0 && (
              <Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.3 }}>
                  <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", letterSpacing: 1 }}>TOP HASHTAGS</Typography>
                  <Tooltip title={copied === `tags-${entry.platform}` ? "Copied!" : "Copy"}>
                    <Button size="small" onClick={() => copy(entry.bestHashtags!.join(" "), `tags-${entry.platform}`)} sx={{ minWidth: 0, p: 0.4 }}>
                      <ContentCopyIcon sx={{ fontSize: 12, color: copied === `tags-${entry.platform}` ? "#22c55e" : "rgba(255,255,255,0.25)" }} />
                    </Button>
                  </Tooltip>
                </Box>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.4 }}>
                  {entry.bestHashtags.slice(0, 5).map((tag) => (
                    <Chip key={tag} label={tag} size="small" sx={{ height: 18, fontSize: "0.6rem", bgcolor: `${meta.color}18`, color: meta.color }} />
                  ))}
                </Box>
              </Box>
            )}

            {entry.durationMs && (
              <Typography variant="caption" sx={{ display: "block", mt: 1, color: "rgba(255,255,255,0.2)", fontSize: "0.65rem", textAlign: "right" }}>
                {entry.durationMs}ms
              </Typography>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ScoreRadar({ entries }: { entries: PlatformEntry[] }) {
  const done = entries.filter((e) => e.status === "done" && e.scores);
  if (done.length === 0) return null;

  const maxScore = 100;
  const dims = SCORE_DIMS.map((d) => d.key);

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="subtitle2" color="rgba(255,255,255,0.6)" sx={{ mb: 1.5 }}>Score Breakdown Comparison</Typography>
      <Box sx={{ overflowX: "auto" }}>
        <Box sx={{ minWidth: 400 }}>
          {SCORE_DIMS.map(({ key, label, color }) => (
            <Box key={key} sx={{ mb: 1.5 }}>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", mb: 0.5, display: "block" }}>{label}</Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {[...done].sort((a, b) => (b.scores![key] ?? 0) - (a.scores![key] ?? 0)).map((entry) => {
                  const meta = getMeta(entry.platform);
                  const val = entry.scores![key];
                  return (
                    <Box key={entry.platform} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="caption" sx={{ width: 90, fontSize: "0.7rem", color: meta.color, flexShrink: 0 }}>
                        {meta.emoji} {meta.label}
                      </Typography>
                      <Box sx={{ flex: 1, bgcolor: "rgba(255,255,255,0.05)", borderRadius: 2, height: 14, overflow: "hidden" }}>
                        <Box sx={{
                          height: "100%",
                          width: `${(val / maxScore) * 100}%`,
                          bgcolor: color,
                          borderRadius: 2,
                          transition: "width 0.8s ease",
                          display: "flex", alignItems: "center", justifyContent: "flex-end", pr: 0.5,
                        }}>
                          {val > 15 && (
                            <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "rgba(0,0,0,0.7)", fontWeight: 700 }}>{val}</Typography>
                          )}
                        </Box>
                      </Box>
                      {val <= 15 && (
                        <Typography variant="caption" sx={{ fontSize: "0.65rem", color, width: 24 }}>{val}</Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

export default function PipelineComparePage() {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("excited");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["tiktok", "instagram", "youtube", "youtube_shorts", "linkedin"]);

  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState<ComparisonRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ComparisonRun[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    authenticatedFetch("/api/pipeline/comparisons?limit=5")
      .then((r) => r.json())
      .then((d) => { if (d.data) setHistory(d.data); })
      .catch(() => {});
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const startPolling = (runId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const r = await authenticatedFetch(`/api/pipeline/comparisons/${runId}`);
        const d = await r.json();
        if (d.run) {
          setComparison(d.run);
          if (d.run.status !== "running") {
            if (pollRef.current) clearInterval(pollRef.current);
            setLoading(false);
            authenticatedFetch("/api/pipeline/comparisons?limit=5")
              .then((r2) => r2.json())
              .then((d2) => { if (d2.data) setHistory(d2.data); })
              .catch(() => {});
          }
        }
      } catch {}
    }, 600);
  };

  const handleCompare = async () => {
    if (!topic.trim() || selectedPlatforms.length < 2) return;
    setLoading(true);
    setError(null);
    setComparison(null);

    try {
      const res = await authenticatedFetch("/api/pipeline/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), tone, platforms: selectedPlatforms }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Comparison failed");
      setComparison(data.run);
      if (data.run.status === "running") {
        startPolling(data.run.id);
      } else {
        setLoading(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Comparison failed");
      setLoading(false);
    }
  };

  const sortedEntries = comparison
    ? [...comparison.entries].sort((a, b) => (b.scores?.overallScore ?? 0) - (a.scores?.overallScore ?? 0))
    : [];

  const doneCount = comparison?.entries.filter((e) => e.status === "done").length ?? 0;
  const totalCount = comparison?.entries.length ?? 0;
  const progressPct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
          <Box sx={{ p: 1, borderRadius: 2, background: "linear-gradient(135deg, #6366f1, #22c55e)", display: "flex" }}>
            <CompareArrowsIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight="bold" sx={{ background: "linear-gradient(135deg, #6366f1, #22c55e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Platform Comparison Mode
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Run the same topic across multiple platforms simultaneously — find your best channel.
            </Typography>
          </Box>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, bgcolor: "#1e293b", border: "1px solid rgba(99,102,241,0.3)", position: "sticky", top: 80 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2.5, color: "#6366f1" }}>
              Comparison Setup
            </Typography>

            <Stack spacing={2.5}>
              <TextField
                label="Topic"
                placeholder="e.g. crypto investing, morning routines..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                fullWidth
                multiline
                rows={2}
                onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handleCompare(); }}
                helperText="Ctrl+Enter to compare"
                sx={{ "& .MuiOutlinedInput-root": { bgcolor: "rgba(255,255,255,0.03)" } }}
              />

              <FormControl fullWidth>
                <InputLabel>Tone</InputLabel>
                <Select value={tone} label="Tone" onChange={(e) => setTone(e.target.value)}>
                  {TONES.map(({ value, label }) => (
                    <MenuItem key={value} value={value}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box>
                <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Platforms to compare
                  </Typography>
                  <Chip label={`${selectedPlatforms.length} selected`} size="small" sx={{ ml: 1, height: 18, fontSize: "0.65rem", bgcolor: "rgba(99,102,241,0.2)", color: "#a5b4fc" }} />
                </Box>
                <Stack spacing={0.5}>
                  {ALL_PLATFORMS.map(({ value, label, emoji, color }) => (
                    <Box
                      key={value}
                      onClick={() => togglePlatform(value)}
                      sx={{
                        display: "flex", alignItems: "center", gap: 1, p: 1, borderRadius: 2, cursor: "pointer",
                        border: selectedPlatforms.includes(value) ? `1px solid ${color}44` : "1px solid rgba(255,255,255,0.06)",
                        bgcolor: selectedPlatforms.includes(value) ? `${color}11` : "transparent",
                        transition: "all 0.15s ease",
                        "&:hover": { bgcolor: `${color}18` },
                      }}
                    >
                      <Checkbox
                        checked={selectedPlatforms.includes(value)}
                        size="small"
                        sx={{ p: 0, color: "rgba(255,255,255,0.3)", "&.Mui-checked": { color } }}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => togglePlatform(value)}
                      />
                      <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>{emoji} {label}</Typography>
                    </Box>
                  ))}
                </Stack>
                {selectedPlatforms.length < 2 && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, display: "block" }}>
                    Select at least 2 platforms
                  </Typography>
                )}
              </Box>

              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleCompare}
                disabled={loading || !topic.trim() || selectedPlatforms.length < 2}
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <CompareArrowsIcon />}
                sx={{
                  py: 1.5,
                  background: "linear-gradient(135deg, #6366f1, #22c55e)",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  "&:disabled": { opacity: 0.6 },
                }}
              >
                {loading ? "Comparing..." : "Compare Platforms"}
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={9}>
          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          {comparison && (
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                {comparison.status === "running" ? (
                  <SyncIcon sx={{ color: "#6366f1", animation: "spin 1s linear infinite", "@keyframes spin": { from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } } }} />
                ) : (
                  <CheckCircleIcon sx={{ color: "#22c55e" }} />
                )}
                <Typography variant="h6" fontWeight="bold" sx={{ color: comparison.status === "running" ? "#6366f1" : "#22c55e" }}>
                  {comparison.status === "running"
                    ? `Running — ${doneCount}/${totalCount} platforms complete`
                    : `Comparison Complete — "${comparison.topic}"`}
                </Typography>
                {comparison.winner && (
                  <Chip
                    icon={<EmojiEventsIcon sx={{ fontSize: 14 }} />}
                    label={`${getMeta(comparison.winner).emoji} ${getMeta(comparison.winner).label} wins`}
                    size="small"
                    sx={{ bgcolor: "rgba(245,158,11,0.2)", color: "#f59e0b", fontWeight: 700 }}
                  />
                )}
              </Box>

              {comparison.status === "running" && (
                <Box sx={{ mb: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={progressPct}
                    sx={{ height: 6, borderRadius: 3, bgcolor: "rgba(255,255,255,0.08)", "& .MuiLinearProgress-bar": { bgcolor: "#6366f1", borderRadius: 3 } }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                    {doneCount} of {totalCount} platforms done
                  </Typography>
                </Box>
              )}

              <Grid container spacing={2} sx={{ mb: 3 }}>
                {sortedEntries.map((entry, idx) => (
                  <Grid item xs={12} sm={6} lg={4} key={entry.platform}>
                    <PlatformCard
                      entry={entry}
                      isWinner={comparison.status !== "running" && comparison.winner === entry.platform}
                      rank={idx + 1}
                    />
                  </Grid>
                ))}
              </Grid>

              {doneCount >= 2 && (
                <Paper sx={{ p: 3, bgcolor: "#1e293b", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <ScoreRadar entries={comparison.entries} />
                </Paper>
              )}

              {comparison.status !== "running" && comparison.winner && (
                <Paper sx={{ p: 2.5, mt: 3, bgcolor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                    <EmojiEventsIcon sx={{ color: "#f59e0b", mt: 0.3 }} />
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold" color="#f59e0b">
                        Recommendation
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        For the topic <strong style={{ color: "#e2e8f0" }}>"{comparison.topic}"</strong> with a{" "}
                        <strong style={{ color: "#e2e8f0" }}>{comparison.tone}</strong> tone,{" "}
                        <strong style={{ color: getMeta(comparison.winner).color }}>
                          {getMeta(comparison.winner).emoji} {getMeta(comparison.winner).label}
                        </strong>{" "}
                        scored highest overall. Focus your content effort there first, then repurpose for other platforms.
                      </Typography>
                      {(() => {
                        const winnerEntry = comparison.entries.find((e) => e.platform === comparison.winner);
                        const runnerUp = sortedEntries.find((e) => e.platform !== comparison.winner && e.status === "done");
                        if (!winnerEntry?.scores || !runnerUp?.scores) return null;
                        const gap = winnerEntry.scores.overallScore - runnerUp.scores.overallScore;
                        return (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                            Score advantage over {getMeta(runnerUp.platform).label}: +{gap} points
                          </Typography>
                        );
                      })()}
                    </Box>
                  </Box>
                </Paper>
              )}
            </Box>
          )}

          {!comparison && !loading && (
            <Box sx={{ textAlign: "center", py: 10 }}>
              <CompareArrowsIcon sx={{ fontSize: 72, color: "rgba(255,255,255,0.1)", mb: 2 }} />
              <Typography variant="h6" color="rgba(255,255,255,0.25)">Select platforms and enter a topic</Typography>
              <Typography variant="body2" color="rgba(255,255,255,0.15)" sx={{ mt: 1 }}>
                All platforms run in parallel — results appear as each one finishes
              </Typography>
            </Box>
          )}

          {history.length > 0 && !comparison && (
            <Box sx={{ mt: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <HistoryIcon sx={{ color: "rgba(255,255,255,0.35)", fontSize: 18 }} />
                <Typography variant="subtitle2" color="rgba(255,255,255,0.4)">Recent Comparisons</Typography>
              </Box>
              <Stack spacing={1.5}>
                {history.map((run) => (
                  <Paper
                    key={run.id}
                    sx={{ p: 2, bgcolor: "#1e293b", border: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", "&:hover": { borderColor: "rgba(99,102,241,0.3)" } }}
                    onClick={() => setComparison(run)}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                      <Box>
                        <Typography variant="body2" fontWeight={600} color="#e2e8f0">"{run.topic}"</Typography>
                        <Box sx={{ display: "flex", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}>
                          {run.platforms.map((p) => {
                            const m = getMeta(p);
                            return <Chip key={p} label={`${m.emoji} ${m.label}`} size="small" sx={{ height: 18, fontSize: "0.6rem", bgcolor: `${m.color}15`, color: m.color }} />;
                          })}
                        </Box>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {run.winner && (
                          <Chip
                            icon={<EmojiEventsIcon sx={{ fontSize: 12 }} />}
                            label={`${getMeta(run.winner).emoji} won`}
                            size="small"
                            sx={{ height: 20, fontSize: "0.65rem", bgcolor: "rgba(245,158,11,0.15)", color: "#f59e0b" }}
                          />
                        )}
                        <Typography variant="caption" color="rgba(255,255,255,0.3)">{new Date(run.createdAt).toLocaleDateString()}</Typography>
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}
