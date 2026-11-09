import { describe, expect, it } from "vitest";
import { nextScheduleRun, validateRecurrence } from "./ScheduleRecurrence";

describe("schedule cron calculations", () => {
  it.each([
    ["0 9 * * *", "UTC", "2026-10-25T10:00:00Z", "2026-10-26T09:00:00.000Z"],
    ["0 9 * * MON", "UTC", "2026-10-26T09:00:00Z", "2026-11-02T09:00:00.000Z"],
    ["0 9 * * *", "Asia/Kolkata", "2026-10-25T04:00:00Z", "2026-10-26T03:30:00.000Z"],
    ["0 0 29 2 *", "UTC", "2025-03-01T00:00:00Z", "2028-02-29T00:00:00.000Z"],
    ["*/15 * * * *", "UTC", "2026-10-25T09:15:00Z", "2026-10-25T09:30:00.000Z"],
    ["15 */2 * * * *", "UTC", "2026-10-25T09:14:15Z", "2026-10-25T09:16:15.000Z"],
  ])("calculates %s in %s", (cronExpression, timezone, now, expected) => {
    expect(nextScheduleRun({ cronExpression, timezone }, new Date(now))).toBe(expected);
  });
  it("uses one shifted execution for the spring DST gap", () => {
    const schedule = { cronExpression: "30 2 * * *", timezone: "America/New_York" };
    expect(nextScheduleRun(schedule, new Date("2026-03-07T07:30:00Z"))).toBe("2026-03-08T07:30:00.000Z");
    expect(nextScheduleRun(schedule, new Date("2026-03-08T07:30:00Z"))).toBe("2026-03-09T06:30:00.000Z");
  });
  it("does not execute the repeated fall DST hour twice", () => {
    const schedule = { cronExpression: "30 1 * * *", timezone: "America/New_York" };
    expect(nextScheduleRun(schedule, new Date("2026-11-01T05:29:00Z"))).toBe("2026-11-01T05:30:00.000Z");
    expect(nextScheduleRun(schedule, new Date("2026-11-01T05:30:00Z"))).toBe("2026-11-02T06:30:00.000Z");
  });
  it.each(["bad", "90 9 * * *", "0 0 30 2 *"])("rejects invalid/impossible cron %s", (cronExpression) => {
    expect(() => validateRecurrence({ cronExpression })).toThrow();
  });
  it("validates timezone and one-shot semantics explicitly", () => {
    expect(() => validateRecurrence({ cronExpression: "0 9 * * *", timezone: "invalid/place" })).toThrow("timezone");
    expect(nextScheduleRun({ cronExpression: "", recurrence: "once" }, new Date())).toBeUndefined();
  });
});
