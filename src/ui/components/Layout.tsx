import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Box, Container, CssBaseline, Toolbar, Typography, Button,
  ThemeProvider, createTheme, IconButton, Drawer, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, Divider, Chip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import VideoIcon from '@mui/icons-material/VideoLibrary';
import AddIcon from '@mui/icons-material/Add';
import ScheduleIcon from '@mui/icons-material/Schedule';
import BarChartIcon from '@mui/icons-material/BarChart';
import PublishIcon from '@mui/icons-material/Publish';
import ScienceIcon from '@mui/icons-material/Science';
import PsychologyAltIcon from '@mui/icons-material/PsychologyAlt';
import BusinessIcon from '@mui/icons-material/Business';
import BuildIcon from '@mui/icons-material/Build';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import BookmarksIcon from '@mui/icons-material/Bookmarks';
import ImageIcon from '@mui/icons-material/Image';
import RecyclingIcon from '@mui/icons-material/Recycling';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PsychologyIcon from '@mui/icons-material/Psychology';
import QueueIcon from '@mui/icons-material/Queue';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import TranslateIcon from '@mui/icons-material/Translate';
import CommentIcon from '@mui/icons-material/Comment';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import BrandingWatermarkIcon from '@mui/icons-material/BrandingWatermark';
import BlockIcon from '@mui/icons-material/Block';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import TuneIcon from '@mui/icons-material/Tune';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import CableIcon from '@mui/icons-material/Cable';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

interface LayoutProps {
  children: React.ReactNode;
}

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#6366f1' },
    secondary: { main: '#f59e0b' },
    background: { default: '#0f172a', paper: '#1e293b' },
  },
  typography: { fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif' },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
    MuiCard: { styleOverrides: { root: { backgroundImage: 'none' } } },
  },
});

const NAV_SECTIONS = [
  {
    title: 'AI Pipeline',
    items: [
      { path: '/auto-mode', label: 'Auto Mode', icon: <AutoAwesomeIcon />, badge: '🤖' },
      { path: '/compare', label: 'Platform Comparison', icon: <CompareArrowsIcon />, badge: 'NEW' },
    ],
  },
  {
    title: 'Content Creation',
    items: [
      { path: '/create', label: 'Create Video', icon: <AddIcon />, badge: 'NEW' },
      { path: '/', label: 'Video Library', icon: <VideoIcon /> },
      { path: '/trends', label: 'Trend Dashboard', icon: <TrendingUpIcon />, badge: '🔥' },
      { path: '/hooks', label: 'Hook Library', icon: <BookmarksIcon /> },
      { path: '/image-generator', label: 'Image Generator', icon: <ImageIcon /> },
      { path: '/image-filters', label: 'Image Filters', icon: <TuneIcon />, badge: 'NEW' },
      { path: '/video-library', label: 'Video Library DB', icon: <LibraryAddIcon />, badge: 'NEW' },
    ],
  },
  {
    title: 'Publishing & Growth',
    items: [
      { path: '/publish', label: 'Publish', icon: <PublishIcon /> },
      { path: '/connectors', label: 'Connectors', icon: <CableIcon />, badge: 'NEW' },
      { path: '/releases', label: 'Releases', icon: <RocketLaunchIcon />, badge: 'NEW' },
      { path: '/profiles', label: 'Client Profiles', icon: <BusinessIcon />, badge: 'NEW' },
      { path: '/scheduler', label: 'Scheduler (Queue)', icon: <ScheduleIcon /> },
      { path: '/schedule-manager', label: 'Schedule Manager', icon: <EventRepeatIcon />, badge: 'NEW' },
      { path: '/queue', label: 'Bulk Queue', icon: <QueueIcon /> },
      { path: '/strategy', label: 'Strategy Center', icon: <PsychologyIcon /> },
      { path: '/recycle', label: 'Content Recycle', icon: <RecyclingIcon /> },
    ],
  },
  {
    title: 'Analytics & AI',
    items: [
      { path: '/analytics', label: 'Analytics', icon: <BarChartIcon /> },
      { path: '/ab-testing', label: 'A/B Tests', icon: <ScienceIcon /> },
      { path: '/ai', label: 'AI Monitor', icon: <PsychologyAltIcon /> },
      { path: '/costs', label: 'Cost Tracker', icon: <AttachMoneyIcon /> },
    ],
  },
  {
    title: 'AI Engines (Phase 7-8)',
    items: [
      { path: '/humanized', label: 'Humanized Content', icon: <BuildIcon />, badge: 'AI' },
      { path: '/thumbnail', label: 'Thumbnail Generator', icon: <BuildIcon />, badge: 'AI' },
      { path: '/editing', label: 'Expert Editing', icon: <BuildIcon />, badge: 'AI' },
      { path: '/visual', label: 'Visual Enhancement', icon: <BuildIcon />, badge: 'AI' },
      { path: '/audio', label: 'Audio Quality', icon: <BuildIcon />, badge: 'AI' },
      { path: '/emotional', label: 'Emotional Resonance', icon: <BuildIcon />, badge: 'AI' },
      { path: '/attention', label: 'Attention Optimizer', icon: <BuildIcon />, badge: 'AI' },
      { path: '/quality', label: 'Quality Scoring', icon: <BuildIcon />, badge: 'AI' },
      { path: '/engagement', label: 'Engagement Prediction', icon: <BuildIcon />, badge: 'AI' },
      { path: '/account', label: 'Account Manager', icon: <BuildIcon />, badge: 'AI' },
    ],
  },
  {
    title: 'Content Tools',
    items: [
      { path: '/translate', label: 'Translation Engine', icon: <TranslateIcon />, badge: 'NEW' },
      { path: '/comment-cta', label: 'Comment CTA', icon: <CommentIcon />, badge: 'NEW' },
      { path: '/series', label: 'Series Builder', icon: <PlaylistAddIcon />, badge: 'NEW' },
      { path: '/watermark', label: 'Watermark Engine', icon: <BrandingWatermarkIcon />, badge: 'NEW' },
      { path: '/shadowban', label: 'Shadowban Detection', icon: <BlockIcon />, badge: 'NEW' },
    ],
  },
  {
    title: 'Engines v13 (Phase 2-3)',
    items: [
      { path: '/engines-dashboard', label: 'All Engines Dashboard', icon: <BuildIcon />, badge: 'v13' },
    ],
  },
  {
    title: 'System',
    items: [
      { path: '/webhooks', label: 'Notifications', icon: <NotificationsActiveIcon /> },
      { path: '/branding', label: 'White-Label Branding', icon: <ColorLensIcon /> },
      { path: '/content-tools', label: 'Content Tools Dashboard', icon: <BuildIcon /> },
      { path: '/mappings', label: 'Category Mapping', icon: <BusinessIcon /> },
      { path: '/health', label: 'Health', icon: <MonitorHeartIcon /> },
      { path: '/tenants', label: 'Tenants', icon: <BusinessIcon /> },
    ],
  },
];

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const handleAuthExpired = () => {
      if (location.pathname !== '/tenants') navigate('/tenants');
    };
    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, [location.pathname, navigate]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar position="sticky" sx={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderBottom: '1px solid rgba(99,102,241,0.3)' }}>
          <Toolbar>
            <IconButton color="inherit" edge="start" onClick={() => setDrawerOpen(true)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }} onClick={() => navigate('/')}>
              <Box sx={{ background: 'linear-gradient(135deg, #6366f1, #f59e0b)', borderRadius: 2, p: 0.5, display: 'flex' }}>
                <VideoIcon sx={{ fontSize: 20 }} />
              </Box>
              <Typography variant="h6" fontWeight="bold" sx={{ background: 'linear-gradient(135deg, #6366f1, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                AI Content Empire
              </Typography>
            </Box>

            <Box sx={{ flexGrow: 1 }} />

            {/* Quick nav bar - most used */}
            <Box sx={{ display: { xs: 'none', lg: 'flex' }, gap: 0.5 }}>
              {[
                { path: '/auto-mode', label: '🤖 Auto Mode' },
                { path: '/compare', label: '⚖️ Compare' },
                { path: '/trends', label: '🔥 Trends' },
                { path: '/create', label: '+ Create' },
                { path: '/scheduler', label: 'Schedule' },
              ].map(({ path, label }) => (
                <Button
                  key={path}
                  color="inherit"
                  size="small"
                  onClick={() => navigate(path)}
                  sx={{ borderRadius: 2, px: 1.5, backgroundColor: isActive(path) ? 'rgba(99,102,241,0.2)' : 'transparent', border: isActive(path) ? '1px solid rgba(99,102,241,0.5)' : '1px solid transparent' }}
                >
                  {label}
                </Button>
              ))}
            </Box>
          </Toolbar>
        </AppBar>

        {/* Side Drawer */}
        <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: 280, background: '#0f172a', borderRight: '1px solid rgba(99,102,241,0.2)' } }}>
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ background: 'linear-gradient(135deg, #6366f1, #f59e0b)', borderRadius: 2, p: 0.5, display: 'flex' }}>
              <VideoIcon sx={{ fontSize: 20 }} />
            </Box>
            <Typography variant="subtitle1" fontWeight="bold" color="white">AI Content Empire</Typography>
          </Box>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

          {NAV_SECTIONS.map((section) => (
            <Box key={section.title}>
              <Typography variant="overline" sx={{ px: 2, py: 1, display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', letterSpacing: 1.5 }}>
                {section.title}
              </Typography>
              <List dense disablePadding>
                {section.items.map(({ path, label, icon, badge }) => (
                  <ListItem key={path} disablePadding>
                    <ListItemButton
                      onClick={() => { navigate(path); setDrawerOpen(false); }}
                      selected={isActive(path)}
                      sx={{ mx: 1, borderRadius: 2, mb: 0.25, '&.Mui-selected': { backgroundColor: 'rgba(99,102,241,0.2)', '& .MuiListItemIcon-root': { color: '#6366f1' } } }}
                    >
                      <ListItemIcon sx={{ minWidth: 36, color: isActive(path) ? '#6366f1' : 'rgba(255,255,255,0.6)' }}>{icon}</ListItemIcon>
                      <ListItemText primary={label} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: isActive(path) ? 600 : 400, color: isActive(path) ? 'white' : 'rgba(255,255,255,0.7)' }} />
                      {badge && <Chip label={badge} size="small" sx={{ height: 18, fontSize: '0.6rem', backgroundColor: 'rgba(245,158,11,0.2)', color: '#f59e0b' }} />}
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
              <Divider sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.05)' }} />
            </Box>
          ))}

          <Box sx={{ p: 2, mt: 'auto' }}>
            <Typography variant="caption" color="rgba(255,255,255,0.3)">v12.0 · AI Content Empire Platform · 60 Engines</Typography>
          </Box>
        </Drawer>

        <Container component="main" maxWidth="xl" sx={{ flexGrow: 1, py: 4 }}>
          {children}
        </Container>

        <Box component="footer" sx={{ py: 2, mt: 'auto', backgroundColor: '#1e293b', borderTop: '1px solid rgba(99,102,241,0.2)', textAlign: 'center' }}>
          <Typography variant="caption" color="rgba(255,255,255,0.4)">
            AI Viral Content Empire v12.0 · {new Date().getFullYear()} · All 60 Engines Active
          </Typography>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default Layout;
