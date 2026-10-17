import { authenticatedFetch } from "../services/authenticatedFetch";
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Button, Alert,
  CircularProgress, LinearProgress, Tabs, Tab, TextField
} from '@mui/material';
import RecyclingIcon from '@mui/icons-material/Recycling';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import SearchIcon from '@mui/icons-material/Search';

interface RecycleCandidate {
  videoId: string;
  title: string;
  category: string;
  originalCreatedAt: string;
  ageDays: number;
  viewCount: number;
  engagementScore: number;
  recycleAction: 'repost' | 'repurpose' | 'recycle';
  recycledCount: number;
  isEvergreen: boolean;
}

interface RecycleStats { total: number; readyToRecycle: number; evergreen: number; }
interface FreshnessResult { allowed: boolean; reason?: string; waitMs?: number; }
interface DedupResult { isDuplicate: boolean; similarity: number; matchedTitle?: string; }

const ACTION_COLORS: Record<string, string> = { repost: '#10b981', repurpose: '#f59e0b', recycle: '#3b82f6' };
const ACTION_LABELS: Record<string, string> = {
  repost: '🔄 Repost (30+ days)',
  repurpose: '✂️ Repurpose (90+ days)',
  recycle: '♻️ Recycle Evergreen',
};

export const RecycleDashboard: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [candidates, setCandidates] = useState<RecycleCandidate[]>([]);
  const [stats, setStats] = useState<RecycleStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [freshnessKeyword, setFreshnessKeyword] = useState('');
  const [freshnessCategory, setFreshnessCategory] = useState('General');
  const [freshnessResult, setFreshnessResult] = useState<FreshnessResult | null>(null);
  const [dedupTitle, setDedupTitle] = useState('');
  const [dedupResult, setDedupResult] = useState<DedupResult | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([authenticatedFetch('/api/recycle/candidates'), authenticatedFetch('/api/recycle/stats')]);
      const [cData, sData] = await Promise.all([cRes.json(), sRes.json()]);
      if (cData.status === 'ok') setCandidates(cData.data);
      if (sData.status === 'ok') setStats(sData.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRecycled = async (videoId: string) => {
    await authenticatedFetch(`/api/recycle/${videoId}/recycle`, { method: 'POST' });
    setSuccess(`Video ${videoId} marked as recycled`);
    load();
    setTimeout(() => setSuccess(null), 3000);
  };

  const checkFreshness = async () => {
    const res = await authenticatedFetch('/api/recycle/freshness/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keyword: freshnessKeyword, category: freshnessCategory }) });
    const data = await res.json();
    if (data.status === 'ok') setFreshnessResult(data.data);
  };

  const checkDedupe = async () => {
    const res = await authenticatedFetch('/api/recycle/dedupe/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: dedupTitle, keywords: dedupTitle.split(' '), category: freshnessCategory }) });
    const data = await res.json();
    if (data.status === 'ok') setDedupResult(data.data);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <RecyclingIcon color="primary" sx={{ fontSize: 36 }} />
        <Box>
          <Typography variant="h4" fontWeight="bold">Content Recycle & Protection</Typography>
          <Typography variant="body2" color="text.secondary">Recycle evergreen content · freshness checks · anti-duplication</Typography>
        </Box>
      </Box>

      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[{ label: 'Total Tracked', value: stats.total, color: '#3b82f6' }, { label: 'Ready to Recycle', value: stats.readyToRecycle, color: '#f59e0b' }, { label: 'Evergreen Content', value: stats.evergreen, color: '#10b981' }].map(({ label, value, color }) => (
            <Grid item xs={12} sm={4} key={label}>
              <Card sx={{ textAlign: 'center', p: 2, borderTop: `4px solid ${color}` }}>
                <Typography variant="h3" fontWeight="bold" sx={{ color }}>{value}</Typography>
                <Typography variant="body2" color="text.secondary">{label}</Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={`Recycle Candidates (${candidates.length})`} icon={<RecyclingIcon />} iconPosition="start" />
        <Tab label="Freshness Check" />
        <Tab label="Duplicate Detector" icon={<SearchIcon />} iconPosition="start" />
      </Tabs>

      {tab === 0 && (
        loading ? <CircularProgress /> : (
          <Grid container spacing={2}>
            {candidates.length === 0 ? (
              <Grid item xs={12}><Alert severity="info">No candidates ready for recycling yet. Content appears after 30+ days.</Alert></Grid>
            ) : candidates.map((c) => (
              <Grid item xs={12} sm={6} md={4} key={c.videoId}>
                <Card sx={{ border: `2px solid ${ACTION_COLORS[c.recycleAction]}` }}>
                  <CardContent>
                    <Chip label={ACTION_LABELS[c.recycleAction]} size="small" sx={{ backgroundColor: ACTION_COLORS[c.recycleAction], color: 'white', mb: 1 }} />
                    {c.isEvergreen && <Chip label="🌿 Evergreen" size="small" sx={{ ml: 1, mb: 1 }} />}
                    <Typography variant="body1" fontWeight="bold" sx={{ mb: 1 }}>{c.title}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">{c.category} · {c.ageDays} days old · recycled {c.recycledCount}x</Typography>
                    <Box sx={{ mt: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption">Engagement</Typography>
                        <Typography variant="caption" fontWeight="bold">{c.engagementScore}</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={c.engagementScore} sx={{ height: 4, borderRadius: 2 }} />
                    </Box>
                    <Button variant="outlined" size="small" fullWidth sx={{ mt: 1.5 }} onClick={() => markRecycled(c.videoId)}>
                      Mark as Recycled
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )
      )}

      {tab === 1 && (
        <Card sx={{ maxWidth: 600 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Content Freshness Checker</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Check if a keyword/topic has been posted too recently (24h keyword gap, 4h category gap)</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField label="Keyword / Topic" value={freshnessKeyword} onChange={(e) => setFreshnessKeyword(e.target.value)} fullWidth />
              <TextField label="Category" value={freshnessCategory} onChange={(e) => setFreshnessCategory(e.target.value)} fullWidth />
              <Button variant="contained" onClick={checkFreshness} disabled={!freshnessKeyword}>Check Freshness</Button>
              {freshnessResult && (
                <Alert severity={freshnessResult.allowed ? 'success' : 'warning'} icon={freshnessResult.allowed ? <CheckCircleIcon /> : <WarningIcon />}>
                  {freshnessResult.allowed ? '✅ Content is fresh — safe to post!' : `⚠️ ${freshnessResult.reason}`}
                  {freshnessResult.waitMs && <Typography variant="caption" display="block">Wait: {Math.round(freshnessResult.waitMs / 60000)} minutes</Typography>}
                </Alert>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {tab === 2 && (
        <Card sx={{ maxWidth: 600 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Duplicate Content Detector</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Check if similar content has already been created (uses text similarity matching)</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField label="Content Title" value={dedupTitle} onChange={(e) => setDedupTitle(e.target.value)} fullWidth />
              <TextField label="Category" value={freshnessCategory} onChange={(e) => setFreshnessCategory(e.target.value)} fullWidth />
              <Button variant="contained" startIcon={<SearchIcon />} onClick={checkDedupe} disabled={!dedupTitle}>Check for Duplicates</Button>
              {dedupResult && (
                <Alert severity={dedupResult.isDuplicate ? 'error' : 'success'}>
                  {dedupResult.isDuplicate
                    ? `⚠️ Duplicate detected! Similarity: ${Math.round(dedupResult.similarity * 100)}% with "${dedupResult.matchedTitle}"`
                    : '✅ No duplicates found — content is unique!'}
                </Alert>
              )}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default RecycleDashboard;
