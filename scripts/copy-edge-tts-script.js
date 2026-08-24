const fs = require("node:fs");
const path = require("node:path");

const files = ["edge_tts_prosody.py", "chatterbox_server.py"];
const destDir = path.join(__dirname, "..", "dist", "short-creator", "libraries");
fs.mkdirSync(destDir, { recursive: true });

for (const file of files) {
  const src = path.join(__dirname, "..", "src", "short-creator", "libraries", file);
  fs.copyFileSync(src, path.join(destDir, file));
}
console.log(`Copied ${files.join(", ")} to dist`);
