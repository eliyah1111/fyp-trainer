import fs from "node:fs/promises";
import { chromium } from "playwright";
import { DEFAULTS } from "../config/defaults.js";
import { ensureRegularBrowserCdp } from "./regular-browser.js";

export async function launchTikTokBrowser(options = {}) {
  if (options.useRegularBrowser && !options.cdpEndpoint) {
    const cdp = await ensureRegularBrowserCdp({
      defaultBrowser: options.defaultBrowser,
      cdpEndpoint: options.cdpEndpoint,
      useDefaultProfile: options.useDefaultProfile,
      timeoutMs: options.cdpTimeoutMs
    });
    options.cdpEndpoint = cdp.endpoint;
  }

  if (options.cdpEndpoint) {
    const browser = await chromium.connectOverCDP(options.cdpEndpoint);
    const context = browser.contexts()[0] || (await browser.newContext({
      viewport: options.viewport || DEFAULTS.viewport,
      locale: options.locale || "en-US",
      timezoneId: options.timezoneId
    }));
    const page = context.pages()[0] || (await context.newPage());
    page.setDefaultTimeout(options.timeoutMs || 15_000);

    return {
      browser,
      context,
      page,
      connectedOverCDP: true,
      async close() {
        // Do not close the user's regular browser when connected over CDP.
      }
    };
  }

  const userDataDir = options.userDataDir || DEFAULTS.browserProfileDir;
  await fs.mkdir(userDataDir, { recursive: true });

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: options.browserChannel,
    headless: options.headless ?? false,
    viewport: options.viewport || DEFAULTS.viewport,
    locale: options.locale || "en-US",
    timezoneId: options.timezoneId,
    slowMo: options.slowMo ?? 0
  });

  const page = context.pages()[0] || (await context.newPage());
  page.setDefaultTimeout(options.timeoutMs || 15_000);

  return {
    context,
    page,
    async close() {
      await context.close();
    }
  };
}

export async function openTikTok(page, url = DEFAULTS.tiktokUrl) {
  try {
    await page.goto(url, { waitUntil: "commit", timeout: 60_000 });
  } catch (error) {
    if (!page.url().startsWith("https://www.tiktok.com")) throw error;
  }
  await page.waitForLoadState("domcontentloaded", { timeout: 30_000 }).catch(() => {});
  await page.waitForLoadState("load", { timeout: 30_000 }).catch(() => {});
  await page.waitForFunction(
    () => (document.body?.innerText || "").length > 20 || document.querySelector("video"),
    { timeout: 8_000 }
  ).catch(() => {});
  await page.waitForTimeout(5_000);
}
