import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const DEFAULT_CDP_ENDPOINT = "http://127.0.0.1:9222";
const PROJECT_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const LAUNCH_SCRIPT = fileURLToPath(
  new URL("../../scripts/launch-regular-browser.ps1", import.meta.url)
);

async function isCdpReady(endpoint) {
  try {
    const response = await fetch(`${endpoint.replace(/\/$/, "")}/json/version`, {
      signal: AbortSignal.timeout(1_000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForCdp(endpoint, timeoutMs = 15_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isCdpReady(endpoint)) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

function runLaunchScript({ browser = "default", port = 9222, useDefaultProfile = false } = {}) {
  return new Promise((resolve, reject) => {
    const args = [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      LAUNCH_SCRIPT,
      "-Browser",
      browser,
      "-Port",
      String(port)
    ];

    if (useDefaultProfile) {
      args.push("-UseDefaultProfile");
    }

    const child = spawn(
      "powershell",
      args,
      {
        cwd: PROJECT_ROOT,
        shell: false,
        windowsHide: false
      }
    );

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
        reject(new Error((stderr || stdout || `Browser launcher exited with ${code}`).trim()));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

export async function ensureRegularBrowserCdp(options = {}) {
  const endpoint = options.cdpEndpoint || DEFAULT_CDP_ENDPOINT;
  const port = Number(new URL(endpoint).port || 9222);

  if (await isCdpReady(endpoint)) {
    return { endpoint, launched: false };
  }

  await runLaunchScript({
    browser: options.defaultBrowser || "default",
    port,
    useDefaultProfile: Boolean(options.useDefaultProfile)
  });

  if (!(await waitForCdp(endpoint, options.timeoutMs || 15_000))) {
    throw new Error(
      `The regular browser opened, but DevTools did not become available at ${endpoint}. ` +
        "Try closing the opened browser window and run again with --isolated."
    );
  }

  return { endpoint, launched: true };
}
