import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { analyzeFypRequest, formatProfileSummary, mergeProfileChange } from "../core/profile-analyzer.js";
import { launchTikTokBrowser, openTikTok } from "../core/browser.js";
import { detectLoginState, summarizeLoginState } from "../core/tiktok-detector.js";
import { runTrainingSession } from "../core/session-runner.js";

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

async function confirmProfileLoop(rl, firstRequest) {
  let profile = analyzeFypRequest(firstRequest);
  while (true) {
    console.log("\nTraining profile\n");
    console.log(formatProfileSummary(profile));
    console.log("\nPlanned account signals: likes capped at 2, Not Interested capped at 3, follows disabled by default.");
    console.log("Session engine: adaptive cache-aware discovery, up to 14 searches in a 60-second session.");
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
    const profile = await confirmProfileLoop(rl, request);

    console.log("\nStarting capped training session...");
    const result = await runTrainingSession(profile, {
      ...options,
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
