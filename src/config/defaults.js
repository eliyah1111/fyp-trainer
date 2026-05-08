import path from "node:path";
import { fileURLToPath } from "node:url";

export const PROJECT_ROOT = path.resolve(
  fileURLToPath(new URL("../..", import.meta.url))
);

export const DEFAULTS = Object.freeze({
  tiktokUrl: "https://www.tiktok.com/",
  memoryDir: path.join(PROJECT_ROOT, "memory"),
  sessionsDir: path.join(PROJECT_ROOT, "sessions"),
  browserProfileDir: path.join(PROJECT_ROOT, "memory", "browser-profile"),
  viewport: { width: 1280, height: 900 },
  session: {
    defaultDurationMs: 60_000,
    maxDurationMs: 60_000,
    maxSearches: 24,
    hardMaxSearches: 30,
    videosPerSearchMin: 1,
    videosPerSearchMax: 1,
    maxLikes: 2,
    maxFollows: 0,
    maxNotInterested: 4,
    minimumInteractionGapMs: 8_000
  },
  timing: {
    pagePauseMinMs: 90,
    pagePauseMaxMs: 280,
    searchTypingDelayMinMs: 1,
    searchTypingDelayMaxMs: 6,
    interestedWatchMinMs: 900,
    interestedWatchMaxMs: 2_200,
    neutralWatchMinMs: 420,
    neutralWatchMaxMs: 1_100,
    skipWatchMinMs: 120,
    skipWatchMaxMs: 360,
    watchPulseMinMs: 90,
    watchPulseMaxMs: 260,
    afterSearchPauseMinMs: 120,
    afterSearchPauseMaxMs: 340,
    afterOpenVideoPauseMinMs: 80,
    afterOpenVideoPauseMaxMs: 240,
    beforeNextPauseMinMs: 50,
    beforeNextPauseMaxMs: 160,
    afterNextPauseMinMs: 70,
    afterNextPauseMaxMs: 220
  },
  carefulTiming: {
    pagePauseMinMs: 900,
    pagePauseMaxMs: 2_400,
    searchTypingDelayMinMs: 35,
    searchTypingDelayMaxMs: 105,
    interestedWatchMinMs: 11_000,
    interestedWatchMaxMs: 24_000,
    neutralWatchMinMs: 6_000,
    neutralWatchMaxMs: 13_000,
    skipWatchMinMs: 2_500,
    skipWatchMaxMs: 5_500,
    watchPulseMinMs: 800,
    watchPulseMaxMs: 2_400,
    afterSearchPauseMinMs: 1_200,
    afterSearchPauseMaxMs: 2_800,
    afterOpenVideoPauseMinMs: 700,
    afterOpenVideoPauseMaxMs: 1_800,
    beforeNextPauseMinMs: 350,
    beforeNextPauseMaxMs: 900,
    afterNextPauseMinMs: 1_000,
    afterNextPauseMaxMs: 2_000
  }
});
