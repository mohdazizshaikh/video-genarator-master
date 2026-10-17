import { Router } from "express";
import type { Request, Response } from "express";
import type { Config } from "../../config";
import { ChannelConfigStore } from "../../db/ChannelConfigStore";
import { getAuthenticatedTenantId, requireAuth } from "../auth";

export class ChannelConfigRouter {
  public router: Router;
  private store: ChannelConfigStore;

  constructor(config: Config) {
    this.router = Router();
    this.store = new ChannelConfigStore(config.dataDirPath);
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.router.use(requireAuth);
    this.router.get("/", (_req: Request, res: Response) => this.list(_req, res));
    this.router.post("/", (req: Request, res: Response) => this.create(req, res));
    this.router.delete("/:id", (req: Request, res: Response) => this.remove(req, res));
  }

  private async list(req: Request, res: Response): Promise<void> {
    const tenantId = getAuthenticatedTenantId(req) ?? "";
    const mappings = await this.store.listForTenant(tenantId);
    res.json({ status: "ok", data: mappings });
  }

  private async create(req: Request, res: Response): Promise<void> {
    const { category, platform, channelId } = req.body || {};
    if (!category || !platform || !channelId) {
      res.status(400).json({ error: "category, platform and channelId are required" });
      return;
    }
    const tenantId = getAuthenticatedTenantId(req) ?? "";
    const record = await this.store.create({ tenantId, category, platform, channelId });
    res.status(201).json({ status: "ok", data: record });
  }

  private async remove(req: Request, res: Response): Promise<void> {
    const tenantId = getAuthenticatedTenantId(req) ?? "";
    const deleted = await this.store.deleteForTenant(tenantId, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: "Channel config not found" });
      return;
    }
    res.json({ status: "ok" });
  }
}
