import { authenticatedFetch } from "../services/authenticatedFetch";
import React, { useState } from "react";
import {
  Container,
  Paper,
  TextField,
  Button,
  Slider,
  Box,
  Typography,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";

interface EditingEffect {
  technique: string;
  startTime: number;
  duration: number;
  intensity: number;
  easing: string;
}

interface EditingPlan {
  effects: EditingEffect[];
  transitionCount: number;
  averageEffectDuration: number;
  energyLevel: number;
}

function EditingPage() {
  const [duration, setDuration] = useState(30);
  const [intensity, setIntensity] = useState(3);
  const [plan, setPlan] = useState<EditingPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGeneratePlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch("/api/editing/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoDuration: duration * 1000, emotionalIntensity: intensity }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setPlan(data.plan);
    } catch (err: any) {
      setError(err?.message || "Failed to generate editing plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, color: "#6366f1" }}>
        Expert Editing Engine
      </Typography>

      <Paper sx={{ p: 3, mb: 3, bgcolor: "#1e293b" }}>
        <Box sx={{ mb: 3 }}>
          <Typography gutterBottom>
            Video Duration: <strong>{duration}s</strong>
          </Typography>
          <Slider
            value={duration}
            onChange={(_, v) => setDuration(v as number)}
            min={5}
            max={300}
            step={5}
            marks={[
              { value: 5, label: "5s" },
              { value: 60, label: "1m" },
              { value: 300, label: "5m" },
            ]}
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography gutterBottom>
            Emotional Intensity: <strong>{intensity}/5</strong>
          </Typography>
          <Slider
            value={intensity}
            onChange={(_, v) => setIntensity(v as number)}
            min={1}
            max={5}
            step={1}
            marks={[
              { value: 1, label: "Calm" },
              { value: 3, label: "Medium" },
              { value: 5, label: "Intense" },
            ]}
          />
        </Box>

        <Button variant="contained" fullWidth onClick={handleGeneratePlan} disabled={loading}>
          {loading ? "Generating Plan..." : "Generate Editing Plan"}
        </Button>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {plan && (
        <Paper sx={{ p: 3, bgcolor: "#1e293b" }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            Editing plan generated! Energy level: {plan.energyLevel.toFixed(1)}/10
          </Alert>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 1, color: "#f59e0b" }}>
              Plan Summary
            </Typography>
            <Typography>Transitions: {plan.transitionCount}</Typography>
            <Typography>Avg Effect Duration: {plan.averageEffectDuration.toFixed(0)}ms</Typography>
            <Typography>Energy Level: {plan.energyLevel.toFixed(1)}/10</Typography>
          </Box>

          <Typography variant="h6" sx={{ mb: 2, color: "#f59e0b" }}>
            Effects ({plan.effects.length} total)
          </Typography>
          <TableContainer>
            <Table sx={{ bgcolor: "#0f172a" }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "#1e293b" }}>
                  <TableCell>Technique</TableCell>
                  <TableCell align="right">Time (s)</TableCell>
                  <TableCell align="right">Duration (ms)</TableCell>
                  <TableCell align="right">Intensity</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {plan.effects.slice(0, 10).map((effect, idx) => (
                  <TableRow key={`effect-${idx}`}>
                    <TableCell>{effect.technique}</TableCell>
                    <TableCell align="right">{(effect.startTime / 1000).toFixed(2)}</TableCell>
                    <TableCell align="right">{effect.duration.toFixed(0)}</TableCell>
                    <TableCell align="right">{effect.intensity.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {plan.effects.length > 10 && (
            <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
              ... and {plan.effects.length - 10} more effects
            </Typography>
          )}
        </Paper>
      )}
    </Container>
  );
}

export default EditingPage;
