import {
  TenantEngineScope,
  tenantEngineAt,
} from "../../services/TenantEngineScope";
import express from "express";
import type { Request as ExpressRequest, Response as ExpressResponse,
} from "express";
import { CostTrackingEngine } from "../../services/CostTrackingEngine";
import { Config } from "../../config";
import {
  getAuthenticatedTenantId,
  requireAuth,
  requireWorkspace,
} from "../auth";


export class CostsRouter {
  public router: express.Router;
  private scoped: TenantEngineScope<{ engine: CostTrackingEngine }>;

  constructor(config: Config) {
    this.router = express.Router();
    this.scoped = new TenantEngineScope(config.dataDirPath, (directory) => ({
      engine: tenantEngineAt(directory, CostTrackingEngine),
    }));
    this.router.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes() {
    this.router.use(requireAuth, requireWorkspace);

    this.router.get("/summary", (req: ExpressRequest, res: ExpressResponse) => {
      const { from, to } = req.query;
      const fromDate = from ? new Date(String(from)) : new Date(Date.now() - 30 * 86400000);
      const toDate = to ? new Date(String(to)) : new Date();
      res.json({ status: "ok", data: this.scoped.forRequest(req).engine.getSummary(fromDate, toDate),
      });
    });

    this.router.get("/rates", (req: ExpressRequest, res: ExpressResponse) => {
      res.json({ status: "ok", data: this.scoped.forRequest(req).engine.getRates(),
      });
    });

    this.router.post("/record", (req: ExpressRequest, res: ExpressResponse) => {
      const { category, description, units, costPerUnit } = req.body;
      const tenantId = getAuthenticatedTenantId(req)!;
      if (!category || !description || units === undefined) return res.status(400).json({ error: "category, description, units required" });
      const record = this.scoped
        .forRequest(req)
        .engine.record(category, description, units, costPerUnit, tenantId);
      res.status(201).json({ status: "ok", data: record });
    });

    this.router.get("/tenant/:tenantId", (req: ExpressRequest, res: ExpressResponse) => {
        if (req.params.tenantId !== getAuthenticatedTenantId(req))
          return res.status(404).json({ error: "Cost records not found" });
        res.json({ status: "ok", data: this.scoped
            .forRequest(req)
            .engine.getByTenant(req.params.tenantId),
        });
    },
    );
  }
}
