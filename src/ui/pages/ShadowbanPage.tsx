import { authenticatedFetch } from "../services/authenticatedFetch";
import React, { useState, useEffect } from "react";
import {
  Container, Paper, Box, Typography, Alert, Stack, Chip,
  Grid, Card, CardContent, LinearProgress, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
} from "@mui/material";
import BlockIcon from "@mui/icons-material/Block";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RefreshIcon from "@mui/icons-material/Refresh";
import InfoIcon from "@mui/icons-material/Info";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";

interface PlatformStatus {
  platform: string;
  accountId: string;
  healthScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  isShadowbanned: boolean;
  metrics: {
    impressionRate: number;
    engagementRate: number;
    reachVsFollowers: number;
    uploadFrequency: string;
  };
  indicators: {
    name: string;
    value: number;
    status: "good" | "warning" | "critical";
  }[];
  recoverySteps: string[];
  lastChecked: string;
}

const PLATFORMS = ["youtube", "instagram", "tiktok", "twitter", "facebook", "linkedin"];

const RECOVERY_RECOMMENDATIONS: Record<string, string[]> = {
  low: [
    "Continue current posting strategy",
    "Monitor engagement rates weekly",
    "Avoid hashtag spam",
    "Keep content quality high",
  ],
  medium: [
    "Reduce posting frequency by 20%",
    "Diversify content types",
    "Engage with community via comments",
    "Review recent hashtag usage",
    "Check for policy violations",
  ],
  high: [
    "Pause all uploads for 48 hours",
    "Audit all recent content for violations",
    "Remove suspicious hashtags",
    "Stop using external tools temporarily",
    "Engage authentically with followers",
    "Contact platform support with details",
  ],
  critical: [
    "URGENT: Stop all activity immediately",
    "Review platform terms of service carefully",
    "Document all actions taken",
    "Submit formal appeal with proof of compliance",
    "Request manual review from support team",
    "Consider account recovery specialist",
  ],
};

const RISK_COLORS = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#ef4444",
  critical: "#7c2d12",
};

function ShadowbanPage() {
  const [statuses, setStatuses] = useState<PlatformStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformStatus | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch("/api/shadowban/");
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setStatuses(Array.isArray(data.data) ? data.data : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load shadowban data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const getHealthColor = (score: number) => {
    if (score >= 80) return "#22c55e";
    if (score >= 60) return "#f59e0b";
    if (score >= 40) return "#ef4444";
    return "#7c2d12";
  };

  const criticalCount = statuses.filter((s) => s.riskLevel === "critical").length;
  const avgHealth = statuses.length > 0 ? Math.round(statuses.reduce((a, b) => a + b.healthScore, 0) / statuses.length) : 0;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <BlockIcon sx={{ fontSize: 36, color: "#ef4444" }} />
        <Box>
          <Typography variant="h4" fontWeight={700}>Shadowban Detection</Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor account health across all platforms, detect issues, get recovery recommendations
          </Typography>
        </Box>
        <Chip label="Engine #36" size="small" sx={{ ml: "auto", bgcolor: "#ef4444", color: "white" }} />
        <Tooltip title="Refresh data">
          <IconButton onClick={loadData} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Overall Health Summary */}
      {statuses.length > 0 && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: "#1e293b" }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Average Health Score
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box sx={{ position: "relative", width: 80, height: 80 }}>
                    <svg style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                      <circle
                        cx="40"
                        cy="40"
                        r="35"
                        fill="none"
                        stroke="#334155"
                        strokeWidth="4"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="35"
                        fill="none"
                        stroke={getHealthColor(avgHealth)}
                        strokeWidth="4"
                        strokeDasharray={`${(avgHealth / 100) * 220} 220`}
                      />
                    </svg>
                    <Typography
                      variant="h5"
                      fontWeight={700}
                      sx={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      {avgHealth}%
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Across {statuses.length} platforms
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Risk Summary
                </Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {["low", "medium", "high", "critical"].map((risk) => {
                    const count = statuses.filter((s) => s.riskLevel === risk).length;
                    return (
                      <Box key={risk} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="caption">{risk.charAt(0).toUpperCase() + risk.slice(1)}:</Typography>
                        <Chip
                          label={count}
                          size="small"
                          sx={{
                            bgcolor: RISK_COLORS[risk as keyof typeof RISK_COLORS],
                            color: "white",
                            fontWeight: 700,
                            minWidth: 24,
                          }}
                        />
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              {criticalCount > 0 && (
                <Alert severity="error" icon={<WarningAmberIcon />} sx={{ mb: 1 }}>
                  <strong>{criticalCount} platform(s) at CRITICAL risk!</strong> Immediate action required.
                </Alert>
              )}
              {criticalCount === 0 && statuses.some((s) => s.riskLevel === "high") && (
                <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 1 }}>
                  Some accounts at HIGH risk. Review recovery steps.
                </Alert>
              )}
              {criticalCount === 0 && !statuses.some((s) => s.riskLevel === "high") && (
                <Alert severity="success" icon={<CheckCircleIcon />}>
                  All accounts are in good standing. Continue monitoring.
                </Alert>
              )}
            </Grid>
          </Grid>
        </Paper>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Platform Cards */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {statuses.length === 0 && !loading && (
        <Paper sx={{ p: 6, textAlign: "center", bgcolor: "#1e293b" }}>
          <BlockIcon sx={{ fontSize: 64, color: "#334155", mb: 2 }} />
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No shadowban data available yet. Connect accounts to start monitoring.
          </Typography>
        </Paper>
      )}

      <Grid container spacing={2}>
        {statuses.map((status) => (
          <Grid item xs={12} sm={6} md={4} key={`shadowban-${status.platform}`}>
            <Card sx={{ bgcolor: "#1e293b", border: "1px solid #334155", height: "100%" }}>
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start", mb: 1.5 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      {status.platform.toUpperCase()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Account: {status.accountId.substring(0, 12)}...
                    </Typography>
                  </Box>
                  {status.isShadowbanned ? (
                    <Chip label="BANNED" sx={{ bgcolor: "#7c2d12", color: "white" }} size="small" />
                  ) : (
                    <Chip label={status.riskLevel.toUpperCase()} size="small" sx={{ bgcolor: RISK_COLORS[status.riskLevel], color: "white" }} />
                  )}
                </Box>

                {/* Health Score */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={600}>
                      Health Score
                    </Typography>
                    <Typography variant="body2" fontWeight={700} sx={{ color: getHealthColor(status.healthScore) }}>
                      {status.healthScore}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={status.healthScore}
                    sx={{
                      backgroundColor: "#334155",
                      "& .MuiLinearProgress-bar": {
                        backgroundColor: getHealthColor(status.healthScore),
                      },
                    }}
                  />
                </Box>

                {/* Key Metrics */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 1 }}>
                    Key Metrics
                  </Typography>
                  <Stack spacing={0.5}>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="caption" color="text.secondary">
                        Impression Rate:
                      </Typography>
                      <Typography variant="caption" fontWeight={600}>
                        {(status.metrics.impressionRate * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="caption" color="text.secondary">
                        Engagement:
                      </Typography>
                      <Typography variant="caption" fontWeight={600}>
                        {(status.metrics.engagementRate * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="caption" color="text.secondary">
                        Reach/Followers:
                      </Typography>
                      <Typography variant="caption" fontWeight={600}>
                        {(status.metrics.reachVsFollowers * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                  </Stack>
                </Box>

                {/* Indicators */}
                {status.indicators.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 1 }}>
                      Risk Indicators
                    </Typography>
                    <Stack spacing={0.5}>
                      {status.indicators.slice(0, 3).map((ind, idx) => (
                        <Box
                          key={`ind-${idx}`}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            p: 0.75,
                            borderRadius: 1,
                            bgcolor: ind.status === "good" ? "#22c55e22" : ind.status === "warning" ? "#f59e0b22" : "#ef444422",
                          }}
                        >
                          <Box
                            sx={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              bgcolor: ind.status === "good" ? "#22c55e" : ind.status === "warning" ? "#f59e0b" : "#ef4444",
                            }}
                          />
                          <Typography variant="caption">{ind.name}</Typography>
                          <Typography variant="caption" fontWeight={600} sx={{ ml: "auto" }}>
                            {ind.value.toFixed(0)}%
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}

                {/* Last Checked */}
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                  Checked: {new Date(status.lastChecked).toLocaleTimeString()}
                </Typography>

                {/* Details Button */}
                <Button
                  variant="outlined" fullWidth size="small"
                  onClick={() => {
                    setSelectedPlatform(status);
                    setDialogOpen(true);
                  }}
                  startIcon={<InfoIcon />}
                >
                  Recovery Steps
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recovery Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: "#1e293b" } }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TrendingDownIcon />
          Recovery Recommendations
        </DialogTitle>
        <DialogContent>
          {selectedPlatform && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box>
                <Chip
                  label={`${selectedPlatform.platform.toUpperCase()} • Risk: ${selectedPlatform.riskLevel.toUpperCase()}`}
                  sx={{ bgcolor: RISK_COLORS[selectedPlatform.riskLevel], color: "white", mb: 2 }}
                />
              </Box>

              <Box>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: "#f59e0b" }}>
                  Recommended Actions:
                </Typography>
                <Stack spacing={1}>
                  {(selectedPlatform.recoverySteps || RECOVERY_RECOMMENDATIONS[selectedPlatform.riskLevel] || []).map(
                    (step, idx) => (
                      <Box key={`step-${idx}`} sx={{ display: "flex", gap: 1.5 }}>
                        <Box
                          sx={{
                            minWidth: 24,
                            height: 24,
                            borderRadius: "50%",
                            bgcolor: RISK_COLORS[selectedPlatform.riskLevel],
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                          }}
                        >
                          {idx + 1}
                        </Box>
                        <Typography variant="body2" sx={{ pt: 0.5 }}>
                          {step}
                        </Typography>
                      </Box>
                    )
                  )}
                </Stack>
              </Box>

              {selectedPlatform.riskLevel === "critical" && (
                <Alert severity="error" icon={<WarningAmberIcon />}>
                  This account is at critical risk and requires immediate attention.
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default ShadowbanPage;
