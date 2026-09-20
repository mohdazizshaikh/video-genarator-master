import { authenticatedFetch } from "../services/authenticatedFetch";
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, TextField, MenuItem,
  Select, FormControl, InputLabel, Alert, CircularProgress, Chip, Divider, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AddIcon from '@mui/icons-material/Add';

interface CostSummary {
  totalCost: number;
  byCategory: Record<string, number>;
  byDay: { date: string; cost: number }[];
  currency: string;
  periodStart: string;
  periodEnd: string;
}

const COST_CATEGORIES = ['api_pexels', 'api_pixabay', 'api_translate', 'tts', 'rendering', 'publishing', 'storage', 'other'];

const CATEGORY_COLORS: Record<string, string> = {
  api_pexels: '#10b981', api_pixabay: '#3b82f6', api_translate: '#f59e0b',
  tts: '#8b5cf6', rendering: '#ef4444', publishing: '#06b6d4', storage: '#ec4899', other: '#6b7280',
};

export const CostTracker: React.FC = () => {
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [newRecord, setNewRecord] = useState({ category: 'rendering', description: '', units: '', costPerUnit: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/costs/summary');
      const data = await res.json();
      if (data.status === 'ok') setSummary(data.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addRecord = async () => {
    await authenticatedFetch('/api/costs/record', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newRecord, units: parseFloat(newRecord.units), costPerUnit: newRecord.costPerUnit ? parseFloat(newRecord.costPerUnit) : undefined }),
    });
    setSuccess('Cost recorded successfully');
    setAddOpen(false);
    setNewRecord({ category: 'rendering', description: '', units: '', costPerUnit: '' });
    load();
    setTimeout(() => setSuccess(null), 3000);
  };

  const totalByCategory = summary?.byCategory || {};
  const maxCost = Math.max(...Object.values(totalByCategory), 0.001);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AttachMoneyIcon color="primary" sx={{ fontSize: 36 }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">Cost Tracker</Typography>
            <Typography variant="body2" color="text.secondary">Track API usage, rendering costs & resource consumption</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={load}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>Record Cost</Button>
        </Box>
      </Box>

      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {loading ? <CircularProgress /> : summary ? (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Card sx={{ textAlign: 'center', p: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                <Typography variant="h3" fontWeight="bold">${summary.totalCost.toFixed(4)}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>Total Cost (30 days)</Typography>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>{summary.currency}</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h3" fontWeight="bold" color="success.main">
                  ${(summary.totalCost * 12).toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">Projected Annual Cost</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h3" fontWeight="bold" color="info.main">
                  {summary.byDay.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">Days with Activity</Typography>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Cost by Category</Typography>
                  {COST_CATEGORIES.map((cat) => {
                    const cost = totalByCategory[cat] || 0;
                    const pct = (cost / maxCost) * 100;
                    return (
                      <Box key={cat} sx={{ mb: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: CATEGORY_COLORS[cat] }} />
                            <Typography variant="body2">{cat.replace(/_/g, ' ')}</Typography>
                          </Box>
                          <Typography variant="body2" fontWeight="bold">${cost.toFixed(4)}</Typography>
                        </Box>
                        <Box sx={{ backgroundColor: '#f1f5f9', borderRadius: 4, height: 6 }}>
                          <Box sx={{ height: 6, borderRadius: 4, width: `${pct}%`, backgroundColor: CATEGORY_COLORS[cat], transition: 'width 0.5s ease' }} />
                        </Box>
                      </Box>
                    );
                  })}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Daily Cost Log</Typography>
                  {summary.byDay.length === 0 ? (
                    <Alert severity="info">No cost data recorded yet. Start recording to see daily breakdown.</Alert>
                  ) : (
                    <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 300 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: "bold" }}>Date</TableCell>
                            <TableCell align="right">Cost (USD)</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {summary.byDay.slice().reverse().map(({ date, cost }) => (
                            <TableRow key={date}>
                              <TableCell>{date}</TableCell>
                              <TableCell align="right">${cost.toFixed(4)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>Cost Rates (per unit)</Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>All open-source tools have $0 cost. Only paid API calls are tracked.</Typography>
              <Grid container spacing={1}>
                {Object.entries({ api_translate: '$0.00002/char', tts: '$0.000015/char', rendering: '$0.001/job', storage: '$0.000023/MB', api_pexels: 'FREE', api_pixabay: 'FREE', publishing: 'FREE', other: 'custom' }).map(([k, v]) => (
                  <Grid item key={k}>
                    <Chip label={`${k.replace(/_/g, ' ')}: ${v}`} size="small" sx={{ backgroundColor: CATEGORY_COLORS[k], color: 'white' }} />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </>
      ) : (
        <Alert severity="info">Loading cost data...</Alert>
      )}

      {addOpen && (
        <Card sx={{ mt: 3, border: '2px solid #3b82f6' }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Record New Cost</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select value={newRecord.category} label="Category" onChange={(e) => setNewRecord({ ...newRecord, category: e.target.value })}>
                    {COST_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c.replace(/_/g, ' ')}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Description" value={newRecord.description} onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })} fullWidth />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Units" type="number" value={newRecord.units} onChange={(e) => setNewRecord({ ...newRecord, units: e.target.value })} fullWidth />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Cost per unit (leave blank for default)" type="number" value={newRecord.costPerUnit} onChange={(e) => setNewRecord({ ...newRecord, costPerUnit: e.target.value })} fullWidth />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button variant="contained" onClick={addRecord} disabled={!newRecord.description || !newRecord.units}>Record</Button>
                  <Button onClick={() => setAddOpen(false)}>Cancel</Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default CostTracker;
