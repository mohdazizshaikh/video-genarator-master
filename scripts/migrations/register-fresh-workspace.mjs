#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const baseUrl = process.argv[2] || "http://localhost:3123";
const name = process.argv[3] || "Aaditech Solution";
const email = process.argv[4];
if (!email) throw new Error("owner email is required");
const response = await fetch(`${baseUrl}/api/system/auth/register`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, email, plan: "free" }) });
const payload = await response.json();
if (!response.ok) throw new Error(`registration failed with HTTP ${response.status}`);
const result = payload?.data;
if (!result?.plainApiKey || !result?.tenant) throw new Error("registration response missing expected onboarding data");
const keyPath = path.resolve(process.argv[5] || path.join(process.env.HOME || ".", "aaditech-solution-api-key.txt"));
fs.writeFileSync(keyPath, `${result.plainApiKey}\n`, { mode: 0o600 });
fs.chmodSync(keyPath, 0o600);
console.log(JSON.stringify({ registered: true, workspaceName: result.tenant.workspaceName || result.tenant.name || name, tenantId: result.tenant.id || null, ownerEmail: email, apiKeyPath: keyPath, apiKeyPrinted: false, telegramPublished: false }, null, 2));
