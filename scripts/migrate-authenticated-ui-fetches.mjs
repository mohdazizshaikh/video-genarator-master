import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src/ui");
const changed = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (/\.(ts|tsx)$/.test(entry.name)) {
      const source = fs.readFileSync(absolute, "utf8");
      if (!source.includes("fetch(") || !source.includes("/api/")) continue;
      if (source.includes("authenticatedFetch")) continue;
      const updated = `import { authenticatedFetch } from "./services/authenticatedFetch";\n${source}`.replaceAll("fetch(", "authenticatedFetch(");
      fs.writeFileSync(absolute, updated);
      changed.push(absolute);
    }
  }
}

walk(root);
console.log(changed.join("\n"));
console.log(`Migrated ${changed.length} UI files.`);
