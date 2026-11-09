import { parseExpression } from "cron-parser";

export class ScheduleValidationError extends Error {}

export type Recurrence = { cronExpression: string; timezone?: string; recurrence?: "cron" | "once" };

export function validateRecurrence(input: Recurrence): void {
  if (![undefined, "cron", "once"].includes(input.recurrence)) throw new ScheduleValidationError("recurrence must be cron or once");
  const timezone = input.timezone ?? "UTC";
  if (typeof timezone !== "string" || timezone.length > 100) throw new ScheduleValidationError("Invalid schedule timezone");
  try { new Intl.DateTimeFormat("en", { timeZone: timezone }).format(0); }
  catch { throw new ScheduleValidationError("Invalid schedule timezone"); }
  if (input.recurrence === "once") return;
  if (typeof input.cronExpression !== "string" || input.cronExpression.length > 200 || ![5, 6].includes(input.cronExpression.trim().split(/\s+/).length)) throw new ScheduleValidationError("Invalid cron expression");
  try {
    // A fixed reference makes validation independent of the current day.
    parseExpression(input.cronExpression, { currentDate: new Date("2024-01-01T00:00:00Z"), tz: timezone }).next();
  } catch { throw new ScheduleValidationError("Invalid or impossible cron expression"); }
}

/** Advance from actual completion time. Missed occurrences are coalesced into one
 * execution, and failures wait for the next cron occurrence rather than hot-loop. */
export function nextScheduleRun(input: Recurrence, after: Date): string | undefined {
  validateRecurrence(input);
  if (input.recurrence === "once") return undefined;
  if (!Number.isFinite(after.getTime())) throw new ScheduleValidationError("Invalid schedule reference time");
  try { return parseExpression(input.cronExpression, { currentDate: after, tz: input.timezone ?? "UTC" }).next().toISOString(); }
  catch { throw new ScheduleValidationError("No next cron occurrence"); }
}
