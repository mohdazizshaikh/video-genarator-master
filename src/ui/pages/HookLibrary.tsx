import { authenticatedFetch } from "../services/authenticatedFetch";
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Chip, Button, TextField,
  MenuItem, Select, FormControl, InputLabel, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Alert, Divider, Tooltip, LinearProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BookmarksIcon from '@mui/icons-material/Bookmarks';

interface Hook {
  id: string;
  text: string;
  type: string;
  emotion: string;
  category: string[];
  platform: string[];
  performanceScore: number;
  usageCount: number;
  createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  curiosity: '#3b82f6', shock: '#ef4444', value: '#10b981',
  pattern_interrupt: '#f59e0b', story: '#8b5cf6', question: '#06b6d4',
  controversy: '#ec4899', urgency: '#dc2626',
};

const EMOTION_COLORS: Record<string, string> = {
  curiosity: '#3b82f6', fear: '#ef4444', inspiration: '#10b981',
  humor: '#f59e0b', anger: '#dc2626', surprise: '#8b5cf6', joy: '#06b6d4',
};

const HookCard: React.FC<{ hook: Hook; onCopy: (text: string) => void; onDelete: (id: string) => void }> = ({ hook, onCopy, onDelete }) => (
  <Card sx={{ height: '100%', border: hook.performanceScore >= 90 ? '2px solid #f59e0b' : '1px solid #e5e7eb' }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Chip label={hook.type.replace('_', ' ')} size="small" sx={{ backgroundColor: TYPE_COLORS[hook.type] || '#6366f1', color: 'white' }} />
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Copy hook text">
            <IconButton size="small" onClick={() => onCopy(hook.text)}><ContentCopyIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Delete hook">
            <IconButton size="small" color="error" onClick={() => onDelete(hook.id)}><DeleteIcon fontSize="small" /></IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Typography variant="body1" sx={{ mb: 1.5, fontStyle: 'italic', lineHeight: 1.5 }}>"{hook.text}"</Typography>
      <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
        <Chip label={hook.emotion} size="small" sx={{ backgroundColor: EMOTION_COLORS[hook.emotion] || '#888', color: 'white', fontSize: '0.65rem' }} />
        {hook.platform.slice(0, 3).map((p) => <Chip key={p} label={p} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />)}
      </Box>
      <Box sx={{ mb: 0.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary">Performance</Typography>
          <Typography variant="caption" fontWeight="bold">{hook.performanceScore}/100</Typography>
        </Box>
        <LinearProgress variant="determinate" value={hook.performanceScore} sx={{ height: 4, borderRadius: 2, '& .MuiLinearProgress-bar': { backgroundColor: hook.performanceScore >= 85 ? '#10b981' : '#f59e0b' } }} />
      </Box>
      <Typography variant="caption" color="text.secondary">Used {hook.usageCount} times</Typography>
    </CardContent>
  </Card>
);

export const HookLibrary: React.FC = () => {
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [filtered, setFiltered] = useState<Hook[]>([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [emotionFilter, setEmotionFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [topic, setTopic] = useState('');
  const [generated, setGenerated] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newHook, setNewHook] = useState({ text: '', type: 'curiosity', emotion: 'curiosity', platform: 'instagram,tiktok,youtube' });

  const loadHooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/hooks');
      const data = await res.json();
      if (data.status === 'ok') { setHooks(data.data); setFiltered(data.data); }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadHooks(); }, [loadHooks]);

  useEffect(() => {
    let f = [...hooks];
    if (typeFilter) f = f.filter((h) => h.type === typeFilter);
    if (emotionFilter) f = f.filter((h) => h.emotion === emotionFilter);
    if (platformFilter) f = f.filter((h) => h.platform.includes(platformFilter));
    setFiltered(f.sort((a, b) => b.performanceScore - a.performanceScore));
  }, [hooks, typeFilter, emotionFilter, platformFilter]);

  const generateHooks = async () => {
    if (!topic) return;
    const res = await authenticatedFetch('/api/hooks/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic, limit: 6 }) });
    const data = await res.json();
    if (data.status === 'ok') setGenerated(data.data);
  };

  const addHook = async () => {
    await authenticatedFetch('/api/hooks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newHook, category: ['General'], platform: newHook.platform.split(',').map((p) => p.trim()), performanceScore: 70 }) });
    setAddOpen(false);
    loadHooks();
  };

  const deleteHook = async (id: string) => {
    await authenticatedFetch(`/api/hooks/${id}`, { method: 'DELETE' });
    loadHooks();
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <BookmarksIcon color="primary" sx={{ fontSize: 36 }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">Hook Library</Typography>
            <Typography variant="body2" color="text.secondary">{hooks.length} hooks · sorted by performance score</Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>Add Hook</Button>
      </Box>

      {copied && <Alert severity="success" sx={{ mb: 2 }}>Hook copied to clipboard!</Alert>}

      <Card sx={{ mb: 3, p: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>⚡ Generate Hooks for a Topic</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
          <TextField label="Enter topic (e.g. AI, Business, Health)" value={topic} onChange={(e) => setTopic(e.target.value)} size="small" sx={{ flex: 1 }} onKeyDown={(e) => e.key === 'Enter' && generateHooks()} />
          <Button variant="contained" startIcon={<AutoAwesomeIcon />} onClick={generateHooks} disabled={!topic}>Generate</Button>
        </Box>
        {generated.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 1.5 }} />
            <Typography variant="caption" color="text.secondary">Generated hooks for "{topic}":</Typography>
            {generated.map((g, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, p: 1, backgroundColor: '#f8fafc', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ flex: 1, fontStyle: 'italic' }}>{g}</Typography>
                <IconButton size="small" onClick={() => copyText(g)}><ContentCopyIcon fontSize="small" /></IconButton>
              </Box>
            ))}
          </Box>
        )}
      </Card>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Hook Type</InputLabel>
          <Select value={typeFilter} label="Hook Type" onChange={(e) => setTypeFilter(e.target.value)}>
            <MenuItem value="">All Types</MenuItem>
            {['curiosity', 'shock', 'value', 'pattern_interrupt', 'story', 'question', 'controversy', 'urgency'].map((t) => <MenuItem key={t} value={t}>{t.replace('_', ' ')}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Emotion</InputLabel>
          <Select value={emotionFilter} label="Emotion" onChange={(e) => setEmotionFilter(e.target.value)}>
            <MenuItem value="">All Emotions</MenuItem>
            {['curiosity', 'fear', 'inspiration', 'humor', 'anger', 'surprise', 'joy'].map((e) => <MenuItem key={e} value={e}>{e}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Platform</InputLabel>
          <Select value={platformFilter} label="Platform" onChange={(e) => setPlatformFilter(e.target.value)}>
            <MenuItem value="">All Platforms</MenuItem>
            {['instagram', 'tiktok', 'youtube', 'linkedin', 'x'].map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
          Showing {filtered.length} hooks
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}><LinearProgress /></Box>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((hook) => (
            <Grid item xs={12} sm={6} md={4} key={hook.id}>
              <HookCard hook={hook} onCopy={copyText} onDelete={deleteHook} />
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Hook</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField label="Hook Text (use {topic} as placeholder)" value={newHook.text} onChange={(e) => setNewHook({ ...newHook, text: e.target.value })} multiline rows={3} fullWidth />
          <FormControl fullWidth>
            <InputLabel>Type</InputLabel>
            <Select value={newHook.type} label="Type" onChange={(e) => setNewHook({ ...newHook, type: e.target.value })}>
              {['curiosity', 'shock', 'value', 'pattern_interrupt', 'story', 'question', 'controversy', 'urgency'].map((t) => <MenuItem key={t} value={t}>{t.replace('_', ' ')}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Emotion</InputLabel>
            <Select value={newHook.emotion} label="Emotion" onChange={(e) => setNewHook({ ...newHook, emotion: e.target.value })}>
              {['curiosity', 'fear', 'inspiration', 'humor', 'anger', 'surprise', 'joy'].map((e) => <MenuItem key={e} value={e}>{e}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Platforms (comma-separated: instagram,tiktok,youtube)" value={newHook.platform} onChange={(e) => setNewHook({ ...newHook, platform: e.target.value })} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={addHook} disabled={!newHook.text}>Add Hook</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HookLibrary;
