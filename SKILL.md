---
name: fyptrainer
description: GitHub-installable AI agent skill/runtime for user-confirmed TikTok For You Page preference training with Node.js, Playwright, a visible browser, JSON memory, Y/N confirmation, and adapters for Codex, Claude Code, Cursor Agents, OpenAI Agents, and similar automation environments. Use when the user invokes `$fyptrainer`, or asks an AI agent to open TikTok, generate a FYP training profile from their taste description, ask for approval, search relevant terms, watch visible videos briefly, classify content by visible text/hashtags/caption, mark a small capped number of unrelated videos as Not Interested, refresh the feed at the end, or inspect session logs.
---

# FYP Trainer

Use this skill as an agent-operated runtime. The primary invocation is:

```text
$fyptrainer
```

If the user invokes only `$fyptrainer`, ask: "What kind of TikTok For You Page do you want?"

If the user invokes `$fyptrainer` with a taste description in the same message, use that description directly.

## Agent Workflow

1. Run bootstrap once from the repo root:

```bash
npm run bootstrap
```

2. Ask the user what FYP they want if they did not already specify it.
3. Generate a profile:

```bash
node ./src/cli.js profile --input="<user request>" --json
```

4. Show the profile summary to the user and ask exactly:

```text
Approve this search plan? [Y/N]
```

5. If the user answers `N`, collect changes, regenerate the profile, and ask again.
6. If the user answers `Y`, run:

```bash
node ./src/cli.js train --confirmed --duration=60
```

7. Summarize `sessions/session-*.json`: searches, videos opened, watched, likes, Not Interested, and whether final refresh happened.

For a non-live preview, run:

```bash
node ./src/cli.js plan --searches=5
```

Use the plan output to explain ranked searches, discovery scores, orchestration mode, and interaction caps before running live training.

## Browser Behavior

- Open TikTok visibly in the user's default supported Chromium browser app.
- Use FYP Trainer's persistent browser profile in `memory/<browser>-cdp-profile`; modern Chrome/Edge/Brave block DevTools automation against the real default profile.
- If the profile is not logged in, wait while the user logs in manually.
- Never collect credentials or bypass CAPTCHA, login protections, or safety prompts.

## Content Classification

Classify videos using visible page text: caption, hashtags, title, creator, sound labels, URL, and surrounding text. Treat a video as related when it overlaps the target profile's hashtags, creators, categories, sounds, or explicit user keywords. Treat it as unrelated when it overlaps unwanted categories or has no useful overlap after the brief watch window.

## Discovery Memory

- Store local search memory in `memory/search-cache.json`.
- Use cached search results to avoid repeating weak searches too often.
- Prefer searches that previously exposed useful video links, matching hashtags, creators, or profile terms.
- Treat cache as private local state; never commit it or use it as global behavior for other users.

## Operating Limits

The runtime is intentionally bounded:

- 60 seconds by default.
- Search bank: 100+ local candidate searches.
- Live TikTok execution: fast adaptive capped search burst, up to 24 high-value searches by default with a hard cap of 30, short watches, tiny capped preference actions.
- No mass following, commenting, messaging, posting, uploading, scraping, or hundreds of robotic live actions per minute.

Use `references/agent-contract.md` and `references/safety-boundaries.md` for integration details.
