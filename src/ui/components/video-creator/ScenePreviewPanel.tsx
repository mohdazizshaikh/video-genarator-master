import { authenticatedFetch } from "../../services/authenticatedFetch";
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import type {
  CaptionPositionEnum,
  LanguageEnum,
  TextModeEnum,
  VoiceEnum,
} from "../../../types/shorts";
import type { SceneFormData } from "./SceneEditorList";
import {
  labelForLanguage,
  toSpeechSynthesisLocale,
} from "../../../config/languageSupport";

interface ScenePreviewPanelProps {
  scene: SceneFormData;
  sceneIndex: number;
  scriptLanguage: LanguageEnum;
  voice: VoiceEnum;
  audioLanguage: LanguageEnum;
  overlayLanguage: LanguageEnum;
  subtitleLanguage: LanguageEnum;
  textMode: TextModeEnum;
  captionPosition: CaptionPositionEnum;
  captionBackgroundColor: string;
  subtitleLineCount: number;
  subtitleFontScale: number;
}

const splitIntoPreviewLines = (text: string, lineCount: number): string[] => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }

  const normalizedLineCount = Math.max(1, lineCount);
  const wordsPerLine = normalizedLineCount === 1 ? 4 : normalizedLineCount === 2 ? 3 : 2;
  const lines: string[] = [];
  for (let index = 0; index < words.length; index += wordsPerLine) {
    lines.push(words.slice(index, index + wordsPerLine).join(" "));
    if (lines.length === normalizedLineCount) {
      break;
    }
  }

  return lines;
};

const buildMediaHints = (scene: SceneFormData): string[] => {
  return Array.from(new Set(
    [
      scene.subcategory,
      scene.headline,
      ...scene.keywords.split(","),
      ...scene.searchTerms.split(","),
    ]
      .map((item) => item.trim())
      .filter(Boolean),
  )).slice(0, 6);
};

const ScenePreviewPanel: React.FC<ScenePreviewPanelProps> = ({
  scene,
  sceneIndex,
  scriptLanguage,
  voice,
  audioLanguage,
  overlayLanguage,
  subtitleLanguage,
  textMode,
  captionPosition,
  captionBackgroundColor,
  subtitleLineCount,
  subtitleFontScale,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioPreviewText, setAudioPreviewText] = useState(scene.text);
  const [captionPreviewText, setCaptionPreviewText] = useState(scene.text);
  const [previewVoiceAvailable, setPreviewVoiceAvailable] = useState(true);

  const subtitleLines = useMemo(
    () => splitIntoPreviewLines(captionPreviewText, subtitleLineCount),
    [captionPreviewText, subtitleLineCount],
  );
  const mediaHints = useMemo(() => buildMediaHints(scene), [scene]);
  const readiness = {
    audio: scene.text.trim().length >= 10,
    subtitles: scene.text.trim().length >= 10,
    media: mediaHints.length >= 2,
  };

  useEffect(() => {
    setAudioPreviewText(scene.text);
    setCaptionPreviewText(scene.text);
  }, [scene.text]);

  useEffect(() => {
    let active = true;

    const translatePreview = async (
      text: string,
      sourceLanguage: LanguageEnum,
      targetLanguage: LanguageEnum,
      setter: (value: string) => void,
    ) => {
      if (!text.trim() || sourceLanguage === targetLanguage) {
        setter(text);
        return;
      }

      try {
        const response = await authenticatedFetch("/api/auto-script/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            sourceLanguage,
            targetLanguage,
          }),
        });

        if (!response.ok) {
          if (active) {
            setter(text);
          }
          return;
        }

        const data = await response.json();
        if (active) {
          setter(String(data.text || text));
        }
      } catch {
        if (active) {
          setter(text);
        }
      }
    };

    translatePreview(scene.text, scriptLanguage, audioLanguage, setAudioPreviewText);
    translatePreview(scene.text, scriptLanguage, subtitleLanguage, setCaptionPreviewText);

    return () => {
      active = false;
    };
  }, [audioLanguage, scene.text, scriptLanguage, subtitleLanguage]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handlePlayPreview = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !audioPreviewText.trim()) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(audioPreviewText.trim());
    const locale = toSpeechSynthesisLocale(audioLanguage);
    const availableVoices = window.speechSynthesis.getVoices();
    const exactVoice = availableVoices.find((item) => item.lang.toLowerCase() === locale.toLowerCase());
    const languagePrefix = locale.split("-")[0].toLowerCase();
    const matchingVoice = exactVoice
      || availableVoices.find((item) => item.lang.toLowerCase().startsWith(languagePrefix));

    utterance.rate = 1;
    utterance.lang = locale;
    if (matchingVoice) {
      utterance.voice = matchingVoice;
      setPreviewVoiceAvailable(true);
    } else {
      setPreviewVoiceAvailable(audioLanguage === "en");
    }
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleStopPreview = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  return (
    <Paper variant="outlined" sx={{ p: 2.5, bgcolor: "grey.50" }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Scene {sceneIndex + 1} Preview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Browser narration preview, subtitle layout preview, and render-readiness hints.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<PlayArrowIcon />}
            onClick={handlePlayPreview}
            disabled={!readiness.audio || isPlaying}
          >
            Audio Preview
          </Button>
          <Button
            variant="text"
            color="inherit"
            startIcon={<StopIcon />}
            onClick={handleStopPreview}
            disabled={!isPlaying}
          >
            Stop
          </Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }}>
        <Chip
          color={readiness.audio ? "success" : "default"}
          label={readiness.audio
            ? `Audio Ready • ${labelForLanguage(audioLanguage)} • ${voice}`
            : "Audio needs scene text"}
        />
        {!previewVoiceAvailable ? (
          <Chip
            color="warning"
            label={`Browser preview voice missing for ${labelForLanguage(audioLanguage)}`}
          />
        ) : null}
        <Chip
          color="info"
          label={`Overlay • ${labelForLanguage(overlayLanguage)} • ${textMode}`}
        />
        <Chip
          color={readiness.subtitles ? "success" : "default"}
          label={readiness.subtitles
            ? `Subtitle Ready • ${labelForLanguage(subtitleLanguage)} • ${captionPosition} • ${subtitleLineCount} line${subtitleLineCount > 1 ? "s" : ""}`
            : "Subtitle needs scene text"}
        />
        <Chip
          color={readiness.media ? "success" : "warning"}
          label={readiness.media ? `Media Ready • ${mediaHints.length} cues` : "Media cues are weak"}
        />
      </Stack>

      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Subtitle Preview
          </Typography>
          <Box
            sx={{
              minHeight: 116,
              borderRadius: 2,
              bgcolor: "#101723",
              color: "white",
              p: 2,
              display: "flex",
              flexDirection: "column",
              justifyContent: captionPosition === "top"
                ? "flex-start"
                : (captionPosition === "center" ? "center" : "flex-end"),
              alignItems: "center",
              gap: 1,
            }}
          >
            {subtitleLines.length > 0 ? subtitleLines.map((line, index) => (
              <Typography
                key={`${line}-${index}`}
                sx={{
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  fontSize: {
                    xs: `${0.95 * subtitleFontScale}rem`,
                    md: `${1.2 * subtitleFontScale}rem`,
                  },
                }}
              >
                {index === subtitleLines.length - 1 ? (
                  <Box component="span" sx={{ bgcolor: captionBackgroundColor, px: 1, py: 0.4, borderRadius: 1 }}>
                    {line}
                  </Box>
                ) : line}
              </Typography>
            )) : (
              <Typography variant="body2" color="rgba(255,255,255,0.72)">
                Enter scene text to preview subtitle layout.
              </Typography>
            )}
          </Box>
        </Box>

        <Box>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Media Hints
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {mediaHints.length > 0 ? mediaHints.map((hint) => (
              <Chip key={hint} size="small" variant="outlined" label={hint} />
            )) : (
              <Typography variant="body2" color="text.secondary">
                Add subcategory, keywords, headline, or search terms to improve background selection.
              </Typography>
            )}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
};

export default ScenePreviewPanel;
