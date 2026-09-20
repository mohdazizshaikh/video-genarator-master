import { authenticatedFetch } from "../services/authenticatedFetch";
import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import ScheduleIcon from "@mui/icons-material/Schedule";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import HistoryIcon from "@mui/icons-material/History";

interface AIScores {
  emotionalScore: number;
  qualityScore: number;
  attentionScore: number;
  engagementScore: number;
  overallScore: number;
}

interface Variation {
  id: string;
  rank: number;
  hook: string;
  caption: string;
  hashtags: string[];
  aiScores: AIScores;
  emotionalDirectives: {
    primaryEmotion: string;
    musicGenre: string;
    colorPalette: string[];
    pacing: string;
    scriptModifications: string[];
  };
  thumbnailDirectives: {
    boldTextSize: number;
    contrastRatio: number;
    colorScheme: string[];
    emotionalElement: string;
    curiosityGapPosition: string;
  };
  watermarkFilter: string;
}

interface PipelineJob {
  id: string;
  topic: string;
  platform: string;
  tone: string;
  bulkCount: number;
  autoSchedule: boolean;
  status: string;
  currentStep: string;
  totalVariations: number;
  scheduleIds: string[];
  durationMs?: number;
  createdAt: string;
}

interface PipelineResult {
  job: PipelineJob;
  topVariations: Variation[];
  allVariations: Variation[];
}

interface Stats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalVariations: number;
  avgScore: number;
}

const PLATFORMS = [
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram Reels" },
  { value: "youtube", label: "YouTube" },
  { value: "youtube_shorts", label: "YouTube Shorts" },
  { value: "linkedin", label: "LinkedIn" },
];

const TONES = [
  { value: "excited", label: "Excited 🚀" },
  { value: "calm", label: "Calm ✨" },
  { value: "urgent", label: "Urgent ⚠️" },
  { value: "informative", label: "Informative 📌" },
  { value: "humorous", label: "Humorous 😄" },
];

const STEPS = [
  "Generating hooks",
  "Humanizing content",
  "Scoring emotional resonance",
  "Analyzing quality",
  "Optimizing attention",
  "Predicting engagement",
  "Creating thumbnail directives",
  "Applying watermark",
  "Building captions & hashtags",
  "Ranking variations",
  "Done!",
];

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="caption" fontWeight="bold" sx={{ color }}>{value}</Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={value}
        sx={{ height: 6, borderRadius: 3, bgcolor: "rgba(255,255,255,0.08)", "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 3 } }}
      />
    </Box>
  );
}

function VariationCard({ variation, isTop }: { variation: Variation; isTop: boolean }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const scoreColor = variation.aiScores.overallScore >= 80 ? "#22c55e" :
    variation.aiScores.overallScore >= 65 ? "#f59e0b" : "#ef4444";

  return (
    <Card sx={{
      bgcolor: "#1e293b",
      border: isTop ? "2px solid rgba(99,102,241,0.6)" : "1px solid rgba(255,255,255,0.08)",
      position: "relative",
      overflow: "visible",
    }}>
      {isTop && variation.rank === 1 && (
        <Box sx={{ position: "absolute", top: -12, left: 16 }}>
          <Chip icon={<EmojiEventsIcon />} label="Best Variation" size="small"
            sx={{ bgcolor: "#f59e0b", color: "#000", fontWeight: 700, fontSize: "0.7rem" }} />
        </Box>
      )}
      <CardContent sx={{ pt: isTop && variation.rank === 1 ? 3 : 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="subtitle2" color="rgba(255,255,255,0.5)">
            Variation #{variation.rank}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 48, height: 48, borderRadius: "50%", bgcolor: "rgba(0,0,0,0.3)", border: `3px solid ${scoreColor}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Typography variant="caption" fontWeight="bold" sx={{ color: scoreColor, fontSize: "0.75rem" }}>
                {variation.aiScores.overallScore}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Stack spacing={1}>
            <ScoreBar label="Emotional" value={variation.aiScores.emotionalScore} color="#a78bfa" />
            <ScoreBar label="Quality" value={variation.aiScores.qualityScore} color="#60a5fa" />
            <ScoreBar label="Attention" value={variation.aiScores.attentionScore} color="#34d399" />
            <ScoreBar label="Engagement" value={variation.aiScores.engagementScore} color="#fbbf24" />
          </Stack>
        </Box>

        <Divider sx={{ my: 1.5, borderColor: "rgba(255,255,255,0.08)" }} />

        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
            <Typography variant="caption" color="rgba(255,255,255,0.4)">HOOK</Typography>
            <Tooltip title={copied === "hook" ? "Copied!" : "Copy"}>
              <Button size="small" onClick={() => copy(variation.hook, "hook")} sx={{ minWidth: 0, p: 0.5 }}>
                <ContentCopyIcon sx={{ fontSize: 14, color: copied === "hook" ? "#22c55e" : "rgba(255,255,255,0.3)" }} />
              </Button>
            </Tooltip>
          </Box>
          <Typography variant="body2" sx={{ color: "#e2e8f0", fontStyle: "italic", lineHeight: 1.5 }}>
            "{variation.hook}"
          </Typography>
        </Box>

        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
            <Typography variant="caption" color="rgba(255,255,255,0.4)">CAPTION</Typography>
            <Tooltip title={copied === "caption" ? "Copied!" : "Copy"}>
              <Button size="small" onClick={() => copy(variation.caption, "caption")} sx={{ minWidth: 0, p: 0.5 }}>
                <ContentCopyIcon sx={{ fontSize: 14, color: copied === "caption" ? "#22c55e" : "rgba(255,255,255,0.3)" }} />
              </Button>
            </Tooltip>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8rem", lineHeight: 1.6, whiteSpace: "pre-line" }}>
            {variation.caption}
          </Typography>
        </Box>

        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
            <Typography variant="caption" color="rgba(255,255,255,0.4)">HASHTAGS</Typography>
            <Tooltip title={copied === "hashtags" ? "Copied!" : "Copy"}>
              <Button size="small" onClick={() => copy(variation.hashtags.join(" "), "hashtags")} sx={{ minWidth: 0, p: 0.5 }}>
                <ContentCopyIcon sx={{ fontSize: 14, color: copied === "hashtags" ? "#22c55e" : "rgba(255,255,255,0.3)" }} />
              </Button>
            </Tooltip>
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {variation.hashtags.slice(0, 8).map((tag) => (
              <Chip key={tag} label={tag} size="small" sx={{ height: 20, fontSize: "0.65rem", bgcolor: "rgba(99,102,241,0.15)", color: "#a5b4fc" }} />
            ))}
            {variation.hashtags.length > 8 && (
              <Chip label={`+${variation.hashtags.length - 8} more`} size="small" sx={{ height: 20, fontSize: "0.65rem", bgcolor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }} />
            )}
          </Box>
        </Box>

        {variation.emotionalDirectives && (
          <Box>
            <Typography variant="caption" color="rgba(255,255,255,0.4)">EMOTIONAL PROFILE</Typography>
            <Box sx={{ display: "flex", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
              <Chip label={variation.emotionalDirectives.primaryEmotion} size="small" sx={{ height: 18, fontSize: "0.65rem", bgcolor: "rgba(167,139,250,0.15)", color: "#a78bfa" }} />
              <Chip label={variation.emotionalDirectives.musicGenre} size="small" sx={{ height: 18, fontSize: "0.65rem", bgcolor: "rgba(52,211,153,0.15)", color: "#34d399" }} />
              <Chip label={`${variation.emotionalDirectives.pacing} pace`} size="small" sx={{ height: 18, fontSize: "0.65rem", bgcolor: "rgba(251,191,36,0.15)", color: "#fbbf24" }} />
              {variation.emotionalDirectives.colorPalette?.slice(0, 3).map((color) => (
                <Box key={color} sx={{ width: 18, height: 18, borderRadius: "50%", bgcolor: color, border: "1px solid rgba(255,255,255,0.2)" }} />
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function JobHistoryTable({ jobs }: { jobs: PipelineJob[] }) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>Topic</TableCell>
          <TableCell sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>Platform</TableCell>
          <TableCell sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>Variations</TableCell>
          <TableCell sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>Status</TableCell>
          <TableCell sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>Date</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {jobs.map((job) => (
          <TableRow key={job.id}>
            <TableCell sx={{ color: "#e2e8f0", fontSize: "0.8rem", maxWidth: 200 }}>
              <Typography noWrap variant="body2">{job.topic}</Typography>
            </TableCell>
            <TableCell>
              <Chip label={job.platform} size="small" sx={{ height: 18, fontSize: "0.65rem", bgcolor: "rgba(99,102,241,0.15)", color: "#a5b4fc" }} />
            </TableCell>
            <TableCell sx={{ color: "#e2e8f0", fontSize: "0.8rem" }}>{job.totalVariations}</TableCell>
            <TableCell>
              <Chip
                label={job.status}
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.65rem",
                  bgcolor: job.status === "completed" ? "rgba(34,197,94,0.15)" : job.status === "failed" ? "rgba(239,68,68,0.15)" : "rgba(251,191,36,0.15)",
                  color: job.status === "completed" ? "#22c55e" : job.status === "failed" ? "#ef4444" : "#fbbf24",
                }}
              />
            </TableCell>
            <TableCell sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>
              {new Date(job.createdAt).toLocaleDateString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function AutoModePage() {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("tiktok");
  const [tone, setTone] = useState("excited");
  const [bulkCount, setBulkCount] = useState(1);
  const [autoSchedule, setAutoSchedule] = useState(false);

  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<PipelineJob[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  useEffect(() => {
    authenticatedFetch("/api/pipeline/stats")
      .then((r) => r.json())
      .then((d) => { if (d.stats) setStats(d.stats); })
      .catch(() => {});

    authenticatedFetch("/api/pipeline/jobs?limit=10")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) { setHistory(d.data); setHistoryLoaded(true); }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (loading) {
      setStepIndex(0);
      interval = setInterval(() => {
        setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 2));
      }, 400);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [loading]);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await authenticatedFetch("/api/pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), platform, tone, bulkCount, autoSchedule }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Pipeline failed");
      setResult(data);
      setStepIndex(STEPS.length - 1);

      authenticatedFetch("/api/pipeline/stats").then((r) => r.json()).then((d) => { if (d.stats) setStats(d.stats); }).catch(() => {});
      authenticatedFetch("/api/pipeline/jobs?limit=10").then((r) => r.json()).then((d) => { if (d.data) setHistory(d.data); }).catch(() => {});
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Pipeline failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
          <Box sx={{ p: 1, borderRadius: 2, background: "linear-gradient(135deg, #6366f1, #f59e0b)", display: "flex" }}>
            <AutoAwesomeIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight="bold" sx={{ background: "linear-gradient(135deg, #6366f1, #f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Auto Mode — AI Content Pipeline
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Give a topic. Get hooks, captions, hashtags, and AI scores — all in one click.
            </Typography>
          </Box>
        </Box>

        {stats && (
          <Box sx={{ display: "flex", gap: 2, mt: 2, flexWrap: "wrap" }}>
            {[
              { label: "Total Jobs", value: stats.totalJobs, color: "#6366f1" },
              { label: "Completed", value: stats.completedJobs, color: "#22c55e" },
              { label: "Variations Generated", value: stats.totalVariations, color: "#f59e0b" },
              { label: "Avg AI Score", value: `${stats.avgScore}`, color: "#a78bfa" },
            ].map(({ label, value, color }) => (
              <Paper key={label} sx={{ px: 2, py: 1, bgcolor: "#1e293b", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ color }}>{value}</Typography>
              </Paper>
            ))}
          </Box>
        )}
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, bgcolor: "#1e293b", border: "1px solid rgba(99,102,241,0.3)", position: "sticky", top: 80 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 3, color: "#6366f1" }}>
              Pipeline Configuration
            </Typography>

            <Stack spacing={2.5}>
              <TextField
                label="Topic"
                placeholder="e.g. productivity hacks, crypto investing, fitness tips..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                fullWidth
                multiline
                rows={2}
                onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handleGenerate(); }}
                helperText="Ctrl+Enter to generate"
                sx={{ "& .MuiOutlinedInput-root": { bgcolor: "rgba(255,255,255,0.03)" } }}
              />

              <FormControl fullWidth>
                <InputLabel>Platform</InputLabel>
                <Select value={platform} label="Platform" onChange={(e) => setPlatform(e.target.value)}>
                  {PLATFORMS.map(({ value, label }) => (
                    <MenuItem key={value} value={value}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Tone</InputLabel>
                <Select value={tone} label="Tone" onChange={(e) => setTone(e.target.value)}>
                  {TONES.map(({ value, label }) => (
                    <MenuItem key={value} value={value}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Variations to Generate</Typography>
                  <Chip label={bulkCount === 1 ? "1 variation" : `${bulkCount} variations`} size="small"
                    sx={{ bgcolor: "rgba(99,102,241,0.2)", color: "#a5b4fc" }} />
                </Box>
                <Slider
                  value={bulkCount}
                  onChange={(_, v) => setBulkCount(v as number)}
                  min={1} max={30} step={1}
                  marks={[{ value: 1, label: "1" }, { value: 10, label: "10" }, { value: 20, label: "20" }, { value: 30, label: "30" }]}
                  sx={{ color: "#6366f1" }}
                />
              </Box>

              <Box sx={{ p: 1.5, borderRadius: 2, border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", bgcolor: autoSchedule ? "rgba(99,102,241,0.1)" : "transparent" }}
                onClick={() => setAutoSchedule(!autoSchedule)}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <ScheduleIcon sx={{ color: autoSchedule ? "#6366f1" : "rgba(255,255,255,0.3)", fontSize: 20 }} />
                  <Box>
                    <Typography variant="body2" color={autoSchedule ? "white" : "text.secondary"}>Auto-Schedule Top 3</Typography>
                    <Typography variant="caption" color="text.secondary">Posts them over next 3 days</Typography>
                  </Box>
                </Box>
                <Chip label={autoSchedule ? "ON" : "OFF"} size="small"
                  sx={{ bgcolor: autoSchedule ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.05)", color: autoSchedule ? "#22c55e" : "rgba(255,255,255,0.3)" }} />
              </Box>

              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={handleGenerate}
                disabled={loading || !topic.trim()}
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <RocketLaunchIcon />}
                sx={{
                  py: 1.5,
                  background: "linear-gradient(135deg, #6366f1, #f59e0b)",
                  fontWeight: 700,
                  fontSize: "1rem",
                  "&:disabled": { opacity: 0.6 },
                }}
              >
                {loading ? "Running Pipeline..." : "Generate Full Content"}
              </Button>
            </Stack>

            {loading && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress sx={{ mb: 1, borderRadius: 2, "& .MuiLinearProgress-bar": { bgcolor: "#6366f1" } }} />
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  {STEPS.map((step, idx) => (
                    <Box key={step} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {idx < stepIndex ? (
                        <CheckCircleIcon sx={{ fontSize: 14, color: "#22c55e" }} />
                      ) : idx === stepIndex ? (
                        <CircularProgress size={12} sx={{ color: "#6366f1" }} />
                      ) : (
                        <Box sx={{ width: 14, height: 14, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.15)" }} />
                      )}
                      <Typography variant="caption" sx={{ color: idx <= stepIndex ? (idx < stepIndex ? "#22c55e" : "white") : "rgba(255,255,255,0.3)", fontSize: "0.72rem" }}>
                        {step}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
          )}

          {result && (
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
                <CheckCircleIcon sx={{ color: "#22c55e" }} />
                <Typography variant="h6" fontWeight="bold" color="#22c55e">
                  Pipeline Complete — {result.allVariations.length} variations generated
                </Typography>
                {result.job.durationMs && (
                  <Chip label={`${result.job.durationMs}ms`} size="small" sx={{ bgcolor: "rgba(34,197,94,0.1)", color: "#22c55e" }} />
                )}
                {result.job.scheduleIds?.length > 0 && (
                  <Chip icon={<ScheduleIcon />} label={`${result.job.scheduleIds.length} scheduled`} size="small"
                    sx={{ bgcolor: "rgba(99,102,241,0.15)", color: "#a5b4fc" }} />
                )}
              </Box>

              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <EmojiEventsIcon sx={{ color: "#f59e0b" }} />
                  <Typography variant="subtitle1" fontWeight="bold">Top 3 Variations (AI-Ranked)</Typography>
                </Box>
                <Grid container spacing={2}>
                  {result.topVariations.map((v) => (
                    <Grid item xs={12} key={v.id}>
                      <VariationCard variation={v} isTop={true} />
                    </Grid>
                  ))}
                </Grid>
              </Box>

              {result.allVariations.length > 3 && (
                <Accordion sx={{ bgcolor: "#1e293b", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <TrendingUpIcon sx={{ fontSize: 18, color: "#6366f1" }} />
                      <Typography variant="body2" fontWeight={600}>
                        All {result.allVariations.length} Variations
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      {result.allVariations.slice(3).map((v) => (
                        <Grid item xs={12} sm={6} key={v.id}>
                          <VariationCard variation={v} isTop={false} />
                        </Grid>
                      ))}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              )}
            </Box>
          )}

          {!result && !loading && (
            <Box sx={{ textAlign: "center", py: 8, color: "rgba(255,255,255,0.3)" }}>
              <AutoAwesomeIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
              <Typography variant="h6" color="rgba(255,255,255,0.3)">Enter a topic and click Generate</Typography>
              <Typography variant="body2" color="rgba(255,255,255,0.2)" sx={{ mt: 1 }}>
                The pipeline will run all 10 AI engines and return ranked, ready-to-post content
              </Typography>
            </Box>
          )}

          {historyLoaded && history.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <HistoryIcon sx={{ color: "rgba(255,255,255,0.4)", fontSize: 18 }} />
                <Typography variant="subtitle2" color="rgba(255,255,255,0.5)">Recent Pipeline Jobs</Typography>
              </Box>
              <Paper sx={{ bgcolor: "#1e293b", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <JobHistoryTable jobs={history} />
              </Paper>
            </Box>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}
