import { Humanizer } from "./humanizer.js";
import { chance, randomInt, sample } from "../utils/random.js";

function scoreTextAgainstProfile(text, profile) {
  const lower = String(text || "").toLowerCase();
  const positiveTerms = [
    ...profile.hashtags,
    ...profile.creators,
    ...profile.contentCategories,
    ...profile.sounds
  ].map((value) => String(value).replace(/^#|^@/, "").toLowerCase());
  const negativeTerms = profile.unwantedContentCategories.map((value) => String(value).toLowerCase());
  const positive = positiveTerms.filter((term) => term && lower.includes(term)).length;
  const negative = negativeTerms.filter((term) => term && lower.includes(term)).length;
  return Math.max(-1, Math.min(1, positive * 0.22 - negative * 0.35));
}

async function clickFirstVisible(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector);
    const count = await locator.count().catch(() => 0);
    for (let index = 0; index < Math.min(count, 4); index += 1) {
      const item = locator.nth(index);
      if (await item.isVisible().catch(() => false)) {
        await item.click({ timeout: 5_000 }).catch(() => {});
        return true;
      }
    }
  }
  return false;
}

export async function inspectSearchPage(page) {
  return page
    .evaluate(() => {
      const text = document.body?.innerText || "";
      const links = [...document.querySelectorAll('a[href*="/video/"]')]
        .map((anchor) => anchor.href)
        .filter(Boolean);
      const hashtagLinks = [...document.querySelectorAll('a[href*="/tag/"]')]
        .map((anchor) => anchor.textContent?.trim() || anchor.getAttribute("href")?.split("/tag/").pop())
        .filter(Boolean);
      const textHashtags = [...text.matchAll(/#([\p{L}\p{N}_]+)/gu)]
        .map((match) => `#${match[1]}`)
        .filter(Boolean);
      const creators = [...document.querySelectorAll('a[href^="/@"], a[href*="tiktok.com/@"]')]
        .map((anchor) => {
          const href = anchor.getAttribute("href") || "";
          const match = href.match(/@([a-zA-Z0-9_.]{2,32})/);
          return match ? `@${match[1]}` : "";
        })
        .filter(Boolean);

      return {
        url: location.href,
        title: document.title,
        sampleText: text.slice(0, 1600),
        videoLinks: [...new Set(links)].slice(0, 24),
        videoElements: document.querySelectorAll("video").length,
        hashtags: [...new Set([...hashtagLinks, ...textHashtags])].slice(0, 32),
        creators: [...new Set(creators)].slice(0, 24)
      };
    })
    .catch(() => ({
      url: page.url(),
      title: "",
      sampleText: "",
      videoLinks: [],
      videoElements: 0,
      hashtags: [],
      creators: []
    }));
}

export async function searchTikTok(page, query, options = {}) {
  const humanizer = options.humanizer || new Humanizer();
  await humanizer.pause();

  const inputSelectors = [
    'input[data-e2e="search-user-input"]',
    'input[placeholder*="Search"]',
    'input[type="search"]'
  ];

  for (const selector of inputSelectors) {
    const input = page.locator(selector).first();
    if (await input.isVisible().catch(() => false)) {
      await input.click();
      await input.fill("");
      await input.type(query, { delay: humanizer.typingDelay() });
      await input.press("Enter");
      await page.waitForLoadState("domcontentloaded", { timeout: 20_000 }).catch(() => {});
      await page.waitForFunction(
        () => location.href.includes("/search") || document.querySelector('a[href*="/video/"]'),
        { timeout: 8_000 }
      ).catch(() => {});
      await humanizer.pause(
        humanizer.timing.afterSearchPauseMinMs,
        humanizer.timing.afterSearchPauseMaxMs
      );
      return { ok: true, method: "search-input", query, signals: await inspectSearchPage(page) };
    }
  }

  const searchUrl = `https://www.tiktok.com/search/video?q=${encodeURIComponent(query)}`;
  try {
    await page.goto(searchUrl, { waitUntil: "commit", timeout: 25_000 });
  } catch (error) {
    if (!page.url().includes("/search")) throw error;
  }
  await page.waitForLoadState("domcontentloaded", { timeout: 20_000 }).catch(() => {});
  await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => {});
  await page.waitForFunction(
    () => (document.body?.innerText || "").length > 20 || document.querySelector('a[href*="/video/"]'),
    { timeout: 8_000 }
  ).catch(() => {});
  await humanizer.pause(
    humanizer.timing.afterSearchPauseMinMs,
    humanizer.timing.afterSearchPauseMaxMs
  );
  return { ok: true, method: "search-url", query, signals: await inspectSearchPage(page) };
}

export async function openRandomVideoFromPage(page, options = {}) {
  const humanizer = options.humanizer || new Humanizer();
  const links =
    options.preferredLinks ||
    (await page
      .evaluate(() => {
        const hrefs = [...document.querySelectorAll('a[href*="/video/"]')]
          .map((anchor) => anchor.href)
          .filter(Boolean);
        return [...new Set(hrefs)].slice(0, 16);
      })
      .catch(() => []));

  if (!links.length) {
    return { ok: false, reason: "No visible video links found." };
  }

  const target = sample(links.slice(0, Math.min(links.length, 8)));
  await humanizer.moveMouse(page);
  try {
    await page.goto(target, { waitUntil: "commit", timeout: 12_000 });
  } catch (error) {
    if (!page.url().includes("/video/")) throw error;
  }
  await page.waitForLoadState("domcontentloaded", { timeout: 6_000 }).catch(() => {});
  await page.waitForLoadState("load", { timeout: 6_000 }).catch(() => {});
  await humanizer.pause(
    humanizer.timing.afterOpenVideoPauseMinMs,
    humanizer.timing.afterOpenVideoPauseMaxMs
  );
  return { ok: true, url: page.url() };
}

export async function openFeedFallback(page, options = {}) {
  const humanizer = options.humanizer || new Humanizer();
  try {
    await page.goto("https://www.tiktok.com/foryou", { waitUntil: "commit", timeout: 12_000 });
  } catch (error) {
    if (!page.url().startsWith("https://www.tiktok.com")) throw error;
  }
  await page.waitForLoadState("domcontentloaded", { timeout: 6_000 }).catch(() => {});
  await page
    .waitForFunction(() => document.querySelector("video") || (document.body?.innerText || "").length > 20, {
      timeout: 6_000
    })
    .catch(() => {});
  await humanizer.pause(
    humanizer.timing.afterOpenVideoPauseMinMs,
    humanizer.timing.afterOpenVideoPauseMaxMs
  );
  const hasVideo = await page.locator("video").count().then((count) => count > 0).catch(() => false);
  return {
    ok: hasVideo,
    fallback: true,
    url: page.url(),
    reason: hasVideo ? "Opened For You feed fallback." : "For You feed did not expose a video."
  };
}

export async function collectVideoContext(page, profile) {
  const context = await page
    .evaluate(() => ({
      url: location.href,
      title: document.title,
      text: (document.body?.innerText || "").slice(0, 5_000)
    }))
    .catch(() => ({ url: page.url(), title: "", text: "" }));

  return {
    ...context,
    score: scoreTextAgainstProfile(`${context.title}\n${context.text}\n${context.url}`, profile)
  };
}

export async function watchCurrentVideo(page, profile, options = {}) {
  const humanizer = options.humanizer || new Humanizer();
  const context = await collectVideoContext(page, profile);
  const watchMs = options.watchMs || humanizer.watchDuration(context.score);
  await humanizer.watch(page, watchMs);
  return { ...context, watchMs };
}

export async function goToNextVideo(page, options = {}) {
  const humanizer = options.humanizer || new Humanizer();
  const before = page.url();
  await humanizer.pause(humanizer.timing.beforeNextPauseMinMs, humanizer.timing.beforeNextPauseMaxMs);
  if (chance(0.65)) {
    await page.keyboard.press("ArrowDown").catch(() => {});
  } else {
    await page.mouse.wheel(randomInt(-12, 12), randomInt(650, 980)).catch(() => {});
  }
  await humanizer.pause(humanizer.timing.afterNextPauseMinMs, humanizer.timing.afterNextPauseMaxMs);
  return { before, after: page.url(), changed: before !== page.url() };
}

export async function tryLikeCurrentVideo(page, options = {}) {
  if (options.dryRun) return { ok: false, skipped: true, reason: "dry-run" };
  const ok = await clickFirstVisible(page, [
    '[data-e2e="like-icon"]',
    '[data-e2e="like-button"]',
    'button[aria-label*="Like"]'
  ]);
  return ok ? { ok: true } : { ok: false, reason: "Like control not found." };
}

export async function tryFollowCreator(page, options = {}) {
  if (options.dryRun) return { ok: false, skipped: true, reason: "dry-run" };
  if (!options.allowFollow) return { ok: false, skipped: true, reason: "follow disabled" };
  const ok = await clickFirstVisible(page, [
    '[data-e2e="browse-follow"]',
    'button:has-text("Follow")'
  ]);
  return ok ? { ok: true } : { ok: false, reason: "Follow control not found." };
}

export async function tryNotInterestedCurrentVideo(page, options = {}) {
  if (options.dryRun) return { ok: false, skipped: true, reason: "dry-run" };
  const viewport = page.viewportSize() || { width: 1280, height: 900 };
  await page.mouse.click(Math.floor(viewport.width * 0.5), Math.floor(viewport.height * 0.48), {
    button: "right"
  });
  await page.waitForTimeout(700);
  const candidate = page.getByText("Not interested", { exact: false }).first();
  if (await candidate.isVisible().catch(() => false)) {
    await candidate.click({ timeout: 5_000 }).catch(() => {});
    return { ok: true };
  }
  await page.keyboard.press("Escape").catch(() => {});
  return { ok: false, reason: "Not Interested control not available." };
}

export async function refreshTikTokFeed(page, options = {}) {
  const humanizer = options.humanizer || new Humanizer();
  await page.reload({ waitUntil: "commit", timeout: 20_000 }).catch(async () => {
    await page.goto("https://www.tiktok.com/foryou", { waitUntil: "commit", timeout: 20_000 });
  });
  await page.waitForLoadState("domcontentloaded", { timeout: 8_000 }).catch(() => {});
  await humanizer.pause(600, 1_400);
  return {
    ok: true,
    url: page.url()
  };
}
