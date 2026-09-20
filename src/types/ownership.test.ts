import { describe, expect, it } from "vitest";
import { requireNonEmptyOwnershipId } from "./ownership.js";

describe("ownership vocabulary", () => {
  it("accepts and trims a non-empty ownership identifier", () => {
    expect(requireNonEmptyOwnershipId("  workspace_1  ", "workspaceId")).toBe(
      "workspace_1",
    );
  });

  it.each([undefined, null, "", "   "]) (
    "rejects an empty %s ownership identifier",
    (value) => {
      expect(() => requireNonEmptyOwnershipId(value, "workspaceId")).toThrow(
        "workspaceId is required",
      );
    },
  );
});
