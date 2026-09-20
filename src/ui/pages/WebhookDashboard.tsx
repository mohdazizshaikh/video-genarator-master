import { authenticatedFetch } from "../services/authenticatedFetch";
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Grid, Chip, IconButton,
  Switch, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel, Alert,
  FormGroup, FormControlLabel, Checkbox, Tooltip, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  CircularProgress, Snackbar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import TelegramIcon from '@mui/icons-material/Telegram';
import WebhookIcon from '@mui/icons-material/Webhook';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';

type NotificationEvent =
  | 'video.ready' | 'video.published' | 'video.failed'
  | 'trend.detected' | 'cost.alert' | 'shadowban.detected'
  | 'recycle.ready' | 'queue.complete' | 'system.error';

type WebhookChannel = 'telegram' | 'slack' | 'discord' | 'custom';

interface WebhookConfig {
  id: string;
  name: string;
  channel: WebhookChannel;
  enabled: boolean;
  events: NotificationEvent[];
  createdAt: string;
  lastTriggeredAt?: string;
  triggerCount: number;
  telegramBotToken?: string;
  telegramChatId?: string;
  slackWebhookUrl?: string;
  discordWebhookUrl?: string;
  customUrl?: string;
  customMethod?: string;
}

interface NotificationLog {
  id: string;
  webhookName: string;
  channel: WebhookChannel;
  event: NotificationEvent;
  title: string;
  success: boolean;
  error?: string;
  sentAt: string;
}

interface Stats {
  total: number;
  enabled: number;
  successRate: number;
  byChannel: { telegram: number; slack: number; discord: number; custom: number };
}

const ALL_EVENTS: NotificationEvent[] = [
  'video.ready', 'video.published', 'video.failed',
  'trend.detected', 'cost.alert', 'shadowban.detected',
  'recycle.ready', 'queue.complete', 'system.error',
];

const EVENT_LABELS: Record<NotificationEvent, string> = {
  'video.ready': '🎬 Video Ready',
  'video.published': '✅ Video Published',
  'video.failed': '❌ Video Failed',
  'trend.detected': '🔥 Trend Detected',
  'cost.alert': '💰 Cost Alert',
  'shadowban.detected': '⚠️ Shadowban Detected',
  'recycle.ready': '♻️ Recycle Ready',
  'queue.complete': '✔️ Queue Complete',
  'system.error': '🚨 System Error',
};

const CHANNEL_COLORS: Record<WebhookChannel, string> = {
  telegram: '#2AABEE',
  slack:    '#E01E5A',
  discord:  '#5865F2',
  custom:   '#6366f1',
};

const CHANNEL_ICON = (ch: WebhookChannel) => {
  if (ch === 'telegram') return <TelegramIcon sx={{ color: CHANNEL_COLORS.telegram }} />;
  if (ch === 'slack')    return <WebhookIcon sx={{ color: CHANNEL_COLORS.slack }} />;
  if (ch === 'discord')  return <WebhookIcon sx={{ color: CHANNEL_COLORS.discord }} />;
  return <WebhookIcon sx={{ color: CHANNEL_COLORS.custom }} />;
};

const EMPTY_FORM = {
  name: '',
  channel: 'telegram' as WebhookChannel,
  events: ['video.published', 'video.failed'] as NotificationEvent[],
  telegramBotToken: '',
  telegramChatId: '',
  slackWebhookUrl: '',
  discordWebhookUrl: '',
  customUrl: '',
  customMethod: 'POST',
};

const WebhookDashboard: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, enabled: 0, successRate: 100, byChannel: { telegram: 0, slack: 0, discord: 0, custom: 0 } });
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const showToast = (message: string, severity: 'success' | 'error' = 'success') => {
    setToast({ open: true, message, severity });
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [wRes, sRes, lRes] = await Promise.all([
        authenticatedFetch('/api/webhooks').then(r => r.json()),
        authenticatedFetch('/api/webhooks/stats').then(r => r.json()),
        authenticatedFetch('/api/webhooks/logs?limit=50').then(r => r.json()),
      ]);
      setWebhooks(wRes.webhooks || []);
      setStats(sRes);
      setLogs(lRes.logs || []);
    } catch {
      showToast('Failed to load webhooks', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openAdd = () => { setEditingId(null); setForm({ ...EMPTY_FORM }); setDialogOpen(true); };
  const openEdit = (w: WebhookConfig) => {
    setEditingId(w.id);
    setForm({
      name: w.name, channel: w.channel, events: [...w.events],
      telegramBotToken: w.telegramBotToken || '',
      telegramChatId: w.telegramChatId || '',
      slackWebhookUrl: w.slackWebhookUrl || '',
      discordWebhookUrl: w.discordWebhookUrl || '',
      customUrl: w.customUrl || '',
      customMethod: w.customMethod || 'POST',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditingId(null); };

  const handleSave = async () => {
    if (!form.name || !form.events.length) return;
    setSaving(true);
    try {
      const url = editingId ? `/api/webhooks/${editingId}` : '/api/webhooks';
      const method = editingId ? 'PUT' : 'POST';
      const res = await authenticatedFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error(await res.text());
      showToast(editingId ? 'Webhook updated!' : 'Webhook created!');
      closeDialog();
      fetchAll();
    } catch (err: any) {
      showToast(err.message || 'Failed to save webhook', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await authenticatedFetch(`/api/webhooks/${id}`, { method: 'DELETE' });
      showToast('Webhook deleted');
      fetchAll();
    } catch { showToast('Failed to delete webhook', 'error'); }
  };

  const handleToggle = async (id: string) => {
    try {
      await authenticatedFetch(`/api/webhooks/${id}/toggle`, { method: 'PATCH' });
      fetchAll();
    } catch { showToast('Failed to toggle webhook', 'error'); }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    try {
      const res = await authenticatedFetch(`/api/webhooks/${id}/test`, { method: 'POST' });
      const data = await res.json();
      const result = data.results?.[0];
      if (result?.success) showToast('Test notification sent successfully!');
      else showToast(result?.error || 'Test failed', 'error');
      fetchAll();
    } catch { showToast('Test failed', 'error'); }
    finally { setTesting(null); }
  };

  const toggleEvent = (event: NotificationEvent) => {
    setForm(f => ({
      ...f,
      events: f.events.includes(event) ? f.events.filter(e => e !== event) : [...f.events, event],
    }));
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ background: 'linear-gradient(135deg, #2AABEE, #6366f1)', borderRadius: 3, p: 1.5, display: 'flex' }}>
            <NotificationsActiveIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight="bold">Notifications & Webhooks</Typography>
            <Typography variant="body2" color="text.secondary">
              Telegram · Slack · Discord · Custom HTTP · real-time push on every event
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}
          sx={{ background: 'linear-gradient(135deg, #6366f1, #2AABEE)' }}>
          Add Webhook
        </Button>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total', value: stats.total, color: '#6366f1' },
          { label: 'Active', value: stats.enabled, color: '#22c55e' },
          { label: 'Success Rate', value: `${stats.successRate}%`, color: '#f59e0b' },
          { label: 'Telegram', value: stats.byChannel?.telegram || 0, color: '#2AABEE' },
          { label: 'Slack', value: stats.byChannel?.slack || 0, color: '#E01E5A' },
          { label: 'Discord', value: stats.byChannel?.discord || 0, color: '#5865F2' },
        ].map(({ label, value, color }) => (
          <Grid item xs={6} sm={4} md={2} key={label}>
            <Card sx={{ background: '#1e293b', textAlign: 'center', p: 1.5 }}>
              <Typography variant="h5" fontWeight="bold" sx={{ color }}>{value}</Typography>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Tab label={`Webhooks (${webhooks.length})`} />
        <Tab label={`Activity Log (${logs.length})`} />
      </Tabs>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Webhooks tab */}
      {tab === 0 && (
        <Box>
          {webhooks.length === 0 && !loading ? (
            <Card sx={{ background: '#1e293b', p: 4, textAlign: 'center' }}>
              <TelegramIcon sx={{ fontSize: 56, color: '#2AABEE', mb: 2 }} />
              <Typography variant="h6" gutterBottom>No webhooks configured yet</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Add a Telegram bot, Slack incoming webhook, Discord webhook, or any custom HTTP endpoint.
                You'll get real-time notifications when videos publish, trends spike, costs exceed limits, and more.
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}
                sx={{ background: 'linear-gradient(135deg, #6366f1, #2AABEE)' }}>
                Add First Webhook
              </Button>
            </Card>
          ) : (
            <Grid container spacing={2}>
              {webhooks.map((webhook) => (
                <Grid item xs={12} md={6} key={webhook.id}>
                  <Card sx={{ background: '#1e293b', border: `1px solid ${webhook.enabled ? CHANNEL_COLORS[webhook.channel] + '40' : 'rgba(255,255,255,0.06)'}`, transition: 'border 0.2s' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          {CHANNEL_ICON(webhook.channel)}
                          <Box>
                            <Typography variant="subtitle1" fontWeight="bold">{webhook.name}</Typography>
                            <Chip label={webhook.channel.toUpperCase()} size="small"
                              sx={{ backgroundColor: CHANNEL_COLORS[webhook.channel] + '20', color: CHANNEL_COLORS[webhook.channel], fontSize: '0.65rem', height: 18 }} />
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                          <Tooltip title={webhook.enabled ? 'Disable' : 'Enable'}>
                            <Switch size="small" checked={webhook.enabled} onChange={() => handleToggle(webhook.id)} />
                          </Tooltip>
                          <Tooltip title="Send Test Notification">
                            <span>
                              <IconButton size="small" onClick={() => handleTest(webhook.id)} disabled={testing === webhook.id}>
                                {testing === webhook.id
                                  ? <CircularProgress size={16} />
                                  : <PlayArrowIcon fontSize="small" sx={{ color: '#22c55e' }} />}
                              </IconButton>
                            </span>
                          </Tooltip>
                          <IconButton size="small" onClick={() => openEdit(webhook)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDelete(webhook.id)}>
                            <DeleteIcon fontSize="small" sx={{ color: '#ef4444' }} />
                          </IconButton>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                        {webhook.events.map((ev) => (
                          <Chip key={ev} label={EVENT_LABELS[ev]} size="small"
                            sx={{ height: 20, fontSize: '0.65rem', backgroundColor: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }} />
                        ))}
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">
                          {webhook.triggerCount} sent
                        </Typography>
                        {webhook.lastTriggeredAt && (
                          <Typography variant="caption" color="text.secondary">
                            Last: {new Date(webhook.lastTriggeredAt).toLocaleDateString()}
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Logs tab */}
      {tab === 1 && (
        <TableContainer component={Paper} sx={{ background: '#1e293b' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 40 }}>Status</TableCell>
                <TableCell>Webhook</TableCell>
                <TableCell>Channel</TableCell>
                <TableCell>Event</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No notifications sent yet — add a webhook and trigger an event.
                  </TableCell>
                </TableRow>
              ) : logs.map((log) => (
                <TableRow key={log.id} hover sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.03)' } }}>
                  <TableCell>
                    {log.success
                      ? <CheckCircleIcon sx={{ color: '#22c55e', fontSize: 18 }} />
                      : <Tooltip title={log.error || 'Failed'}><ErrorIcon sx={{ color: '#ef4444', fontSize: 18 }} /></Tooltip>
                    }
                  </TableCell>
                  <TableCell><Typography variant="body2">{log.webhookName}</Typography></TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {CHANNEL_ICON(log.channel)}
                      <Typography variant="caption">{log.channel}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={log.event} size="small" sx={{ fontSize: '0.65rem', height: 18 }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(log.sentAt).toLocaleString()}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth
        PaperProps={{ sx: { background: '#1e293b', border: '1px solid rgba(99,102,241,0.3)' } }}>
        <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)', pb: 1.5 }}>
          {editingId ? 'Edit Webhook' : 'Add Webhook'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>

          <TextField label="Webhook Name *" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            fullWidth size="small" placeholder="e.g. My Telegram Alerts" />

          <FormControl fullWidth size="small">
            <InputLabel>Channel *</InputLabel>
            <Select label="Channel *" value={form.channel}
              onChange={e => setForm(f => ({ ...f, channel: e.target.value as WebhookChannel }))}>
              <MenuItem value="telegram">📱 Telegram</MenuItem>
              <MenuItem value="slack">💬 Slack</MenuItem>
              <MenuItem value="discord">🎮 Discord</MenuItem>
              <MenuItem value="custom">🌐 Custom HTTP</MenuItem>
            </Select>
          </FormControl>

          {/* Telegram */}
          {form.channel === 'telegram' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Alert severity="info" sx={{ fontSize: '0.75rem', py: 0.5 }}>
                1. Message @BotFather on Telegram → /newbot to create a bot and get the token.<br />
                2. Add the bot to your group/channel and make it admin.<br />
                3. Get the Chat ID by messaging @userinfobot or checking the Telegram API.
              </Alert>
              <TextField label="Bot Token *" value={form.telegramBotToken}
                onChange={e => setForm(f => ({ ...f, telegramBotToken: e.target.value }))}
                fullWidth size="small" type="password" placeholder="1234567890:ABCdefGHIjklmno..." />
              <TextField label="Chat ID *" value={form.telegramChatId}
                onChange={e => setForm(f => ({ ...f, telegramChatId: e.target.value }))}
                fullWidth size="small" placeholder="-1001234567890 or @yourchannel" />
            </Box>
          )}

          {/* Slack */}
          {form.channel === 'slack' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Alert severity="info" sx={{ fontSize: '0.75rem', py: 0.5 }}>
                Go to api.slack.com/apps → Create App → Incoming Webhooks → Activate → Add New Webhook to Workspace → Copy URL.
              </Alert>
              <TextField label="Slack Webhook URL *" value={form.slackWebhookUrl}
                onChange={e => setForm(f => ({ ...f, slackWebhookUrl: e.target.value }))}
                fullWidth size="small" placeholder="https://hooks.slack.com/services/..." />
            </Box>
          )}

          {/* Discord */}
          {form.channel === 'discord' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Alert severity="info" sx={{ fontSize: '0.75rem', py: 0.5 }}>
                In Discord: Channel Settings → Integrations → Webhooks → New Webhook → Copy Webhook URL.
              </Alert>
              <TextField label="Discord Webhook URL *" value={form.discordWebhookUrl}
                onChange={e => setForm(f => ({ ...f, discordWebhookUrl: e.target.value }))}
                fullWidth size="small" placeholder="https://discord.com/api/webhooks/..." />
            </Box>
          )}

          {/* Custom HTTP */}
          {form.channel === 'custom' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField label="Endpoint URL *" value={form.customUrl}
                onChange={e => setForm(f => ({ ...f, customUrl: e.target.value }))}
                fullWidth size="small" placeholder="https://your-server.com/webhook" />
              <FormControl fullWidth size="small">
                <InputLabel>HTTP Method</InputLabel>
                <Select label="HTTP Method" value={form.customMethod}
                  onChange={e => setForm(f => ({ ...f, customMethod: e.target.value }))}>
                  <MenuItem value="POST">POST</MenuItem>
                  <MenuItem value="PUT">PUT</MenuItem>
                  <MenuItem value="PATCH">PATCH</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}

          {/* Events */}
          <Box>
            <Typography variant="subtitle2" gutterBottom fontWeight="bold">
              Trigger on Events *
            </Typography>
            <FormGroup>
              <Grid container>
                {ALL_EVENTS.map((event) => (
                  <Grid item xs={12} sm={6} key={event}>
                    <FormControlLabel
                      control={<Checkbox size="small" checked={form.events.includes(event)} onChange={() => toggleEvent(event)} />}
                      label={<Typography variant="caption">{EVENT_LABELS[event]}</Typography>}
                    />
                  </Grid>
                ))}
              </Grid>
            </FormGroup>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, borderTop: '1px solid rgba(255,255,255,0.08)', pt: 1.5 }}>
          <Button onClick={closeDialog} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}
            disabled={!form.name || !form.events.length || saving}
            sx={{ background: 'linear-gradient(135deg, #6366f1, #2AABEE)', minWidth: 120 }}>
            {saving ? <CircularProgress size={18} color="inherit" /> : editingId ? 'Save Changes' : 'Add Webhook'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast */}
      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast(t => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.severity} onClose={() => setToast(t => ({ ...t, open: false }))} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default WebhookDashboard;
