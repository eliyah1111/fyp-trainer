import test from "node:test";
import assert from "node:assert/strict";
import { analyzeFypRequest } from "../src/core/profile-analyzer.js";
import {
  buildRecommendationMap,
  buildSearchBatches,
  normalizeQuery,
  summarizeSearchSignals
} from "../src/core/discovery-engine.js";

test("normalizes repeated whitespace and casing in search queries", () => {
  assert.equal(normalizeQuery("  AI   Tools  "), "ai tools");
});

test("ranks fresh empty searches below better discovery candidates", () => {
  const profile = analyzeFypRequest("ai tech, ai news, claude code, codex, gemini");
  const queue = buildSearchBatches(profile, {
    maxSearches: 5,
    searchCache: {
      searches: {
        "#techtok": {
          updatedAt: new Date().toISOString(),
          videoLinks: 0,
          relatedHits: 0
        }
      }
    }
  });

  assert.equal(queue.length, 5);
  assert.notEqual(queue[0].normalizedQuery, "#techtok");
  assert.ok(queue.every((item) => item.score > -2));
});

test("summarizes search page signals against profile terms", () => {
  const profile = analyzeFypRequest("ai tools and openai creative coding");
  const summary = summarizeSearchSignals(
    {
      videoLinks: ["https://www.tiktok.com/@creator/video/123"],
      videoElements: 1,
      hashtags: ["#aitools", "#openai"],
      creators: ["@builder"],
      sampleText: "creative coding and OpenAI workflow"
    },
    profile
  );

  assert.equal(summary.videoLinks, 1);
  assert.ok(summary.relatedHits >= 2);
  assert.deepEqual(summary.creators, ["@builder"]);
});

test("builds a recommendation map from profile seeds and cache discoveries", () => {
  const profile = analyzeFypRequest("ai tools and openai creative coding");
  const map = buildRecommendationMap(profile, {
    discovered: {
      hashtags: {
        openai: { label: "#openai", count: 2 },
        aitools: { label: "#aitools", count: 4 }
      },
      creators: {
        builder: { label: "@builder", count: 1 }
      }
    },
    searches: {}
  });

  assert.equal(map.targetAesthetic, "Creative Technology");
  assert.equal(map.discoveredHashtags[0], "#aitools");
  assert.deepEqual(map.discoveredCreators, ["@builder"]);
  assert.ok(map.nextBestSearches.length > 0);
});
