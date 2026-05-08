# FYP Trainer

FYP Trainer is a reusable AI agent skill for shaping a TikTok For You Page toward a user-confirmed aesthetic profile. It uses Node.js, Playwright, JSON memory, short capped sessions, and adapter docs for Claude Code, Codex, Cursor Agents, OpenAI Agents, and similar environments.

It is built as a transparent user-assistive workflow. It opens TikTok, waits for manual login when needed, asks what kind of FYP the user wants, generates a training profile, asks for confirmation, then runs a bounded one-minute session that searches, opens videos, watches briefly, scrolls, and optionally applies tiny capped preference signals.

The runtime now uses an adaptive session engine: it ranks searches from a local candidate bank, inspects visible search-result signals, discovers hashtags and creators, caches repeated searches in local JSON memory, and uses that memory to prioritize future sessions. The goal is smarter personalization, not higher-volume automation.

## One-Command Agent Install

Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -Command "iwr https://raw.githubusercontent.com/eliyah1111/fyp-trainer/main/scripts/install-fyp-trainer.ps1 -OutFile $env:TEMP\install-fyp-trainer.ps1; & $env:TEMP\install-fyp-trainer.ps1"
```

macOS / Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/eliyah1111/fyp-trainer/main/scripts/install-fyp-trainer.sh | bash
```

Then they tell their AI agent:

```text
$fyptrainer
```

Claude Code and Gemini CLI use slash-command style:

```text
/fyptrainer
```

The agent reads `SKILL.md` / `AGENTS.md`, asks what kind of FYP the user wants, runs bootstrap if needed, generates the search profile, asks `Approve this search plan? [Y/N]`, then opens TikTok visibly and runs the capped session.

The installer clones or updates the runtime at `~/.fyp-trainer`, runs `npm run bootstrap`, and registers:

- Codex/OpenAI-style skill: `~/.codex/skills/fyptrainer`
- Claude Code skill: `~/.claude/skills/fyptrainer`
- Gemini CLI command: `~/.gemini/commands/fyptrainer.toml`

To install from a fork or another repo:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-fyp-trainer.ps1 -RepoUrl "https://github.com/YOUR-NAME/fyp-trainer.git"
```

## Local Quick Start

```bash
npm install
npm run install:browsers
npm run run
```

By default, `npm run run` opens your Windows default Chromium browser app on TikTok and connects to it locally through DevTools. It uses a persistent FYP Trainer browser profile in `memory/<browser>-cdp-profile`, because modern Chrome/Edge/Brave do not allow DevTools automation against the real default profile data directory.

Use the isolated Playwright profile only when you explicitly want it:

```bash
npm run run -- --isolated
npm run diagnose -- --isolated --query="streetwear"
```

When this FYP Trainer browser profile is logged out, log in manually once; the login persists in `memory/<browser>-cdp-profile`. Search probes are skipped unless `--force-search` is passed.

## Use Your Regular Browser

This is now the default. The command below launches your default supported Chromium browser app, opens TikTok, and starts the FYP Trainer flow:

```bash
npm run run
```

Supported default browsers: Chrome, Edge, and Brave. If your Windows default browser is Firefox or another non-Chromium browser, use `--isolated` or set Chrome/Edge/Brave as the default browser.

Manual helper commands still exist:

```bash
npm run browser
npm run run:cdp
```

## Non-Interactive Agent Flow

```bash
npm run profile -- --input="archive fashion, cinematic edits, ambient techno, avoid celebrity drama" --json
npm run plan
npm run train -- --confirmed --duration=60
```

Use dry-run mode while testing:

```bash
npm run train -- --dry-run --duration=30
```

Default sessions are optimized to finish in 60 seconds or less. Use `--careful` only when you want the older slower pacing.
The profile step generates a local search bank of 100+ candidate searches immediately, then asks for `Y/N` approval before any live training starts.

Session planning is cache-aware:

```bash
npm run plan -- --searches=5
```

The plan includes ranked search items, discovery scores, orchestration mode, and interaction caps. Repeated weak searches are deprioritized for a few hours; searches that expose useful videos, hashtags, or creators become stronger future seeds.

## Structure

```text
fyp-trainer/
  src/                 Node.js runtime and Playwright workflows
  skills/fyp-trainer/  Agent skill instructions source
  adapters/            Claude Code, Codex, Cursor, OpenAI Agents notes
  memory/              Local profile, search cache, and browser state
  sessions/            Session logs, diagnostics, screenshots
```

## Boundaries

- No credential collection.
- No CAPTCHA or safety prompt bypass.
- No stealth flags or fingerprint spoofing.
- No mass likes, follows, comments, messages, uploads, scraping, or hundreds of robotic actions per minute.
- Live training requires confirmation.
- Follows are disabled unless explicitly enabled with `--allow-follow`.

## Validation

```bash
npm run validate
npm run diagnose -- --isolated --query="cinematic fashion"
```

