/**
 * Marketing treatment: calm brand storytelling, not a newsroom overlay.
 * Use warm accent rules, restrained metadata, and a stable lower-third hierarchy.
 */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { videoUiFontFamily } from "./fontStacks";
import type { VideoTheme } from "./ThemeEngine";

type MarketingOverlayProps = {
  headline?: string;
  categoryLabel?: string;
  sceneIndex?: number;
  totalScenes?: number;
  theme: VideoTheme;
};

export const MarketingOverlay: React.FC<MarketingOverlayProps> = ({
  headline,
  categoryLabel,
  sceneIndex = 0,
  totalScenes = 1,
  theme,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12, 24], [0, 1, 1], {
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(frame, [0, 18], [22, 0], {
    extrapolateRight: "clamp",
  });
  const progress = Math.min(100, ((sceneIndex + 1) / Math.max(totalScenes, 1)) * 100);

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        fontFamily: videoUiFontFamily,
        color: "#ffffff",
      }}
    >
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(7,18,27,0.12) 0%, rgba(7,18,27,0.02) 44%, rgba(7,18,27,0.72) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 48,
          left: 48,
          right: 48,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          opacity,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 27,
            fontWeight: 800,
            letterSpacing: 1.2,
          }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: theme.palette.accent,
              boxShadow: `0 0 24px ${theme.palette.accentGlow}`,
            }}
          />
          {categoryLabel || "Aaditech Solution"}
        </div>
        <div
          style={{
            padding: "10px 16px",
            border: `1px solid rgba(255,255,255,0.34)`,
            borderRadius: 12,
            background: "rgba(7,18,27,0.36)",
            fontSize: 20,
            letterSpacing: 1.6,
          }}
        >
          {String(sceneIndex + 1).padStart(2, "0")} / {String(totalScenes).padStart(2, "0")}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 48,
          right: 48,
          bottom: 150,
          opacity,
          transform: `translateY(${translateY}px)`,
        }}
      >
        <div
          style={{
            width: 84,
            height: 6,
            borderRadius: 99,
            background: theme.palette.accent,
            marginBottom: 18,
          }}
        />
        <div
          style={{
            maxWidth: 930,
            fontSize: 58,
            lineHeight: 1.04,
            fontWeight: 800,
            letterSpacing: -1.2,
            color: theme.palette.headlineColor,
            textShadow: "0 5px 18px rgba(0,0,0,0.35)",
          }}
        >
          {headline || "Solutions that move your business forward"}
        </div>
        <div
          style={{
            marginTop: 20,
            width: `${progress}%`,
            maxWidth: 300,
            height: 4,
            background: theme.palette.accent,
            borderRadius: 99,
            opacity: 0.9,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
