import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { analyzeFypRequest } from "../src/core/profile-analyzer.js";
import { MemoryStore } from "../src/core/memory-store.js";

test("persists profiles and session events as JSON", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "fyp-trainer-"));
  const store = new MemoryStore({
    memoryDir: path.join(root, "memory"),
    sessionsDir: path.join(root, "sessions")
  });
  const profile = analyzeFypRequest("cinematic travel and jazz");

  await store.saveProfile(profile);
  const latest = await store.latestProfile();
  assert.equal(latest.id, profile.id);

  const session = await store.createSession(profile, { dryRun: true });
  await store.appendEvent(session, { type: "search", metric: "searches" });
  const finished = await store.finishSession(session);

  assert.equal(finished.status, "completed");
  assert.equal(finished.metrics.searches, 1);
});

test("persists cache-aware search discovery signals", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "fyp-trainer-"));
  const store = new MemoryStore({
    memoryDir: path.join(root, "memory"),
    sessionsDir: path.join(root, "sessions")
  });

  await store.recordSearchResult("#aitools", {
    videoLinks: 7,
    videoElements: 2,
    relatedHits: 3,
    hashtags: ["#aitools", "#openai"],
    creators: ["@example_creator"]
  });

  const cache = await store.getSearchCache();
  assert.equal(cache.searches["#aitools"].videoLinks, 7);
  assert.equal(cache.searches["#aitools"].attempts, 1);
  assert.equal(cache.discovered.hashtags.aitools.count, 1);
  assert.equal(cache.discovered.creators.example_creator.count, 1);
});
