/**
 * docs-lib.ts — shared parsing/render logic for the auto-docs system.
 * Extracts the live API surface from source (server.ts mounts + router files)
 * so the generated docs can never drift from reality.
 */
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT, SRC_DIR, readFile, fileExists } from "./lib";

export interface Endpoint {
  method: string;
  path: string;
  router: string;
  handler?: string;
}

const MOUNT_RE = /this\.app\.use\(\s*["'`]([^"'`]+)["'`]\s*(?:,\s*(?:requireAuth|requireAdminKey|validateTokenIfPresent|apiRateLimiter|[A-Za-z0-9_]+))*\s*(?:,\s*([A-Za-z0-9_]+)(?:\.router)?)?\s*\)/g;

function normalizePath(p: string): string {
  return p.replace(/\/+$/, "") || "/";
}

/** Normalize a router variable/class name for fuzzy matching (oauthRouter === OAuthRouter). */
function normName(name: string): string {
  return name
    .replace(/Router$/, "")
    .replace(/^(deferred|lazy|defer)/i, "")
    .toLowerCase();
}

interface RouterClass {
  file: string;
  className: string;
  content: string;
}

function findRouterClass(className: string): RouterClass | null {
  const target = normName(className);
  const routersDir = path.join(SRC_DIR, "server", "routers");
  for (const f of fs.readdirSync(routersDir)) {
    if (!f.endsWith(".ts") || f.endsWith(".test.ts")) continue;
    const content = fs.readFileSync(path.join(routersDir, f), "utf-8");
    const classRe = /export class ([A-Za-z0-9_]+Router)/g;
    let m: RegExpExecArray | null;
    while ((m = classRe.exec(content)) !== null) {
      if (normName(m[1]) === target) {
        return { file: `src/server/routers/${f}`, className: m[1], content };
      }
    }
  }
  return null;
}

/** Extract the method/path/handler registrations belonging to a single router class. */
function routesForClass(cls: RouterClass): Array<{ method: string; path: string; handler: string }> {
  const classIdx = cls.content.indexOf(`export class ${cls.className}`);
  const nextClass = cls.content.indexOf("export class ", classIdx + 10);
  const block = nextClass === -1 ? cls.content.slice(classIdx) : cls.content.slice(classIdx, nextClass);

  const out: Array<{ method: string; path: string; handler: string }> = [];
  const re = /this\.router\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]\s*,\s*([A-Za-z0-9_]+)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    out.push({ method: m[1].toUpperCase(), path: m[2], handler: m[3] ?? "" });
  }
  return out;
}

/** Extract every REST route registered by the Express app. */
export function extractEndpoints(): Endpoint[] {
  const serverContent = readFile("src/server/server.ts");
  const mounts: Array<{ base: string; varName: string }> = [];
  let match;
  while ((match = MOUNT_RE.exec(serverContent)) !== null) {
    if (match[2] && match[2].endsWith("Router")) {
      mounts.push({ base: match[1], varName: match[2] });
    }
  }

  const endpoints: Endpoint[] = [];
  for (const { base, varName } of mounts) {
    const cls = findRouterClass(varName);
    if (!cls) continue;
    for (const route of routesForClass(cls)) {
      const fullPath = route.path.startsWith("/api") ? route.path : normalizePath(base + route.path);
      endpoints.push({ method: route.method, path: fullPath, router: varName, handler: route.handler || undefined });
    }
  }

  return endpoints.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}

/** Count of router instances registered in server.ts (the "N routers" figure). */
export function extractRouterCount(): number {
  const serverContent = readFile("src/server/server.ts");
  const matches = serverContent.match(/= new [A-Za-z0-9_]+Router\(/g);
  return matches ? matches.length : 0;
}

export function renderEndpointTable(endpoints: Endpoint[]): string {
  const rows = endpoints.map((e) => `| \`${e.method}\` | \`${e.path}\` | ${e.router} |`);
  return ["| Method | Path | Router |", "|--------|------|--------|", ...rows].join("\n");
}

/** Full AUTO-GENERATED block for docs/API.md */
export function renderApiBlock(endpoints: Endpoint[]): string {
  return `Live API surface derived from source (${endpoints.length} routes).\n\n${renderEndpointTable(endpoints)}`;
}

/** Full AUTO-GENERATED block for docs/SYSTEM_MAP.md */
export function renderRouterBlock(endpoints: Endpoint[], count: number): string {
  return `**${count} routers** registered in \`src/server/server.ts\`.\n\n${renderEndpointTable(endpoints)}`;
}

/** Full AUTO-GENERATED block for docs/DATABASE_SCHEMA.md */
export function renderStoreBlock(
  stores: Array<{ file: string; class: string; jsonFile: string; purpose: string }>,
): string {
  const rows = stores
    .map((s) => `| \`${s.file}\` | ${s.class || "-"} | \`${s.jsonFile}\` | ${(s.purpose || "-").replace(/\|/g, "\\|").slice(0, 120)} |`)
    .join("\n");
  return `JSON-backed data stores in \`src/db/\` (${stores.length}).\n\n| File | Class | JSON File | Purpose |\n|------|-------|-----------|---------|\n${rows}`;
}

export interface MarkerSection {
  file: string;
  marker: string;
  content: string;
}

/**
 * Read the content between a BEGIN/END marker pair. Returns null when absent.
 * Markers look like: <!-- AUTO-GENERATED:<marker>:BEGIN -->
 */
export function readMarkerSection(file: string, marker: string): string | null {
  if (!fileExists(file)) return null;
  const content = readFile(file);
  const begin = `<!-- AUTO-GENERATED:${marker}:BEGIN -->`;
  const end = `<!-- AUTO-GENERATED:${marker}:END -->`;
  const b = content.indexOf(begin);
  if (b === -1) return null;
  const e = content.indexOf(end, b);
  if (e === -1) return null;
  return content.slice(b + begin.length, e).trim();
}

export function replaceMarkerSection(file: string, marker: string, newContent: string, fallbackInsertAfter?: string): void {
  const abs = path.join(REPO_ROOT, file);
  const content = fileExists(file) ? readFile(file) : "";
  const begin = `<!-- AUTO-GENERATED:${marker}:BEGIN -->`;
  const end = `<!-- AUTO-GENERATED:${marker}:END -->`;
  const b = content.indexOf(begin);
  const e = content.indexOf(end, b);
  const block = `${begin}\n${newContent.trim()}\n${end}`;
  if (b !== -1 && e !== -1) {
    fs.writeFileSync(abs, content.slice(0, b) + block + content.slice(e + end.length), "utf-8");
    return;
  }
  if (fallbackInsertAfter) {
    const anchor = content.indexOf(fallbackInsertAfter);
    if (anchor !== -1) {
      const idx = anchor + fallbackInsertAfter.length;
      fs.writeFileSync(abs, content.slice(0, idx) + "\n\n" + block + "\n" + content.slice(idx), "utf-8");
      return;
    }
  }
  fs.writeFileSync(abs, content + "\n\n" + block + "\n", "utf-8");
}
