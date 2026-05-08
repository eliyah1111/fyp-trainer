import path from "node:path";
import fs from "node:fs/promises";
import { DEFAULTS } from "../config/defaults.js";
import { launchTikTokBrowser, openTikTok } from "../core/browser.js";
import { detectLoginState } from "../core/tiktok-detector.js";
import { searchTikTok } from "../core/tiktok-actions.js";
import { Humanizer } from "../core/humanizer.js";

async function inspectPage(page) {
  return page
    .evaluate(() => ({
      url: location.href,
      title: document.title,
      searchInputs: document.querySelectorAll('input[type="search"], input[placeholder*="Search"]').length,
      videoElements: document.querySelectorAll("video").length,
      videoLinks: document.querySelectorAll('a[href*="/video/"]').length,
      hasLoginButton: [...document.querySelectorAll("button, a")].some((element) =>
        /log in/i.test(element.textContent || "")
      ),
      sampleText: (document.body?.innerText || "").slice(0, 500)
    }))
    .catch((error) => ({ error: error.message, url: page.url() }));
}

export async function runTikTokDiagnostic(options = {}) {
  await fs.mkdir(DEFAULTS.sessionsDir, { recursive: true });
  const startedAt = new Date().toISOString();
  const id = `diagnostic-${startedAt.replace(/[:.]/g, "-")}`;
  const resultPath = path.join(DEFAULTS.sessionsDir, `${id}.json`);
  const screenshotPath = path.join(DEFAULTS.sessionsDir, `${id}.png`);
  const userDataDir = options.userDataDir || path.join(DEFAULTS.sessionsDir, `${id}-browser-profile`);
  const browser = await launchTikTokBrowser({
    ...options,
    userDataDir,
    headless: options.headless ?? false
  });
  const humanizer = new Humanizer({ enabled: false });

  try {
    await openTikTok(browser.page);
    const loginState = await detectLoginState(browser.page);
    const homeProbe = await inspectPage(browser.page);
    const result = {
      id,
      startedAt,
      url: browser.page.url(),
      title: await browser.page.title().catch(() => ""),
      userDataDir,
      loginState,
      homeProbe,
      search: null,
      screenshotPath
    };

    if (options.query) {
      if (!loginState.loggedIn && !options.forceSearch) {
        result.search = {
          ok: false,
          skipped: true,
          reason: "manual-login-required",
          query: options.query
        };
      } else {
        result.search = await searchTikTok(browser.page, options.query, { humanizer }).catch((error) => ({
          ok: false,
          error: error.message
        }));
        await browser.page.waitForTimeout(5_000);
        result.searchProbe = await inspectPage(browser.page);
        result.urlAfterSearch = browser.page.url();
        result.titleAfterSearch = await browser.page.title().catch(() => "");
      }
    }

    await browser.page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});
    await fs.writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    return { ...result, resultPath };
  } finally {
    await browser.close();
  }
}
