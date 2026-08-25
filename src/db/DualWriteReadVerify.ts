import crypto from "node:crypto";

export interface ReadVerifyResult {
  match: boolean;
  fileHash: string;
  durableHash: string;
  differences: string[];
}

export interface DualWriteResult<T> {
  fileValue: T;
  durableValue: T;
  readVerify: ReadVerifyResult;
}

export interface DualWritePorts<T> {
  fileWrite: () => Promise<T> | T;
  durableWrite: () => Promise<T> | T;
  fileRead: () => Promise<T> | T;
  durableRead: () => Promise<T> | T;
}

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`).join(",")}}`;
}

function hash(value: unknown): string {
  return crypto.createHash("sha256").update(stable(value), "utf8").digest("hex");
}

function differences(fileValue: unknown, durableValue: unknown, path = "$"): string[] {
  if (stable(fileValue) === stable(durableValue)) return [];
  if (!fileValue || !durableValue || typeof fileValue !== "object" || typeof durableValue !== "object") return [path];
  const fileObject = fileValue as Record<string, unknown>;
  const durableObject = durableValue as Record<string, unknown>;
  const keys = new Set([...Object.keys(fileObject), ...Object.keys(durableObject)]);
  return [...keys].flatMap((key) => differences(fileObject[key], durableObject[key], `${path}.${key}`));
}

export function compareReadModels(fileValue: unknown, durableValue: unknown): ReadVerifyResult {
  const fileHash = hash(fileValue);
  const durableHash = hash(durableValue);
  const mismatchPaths = differences(fileValue, durableValue);
  return { match: fileHash === durableHash && mismatchPaths.length === 0, fileHash, durableHash, differences: mismatchPaths };
}

/**
 * Writes the file-backed authority first, then writes the durable shadow. The
 * durable result is never promoted to a primary read by this helper. A durable
 * write failure is surfaced to the caller; it is not hidden as success.
 */
export async function shadowWriteAndReadVerify<T>(ports: DualWritePorts<T>): Promise<DualWriteResult<T>> {
  const fileValue = await ports.fileWrite();
  const durableValue = await ports.durableWrite();
  const verified = compareReadModels(await ports.fileRead(), await ports.durableRead());
  if (!verified.match) throw new Error(`Dual-write read-verify mismatch: ${verified.differences.join(", ") || "hash mismatch"}`);
  return { fileValue, durableValue, readVerify: verified };
}
