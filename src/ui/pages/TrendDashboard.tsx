import { authenticatedFetch } from "../services/authenticatedFetch";
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Button, CircularProgress,
  Alert, Tabs, Tab, LinearProgress, Divider, Badge, Tooltip
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RadarIcon from '@mui/icons-material/Radar';
import RefreshIcon from '@mui/icons-material/Refresh';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import WarningIcon from '@mui/icons-material/Warning';

interface TrendTopic {
  title: string;
  category: string;
  source: string;
  trendScore: number;
  viralScore: number;
  keywords: string[];
  fetchedAt: string;
  link?: string;
}

interface ViralAlert {
  id: string;
  title: string;
  category: string;
  source: string;
  priority: 'critical' | 'high' | 'medium';
  risingScore: number;
  saturationScore: number;
  action: string;
  detectedAt: string;
  keywords: string[];
  bypassQueue: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  Technology: '#3b82f6', Business: '#f59e0b', Politics: '#ef4444',
  Sports: '#10b981', Science: '#8b5cf6', Health: '#06b6d4',
  Entertainment: '#ec4899', General: '#6366f1', Social: '#f97316', News: '#dc2626',
};

const ScoreBar: React.FC<{ score: number; label: string; color: string }> = ({ score, label, color }) => (
  <Box sx={{ mb: 1 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="caption" fontWeight="bold">{score}</Typography>
    </Box>
    <LinearProgress variant="determinate" value={score} sx={{ height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { backgroundColor: color } }} />
  </Box>
);

export const TrendDashboard: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [trends, setTrends] = useState<TrendTopic[]>([]);
  const [alerts, setAlerts] = useState<ViralAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [radarLoading, setRadarLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [criticalCount, setCriticalCount] = useState(0);

  const loadTrends = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch('/api/trends');
      const data = await res.json();
      if (data.status === 'ok') {
        setTrends(data.data.topics || []);
        setFetchedAt(data.data.fetchedAt);
      }
    } catch { setError('Failed to load trends'); }
    setLoading(false);
  }, []);

  const loadRadar = useCallback(async () => {
    setRadarLoading(true);
    try {
      const res = await authenticatedFetch('/api/trends/viral-radar');
      const data = await res.json();
      if (data.status === 'ok') {
        setAlerts(data.data.alerts || []);
        setCriticalCount(data.data.criticalCount || 0);
      }
    } catch { /* ignore */ }
    setRadarLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await authenticatedFetch('/api/trends/refresh', { method: 'POST' });
      await loadTrends();
      await loadRadar();
    } catch { setError('Refresh failed'); }
    setLoading(false);
  }, [loadTrends, loadRadar]);

  useEffect(() => {
    loadTrends();
    loadRadar();
  }, [loadTrends, loadRadar]);

  const priorityColor = (p: string) => p === 'critical' ? 'error' : p === 'high' ? 'warning' : 'default';

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TrendingUpIcon color="primary" sx={{ fontSize: 36 }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">Trend Dashboard</Typography>
            <Typography variant="body2" color="text.secondary">
              Real-time trends from Google, Reddit, HackerNews & YouTube
              {fetchedAt && ` · Updated ${new Date(fetchedAt).toLocaleTimeString()}`}
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<RefreshIcon />} onClick={refresh} disabled={loading}>
          Refresh Trends
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={`All Trends (${trends.length})`} icon={<TrendingUpIcon />} iconPosition="start" />
        <Tab label={
          <Badge badgeContent={criticalCount} color="error">
            <Box sx={{ pr: 1 }}>Viral Radar</Box>
          </Badge>
        } icon={<RadarIcon />} iconPosition="start" />
      </Tabs>

      {tab === 0 && (
        <>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={2}>
              {trends.map((topic, i) => (
                <Grid item xs={12} sm={6} md={4} key={i}>
                  <Card sx={{ height: '100%', border: topic.trendScore >= 80 ? '2px solid #f59e0b' : '1px solid #e5e7eb' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Chip
                          label={topic.category}
                          size="small"
                          sx={{ backgroundColor: CATEGORY_COLORS[topic.category] || '#6366f1', color: 'white', fontWeight: 'bold' }}
                        />
                        {topic.trendScore >= 80 && <FlashOnIcon sx={{ color: '#f59e0b' }} />}
                      </Box>
                      <Typography variant="body1" fontWeight="bold" sx={{ mb: 1, lineHeight: 1.4 }}>
                        {topic.link ? <a href={topic.link} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{topic.title}</a> : topic.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                        📡 {topic.source}
                      </Typography>
                      <ScoreBar score={topic.trendScore} label="Trend Score" color="#3b82f6" />
                      <ScoreBar score={topic.viralScore} label="Viral Score" color="#ec4899" />
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                        {topic.keywords.slice(0, 4).map((kw) => (
                          <Chip key={kw} label={kw} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
              {trends.length === 0 && !loading && (
                <Grid item xs={12}><Alert severity="info">No trends loaded yet. Click "Refresh Trends" to fetch.</Alert></Grid>
              )}
            </Grid>
          )}
        </>
      )}

      {tab === 1 && (
        <>
          {radarLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : (
            <Grid container spacing={2}>
              {alerts.map((alert) => (
                <Grid item xs={12} sm={6} key={alert.id}>
                  <Card sx={{ border: `2px solid ${alert.priority === 'critical' ? '#ef4444' : '#f59e0b'}` }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Chip label={alert.priority.toUpperCase()} color={priorityColor(alert.priority) as any} size="small" />
                        {alert.bypassQueue && (
                          <Tooltip title="Bypass normal queue — generate immediately!">
                            <Chip label="⚡ BYPASS QUEUE" color="error" size="small" />
                          </Tooltip>
                        )}
                      </Box>
                      <Typography variant="body1" fontWeight="bold" sx={{ mb: 1 }}>{alert.title}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                        📡 {alert.source} · 🏷️ {alert.category}
                      </Typography>
                      <ScoreBar score={alert.risingScore} label="Rising Score" color="#ef4444" />
                      <ScoreBar score={100 - alert.saturationScore} label="Opportunity" color="#10b981" />
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {alert.action === 'generate_now' && <WarningIcon color="error" fontSize="small" />}
                        <Typography variant="caption" fontWeight="bold" color={alert.action === 'generate_now' ? 'error.main' : 'text.secondary'}>
                          Action: {alert.action.replace(/_/g, ' ').toUpperCase()}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
              {alerts.length === 0 && (
                <Grid item xs={12}><Alert severity="info">No viral alerts detected. Radar scans every refresh cycle.</Alert></Grid>
              )}
            </Grid>
          )}
        </>
      )}
    </Box>
  );
};

export default TrendDashboard;
