import React, { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, CardContent, Chip, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import { apiClient } from "../../services/apiClient";

interface AutomationRule {
  id: string;
  name: string;
  sourceIds: string[];
  category: string;
  niche: string;
  platform: string;
  tone: string;
  videoType: "short" | "long";
  enabled: boolean;
  maxDraftsPerTick: number;
}
interface SourceOption { id: string; name: string; category: string; custom?: boolean; }

interface AutomationRulesProps { onAudit?: (action: string, target?: string) => void; }

const AutomationRules: React.FC<AutomationRulesProps> = ({ onAudit }) => {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [sources, setSources] = useState<SourceOption[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Technology");
  const [niche, setNiche] = useState("IT products and services");
  const [platform, setPlatform] = useState("youtube_shorts");
  const [tone, setTone] = useState("informative");
  const [videoType, setVideoType] = useState<"short" | "long">("short");
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [ruleResponse, sourceResponse] = await Promise.all([
        apiClient.get<{ rules?: AutomationRule[] }>("/api/automation/rules"),
        apiClient.get<SourceOption[]>("/api/news-sources"),
      ]);
      setRules(ruleResponse.rules ?? []);
      setSources(sourceResponse);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load automation settings");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const createRule = async () => {
    if (!name.trim() || sourceIds.length === 0) { setError("Rule name and at least one source are required"); return; }
    setBusy(true);
    try {
      await apiClient.post("/api/automation/rules", { name: name.trim(), sourceIds, category, niche, platform, tone, videoType, enabled: true, maxDraftsPerTick: 2 });
      setName("");
      setSourceIds([]);
      onAudit?.("automation-rule-created", category);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to create automation rule");
    } finally { setBusy(false); }
  };

  const toggleRule = async (rule: AutomationRule) => {
    setBusy(true);
    try {
      await apiClient.patch(`/api/automation/rules/${rule.id}`, { enabled: !rule.enabled });
      onAudit?.(rule.enabled ? "automation-rule-disabled" : "automation-rule-enabled", rule.name);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to update automation rule");
    } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Source-driven Automation</Typography>
            <Chip size="small" label="Review queue only" color="warning" />
          </Stack>
          <Typography variant="body2" color="text.secondary">Rules use workspace-scoped sources and intelligence signals. Every generated draft stops for Human Editorial approval; Telegram is never called by this panel.</Typography>
          {error ? <Alert severity="error" onClose={() => setError(null)}>{error}</Alert> : null}
          <TextField label="Rule name" value={name} onChange={(event) => setName(event.target.value)} fullWidth />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField label="Category" value={category} onChange={(event) => setCategory(event.target.value)} fullWidth />
            <TextField label="Niche" value={niche} onChange={(event) => setNiche(event.target.value)} fullWidth />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Select value={platform} onChange={(event) => setPlatform(event.target.value)} fullWidth>{["youtube_shorts", "youtube", "instagram", "linkedin"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select>
            <Select value={tone} onChange={(event) => setTone(event.target.value)} fullWidth>{["informative", "excited", "calm", "urgent", "humorous"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select>
            <Select value={videoType} onChange={(event) => setVideoType(event.target.value as "short" | "long")} fullWidth><MenuItem value="short">Short</MenuItem><MenuItem value="long">Long</MenuItem></Select>
          </Stack>
          <Select multiple value={sourceIds} onChange={(event) => setSourceIds(event.target.value as string[])} displayEmpty fullWidth renderValue={(selected) => selected.length ? `${selected.length} source(s) selected` : "Select source feeds"}>
            {sources.map((source) => <MenuItem key={source.id} value={source.id}>{source.name} — {source.category}{source.custom ? " (workspace)" : ""}</MenuItem>)}
          </Select>
          <Button variant="contained" onClick={() => void createRule()} disabled={busy}>Create automation rule</Button>
          {rules.map((rule) => <Stack key={rule.id} direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }} sx={{ borderTop: 1, borderColor: "divider", pt: 1 }}><Stack><Typography>{rule.name}</Typography><Typography variant="caption" color="text.secondary">{rule.category} · {rule.platform} · {rule.videoType} · {rule.sourceIds.length} source(s)</Typography></Stack><Button size="small" variant="outlined" onClick={() => void toggleRule(rule)} disabled={busy}>{rule.enabled ? "Disable" : "Enable"}</Button></Stack>)}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default AutomationRules;
