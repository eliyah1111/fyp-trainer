import test from "node:test";
import assert from "node:assert/strict";
import { analyzeFypRequest } from "../src/core/profile-analyzer.js";
import { scoreTextAgainstProfile, summarizeFeedAudit } from "../src/core/tiktok-actions.js";

test("scores visible video text against the training profile", () => {
  const profile = analyzeFypRequest("ai tools, claude code, codex, gemini, avoid celebrity drama");

  assert.ok(scoreTextAgainstProfile("new Claude Code workflow and AI tools demo #codex", profile) > 0.2);
  assert.ok(scoreTextAgainstProfile("celebrity drama gossip loop", profile) < 0);
});

test("summarizes post-refresh feed audit status", () => {
  const validated = summarizeFeedAudit(
    [
      { score: 0.4 },
      { score: 0.2 },
      { score: 0.01 },
      { score: 0.12 },
      { score: 0 }
    ],
    { targetRate: 0.4 }
  );
  const warming = summarizeFeedAudit([{ score: 0.01 }, { score: 0 }, { score: -0.2 }], { targetRate: 0.4 });

  assert.equal(validated.status, "validated");
  assert.equal(validated.related, 3);
  assert.equal(warming.status, "warming");
});
