import { DEFAULTS } from "../config/defaults.js";
import { buildRecommendationMap, buildSearchBatches } from "./discovery-engine.js";

export function normalizeSessionDuration(options = {}) {
  const requested = Number(
    options.durationMs || options.durationSeconds * 1000 || DEFAULTS.session.defaultDurationMs
  );
  const safeRequested = Number.isFinite(requested) && requested > 0 ? requested : DEFAULTS.session.defaultDurationMs;
  return Math.min(
    Math.max(Math.floor(safeRequested), DEFAULTS.session.minDurationMs),
    DEFAULTS.session.maxDurationMs
  );
}

export function resolveSearchLimits(options = {}, durationMs = normalizeSessionDuration(options)) {
  const durationRatio = Math.max(durationMs, 1) / 60_000;
  const defaultLimit = Math.max(1, Math.floor(DEFAULTS.session.maxSearchesPerMinute * durationRatio));
  const hardLimit = Math.max(1, Math.floor(DEFAULTS.session.hardMaxSearchesPerMinute * durationRatio));
  const requested = options.maxSearches === undefined ? defaultLimit : Number(options.maxSearches);
  const safeRequested = Number.isFinite(requested) && requested > 0 ? requested : defaultLimit;

  return {
    liveSearchLimit: Math.min(Math.floor(safeRequested), hardLimit),
    defaultLiveSearchLimit: defaultLimit,
    hardLiveSearchLimit: hardLimit,
    maxSearchesPerMinute: DEFAULTS.session.maxSearchesPerMinute,
    hardMaxSearchesPerMinute: DEFAULTS.session.hardMaxSearchesPerMinute
  };
}

export function buildSearchQueue(profile, options = {}) {
  const durationMs = normalizeSessionDuration(options);
  const { liveSearchLimit } = resolveSearchLimits(options, durationMs);
  return buildSearchBatches(profile, {
    ...options,
    maxSearches: liveSearchLimit
  });
}

export function buildSessionPlan(profile, options = {}) {
  const durationMs = normalizeSessionDuration(options);
  const searchLimits = resolveSearchLimits(options, durationMs);
  const searchQueue = buildSearchBatches(profile, {
    ...options,
    maxSearches: searchLimits.liveSearchLimit
  });
  const recommendationMap = buildRecommendationMap(profile, options.searchCache || {}, {
    maxSearches: Math.min(searchQueue.length || DEFAULTS.session.maxSearches, 8)
  });

  return {
    targetAesthetic: profile.targetAesthetic,
    durationMs,
    searchQueue,
    recommendationMap,
    orchestration: {
      mode: "adaptive-cache-aware",
      cacheAware: Boolean(options.searchCache),
      candidateCount: profile.searchCandidateBank?.length || profile.searchStrategies?.length || 0,
      searchCount: searchQueue.length,
      liveSearchLimit: searchLimits.liveSearchLimit,
      defaultLiveSearchLimit: searchLimits.defaultLiveSearchLimit,
      hardLiveSearchLimit: searchLimits.hardLiveSearchLimit,
      maxSearchesPerMinute: searchLimits.maxSearchesPerMinute,
      hardMaxSearchesPerMinute: searchLimits.hardMaxSearchesPerMinute
    },
    interactionCaps: {
      likes: options.maxLikes ?? profile.interactionPolicy?.maxLikesPerSession ?? DEFAULTS.session.maxLikes,
      follows: options.maxFollows ?? DEFAULTS.session.maxFollows,
      notInterested:
        options.maxNotInterested ??
        profile.interactionPolicy?.maxNotInterestedPerSession ??
        DEFAULTS.session.maxNotInterested
    },
    phases: [
      "login-gate",
      "profile-confirmation",
      "ranked-discovery-batch",
      "adaptive-video-sampling",
      "recommendation-memory-update",
      "feed-refresh",
      "session-summary"
    ]
  };
}
