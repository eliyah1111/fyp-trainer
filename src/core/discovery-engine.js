import { unique } from "../utils/random.js";

const EMPTY_SEARCH_TTL_MS = 6 * 60 * 60 * 1000;
const GOOD_SEARCH_TTL_MS = 24 * 60 * 60 * 1000;

export function normalizeQuery(query) {
  return String(query || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function isFreshCacheEntry(entry, now = Date.now()) {
  if (!entry?.updatedAt) return false;
  const age = now - Date.parse(entry.updatedAt);
  const ttl = entry.videoLinks > 0 ? GOOD_SEARCH_TTL_MS : EMPTY_SEARCH_TTL_MS;
  return age >= 0 && age <= ttl;
}

export function extractTermsFromProfile(profile) {
  return unique([
    ...profile.hashtags.map((tag) => `#${tag}`),
    ...profile.creators,
    ...profile.contentCategories,
    ...profile.sounds,
    ...(profile.searchCandidateBank || [])
  ]);
}

export function scoreSearchCandidate(candidate, profile, cacheState = {}) {
  const normalized = normalizeQuery(candidate.query || candidate);
  const cached = cacheState.searches?.[normalized];
  let score = 1;

  if (candidate.type === "hashtag") score += 4;
  if (candidate.type === "creator") score += 4;
  if (candidate.type === "category") score += 3;
  if (candidate.type === "sound") score += 2;
  if (candidate.priority) score += Math.max(0, 12 - candidate.priority) / 3;

  const text = normalized.replace(/^#|^@/, "");
  if (profile.hashtags.some((tag) => text.includes(tag))) score += 3;
  if (profile.creators.some((creator) => normalized.includes(creator.toLowerCase()))) score += 3;
  if (profile.contentCategories.some((category) => normalized.includes(category.toLowerCase()))) score += 2;
  if (profile.sounds.some((sound) => normalized.includes(sound.toLowerCase()))) score += 1.5;
  if (profile.unwantedContentCategories.some((item) => normalized.includes(item.toLowerCase()))) score -= 5;

  if (isFreshCacheEntry(cached)) {
    if (cached.videoLinks > 0) score += Math.min(cached.videoLinks, 8);
    if (cached.videoLinks === 0) score -= 10;
    if (cached.relatedHits > 0) score += Math.min(cached.relatedHits, 5);
  }

  return score;
}

export function buildDiscoveryCandidates(profile, cacheState = {}) {
  const candidates = [];
  for (const strategy of profile.searchStrategies || []) {
    candidates.push({ ...strategy, source: "strategy" });
  }
  for (const query of profile.searchCandidateBank || []) {
    candidates.push({
      type: query.startsWith("#") ? "hashtag" : query.startsWith("@") ? "creator" : "expanded",
      query,
      reason: "Expanded local candidate",
      source: "candidate-bank"
    });
  }

  return unique(candidates.map((item) => normalizeQuery(item.query))).map((normalized) => {
    const source = candidates.find((item) => normalizeQuery(item.query) === normalized);
    return {
      ...source,
      query: source.query,
      normalizedQuery: normalized,
      score: scoreSearchCandidate(source, profile, cacheState)
    };
  });
}

export function buildSearchBatches(profile, options = {}) {
  const maxSearches = options.maxSearches || 14;
  const cacheState = options.searchCache || {};
  const ranked = buildDiscoveryCandidates(profile, cacheState)
    .filter((candidate) => candidate.score > -2)
    .sort((a, b) => b.score - a.score);

  const mustTry = ranked.filter((candidate) => !isFreshCacheEntry(cacheState.searches?.[candidate.normalizedQuery]));
  const usefulCached = ranked.filter((candidate) => isFreshCacheEntry(cacheState.searches?.[candidate.normalizedQuery]));
  const queue = [...mustTry, ...usefulCached].slice(0, maxSearches);

  return queue.map((candidate, index) => ({
    index: index + 1,
    query: candidate.query,
    normalizedQuery: candidate.normalizedQuery,
    type: candidate.type || "keyword",
    score: Number(candidate.score.toFixed(2)),
    source: candidate.source,
    reason: candidate.reason || "Profile-aligned discovery"
  }));
}

export function buildRecommendationMap(profile, cacheState = {}, options = {}) {
  const limit = options.limit || 8;
  const discoveredHashtags = Object.values(cacheState.discovered?.hashtags || {})
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .map((item) => item.label)
    .filter(Boolean)
    .slice(0, limit);
  const discoveredCreators = Object.values(cacheState.discovered?.creators || {})
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .map((item) => item.label)
    .filter(Boolean)
    .slice(0, limit);

  return {
    targetAesthetic: profile.targetAesthetic,
    seedHashtags: profile.hashtags.slice(0, limit).map((tag) => `#${tag}`),
    seedCreators: profile.creators.slice(0, limit),
    categoryAnchors: profile.contentCategories.slice(0, limit),
    soundAnchors: profile.sounds.slice(0, limit),
    discoveredHashtags,
    discoveredCreators,
    nextBestSearches: buildSearchBatches(profile, {
      searchCache: cacheState,
      maxSearches: Math.min(limit, options.maxSearches || limit)
    }).map(({ query, score, type }) => ({ query, score, type }))
  };
}

export function summarizeSearchSignals(signals = {}, profile) {
  const videoLinks = Array.isArray(signals.videoLinks)
    ? signals.videoLinks.length
    : Number(signals.videoLinks || 0);
  const visible = [
    ...(signals.hashtags || []),
    ...(signals.creators || []),
    signals.sampleText || "",
    signals.title || "",
    signals.url || ""
  ]
    .join(" ")
    .toLowerCase();

  const relatedHits = extractTermsFromProfile(profile)
    .map((term) => String(term).replace(/^#|^@/, "").toLowerCase())
    .filter((term) => term && visible.includes(term)).length;

  return {
    videoLinks,
    videoElements: Number(signals.videoElements || 0),
    hashtags: signals.hashtags || [],
    creators: signals.creators || [],
    relatedHits
  };
}
