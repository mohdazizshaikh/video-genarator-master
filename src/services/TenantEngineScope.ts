import crypto from "node:crypto";
import path from "node:path";
import fs from "fs-extra";
import type { Request } from "express";
import { getAuthenticatedTenantId } from "../server/auth";

type EngineConstructor<T> = new (directory: string) => T;
const engineInstances = new Map<unknown, Map<string, unknown>>();

/** Reuse one file-mode service per directory, even when multiple routers use it. */
export function tenantEngineAt<T>(
  directory: string,
  Engine: EngineConstructor<T>,
): T {
  let byDirectory = engineInstances.get(Engine);
  if (!byDirectory) {
    byDirectory = new Map();
    engineInstances.set(Engine, byDirectory);
  }
  if (!byDirectory.has(directory))
    byDirectory.set(directory, new Engine(directory));
  return byDirectory.get(directory) as T;
}

/**
 * File-mode isolation for legacy engines that do not yet expose repository ports.
 * Only verified request context selects a directory. Legacy global files remain
 * untouched and quarantined; this is not a multi-process transaction boundary.
 */
export class TenantEngineScope<T> {
  private readonly instances = new Map<string, T>();

  constructor(
    private readonly basePath: string,
    private readonly create: (directory: string) => T,
  ) {}

  forRequest(req: Request): T {
    return this.forTenant(getAuthenticatedTenantId(req) ?? "");
  }

  /** For trusted background jobs whose owner was loaded from owned persisted state. */
  forTenant(tenantId: string): T {
    if (!tenantId?.trim())
      throw new Error("Authenticated workspace is required");
    let instance = this.instances.get(tenantId);
    if (!instance) {
      const key = crypto.createHash("sha256").update(tenantId).digest("hex");
      const directory = path.join(this.basePath, "tenant-state", key);
      fs.ensureDirSync(directory, { mode: 0o700 });
      const ownershipPath = path.join(directory, "workspace-owner.json");
      if (!fs.existsSync(ownershipPath)) {
        fs.writeJsonSync(
          ownershipPath,
          { tenantId, schemaVersion: 1 },
          { mode: 0o600 },
        );
      } else if (fs.readJsonSync(ownershipPath).tenantId !== tenantId) {
        throw new Error("Workspace storage ownership mismatch");
      }
      instance = this.create(directory);
      this.instances.set(tenantId, instance);
    }
    return instance;
  }
}
