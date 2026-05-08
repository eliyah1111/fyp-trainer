import test from "node:test";
import assert from "node:assert/strict";
import { analyzeFypRequest } from "../src/core/profile-analyzer.js";
import { buildSearchQueue, buildSessionPlan } from "../src/core/session-planner.js";

test("builds a bounded search queue from profile strategies", () => {
  const profile = analyzeFypRequest("dark academia books and classical music");
  const queue = buildSearchQueue(profile, { maxSearches: 3 });

  assert.equal(queue.length, 3);
  assert.ok(queue.every((item) => item.query));
});

test("caps session duration to the configured maximum", () => {
  const profile = analyzeFypRequest("streetwear sneakers and uk garage");
  const plan = buildSessionPlan(profile, { durationMs: 500_000 });

  assert.equal(plan.durationMs, 60_000);
  assert.equal(plan.interactionCaps.follows, 0);
});

test("caps live searches even when a larger number is requested", () => {
  const profile = analyzeFypRequest("ai tools openai claude code codex gemini creative coding");
  const plan = buildSessionPlan(profile, { maxSearches: 200 });

  assert.equal(plan.orchestration.hardLiveSearchLimit, 30);
  assert.ok(plan.searchQueue.length <= 30);
});
