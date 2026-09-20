/**
 * Advanced sports overlay for cricket, football, basketball, and other sports.
 * It presents event context and scores only when supplied by the scene metadata;
 * it never invents teams, scores, dates, or player names.
 */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { videoUiFontFamily } from "./fontStacks";
import type { VideoTheme } from "./ThemeEngine";

type SportsOverlayProps = {
  headline?: string;
  subcategory?: string;
  sceneIndex: number;
  totalScenes: number;
  theme: VideoTheme;
};

const sportLabel = (subcategory?: string, headline?: string): string => {
  const value = `${subcategory || ""} ${headline || ""}`.toLowerCase();
  if (value.includes("cricket") || value.includes("ipl") || value.includes("wicket")) return "CRICKET";
  if (value.includes("football") || value.includes("soccer") || value.includes("goal")) return "FOOTBALL";
  if (value.includes("basketball") || value.includes("nba") || value.includes("hoops")) return "BASKETBALL";
  if (value.includes("tennis")) return "TENNIS";
  return "SPORTS";
};

export const SportsOverlay: React.FC<SportsOverlayProps> = ({
  headline,
  subcategory,
  sceneIndex,
  totalScenes,
  theme,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8, 18], [0, 1, 1], { extrapolateRight: "clamp" });
  const x = interpolate(frame, [0, 16], [-34, 0], { extrapolateRight: "clamp" });
  const pulse = interpolate(frame % 24, [0, 12, 24], [1, 1.06, 1], { extrapolateRight: "clamp" });
  const label = sportLabel(subcategory, headline);

  return (
    <AbsoluteFill style={{ pointerEvents: "none", fontFamily: videoUiFontFamily, color: "#fff" }}>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(4,12,10,0.08) 36%, rgba(4,12,10,0.72) 100%)" }} />
      <div style={{ position: "absolute", top: 42, left: 42, right: 42, display: "flex", justifyContent: "space-between", alignItems: "center", opacity }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 24, fontWeight: 900, letterSpacing: 2.4 }}>
          <span style={{ width: 16, height: 16, borderRadius: "50%", background: theme.palette.accent, transform: `scale(${pulse})`, boxShadow: `0 0 24px ${theme.palette.accentGlow}` }} />
          {label}
        </div>
        <div style={{ padding: "10px 16px", borderRadius: 12, background: "rgba(4,12,10,0.44)", border: "1px solid rgba(255,255,255,0.26)", fontSize: 21, fontWeight: 800 }}>
          {String(sceneIndex + 1).padStart(2, "0")} / {String(totalScenes).padStart(2, "0")}
        </div>
      </div>
      <div style={{ position: "absolute", left: 42, right: 42, bottom: 144, opacity, transform: `translateX(${x}px)` }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "9px 14px", borderRadius: 10, background: theme.palette.accent, color: "#06120d", fontSize: 18, fontWeight: 900, letterSpacing: 1.7, textTransform: "uppercase" }}>
          {subcategory || "Match insight"}
        </div>
        <div style={{ marginTop: 14, maxWidth: 980, fontSize: 56, lineHeight: 1.04, fontWeight: 850, letterSpacing: -1.1, textShadow: "0 5px 18px rgba(0,0,0,0.42)" }}>
          {headline || "The moment that changed the game"}
        </div>
        <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 190, height: 6, borderRadius: 99, background: "rgba(255,255,255,0.24)", overflow: "hidden" }}>
            <div style={{ width: `${((sceneIndex + 1) / Math.max(1, totalScenes)) * 100}%`, height: "100%", background: theme.palette.accent }} />
          </div>
          <span style={{ fontSize: 18, opacity: 0.78 }}>PLAY BY PLAY</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
