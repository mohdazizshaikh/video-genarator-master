import { describe, expect, it } from "vitest";
import { isTerminalPublishFailure } from "./PublishWorker.js";

describe("isTerminalPublishFailure", () => {
  it("treats only the final allowed attempt as terminal", () => {
    expect(isTerminalPublishFailure(1, 2)).toBe(false);
    expect(isTerminalPublishFailure(2, 2)).toBe(true);
    expect(isTerminalPublishFailure(1, 1)).toBe(true);
    expect(isTerminalPublishFailure(2, 3)).toBe(false);
    expect(isTerminalPublishFailure(3, 3)).toBe(true);
  });

  it("clamps an absent or non-positive budget to a single attempt", () => {
    expect(isTerminalPublishFailure(1, undefined)).toBe(true);
    expect(isTerminalPublishFailure(0, undefined)).toBe(false);
    expect(isTerminalPublishFailure(1, 0)).toBe(true);
  });
});
