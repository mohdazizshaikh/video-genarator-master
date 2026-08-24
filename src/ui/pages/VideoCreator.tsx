import React, { Suspense, lazy, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { RenderConfig, SceneInput, MusicMoodEnum, CaptionPositionEnum, VoiceEnum, OrientationEnum, MusicVolumeEnum, LanguageEnum, VideoTypeEnum, TextModeEnum } from "../../types/shorts";
import type { AutoScriptStyle, NewsSourceOption } from "../components/video-creator/AutoScriptPanel";
import type { SceneFormData } from "../components/video-creator/SceneEditorList";
import type { HookOption } from "../../script-generator/AiLlmGenerator";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import apiClient from "../services/apiClient";
import { defaultVoiceForLanguage, labelForLanguage } from "../../config/languageSupport";
import { CONTENT_CATEGORIES } from "../../config/categories";

const AutoScriptPanel = lazy(() => import("../components/video-creator/AutoScriptPanel"));
const SceneEditorList = lazy(() => import("../components/video-creator/SceneEditorList"));
const VideoConfigPanel = lazy(() => import("../components/video-creator/VideoConfigPanel"));
const http = apiClient.getAxiosInstance();

const PLATFORM_PSYCHOLOGY_OPTIONS = [
  { value: "", label: "None (default)" },
  { value: "youtube", label: "YouTube — long hooks, detailed CTAs" },
  { value: "tiktok", label: "TikTok — fast cuts, trend-driven" },
  { value: "instagram", label: "Instagram — aesthetic, emotion-first" },
  { value: "linkedin", label: "LinkedIn — professional, insight-led" },
  { value: "facebook", label: "Facebook — community, share-focused" },
];

const VideoCreator: React.FC = () => {
  const navigate = useNavigate();
  const [scenes, setScenes] = useState<SceneFormData[]>([
    { text: "", searchTerms: "", keywords: "", subcategory: "", headline: "", visualPrompt: "" },
  ]);
  const [config, setConfig] = useState<RenderConfig>({
    paddingBack: 1500,
    music: MusicMoodEnum.chill,
    captionPosition: CaptionPositionEnum.center,
    captionBackgroundColor: "blue",
    voice: VoiceEnum.af_heart,
    scriptLanguage: LanguageEnum.en,
    audioLanguage: LanguageEnum.en,
    overlayLanguage: LanguageEnum.en,
    captionLanguage: LanguageEnum.en,
    subtitleLanguage: LanguageEnum.en,
    textMode: TextModeEnum.hybrid,
    subtitleLineCount: 2,
    subtitleFontScale: 1,
    orientation: OrientationEnum.portrait,
    musicVolume: MusicVolumeEnum.high,
    useAiImages: false,
    videoType: VideoTypeEnum.short,
    durationLimit: 60,
    category: "World",
  });
  const [category, setCategory] = useState("World");
  const [platformPsychology, setPlatformPsychology] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<NewsSourceOption[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<AutoScriptStyle>("News");
  const [hookOptions, setHookOptions] = useState<HookOption[]>([]);
  const [selectedHook, setSelectedHook] = useState("");
  const [keywordQuery, setKeywordQuery] = useState("");
  const [sourceSaving, setSourceSaving] = useState(false);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [hooksLoading, setHooksLoading] = useState(false);
  const [, setVoices] = useState<VoiceEnum[]>([]);
  const [, setMusicTags] = useState<MusicMoodEnum[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    setup: true,
    script: true,
    scenes: true,
    config: false,
  });

  const selectedSourceLabel = selectedSources.length > 0
    ? sources.filter((source) => selectedSources.includes(source.id)).map((source) => source.name).join(", ")
    : "No source selected";
  const keywordList = keywordQuery.split(",").map((keyword) => keyword.trim()).filter(Boolean);
  const scenesWithText = scenes.filter((scene) => scene.text.trim().length >= 10);
  const readinessSummary = {
    scenesWithText: scenesWithText.length,
    scenesWithMediaHints: scenes.filter((scene) => (
      scene.searchTerms.split(",").map((term) => term.trim()).filter(Boolean).length >= 2
    )).length,
    scenesWithHeadline: scenes.filter((scene) => scene.headline.trim().length > 0).length,
  };

  const estimatedSeconds = scenesWithText.reduce((acc, s) => acc + Math.ceil(s.text.trim().split(/\s+/).length * 0.4), 0);
  const longVideoShortScriptWarning =
    config.videoType === VideoTypeEnum.long && scenesWithText.length < 3;

  const toggleAccordion = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [voicesResponse, musicResponse, newsResponse] = await Promise.all([
          http.get("/api/voices"),
          http.get("/api/music-tags"),
          http.get("/api/news-sources"),
        ]);
        setVoices(voicesResponse.data);
        setMusicTags(musicResponse.data);
        setSources(newsResponse.data);
      } catch (err) {
        console.error("Failed to fetch options:", err);
        setError("Failed to load voices and music options. Please refresh the page.");
      } finally {
        setLoadingOptions(false);
      }
    };
    void fetchOptions();
  }, []);

  const reloadSources = async () => {
    const newsResponse = await http.get("/api/news-sources");
    setSources(newsResponse.data);
  };

  const fetchTrendingTopics = async (sourceIds: string[], category: string): Promise<string[]> => {
    setTopicsLoading(true);
    try {
      const res = await http.post("/api/auto-script/topics", { sourceIds, category, keywords: keywordList });
      const topics = Array.isArray(res.data?.topics) ? res.data.topics : [];
      setTrendingTopics(topics);
      setSelectedTopic((current) => (current && topics.includes(current) ? current : (topics[0] || "")));
      return topics;
    } finally {
      setTopicsLoading(false);
    }
  };

  const fetchHookOptions = async (
    sourceIds: string[],
    category: string,
    topic: string,
    style: AutoScriptStyle,
  ) => {
    if (sourceIds.length === 0) {
      setHookOptions([]);
      setSelectedHook("");
      return;
    }
    setHooksLoading(true);
    try {
      const res = await http.post("/api/auto-script/hooks", {
        sourceIds,
        category,
        topic,
        style,
        keywords: keywordList,
      });
      const hooks = Array.isArray(res.data?.hooks) ? res.data.hooks : [];
      setHookOptions(hooks);
      setSelectedHook((current) => (
        current && hooks.some((hook: HookOption) => hook.text === current)
          ? current
          : (hooks[0]?.text || "")
      ));
    } finally {
      setHooksLoading(false);
    }
  };

  const refreshAutomationOptions = async () => {
    if (selectedSources.length === 0) return;
    setError(null);
    try {
      const topics = await fetchTrendingTopics(selectedSources, category);
      await fetchHookOptions(selectedSources, category, selectedTopic || topics[0] || "", selectedStyle);
    } catch (err) {
      console.error("Failed to fetch topics:", err);
      setError("Failed to load trending topics for this source.");
    }
  };

  useEffect(() => {
    if (selectedSources.length === 0) {
      setTrendingTopics([]);
      setSelectedTopic("");
      setHookOptions([]);
      setSelectedHook("");
      return;
    }
    void refreshAutomationOptions();
  }, [selectedSources, category]);

  useEffect(() => {
    if (selectedSources.length === 0) return;
    void (async () => {
      try {
        await fetchHookOptions(selectedSources, category, selectedTopic, selectedStyle);
      } catch (err) {
        console.error("Failed to fetch hooks:", err);
        setError("Failed to load hook options.");
      }
    })();
  }, [selectedSources, category, selectedTopic, selectedStyle]);

  const handleAddScene = () => {
    setScenes((current) => [...current, { text: "", searchTerms: "", keywords: "", subcategory: "", headline: "", visualPrompt: "" }]);
  };

  const handleCreateCustomSource = async (payload: {
    name: string;
    url: string;
    category: string;
    subCategory?: string;
  }) => {
    setSourceSaving(true);
    setError(null);
    try {
      const response = await http.post("/api/news-sources/custom", payload);
      await reloadSources();
      if (response.data?.source?.id) {
        setSelectedSources((current) => Array.from(new Set([...current, response.data.source.id])));
      }
    } catch (err: any) {
      console.error("Failed to create custom source:", err);
      setError(err.response?.data?.error || err.message || "Failed to add custom source");
      throw err;
    } finally {
      setSourceSaving(false);
    }
  };

  const handleRemoveScene = (index: number) => {
    if (scenes.length <= 1) return;
    setScenes((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleAutoScript = async () => {
    if (selectedSources.length === 0) return;
    setAutoLoading(true);
    setError(null);
    try {
      const res = await http.post("/api/auto-script", {
        sourceIds: selectedSources,
        category,
        topic: selectedTopic || undefined,
        style: selectedStyle,
        hook: selectedHook || undefined,
        scriptLanguage: config.scriptLanguage,
        keywords: keywordList,
        videoType: config.videoType,
        durationLimit: config.durationLimit,
      });
      if (res.data.scenes) {
        setScenes(res.data.scenes.map((scene: any) => ({
          text: scene.text,
          searchTerms: Array.isArray(scene.searchTerms) ? scene.searchTerms.join(", ") : scene.searchTerms,
          keywords: Array.isArray(scene.keywords) ? scene.keywords.join(", ") : "",
          subcategory: scene.subcategory || "",
          headline: scene.headline || "",
          visualPrompt: scene.visualPrompt || "",
        })));
      }
    } catch (err: any) {
      console.error("AI LLM auto-script error:", err);
      const message = err.response?.data?.message || err.message || "Failed to generate script";
      const rawOutput = err.response?.data?.rawAI_LLMOutput;
      setError(`${message}${rawOutput ? ` | RAW OUTPUT: ${JSON.stringify(rawOutput)}` : ""}`);
    } finally {
      setAutoLoading(false);
    }
  };

  const handleSceneChange = (index: number, field: keyof SceneFormData, value: string) => {
    setScenes((current) => current.map((scene, currentIndex) => (
      currentIndex === index ? { ...scene, [field]: value } : scene
    )));
  };

  const handleConfigChange = <K extends keyof RenderConfig>(field: K, value: RenderConfig[K]) => {
    setConfig((current) => {
      const next = { ...current, [field]: value };
      if (field === "audioLanguage") {
        next.voice = defaultVoiceForLanguage(value as LanguageEnum) as RenderConfig["voice"];
      }
      if (field === "captionLanguage") {
        next.subtitleLanguage = value as RenderConfig["subtitleLanguage"];
      }
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (readinessSummary.scenesWithText === 0) {
      setError("At least one scene needs text (10+ characters) before creating a video.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const apiScenes: SceneInput[] = scenes.map((scene) => ({
        text: scene.text,
        subcategory: scene.subcategory.trim() || undefined,
        keywords: scene.keywords
          .split(",")
          .map((term) => term.trim())
          .filter((term) => term.length > 0),
        headline: scene.headline.trim() || undefined,
        visualPrompt: scene.visualPrompt.trim() || undefined,
        sourceLanguage: config.scriptLanguage,
        language: config.audioLanguage,
        searchTerms: scene.searchTerms
          .split(",")
          .map((term) => term.trim())
          .filter((term) => term.length > 0),
      }));

      const response = await http.post("/api/short-video", {
        scenes: apiScenes,
        config,
        contentCategory: category,
        platformPsychology: platformPsychology || undefined,
      });

      navigate(`/video/${response.data.videoId}`);
    } catch (err) {
      console.error(err);
      setError("Failed to create video. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loadingOptions) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box maxWidth="md" mx="auto" py={4}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: "bold", textAlign: "center", mb: 4 }}>
        Create New Video
      </Typography>

      {/* ── Section 1: Content Setup ──────────────────────────────── */}
      <Accordion
        expanded={expanded.setup}
        onChange={() => toggleAccordion("setup")}
        sx={{ mb: 2, border: "1px solid", borderColor: "divider" }}
        disableGutters
        elevation={0}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" fontWeight={700}>Content Setup</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            {/* Content Category */}
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                Content Category <Typography component="span" variant="caption" color="text.secondary">(affects style and script tone)</Typography>
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {CONTENT_CATEGORIES.map((cat) => (
                  <Chip
                    key={cat}
                    label={cat}
                    size="small"
                    onClick={() => {
                      if (category === cat) return;
                      setCategory(cat);
                      setSelectedSources([]);
                      setTrendingTopics([]);
                      setSelectedTopic("");
                      setHookOptions([]);
                      setSelectedHook("");
                    }}
                    color={category === cat ? "primary" : "default"}
                    variant={category === cat ? "filled" : "outlined"}
                    sx={{ cursor: "pointer" }}
                  />
                ))}
              </Stack>
            </Box>

            {/* Short / Long toggle */}
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                Video Length
              </Typography>
              <Stack direction="row" spacing={1}>
                <Tooltip title="≤60s — fast paced, single topic">
                  <Button
                    size="small"
                    variant={config.videoType === VideoTypeEnum.short ? "contained" : "outlined"}
                    onClick={() => {
                      handleConfigChange("videoType", VideoTypeEnum.short);
                      handleConfigChange("durationLimit", 60);
                    }}
                  >
                    Short (≤60s)
                  </Button>
                </Tooltip>
                <Tooltip title="61-600s — multi-scene, detailed content">
                  <Button
                    size="small"
                    variant={config.videoType === VideoTypeEnum.long ? "contained" : "outlined"}
                    color={config.videoType === VideoTypeEnum.long ? "secondary" : "primary"}
                    onClick={() => {
                      handleConfigChange("videoType", VideoTypeEnum.long);
                      handleConfigChange("durationLimit", 300);
                    }}
                  >
                    Long-form (1–10 min)
                  </Button>
                </Tooltip>
                <Typography variant="caption" color="text.secondary" alignSelf="center">
                  Est. {estimatedSeconds > 0 ? `~${estimatedSeconds}s` : "—"}
                </Typography>
              </Stack>
            </Box>

            {/* Platform Psychology */}
            <FormControl size="small" sx={{ maxWidth: 320 }}>
              <InputLabel>Platform Psychology (optional)</InputLabel>
              <Select
                value={platformPsychology}
                label="Platform Psychology (optional)"
                onChange={(e) => setPlatformPsychology(e.target.value)}
              >
                {PLATFORM_PSYCHOLOGY_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* ── Section 2: Script Generator ──────────────────────────── */}
      <Accordion
        expanded={expanded.script}
        onChange={() => toggleAccordion("script")}
        sx={{ mb: 2, border: "1px solid", borderColor: "divider" }}
        disableGutters
        elevation={0}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" fontWeight={700}>AI Script Generator</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          <Suspense fallback={<LoadingSpinner message="Loading creator tools..." />}>
            <AutoScriptPanel
              autoLoading={autoLoading}
              topicsLoading={topicsLoading}
              hooksLoading={hooksLoading}
              sourceSaving={sourceSaving}
              selectedCategory={category}
              selectedSources={selectedSources}
              selectedTopic={selectedTopic}
              selectedStyle={selectedStyle}
              selectedHook={selectedHook}
              keywordQuery={keywordQuery}
              sources={sources}
              trendingTopics={trendingTopics}
              hookOptions={hookOptions}
              onSourceChange={setSelectedSources}
              onTopicChange={setSelectedTopic}
              onStyleChange={setSelectedStyle}
              onHookChange={setSelectedHook}
              onKeywordChange={setKeywordQuery}
              onAutoRefresh={() => void refreshAutomationOptions()}
              onGenerate={() => void handleAutoScript()}
              onCreateSource={handleCreateCustomSource}
            />
          </Suspense>
        </AccordionDetails>
      </Accordion>

      {/* Warnings & Errors */}
      {longVideoShortScriptWarning && (
        <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
          Long-form video selected but only {scenesWithText.length} audio-ready scene(s). Add at least 3 scenes with text for best results.
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Quick Summary */}
      <Paper sx={{ p: 2.5, mb: 3, bgcolor: "grey.50", border: "1px solid", borderColor: "divider" }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Quick Summary
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} useFlexGap flexWrap="wrap">
          <Typography variant="body2">Scenes: <strong>{scenes.length}</strong></Typography>
          <Typography variant="body2">Content: <strong>{category}</strong></Typography>
          <Typography variant="body2">Type: <strong>{config.videoType}</strong></Typography>
          <Typography variant="body2">Orientation: <strong>{config.orientation}</strong></Typography>
          <Typography variant="body2">Script: <strong>{labelForLanguage(config.scriptLanguage)}</strong></Typography>
          <Typography variant="body2">Audio: <strong>{labelForLanguage(config.audioLanguage)}</strong></Typography>
          <Typography variant="body2">Overlay: <strong>{labelForLanguage(config.overlayLanguage)}</strong></Typography>
          <Typography variant="body2">Voice: <strong>{config.voice}</strong></Typography>
          <Typography variant="body2">Captions: <strong>{labelForLanguage(config.captionLanguage)}</strong></Typography>
          <Typography variant="body2">Text mode: <strong>{config.textMode}</strong></Typography>
          <Typography variant="body2">Target duration: <strong>{config.durationLimit}s</strong></Typography>
          <Typography variant="body2">Source: <strong>{selectedSourceLabel}</strong></Typography>
          <Typography variant="body2">AI images: <strong>{config.useAiImages ? "On" : "Off"}</strong></Typography>
          {platformPsychology && (
            <Typography variant="body2">Platform focus: <strong>{platformPsychology}</strong></Typography>
          )}
        </Stack>
      </Paper>

      {/* Render Readiness */}
      <Paper sx={{ p: 2.5, mb: 3, bgcolor: "rgba(25, 118, 210, 0.04)", border: "1px solid", borderColor: "divider" }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Render Readiness
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} useFlexGap flexWrap="wrap">
          <Typography variant="body2">
            Audio-ready scenes: <strong>{readinessSummary.scenesWithText}/{scenes.length}</strong>
          </Typography>
          <Typography variant="body2">
            Subtitle-ready scenes: <strong>{readinessSummary.scenesWithText}/{scenes.length}</strong>
          </Typography>
          <Typography variant="body2">
            Media-ready scenes: <strong>{readinessSummary.scenesWithMediaHints}/{scenes.length}</strong>
          </Typography>
          <Typography variant="body2">
            Headline coverage: <strong>{readinessSummary.scenesWithHeadline}/{scenes.length}</strong>
          </Typography>
          {estimatedSeconds > 0 && (
            <Typography variant="body2">
              Estimated length: <strong>~{estimatedSeconds}s</strong>
            </Typography>
          )}
        </Stack>
      </Paper>

      <form onSubmit={(event) => void handleSubmit(event)}>
        {/* ── Section 3: Scene Editor ───────────────────────────── */}
        <Accordion
          expanded={expanded.scenes}
          onChange={() => toggleAccordion("scenes")}
          sx={{ mb: 2, border: "1px solid", borderColor: "divider" }}
          disableGutters
          elevation={0}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight={700}>
              Scenes ({scenes.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <Suspense fallback={<LoadingSpinner message="Loading scene editor..." />}>
              <SceneEditorList
                scenes={scenes}
                category={category}
                scriptLanguage={config.scriptLanguage}
                voice={config.voice}
                audioLanguage={config.audioLanguage}
                overlayLanguage={config.overlayLanguage}
                subtitleLanguage={config.captionLanguage}
                textMode={config.textMode}
                captionPosition={config.captionPosition}
                captionBackgroundColor={config.captionBackgroundColor}
                subtitleLineCount={config.subtitleLineCount}
                subtitleFontScale={config.subtitleFontScale}
                onAddScene={handleAddScene}
                onRemoveScene={handleRemoveScene}
                onSceneChange={handleSceneChange}
              />
            </Suspense>
          </AccordionDetails>
        </Accordion>

        <Divider sx={{ mb: 2 }} />

        {/* ── Section 4: Video Config (collapsed by default) ───── */}
        <Accordion
          expanded={expanded.config}
          onChange={() => toggleAccordion("config")}
          sx={{ mb: 3, border: "1px solid", borderColor: "divider" }}
          disableGutters
          elevation={0}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight={700}>Advanced Video Settings</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <Suspense fallback={<LoadingSpinner message="Loading video settings..." />}>
              <VideoConfigPanel
                config={config}
                onConfigChange={handleConfigChange}
              />
            </Suspense>
          </AccordionDetails>
        </Accordion>

        <Box display="flex" justifyContent="center">
          <Tooltip
            title={readinessSummary.scenesWithText === 0 ? "Add text to at least one scene first" : ""}
          >
            <span>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={loading || readinessSummary.scenesWithText === 0}
                sx={{ minWidth: 200 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Create Video"}
              </Button>
            </span>
          </Tooltip>
        </Box>
      </form>
    </Box>
  );
};

export default VideoCreator;
