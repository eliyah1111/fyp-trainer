#!/usr/bin/env node
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { PROJECT_ROOT } from "../src/config/defaults.js";

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === "win32";
    const executable = command === "node" ? process.execPath : command;
    const spawnFile = isWindows && command === "npm" ? "cmd.exe" : executable;
    const spawnArgs = isWindows && command === "npm" ? ["/d", "/s", "/c", command, ...args] : args;
    const child = spawn(spawnFile, spawnArgs, {
      cwd: PROJECT_ROOT,
      shell: false,
      stdio: "inherit",
      ...options
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
        return;
      }
      resolve();
    });
  });
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

const nodeModules = path.join(PROJECT_ROOT, "node_modules");
if (!(await exists(nodeModules))) {
  await run("npm", ["install"]);
}

await fs.mkdir(path.join(PROJECT_ROOT, "memory"), { recursive: true });
await fs.mkdir(path.join(PROJECT_ROOT, "sessions"), { recursive: true });
await run("node", ["./scripts/check-syntax.js"]);

console.log("FYP Trainer bootstrap complete.");
