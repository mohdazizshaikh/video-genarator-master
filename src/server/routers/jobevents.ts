import express, { Router } from "express";
import type { Request, Response } from "express";
import type { Config } from "../../config";
import { JobEventStore } from "../../db/JobEventStore";
import { JobEventOutboxStore } from "../../db/JobEventOutboxStore";
import { getAuthenticatedTenantId, requireAdminKey, requireAuth } from "../auth";

export class JobEventsRouter {
  public readonly router: Router;
  private readonly events: JobEventStore;
  private readonly outbox: JobEventOutboxStore;

  constructor(config: Config) {
    this.router = Router();
    this.router.use(express.json());
    this.events = new JobEventStore(config.dataDirPath);
    this.outbox = new JobEventOutboxStore(config.dataDirPath);
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.router.use(requireAuth);

    this.router.get("/events", (req, res) => this.listEvents(req, res));
    this.router.get("/outbox", (req, res) => this.listOutbox(req, res));
    this.router.get("/outbox/metrics", (req, res) => this.metrics(req, res));
    this.router.post("/outbox/:id/requeue", requireAdminKey, (req, res) => this.requeue(req, res));
  }

  private tenant(req: Request, res: Response): string | undefined {
    const tenantId = getAuthenticatedTenantId(req);
    if (!tenantId) res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
    return tenantId;
  }

  private listEvents(req: Request, res: Response): void {
    const tenantId = this.tenant(req, res);
    if (!tenantId) return;
    const jobId = typeof req.query.jobId === "string" ? req.query.jobId : undefined;
    const limit = Math.min(Math.max(Number(req.query.limit ?? 100) || 100, 1), 500);
    res.json({ events: this.events.listForTenant(tenantId, jobId).slice(-limit) });
  }

  private listOutbox(req: Request, res: Response): void {
    const tenantId = this.tenant(req, res);
    if (!tenantId) return;
    const state = typeof req.query.state === "string" && ["pending", "delivered", "dead_letter"].includes(req.query.state)
      ? req.query.state as "pending" | "delivered" | "dead_letter" : undefined;
    res.json({ outbox: this.outbox.listForTenant(tenantId, state) });
  }

  private metrics(req: Request, res: Response): void {
    const tenantId = this.tenant(req, res);
    if (!tenantId) return;
    const rows = this.outbox.listForTenant(tenantId);
    res.json({ pending: rows.filter((row) => row.state === "pending").length, delivered: rows.filter((row) => row.state === "delivered").length, deadLetter: rows.filter((row) => row.state === "dead_letter").length });
  }

  private requeue(req: Request, res: Response): void {
    const tenantId = typeof req.body?.tenantId === "string" ? req.body.tenantId : "";
    const row = this.outbox.requeue(tenantId, req.params.id);
    if (!row) {
      res.status(404).json({ error: "Outbox event not found" });
      return;
    }
    res.json({ outbox: row });
  }
}

export default JobEventsRouter;
