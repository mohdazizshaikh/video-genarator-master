/**
 * Advanced knowledge overlay for trends, technology, gyan, quotes, and motivation.
 * Flexible enough for facts, explainers, short quotes, and reflective copy without
 * borrowing newsroom ticker/headline treatment.
 */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { videoUiFontFamily } from "./fontStacks";
import type { CategoryPipelineProfile } from "./CategoryPipelineProfiles";
import type { VideoTheme } from "./ThemeEngine";

type AdvancedKnowledgeOverlayProps = {
  headline?: string;
  sceneIndex: number;
  totalScenes: number;
  theme: VideoTheme;
  profile: CategoryPipelineProfile;
};

export const AdvancedKnowledgeOverlay: React.FC<AdvancedKnowledgeOverlayProps> = ({
  headline,
  sceneIndex,
  totalScenes,
  theme,
  profile,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8, 20], [0, 1, 1], { extrapolateRight: "clamp" });
  const lift = interpolate(frame, [0, 18], [28, 0], { extrapolateRight: "clamp" });
  const progress = ((sceneIndex + 1) / Math.max(1, totalScenes)) * 100;
  const isQuote = profile.category === "Motivation" || profile.category === "General";
  const label = profile.category === "Tech" ? "TECH INSIGHT" : profile.category === "Education" ? "GYAN" : profile.category === "Science" ? "EXPLAINED" : profile.category.toUpperCase();

  return (
    <AbsoluteFill style={{ pointerEvents: "none", fontFamily: videoUiFontFamily, color: "#fff" }}>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(5,12,24,0.04) 28%, rgba(5,12,24,0.76) 100%)" }} />
      <div style={{ position: "absolute", top: 44, left: 46, right: 46, display: "flex", alignItems: "center", justifyContent: "space-between", opacity }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 22, fontWeight: 800, letterSpacing: 2 }}>
          <span style={{ width: 15, height: 15, borderRadius: "50%", background: theme.palette.accent, boxShadow: `0 0 22px ${theme.palette.accentGlow}` }} />
          {label}
        </div>
        <div style={{ width: 160, height: 5, borderRadius: 99, background: "rgba(255,255,255,0.26)", overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: theme.palette.accent }} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 46, right: 46, bottom: 148, opacity, transform: `translateY(${lift}px)` }}>
        <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
          <div style={{ width: 8, borderRadius: 8, background: theme.palette.accent, boxShadow: `0 0 26px ${theme.palette.accentGlow}` }} />
          <div style={{ maxWidth: 980, padding: isQuote ? "28px 34px" : "22px 30px", borderRadius: 18, background: "rgba(7,18,30,0.60)", border: "1px solid rgba(255,255,255,0.20)", backdropFilter: "blur(14px)" }}>
            <div style={{ fontSize: 18, letterSpacing: 2.2, color: theme.palette.accentSoft, marginBottom: 12, textTransform: "uppercase" }}>
              {isQuote ? "A thought worth keeping" : "Key idea"}
            </div>
            <div style={{ fontSize: isQuote ? 54 : 48, lineHeight: 1.08, fontWeight: 750, letterSpacing: isQuote ? -1.3 : -0.7, color: theme.palette.headlineColor, textShadow: "0 4px 16px rgba(0,0,0,0.34)" }}>
              {headline || label}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
