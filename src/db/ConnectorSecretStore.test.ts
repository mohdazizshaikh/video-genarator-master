import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ConnectorSecretStore } from "./ConnectorSecretStore.js";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function makeStore(): { store: ConnectorSecretStore; dir: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "connector-secrets-"));
  dirs.push(dir);
  return { store: new ConnectorSecretStore(dir, "test-encryption-secret"), dir };
}

describe("ConnectorSecretStore", () => {
  it("encrypts values at rest and decrypts only for the owning workspace", () => {
    const { store, dir } = makeStore();
    store.put("workspace-a", "connector-a", { botToken: "real-token" });
    const raw = fs.readFileSync(path.join(dir, "connector-secrets.json"), "utf8");
    expect(raw).not.toContain("real-token");
    expect(store.get("workspace-a", "connector-a")).toEqual({ botToken: "real-token" });
    expect(store.get("workspace-b", "connector-a")).toBeUndefined();
  });

  it("rejects empty secrets and requires an encryption key", () => {
    expect(() => new ConnectorSecretStore(os.tmpdir(), "")).toThrow("encryption key");
    const { store } = makeStore();
    expect(() => store.put("workspace-a", "connector-a", {})).toThrow("connector secret");
    expect(() => store.put("workspace-a", "connector-a", { token: "" })).toThrow("connector secret");
  });
});
