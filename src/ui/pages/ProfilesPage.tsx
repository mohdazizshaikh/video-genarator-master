import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "../services/apiClient";
import {
  Container, Paper, TextField, Button, FormControl, InputLabel,
  Select, MenuItem, Box, Typography, Alert, Stack, Chip,
  Grid, IconButton, Card, CardContent, Divider, Dialog,
  DialogTitle, DialogContent, DialogActions, CircularProgress,
} from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import LinkIcon from "@mui/icons-material/Link";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

const CATEGORIES = [
  "World", "News", "General", "Sports", "Cricket", "NBA", "Technology",
  "Business", "Science", "Entertainment", "Education", "Health", "Finance",
  "Lifestyle", "Motivation", "Travel", "Food", "Religion", "Politics",
  "Culture", "Fashion", "Fitness", "Gaming", "Beauty", "Parenting",
];

const PROVIDERS: { value: string; label: string }[] = [
  { value: "youtube", label: "YouTube" },
  { value: "telegram", label: "Telegram" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "x", label: "X (Twitter)" },
];

const CREDENTIAL_FIELDS: Record<string, string[]> = {
  youtube: ["clientId", "clientSecret", "refreshToken"],
  telegram: ["botToken", "channelId"],
  instagram: ["accessToken", "businessAccountId"],
  facebook: ["accessToken", "pageId"],
  linkedin: ["accessToken", "personUrn"],
  x: ["bearerToken", "apiKey", "apiSecret", "accessToken", "accessSecret"],
};

const CREDENTIAL_LABELS: Record<string, string> = {
  clientId: "Client ID",
  clientSecret: "Client Secret",
  refreshToken: "Refresh Token",
  botToken: "Bot Token",
  channelId: "Channel ID",
  accessToken: "Access Token",
  businessAccountId: "Instagram Business Account ID",
  pageId: "Facebook Page ID",
  personUrn: "LinkedIn Person URN",
  bearerToken: "Bearer Token",
  apiKey: "API Key",
  apiSecret: "API Secret",
  accessSecret: "Access Secret",
};

interface ProfileSummary {
  id: string;
  name: string;
  description?: string;
  genres: string[];
  accounts: ProfileAccountSummary[];
  createdAt: string;
  updatedAt: string;
}

interface ProfileAccountSummary {
  id: string;
  provider: string;
  label: string;
  externalId?: string;
  displayName?: string;
  status: string;
  hasCredentials: boolean;
}

function ProfilesPage() {
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create profile form
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newGenres, setNewGenres] = useState<string[]>([]);

  // Add account form
  const [accountProfile, setAccountProfile] = useState<string | null>(null);
  const [accProvider, setAccProvider] = useState("youtube");
  const [accLabel, setAccLabel] = useState("");
  const [accCredentials, setAccCredentials] = useState<Record<string, string>>({});

  // Resolve demo
  const [resolveCategory, setResolveCategory] = useState("Technology");
  const [resolvePlatform, setResolvePlatform] = useState("youtube");
  const [resolveResult, setResolveResult] = useState<ProfileAccountSummary[] | null>(null);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<ProfileSummary[]>("/api/profiles");
      setProfiles(Array.isArray(data) ? data : []);
    } catch (err) {
      setError((err instanceof Error ? err.message : String(err)) || "Failed to load profiles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const createProfile = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await apiClient.post("/api/profiles", { name: newName, description: newDescription, genres: newGenres });
      setNewName("");
      setNewDescription("");
      setNewGenres([]);
      await fetchProfiles();
    } catch (err) {
      setError((err instanceof Error ? err.message : String(err)) || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  const deleteProfile = async (id: string) => {
    if (!window.confirm("Delete this profile and all its accounts?")) return;
    setError(null);
    try {
      await apiClient.delete(`/api/profiles/${id}`);
      await fetchProfiles();
    } catch (err) {
      setError((err instanceof Error ? err.message : String(err)) || "Failed to delete profile");
    }
  };

  const openAddAccount = (profileId: string) => {
    setAccountProfile(profileId);
    setAccProvider("youtube");
    setAccLabel("");
    setAccCredentials({});
  };

  const addAccount = async () => {
    if (!accountProfile || !accLabel.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await apiClient.post(`/api/profiles/${accountProfile}/accounts`, {
        provider: accProvider,
        label: accLabel,
        credentials: accCredentials,
      });
      setAccountProfile(null);
      await fetchProfiles();
    } catch (err) {
      setError((err instanceof Error ? err.message : String(err)) || "Failed to add account");
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async (profileId: string, accountId: string) => {
    setError(null);
    try {
      await apiClient.delete(`/api/profiles/${profileId}/accounts/${accountId}`);
      await fetchProfiles();
    } catch (err) {
      setError((err instanceof Error ? err.message : String(err)) || "Failed to delete account");
    }
  };

  const startOAuth = async (profileId: string, provider: string) => {
    setError(null);
    try {
      const data = await apiClient.post<{ authorizationUrl?: string }>(`/api/oauth/${provider}/connect`, { profileId });
      if (data?.authorizationUrl) {
        window.open(data.authorizationUrl, "_blank");
      }
    } catch (err) {
      setError((err instanceof Error ? err.message : String(err)) || "Failed to start OAuth");
    }
  };

  const runResolve = async () => {
    setError(null);
    try {
      const data = await apiClient.post<ProfileAccountSummary[]>("/api/profiles/resolve", {
        category: resolveCategory,
        platform: resolvePlatform,
      });
      setResolveResult(Array.isArray(data) ? data : []);
    } catch (err) {
      setError((err instanceof Error ? err.message : String(err)) || "Failed to resolve accounts");
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <GroupsIcon sx={{ fontSize: 36, color: "#6366f1" }} />
        <Box>
          <Typography variant="h4" fontWeight={700}>Client Profiles</Typography>
          <Typography variant="body2" color="text.secondary">
            One user → many client/niche profiles → many platform accounts each. Publish routes by content category.
          </Typography>
        </Box>
        <Chip label="Multi-Account" size="small" sx={{ ml: "auto", bgcolor: "#6366f1", color: "white" }} />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* Create profile */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, bgcolor: "#1e293b", height: "100%" }}>
            <Typography variant="h6" sx={{ mb: 2, color: "#f59e0b" }}>New Profile</Typography>
            <TextField
              fullWidth size="small" label="Name (client / niche)" value={newName}
              onChange={(e) => setNewName(e.target.value)} sx={{ mb: 2 }}
            />
            <TextField
              fullWidth size="small" label="Description" value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)} sx={{ mb: 2 }}
            />
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Content Categories (auto-route)</InputLabel>
              <Select
                multiple value={newGenres} label="Content Categories (auto-route)"
                onChange={(e) => setNewGenres(e.target.value as string[])}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {(selected as string[]).map((g) => <Chip key={g} label={g} size="small" />)}
                  </Box>
                )}
              >
                {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            <Button
              variant="contained" fullWidth startIcon={<AddCircleIcon />}
              disabled={!newName.trim() || loading} onClick={createProfile}
            >
              Create Profile
            </Button>
          </Paper>
        </Grid>

        {/* Routing resolver demo */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, bgcolor: "#1e293b", height: "100%" }}>
            <Typography variant="h6" sx={{ mb: 2, color: "#f59e0b" }}>Auto-Route Resolver</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
              Given a category + platform, which accounts should receive the video?
            </Typography>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Category</InputLabel>
              <Select value={resolveCategory} label="Category" onChange={(e) => setResolveCategory(e.target.value)}>
                {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Platform</InputLabel>
              <Select value={resolvePlatform} label="Platform" onChange={(e) => setResolvePlatform(e.target.value)}>
                {PROVIDERS.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
              </Select>
            </FormControl>
            <Button variant="outlined" fullWidth startIcon={<AutoAwesomeIcon />} onClick={runResolve}>
              Resolve Accounts
            </Button>
            {resolveResult && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  {resolveResult.length === 0 ? "No matching active accounts." : `${resolveResult.length} matching account(s):`}
                </Typography>
                <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                  {resolveResult.map((a) => (
                    <Typography key={a.id} variant="body2" sx={{ color: "#4ade80" }}>
                      • {a.label} ({a.provider})
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Profiles list */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, bgcolor: "#1e293b", height: "100%" }}>
            <Typography variant="h6" sx={{ mb: 2, color: "#f59e0b" }}>Summary</Typography>
            {loading && <CircularProgress size={20} />}
            <Typography variant="body2">
              <strong>{profiles.length}</strong> profile(s)
            </Typography>
            <Typography variant="body2">
              <strong>{profiles.reduce((n, p) => n + p.accounts.length, 0)}</strong> connected account(s)
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Profiles */}
      <Grid container spacing={3} sx={{ mt: 1 }}>
        {profiles.length === 0 && !loading && (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, bgcolor: "#1e293b", textAlign: "center" }}>
              <Typography color="text.secondary">No profiles yet. Create one to start managing client accounts.</Typography>
            </Paper>
          </Grid>
        )}
        {profiles.map((profile) => (
          <Grid item xs={12} key={profile.id}>
            <Card sx={{ bgcolor: "#1e293b" }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Typography variant="h6">{profile.name}</Typography>
                  <Box sx={{ flexGrow: 1 }} />
                  <Button size="small" variant="outlined" startIcon={<LinkIcon />} onClick={() => openAddAccount(profile.id)}>
                    Add Account
                  </Button>
                  <IconButton size="small" color="error" onClick={() => deleteProfile(profile.id)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
                {profile.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{profile.description}</Typography>
                )}
                <Stack direction="row" spacing={0.5} sx={{ mb: 2 }}>
                  {profile.genres.map((g) => (
                    <Chip key={g} label={g} size="small" sx={{ bgcolor: "rgba(99,102,241,0.2)", color: "#a5b4fc" }} />
                  ))}
                  {profile.genres.length === 0 && (
                    <Typography variant="caption" color="text.secondary">No categories → matches "General"</Typography>
                  )}
                </Stack>

                {profile.accounts.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No accounts connected.</Typography>
                ) : (
                  <Stack spacing={1}>
                    {profile.accounts.map((acc) => (
                      <Box key={acc.id} sx={{ display: "flex", alignItems: "center", gap: 1, bgcolor: "#0f172a", borderRadius: 2, px: 2, py: 1 }}>
                        <Chip label={acc.provider} size="small" color="primary" variant="outlined" />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body2">{acc.displayName || acc.label}</Typography>
                          {acc.displayName && <Typography variant="caption" color="text.secondary">{acc.label}</Typography>}
                        </Box>
                        <Chip
                          label={acc.status}
                          size="small"
                          sx={{
                            bgcolor: acc.status === "active" ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)",
                            color: acc.status === "active" ? "#4ade80" : "#f87171",
                          }}
                        />
                        {!acc.hasCredentials && <Chip label="no creds" size="small" variant="outlined" color="warning" />}
                        <IconButton size="small" color="error" onClick={() => deleteAccount(profile.id, acc.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Stack>
                )}

                {["youtube", "telegram", "instagram", "facebook", "linkedin", "x"].map((provider) => (
                  <Button
                    key={provider}
                    size="small"
                    variant="text"
                    onClick={() => startOAuth(profile.id, provider)}
                    sx={{ mt: 1, mr: 1, textTransform: "capitalize" }}
                  >
                    Connect {provider}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Add account dialog */}
      <Dialog open={Boolean(accountProfile)} onClose={() => setAccountProfile(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Account</DialogTitle>
        <DialogContent>
          <FormControl fullWidth size="small" sx={{ mb: 2, mt: 1 }}>
            <InputLabel>Platform</InputLabel>
            <Select value={accProvider} label="Platform" onChange={(e) => {
              setAccProvider(e.target.value);
              setAccCredentials({});
            }}>
              {PROVIDERS.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField
            fullWidth size="small" label="Label" value={accLabel}
            onChange={(e) => setAccLabel(e.target.value)} sx={{ mb: 2 }}
            placeholder="e.g. TechTok main channel"
          />
          <Divider sx={{ my: 1 }} />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            Credentials are encrypted at rest (AES-256-GCM).
          </Typography>
          {CREDENTIAL_FIELDS[accProvider].map((field) => (
            <TextField
              key={field}
              fullWidth size="small" label={CREDENTIAL_LABELS[field] || field}
              value={accCredentials[field] || ""}
              onChange={(e) => setAccCredentials((c) => ({ ...c, [field]: e.target.value }))}
              sx={{ mb: 2 }}
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAccountProfile(null)}>Cancel</Button>
          <Button variant="contained" disabled={!accLabel.trim() || loading} onClick={addAccount}>
            Add Account
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default ProfilesPage;
