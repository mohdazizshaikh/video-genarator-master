import { authenticatedFetch } from "../services/authenticatedFetch";
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Card, CardContent, TextField, Grid, Alert, LinearProgress,
  FormControlLabel, Switch, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PaletteIcon from '@mui/icons-material/Palette';

interface BrandingConfig {
  tenantId: string;
  name: string;
  logo: { light: string; dark: string };
  colors: { primary: string; secondary: string; accent: string; background: string };
  typography: { fontFamily: string; headingWeight: number; bodyWeight: number };
  domain: string;
  customDomain: boolean;
  favicon: string;
  description: string;
  updatedAt: string;
}

const BrandingDashboard: React.FC = () => {
  const [tenantId, setTenantId] = useState('default');
  const [branding, setBranding] = useState<BrandingConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<BrandingConfig>>({});
  const [resetOpen, setResetOpen] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const showToast = (message: string, severity: 'success' | 'error' = 'success') => {
    setToast({ open: true, message, severity });
  };

  const fetchBranding = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch(`/api/branding/${tenantId}`);
      const data = await res.json();
      setBranding(data.config);
      setForm(data.config);
    } catch {
      showToast('Failed to load branding', 'error');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetchBranding(); }, [fetchBranding]);

  const handleSave = async () => {
    if (!form.name || !form.domain || !form.colors) return;
    setSaving(true);
    try {
      const res = await authenticatedFetch(`/api/branding/${tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          colors: form.colors,
          logo: form.logo,
          typography: form.typography,
          domain: form.domain,
          customDomain: form.customDomain,
          favicon: form.favicon,
          description: form.description,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      const data = await res.json();
      setBranding(data.branding);
      showToast('Branding saved successfully!');
    } catch (err: any) {
      showToast(err.message || 'Failed to save branding', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      const res = await authenticatedFetch(`/api/branding/${tenantId}/reset`, { method: 'POST' });
      const data = await res.json();
      setBranding(data.branding);
      setForm(data.branding);
      setResetOpen(false);
      showToast('Reset to default branding');
    } catch {
      showToast('Failed to reset branding', 'error');
    }
  };

  if (loading) return <LinearProgress />;
  if (!branding) return <Typography>No branding found</Typography>;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box sx={{ background: 'linear-gradient(135deg, #6366f1, #f59e0b)', borderRadius: 2, p: 1.5, display: 'flex' }}>
          <PaletteIcon sx={{ fontSize: 28 }} />
        </Box>
        <Box>
          <Typography variant="h4" fontWeight="bold">White-Label Branding</Typography>
          <Typography variant="body2" color="text.secondary">Customize colors, logos, domain, and typography</Typography>
        </Box>
      </Box>

      {/* Tenant Selector */}
      <Card sx={{ background: '#1e293b', mb: 3, p: 2 }}>
        <TextField
          label="Tenant ID"
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          fullWidth
          size="small"
          placeholder="default"
          helperText="Enter tenant ID to load/manage branding for that tenant"
        />
      </Card>

      {/* Company Info */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Card sx={{ background: '#1e293b' }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">Company Name</Typography>
              <TextField
                value={form.name || ''}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                fullWidth
                size="small"
                placeholder="e.g. ACME Content"
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card sx={{ background: '#1e293b' }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">Description</Typography>
              <TextField
                value={form.description || ''}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                fullWidth
                size="small"
                placeholder="Your brand tagline"
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Colors */}
      <Card sx={{ background: '#1e293b', mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>Colors</Typography>
          <Grid container spacing={2}>
            {['primary', 'secondary', 'accent', 'background'].map((key) => (
              <Grid item xs={12} sm={6} md={3} key={key}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <input
                    type="color"
                    value={form.colors?.[key as keyof typeof form.colors] || '#000000'}
                    onChange={(e) => setForm(f => ({
                      ...f,
                      colors: { ...(f.colors ?? ({} as BrandingConfig["colors"])), [key]: e.target.value }
                    }))}
                    style={{ width: 50, height: 40, borderRadius: 4, cursor: 'pointer' }}
                  />
                  <TextField
                    value={form.colors?.[key as keyof typeof form.colors] || ''}
                    onChange={(e) => setForm(f => ({
                      ...f,
                      colors: { ...(f.colors ?? ({} as BrandingConfig["colors"])), [key]: e.target.value }
                    }))}
                    size="small"
                    placeholder="#000000"
                  />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Domain */}
      <Card sx={{ background: '#1e293b', mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>Domain & Favicon</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={8}>
              <TextField
                label="Domain"
                value={form.domain || ''}
                onChange={(e) => setForm(f => ({ ...f, domain: e.target.value }))}
                fullWidth
                size="small"
                placeholder="app.example.com"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.customDomain || false}
                    onChange={(e) => setForm(f => ({ ...f, customDomain: e.target.checked }))}
                  />
                }
                label="Custom Domain"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Favicon URL"
                value={form.favicon || ''}
                onChange={(e) => setForm(f => ({ ...f, favicon: e.target.value }))}
                fullWidth
                size="small"
                placeholder="https://example.com/favicon.ico"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Logo */}
      <Card sx={{ background: '#1e293b', mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>Logos</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" gutterBottom>Light Logo (URL or Base64)</Typography>
              <TextField
                value={form.logo?.light || ''}
                onChange={(e) => setForm(f => ({ ...f, logo: { ...(f.logo ?? ({} as BrandingConfig["logo"])), light: e.target.value } }))}
                fullWidth
                size="small"
                multiline
                minRows={2}
                placeholder="data:image/svg+xml..."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" gutterBottom>Dark Logo (URL or Base64)</Typography>
              <TextField
                value={form.logo?.dark || ''}
                onChange={(e) => setForm(f => ({ ...f, logo: { ...(f.logo ?? ({} as BrandingConfig["logo"])), dark: e.target.value } }))}
                fullWidth
                size="small"
                multiline
                minRows={2}
                placeholder="data:image/svg+xml..."
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Typography */}
      <Card sx={{ background: '#1e293b', mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>Typography</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Font Family"
                value={form.typography?.fontFamily || ''}
                onChange={(e) => setForm(f => ({ ...f, typography: { ...(f.typography ?? ({} as BrandingConfig["typography"])), fontFamily: e.target.value } }))}
                fullWidth
                size="small"
                placeholder="'Inter', 'Roboto', sans-serif"
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                label="Heading Weight"
                type="number"
                value={form.typography?.headingWeight || 700}
                onChange={(e) => setForm(f => ({ ...f, typography: { ...(f.typography ?? ({} as BrandingConfig["typography"])), headingWeight: parseInt(e.target.value) } }))}
                fullWidth
                size="small"
                inputProps={{ min: 100, max: 900, step: 100 }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                label="Body Weight"
                type="number"
                value={form.typography?.bodyWeight || 400}
                onChange={(e) => setForm(f => ({ ...f, typography: { ...(f.typography ?? ({} as BrandingConfig["typography"])), bodyWeight: parseInt(e.target.value) } }))}
                fullWidth
                size="small"
                inputProps={{ min: 100, max: 900, step: 100 }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Last Updated */}
      {branding.updatedAt && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Last updated: {new Date(branding.updatedAt).toLocaleString()}
        </Alert>
      )}

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          startIcon={<RestartAltIcon />}
          onClick={() => setResetOpen(true)}
          disabled={saving}
        >
          Reset to Default
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          sx={{ background: 'linear-gradient(135deg, #6366f1, #f59e0b)' }}
        >
          {saving ? 'Saving...' : 'Save Branding'}
        </Button>
      </Box>

      {/* Reset Dialog */}
      <Dialog open={resetOpen} onClose={() => setResetOpen(false)}>
        <DialogTitle>Reset to Default?</DialogTitle>
        <DialogContent>
          All custom branding will be lost. This cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetOpen(false)}>Cancel</Button>
          <Button onClick={handleReset} variant="contained" color="error">Reset</Button>
        </DialogActions>
      </Dialog>

      {/* Toast */}
      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast(t => ({ ...t, open: false }))}>
        <Alert severity={toast.severity} onClose={() => setToast(t => ({ ...t, open: false }))}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BrandingDashboard;
