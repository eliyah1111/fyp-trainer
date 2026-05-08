import crypto from "node:crypto";
import { cleanToken, slugify, titleCase, tokenize, truncate } from "../utils/text.js";
import { unique } from "../utils/random.js";

const CATALOG = [
  {
    name: "dark academia",
    aliases: ["dark academia", "academia", "library", "oxford"],
    hashtags: ["darkacademia", "academia", "booktok", "classicbooks", "vintagefashion"],
    categories: ["literary fashion", "classic books", "campus architecture", "moody study edits"],
    sounds: ["classical piano", "rainy study ambience", "soft orchestral edits"]
  },
  {
    name: "clean girl minimalism",
    aliases: ["clean girl", "minimalist", "minimalism", "quiet luxury"],
    hashtags: ["cleangirl", "minimalstyle", "quietluxury", "capsulewardrobe", "skincareroutine"],
    categories: ["minimal outfits", "capsule wardrobes", "soft lifestyle routines", "natural beauty"],
    sounds: ["soft rnb", "ambient pop", "low tempo house"]
  },
  {
    name: "archive fashion",
    aliases: ["archive", "archival", "runway", "avant garde", "avant-garde", "rick owens"],
    hashtags: ["archivefashion", "runwayarchive", "avantgardefashion", "fashionhistory", "designerarchive"],
    categories: ["runway references", "designer archive pulls", "editorial styling", "fashion criticism"],
    sounds: ["industrial ambient", "runway house", "experimental electronic"]
  },
  {
    name: "streetwear",
    aliases: ["streetwear", "sneakers", "gorpcore", "blokecore", "techwear"],
    hashtags: ["streetwear", "sneakertok", "gorpcore", "blokecore", "techwear"],
    categories: ["fit checks", "sneaker rotations", "outerwear styling", "street style"],
    sounds: ["uk garage", "drill edits", "phonk", "underground rap"]
  },
  {
    name: "coquette romantic",
    aliases: ["coquette", "balletcore", "dollette", "romantic"],
    hashtags: ["coquette", "balletcore", "romanticizeyourlife", "softaesthetic", "dollette"],
    categories: ["romantic outfits", "soft room decor", "ballet-inspired styling", "delicate makeup"],
    sounds: ["dream pop", "soft piano", "lana del rey edits"]
  },
  {
    name: "indie sleaze",
    aliases: ["indie sleaze", "electroclash", "2000s party", "grunge"],
    hashtags: ["indiesleaze", "electroclash", "grungefashion", "2000saesthetic", "flashphotography"],
    categories: ["flash photo edits", "messy nightlife styling", "vintage digital camera clips", "band tees"],
    sounds: ["electroclash", "garage rock", "bloghouse"]
  },
  {
    name: "y2k futurism",
    aliases: ["y2k", "mcbling", "cyber y2k", "futuristic"],
    hashtags: ["y2k", "cybery2k", "mcbling", "futuristicfashion", "retrofuturism"],
    categories: ["metallic styling", "retro tech visuals", "glossy edits", "2000s fashion"],
    sounds: ["hyperpop", "eurodance", "glitch pop"]
  },
  {
    name: "cinematic editing",
    aliases: ["cinematic", "film look", "movie edits", "35mm", "analog"],
    hashtags: ["cinematic", "filmtok", "35mm", "colorgrading", "visualdiary"],
    categories: ["visual diaries", "film photography", "color grading breakdowns", "slow montage edits"],
    sounds: ["ambient score", "shoegaze", "cinematic synth"]
  },
  {
    name: "music discovery",
    aliases: ["music", "spotify", "playlist", "concert", "dj"],
    hashtags: ["musictok", "musicdiscovery", "playlist", "concerttok", "djtok"],
    categories: ["playlist curation", "live sets", "album recommendations", "music commentary"],
    sounds: ["new releases", "dj edits", "live session audio"]
  },
  {
    name: "creative technology",
    aliases: [
      "tech",
      "ai",
      "coding",
      "automation",
      "robotics",
      "design tools",
      "claude code",
      "codex",
      "gemini",
      "ai news",
      "ai tools"
    ],
    hashtags: [
      "techtok",
      "aitools",
      "ainews",
      "openai",
      "claudecode",
      "codex",
      "gemini",
      "coding",
      "automation",
      "creativecoding"
    ],
    categories: [
      "AI news",
      "new AI tools",
      "Claude Code workflows",
      "OpenAI Codex demos",
      "Google Gemini updates",
      "AI workflows",
      "automation demos",
      "creative AI builds",
      "creative coding",
      "interface design"
    ],
    sounds: ["minimal electronic", "synthwave", "productivity ambience"]
  },
  {
    name: "wellness training",
    aliases: ["fitness", "wellness", "pilates", "gym", "running"],
    hashtags: ["fitnesstok", "pilates", "runningtok", "wellnesstok", "mobility"],
    categories: ["training routines", "mobility work", "meal prep", "quiet wellness habits"],
    sounds: ["workout edits", "deep house", "motivational audio"]
  }
];

const DEFAULT_UNWANTED = [
  "rage bait",
  "generic prank content",
  "celebrity drama",
  "reposted clips",
  "low effort shopping spam",
  "political outrage loops"
];

const SOUND_HINTS = new Map([
  ["jazz", ["jazz edits", "neo soul", "vinyl jazz"]],
  ["house", ["deep house", "uk garage", "minimal house"]],
  ["techno", ["ambient techno", "industrial techno"]],
  ["rap", ["underground rap", "sample-heavy hip hop"]],
  ["rnb", ["soft rnb", "alt rnb"]],
  ["indie", ["indie rock", "dream pop", "shoegaze"]],
  ["kpop", ["k-pop edits", "idol fancams"]],
  ["classical", ["classical piano", "orchestral edits"]],
  ["hyperpop", ["hyperpop", "glitch pop"]]
]);

function findMatches(input) {
  const lower = input.toLowerCase();
  return CATALOG.filter((entry) =>
    entry.aliases.some((alias) => {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i").test(lower);
    })
  );
}

function extractHashtags(input) {
  return unique([...input.matchAll(/#([a-zA-Z0-9_]+)/g)].map((match) => cleanToken(match[1])));
}

function extractCreators(input) {
  return unique([...input.matchAll(/@([a-zA-Z0-9_.]{2,32})/g)].map((match) => `@${match[1]}`));
}

function extractAvoids(input) {
  const avoids = [];
  const regex = /\b(?:avoid|no|without|less of|not into|hide|remove)\s+([^.;\n]+)/gi;
  for (const match of input.matchAll(regex)) {
    const phrase = match[1]
      .split(/,| and | but /i)
      .map((part) => part.trim())
      .filter(Boolean);
    avoids.push(...phrase);
  }
  return unique(avoids.map((item) => truncate(item, 48)));
}

function inferSounds(input, matches) {
  const lower = input.toLowerCase();
  const hinted = [];
  for (const [needle, sounds] of SOUND_HINTS.entries()) {
    if (lower.includes(needle)) hinted.push(...sounds);
  }
  return unique([...hinted, ...matches.flatMap((entry) => entry.sounds)]).slice(0, 10);
}

function inferFallbackKeywords(input) {
  return unique(tokenize(input))
    .filter(
      (token) =>
        ![
          "aesthetic",
          "about",
          "fashion",
          "music",
          "creators",
          "editing",
          "style",
          "interests",
          "more"
        ].includes(token)
    )
    .slice(0, 10);
}

function buildSearchStrategies({ hashtags, creators, sounds, categories, fallbackKeywords }) {
  const strategies = [];

  for (const hashtag of hashtags.slice(0, 8)) {
    strategies.push({
      type: "hashtag",
      query: `#${hashtag}`,
      reason: "Seed the feed with explicit aesthetic tags.",
      priority: strategies.length + 1
    });
  }

  for (const creator of creators.slice(0, 6)) {
    strategies.push({
      type: "creator",
      query: creator,
      reason: "Anchor the profile around named creators.",
      priority: strategies.length + 1
    });
  }

  for (const category of categories.slice(0, 8)) {
    strategies.push({
      type: "category",
      query: category,
      reason: "Broaden discovery without drifting away from the profile.",
      priority: strategies.length + 1
    });
  }

  for (const sound of sounds.slice(0, 6)) {
    strategies.push({
      type: "sound",
      query: sound,
      reason: "Bias toward matching audio and editing language.",
      priority: strategies.length + 1
    });
  }

  for (const keyword of fallbackKeywords.slice(0, 4)) {
    strategies.push({
      type: "keyword",
      query: keyword,
      reason: "Preserve a user-provided signal not covered by the catalog.",
      priority: strategies.length + 1
    });
  }

  return strategies.slice(0, 24);
}

function buildSearchCandidateBank({ hashtags, creators, sounds, categories, fallbackKeywords }) {
  const baseTerms = unique([
    ...hashtags.map((tag) => `#${tag}`),
    ...creators,
    ...categories,
    ...sounds,
    ...fallbackKeywords
  ]);
  const modifiers = [
    "",
    "aesthetic",
    "edit",
    "tok",
    "outfit",
    "inspo",
    "playlist",
    "routine",
    "creator",
    "vlog",
    "style",
    "2026",
    "underground",
    "archive",
    "cinematic",
    "tutorial",
    "visual diary",
    "trend",
    "sound",
    "recommendations"
  ];
  const candidates = [];

  for (const term of baseTerms) {
    candidates.push(term);
    const normalized = String(term).replace(/^#/, "");
    for (const modifier of modifiers) {
      if (!modifier) continue;
      candidates.push(`${normalized} ${modifier}`);
      if (!term.startsWith("#") && modifier.length < 10) {
        candidates.push(`#${normalized.replace(/\s+/g, "")}${modifier.replace(/\s+/g, "")}`);
      }
      if (candidates.length >= 120) break;
    }
    if (candidates.length >= 120) break;
  }

  return unique(candidates).slice(0, 120);
}

export function analyzeFypRequest(input, options = {}) {
  if (!String(input || "").trim()) {
    throw new Error("A FYP training request is required.");
  }

  const rawRequest = String(input).trim();
  const matches = findMatches(rawRequest);
  const fallbackKeywords = inferFallbackKeywords(rawRequest);
  const explicitHashtags = extractHashtags(rawRequest);
  const creators = extractCreators(rawRequest);
  const hashtags = unique([
    ...explicitHashtags,
    ...matches.flatMap((entry) => entry.hashtags),
    ...fallbackKeywords.slice(0, 5)
  ]).slice(0, 16);
  const categories = unique([
    ...matches.flatMap((entry) => entry.categories),
    ...fallbackKeywords.map((keyword) => `${keyword} aesthetic`).slice(0, 5)
  ]).slice(0, 14);
  const sounds = inferSounds(rawRequest, matches);
  const unwanted = unique([...extractAvoids(rawRequest), ...DEFAULT_UNWANTED]).slice(0, 12);
  const aestheticNames = matches.map((entry) => entry.name);
  const targetAesthetic = aestheticNames.length
    ? titleCase(aestheticNames.join(" + "))
    : `Custom: ${titleCase(fallbackKeywords.slice(0, 4).join(" ") || "Taste Profile")}`;

  const profile = {
    id: options.id || `${slugify(targetAesthetic)}-${crypto.randomUUID().slice(0, 8)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    rawRequest,
    targetAesthetic,
    confidence: matches.length ? "medium-high" : "medium",
    hashtags,
    creators,
    contentCategories: categories,
    sounds,
    searchStrategies: buildSearchStrategies({
      hashtags,
      creators,
      sounds,
      categories,
      fallbackKeywords
    }),
    searchCandidateBank: buildSearchCandidateBank({
      hashtags,
      creators,
      sounds,
      categories,
      fallbackKeywords
    }),
    unwantedContentCategories: unwanted,
    browsingBehaviorStrategy: [
      "Run a compact burst of high-signal searches, then return to the For You feed.",
      "Watch matching videos briefly but longer than neutral videos.",
      "Skip unrelated videos quickly but not instantly.",
      "Use very small engagement caps; likes are a preference signal, not a volume tactic.",
      "Use Not Interested only for clearly unrelated categories, and never repeatedly in a burst.",
      "Rotate between hashtags, creators, categories, and sounds to avoid a narrow loop."
    ],
    interactionPolicy: {
      maxDurationMinutes: 1,
      maxLikesPerSession: 2,
      maxFollowsPerSession: 0,
      maxNotInterestedPerSession: 3,
      followRequiresExplicitFlag: true,
      dryRunSupported: true
    }
  };

  return profile;
}

export function mergeProfileChange(profile, changeText) {
  const mergedInput = `${profile.rawRequest}\nUpdate request: ${changeText}`;
  return {
    ...analyzeFypRequest(mergedInput, { id: profile.id }),
    createdAt: profile.createdAt,
    updatedAt: new Date().toISOString()
  };
}

export function formatProfileSummary(profile) {
  const lines = [
    `Target aesthetic: ${profile.targetAesthetic}`,
    `Hashtags: ${profile.hashtags.map((tag) => `#${tag}`).join(", ") || "none"}`,
    `Creators: ${profile.creators.join(", ") || "none specified"}`,
    `Content categories: ${profile.contentCategories.join(", ") || "none"}`,
    `Sounds/music: ${profile.sounds.join(", ") || "none inferred"}`,
    `Unwanted categories: ${profile.unwantedContentCategories.join(", ")}`,
    `Search bank: ${profile.searchCandidateBank?.length || 0} local candidate searches generated`,
    `First searches: ${(profile.searchCandidateBank || []).slice(0, 18).join(", ")}`,
    "Browsing strategy:",
    ...profile.browsingBehaviorStrategy.map((item) => `- ${item}`)
  ];

  return lines.join("\n");
}
