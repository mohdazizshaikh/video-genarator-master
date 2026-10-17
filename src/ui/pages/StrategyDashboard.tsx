import { authenticatedFetch } from "../services/authenticatedFetch";
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Button, Alert,
  CircularProgress, Tabs, Tab, LinearProgress, Divider, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';
import PieChartIcon from '@mui/icons-material/PieChart';
import CommentIcon from '@mui/icons-material/Comment';

interface PlatformProfile {
  platform: string;
  optimalDurationSec: { min: number; max: number };
  optimalAspectRatio: string;
  captionMaxChars: number;
  hashtagCount: { min: number; max: number };
  bestHookDurationSec: number;
  musicImportance: string;
  subtitleImportance: string;
  emotionTone: string[];
  contentStyle: string[];
  avoidList: string[];
  postingFrequency: string;
  viralFormats: string[];
}

interface BucketStat {
  type: string;
  label: string;
  targetPercent: number;
  currentPercent: number;
  count: number;
  description: string;
}

interface CTAOption {
  text: string;
  engagementType: string;
  score: number;
  language: string;
}

const BUCKET_COLORS: Record<string, string> = {
  viral_trending: '#ef4444', evergreen: '#10b981', educational: '#3b82f6', personal_brand: '#8b5cf6',
};

const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸', tiktok: '🎵', youtube: '▶️', youtube_shorts: '📱', linkedin: '💼', facebook: '👥', telegram: '✈️', x: '𝕏',
};

export const StrategyDashboard: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [platforms, setPlatforms] = useState<PlatformProfile[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformProfile | null>(null);
  const [buckets, setBuckets] = useState<BucketStat[]>([]);
  const [ctas, setCtas] = useState<CTAOption[]>([]);
  const [ctaPlatform, setCtaPlatform] = useState('instagram');
  const [ctaCategory, setCtaCategory] = useState('General');
  const [loading, setLoading] = useState(false);
  const [nextBucket, setNextBucket] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, bRes, nbRes] = await Promise.all([
        authenticatedFetch('/api/strategy/platforms'),
        authenticatedFetch('/api/strategy/buckets'),
        authenticatedFetch('/api/strategy/buckets/next'),
      ]);
      const [pData, bData, nbData] = await Promise.all([pRes.json(), bRes.json(), nbRes.json()]);
      if (pData.status === 'ok') { setPlatforms(pData.data); setSelectedPlatform(pData.data[0]); }
      if (bData.status === 'ok') setBuckets(bData.data);
      if (nbData.status === 'ok') setNextBucket(nbData.data.recommended);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const loadCtas = useCallback(async () => {
    const res = await authenticatedFetch(`/api/strategy/cta?platform=${ctaPlatform}&category=${ctaCategory}&limit=5`);
    const data = await res.json();
    if (data.status === 'ok') setCtas(data.data);
  }, [ctaPlatform, ctaCategory]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadCtas(); }, [loadCtas]);

  const impBadge = (level: string) => {
    const colors: Record<string, string> = { critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#6b7280' };
    return <Chip label={level} size="small" sx={{ backgroundColor: colors[level] || '#888', color: 'white' }} />;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <PsychologyIcon color="primary" sx={{ fontSize: 36 }} />
        <Box>
          <Typography variant="h4" fontWeight="bold">Strategy Center</Typography>
          <Typography variant="body2" color="text.secondary">Platform psychology · Content buckets · CTA engine · Series builder</Typography>
        </Box>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Platform Psychology" icon={<PsychologyIcon />} iconPosition="start" />
        <Tab label="Content Buckets" icon={<PieChartIcon />} iconPosition="start" />
        <Tab label="Comment CTAs" icon={<CommentIcon />} iconPosition="start" />
      </Tabs>

      {loading && <CircularProgress />}

      {tab === 0 && !loading && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Platforms</Typography>
                {platforms.map((p) => (
                  <Button key={p.platform} fullWidth variant={selectedPlatform?.platform === p.platform ? 'contained' : 'text'} sx={{ justifyContent: 'flex-start', mb: 0.5 }} onClick={() => setSelectedPlatform(p)}>
                    {PLATFORM_ICONS[p.platform] || '📱'} {p.platform.replace('_', ' ')}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </Grid>
          {selectedPlatform && (
            <Grid item xs={12} md={9}>
              <Card>
                <CardContent>
                  <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
                    {PLATFORM_ICONS[selectedPlatform.platform]} {selectedPlatform.platform.replace('_', ' ').toUpperCase()}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Duration</Typography>
                      <Typography fontWeight="bold">{selectedPlatform.optimalDurationSec.min}–{selectedPlatform.optimalDurationSec.max}s</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Aspect Ratio</Typography>
                      <Typography fontWeight="bold">{selectedPlatform.optimalAspectRatio}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Hook Duration</Typography>
                      <Typography fontWeight="bold">First {selectedPlatform.bestHookDurationSec}s</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Posting Frequency</Typography>
                      <Typography fontWeight="bold" sx={{ fontSize: '0.8rem' }}>{selectedPlatform.postingFrequency}</Typography>
                    </Grid>
                  </Grid>
                  <Divider sx={{ my: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Music Importance</Typography>
                      <Box>{impBadge(selectedPlatform.musicImportance)}</Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Subtitle Importance</Typography>
                      <Box>{impBadge(selectedPlatform.subtitleImportance)}</Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Hashtags</Typography>
                      <Typography fontWeight="bold">{selectedPlatform.hashtagCount.min}–{selectedPlatform.hashtagCount.max}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Caption Limit</Typography>
                      <Typography fontWeight="bold">{selectedPlatform.captionMaxChars.toLocaleString()} chars</Typography>
                    </Grid>
                  </Grid>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Emotion Tone</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                    {selectedPlatform.emotionTone.map((e) => <Chip key={e} label={e} size="small" color="primary" variant="outlined" />)}
                  </Box>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Content Style</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                    {selectedPlatform.contentStyle.map((s) => <Chip key={s} label={s} size="small" color="success" variant="outlined" />)}
                  </Box>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Viral Formats</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                    {selectedPlatform.viralFormats.map((f) => <Chip key={f} label={f.replace('_', ' ')} size="small" color="warning" />)}
                  </Box>
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    <Typography variant="caption"><strong>Avoid:</strong> {selectedPlatform.avoidList.join(', ')}</Typography>
                  </Alert>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {tab === 1 && !loading && (
        <Box>
          {nextBucket && <Alert severity="info" sx={{ mb: 2 }}>📊 Next recommended bucket: <strong>{nextBucket.replace('_', ' ')}</strong> — underweight vs target</Alert>}
          <Grid container spacing={2}>
            {buckets.map((b) => (
              <Grid item xs={12} sm={6} md={3} key={b.type}>
                <Card sx={{ borderTop: `4px solid ${BUCKET_COLORS[b.type]}` }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold">{b.label}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>{b.description}</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption">Current: {b.currentPercent}%</Typography>
                      <Typography variant="caption">Target: {b.targetPercent}%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={b.currentPercent} sx={{ height: 8, borderRadius: 4, '& .MuiLinearProgress-bar': { backgroundColor: BUCKET_COLORS[b.type] } }} />
                    <Typography variant="h4" fontWeight="bold" sx={{ mt: 1.5, color: BUCKET_COLORS[b.type] }}>{b.count}</Typography>
                    <Typography variant="caption" color="text.secondary">content pieces</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {tab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Platform</InputLabel>
              <Select value={ctaPlatform} label="Platform" onChange={(e) => setCtaPlatform(e.target.value)}>
                {['instagram', 'tiktok', 'youtube', 'linkedin', 'telegram', 'x', 'facebook'].map((p) => <MenuItem key={p} value={p}>{PLATFORM_ICONS[p]} {p}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Category</InputLabel>
              <Select value={ctaCategory} label="Category" onChange={(e) => setCtaCategory(e.target.value)}>
                {['General', 'Tech', 'Business', 'Motivation', 'News', 'Health', 'Education'].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <Grid container spacing={2}>
            {ctas.map((cta, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Card sx={{ border: '1px solid #e5e7eb' }}>
                  <CardContent>
                    <Typography variant="body1" fontWeight="bold" sx={{ mb: 1 }}>"{cta.text}"</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      <Chip label={cta.engagementType} size="small" color="primary" />
                      <Chip label={`Score: ${cta.score}`} size="small" color={cta.score >= 90 ? 'success' : 'default'} />
                      <Chip label={cta.language} size="small" variant="outlined" />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default StrategyDashboard;
