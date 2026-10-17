import express from "express";
import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import { CostTrackingEngine } from "../../services/CostTrackingEngine";
import { Config } from "../../config";
import { requireAuth } from "../auth";


export class CostsRouter {
  public router: express.Router;
  private engine: CostTrackingEngine;

  constructor(config: Config) {
    this.router = express.Router();
    this.engine = new CostTrackingEngine(config.dataDirPath);
    this.router.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes() {
    this.router.use(requireAuth);

    this.router.get("/summary", (req: ExpressRequest, res: ExpressResponse) => {
      const { from, to } = req.query;
      const fromDate = from ? new Date(String(from)) : new Date(Date.now() - 30 * 86400000);
      const toDate = to ? new Date(String(to)) : new Date();
      res.json({ status: "ok", data: this.engine.getSummary(fromDate, toDate) });
    });

    this.router.get("/rates", (_req: ExpressRequest, res: ExpressResponse) => {
      res.json({ status: "ok", data: this.engine.getRates() });
    });

    this.router.post("/record", (req: ExpressRequest, res: ExpressResponse) => {
      const { category, description, units, costPerUnit, tenantId } = req.body;
      if (!category || !description || units === undefined) return res.status(400).json({ error: "category, description, units required" });
      const record = this.engine.record(category, description, units, costPerUnit, tenantId);
      res.status(201).json({ status: "ok", data: record });
    });

    this.router.get("/tenant/:tenantId", (req: ExpressRequest, res: ExpressResponse) => {
      res.json({ status: "ok", data: this.engine.getByTenant(req.params.tenantId) });
    });
  }
}
