import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("../services/authenticatedJson", () => ({
  authenticatedJson: vi.fn(),
  jsonPost: (body: unknown) => ({ body }),
  jsonPatch: (body: unknown) => ({ body }),
  jsonPut: (body: unknown) => ({ body }),
}));

import ConnectorsPage from "./ConnectorsPage";

describe("ConnectorsPage", () => {
  it("renders the connector management shell and empty-state copy", () => {
    const markup = renderToStaticMarkup(<ConnectorsPage />);

    expect(markup).toContain("Connectors");
    expect(markup).toContain("Create Connector");
    expect(markup).toContain("Workspace Connectors");
    expect(markup).toContain("No connectors yet for this workspace.");
    expect(markup).toContain("Credential reference");
  });

  it("documents that connecting an account does not enable posting", () => {
    const markup = renderToStaticMarkup(<ConnectorsPage />);

    expect(markup).toContain("Connecting an account does not by itself enable posting.");
  });
});
