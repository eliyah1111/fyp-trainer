#!/usr/bin/env node
import fs from "node:fs/promises";
import readline from "node:readline/promises";
import { stdin as input } from "node:process";
import { analyzeFypRequest, formatProfileSummary } from "./core/profile-analyzer.js";
import { MemoryStore } from "./core/memory-store.js";
import { buildSessionPlan } from "./core/session-planner.js";
import { runTrainingSession } from "./core/session-runner.js";
import { runInteractive } from "./workflows/interactive.js";
import { runTikTokDiagnostic } from "./workflows/diagnose-tiktok.js";

function parseArgs(argv) {
  const args = { _: [] };
  for (const item of argv) {
    if (!item.startsWith("--")) {
      args._.push(item);
      continue;
    }
    const [key, rawValue] = item.slice(2).split("=");
    const value = rawValue === undefined ? true : rawValue;
    args[key] = value;
  }
  return args;
}

async function readStdinIfNeeded(args) {
  if (args.input) return String(args.input);
  if (input.isTTY) return "";
  let text = "";
  for await (const chunk of input) text += chunk;
  return text.trim();
}

function booleanFlag(args, name, defaultValue = false) {
  if (args[name] === undefined) return defaultValue;
  if (args[name] === true) return true;
  return !/^(false|0|no)$/i.test(String(args[name]));
}

function browserOptions(args) {
  const wantsIsolated = booleanFlag(args, "isolated", false);
  return {
    useRegularBrowser: !wantsIsolated,
    cdpEndpoint: args.cdp || args["connect-cdp"] ? String(args.cdp || args["connect-cdp"]) : undefined,
    browserChannel: args["browser-channel"] ? String(args["browser-channel"]) : undefined,
    defaultBrowser: args["default-browser"] ? String(args["default-browser"]) : undefined,
    useDefaultProfile: booleanFlag(args, "use-default-profile", false),
    userDataDir: args["browser-profile"] ? String(args["browser-profile"]) : undefined
  };
}

async function loadProfile(args, memory) {
  if (args.profile) {
    const text = await fs.readFile(String(args.profile), "utf8");
    return JSON.parse(text);
  }
  if (args.id) {
    const profile = await memory.getProfile(String(args.id));
    if (!profile) throw new Error(`No saved profile found for id: ${args.id}`);
    return profile;
  }
  const latest = await memory.latestProfile();
  if (!latest) throw new Error("No profile supplied and no saved profile exists.");
  return latest;
}

async function commandProfile(args) {
  const text = await readStdinIfNeeded(args);
  const profile = analyzeFypRequest(text);
  const memory = new MemoryStore();
  await memory.saveProfile(profile);
  if (booleanFlag(args, "json")) {
    console.log(JSON.stringify(profile, null, 2));
  } else {
    console.log(formatProfileSummary(profile));
    console.log(`\nSaved profile id: ${profile.id}`);
  }
}

async function commandPlan(args) {
  const memory = new MemoryStore();
  const profile = await loadProfile(args, memory);
  const searchCache = await memory.getSearchCache();
  const plan = buildSessionPlan(profile, {
    durationSeconds: Number(args.duration || args.seconds || 60),
    maxSearches: Number(args.searches || 14),
    searchCache
  });
  console.log(JSON.stringify(plan, null, 2));
}

async function commandTrain(args) {
  const memory = new MemoryStore();
  const profile = await loadProfile(args, memory);
  const result = await runTrainingSession(profile, {
    ...browserOptions(args),
    headless: booleanFlag(args, "headless", false),
    dryRun: booleanFlag(args, "dry-run", false),
    confirmed: booleanFlag(args, "confirmed", false),
    allowFollow: booleanFlag(args, "allow-follow", false),
    maxFollows: Number(args["max-follows"] || 0),
    maxLikes: Number(args["max-likes"] || 2),
    maxNotInterested: Number(args["max-not-interested"] || 3),
    durationSeconds: Number(args.duration || args.seconds || 60),
    maxSearches: Number(args.searches || 14),
    careful: booleanFlag(args, "careful", false),
    keepBrowserOpen: booleanFlag(args, "keep-open", false),
    waitForLogin: input.isTTY
      ? async () => {
          console.log("Log in manually in the opened browser, then press Enter here.");
          const rl = readline.createInterface({ input, output: process.stdout });
          await rl.question("");
          rl.close();
        }
      : undefined,
    log: (message) => console.log(message)
  });
  console.log(JSON.stringify(result, null, 2));
}

async function commandDiagnose(args) {
  const result = await runTikTokDiagnostic({
    ...browserOptions(args),
    headless: booleanFlag(args, "headless", false),
    forceSearch: booleanFlag(args, "force-search", false),
    query: args.query ? String(args.query) : undefined
  });
  console.log(JSON.stringify(result, null, 2));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] || "run";

  if (command === "run") {
    await runInteractive({
      ...browserOptions(args),
      headless: booleanFlag(args, "headless", false),
      durationSeconds: Number(args.duration || args.seconds || 60),
      maxSearches: Number(args.searches || 14),
      careful: booleanFlag(args, "careful", false),
      keepBrowserOpen: booleanFlag(args, "keep-open", false)
    });
    return;
  }

  if (command === "profile") return commandProfile(args);
  if (command === "plan") return commandPlan(args);
  if (command === "train") return commandTrain(args);
  if (command === "diagnose") return commandDiagnose(args);

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
