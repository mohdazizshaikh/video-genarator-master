import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  Audio,
  OffthreadVideo,
  Img,
  interpolate,
} from "remotion";
import { z } from "zod";

import {
  calculateVolume,
  createCaptionPages,
  shortVideoSchema,
} from "../utils";
import { NewsOverlay } from "./NewsOverlay";
import { MarketingOverlay } from "./MarketingOverlay";
import { AdvancedKnowledgeOverlay } from "./AdvancedKnowledgeOverlay";
import { SportsOverlay } from "./SportsOverlay";
import { ITProductShowcaseOverlay } from "./ITProductShowcaseOverlay";
import { TemplateChrome } from "./TemplateChrome";
import { resolveContentTemplate } from "./ContentTemplateEngine";
import { TextModeEnum } from "../../types/shorts";
import { videoUiFontFamily } from "./fontStacks";
import { pickTemplateVariant, resolveTheme, stableHash } from "./ThemeEngine";
import { resolveCategoryPipeline } from "./CategoryPipelineProfiles";

export const PortraitVideo: React.FC<z.infer<typeof shortVideoSchema>> = ({
  scenes,
  music,
  config,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const subtitleLineCount = Math.max(1, Math.min(3, config.subtitleLineCount ?? 1));
  const subtitleFontScale = config.subtitleFontScale ?? 1;
  const textMode = config.textMode ?? TextModeEnum.hybrid;
  const showOverlay = textMode !== TextModeEnum.captions;
  const showCaptions = textMode !== TextModeEnum.overlay;

  const theme = resolveTheme(
    config.category || "News",
    scenes.map((s) => s.subcategory || ""),
  );
  const variant = pickTemplateVariant(
    theme,
    stableHash(`${scenes[0]?.headline || ""}${(config.category || "")}${scenes.length}`).toString(),
    config.templateVariant,
  );

  const pipeline = resolveCategoryPipeline(config.category);
  const contentTemplate = resolveContentTemplate({
    category: config.category || "News",
    scenes,
    family: theme.family,
    override: config.contentTemplate || pipeline.template,
  });

  const isMarketing = pipeline.overlayMode === "marketing";
  const captionBackgroundColor = config.captionBackgroundColor ?? theme.palette.captionHighlight;

  const activeStyle = isMarketing
    ? {
        backgroundColor: captionBackgroundColor,
        padding: "6px 12px",
        marginLeft: "-6px",
        marginRight: "-6px",
        borderRadius: "8px",
        boxShadow: "0 5px 16px rgba(0,0,0,0.18)",
      }
    : {
        backgroundColor: captionBackgroundColor,
        padding: "10px 14px",
        marginLeft: "-10px",
        marginRight: "-10px",
        borderRadius: "14px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.24)",
      };

  const captionPosition = config.captionPosition ?? "center";
  let captionStyle = {};
  if (captionPosition === "top") {
    captionStyle = { top: 210 };
  }
  if (captionPosition === "center") {
    captionStyle = { top: "52%", transform: "translateY(-50%)" };
  }
  if (captionPosition === "bottom") {
    captionStyle = { bottom: 130 };
  }

  const [musicVolume, musicMuted] = calculateVolume(config.musicVolume);

  return (
    <AbsoluteFill style={{ backgroundColor: theme.palette.bg }}>
      <Audio
        loop
        src={music.url}
        startFrom={music.start * fps}
        endAt={music.end * fps}
        volume={() => musicVolume}
        muted={musicMuted}
      />

      {scenes.map((scene, i) => {
        const { captions, audio } = scene;
        const pages = createCaptionPages({
          captions,
          lineMaxLength: 20,
          lineCount: subtitleLineCount,
          maxDistanceMs: 1000,
        });

        const startFrame =
          scenes.slice(0, i).reduce((acc, curr) => acc + curr.audio.duration, 0) * fps;
        let durationInFrames = Math.max(1, Math.round(audio.duration * fps));
        if (config.paddingBack && i === scenes.length - 1) {
          durationInFrames += Math.round((config.paddingBack / 1000) * fps);
        }

        return (
          <Sequence
            from={startFrame}
            durationInFrames={durationInFrames}
            key={`scene-${i}`}
          >
            <SceneMedia scene={scene} durationInFrames={durationInFrames} variant={variant} />
            {showOverlay ? (
              pipeline.overlayMode === "it-showcase" ? (
                <ITProductShowcaseOverlay
                  headline={scene.headline}
                  subcategory={scene.subcategory}
                  sceneIndex={i}
                  totalScenes={scenes.length}
                  theme={theme}
                  profile={pipeline}
                />
              ) : isMarketing ? (
                <MarketingOverlay
                  headline={scene.headline}
                  sceneIndex={i}
                  totalScenes={scenes.length}
                  categoryLabel={theme.label}
                  theme={theme}
                />
              ) : pipeline.overlayMode === "news" ? (
                <NewsOverlay
                  headline={scene.headline}
                  sceneIndex={i}
                  totalScenes={scenes.length}
                  categoryLabel={theme.label}
                  theme={theme}
                  variant={variant}
                />
              ) : (
                pipeline.overlayMode === "sports" ? (
                  <SportsOverlay
                    headline={scene.headline}
                    subcategory={scene.subcategory}
                    sceneIndex={i}
                    totalScenes={scenes.length}
                    theme={theme}
                  />
                ) : (
                  <AdvancedKnowledgeOverlay
                    headline={scene.headline}
                    sceneIndex={i}
                    totalScenes={scenes.length}
                    theme={theme}
                    profile={pipeline}
                  />
                )
              )
            ) : null}
            <TemplateChrome
              template={contentTemplate}
              theme={theme}
              sceneIndex={i}
              totalScenes={scenes.length}
            />
            <Audio src={audio.url} />
            {showCaptions ? pages.map((page, j) => (
              <Sequence
                key={`scene-${i}-page-${j}`}
                from={Math.round((page.startMs / 1000) * fps)}
                durationInFrames={Math.max(
                  1,
                  Math.round(((page.endMs - page.startMs) / 1000) * fps),
                )}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    width: "100%",
                    ...captionStyle,
                  }}
                >
                  {page.lines.map((line, k) => (
                    <p
                      style={{
                        fontSize: `${isMarketing ? 4.7 : 5.8 * subtitleFontScale}em`,
                        fontFamily: videoUiFontFamily,
                        fontWeight: isMarketing ? 700 : 800,
                        color: "white",
                        WebkitTextStroke: isMarketing ? "1px rgba(5,8,14,0.55)" : "2px rgba(5,8,14,0.9)",
                        WebkitTextFillColor: "white",
                        textShadow: isMarketing ? "0px 6px 16px rgba(0,0,0,0.28)" : "0px 10px 22px rgba(0,0,0,0.42)",
                        textAlign: isMarketing ? "left" : "center",
                        width: isMarketing ? "88%" : "100%",
                        textTransform: isMarketing ? "none" : "uppercase",
                        letterSpacing: isMarketing ? 0 : 0.5,
                      }}
                      key={`scene-${i}-page-${j}-line-${k}`}
                    >
                      {line.texts.map((text, l) => {
                        const active =
                          frame >= startFrame + (text.startMs / 1000) * fps &&
                          frame <= startFrame + (text.endMs / 1000) * fps;
                        return (
                          <>
                            <span
                              style={{
                                fontWeight: 800,
                                ...(active ? activeStyle : {}),
                              }}
                              key={`scene-${i}-page-${j}-line-${k}-text-${l}`}
                            >
                              {text.text}
                            </span>
                            {l < line.texts.length - 1 ? " " : ""}
                          </>
                        );
                      })}
                    </p>
                  ))}
                </div>
              </Sequence>
            )) : null}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const SceneMedia: React.FC<{
  scene: z.infer<typeof shortVideoSchema>["scenes"][number];
  durationInFrames: number;
  variant: ReturnType<typeof pickTemplateVariant>;
}> = ({ scene, durationInFrames, variant }) => {
  const relativeFrame = useCurrentFrame();
  const impactStart = 6;
  const isImpact = variant === "bold" || variant === "dark";
  const driftX = interpolate(relativeFrame, [0, durationInFrames], [-18, 18], {
    extrapolateRight: "clamp",
  });
  const driftY = interpolate(relativeFrame, [0, durationInFrames], [10, -12], {
    extrapolateRight: "clamp",
  });
  const scale = isImpact
    ? interpolate(relativeFrame, [0, 10, durationInFrames], [1.35, 1.06, 1.1], {
        extrapolateRight: "clamp",
      })
    : interpolate(relativeFrame, [0, durationInFrames], [1.02, 1.1], {
        extrapolateRight: "clamp",
      });
  const opacity = interpolate(
    relativeFrame,
    [0, 8, Math.max(10, durationInFrames - 10), durationInFrames],
    [0, 1, 1, 0.86],
    { extrapolateRight: "clamp" },
  );

  const mediaStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: `translate(${driftX}px, ${driftY}px) scale(${scale})`,
    opacity,
  };

  return (
    <>
      {scene.video ? (
        <OffthreadVideo src={scene.video} muted style={mediaStyle} />
      ) : (
        <Img src={scene.imageUrl as string} style={mediaStyle} />
      )}
      {isImpact ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 46%)`,
            opacity: interpolate(relativeFrame, [0, impactStart, impactStart + 6], [1, 0, 0], {
              extrapolateRight: "clamp",
            }),
            mixBlendMode: "screen",
          }}
        />
      ) : null}
    </>
  );
};
