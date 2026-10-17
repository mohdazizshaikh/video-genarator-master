import { authenticatedFetch } from "../services/authenticatedFetch";
import React, { useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, TextField, MenuItem,
  Select, FormControl, InputLabel, Alert, CircularProgress, Chip, Tabs, Tab
} from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import DownloadIcon from '@mui/icons-material/Download';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const IMAGE_TYPES = [
  { value: 'quote_card', label: 'Quote Card', desc: '1080×1080 with bold text & accent border' },
  { value: 'banner', label: 'Banner', desc: '1200×627 for LinkedIn/Twitter' },
  { value: 'poster', label: 'Poster', desc: '1080×1080 announcement post' },
  { value: 'thumbnail', label: 'YouTube Thumbnail', desc: '1280×720 with bold title' },
  { value: 'announcement', label: 'Announcement', desc: '1080×1920 story format' },
];

const CATEGORIES = ['General', 'Tech', 'Business', 'Motivation', 'News', 'Health', 'Education', 'Entertainment'];
const PLATFORMS = ['instagram_square', 'instagram_story', 'youtube_thumbnail', 'linkedin', 'twitter'];

interface GeneratedImage {
  fileName: string;
  width: number;
  height: number;
  type: string;
  createdAt: string;
}

export const ImageGenerator: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedImage | null>(null);

  const [form, setForm] = useState({
    type: 'quote_card', title: '', subtitle: '', category: 'General',
    platform: 'instagram_square', watermark: '', backgroundColor: '', textColor: '', accentColor: '',
  });
  const [quote, setQuote] = useState({ quote: '', author: '', category: 'Motivation' });
  const [thumbnail, setThumbnail] = useState({ title: '', category: 'General' });

  const generate = async (endpoint: string, body: object) => {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await authenticatedFetch(`/api/image/${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.status === 'ok') setResult(data.data);
      else setError(data.error || 'Generation failed');
    } catch { setError('Image generation failed — canvas package may not be installed'); }
    setLoading(false);
  };

  const downloadImage = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = `/api/image/file/${result.fileName}`;
    link.download = result.fileName;
    link.click();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <ImageIcon color="primary" sx={{ fontSize: 36 }} />
        <Box>
          <Typography variant="h4" fontWeight="bold">Image Generator</Typography>
          <Typography variant="body2" color="text.secondary">Create quote cards, banners, posters & thumbnails</Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
                <Tab label="Custom" />
                <Tab label="Quote Card" />
                <Tab label="Thumbnail" />
              </Tabs>

              {tab === 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>Image Type</InputLabel>
                    <Select value={form.type} label="Image Type" onChange={(e) => setForm({ ...form, type: e.target.value })}>
                      {IMAGE_TYPES.map((t) => <MenuItem key={t.value} value={t.value}><Box><div>{t.label}</div><Typography variant="caption" color="text.secondary">{t.desc}</Typography></Box></MenuItem>)}
                    </Select>
                  </FormControl>
                  <TextField label="Title / Main Text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} multiline rows={2} required />
                  <TextField label="Subtitle (optional)" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <FormControl fullWidth>
                        <InputLabel>Category</InputLabel>
                        <Select value={form.category} label="Category" onChange={(e) => setForm({ ...form, category: e.target.value })}>
                          {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6}>
                      <FormControl fullWidth>
                        <InputLabel>Platform Format</InputLabel>
                        <Select value={form.platform} label="Platform Format" onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                          {PLATFORMS.map((p) => <MenuItem key={p} value={p}>{p.replace(/_/g, ' ')}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                  <TextField label="Watermark text (e.g. @YourBrand)" value={form.watermark} onChange={(e) => setForm({ ...form, watermark: e.target.value })} />
                  <Button variant="contained" startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />} onClick={() => generate('generate', { ...form })} disabled={loading || !form.title} size="large">
                    {loading ? 'Generating...' : 'Generate Image'}
                  </Button>
                </Box>
              )}

              {tab === 1 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField label="Quote Text" value={quote.quote} onChange={(e) => setQuote({ ...quote, quote: e.target.value })} multiline rows={3} required />
                  <TextField label="Author (optional)" value={quote.author} onChange={(e) => setQuote({ ...quote, author: e.target.value })} />
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select value={quote.category} label="Category" onChange={(e) => setQuote({ ...quote, category: e.target.value })}>
                      {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <Button variant="contained" startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />} onClick={() => generate('quote-card', quote)} disabled={loading || !quote.quote} size="large">
                    {loading ? 'Generating...' : 'Generate Quote Card'}
                  </Button>
                </Box>
              )}

              {tab === 2 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField label="Video Title" value={thumbnail.title} onChange={(e) => setThumbnail({ ...thumbnail, title: e.target.value })} required />
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select value={thumbnail.category} label="Category" onChange={(e) => setThumbnail({ ...thumbnail, category: e.target.value })}>
                      {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <Button variant="contained" startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />} onClick={() => generate('thumbnail', thumbnail)} disabled={loading || !thumbnail.title} size="large">
                    {loading ? 'Generating...' : 'Generate Thumbnail (1280×720)'}
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          {result ? (
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>✅ Image Generated</Typography>
                <img
                  src={`/api/image/file/${result.fileName}`}
                  alt="Generated"
                  style={{ width: '100%', borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label={`${result.width}×${result.height}`} size="small" />
                  <Chip label={result.type.replace('_', ' ')} size="small" color="primary" />
                  <Chip label={new Date(result.createdAt).toLocaleTimeString()} size="small" variant="outlined" />
                </Box>
                <Button variant="contained" startIcon={<DownloadIcon />} onClick={downloadImage} fullWidth sx={{ mt: 2 }}>
                  Download Image
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, backgroundColor: '#f8fafc', border: '2px dashed #e5e7eb' }}>
              <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                <ImageIcon sx={{ fontSize: 64, opacity: 0.3 }} />
                <Typography variant="body2" sx={{ mt: 1 }}>Generated image will appear here</Typography>
              </Box>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default ImageGenerator;
