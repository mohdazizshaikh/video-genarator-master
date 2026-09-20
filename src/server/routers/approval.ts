import { Router, json } from "express";
import type { Request, Response } from "express";
import { ApprovalEngine } from "../../services/ApprovalEngine";
import { ModerationEngine } from "../../services/ModerationEngine";
import { ValidationEngine } from "../../services/ValidationEngine";
import type { Config } from "../../config";
import { getAuthenticatedTenantId, isAdminRequest } from "../auth";
function tenantIdFrom(req: Request): string {
  const tenantId = getAuthenticatedTenantId(req);
  if (!tenantId) throw new Error("Authenticated workspace is required");
  return tenantId;
}
function canHumanReview(req: Request): boolean {
  if (isAdminRequest(req)) return true;
  const permissions = (req as Request & { auth?: { permissions?: string[] } }).auth?.permissions || [];
  return permissions.includes("release:approve") || permissions.includes("workspace:admin") || permissions.includes("admin");
}


export class ApprovalRouter {
  public router: Router;
  private approval: ApprovalEngine;
  private moderation: ModerationEngine;
  private validation: ValidationEngine;

  constructor(config: Config) {
    this.router = Router();
    this.router.use(json());
    this.approval = new ApprovalEngine(config.dataDirPath);
    this.moderation = new ModerationEngine();
    this.validation = new ValidationEngine();
    this.register();
  }

  private register() {
    // Approval queue
    this.router.get("/queue", (req: Request, res: Response) => {
      res.json({ status: "ok", data: this.approval.getAll(tenantIdFrom(req)) });
    });
    this.router.get("/queue/pending", (req: Request, res: Response) => {
      res.json({ status: "ok", data: this.approval.getPending(tenantIdFrom(req)) });
    });
    this.router.get("/queue/stats", (req: Request, res: Response) => {
      res.json({ status: "ok", data: this.approval.getStats(tenantIdFrom(req)) });
    });
    this.router.post("/queue/submit", (req: Request, res: Response) => {
      const { contentId, contentType, title, submittedBy, priority } = req.body;
      if (!contentId || !contentType || !title || !submittedBy) {
        res.status(400).json({ error: "contentId, contentType, title, submittedBy required" });
        return;
      }
      res.status(201).json({ status: "ok", data: this.approval.submit(tenantIdFrom(req), contentId, contentType, title, submittedBy, priority) });
    });
    this.router.post("/queue/:id/auto-check", (req: Request, res: Response) => {
      const { text } = req.body;
      try {
        res.json({ status: "ok", data: this.approval.autoCheck(tenantIdFrom(req), req.params.id, text) });
      } catch (err) {
        res.status(404).json({ error: String(err) });
      }
    });
    this.router.post("/queue/:id/review", (req: Request, res: Response) => {
      if (!canHumanReview(req)) { res.status(403).json({ error: "Human review permission required" }); return; }
      const { status, reviewedBy, comments } = req.body;
      if (!status || !reviewedBy) { res.status(400).json({ error: "status and reviewedBy required" }); return; }
      try {
        res.json({ status: "ok", data: this.approval.review(tenantIdFrom(req), req.params.id, status, reviewedBy, comments) });
      } catch (err) {
        res.status(404).json({ error: String(err) });
      }
    });
    this.router.patch("/queue/:id/checklist", (req: Request, res: Response) => {
      if (!canHumanReview(req)) { res.status(403).json({ error: "Human review permission required" }); return; }
      const { checks } = req.body;
      if (!checks) { res.status(400).json({ error: "checks required" }); return; }
      try {
        res.json({ status: "ok", data: this.approval.updateChecklist(tenantIdFrom(req), req.params.id, checks) });
      } catch (err) {
        res.status(404).json({ error: String(err) });
      }
    });

    // Moderation
    this.router.post("/moderate", (req: Request, res: Response) => {
      const { text } = req.body;
      if (!text) { res.status(400).json({ error: "text required" }); return; }
      res.json({ status: "ok", data: this.moderation.scan(text) });
    });
    this.router.post("/moderate/batch", (req: Request, res: Response) => {
      const { items } = req.body;
      if (!items || !Array.isArray(items)) { res.status(400).json({ error: "items array required" }); return; }
      res.json({ status: "ok", data: this.moderation.batchScan(items) });
    });
    this.router.get("/moderate/rules", (_req: Request, res: Response) => {
      res.json({ status: "ok", data: this.moderation.getRules() });
    });

    // Validation
    this.router.post("/validate/video", (req: Request, res: Response) => {
      const input = req.body;
      if (!input.platform) { res.status(400).json({ error: "platform required" }); return; }
      res.json({ status: "ok", data: this.validation.validateVideo(input) });
    });
    this.router.post("/validate/metadata", (req: Request, res: Response) => {
      const input = req.body;
      if (!input.platform) { res.status(400).json({ error: "platform required" }); return; }
      res.json({ status: "ok", data: this.validation.validateMetadata(input) });
    });
    this.router.post("/validate/image", (req: Request, res: Response) => {
      const input = req.body;
      if (!input.platform) { res.status(400).json({ error: "platform required" }); return; }
      res.json({ status: "ok", data: this.validation.validateImage(input) });
    });
    this.router.get("/validate/platforms", (_req: Request, res: Response) => {
      res.json({ status: "ok", data: this.validation.getSupportedPlatforms() });
    });
  }
}
