import fs from "fs-extra";
import path from "node:path";
import { randomUUID } from "node:crypto";

/** Synchronous operations serialize writers within this process only. */
export function initializeJsonArray(file: string): void {
  fs.ensureDirSync(path.dirname(file));
  try {
    fs.writeFileSync(file, "[]", { encoding: "utf-8", flag: "wx", mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
}

export function readJsonArray<T>(file: string): T[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    throw new Error(`Invalid JSON array store: ${path.basename(file)}`);
  }
  if (!Array.isArray(parsed) || parsed.some((row) => !row || typeof row !== "object" || Array.isArray(row))) {
    throw new Error(`Invalid JSON array store: ${path.basename(file)}`);
  }
  return parsed as T[];
}

export function writeJsonArray<T>(file: string, records: T[]): void {
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(records, null, 2), { encoding: "utf-8", flag: "wx", mode: 0o600 });
    fs.renameSync(temporary, file);
  } finally {
    fs.removeSync(temporary);
  }
}
