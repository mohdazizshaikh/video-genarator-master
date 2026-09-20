import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataDir = process.env.DATA_DIR_PATH || process.env.DATA_DIR || process.env.ACE_DATA_DIR || path.join(root, "data");
const profilesPath = path.join(dataDir, "profiles.json");
const accountsPath = path.join(dataDir, "profileAccounts.json");

function readJson(filePath) {
  try {
    const value = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

const profiles = readJson(profilesPath);
const accounts = readJson(accountsPath);
const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
const candidates = accounts.map((account) => {
  const profile = profilesById.get(account.profileId);
  return {
    legacyAccountId: account.id,
    workspaceId: profile?.tenantId || null,
    profileId: account.profileId,
    platform: account.provider,
    displayName: account.displayName || account.label,
    externalAccountId: account.externalId || null,
    status: account.status,
    hasEncryptedCredentials: Boolean(account.credentials && Object.keys(account.credentials).length),
    action: profile?.tenantId ? "review_and_explicitly_map" : "blocked_unowned_record",
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  dataDir,
  source: { profilesPath, accountsPath },
  mode: "dry-run",
  candidates,
  warnings: [
    "No credentials were copied, decrypted, or emitted.",
    "No connector records were created and no legacy records were modified.",
    "Every candidate requires owner-approved mapping and a separate secret-store write.",
  ],
};

process.stdout.write(JSON.stringify(report, null, 2) + "\n");
