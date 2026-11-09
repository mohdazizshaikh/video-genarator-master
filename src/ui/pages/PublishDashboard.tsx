/**
 * Publish Dashboard Page - Main publishing interface
 * Allows users to select videos, choose platforms, set metadata, and publish
 */

import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Chip,
} from "@mui/material";
import {
  Send as SendIcon,
  ArrowBack as BackIcon,
  ArrowForward as NextIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import VideoSelector from "../components/publish/VideoSelector";
import PlatformSelector from "../components/publish/PlatformSelector";
import MetadataEditor from "../components/publish/MetadataEditor";
import SchedulePicker from "../components/publish/SchedulePicker";
import PublishStatusTracker from "../components/publish/PublishStatusTracker";
import { usePublish } from "../hooks/usePublish";
import { useNotification } from "../store/uiStore";
import { api } from "../services/apiClient";
import { useQuery } from "../hooks/useQuery";

export interface SelectedVideo {
  id: string;
  name: string;
}

export interface PlatformMetadata {
  youtube?: {
    title?: string;
    description?: string;
    tags?: string[];
    categoryId?: string;
  };
  telegram?: {
    caption?: string;
  };
  instagram?: {
    caption?: string;
    hashtags?: string[];
  };
  facebook?: {
    title?: string;
    description?: string;
    hashtags?: string[];
  };
}

interface GeneratedMetadataPayload {
  metadata: {
    title: string;
    description: string;
    tags: string[];
    hashtags: string;
  };
  source: {
    topic: string;
    category: string | null;
    subcategory: string | null;
    keywords: string[];
    headlines: string[];
  };
}

export interface ScheduleConfig {
  publishImmediately: boolean;
  scheduledDate?: string;
  scheduledTime?: string;
  timezone?: string;
}

const STEPS = ["Select Videos", "Choose Platforms", "Add Metadata", "Schedule & Review", "Publish"];

export const PublishDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { warning: warnNotification } = useNotification();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedVideos, setSelectedVideos] = useState<SelectedVideo[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [metadata, setMetadata] = useState<PlatformMetadata>({});
  const [metadataContext, setMetadataContext] = useState<GeneratedMetadataPayload["source"] | null>(null);
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleConfig>({
    publishImmediately: true,
    timezone: "UTC",
  });
  const [publishedJobIds, setPublishedJobIds] = useState<string[]>([]);

  // Fetch videos list
  const { data: videosList, isLoading: videosLoading } = useQuery<unknown[]>(
    () => api.videos.list(),
    { cacheTTL: 30000 }
  );

  // Publish hook
  const [publishAsync, { loading: isPublishing, error: publishError }] = usePublish();

  // Keyboard shortcut: Ctrl+P to publish
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        if (activeStep === 4 && !isPublishing) {
          handlePublish();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [activeStep, isPublishing]);

  useEffect(() => {
    const autofillMetadata = async () => {
      if (activeStep !== 2 || selectedVideos.length !== 1 || selectedPlatforms.length === 0) {
        return;
      }

      setIsGeneratingMetadata(true);
      try {
        const videoId = selectedVideos[0]?.id;
        if (!videoId) return;

        const generatedEntries = await Promise.all(
          selectedPlatforms.map(async (platform) => {
            const result = await api.publish.getMetadataSuggestions({
              videoId,
              platform,
              language: "en",
            }) as GeneratedMetadataPayload;
            return { platform, result };
          }),
        );

        setMetadata((current) => {
          const next = { ...current };

          for (const { platform, result } of generatedEntries) {
            const generated = result.metadata;
            if (platform === "youtube" && !next.youtube) {
              next.youtube = {
                title: generated.title,
                description: generated.description,
                tags: generated.tags,
              };
            }
            if (platform === "telegram" && !next.telegram) {
              next.telegram = {
                caption: `${generated.title}\n\n${generated.description}`.trim(),
              };
            }
            if (platform === "instagram" && !next.instagram) {
              next.instagram = {
                caption: `${generated.title}\n\n${generated.description}`.trim(),
                hashtags: generated.hashtags.split(/\s+/).filter(Boolean),
              };
            }
            if (platform === "facebook" && !next.facebook) {
              next.facebook = {
                title: generated.title,
                description: generated.description,
                hashtags: generated.hashtags.split(/\s+/).filter(Boolean),
              };
            }
          }

          return next;
        });

        setMetadataContext(generatedEntries[0]?.result.source ?? null);
      } catch (error) {
        console.error("Metadata autofill failed:", error);
      } finally {
        setIsGeneratingMetadata(false);
      }
    };

    void autofillMetadata();
  }, [activeStep, selectedPlatforms, selectedVideos]);

  // Validation
  const isVideoStepValid = selectedVideos.length > 0;
  const isPlatformStepValid = selectedPlatforms.length > 0;
  const isMetadataStepValid = validateMetadata();
  const isScheduleStepValid = true; // All schedule configs are valid (immediate or with date/time)

  function validateMetadata(): boolean {
    if (!metadata || Object.keys(metadata).length === 0) return false;

    return selectedPlatforms.every((platform) => {
      const platformKey = platform as keyof PlatformMetadata;
      const platformMeta = metadata[platformKey];
      if (!platformMeta) return false;

      if (platform === "youtube") {
        const yt = metadata.youtube;
        return !!(yt?.title && yt?.description);
      }
      if (platform === "instagram") {
        return !!metadata.instagram?.caption;
      }
      if (platform === "facebook") {
        const fb = metadata.facebook;
        return !!(fb?.title && fb?.description);
      }
      if (platform === "telegram") {
        return !!metadata.telegram?.caption;
      }
      return true;
    });
  }

  const handleNext = () => {
    if (activeStep === 0 && !isVideoStepValid) {
      warnNotification("Please select at least one video");
      return;
    }
    if (activeStep === 1 && !isPlatformStepValid) {
      warnNotification("Please select at least one platform");
      return;
    }
    if (activeStep === 2 && !isMetadataStepValid) {
      warnNotification("Please fill in all required metadata fields");
      return;
    }
    if (activeStep === 3 && !isScheduleStepValid) {
      warnNotification("Please configure the publishing schedule");
      return;
    }
    setActiveStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handlePublish = async () => {
    try {
      const result = await publishAsync({
        videoIds: selectedVideos.map((v) => v.id),
        platforms: selectedPlatforms,
        metadata,
        schedule,
      });

      if (result) {
        setPublishedJobIds(result.jobIds);
        setActiveStep(4); // Move to status tracker
      }
    } catch (error) {
      console.error("Publish error:", error);
    }
  };

  // Render appropriate step content
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <VideoSelector
            videos={videosList || []}
            selected={selectedVideos}
            onSelectionChange={setSelectedVideos}
            isLoading={videosLoading}
          />
        );
      case 1:
        return (
          <PlatformSelector
            selected={selectedPlatforms}
            onSelectionChange={setSelectedPlatforms}
          />
        );
      case 2:
        return (
          <>
            {metadataContext && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Metadata seeded from video context:
                <Box sx={{ display: "inline-flex", gap: 1, flexWrap: "wrap", ml: 1 }}>
                  {metadataContext.category && <Chip size="small" label={`Category: ${metadataContext.category}`} />}
                  {metadataContext.subcategory && <Chip size="small" label={`Subcategory: ${metadataContext.subcategory}`} />}
                  {metadataContext.keywords.slice(0, 5).map((keyword) => (
                    <Chip key={keyword} size="small" variant="outlined" label={keyword} />
                  ))}
                  {metadataContext.headlines.slice(0, 2).map((headline) => (
                    <Chip key={headline} size="small" color="primary" variant="outlined" label={headline} />
                  ))}
                </Box>
              </Alert>
            )}
            {isGeneratingMetadata && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Generating metadata suggestions from saved video keywords and subcategory...
              </Alert>
            )}
            <MetadataEditor
              platforms={selectedPlatforms}
              metadata={metadata}
              onMetadataChange={setMetadata}
            />
          </>
        );
      case 3:
        return (
          <SchedulePicker
            schedule={schedule}
            onScheduleChange={setSchedule}
          />
        );
      case 4:
        return (
          <PublishStatusTracker
            jobIds={publishedJobIds}
            isLoading={isPublishing}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          📤 Publish Videos to Platforms
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Select videos, configure metadata, and publish to multiple platforms at once.
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }} action={<Button color="inherit" onClick={() => navigate("/releases")}>Open Releases</Button>}>
        Publishing requires an approved release and a verified destination. Use Releases to review and queue the rendered content.
      </Alert>

      <Paper sx={{ p: 4 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step content */}
        <Box sx={{ minHeight: 400, mb: 4 }}>
          {renderStepContent()}
        </Box>

        {/* Status message */}
        {activeStep < 4 && selectedVideos.length > 0 && (
          <Alert severity="info" sx={{ mb: 3 }}>
            📌 Selected: {selectedVideos.length} video(s) | Platforms: {selectedPlatforms.length}
          </Alert>
        )}

        {/* Error message */}
        {publishError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {publishError}
          </Alert>
        )}

        {/* Navigation buttons */}
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
          <Button
            onClick={() => navigate("/")}
            variant="outlined"
            startIcon={<BackIcon />}
          >
            Cancel
          </Button>

          <Box sx={{ display: "flex", gap: 2 }}>
            {activeStep > 0 && activeStep < 4 && (
              <Button
                onClick={handleBack}
                variant="outlined"
                startIcon={<BackIcon />}
              >
                Back
              </Button>
            )}

            {activeStep < 4 && (
              <Button
                onClick={handleNext}
                variant="contained"
                endIcon={<NextIcon />}
              >
                Next
              </Button>
            )}

            {activeStep === 4 && (
              <Button
                onClick={handlePublish}
                variant="contained"
                color="success"
                disabled={isPublishing}
                startIcon={isPublishing ? <CircularProgress size={20} /> : <SendIcon />}
              >
                {isPublishing ? "Publishing..." : "Publish (Ctrl+P)"}
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Help text */}
      <Box sx={{ mt: 4, p: 2, backgroundColor: "#f5f5f5", borderRadius: 1 }}>
        <Typography variant="caption" color="textSecondary">
          💡 Tip: Use keyboard shortcut <strong>Ctrl+P</strong> to publish when on the final step.
        </Typography>
      </Box>
    </Container>
  );
};

export default PublishDashboard;
