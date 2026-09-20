import React, { useState } from 'react';
import {
  Box, Typography, Tabs, Tab, Card, CardContent, Button, TextField,
  Select, MenuItem, FormControl, InputLabel, Alert, CircularProgress,
  Chip, Table, TableBody, TableCell, TableHead, TableRow, Paper,
  LinearProgress, Grid, List, ListItem, ListItemText, Divider,
  Accordion, AccordionSummary, AccordionDetails, IconButton, Tooltip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from 'axios';

const API = axios.create({ baseURL: '/api', timeout: 30000 });

interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

const SectionCard: React.FC<{ title: string; children: React.ReactNode; action?: React.ReactNode }> = ({ title, children, action }) => (
  <Card sx={{ mb: 3 }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>{title}</Typography>
        {action}
      </Box>
      {children}
    </CardContent>
  </Card>
);

// ─── Tab 1: Competitor Analysis ───
function CompetitorTab() {
  const [niche, setNiche] = useState('tech');
  const [platform, setPlatform] = useState('tiktok');
  const [creators, setCreators] = useState<unknown[]>([]);
  const [strategy, setStrategy] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewComments, setReviewComments] = useState('');

  const analyze = async () => {
    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([
        API.get(`/competitor/creators?niche=${niche}&platform=${platform}`),
        API.post('/competitor/strategy', { niche, platform }),
      ]);
      setCreators(cRes.data.data || []);
      setStrategy(sRes.data.data || null);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <SectionCard title="🔍 Competitor Analysis">
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField label="Niche" value={niche} onChange={e => setNiche(e.target.value)} size="small" />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Platform</InputLabel>
          <Select value={platform} label="Platform" onChange={e => setPlatform(e.target.value)}>
            {['tiktok','instagram','youtube','x','linkedin'].map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={analyze} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : 'Analyze'}
        </Button>
      </Box>
      {creators.length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>Top Creators</Typography>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>Name</TableCell><TableCell>Followers</TableCell>
              <TableCell>Avg Views</TableCell><TableCell>Engagement</TableCell><TableCell>Formats</TableCell>
            </TableRow></TableHead>
            <TableBody>{(creators as Array<Record<string, unknown>>).map((c, i) => (
              <TableRow key={i}>
                <TableCell>{String(c.name)}</TableCell>
                <TableCell>{((c.estimatedFollowers as number) / 1000).toFixed(0)}K</TableCell>
                <TableCell>{((c.avgViews as number) / 1000).toFixed(0)}K</TableCell>
                <TableCell>{String(c.engagementRate)}%</TableCell>
                <TableCell>{(c.viralFormats as string[]).join(', ')}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </Box>
      )}
      {strategy && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>Strategy Recommendations</Typography>
          {((strategy.recommendations as string[]) || []).map((r, i) => (
            <Alert key={i} severity="info" sx={{ mb: 1 }}>{r}</Alert>
          ))}
          <Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>Opportunities</Typography>
          {((strategy.opportunities as string[]) || []).map((o, i) => (
            <Alert key={i} severity="success" sx={{ mb: 1 }}>{o}</Alert>
          ))}
        </Box>
      )}
    </SectionCard>
  );
}

// ─── Tab 2: Content Buckets ───
function ContentBucketsTab() {
  const [slots, setSlots] = useState('20');
  const [buckets, setBuckets] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await API.get('/system/content-buckets');
      setBuckets(res.data.data || []);
    } catch { } finally { setLoading(false); }
  };

  return (
    <SectionCard title="🪣 Content Buckets">
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField label="Total Slots" type="number" value={slots} onChange={e => setSlots(e.target.value)} size="small" sx={{ width: 120 }} />
        <Button variant="contained" onClick={generate} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : 'Generate Plan'}
        </Button>
      </Box>
      {buckets.length > 0 && (
        <Grid container spacing={2}>
          {(buckets as Array<Record<string,unknown>>).map((b, i) => (
            <Grid item xs={12} sm={6} key={i}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={700}>{String(b.label)}</Typography>
                <Typography variant="caption" color="text.secondary">{String(b.description)}</Typography>
                <Box sx={{ mt: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption">Current: {String(b.currentPercent)}%</Typography>
                    <Typography variant="caption">Target: {String(b.targetPercent)}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={b.currentPercent as number} sx={{ height: 8, borderRadius: 4 }} />
                </Box>
                <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                  {Math.round((b.targetPercent as number) / 100 * parseInt(slots))} slots of {slots}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </SectionCard>
  );
}

// ─── Tab 3: Resource Monitor ───
function ResourceMonitorTab() {
  const [snapshot, setSnapshot] = useState<Record<string,unknown> | null>(null);
  const [opt, setOpt] = useState<Record<string,unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const [sRes, oRes] = await Promise.all([
        API.get('/system/resource/snapshot'),
        API.get('/system/resource/optimize'),
      ]);
      setSnapshot(sRes.data.data);
      setOpt(oRes.data.data);
    } catch { } finally { setLoading(false); }
  };

  const cpu = (snapshot?.cpu as Record<string,unknown>) || {};
  const mem = (snapshot?.memory as Record<string,unknown>) || {};
  const disk = (snapshot?.disk as Record<string,unknown>) || {};

  return (
    <SectionCard title="🖥️ Resource Monitor" action={
      <Button size="small" startIcon={<RefreshIcon />} onClick={refresh} disabled={loading}>Refresh</Button>
    }>
      <Button variant="contained" onClick={refresh} disabled={loading} sx={{ mb: 3 }}>
        {loading ? <CircularProgress size={20} /> : 'Get Snapshot'}
      </Button>
      {snapshot && (
        <Grid container spacing={3}>
          {[
            { label: 'CPU Usage', value: cpu.usagePercent as number, detail: `${cpu.cores} cores · Load: ${cpu.loadAvg1m}` },
            { label: 'Memory Usage', value: mem.usagePercent as number, detail: `${mem.usedMb}MB / ${mem.totalMb}MB` },
            { label: 'Disk Usage', value: disk.usagePercent as number, detail: `${disk.usedMb}MB / ${disk.totalMb}MB` },
          ].map((item, i) => (
            <Grid item xs={12} md={4} key={i}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>{item.label}</Typography>
                <Typography variant="h4" fontWeight={800} color={(item.value || 0) > 80 ? 'error.main' : 'primary.main'}>
                  {item.value || 0}%
                </Typography>
                <LinearProgress
                  variant="determinate" value={item.value || 0}
                  color={(item.value || 0) > 80 ? 'error' : 'primary'}
                  sx={{ height: 10, borderRadius: 5, my: 1 }}
                />
                <Typography variant="caption" color="text.secondary">{item.detail}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
      {opt && (
        <Box sx={{ mt: 3 }}>
          <Alert severity={(opt.priority as string) === 'critical' ? 'error' : (opt.priority as string) === 'high' ? 'warning' : 'success'}>
            Priority: <strong>{String(opt.priority)}</strong>
            <List dense disablePadding>
              {((opt.recommendations as string[]) || []).map((r, i) => <ListItem key={i} disablePadding><ListItemText primary={r} /></ListItem>)}
            </List>
          </Alert>
        </Box>
      )}
    </SectionCard>
  );
}

// ─── Tab 4: Export / Backup ───
function ExportTab() {
  const [exports, setExports] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<string>('full_backup');

  const doExport = async () => {
    setLoading(true);
    try {
      await API.post('/system/export', { type, format: 'json' });
      const res = await API.get('/system/export/list');
      setExports(res.data.data || []);
    } catch { } finally { setLoading(false); }
  };

  const loadExports = async () => {
    const res = await API.get('/system/export/list');
    setExports(res.data.data || []);
  };

  return (
    <SectionCard title="📦 Export / Backup" action={<Button size="small" onClick={loadExports}>Load History</Button>}>
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Export Type</InputLabel>
          <Select value={type} label="Export Type" onChange={e => setType(e.target.value)}>
            {['full_backup','content','analytics','settings'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={doExport} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : 'Export Now'}
        </Button>
        <Button variant="outlined" onClick={() => API.post('/system/export/backup').then(loadExports)}>
          Full Backup
        </Button>
      </Box>
      {exports.length > 0 && (
        <Table size="small">
          <TableHead><TableRow>
            <TableCell>ID</TableCell><TableCell>Type</TableCell>
            <TableCell>Format</TableCell><TableCell>Status</TableCell>
            <TableCell>Size</TableCell><TableCell>Created</TableCell>
          </TableRow></TableHead>
          <TableBody>{(exports as Array<Record<string,unknown>>).map((e, i) => (
            <TableRow key={i}>
              <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{String(e.id).slice(-12)}</TableCell>
              <TableCell>{String(e.type)}</TableCell>
              <TableCell>{String(e.format)}</TableCell>
              <TableCell>
                <Chip label={String(e.status)} size="small"
                  color={e.status === 'completed' ? 'success' : e.status === 'failed' ? 'error' : 'warning'} />
              </TableCell>
              <TableCell>{String(e.totalSizeMb)}MB</TableCell>
              <TableCell>{new Date(e.createdAt as string).toLocaleString()}</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      )}
    </SectionCard>
  );
}

// ─── Tab 5: Auth / Tenant Management ───
function AuthTab() {
  const [tenants, setTenants] = useState<unknown[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState('free');
  const [newKey, setNewKey] = useState('');
  const [loading, setLoading] = useState(false);

  const loadTenants = async () => {
    const res = await API.get('/system/auth/tenants');
    setTenants(res.data.data || []);
  };

  const register = async () => {
    if (!name || !email) return;
    setLoading(true);
    try {
      const res = await API.post('/system/auth/register', { name, email, plan });
      setNewKey(res.data.data?.plainApiKey || '');
      setName(''); setEmail('');
      await loadTenants();
    } catch { } finally { setLoading(false); }
  };

  return (
    <SectionCard title="🔐 Authentication — Tenant Management" action={<Button size="small" onClick={loadTenants}>Load Tenants</Button>}>
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField label="Name" value={name} onChange={e => setName(e.target.value)} size="small" />
        <TextField label="Email" value={email} onChange={e => setEmail(e.target.value)} size="small" sx={{ minWidth: 220 }} />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Plan</InputLabel>
          <Select value={plan} label="Plan" onChange={e => setPlan(e.target.value)}>
            {['free','pro','enterprise'].map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={register} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : 'Register Tenant'}
        </Button>
      </Box>
      {newKey && (
        <Alert severity="success" sx={{ mb: 2 }}>
          New API Key (save it now): <strong style={{ fontFamily: 'monospace' }}>{newKey}</strong>
        </Alert>
      )}
      {tenants.length > 0 && (
        <Table size="small">
          <TableHead><TableRow>
            <TableCell>Name</TableCell><TableCell>Email</TableCell>
            <TableCell>Plan</TableCell><TableCell>Status</TableCell><TableCell>Created</TableCell>
          </TableRow></TableHead>
          <TableBody>{(tenants as Array<Record<string,unknown>>).map((t, i) => (
            <TableRow key={i}>
              <TableCell>{String(t.name)}</TableCell>
              <TableCell>{String(t.email)}</TableCell>
              <TableCell><Chip label={String(t.plan)} size="small" color="primary" /></TableCell>
              <TableCell><Chip label={String(t.status)} size="small" color={t.status === 'active' ? 'success' : 'error'} /></TableCell>
              <TableCell>{new Date(t.createdAt as string).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      )}
    </SectionCard>
  );
}

// ─── Tab 6: Credentials ───
function CredentialsTab() {
  const [creds, setCreds] = useState<unknown[]>([]);
  const [expiring, setExpiring] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('youtube');
  const [type, setType] = useState('oauth_token');
  const [value, setValue] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [cRes, eRes] = await Promise.all([
        API.get('/system/credentials'),
        API.get('/system/credentials/expiring?days=30'),
      ]);
      setCreds(cRes.data.data || []);
      setExpiring(eRes.data.data || []);
    } catch { } finally { setLoading(false); }
  };

  const add = async () => {
    if (!name || !value) return;
    await API.post('/system/credentials', { name, platform, type, value });
    setName(''); setValue('');
    await load();
  };

  const rotate = async (id: string) => {
    const newVal = prompt('Enter new credential value:');
    if (!newVal) return;
    await API.post(`/system/credentials/${id}/rotate`, { newValue: newVal });
    await load();
  };

  const schedule = async () => {
    const res = await API.post('/system/credentials/schedule');
    alert(`Scheduled ${res.data.data?.length || 0} rotations`);
  };

  return (
    <SectionCard title="🔑 Credential Rotation" action={
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button size="small" onClick={schedule}>Schedule</Button>
        <Button size="small" onClick={load} startIcon={<RefreshIcon />}>Refresh</Button>
      </Box>
    }>
      {expiring.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {expiring.length} credential(s) expiring soon!
        </Alert>
      )}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField label="Name" value={name} onChange={e => setName(e.target.value)} size="small" />
        <TextField label="Platform" value={platform} onChange={e => setPlatform(e.target.value)} size="small" sx={{ width: 120 }} />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Type</InputLabel>
          <Select value={type} label="Type" onChange={e => setType(e.target.value)}>
            {['oauth_token','api_key','webhook_secret','jwt_secret','refresh_token'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField label="Value" value={value} onChange={e => setValue(e.target.value)} size="small" type="password" />
        <Button variant="contained" onClick={add}>Add</Button>
        <Button variant="outlined" onClick={load} disabled={loading}>Load All</Button>
      </Box>
      {creds.length > 0 && (
        <Table size="small">
          <TableHead><TableRow>
            <TableCell>Name</TableCell><TableCell>Platform</TableCell>
            <TableCell>Type</TableCell><TableCell>Status</TableCell>
            <TableCell>Next Rotation</TableCell><TableCell>Action</TableCell>
          </TableRow></TableHead>
          <TableBody>{(creds as Array<Record<string,unknown>>).map((c, i) => (
            <TableRow key={i}>
              <TableCell>{String(c.name)}</TableCell>
              <TableCell>{String(c.platform)}</TableCell>
              <TableCell><Chip label={String(c.type)} size="small" /></TableCell>
              <TableCell><Chip label={String(c.status)} size="small" color={c.status === 'active' ? 'success' : c.status === 'expired' ? 'error' : 'warning'} /></TableCell>
              <TableCell>{c.nextRotationAt ? new Date(c.nextRotationAt as string).toLocaleDateString() : '—'}</TableCell>
              <TableCell><Button size="small" variant="outlined" onClick={() => rotate(c.id as string)}>Rotate</Button></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      )}
    </SectionCard>
  );
}

// ─── Tab 7: Trend Hijack ───
function TrendHijackTab() {
  const [topic, setTopic] = useState('');
  const [niche, setNiche] = useState('tech');
  const [platform, setPlatform] = useState('tiktok');
  const [result, setResult] = useState<Record<string,unknown> | null>(null);
  const [formats, setFormats] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);

  const hijack = async () => {
    if (!topic) return;
    setLoading(true);
    try {
      const res = await API.post('/engines/trend-hijack', { topic, niche, platform });
      setResult(res.data.data);
    } catch { } finally { setLoading(false); }
  };

  const loadFormats = async () => {
    const res = await API.get('/engines/trend-hijack/formats');
    setFormats(res.data.data || []);
  };

  return (
    <SectionCard title="🚀 Trend Hijacking Engine">
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField label="Topic" value={topic} onChange={e => setTopic(e.target.value)} size="small" sx={{ minWidth: 220 }} />
        <TextField label="Niche" value={niche} onChange={e => setNiche(e.target.value)} size="small" />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Platform</InputLabel>
          <Select value={platform} label="Platform" onChange={e => setPlatform(e.target.value)}>
            {['tiktok','instagram','youtube','x','linkedin'].map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={hijack} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : 'Hijack Trend'}
        </Button>
        <Button variant="outlined" onClick={loadFormats}>View Formats</Button>
      </Box>
      {result && (
        <Box>
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Hijacked Hook:</Typography>
            <Typography variant="h6" fontWeight={700}>"{String(result.hijackedHook)}"</Typography>
          </Alert>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip label={`Format: ${result.formatSuggestion}`} color="primary" />
            <Chip label={`Confidence: ${result.confidence}%`} color={result.confidence as number > 70 ? 'success' : 'warning'} />
            {result.isEvergreen ? <Chip label="Evergreen" color="info" /> : null}
            {result.audioTrend ? <Chip label={`🎵 ${result.audioTrend}`} variant="outlined" /> : null}
          </Box>
        </Box>
      )}
      {formats.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>Available Formats</Typography>
          <Grid container spacing={2}>
            {(formats as Array<Record<string,unknown>>).map((f, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700}>{String(f.name)}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{String(f.template)}</Typography>
                  <Chip label={`${f.engagementMultiplier}x engagement`} size="small" color="primary" />
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </SectionCard>
  );
}

// ─── Tab 8: A/B Testing ───
function ABTestTab() {
  const [tests, setTests] = useState<unknown[]>([]);
  const [name, setName] = useState('');
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const loadTests = async () => {
    const res = await API.get('/abtesting');
    setTests(res.data.data || []);
  };

  const createTest = async () => {
    if (!name) return;
    setLoading(true);
    try {
      await API.post('/abtesting', { name });
      setName('');
      await loadTests();
    } catch { } finally { setLoading(false); }
  };

  const analyze = async (id: string) => {
    const res = await API.get(`/abtesting/${id}/analyze`);
    setAnalysis(res.data.data);
  };

  return (
    <SectionCard title="🧪 A/B Testing Engine" action={<Button size="small" onClick={loadTests}>Load Tests</Button>}>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField label="Test Name" value={name} onChange={e => setName(e.target.value)} size="small" sx={{ minWidth: 250 }} />
        <Button variant="contained" onClick={createTest} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : 'Create Test'}
        </Button>
      </Box>
      {analysis && (
        <Alert severity={analysis.significant ? 'success' : 'info'} sx={{ mb: 2 }}>
          {analysis.significant
            ? `Winner: ${analysis.winner} (${analysis.confidence}% confidence, +${analysis.relativeLift}% lift)`
            : `Not significant yet — need more data (${analysis.confidence}% confidence so far)`}
        </Alert>
      )}
      {tests.length > 0 && (
        <Table size="small">
          <TableHead><TableRow>
            <TableCell>Name</TableCell><TableCell>Status</TableCell>
            <TableCell>Variants</TableCell><TableCell>Sample</TableCell>
            <TableCell>Winner</TableCell><TableCell>Actions</TableCell>
          </TableRow></TableHead>
          <TableBody>{(tests as Array<Record<string,unknown>>).map((t, i) => (
            <TableRow key={i}>
              <TableCell>{String(t.name)}</TableCell>
              <TableCell><Chip label={String(t.status)} size="small" color={t.status === 'running' ? 'success' : t.status === 'concluded' ? 'primary' : 'default'} /></TableCell>
              <TableCell>{((t.variants as unknown[]) || []).length}</TableCell>
              <TableCell>{String(t.sampleSize)}</TableCell>
              <TableCell>{t.winner ? <Chip label="Has winner" size="small" color="success" /> : '—'}</TableCell>
              <TableCell>
                <Button size="small" onClick={() => analyze(t.id as string)}>Analyze</Button>
              </TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      )}
    </SectionCard>
  );
}

// ─── Tab 9: Approval Queue ───
function ApprovalTab() {
  const [items, setItems] = useState<unknown[]>([]);
  const [title, setTitle] = useState('');
  const [submittedBy, setSubmittedBy] = useState('admin');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const res = await API.get('/approval/queue');
    setItems(res.data.data || []);
  };

  const submit = async () => {
    if (!title) return;
    setLoading(true);
    try {
      await API.post('/approval/queue/submit', {
        contentId: `content_${Date.now()}`,
        contentType: 'video',
        title, submittedBy,
      });
      setTitle('');
      await load();
    } catch { } finally { setLoading(false); }
  };

  const autoCheck = async (id: string) => {
    await API.post(`/approval/queue/${id}/auto-check`);
    await load();
  };

  const review = async (id: string, status: string) => {
    await API.post(`/approval/queue/${id}/review`, { status, reviewedBy: 'admin', comments: reviewComments || undefined });
    setReviewComments('');
    await API.post(`/approval/queue/${id}/review`, { status, reviewedBy: 'admin' });
    await load();
  };

  return (
    <SectionCard title="✅ Approval Queue" action={<Button size="small" onClick={load}>Refresh</Button>}>
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField label="Content Title" value={title} onChange={e => setTitle(e.target.value)} size="small" sx={{ minWidth: 280 }} />
        <TextField label="Submitted By" value={submittedBy} onChange={e => setSubmittedBy(e.target.value)} size="small" />
        <TextField label="Reviewer comments" value={reviewComments} onChange={e => setReviewComments(e.target.value)} size="small" sx={{ minWidth: 300 }} placeholder="Explain approval, rejection, or revision" />
        <Button variant="contained" onClick={submit} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : 'Submit for Approval'}
        </Button>
      </Box>
      {items.map((item, i) => {
        const it = item as Record<string, unknown>;
        return (
          <Accordion key={i}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', width: '100%' }}>
                <Typography sx={{ flexGrow: 1 }}>{String(it.title)}</Typography>
                <Chip label={String(it.status)} size="small"
                  color={it.status === 'approved' ? 'success' : it.status === 'rejected' ? 'error' : it.status === 'needs_revision' ? 'warning' : 'default'} />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="caption">Submitted by {String(it.submittedBy)} · {new Date(it.submittedAt as string).toLocaleString()}</Typography>
              <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button size="small" variant="outlined" onClick={() => autoCheck(it.id as string)}>Auto Check</Button>
                <Button size="small" variant="contained" color="success" onClick={() => review(it.id as string, 'approved')}>Approve</Button>
                <Button size="small" variant="contained" color="error" onClick={() => review(it.id as string, 'rejected')}>Reject</Button>
                <Button size="small" variant="outlined" color="warning" onClick={() => review(it.id as string, 'needs_revision')}>Needs Revision</Button>
              </Box>
              {it.comments ? <Alert severity="info" sx={{ mt: 1 }}>{String(it.comments)}</Alert> : null}
              {Array.isArray(it.reviewHistory) && it.reviewHistory.length > 0 ? (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" fontWeight={700}>Review history</Typography>
                  {(it.reviewHistory as Array<Record<string, unknown>>).slice(-5).map((entry, index) => (
                    <Typography key={index} variant="caption" display="block" color="text.secondary">
                      {String(entry.action)} · {String(entry.actor)} · {new Date(String(entry.at)).toLocaleString()}{entry.comments ? ` — ${String(entry.comments)}` : ''}
                    </Typography>
                  ))}
                </Box>
              ) : null}
            </AccordionDetails>
          </Accordion>
        );
      })}
    </SectionCard>
  );
}

// ─── Tab 10: Moderation ───
function ModerationTab() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const scan = async () => {
    if (!text) return;
    setLoading(true);
    try {
      const res = await API.post('/approval/moderate', { text });
      setResult(res.data.data);
    } catch { } finally { setLoading(false); }
  };

  return (
    <SectionCard title="🛡️ Moderation Scanner">
      <TextField
        label="Content to Scan" multiline rows={5} fullWidth value={text}
        onChange={e => setText(e.target.value)} sx={{ mb: 2 }}
        placeholder="Paste video script, caption, or any content here..."
      />
      <Button variant="contained" onClick={scan} disabled={loading}>
        {loading ? <CircularProgress size={20} /> : 'Scan Content'}
      </Button>
      {result && (
        <Box sx={{ mt: 3 }}>
          <Alert severity={result.passed ? (result.flags as unknown[])?.length > 0 ? 'warning' : 'success' : 'error'} sx={{ mb: 2 }}>
            <strong>{result.passed ? 'PASSED' : 'FAILED'}</strong> — Score: {String(result.score)}/100 — {String(result.recommendation)}
          </Alert>
          {((result.flags as unknown[]) || []).map((flag, i) => {
            const f = flag as Record<string, unknown>;
            return (
              <Alert key={i} severity={f.severity === 'critical' ? 'error' : f.severity === 'high' ? 'error' : f.severity === 'medium' ? 'warning' : 'info'} sx={{ mb: 1 }}>
                <strong>{String(f.rule)}</strong>: {String(f.description)} — Matches: {(f.matches as string[]).join(', ')}
              </Alert>
            );
          })}
          {((result.suggestedActions as string[]) || []).map((a, i) => (
            <Alert key={i} severity="info" sx={{ mb: 1 }}>💡 {a}</Alert>
          ))}
        </Box>
      )}
    </SectionCard>
  );
}

// ─── Tab 11: Validation ───
function ValidationTab() {
  const [platform, setPlatform] = useState('tiktok');
  const [duration, setDuration] = useState('30');
  const [title, setTitle] = useState('My awesome video');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = async () => {
    setLoading(true);
    try {
      const res = await API.post('/approval/validate/video', {
        platform, durationSec: parseInt(duration),
        title, hasTitle: true, hasAudio: true, hasCaptions: false,
        aspectRatio: '9:16',
      });
      setResult(res.data.data);
    } catch { } finally { setLoading(false); }
  };

  return (
    <SectionCard title="✔️ Pre-Publish Validation">
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Platform</InputLabel>
          <Select value={platform} label="Platform" onChange={e => setPlatform(e.target.value)}>
            {['tiktok','instagram','youtube','youtube_shorts','linkedin','facebook','x'].map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField label="Duration (sec)" type="number" value={duration} onChange={e => setDuration(e.target.value)} size="small" sx={{ width: 130 }} />
        <TextField label="Title" value={title} onChange={e => setTitle(e.target.value)} size="small" sx={{ minWidth: 250 }} />
        <Button variant="contained" onClick={validate} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : 'Validate'}
        </Button>
      </Box>
      {result && (
        <Box>
          <Alert severity={result.valid ? 'success' : 'error'} sx={{ mb: 2 }}>
            Score: {String(result.score)}/100 — {String(result.summary)}
          </Alert>
          {((result.issues as unknown[]) || []).map((issue, i) => {
            const iss = issue as Record<string, unknown>;
            return (
              <Alert key={i} severity={iss.severity as 'error' | 'warning' | 'info'} sx={{ mb: 1 }}>
                <strong>{String(iss.field)}</strong>: {String(iss.message)}
                {iss.suggestion ? <Typography variant="caption" display="block">💡 {String(iss.suggestion)}</Typography> : null}
              </Alert>
            );
          })}
        </Box>
      )}
    </SectionCard>
  );
}

// ─── Tab 12: Knowledge Base ───
function KnowledgeBaseTab() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (category) params.set('category', category);
      const res = await API.get(`/system/knowledgebase?${params}`);
      const data = res.data.data || [];
      setResults(query ? data.map((r: Record<string, unknown>) => r.rule || r) : data);
    } catch { } finally { setLoading(false); }
  };

  return (
    <SectionCard title="📖 Creator Knowledge Base">
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField label="Search" value={query} onChange={e => setQuery(e.target.value)} size="small" sx={{ minWidth: 250 }}
          onKeyDown={e => e.key === 'Enter' && search()} />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Category</InputLabel>
          <Select value={category} label="Category" onChange={e => setCategory(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {['hook_writing','script_structure','editing','thumbnails','captions','hashtags','posting_strategy','engagement','platform_specific','monetization','growth'].map(c => (
              <MenuItem key={c} value={c}>{c.replace(/_/g, ' ')}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={search} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : 'Search'}
        </Button>
      </Box>
      {results.length > 0 ? results.map((rule, i) => {
        const r = rule as Record<string, unknown>;
        return (
          <Accordion key={i} defaultExpanded={i === 0}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
                <Typography fontWeight={700}>{String(r.title)}</Typography>
                <Chip label={String(r.category).replace(/_/g, ' ')} size="small" />
                <Chip label={`⭐ ${r.rating}`} size="small" color="warning" />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" sx={{ mb: 2 }}>{String(r.description)}</Typography>
              {r.doList ? (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" color="success.main">✅ Do</Typography>
                  {(r.doList as string[]).map((d, j) => <Typography key={j} variant="body2">• {d}</Typography>)}
                </Box>
              ) : null}
              {r.dontList ? (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" color="error.main">❌ Don't</Typography>
                  {(r.dontList as string[]).map((d, j) => <Typography key={j} variant="body2">• {d}</Typography>)}
                </Box>
              ) : null}
              {r.examples ? (
                <Box>
                  <Typography variant="subtitle2" color="info.main">💡 Examples</Typography>
                  {(r.examples as string[]).map((e, j) => <Typography key={j} variant="body2" sx={{ fontStyle: 'italic' }}>"{e}"</Typography>)}
                </Box>
              ) : null}
            </AccordionDetails>
          </Accordion>
        );
      }) : (
        <Alert severity="info">Search or load rules to see the knowledge base</Alert>
      )}
    </SectionCard>
  );
}

// ─── Tab 13: Throttling ───
function ThrottlingTab() {
  const [tenantId, setTenantId] = useState('default-tenant');
  const [quotas, setQuotas] = useState<unknown[]>([]);
  const [checkResult, setCheckResult] = useState<Record<string, unknown> | null>(null);

  const load = async () => {
    const res = await API.get('/system/throttle/quotas');
    setQuotas(res.data.data || []);
  };

  const check = async () => {
    const res = await API.post('/system/throttle/check', { tenantId });
    setCheckResult(res.data.data);
  };

  return (
    <SectionCard title="⚡ Rate Limiting & Throttling" action={<Button size="small" onClick={load}>Load All Quotas</Button>}>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField label="Tenant ID" value={tenantId} onChange={e => setTenantId(e.target.value)} size="small" />
        <Button variant="contained" onClick={check}>Check Quota</Button>
      </Box>
      {checkResult && (
        <Alert severity={checkResult.allowed ? 'success' : 'error'} sx={{ mb: 2 }}>
          {checkResult.allowed ? 'Request allowed' : `Blocked: ${checkResult.reason}`}
          {checkResult.retryAfterMs ? ` — Retry after ${Math.round((checkResult.retryAfterMs as number) / 1000)}s` : null}
        </Alert>
      )}
      {quotas.length > 0 && (
        <Table size="small">
          <TableHead><TableRow>
            <TableCell>Tenant</TableCell><TableCell>Plan</TableCell>
            <TableCell>Req/min Used</TableCell><TableCell>Videos Today</TableCell>
            <TableCell>Req/day Used</TableCell>
          </TableRow></TableHead>
          <TableBody>{(quotas as Array<Record<string,unknown>>).map((q, i) => {
            const usage = q.usage as Record<string,unknown>;
            const limits = q.limits as Record<string,unknown>;
            return (
              <TableRow key={i}>
                <TableCell sx={{ fontFamily: 'monospace' }}>{String(q.tenantId).slice(0, 20)}</TableCell>
                <TableCell><Chip label={String(q.plan)} size="small" color="primary" /></TableCell>
                <TableCell>{String(usage?.requestsThisMinute)}/{String(limits?.requestsPerMinute)}</TableCell>
                <TableCell>{String(usage?.videosThisDay)}/{String(limits?.videosPerDay)}</TableCell>
                <TableCell>{String(usage?.requestsThisDay)}/{String(limits?.requestsPerDay)}</TableCell>
              </TableRow>
            );
          })}</TableBody>
        </Table>
      )}
    </SectionCard>
  );
}

// ─── Tab 14: Asset Library ───
function AssetLibraryTab() {
  const [assets, setAssets] = useState<unknown[]>([]);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState<string>('image');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [aRes, sRes] = await Promise.all([API.get('/system/assets'), API.get('/system/assets/stats')]);
      setAssets(aRes.data.data || []);
      setStats(sRes.data.data);
    } catch { } finally { setLoading(false); }
  };

  const add = async () => {
    if (!name) return;
    await API.post('/system/assets', {
      name, type: assetType, filePath: `/assets/${name}`,
      tags: [assetType], sizeMb: 0,
    });
    setName('');
    await load();
  };

  const byType = stats?.byType as Record<string, number> || {};

  return (
    <SectionCard title="🗂️ Asset Library" action={<Button size="small" onClick={load} startIcon={<RefreshIcon />}>Refresh</Button>}>
      {stats && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Chip label={`Total: ${stats.total}`} color="primary" />
          <Chip label={`Size: ${stats.totalSizeMb}MB`} />
          {Object.entries(byType).map(([type, count]) => (
            <Chip key={type} label={`${type}: ${count}`} variant="outlined" />
          ))}
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField label="Asset Name" value={name} onChange={e => setName(e.target.value)} size="small" sx={{ minWidth: 200 }} />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Type</InputLabel>
          <Select value={assetType} label="Type" onChange={e => setAssetType(e.target.value)}>
            {['video','image','audio','music','overlay','font','other'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={add}>Add Asset</Button>
        <Button variant="outlined" onClick={load} disabled={loading}>Load Assets</Button>
      </Box>
      {assets.length > 0 && (
        <Table size="small">
          <TableHead><TableRow>
            <TableCell>Name</TableCell><TableCell>Type</TableCell>
            <TableCell>Tags</TableCell><TableCell>Used</TableCell><TableCell>Size</TableCell>
          </TableRow></TableHead>
          <TableBody>{(assets as Array<Record<string,unknown>>).map((a, i) => (
            <TableRow key={i}>
              <TableCell>{String(a.name)}</TableCell>
              <TableCell><Chip label={String(a.type)} size="small" /></TableCell>
              <TableCell>{(a.tags as string[]).map(t => <Chip key={t} label={t} size="small" sx={{ mr: 0.5 }} />)}</TableCell>
              <TableCell>{String(a.useCount)}</TableCell>
              <TableCell>{String(a.sizeMb)}MB</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      )}
    </SectionCard>
  );
}

// ─── Tab 15: Marketing ───
function MarketingEngineTab() {
  const [url, setUrl] = useState('https://example.com');
  const [niche, setNiche] = useState('tech');
  const [platform, setPlatform] = useState('tiktok');
  const [banners, setBanners] = useState<unknown[]>([]);
  const [campaign, setCampaign] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const genBanners = async () => {
    setLoading(true);
    try {
      const res = await API.post('/system/marketing-engine/banners', { url });
      setBanners(res.data.data || []);
    } catch { } finally { setLoading(false); }
  };

  const genCampaign = async () => {
    setLoading(true);
    try {
      const res = await API.post('/system/marketing-engine/campaign', { niche, platform, goal: 'grow audience' });
      setCampaign(res.data.data);
    } catch { } finally { setLoading(false); }
  };

  return (
    <SectionCard title="📣 Marketing Engine">
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField label="Website URL" value={url} onChange={e => setUrl(e.target.value)} size="small" sx={{ minWidth: 250 }} />
        <Button variant="contained" onClick={genBanners} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : 'Generate Banners'}
        </Button>
      </Box>
      {banners.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {(banners as Array<Record<string, unknown>>).filter(b => (b.height as number) > 90).slice(0, 3).map((b, i) => (
            <Grid item xs={12} sm={6} key={i}>
              <Paper sx={{ p: 1 }}>
                <Typography variant="caption" display="block">{String(b.type)} — {String(b.width)}×{String(b.height)}</Typography>
                <Box dangerouslySetInnerHTML={{ __html: (b.svgMarkup as string) || '' }} sx={{ mt: 1, '& svg': { maxWidth: '100%', height: 'auto' } }} />
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
      <Divider sx={{ my: 3 }} />
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField label="Niche" value={niche} onChange={e => setNiche(e.target.value)} size="small" />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Platform</InputLabel>
          <Select value={platform} label="Platform" onChange={e => setPlatform(e.target.value)}>
            {['tiktok','instagram','youtube','linkedin','x'].map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="outlined" onClick={genCampaign} disabled={loading}>Generate Campaign Plan</Button>
      </Box>
      {campaign && (
        <Box>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>{String(campaign.title)}</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>{String(campaign.targetAudience)}</Typography>
          <Typography variant="subtitle2" gutterBottom>Hooks:</Typography>
          {((campaign.hooks as string[]) || []).map((h, i) => <Alert key={i} severity="info" sx={{ mb: 1 }}>{h}</Alert>)}
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>Messaging:</Typography>
          {((campaign.messaging as string[]) || []).map((m, i) => <Typography key={i} variant="body2">• {m}</Typography>)}
          <Chip label={campaign.postingSchedule as string} sx={{ mt: 1, mr: 1 }} />
          <Chip label={campaign.expectedReach as string} color="primary" sx={{ mt: 1 }} />
        </Box>
      )}
    </SectionCard>
  );
}

// ─── Tab 16: System Health / Error Recovery ───
function SystemHealthTab() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [dlq, setDlq] = useState<unknown[]>([]);
  const [errors, setErrors] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<string>('render');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [sRes, dRes, eRes] = await Promise.all([
        API.get('/system/errorrecovery/stats'),
        API.get('/system/errorrecovery/deadletter'),
        API.get('/system/errorrecovery'),
      ]);
      setStats(sRes.data.data);
      setDlq(dRes.data.data || []);
      setErrors(eRes.data.data || []);
    } catch { } finally { setLoading(false); }
  };

  const recordError = async () => {
    if (!message) return;
    await API.post('/system/errorrecovery/record', { category, message });
    setMessage('');
    await load();
  };

  const processQueue = async () => {
    const res = await API.post('/system/errorrecovery/process');
    alert(`Processed ${res.data.data?.processed || 0} queued errors`);
    await load();
  };

  const clearResolved = async () => {
    await API.post('/system/errorrecovery/clear');
    await load();
  };

  const byStatus = stats?.byStatus as Record<string, number> || {};
  const byCategory = stats?.byCategory as Record<string, number> || {};

  return (
    <SectionCard title="🔧 System Health — Error Recovery" action={
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button size="small" onClick={processQueue}>Process Queue</Button>
        <Button size="small" onClick={clearResolved}>Clear Resolved</Button>
        <Button size="small" onClick={load} startIcon={<RefreshIcon />}>Refresh</Button>
      </Box>
    }>
      {stats && (
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            {[
              { label: 'Total Errors', value: stats.total, color: 'text.primary' },
              { label: 'Dead Letter', value: stats.deadLetterCount, color: 'error.main' },
              { label: 'Queued', value: byStatus.queued || 0, color: 'warning.main' },
              { label: 'Recovered', value: byStatus.recovered || 0, color: 'success.main' },
            ].map((item, i) => (
              <Grid item xs={6} sm={3} key={i}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight={800} color={item.color}>{String(item.value)}</Typography>
                  <Typography variant="caption">{item.label}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {Object.entries(byCategory).map(([cat, count]) => (
              <Chip key={cat} label={`${cat}: ${count}`} size="small" variant="outlined" />
            ))}
          </Box>
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Category</InputLabel>
          <Select value={category} label="Category" onChange={e => setCategory(e.target.value)}>
            {['render','publish','tts','asset_fetch','export','api','general'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField label="Error Message" value={message} onChange={e => setMessage(e.target.value)} size="small" sx={{ minWidth: 250 }} />
        <Button variant="outlined" color="error" onClick={recordError}>Record Test Error</Button>
      </Box>
      {dlq.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="error" gutterBottom>Dead Letter Queue ({dlq.length})</Typography>
          {(dlq as Array<Record<string, unknown>>).slice(0, 5).map((e, i) => (
            <Alert key={i} severity="error" sx={{ mb: 1 }}>
              <strong>[{String(e.category)}]</strong> {String(e.message)} — Retried {String(e.retryCount)} times
            </Alert>
          ))}
        </Box>
      )}
      {errors.length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>Recent Errors</Typography>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>Category</TableCell><TableCell>Message</TableCell>
              <TableCell>Status</TableCell><TableCell>Retries</TableCell>
            </TableRow></TableHead>
            <TableBody>{(errors as Array<Record<string, unknown>>).slice(0, 10).map((e, i) => (
              <TableRow key={i}>
                <TableCell><Chip label={String(e.category)} size="small" /></TableCell>
                <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{String(e.message)}</TableCell>
                <TableCell><Chip label={String(e.status)} size="small"
                  color={e.status === 'recovered' ? 'success' : e.status === 'dead' ? 'error' : 'warning'} /></TableCell>
                <TableCell>{String(e.retryCount)}/{String(e.maxRetries)}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </Box>
      )}
    </SectionCard>
  );
}

// ─── Main Page ───
const TABS = [
  { label: '🔍 Competitor', index: 0 },
  { label: '🪣 Buckets', index: 1 },
  { label: '🖥️ Resources', index: 2 },
  { label: '📦 Export', index: 3 },
  { label: '🔐 Auth', index: 4 },
  { label: '🔑 Credentials', index: 5 },
  { label: '🚀 Trend Hijack', index: 6 },
  { label: '🧪 A/B Tests', index: 7 },
  { label: '✅ Approval', index: 8 },
  { label: '🛡️ Moderation', index: 9 },
  { label: '✔️ Validation', index: 10 },
  { label: '📖 Knowledge', index: 11 },
  { label: '⚡ Throttling', index: 12 },
  { label: '🗂️ Assets', index: 13 },
  { label: '📣 Marketing', index: 14 },
  { label: '🔧 System', index: 15 },
];

const EnginesDashboard: React.FC = () => {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Typography variant="h4" fontWeight={800} gutterBottom sx={{ background: 'linear-gradient(135deg, #6366f1, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Engines Dashboard
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        All 60 AI engines — Phase 2 & 3 completion (16 new engine tabs)
      </Typography>
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          {TABS.map(t => <Tab key={t.index} label={t.label} />)}
        </Tabs>
      </Paper>
      <TabPanel value={tab} index={0}><CompetitorTab /></TabPanel>
      <TabPanel value={tab} index={1}><ContentBucketsTab /></TabPanel>
      <TabPanel value={tab} index={2}><ResourceMonitorTab /></TabPanel>
      <TabPanel value={tab} index={3}><ExportTab /></TabPanel>
      <TabPanel value={tab} index={4}><AuthTab /></TabPanel>
      <TabPanel value={tab} index={5}><CredentialsTab /></TabPanel>
      <TabPanel value={tab} index={6}><TrendHijackTab /></TabPanel>
      <TabPanel value={tab} index={7}><ABTestTab /></TabPanel>
      <TabPanel value={tab} index={8}><ApprovalTab /></TabPanel>
      <TabPanel value={tab} index={9}><ModerationTab /></TabPanel>
      <TabPanel value={tab} index={10}><ValidationTab /></TabPanel>
      <TabPanel value={tab} index={11}><KnowledgeBaseTab /></TabPanel>
      <TabPanel value={tab} index={12}><ThrottlingTab /></TabPanel>
      <TabPanel value={tab} index={13}><AssetLibraryTab /></TabPanel>
      <TabPanel value={tab} index={14}><MarketingEngineTab /></TabPanel>
      <TabPanel value={tab} index={15}><SystemHealthTab /></TabPanel>
    </Box>
  );
};

export default EnginesDashboard;
