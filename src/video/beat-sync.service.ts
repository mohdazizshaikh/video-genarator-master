/**
 * Beat Sync Service - Align video scenes with music beats
 * Adjusts scene durations to create rhythm-matched editing
 */

import { logger } from "../logger";
import type { Scene } from "../types/shorts";

export interface BeatSyncConfig {
  bpm: number; // Beats per minute of background music
  beatsPerBar: number; // Usually 4 (4/4 time)
  enforceAlignment: boolean; // If true, force strict alignment; if false, suggest
}

export interface SyncedScene {
  original: Scene;
  adjustedDurationMs: number;
  beatAlignment: number; // How well aligned (0-1)
  suggestion?: string;
}

export class BeatSyncService {
  /**
   * Analyze and synchronize scenes to music beats
   */
  syncScenesToBeats(
    scenes: Scene[],
    config: BeatSyncConfig,
  ): SyncedScene[] {
    const beatLengthMs = this.calculateBeatLength(config.bpm);
    const barLengthMs = beatLengthMs * config.beatsPerBar;

    logger.debug(
      { bpm: config.bpm, beatLengthMs, barLengthMs },
      "Beat sync initialized",
    );

    return scenes.map((scene, index) => {
      const currentDurationMs = (scene as Scene & { duration?: number }).duration || 3000; // default 3s
      const optimalDurationMs = this.findOptimalDuration(
        currentDurationMs,
        beatLengthMs,
        barLengthMs,
      );

      const beatAlignment = this.calculateAlignment(currentDurationMs, optimalDurationMs);

      const suggestion =
        Math.abs(currentDurationMs - optimalDurationMs) > 100
          ? `Scene ${index}: Adjust from ${currentDurationMs}ms to ${optimalDurationMs}ms for better beat sync`
          : undefined;

      return {
        original: scene,
        adjustedDurationMs: config.enforceAlignment ? optimalDurationMs : currentDurationMs,
        beatAlignment,
        suggestion,
      };
    });
  }

  /**
   * Apply synced durations back to scenes
   */
  applySyncToScenes(syncedScenes: SyncedScene[]): Scene[] {
    return syncedScenes.map((synced) => ({
      ...synced.original,
      duration: synced.adjustedDurationMs,
    }));
  }

  /**
   * Calculate beat length in milliseconds
   */
  private calculateBeatLength(bpm: number): number {
    // bpm = beats per minute
    // beat length = 60000ms / bpm
    return (60000 / bpm) * 1000; // actual calculation
  }

  /**
   * Find optimal duration that aligns with beats
   */
  private findOptimalDuration(
    currentMs: number,
    beatLengthMs: number,
    barLengthMs: number,
  ): number {
    // Try to snap to nearest musical boundary
    // Order of preference: bar, half-bar, beat, half-beat

    const candidates = [
      { duration: barLengthMs, distance: Math.abs(currentMs - barLengthMs), label: "bar" },
      { duration: barLengthMs / 2, distance: Math.abs(currentMs - barLengthMs / 2), label: "half-bar" },
      { duration: beatLengthMs, distance: Math.abs(currentMs - beatLengthMs), label: "beat" },
      { duration: beatLengthMs / 2, distance: Math.abs(currentMs - beatLengthMs / 2), label: "half-beat" },
    ];

    // Only snap if within ~20% tolerance
    const tolerance = currentMs * 0.2;
    const validCandidates = candidates.filter((c) => c.distance <= tolerance);

    if (validCandidates.length === 0) {
      // No good snap point, keep current
      return currentMs;
    }

    // Return closest snap point
    return validCandidates.reduce((best, current) =>
      current.distance < best.distance ? current : best,
    ).duration;
  }

  /**
   * Calculate how well a duration aligns with beats (0-1)
   */
  private calculateAlignment(currentMs: number, optimalMs: number): number {
    if (optimalMs === 0) return 0;
    const diff = Math.abs(currentMs - optimalMs);
    const maxAcceptableDiff = currentMs * 0.1; // 10% tolerance = perfect
    return Math.max(0, 1 - diff / maxAcceptableDiff);
  }

  /**
   * Suggest optimal BPM for given scene durations
   */
  suggestBPM(scenes: Scene[]): number {
    if (scenes.length === 0) return 120; // default

    const avgDurationMs = scenes.reduce((sum, s) => sum + ((s as Scene & { duration?: number }).duration || 3000), 0) / scenes.length;
    const estimatedBPM = (60000 / avgDurationMs) * 1000;

    // Round to nearest common BPM
    const commonBPMs = [80, 90, 100, 110, 120, 130, 140, 150];
    return commonBPMs.reduce((prev, curr) =>
      Math.abs(curr - estimatedBPM) < Math.abs(prev - estimatedBPM) ? curr : prev,
    );
  }

  /**
   * Get sync statistics for monitoring
   */
  getSyncStats(syncedScenes: SyncedScene[]): {
    avgAlignment: number;
    wellAlignedCount: number;
    suggestionsCount: number;
    totalAdjustmentMs: number;
  } {
    const alignments = syncedScenes.map((s) => s.beatAlignment);
    const avgAlignment = alignments.reduce((sum, a) => sum + a, 0) / alignments.length;
    const wellAlignedCount = alignments.filter((a) => a > 0.8).length;
    const suggestionsCount = syncedScenes.filter((s) => s.suggestion).length;
    const totalAdjustmentMs = syncedScenes.reduce(
      (sum, s) => sum + Math.abs(s.adjustedDurationMs - ((s.original as Scene & { duration?: number }).duration || 3000)),
      0,
    );

    return {
      avgAlignment,
      wellAlignedCount,
      suggestionsCount,
      totalAdjustmentMs,
    };
  }
}
