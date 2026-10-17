/**
 * Route Inventory Test
 * Scans all router files and verifies their routes are mounted in the compiled build
 */

import fs from "node:fs";
import path from "node:path";

const ROUTERS_DIR = path.join(__dirname, "../../src/server/routers");
const DIST_SERVER_DIR = path.join(__dirname, "../../dist/server");

interface RouteInfo {
  file: string;
  method: string;
  path: string;
  fullPath: string;
}

function extractRoutesFromFile(filePath: string): RouteInfo[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const routes: RouteInfo[] = [];

  // Match router.METHOD("/path", ...)
  const routeRegex = /this\.router\.(get|post|put|patch|delete|use)\s*\(\s*["'`]([^"'`]+)["'`]/g;
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const routePath = match[2];
    const file = path.relative(ROUTERS_DIR, filePath);
    routes.push({
      file,
      method,
      path: routePath,
      fullPath: routePath, // Will be prefixed later
    });
  }

  return routes;
}

function getRouterMountPath(routerFile: string): string {
  // Map router files to their mount paths in server.ts
  const mountMap: Record<string, string> = {
    "health.ts": "/api/health",
    "publish.ts": "/api/publish",
    "tenants.ts": "/api/tenants",
    "marketing.ts": "/api/marketing",
    "ai.ts": "/api/ai",
    "content.ts": "/api/content",
    "trends.ts": "/api/trends",
    "hooks.ts": "/api/hooks",
    "translate.ts": "/api/translate",
    "image.ts": "/api/image",
    "recycle.ts": "/api/recycle",
    "costs.ts": "/api/costs",
    "shadowban.ts": "/api/shadowban",
    "strategy.ts": "/api/strategy",
    "webhooks.ts": "/api/webhooks",
    "branding.ts": "/api/branding",
    "humanized.ts": "/api/humanized",
    "thumbnail.ts": "/api/thumbnail",
    "editing.ts": "/api/editing",
    "visual.ts": "/api/visual",
    "audio.ts": "/api/audio",
    "emotional.ts": "/api/emotional",
    "attention.ts": "/api/attention",
    "quality.ts": "/api/quality",
    "engagement.ts": "/api/engagement",
    "account.ts": "/api/account",
    "watermark.ts": "/api/watermark",
    "videolibrary.ts": "/api/videolibrary",
    "schedule.ts": "/api/schedule",
    "pipeline.ts": "/api/pipeline",
    "competitor.ts": "/api/competitor",
    "engines.ts": "/api/engines",
    "abtesting.ts": "/api/abtesting",
    "approval.ts": "/api/approval",
    "systemengines.ts": "/api/system-engines",
    "jobevents.ts": "/api/job-events",
    "contentbuckets.ts": "/api/system-engines/content-buckets",
    "channelconfigs.ts": "/api/channel-configs",
    "profiles.ts": "/api/profiles",
    "oauth.ts": "/api/oauth",
    "repurpose.ts": "/api/repurpose",
    "connectors.ts": "/api/connectors",
    "releases.ts": "/api/releases",
    "contentversions.ts": "/api/content-versions",
    "rest.ts": "/api", // APIRouter (ShortCreator-dependent)
    "mcp.ts": "/mcp",
    "queue.ts": "/api/queue",
  };

  return mountMap[path.basename(routerFile)] || "";
}

function normalizePath(base: string, route: string): string {
  // Remove trailing slashes from base
  base = base.replace(/\/+$/, "");
  // Remove leading slashes from route
  route = route.replace(/^\/+/, "");
  // Handle route parameters like /:tenantId
  return `/${base}/${route}`.replace(/\/+/g, "/");
}

function main(): void {
  console.log("🔍 Scanning router files...\n");

  const routerFiles = fs.readdirSync(ROUTERS_DIR)
    .filter(f => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map(f => path.join(ROUTERS_DIR, f));

  const allRoutes: RouteInfo[] = [];

  for (const file of routerFiles) {
    const mountPath = getRouterMountPath(file);
    if (!mountPath) {
      console.log(`⚠️  No mount path defined for ${path.basename(file)}`);
      continue;
    }

    const routes = extractRoutesFromFile(file);
    for (const route of routes) {
      route.fullPath = normalizePath(mountPath, route.path);
      allRoutes.push(route);
    }

    console.log(`  ${path.basename(file)}: ${routes.length} routes (mounted at ${mountPath})`);
  }

  console.log(`\n📊 Total routes found: ${allRoutes.length}`);

  // Verify routes exist in compiled build
  console.log("\n🔎 Verifying routes in compiled build...");

  const serverJs = fs.readFileSync(path.join(DIST_SERVER_DIR, "server.js"), "utf-8");

  let missingCount = 0;
  for (const route of allRoutes) {
    // Check if the mount path appears in the compiled server
    const mountPath = getRouterMountPath(path.join(ROUTERS_DIR, route.file));
    if (!serverJs.includes(mountPath)) {
      console.log(`❌ MISSING MOUNT: ${route.method} ${route.fullPath} (from ${route.file})`);
      missingCount++;
    }
  }

  if (missingCount === 0) {
    console.log("✅ All router mounts verified in compiled build");
  } else {
    console.log(`\n❌ ${missingCount} router mounts missing from compiled build`);
    process.exit(1);
  }

  // Print summary by router
  console.log("\n📋 Route Inventory Summary:");
  const byRouter = new Map<string, RouteInfo[]>();
  for (const route of allRoutes) {
    const existing = byRouter.get(route.file) || [];
    existing.push(route);
    byRouter.set(route.file, existing);
  }

  for (const [file, routes] of byRouter.entries()) {
    console.log(`\n  ${file} (${routes.length} routes):`);
    for (const route of routes) {
      console.log(`    ${route.method.padEnd(6)} ${route.fullPath}`);
    }
  }

  console.log("\n✅ Route inventory test passed!");
}

main();