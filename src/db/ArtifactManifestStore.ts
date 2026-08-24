import crypto from "node:crypto";
import path from "node:path";
import fs from "fs-extra";

export type ArtifactKind = "generated-image" | "filtered-image" | "repurposed-video" | "video" | "other";
export type ArtifactLifecycle = "active" | "quarantined" | "deleted";

export interface ArtifactManifest {
  id: string;
  tenantId: string;
  kind: ArtifactKind;
  localPath: string;
  objectKey: string;
  checksumSha256: string;
  sizeBytes: number;
  mimeType: string;
  lifecycle: ArtifactLifecycle;
  createdAt: string;
  updatedAt: string;
}

type ManifestInput = Omit<ArtifactManifest, "id" | "objectKey" | "checksumSha256" | "sizeBytes" | "createdAt" | "updatedAt"> & {
  objectKey?: string;
};

function requireTenantId(tenantId: string): string {
  if (typeof tenantId !== "string" || tenantId.trim() === "") throw new Error("tenantId is required");
  return tenantId.trim();
}

function ownerPrefix(tenantId: string): string {
  return requireTenantId(tenantId).replace(/[^a-zA-Z0-9_-]/g, "-");
}

export class ArtifactManifestStore {
  private readonly filePath: string;
  private manifests: ArtifactManifest[] = [];
  private loaded = false;

  constructor(private readonly dataDirPath: string) {
    this.filePath = path.join(dataDirPath, "artifact-manifests.json");
  }

  private load(): void {
    if (this.loaded) return;
    this.loaded = true;
    const raw = fs.readJsonSync(this.filePath, { throws: false });
    if (!Array.isArray(raw)) return;
    this.manifests = raw.filter((record): record is ArtifactManifest =>
      Boolean(record && typeof record.id === "string" && typeof record.tenantId === "string" && record.tenantId.trim() !== "" &&
        typeof record.kind === "string" && typeof record.localPath === "string" && typeof record.objectKey === "string" &&
        typeof record.lifecycle === "string"),
    );
  }

  private persist(): void {
    fs.ensureDirSync(this.dataDirPath);
    const tempPath = `${this.filePath}.tmp`;
    fs.writeJsonSync(tempPath, this.manifests, { spaces: 2 });
    fs.moveSync(tempPath, this.filePath, { overwrite: true });
  }

  async register(input: ManifestInput): Promise<ArtifactManifest> {
    this.load();
    const tenantId = requireTenantId(input.tenantId);
    const stat = await fs.stat(input.localPath);
    if (!stat.isFile()) throw new Error("Artifact lo    if (!stat.isFile()) thile");
    const checksumSha256 = crypto.createHash("sha256").update(await fs.readFile(input.localPath)).digest("hex");
    const now = new Date().toISOString();
    const manifest: ArtifactManifest = {
      ...input,
      tenantId,
      id: `artifact_${crypto.randomUUID()}`,
      objectKey: input.objectKey || `${ownerPrefix(tenantId)}/${input.kind}/${path.basename(input.localPath)}`,
      checksumSha256,
      sizeBytes: stat.size,
      createdAt: now,
      updatedAt: now,
    };
    this.manifests.push(manifest);
    this.persist();
    return manifest;
  }

  listForTenant(tenantId: string): ArtifactManifest[] {
    this.load();
    const owner = requireTenantId(tenantId);
    return this.manifests.filter((manifest) => manifest.tenantId === owner && manifest.lifecycle === "active");
  }

  findForTenant(tenantId: string, id: string): ArtifactManifest | null {
    this.load();
    const owner = requireTenantId(tenantId);
    return this.manifests.find((manifest) => manifest.tenantId === owner && manifest.id === id && manifest.lifecycle === "active") || null;
  }

  findByLocalPathForTenant(tenantId: string, localPath: string): ArtifactManifest | null {
    this.load();
    const owner = requireTenantId(tenantId);
    return this.manifests.find((manifest) => manifest.tenantId === owner && manifest.localPath === localPath && manifest.lifecycle === "active") || null;
  }

  quarantineLegacy(): number {
    this.load();
    const before = this.manifests.length;
    this.manifests = this.manifests.filter((manifest) => Boolean(manifest.tenantId));
    if (this.manifests.length !== before) this.persist();
    return before - this.manifests.length;
  }
}
