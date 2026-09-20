/**
 * IT Product & Services Showcase overlay.
 * Product-led composition for software, SaaS, websites, automation, AI, cloud,
 * cybersecurity, ERP/CRM, hosting, support, and custom development.
 * Never invents customer names, ratings, metrics, integrations, or guarantees.
 */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { videoUiFontFamily } from "./fontStacks";
import type { CategoryPipelineProfile } from "./CategoryPipelineProfiles";
import type { VideoTheme } from "./ThemeEngine";

type Props = { headline?: string; subcategory?: string; sceneIndex: number; totalScenes: number; theme: VideoTheme; profile: CategoryPipelineProfile };

function serviceLabel(subcategory?: string): string {
  const value = String(subcategory || "IT services").toLowerCase();
  if (/saas|software|app|product/.test(value)) return "SOFTWARE PRODUCT";
  if (/website|web|development/.test(value)) return "WEB SOLUTION";
  if (/automation|workflow|integration/.test(value)) return "AUTOMATION";
  if (/ai|artificial intelligence/.test(value)) return "AI SOLUTION";
  if (/cloud|hosting|devops/.test(value)) return "CLOUD & HOSTING";
  if (/security|cyber/.test(value)) return "CYBERSECURITY";
  if (/erp|crm|business system/.test(value)) return "BUSINESS SYSTEM";
  if (/support|maintenance/.test(value)) return "IT SUPPORT";
  return "IT SERVICES";
}

function capabilityChip(subcategory?: string): string {
  const value = String(subcategory || "").toLowerCase();
  if (/automation|workflow/.test(value)) return "Workflow";
  if (/security|cyber/.test(value)) return "Protection";
  if (/cloud|hosting|devops/.test(value)) return "Infrastructure";
  if (/ai/.test(value)) return "Intelligent tools";
  if (/erp|crm/.test(value)) return "Operations";
  if (/website|web/.test(value)) return "Digital presence";
  return "Built for your workflow";
}

export const ITProductShowcaseOverlay: React.FC<Props> = ({ headline, subcategory, sceneIndex, totalScenes, theme }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8, 20], [0, 1, 1], { extrapolateRight: "clamp" });
  const lift = interpolate(frame, [0, 18], [26, 0], { extrapolateRight: "clamp" });
  const progress = ((sceneIndex + 1) / Math.max(1, totalScenes)) * 100;
  const label = serviceLabel(subcategory);
  const chip = capabilityChip(subcategory);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", fontFamily: videoUiFontFamily, color: "#fff" }}>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(3,12,25,0.08) 22%, rgba(3,12,25,0.84) 100%)" }} />
      <div style={{ position: "absolute", top: 42, left: 46, right: 46, display: "flex", alignItems: "center", justifyContent: "space-between", opacity }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 20, fontWeight: 800, letterSpacing: 1.8 }}><span style={{ width: 15, height: 15, borderRadius: 5, background: theme.palette.accent, boxShadow: `0 0 24px ${theme.palette.accentGlow}` }} />{label}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 17, color: theme.palette.accentSoft }}><span>{String(sceneIndex + 1).padStart(2, "0")}</span><span style={{ width: 140, height: 5, borderRadius: 99, background: "rgba(255,255,255,0.25)", overflow: "hidden" }}><span style={{ display: "block", width: `${progress}%`, height: "100%", background: theme.palette.accent }} /></span></div>
      </div>
      <div style={{ position: "absolute", left: 46, right: 46, bottom: 150, opacity, transform: `translateY(${lift}px)` }}>
        <div style={{ maxWidth: 980, padding: "25px 30px 28px", borderRadius: 22, background: "rgba(5,18,35,0.72)", border: "1px solid rgba(255,255,255,0.22)", boxShadow: "0 18px 55px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.10)", backdropFilter: "blur(16px)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, marginBottom: 14 }}><div style={{ fontSize: 17, letterSpacing: 2, color: theme.palette.accentSoft, textTransform: "uppercase" }}>Built to make work clearer</div><div style={{ padding: "7px 12px", borderRadius: 999, background: `${theme.palette.accent}26`, border: `1px solid ${theme.palette.accent}70`, color: theme.palette.headlineColor, fontSize: 16, fontWeight: 700 }}>{chip}</div></div>
          <div style={{ fontSize: 49, lineHeight: 1.08, fontWeight: 760, letterSpacing: -1, color: theme.palette.headlineColor, textShadow: "0 4px 18px rgba(0,0,0,0.34)" }}>{headline || "Technology that fits the work"}</div>
          <div style={{ display: "flex", gap: 10, marginTop: 19, color: "rgba(255,255,255,0.82)", fontSize: 17 }}><span style={{ width: 8, height: 8, marginTop: 7, borderRadius: "50%", background: theme.palette.accent }} /><span>Show the capability, explain the outcome, then invite a practical next step.</span></div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
