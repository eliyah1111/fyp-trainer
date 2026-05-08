import fs from "node:fs/promises";
import path from "node:path";
import { DEFAULTS } from "../config/defaults.js";
import { normalizeQuery } from "./discovery-engine.js";

async function readJson(filePath, fallback) {
  try {
    const text = await fs.readFile(filePath, "utf8");
    return JSON.parse(text);
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const body = `${JSON.stringify(value, null, 2)}\n`;
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpPath, body, "utf8");
  try {
    await fs.rename(tmpPath, filePath);
  } catch (error) {
    if (!["EPERM", "EBUSY", "EXDEV"].includes(error.code)) {
      throw error;
    }
    // OneDrive and Windows indexing can briefly block atomic renames. Session
    // logs are append-style state, so a direct write is safer than aborting.
    await fs.writeFile(filePath, body, "utf8");
    await fs.rm(tmpPath, { force: true }).catch(() => {});
  }
}

function createEmptySearchCache() {
  return {
    version: 1,
    updatedAt: null,
    searches: {},
    discovered: {
      hashtags: {},
      creators: {}
    }
  };
}

function normalizeSearchCache(cache) {
  return {
    ...createEmptySearchCache(),
    ...cache,
    searches: cache?.searches || {},
    discovered: {
      hashtags: cache?.discovered?.hashtags || {},
      creators: cache?.discovered?.creators || {}
    }
  };
}

function mergeDiscoveryList(...lists) {
  return [
    ...new Set(
      lists
        .flat()
        .filter(Boolean)
        .map((item) => String(item).trim())
        .filter(Boolean)
    )
  ].slice(0, 40);
}

function mergeDiscoveryMap(existing = {}, values = [], updatedAt) {
  const output = { ...existing };
  for (const value of values || []) {
    const key = normalizeQuery(value).replace(/^#|^@/, "");
    if (!key) continue;
    const previous = output[key] || {};
    output[key] = {
      label: String(value).trim(),
      count: (previous.count || 0) + 1,
      updatedAt
    };
  }
  return output;
}

export class MemoryStore {
  constructor(options = {}) {
    this.memoryDir = options.memoryDir || DEFAULTS.memoryDir;
    this.sessionsDir = options.sessionsDir || DEFAULTS.sessionsDir;
    this.profilesPath = path.join(this.memoryDir, "profiles.json");
    this.settingsPath = path.join(this.memoryDir, "settings.json");
    this.searchCachePath = path.join(this.memoryDir, "search-cache.json");
  }

  async ensure() {
    await fs.mkdir(this.memoryDir, { recursive: true });
    await fs.mkdir(this.sessionsDir, { recursive: true });
    await readJson(this.profilesPath, null).then(async (value) => {
      if (!value) await writeJson(this.profilesPath, { profiles: [] });
    });
    await readJson(this.settingsPath, null).then(async (value) => {
      if (!value) {
        await writeJson(this.settingsPath, {
          createdAt: new Date().toISOString(),
          note: "Local state only. Do not commit private TikTok session state."
        });
      }
    });
    await readJson(this.searchCachePath, null).then(async (value) => {
      if (!value) await writeJson(this.searchCachePath, createEmptySearchCache());
    });
  }

  async saveProfile(profile) {
    await this.ensure();
    const state = await readJson(this.profilesPath, { profiles: [] });
    const profiles = state.profiles.filter((item) => item.id !== profile.id);
    profiles.unshift({ ...profile, updatedAt: new Date().toISOString() });
    await writeJson(this.profilesPath, { profiles });
    return profile;
  }

  async getProfile(id) {
    await this.ensure();
    const state = await readJson(this.profilesPath, { profiles: [] });
    return state.profiles.find((profile) => profile.id === id);
  }

  async latestProfile() {
    await this.ensure();
    const state = await readJson(this.profilesPath, { profiles: [] });
    return state.profiles[0];
  }

  async getSearchCache() {
    await this.ensure();
    const cache = await readJson(this.searchCachePath, createEmptySearchCache());
    return normalizeSearchCache(cache);
  }

  async recordSearchResult(query, summary = {}, metadata = {}) {
    await this.ensure();
    const cache = normalizeSearchCache(await readJson(this.searchCachePath, createEmptySearchCache()));
    const normalized = normalizeQuery(query);
    if (!normalized) return cache;

    const previous = cache.searches[normalized] || {};
    const entry = {
      ...previous,
      query,
      normalizedQuery: normalized,
      updatedAt: new Date().toISOString(),
      attempts: (previous.attempts || 0) + 1,
      videoLinks: Number(summary.videoLinks || 0),
      videoElements: Number(summary.videoElements || 0),
      relatedHits: Number(summary.relatedHits || 0),
      hashtags: mergeDiscoveryList(previous.hashtags, summary.hashtags),
      creators: mergeDiscoveryList(previous.creators, summary.creators),
      source: metadata.source || previous.source || "session"
    };

    cache.searches[normalized] = entry;
    cache.updatedAt = entry.updatedAt;
    cache.discovered.hashtags = mergeDiscoveryMap(cache.discovered.hashtags, entry.hashtags, entry.updatedAt);
    cache.discovered.creators = mergeDiscoveryMap(cache.discovered.creators, entry.creators, entry.updatedAt);

    await writeJson(this.searchCachePath, cache);
    return cache;
  }

  async createSession(profile, options = {}) {
    await this.ensure();
    const startedAt = new Date().toISOString();
    const id = `session-${startedAt.replace(/[:.]/g, "-")}`;
    const filePath = path.join(this.sessionsDir, `${id}.json`);
    const session = {
      id,
      startedAt,
      status: "running",
      profileId: profile.id,
      profileTarget: profile.targetAesthetic,
      options,
      metrics: {
        searches: 0,
        videosOpened: 0,
        videosWatched: 0,
        skips: 0,
        likes: 0,
        follows: 0,
        notInterested: 0
      },
      events: []
    };
    await writeJson(filePath, session);
    return { id, filePath, session };
  }

  async appendEvent(sessionRef, event) {
    const session = await readJson(sessionRef.filePath, sessionRef.session);
    session.events.push({
      at: new Date().toISOString(),
      ...event
    });
    if (event.metric && Object.hasOwn(session.metrics, event.metric)) {
      session.metrics[event.metric] += event.increment || 1;
    }
    await writeJson(sessionRef.filePath, session);
    sessionRef.session = session;
    return session;
  }

  async finishSession(sessionRef, status = "completed", extra = {}) {
    const session = await readJson(sessionRef.filePath, sessionRef.session);
    session.status = status;
    session.finishedAt = new Date().toISOString();
    Object.assign(session, extra);
    await writeJson(sessionRef.filePath, session);
    sessionRef.session = session;
    return session;
  }
}
