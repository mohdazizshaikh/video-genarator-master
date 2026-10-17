/**
 * check-test-existence.ts
 *
 * Ensures every source file that changed in the current git diff has a matching
 * test file (`<name>.test.ts` / `<name>.test.tsx` / `__tests__/`), so new code
 * never lands without coverage. Prints the changed files and their test status.
 *
 * Exit code 1 when a changed non-test source file has no matching test.
 * Run: npx ts-node scripts/qa/check-test-existence.ts
 */
import path from "node:path";
import { SRC_DIR, walk, rel, runCommand, logFinding, type Finding } from "./lib";

function gitChangedFiles(): string[] {
  const candidates: string[] = [];
  const baseRef = process.env.GITHUB_BASE_REF || "main";

  // 1. PR base ref (local checkout with fetched refs)
  const { code: hasBase, stdout: baseSha } = runCommand(`git rev-parse --verify origin/${baseRef} 2>/dev/null`);
  if (hasBase === 0) {
    const range = runCommand(`git diff --name-only ${baseSha.trim()}...HEAD -- src`).stdout
      .split("\n")
      .filter((l) => l.length > 0);
    candidates.push(...range);
  }

  // 2. Last commit vs its parent (works on shallow CI checkouts)
  const { code: hasParent } = runCommand("git rev-parse --verify HEAD^ 2>/dev/null");
  if (hasParent === 0) {
    const last = runCommand("git diff --name-only HEAD^ HEAD -- src").stdout
      .split("\n")
      .filter((l) => l.length > 0);
    candidates.push(...last);
  }

  // 3. Uncommitted working-tree changes
  const dirty = runCommand("git status --porcelain -- src").stdout
    .split("\n")
    .map((l) => l.slice(3).trim())
    .filter((l) => l.length > 0 && !l.startsWith("R"));
  candidates.push(...dirty);

  return [...new Set(candidates)];
}

function main(): void {
  const findings: Finding[] = [];

  const testCandidates = new Set<string>();
  for (const abs of walk(SRC_DIR, [".ts", ".tsx"])) {
    if (!/(\.test|\.spec)\.(ts|tsx)$/.test(abs)) continue;
    testCandidates.add(rel(abs));
  }

  const changed = [...new Set(gitChangedFiles())];
  if (changed.length === 0) {
    console.log("check-test-existence: no changed source files to verify.\n");
    return;
  }

  for (const fileRel of changed) {
    if (!fileRel.startsWith("src/")) continue;
    if (/(\.test|\.spec)\.(ts|tsx)$/.test(fileRel)) continue;

    const base = fileRel.replace(/\.(ts|tsx)$/, "");
    const basename = path.basename(fileRel);
    const dirname = path.dirname(fileRel);
    const candidates = [
      `${base}.test.ts`,
      `${base}.test.tsx`,
      `${base}.spec.ts`,
      `${base}.spec.tsx`,
      `${dirname}/__tests__/${basename}`,
    ];
    const hasTest = candidates.some((c) => testCandidates.has(c));
    findings.push({
      file: fileRel,
      severity: hasTest ? "warning" : "error",
      message: hasTest ? `has matching test (${candidates.find((c) => testCandidates.has(c))})` : "no test file found for new/changed source",
    });
  }

  for (const f of findings) logFinding(f);

  const untested = findings.filter((f) => f.severity === "error");
  if (untested.length > 0) {
    console.log(`\ncheck-test-existence: ${untested.length} untested file(s). Add tests before merging.\n`);
    process.exit(1);
  }
  console.log(`\n✓ check-test-existence passed (${findings.length - untested.length} tested).\n`);
}

main();
