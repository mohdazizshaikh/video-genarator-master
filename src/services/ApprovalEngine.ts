/* eslint-disable @remotion/deterministic-randomness */

import fs from "fs-extra";
import path from "path";
import { logger } from "../logger";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "needs_revision";

export interface ApprovalItem {
  /** Workspace ownership is mandatory for all newly-created records. */
  tenantId: string;
  id: string;
  contentId: string;
  contentType: "video" | "image" | "caption" | "script";
  title: string;
  submittedBy: string;
  submittedAt: string;
  status: ApprovalStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  comments?: string;
  checklist: ChecklistItem[];
  priority: "low" | "medium" | "high";
  reviewHistory?: Array<{ action: string; actor: string; at: string; comments?: string }>;
}

export interface ChecklistItem {
  id: string;
  label: string;
  passed: boolean;
  required: boolean;
}

const DEFAULT_CHECKLIST: Omit<ChecklistItem, "passed">[] = [
  { id: "no_hate_speech", label: "No hate speech or discriminatory content", required: true },
  { id: "no_explicit", label: "No explicit or adult content", required: true },
  { id: "no_misleading", label: "No misleading or false claims", required: true },
  { id: "has_cta", label: "Has a clear call-to-action", required: false },
  { id: "correct_aspect", label: "Correct aspect ratio for platform", required: false },
  { id: "has_captions", label: "Captions/subtitles included", required: false },
  { id: "brand_guidelines", label: "Follows brand guidelines", required: false },
  { id: "copyright_clear", label: "No copyright violations", required: true },
];

export class ApprovalEngine {
  private dataPath: string;
  private items: ApprovalItem[] = [];

  constructor(dataDirPath: string) {
    this.dataPath = path.join(dataDirPath, "approval-queue.json");
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.dataPath)) this.items = fs.readJsonSync(this.dataPath);
    } catch { this.items = []; }
  }

  private save() {
    try { fs.writeJsonSync(this.dataPath, this.items, { spaces: 2 }); } catch { /* ignore */ }
  }

  submit(tenantId: string, contentId: string, contentType: ApprovalItem["contentType"], title: string, submittedBy: string, priority: ApprovalItem["priority"] = "medium"): ApprovalItem {
    const id = `apr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const item: ApprovalItem = {
      tenantId,
      id, contentId, contentType, title, submittedBy,
      submittedAt: new Date().toISOString(),
      status: "pending",
      priority,
      reviewHistory: [],
      checklist: DEFAULT_CHECKLIST.map((c) => ({ ...c, passed: false })),
    };
    this.items.push(item);
    this.save();
    logger.debug({ id, contentId }, "ApprovalEngine: item submitted");
    return item;
  }

  autoCheck(tenantId: string, itemId: string, text?: string): ApprovalItem {
    const item = this.items.find((i) => i.id === itemId && i.tenantId === tenantId);
    if (!item) throw new Error(`Approval item ${itemId} not found`);
    const lower = (text || item.title).toLowerCase();

    item.reviewHistory = item.reviewHistory ?? [];
    item.reviewHistory.push({ action: "auto_check", actor: "system", at: new Date().toISOString(), comments: item.comments });
    item.checklist = item.checklist.map((c) => {
      let passed = c.passed;
      if (c.id === "no_hate_speech") passed = !/\b(hate|racist|sexist|slur)\b/.test(lower);
      if (c.id === "no_explicit") passed = !/\b(explicit|nude|xxx|adult)\b/.test(lower);
      if (c.id === "no_misleading") passed = !/\b(guaranteed|100%|miracle|cure|overnight)\b/.test(lower);
      if (c.id === "has_cta") passed = /\b(follow|like|share|subscribe|comment|click|watch)\b/.test(lower);
      if (c.id === "copyright_clear") passed = !/\b(copyright|©|all rights reserved)\b/.test(lower);
      return { ...c, passed };
    });

    const requiredFailed = item.checklist.filter((c) => c.required && !c.passed);
    if (requiredFailed.length === 0) {
      // Automated checks are advisory only. Explicit human review remains mandatory.
      item.status = "pending";
      item.comments = "Automated checks passed; explicit human approval is still required.";
    } else {
      item.status = "needs_revision";
      item.comments = `Auto-check failed: ${requiredFailed.map((c) => c.label).join(", ")}`;
    }
    this.save();
    return item;
  }

  review(tenantId: string, itemId: string, status: ApprovalStatus, reviewedBy: string, comments?: string): ApprovalItem {
    const item = this.items.find((i) => i.id === itemId && i.tenantId === tenantId);
    if (!item) throw new Error(`Approval item ${itemId} not found`);
    if (status === "approved" && item.checklist.some((check) => check.required && !check.passed)) {
      throw new Error("Required approval checks must pass before human approval");
    }
    item.status = status;
    item.reviewHistory = item.reviewHistory ?? [];
    item.reviewHistory.push({ action: status === "needs_revision" ? "revision_requested" : "human_review", actor: reviewedBy, at: new Date().toISOString(), comments });
    item.reviewedBy = reviewedBy;
    item.reviewedAt = new Date().toISOString();
    if (comments) item.comments = comments;
    this.save();
    logger.debug({ itemId, status }, "ApprovalEngine: reviewed");
    return item;
  }

  updateChecklist(tenantId: string, itemId: string, checks: Record<string, boolean>): ApprovalItem {
    const item = this.items.find((i) => i.id === itemId && i.tenantId === tenantId);
    if (!item) throw new Error(`Approval item ${itemId} not found`);
    item.reviewHistory = item.reviewHistory ?? [];
    item.reviewHistory.push({ action: "checklist_updated", actor: "human", at: new Date().toISOString() });
    item.checklist = item.checklist.map((c) => checks[c.id] !== undefined ? { ...c, passed: checks[c.id] } : c);
    this.save();
    return item;
  }

  getPending(tenantId: string): ApprovalItem[] { return this.items.filter((i) => i.tenantId === tenantId && i.status === "pending"); }
  getAll(tenantId: string): ApprovalItem[] { return this.items.filter((i) => i.tenantId === tenantId); }
  getById(tenantId: string, id: string): ApprovalItem | undefined { return this.items.find((i) => i.id === id && i.tenantId === tenantId); }

  getStats(tenantId: string) {
    const items = this.items.filter((i) => i.tenantId === tenantId);
    return {
      total: items.length,
      pending: items.filter((i) => i.status === "pending").length,
      approved: items.filter((i) => i.status === "approved").length,
      rejected: items.filter((i) => i.status === "rejected").length,
      needsRevision: items.filter((i) => i.status === "needs_revision").length,
    };
  }
}
