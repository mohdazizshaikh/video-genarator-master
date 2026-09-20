import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ConnectorStore } from "./ConnectorStore.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function makeStore(): ConnectorStore {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "connector-store-"));
  tempDirs.push(dir);
  return new ConnectorStore(dir);
}

describe("ConnectorStore", () => {
  it("keeps connector and destination reads workspace-scoped", () => {
    const store = makeStore();
    const connector = store.createConnector({
      workspaceId: "workspace-a",
      platform: "telegram",
      displayName: "Aaditech Telegram",
      status: "connected",
      credentialRef: "secret://workspace-a/telegram-1",
      capabilities: { sendVideo: true },
    });
    const destination = store.createDestination({
      workspaceId: "workspace-a",
      connectorId: connector.id,
      externalDestinationId: "chat-a",
      displayName: "Aaditech channel",
      status: "verified",
      verificationEvidence: { checked: "true" },
    });

    expect(store.listConnectors("workspace-b")).toEqual([]);
    expect(store.getConnector("workspace-b", connector.id)).toBeUndefined();
    expect(store.listDestinations("workspace-b", connector.id)).toEqual([]);
    expect(store.updateDestination("workspace-b", destination.id, { status: "disabled" })).toBeUndefined();
  });

  it("rejects duplicate connector identities inside one workspace", () => {
    const store = makeStore();
    const params = {
      workspaceId: "workspace-a" as const,
      platform: "telegram" as const,
      displayName: "Bot",
      status: "pending" as const,
      credentialRef: "secret://a/bot",
      externalAccountId: "bot-a",
      capabilities: {},
    };
    store.createConnector(params);
    expect(() => store.createConnector(params)).toThrow("Connector already exists");
    expect(store.createConnector({ ...params, workspaceId: "workspace-b" })).toBeDefined();
  });

  it("does not persist a credential value through the metadata contract", () => {
    const store = makeStore();
    const record = store.createConnector({
      workspaceId: "workspace-a",
      platform: "telegram",
      displayName: "Bot",
      status: "pending",
      credentialRef: "secret://workspace-a/bot",
      capabilities: {},
    });
    expect(record.credentialRef).toContain("secret://");
    expect(record).not.toHaveProperty("token");
  });
});
