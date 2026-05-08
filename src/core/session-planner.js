import { DEFAULTS } from "../config/defaults.js";
import { buildRecommendationMap, buildSearchBatches } from "./discovery-engine.js";

function normalizeSearchLimit(options = {}) {
  const requested = Number(options.maxSearches || DEFAULTS.session.maxSearches);
  const safeRequested = Number.isFinite(requested) && requested > 0 ? requested : DEFAULTS.session.maxSearches;
  return Math.min(Math.floor(safeRequested), DEFAULTS.session.hardMaxSearches);
}

export function buildSearchQueue(profile, options = {}) {
  const maxSearches = normalizeSearchLimit(options);
  return buildSearchBatches(profile, {
    ...options,
    maxSearches
  });
}

export function buildSessionPlan(profile, options = {}) {
  const durationMs = Math.min(
    options.durationMs || options.durationSeconds * 1000 || DEFAULTS.session.defaultDurationMs,
    DEFAULTS.session.maxDurationMs
  );
  const maxSearches = normalizeSearchLimit(options);
  const searchQueue = buildSearchQueue(profile, { ...options, maxSearches });
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
      liveSearchLimit: maxSearches,
      hardLiveSearchLimit: DEFAULTS.session.hardMaxSearches
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
