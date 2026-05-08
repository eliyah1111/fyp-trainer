import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

export function runFypTrainerCli(args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["./src/cli.js", ...args], {
      cwd: options.cwd || ROOT,
      shell: false,
      env: { ...process.env, ...options.env }
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `fyp-trainer exited with ${code}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}
