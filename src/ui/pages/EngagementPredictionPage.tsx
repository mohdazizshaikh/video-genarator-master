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

interface EngagementPrediction {
  expectedViews: number;
  expectedLikes: number;
  expectedComments: number;
  expectedShares: number;
  expectedEngagementRate: number;
  viralScore: number;
  peakTime: string;
  targetAudience: string;
}

function EngagementPredictionPage() {
  const [views, setViews] = useState(1000);
  const [hookQuality, setHookQuality] = useState<"low" | "medium" | "high">("medium");
  const [topicTrend, setTopicTrend] = useState<"low" | "medium" | "high">("medium");
  const [postingTime, setPostingTime] = useState<"low" | "medium" | "high">("medium");
  const [prediction, setPrediction] = useState<EngagementPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch("/api/engagement/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ views, hookQuality, topicTrend, postingTime }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setPrediction(data.prediction);
    } catch (err: any) {
      setError(err?.message || "Failed to predict engagement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, color: "#6366f1" }}>
        Engagement Prediction Engine
      </Typography>

      <Paper sx={{ p: 3, mb: 3, bgcolor: "#1e293b" }}>
        <TextField
          type="number"
          fullWidth
          label="Initial View Count"
          value={views}
          onChange={(e) => setViews(Number(e.target.value))}
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 2, mb: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Hook Quality</InputLabel>
            <Select value={hookQuality} label="Hook Quality" onChange={(e) => setHookQuality(e.target.value as any)}>
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Topic Trend</InputLabel>
            <Select value={topicTrend} label="Topic Trend" onChange={(e) => setTopicTrend(e.target.value as any)}>
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Posting Time</InputLabel>
            <Select value={postingTime} label="Posting Time" onChange={(e) => setPostingTime(e.target.value as any)}>
              <MenuItem value="low">Low Traffic</MenuItem>
              <MenuItem value="medium">Medium Traffic</MenuItem>
              <MenuItem value="high">Peak Hours</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Button variant="contained" fullWidth onClick={handlePredict} disabled={loading}>
          {loading ? "Predicting..." : "Predict Engagement"}
        </Button>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {prediction && (
        <Paper sx={{ p: 3, bgcolor: "#1e293b" }}>
          <Alert severity="success" sx={{ mb: 3 }}>
            Viral Score: <strong>{prediction.viralScore.toFixed(1)}/100</strong> · Peak Time:{" "}
            <strong>{prediction.peakTime}</strong>
          </Alert>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 3 }}>
            {[
              { label: "Expected Views", value: prediction.expectedViews, color: "#6366f1" },
              { label: "Expected Likes", value: prediction.expectedLikes, color: "#f59e0b" },
              { label: "Expected Comments", value: prediction.expectedComments, color: "#22c55e" },
              { label: "Expected Shares", value: prediction.expectedShares, color: "#ef4444" },
            ].map((item) => (
              <Box
                key={`pred-${item.label}`}
                sx={{
                  flex: 1,
                  p: 2,
                  bgcolor: "#0f172a",
                  borderRadius: 1,
                  borderLeft: `4px solid ${item.color}`,
                }}
              >
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {item.label}
                </Typography>
                <Typography variant="h6" sx={{ color: item.color }}>
                  {item.value.toLocaleString()}
                </Typography>
              </Box>
            ))}
          </Stack>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
            <Box>
              <Typography variant="body2" sx={{ mb: 1, color: "#f59e0b" }}>
                <strong>Engagement Rate:</strong> {(prediction.expectedEngagementRate * 100).toFixed(2)}%
              </Typography>
              <Typography variant="body2">
                <strong>Target Audience:</strong> {prediction.targetAudience}
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}
    </Container>
  );
}

export default EngagementPredictionPage;
