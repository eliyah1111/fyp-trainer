#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const roots = ["src", "scripts", "adapters/openai-agents", "test"];
const files = [];

async function walk(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(fullPath);
    if (entry.isFile() && fullPath.endsWith(".js")) files.push(fullPath);
  }
}

for (const root of roots) {
  await walk(path.resolve(root));
}

let failed = false;
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    stdio: "inherit"
  });
  if (result.status !== 0) failed = true;
}

if (failed) process.exit(1);
console.log(`Syntax OK (${files.length} files).`);
