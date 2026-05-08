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
    maxSearches: 14,
    videosPerSearchMin: 1,
    videosPerSearchMax: 1,
    maxLikes: 2,
    maxFollows: 0,
    maxNotInterested: 3,
    minimumInteractionGapMs: 12_000
  },
  timing: {
    pagePauseMinMs: 220,
    pagePauseMaxMs: 700,
    searchTypingDelayMinMs: 4,
    searchTypingDelayMaxMs: 18,
    interestedWatchMinMs: 1_800,
    interestedWatchMaxMs: 4_200,
    neutralWatchMinMs: 900,
    neutralWatchMaxMs: 2_200,
    skipWatchMinMs: 280,
    skipWatchMaxMs: 800,
    watchPulseMinMs: 220,
    watchPulseMaxMs: 650,
    afterSearchPauseMinMs: 350,
    afterSearchPauseMaxMs: 900,
    afterOpenVideoPauseMinMs: 180,
    afterOpenVideoPauseMaxMs: 550,
    beforeNextPauseMinMs: 120,
    beforeNextPauseMaxMs: 350,
    afterNextPauseMinMs: 180,
    afterNextPauseMaxMs: 550
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
