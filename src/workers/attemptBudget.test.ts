import { describe, expect, it } from "vitest";
import { isTerminalAttempt } from "./attemptBudget.js";

describe("isTerminalAttempt", () => {
  it("treats only the final allowed attempt as terminal", () => {
    expect(isTerminalAttempt(1, 2)).toBe(false);
    expect(isTerminalAttempt(2, 2)).toBe(true);
    expect(isTerminalAttempt(1, 1)).toBe(true);
    expect(isTerminalAttempt(2, 3)).toBe(false);
    expect(isTerminalAttempt(3, 3)).toBe(true);
  });

  it("clamps an absent or non-positive budget to a single attempt", () => {
    expect(isTerminalAttempt(1, undefined)).toBe(true);
    expect(isTerminalAttempt(0, undefined)).toBe(false);
    expect(isTerminalAttempt(1, 0)).toBe(true);
  });
});
