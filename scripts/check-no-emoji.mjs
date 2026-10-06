import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { findEmojiLines } from "./no-emoji.mjs";

const ROOTS = ["src", "supabase", "public", "docs", "README.md", "CHANGELOG.md", "AI_HANDOFF.md"];
const EXT = new Set([".ts", ".tsx", ".css", ".sql", ".md", ".json", ".svg", ".mjs", ".html", ".txt"]);

function* walk(path) {
  let s;
  try { s = statSync(path); } catch { return; }
  if (s.isDirectory()) {
    for (const name of readdirSync(path)) yield* walk(join(path, name));
  } else if (EXT.has(extname(path))) {
    yield path;
  }
}

let failures = 0;
for (const root of ROOTS) {
  for (const file of walk(root)) {
    for (const hit of findEmojiLines(readFileSync(file, "utf8"))) {
      console.error(`Emoji found: ${file}:${hit.line}`);
      failures++;
    }
  }
}
if (failures > 0) {
  console.error(`${failures} emoji occurrence(s). Emoji are not allowed in Shuttler.`);
  process.exit(1);
}
console.log("No emoji found.");
