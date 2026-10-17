import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("../services/authenticatedJson", () => ({
  authenticatedJson: vi.fn(),
  jsonPost: (body: unknown) => ({ body }),
  jsonPatch: (body: unknown) => ({ body }),
  jsonPut: (body: unknown) => ({ body }),
}));

import ReleasesPage from "./ReleasesPage";

describe("ReleasesPage", () => {
  it("renders the release management shell and empty-state copy", () => {
    const markup = renderToStaticMarkup(<ReleasesPage />);

    expect(markup).toContain("Releases");
    expect(markup).toContain("Content Versions");
    expect(markup).toContain("Workspace Releases");
    expect(markup).toContain("No releases yet for this workspace.");
    expect(markup).toContain("No content versions yet.");
  });

  it("documents the publish prerequisite chain", () => {
    const markup = renderToStaticMarkup(<ReleasesPage />);

    expect(markup).toContain("connected connector");
    expect(markup).toContain("verified destination");
    expect(markup).toContain("approved release");
  });
});
