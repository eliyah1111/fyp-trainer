import { DEFAULTS } from "../config/defaults.js";
import { buildSessionPlan, normalizeSessionDuration } from "./session-planner.js";
import { summarizeSearchSignals } from "./discovery-engine.js";
import { launchTikTokBrowser, openTikTok } from "./browser.js";
import { detectLoginState, summarizeLoginState } from "./tiktok-detector.js";
import { Humanizer } from "./humanizer.js";
import { MemoryStore } from "./memory-store.js";
import {
  auditForYouFeed,
  goToNextVideo,
  openFeedFallback,
  openRandomVideoFromPage,
  refreshTikTokFeed,
  searchTikTok,
  tryFollowCreator,
  tryLikeCurrentVideo,
  tryNotInterestedCurrentVideo,
  watchCurrentVideo
} from "./tiktok-actions.js";
import { chance, randomInt } from "../utils/random.js";

function sessionTiming(options) {
  if (options.careful) return DEFAULTS.carefulTiming;
  return DEFAULTS.timing;
}

function shouldLike(score, metrics, caps, lastInteractionAt) {
  return (
    score > 0.35 &&
    metrics.likes < caps.likes &&
    Date.now() - lastInteractionAt > DEFAULTS.session.minimumInteractionGapMs &&
    chance(0.42)
  );
}

function shouldNotInterested(score, metrics, caps, lastInteractionAt) {
  return (
    score <= 0.02 &&
    metrics.notInterested < caps.notInterested &&
    Date.now() - lastInteractionAt > DEFAULTS.session.minimumInteractionGapMs &&
    chance(0.55)
  );
}

export async function ensureLoggedIn(page, options = {}) {
  await openTikTok(page);
  let loginState = await detectLoginState(page);
  options.log?.(summarizeLoginState(loginState));

  if (!loginState.loggedIn && options.waitForLogin) {
    await options.waitForLogin(loginState);
    loginState = await detectLoginState(page);
    options.log?.(summarizeLoginState(loginState));
  }

  return loginState;
}

export async function runTrainingSession(profile, options = {}) {
  if (!profile) throw new Error("A training profile is required.");
  if (!options.confirmed && !options.dryRun) {
    throw new Error("Live training requires explicit confirmation. Pass --confirmed or use interactive run.");
  }

  const durationMs = normalizeSessionDuration(options);
  const memory = options.memoryStore || new MemoryStore(options);
  const searchCache = await memory.getSearchCache();
  const plan = buildSessionPlan(profile, { ...options, durationMs, searchCache });
  const humanizer = new Humanizer({
    enabled: options.humanize !== false,
    timing: sessionTiming(options)
  });
  const browser = options.browserSession || (await launchTikTokBrowser(options));
  const ownsBrowser = !options.browserSession;
  const log = options.log || (() => {});

  let sessionRef;
  try {
    const loginState = options.skipLoginCheck
      ? { loggedIn: true, confidence: "prechecked", signals: { url: browser.page.url() } }
      : await ensureLoggedIn(browser.page, {
          waitForLogin: options.waitForLogin,
          log
        });

    if (!loginState.loggedIn) {
      return {
        status: "login_required",
        message: "Manual TikTok login is required before training.",
        loginState
      };
    }

    await memory.saveProfile(profile);
    sessionRef = await memory.createSession(profile, {
      dryRun: Boolean(options.dryRun),
      durationMs,
      caps: plan.interactionCaps
    });

    await memory.appendEvent(sessionRef, {
      type: "session-start",
      message: "Training session started.",
      plan
    });

    let lastInteractionAt = 0;
    let sparseSearchPages = 0;
    const endAt = Date.now() + durationMs;

    for (const search of plan.searchQueue) {
      if (Date.now() >= endAt) break;
      log(`Searching: ${search.query}${search.score ? ` | discovery score ${search.score}` : ""}`);
      const searchResult = await searchTikTok(browser.page, search.query, { humanizer });
      const searchSummary = summarizeSearchSignals(searchResult.signals, profile);
      await memory.recordSearchResult(search.query, searchSummary, {
        source: search.source || search.type || "session"
      });
      await memory.appendEvent(sessionRef, {
        type: "search",
        metric: "searches",
        search,
        result: {
          ok: searchResult.ok,
          method: searchResult.method,
          query: searchResult.query,
          summary: searchSummary
        }
      });

      if (searchSummary.hashtags.length || searchSummary.creators.length) {
        await memory.appendEvent(sessionRef, {
          type: "discovery",
          search: search.query,
          hashtags: searchSummary.hashtags.slice(0, 12),
          creators: searchSummary.creators.slice(0, 8),
          relatedHits: searchSummary.relatedHits
        });
      }

      if (searchSummary.videoLinks === 0) sparseSearchPages += 1;
      else sparseSearchPages = 0;

      const videosForSearch = randomInt(
        options.videosPerSearchMin ?? DEFAULTS.session.videosPerSearchMin,
        options.videosPerSearchMax ?? DEFAULTS.session.videosPerSearchMax
      );

      for (let index = 0; index < videosForSearch; index += 1) {
        if (Date.now() >= endAt) break;
        let openResult = await openRandomVideoFromPage(browser.page, {
          humanizer,
          preferredLinks: searchResult.signals?.videoLinks?.length ? searchResult.signals.videoLinks : undefined
        });
        if (!openResult.ok) {
          const sparseNote =
            sparseSearchPages >= 2
              ? "Search pages are sparse; sampling the For You feed before the next discovery query"
              : `No search video found for ${search.query}; using For You fallback`;
          log(sparseNote);
          openResult = await openFeedFallback(browser.page, { humanizer });
        }
        await memory.appendEvent(sessionRef, {
          type: "open-video",
          metric: openResult.ok ? "videosOpened" : undefined,
          result: openResult
        });
        if (!openResult.ok) break;

        const watchResult = await watchCurrentVideo(browser.page, profile, { humanizer });
        log(
          `Watched ${Math.round(watchResult.watchMs / 100) / 10}s | score ${watchResult.score.toFixed(2)}`
        );
        const skip = watchResult.score < -0.25;
        await memory.appendEvent(sessionRef, {
          type: "watch",
          metric: skip ? "skips" : "videosWatched",
          video: {
            url: watchResult.url,
            title: watchResult.title,
            score: watchResult.score,
            watchMs: watchResult.watchMs
          }
        });

        if (shouldLike(watchResult.score, sessionRef.session.metrics, plan.interactionCaps, lastInteractionAt)) {
          const likeResult = await tryLikeCurrentVideo(browser.page, { dryRun: options.dryRun });
          if (likeResult.ok) {
            log("Liked a matching video");
            lastInteractionAt = Date.now();
            await memory.appendEvent(sessionRef, {
              type: "like",
              metric: "likes",
              result: likeResult
            });
          }
        }

        if (
          shouldNotInterested(
            watchResult.score,
            sessionRef.session.metrics,
            plan.interactionCaps,
            lastInteractionAt
          )
        ) {
          const notInterestedResult = await tryNotInterestedCurrentVideo(browser.page, {
            dryRun: options.dryRun
          });
          if (notInterestedResult.ok) {
            log("Marked unrelated video as Not Interested");
            lastInteractionAt = Date.now();
            await memory.appendEvent(sessionRef, {
              type: "not-interested",
              metric: "notInterested",
              result: notInterestedResult
            });
          }
        }

        if (
          options.allowFollow &&
          watchResult.score > 0.62 &&
          sessionRef.session.metrics.follows < plan.interactionCaps.follows &&
          Date.now() - lastInteractionAt > DEFAULTS.session.minimumInteractionGapMs &&
          chance(0.14)
        ) {
          const followResult = await tryFollowCreator(browser.page, {
            dryRun: options.dryRun,
            allowFollow: true
          });
          if (followResult.ok) {
            lastInteractionAt = Date.now();
            await memory.appendEvent(sessionRef, {
              type: "follow",
              metric: "follows",
              result: followResult
            });
          }
        }

        await goToNextVideo(browser.page, { humanizer });
      }
    }

    const refreshResult = await refreshTikTokFeed(browser.page, { humanizer });
    await memory.appendEvent(sessionRef, {
      type: "refresh",
      result: refreshResult
    });
    log("Refreshed TikTok feed at session end");

    const feedAudit = await auditForYouFeed(browser.page, profile, {
      humanizer,
      samples: options.feedAuditSamples ?? DEFAULTS.session.feedAuditSamples
    });
    await memory.appendEvent(sessionRef, {
      type: "feed-audit",
      result: feedAudit
    });
    const auditPercent = Math.round(feedAudit.relevanceRate * 100);
    log(
      `Post-refresh feed audit: ${feedAudit.related}/${feedAudit.samples} related (${auditPercent}%) | ${feedAudit.status}`
    );

    const finished = await memory.finishSession(sessionRef, "completed", {
      summary:
        feedAudit.status === "validated"
          ? "Training session completed and post-refresh feed audit found matching signals."
          : "Training session completed, but the post-refresh feed is still warming up.",
      outcome: {
        feedAudit
      }
    });
    return {
      status: "completed",
      sessionFile: sessionRef.filePath,
      metrics: finished.metrics,
      outcome: finished.outcome
    };
  } catch (error) {
    if (sessionRef) {
      await memory.finishSession(sessionRef, "failed", {
        error: error.message
      });
    }
    throw error;
  } finally {
    if (ownsBrowser && options.keepBrowserOpen !== true) {
      await browser.close();
    }
  }
}
