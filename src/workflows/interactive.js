import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { analyzeFypRequest, formatProfileSummary, mergeProfileChange } from "../core/profile-analyzer.js";
import { launchTikTokBrowser, openTikTok } from "../core/browser.js";
import { detectLoginState, summarizeLoginState } from "../core/tiktok-detector.js";
import { buildSessionPlan, normalizeSessionDuration } from "../core/session-planner.js";
import { runTrainingSession } from "../core/session-runner.js";
import { DEFAULTS } from "../config/defaults.js";

function createPrompt() {
  return readline.createInterface({ input, output });
}

async function waitForLogin(rl, page) {
  let loginState = await detectLoginState(page);
  while (!loginState.loggedIn) {
    console.log("\nTikTok is open. Please log in manually in the browser.");
    await rl.question("Press Enter here after the login is complete...");
    loginState = await detectLoginState(page);
    console.log(summarizeLoginState(loginState));
  }
}

function formatDuration(seconds) {
  if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60} min`;
  return `${seconds}s`;
}

function parseDurationAnswer(text, fallbackSeconds) {
  const trimmed = String(text || "").trim().toLowerCase();
  if (!trimmed) return fallbackSeconds;

  const match = trimmed.match(/(\d+(?:\.\d+)?)/);
  if (!match) return fallbackSeconds;

  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return fallbackSeconds;

  const hasMinuteUnit = /\b(m|min|mins|minute|minutes)\b|דקה|דקות/i.test(trimmed);
  const hasSecondUnit = /\d\s*(s|sec|secs)\b|\b(second|seconds)\b|שניה|שנייה|שניות/i.test(trimmed);
  if (hasMinuteUnit && !hasSecondUnit) return Math.round(value * 60);
  if (!hasSecondUnit && value <= 10) return Math.round(value * 60);
  return Math.round(value);
}

async function askTimeBudget(rl, options = {}) {
  const defaultSeconds = Math.round(normalizeSessionDuration(options) / 1000);
  const maxSeconds = Math.round(DEFAULTS.session.maxDurationMs / 1000);
  const minSeconds = Math.round(DEFAULTS.session.minDurationMs / 1000);
  const answer = await rl.question(
    `\nHow long are you willing to wait? (${minSeconds}s-${formatDuration(maxSeconds)}, Enter = ${formatDuration(defaultSeconds)}) `
  );
  const requestedSeconds = parseDurationAnswer(answer, defaultSeconds);
  const durationSeconds = Math.round(normalizeSessionDuration({ durationSeconds: requestedSeconds }) / 1000);
  if (durationSeconds !== requestedSeconds) {
    console.log(`Using ${formatDuration(durationSeconds)} to stay inside the safe session window.`);
  }
  return durationSeconds;
}

async function confirmProfileLoop(rl, firstRequest, durationSeconds) {
  let profile = analyzeFypRequest(firstRequest);
  while (true) {
    const plan = buildSessionPlan(profile, { durationSeconds });
    console.log("\nTraining profile\n");
    console.log(formatProfileSummary(profile));
    console.log(
      `\nPlanned account signals: likes capped at ${DEFAULTS.session.maxLikes}, Not Interested capped at ${DEFAULTS.session.maxNotInterested}, follows disabled by default.`
    );
    console.log(
      `Time budget: ${formatDuration(durationSeconds)}. Fastest safe plan: ${plan.searchQueue.length} live searches, capped at ${plan.orchestration.hardMaxSearchesPerMinute}/minute.`
    );
    const answer = (await rl.question("\nApprove this search plan? [Y/N] ")).trim();
    if (/^(yes|y)$/i.test(answer)) return profile;
    if (!/^(no|n)$/i.test(answer)) {
      console.log("Please answer Y or N.");
      continue;
    }
    const changeText = await rl.question("What would you like to change? ");
    profile = mergeProfileChange(profile, changeText);
  }
}

export async function runInteractive(options = {}) {
  const rl = createPrompt();
  const browser = await launchTikTokBrowser(options);

  try {
    console.log("Opening TikTok...");
    await openTikTok(browser.page);
    let loginState = await detectLoginState(browser.page);
    console.log(summarizeLoginState(loginState));
    if (!loginState.loggedIn) {
      await waitForLogin(rl, browser.page);
    }

    const request = await rl.question("\nWhat kind of TikTok For You Page do you want? ");
    const durationSeconds = await askTimeBudget(rl, options);
    const profile = await confirmProfileLoop(rl, request, durationSeconds);

    console.log(`\nStarting capped training session for ${formatDuration(durationSeconds)}...`);
    const result = await runTrainingSession(profile, {
      ...options,
      durationSeconds,
      browserSession: browser,
      skipLoginCheck: true,
      confirmed: true,
      log: (message) => console.log(message)
    });
    console.log(`\nDone. Session: ${result.sessionFile}`);
    console.log(JSON.stringify(result.metrics, null, 2));
    return result;
  } finally {
    rl.close();
    if (options.keepBrowserOpen !== true) {
      await browser.close();
    }
  }
}
