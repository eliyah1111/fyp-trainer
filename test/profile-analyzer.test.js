import test from "node:test";
import assert from "node:assert/strict";
import { analyzeFypRequest, mergeProfileChange } from "../src/core/profile-analyzer.js";

test("analyzes explicit aesthetics, creators, hashtags, and avoid terms", () => {
  const profile = analyzeFypRequest(
    "I want archive fashion, cinematic edits, @somecreator, #runway, house music, avoid prank content and celebrity gossip"
  );

  assert.match(profile.targetAesthetic, /Archive Fashion/i);
  assert.ok(profile.hashtags.includes("runway"));
  assert.ok(profile.creators.includes("@somecreator"));
  assert.ok(profile.sounds.some((sound) => sound.includes("house")));
  assert.ok(profile.unwantedContentCategories.some((item) => /prank/i.test(item)));
  assert.ok(profile.searchStrategies.length > 5);
  assert.ok(profile.searchCandidateBank.length >= 100);
});

test("merges change requests while preserving the profile id", () => {
  const profile = analyzeFypRequest("clean girl minimalism with jazz");
  const updated = mergeProfileChange(profile, "add streetwear and avoid politics");

  assert.equal(updated.id, profile.id);
  assert.ok(Date.parse(updated.updatedAt) >= Date.parse(profile.updatedAt));
  assert.ok(updated.hashtags.includes("streetwear"));
  assert.ok(updated.unwantedContentCategories.some((item) => /politics/i.test(item)));
});

test("builds specific AI tech searches for model/tool requests", () => {
  const profile = analyzeFypRequest("ai tech, ai news, new ai tools, claude code, codex, gemini");

  assert.ok(profile.hashtags.includes("ainews"));
  assert.ok(profile.hashtags.includes("claudecode"));
  assert.ok(profile.hashtags.includes("codex"));
  assert.ok(profile.hashtags.includes("gemini"));
  assert.ok(profile.contentCategories.some((item) => /Claude Code/i.test(item)));
});
