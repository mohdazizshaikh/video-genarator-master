import { Router, json } from "express";
import type { Request, Response } from "express";
import { ResourceEngine } from "../../services/ResourceEngine";
import { ThrottlingEngine } from "../../services/ThrottlingEngine";
import { AssetLibraryEngine } from "../../services/AssetLibraryEngine";
import { ExportEngine } from "../../services/ExportEngine";
import { ComplianceEngine } from "../../services/ComplianceEngine";
import { AuthEngine } from "../../services/AuthEngine";
import { ErrorRecoveryEngine } from "../../services/ErrorRecoveryEngine";
import { CredentialRotationEngine } from "../../services/CredentialRotationEngine";
import { CreatorKnowledgeBase } from "../../services/CreatorKnowledgeBase";
import { MarketingEngine } from "../../services/MarketingEngine";
import type { Config } from "../../config";
import { getAuthenticatedTenantId, isAdminRequest, requireAdminKey, requireAuth } from "../auth";


export class SystemEnginesRouter {
  public router: Router;
  private resource: ResourceEngine;
  private throttle: ThrottlingEngine;
  private assets: AssetLibraryEngine;
  private exporter: ExportEngine;
  private compliance: ComplianceEngine;
  private auth: AuthEngine;
  private errorRecovery: ErrorRecoveryEngine;
  private credentials: CredentialRotationEngine;
  private kb: CreatorKnowledgeBase;
  private marketing: MarketingEngine;
  private dataDirPath: string;

  constructor(config: Config) {
    this.router = Router();
    this.router.use(json());
    this.dataDirPath = config.dataDirPath;
    this.resource = new ResourceEngine(config.dataDirPath);
    this.throttle = new ThrottlingEngine(config.dataDirPath);
    this.assets = new AssetLibraryEngine(config.dataDirPath);
    this.exporter = new ExportEngine(config.dataDirPath);
    this.compliance = new ComplianceEngine(config.dataDirPath);
    this.auth = new AuthEngine(config.dataDirPath);
    this.errorRecovery = new ErrorRecoveryEngine(config.dataDirPath);
    this.credentials = new CredentialRotationEngine(config.dataDirPath);
    this.kb = new CreatorKnowledgeBase(config.dataDirPath);
    this.marketing = new MarketingEngine();
    this.register();
  }

  private register() {
    // ─── Resource Engine ───
    this.router.get("/resource/snapshot", requireAdminKey, (_req: Request, res: Response) => {
      try { res.json({ status: "ok", data: this.resource.getSnapshot() }); }
      catch (err) { res.status(500).json({ error: String(err) }); }
    });
    this.router.get("/resource/optimize", requireAdminKey, (_req: Request, res: Response) => {
      res.json({ status: "ok", data: this.resource.optimize() });
    });
    this.router.post("/resource/predict", requireAdminKey, (req: Request, res: Response) => {
      const { plannedJobs = 1 } = req.body;
      res.json({ status: "ok", data: this.resource.predictNeeds(plannedJobs) });
    });
    this.router.get("/resource/history", requireAdminKey, (_req: Request, res: Response) => {
      res.json({ status: "ok", data: this.resource.getHistory() });
    });

    // ─── Throttling Engine ───
    this.router.use("/throttle", requireAuth);
    this.router.post("/throttle/check", (req: Request, res: Response) => {
      const authTenantId = getAuthenticatedTenantId(req);
      const requestedTenantId = typeof req.body.tenantId === "string" ? req.body.tenantId : undefined;
      const tenantId = isAdminRequest(req) ? requestedTenantId : authTenantId;
      if (!tenantId) { res.status(400).json({ error: "tenantId required" }); return; }
      if (!isAdminRequest(req) && requestedTenantId && requestedTenantId !== authTenantId) {
        res.status(403).json({ error: "Tenant access denied" }); return;
      }
      const { action = "request", plan } = req.body;
      res.json({ status: "ok", data: this.throttle.check(tenantId, action, plan) });
    });
    this.router.get("/throttle/quotas", (req: Request, res: Response) => {
      if (isAdminRequest(req)) {
        res.json({ status: "ok", data: this.throttle.getAllQuotas() });
        return;
      }
      const tenantId = getAuthenticatedTenantId(req);
      if (!tenantId) { res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" }); return; }
      res.json({ status: "ok", data: this.throttle.getQuota(tenantId) ?? null });
    });
    this.router.get("/throttle/quotas/:tenantId", (req: Request, res: Response) => {
      if (!isAdminRequest(req) && req.params.tenantId !== getAuthenticatedTenantId(req)) {
        res.status(403).json({ error: "Tenant access denied" }); return;
      }
      const q = this.throttle.getQuota(req.params.tenantId);
      if (!q) { res.status(404).json({ error: "Tenant not found" }); return; }
      res.json({ status: "ok", data: q });
    });
    this.router.post("/throttle/plan", requireAdminKey, (req: Request, res: Response) => {
      const { tenantId, plan } = req.body;
      if (!tenantId || !plan) { res.status(400).json({ error: "tenantId and plan required" }); return; }
      res.json({ status: "ok", data: this.throttle.setPlan(tenantId, plan) });
    });
    this.router.post("/throttle/reset", requireAdminKey, (req: Request, res: Response) => {
      const { tenantId } = req.body;
      if (!tenantId) { res.status(400).json({ error: "tenantId required" }); return; }
      this.throttle.resetUsage(tenantId);
      res.json({ status: "ok" });
    });

    // ─── Asset Library ───
    this.router.get("/assets", (req: Request, res: Response) => {
      const { type, category, nameContains } = req.query as Record<string, string>;
      res.json({ status: "ok", data: this.assets.search({ type: type as never, category, nameContains }) });
    });
    this.router.get("/assets/stats", (_req: Request, res: Response) => {
      res.json({ status: "ok", data: this.assets.getStats() });
    });
    this.router.post("/assets", (req: Request, res: Response) => {
      const opts = req.body;
      if (!opts.filePath && !opts.name) { res.status(400).json({ error: "filePath or name required" }); return; }
      try {
        if (opts.filePath) {
          res.status(201).json({ status: "ok", data: this.assets.importAsset(opts.filePath, opts) });
        } else {
          res.status(201).json({ status: "ok", data: this.assets.addVirtual(opts) });
        }
      } catch (err) { res.status(400).json({ error: String(err) }); }
    });
    this.router.patch("/assets/:id/tags", (req: Request, res: Response) => {
      const { tags } = req.body;
      res.json({ status: "ok", data: this.assets.updateTags(req.params.id, tags || []) });
    });
    this.router.delete("/assets/:id", (req: Request, res: Response) => {
      const ok = this.assets.delete(req.params.id);
      if (!ok) { res.status(404).json({ error: "Asset not found" }); return; }
      res.json({ status: "ok" });
    });

    // ─── Export Engine (admin-only) ───
    this.router.post("/export", requireAdminKey, async (req: Request, res: Response) => {
      const { type = "full_backup", format = "json" } = req.body;
      try {
        const manifest = await this.exporter.exportContent(this.dataDirPath, type, format);
        res.json({ status: "ok", data: manifest });
      } catch (err) { res.status(500).json({ error: String(err) }); }
    });
    this.router.post("/export/backup", requireAdminKey, async (_req: Request, res: Response) => {
      try {
        const manifest = await this.exporter.backupAll(this.dataDirPath);
        res.json({ status: "ok", data: manifest });
      } catch (err) { res.status(500).json({ error: String(err) }); }
    });
    this.router.post("/export/restore", requireAdminKey, async (req: Request, res: Response) => {
      const { exportPath } = req.body;
      if (!exportPath) { res.status(400).json({ error: "exportPath required" }); return; }
      const result = await this.exporter.restore(exportPath, this.dataDirPath);
      res.json({ status: "ok", data: result });
    });
    this.router.get("/export/list", requireAdminKey, (_req: Request, res: Response) => {
      res.json({ status: "ok", data: this.exporter.getExports() });
    });

    // ─── Compliance Engine ───
    this.router.post("/compliance/log", (req: Request, res: Response) => {
      const { action, details, tenantId, userId, resourceId, outcome } = req.body;
      if (!action) { res.status(400).json({ error: "action required" }); return; }
      res.status(201).json({ status: "ok", data: this.compliance.log(action, details || {}, { tenantId, userId, resourceId, outcome }) });
    });
    this.router.get("/compliance/logs", (req: Request, res: Response) => {
      const { tenantId, action, severity, limit } = req.query as Record<string, string>;
      res.json({ status: "ok", data: this.compliance.query({ tenantId, action: action as never, severity: severity as never, limit: limit ? parseInt(limit) : 500 }) });
    });
    this.router.post("/compliance/report", (req: Request, res: Response) => {
      const { from, to } = req.body;
      const fromDate = from ? new Date(from) : new Date(Date.now() - 7 * 86400000);
      const toDate = to ? new Date(to) : new Date();
      res.json({ status: "ok", data: this.compliance.generateReport(fromDate, toDate) });
    });
    this.router.get("/compliance/critical", (_req: Request, res: Response) => {
      res.json({ status: "ok", data: this.compliance.getRecentCritical() });
    });

    // ─── Auth Engine ───
    this.router.post("/auth/register", (req: Request, res: Response) => {
      const { name, email, plan } = req.body;
      if (!name || !email) { res.status(400).json({ error: "name and email required" }); return; }
      try {
        const result = this.auth.registerTenant(name, email, plan);
        res.status(201).json({ status: "ok", data: result });
      } catch (err) { res.status(409).json({ error: String(err) }); }
    });
    this.router.post("/auth/authenticate", (req: Request, res: Response) => {
      const { apiKey } = req.body;
      if (!apiKey) { res.status(400).json({ error: "apiKey required" }); return; }
      const result = this.auth.authenticate(apiKey);
      if (!result.success) { res.status(401).json({ error: result.error }); return; }
      res.json({ status: "ok", data: result });
    });
    this.router.post("/auth/verify", (req: Request, res: Response) => {
      const { token } = req.body;
      if (!token) { res.status(400).json({ error: "token required" }); return; }
      const payload = this.auth.verifyToken(token);
      if (!payload) { res.status(401).json({ error: "Invalid or expired token" }); return; }
      res.json({ status: "ok", data: payload });
    });
    this.router.get("/auth/tenants", requireAdminKey, (_req: Request, res: Response) => {
      res.json({ status: "ok", data: this.auth.getTenants() });
    });
    this.router.post("/auth/rotate/:tenantId", requireAdminKey, (req: Request, res: Response) => {
      try {
        const result = this.auth.rotateCredentials(req.params.tenantId);
        res.json({ status: "ok", data: result });
      } catch (err) { res.status(404).json({ error: String(err) }); }
    });

    // All system-engine operations below the public auth bootstrap are tenant-authenticated.
    this.router.use(requireAuth);

    // ─── Error Recovery Engine ───
    this.router.get("/errorrecovery", requireAdminKey, (_req: Request, res: Response) => {
      res.json({ status: "ok", data: this.errorRecovery.getAll() });
    });
    this.router.get("/errorrecovery/stats", requireAdminKey, (_req: Request, res: Response) => {
      res.json({ status: "ok", data: this.errorRecovery.getStats() });
    });
    this.router.get("/errorrecovery/deadletter", requireAdminKey, (_req: Request, res: Response) => {
      res.json({ status: "ok", data: this.errorRecovery.getDeadLetterQueue() });
    });
    this.router.post("/errorrecovery/record", requireAdminKey, (req: Request, res: Response) => {
      const { category, message, context, tenantId } = req.body;
      if (!category || !message) { res.status(400).json({ error: "category and message required" }); return; }
      res.status(201).json({ status: "ok", data: this.errorRecovery.recordError(category, message, context, { tenantId }) });
    });
    this.router.post("/errorrecovery/process", requireAdminKey, (_req: Request, res: Response) => {
      const processed = this.errorRecovery.processDeadLetter();
      res.json({ status: "ok", data: { processed: processed.length } });
    });
    this.router.post("/errorrecovery/:id/recover", requireAdminKey, (req: Request, res: Response) => {
      const { resolution } = req.body;
      const result = this.errorRecovery.markRecovered(req.params.id, resolution);
      if (!result) { res.status(404).json({ error: "Error not found" }); return; }
      res.json({ status: "ok", data: result });
    });
    this.router.post("/errorrecovery/:id/dead", requireAdminKey, (req: Request, res: Response) => {
      const { reason } = req.body;
      const result = this.errorRecovery.markDead(req.params.id, reason);
      if (!result) { res.status(404).json({ error: "Error not found" }); return; }
      res.json({ status: "ok", data: result });
    });
    this.router.post("/errorrecovery/clear", requireAdminKey, (_req: Request, res: Response) => {
      const count = this.errorRecovery.clearResolved();
      res.json({ status: "ok", data: { cleared: count } });
    });

    // ─── Credential Rotation ───
    this.router.get("/credentials", requireAdminKey, (_req: Request, res: Response) => {
      res.json({ status: "ok", data: this.credentials.getAll() });
    });
    this.router.post("/credentials", requireAdminKey, (req: Request, res: Response) => {
      const { name, platform, type, value, ...opts } = req.body;
      if (!name || !platform || !type || !value) {
        res.status(400).json({ error: "name, platform, type, value required" }); return;
      }
      res.status(201).json({ status: "ok", data: this.credentials.register(name, platform, type, value, opts) });
    });
    this.router.post("/credentials/schedule", requireAdminKey, (req: Request, res: Response) => {
      const { ids } = req.body;
      res.json({ status: "ok", data: this.credentials.scheduleRotation(ids) });
    });
    this.router.post("/credentials/:id/rotate", requireAdminKey, (req: Request, res: Response) => {
      const { newValue } = req.body;
      if (!newValue) { res.status(400).json({ error: "newValue required" }); return; }
      res.json({ status: "ok", data: this.credentials.rotateNow(req.params.id, newValue) });
    });
    this.router.get("/credentials/expiring", requireAdminKey, (req: Request, res: Response) => {
      const { days = "7" } = req.query as Record<string, string>;
      res.json({ status: "ok", data: this.credentials.detectExpiring(parseInt(days)) });
    });

    // ─── Knowledge Base ───
    this.router.get("/knowledgebase", (req: Request, res: Response) => {
      const { q, category } = req.query as Record<string, string>;
      if (q) {
        res.json({ status: "ok", data: this.kb.search(q, category as never) });
      } else if (category) {
        res.json({ status: "ok", data: this.kb.getByCategory(category as never) });
      } else {
        res.json({ status: "ok", data: this.kb.getAll() });
      }
    });
    this.router.get("/knowledgebase/top", (_req: Request, res: Response) => {
      res.json({ status: "ok", data: this.kb.getTopRated() });
    });
    this.router.get("/knowledgebase/categories", (_req: Request, res: Response) => {
      res.json({ status: "ok", data: this.kb.getCategories() });
    });
    this.router.post("/knowledgebase", (req: Request, res: Response) => {
      const rule = req.body;
      if (!rule.category || !rule.title || !rule.description) {
        res.status(400).json({ error: "category, title, description required" }); return;
      }
      res.status(201).json({ status: "ok", data: this.kb.addRule(rule) });
    });
    this.router.patch("/knowledgebase/:id", (req: Request, res: Response) => {
      const result = this.kb.updateRule(req.params.id, req.body);
      if (!result) { res.status(404).json({ error: "Rule not found" }); return; }
      res.json({ status: "ok", data: result });
    });
    this.router.delete("/knowledgebase/:id", (req: Request, res: Response) => {
      const ok = this.kb.deleteRule(req.params.id);
      if (!ok) { res.status(404).json({ error: "Rule not found" }); return; }
      res.json({ status: "ok" });
    });

    // ─── Marketing Engine ───
    this.router.post("/marketing-engine/banners", (req: Request, res: Response) => {
      const { url, title, tagline, primaryColor, logoText, category } = req.body;
      if (!url && !title) { res.status(400).json({ error: "url or title required" }); return; }
      const websiteData = url ? this.marketing.scrapeWebsiteMock(url) : { url: "", title, tagline, primaryColor, logoText, category };
      res.json({ status: "ok", data: this.marketing.generateBanners(websiteData) });
    });
    this.router.post("/marketing-engine/campaign", (req: Request, res: Response) => {
      const { niche, platform, goal = "grow audience" } = req.body;
      if (!niche || !platform) { res.status(400).json({ error: "niche and platform required" }); return; }
      res.json({ status: "ok", data: this.marketing.generateCampaignPlan(niche, platform, goal) });
    });
    this.router.post("/marketing-engine/scrape", (req: Request, res: Response) => {
      const { url } = req.body;
      if (!url) { res.status(400).json({ error: "url required" }); return; }
      res.json({ status: "ok", data: this.marketing.scrapeWebsiteMock(url) });
    });
  }
}
