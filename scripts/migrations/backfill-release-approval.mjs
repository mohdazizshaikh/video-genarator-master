#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const filePath = path.resolve(process.argv[2] || "data/auth-tenants.json");
const tenants = JSON.parse(fs.readFileSync(filePath, "utf8"));
let changed = 0;
for (const tenant of tenants) {
  if (tenant.name === "Aaditech Solution" && tenant.email === "shaikhaziz267@hotmail.com") {
    tenant.permissions = Array.isArray(tenant.permissions) ? tenant.permissions : [];
    if (!tenant.permissions.includes("release:approve")) {
      tenant.permissions.push("release:approve");
      changed += 1;
    }
  }
}
fs.writeFileSync(filePath, `${JSON.stringify(tenants, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({ changed, tenantCount: tenants.length, permissionValuePrinted: false }, null, 2));
if (changed !== 1) process.exitCode = 2;
