/**
 * Generic category-aware overlay for non-news, non-marketing content.
 * It intentionally avoids ticker bars, breaking labels, and newsroom chrome.
 */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { videoUiFontFamily } from "./fontStacks";
import type { CategoryPipelineProfile } from "./CategoryPipelineProfiles";
import type { VideoTheme } from "./ThemeEngine";

type CategoryOverlayProps = {
  headline?: string;
  sceneIndex: number;
  totalScenes: number;
  theme: VideoTheme;
  profile: CategoryPipelineProfile;
};

export const CategoryOverlay: React.FC<CategoryOverlayProps> = ({
  headline,
  sceneIndex,
  totalScenes,
  theme,
  profile,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10, 20], [0, 1, 1], { extrapolateRight: "clamp" });
  const lift = interpolate(frame, [0, 16], [18, 0], { extrapolateRight: "clamp" });
  const isDynamic = profile.overlayMode === "dynamic";
  const isCinematic = profile.overlayMode === "cinematic";
  const titleSize = isDynamic ? 52 : isCinematic ? 56 : 50;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", fontFamily: videoUiFontFamily, color: "#fff" }}>
      <AbsoluteFill
        style={{
          background: isCinematic
            ? "linear-gradient(180deg, rgba(0,0,0,0.04) 35%, rgba(0,0,0,0.58) 100%)"
            : "linear-gradient(180deg, rgba(5,12,20,0.06) 45%, rgba(5,12,20,0.62) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 48,
          right: 48,
          bottom: 146,
          opacity,
          transform: `translateY(${lift}px)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: theme.palette.accent }} />
          <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1.8, textTransform: "uppercase" }}>
            {profile.category}
          </span>
          <span style={{ opacity: 0.7, fontSize: 20 }}>
            {sceneIndex + 1}/{totalScenes}
          </span>
        </div>
        <div
          style={{
            maxWidth: 930,
            fontSize: titleSize,
            lineHeight: 1.06,
            fontWeight: isDynamic ? 800 : 700,
            color: theme.palette.headlineColor,
            textShadow: "0 5px 18px rgba(0,0,0,0.36)",
          }}
        >
          {headline || profile.category}
        </div>
      </div>
    </AbsoluteFill>
  );
};
