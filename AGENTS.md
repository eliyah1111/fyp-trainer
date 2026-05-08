# FYP Trainer Agent Instructions

Use this repository as a GitHub-installable AI agent skill/runtime.

## One-Command Install

Windows:

```powershell
powershell -ExecutionPolicy Bypass -Command "iwr https://raw.githubusercontent.com/eliyah1111/fyp-trainer/main/scripts/install-fyp-trainer.ps1 -OutFile $env:TEMP\install-fyp-trainer.ps1; & $env:TEMP\install-fyp-trainer.ps1"
```

macOS / Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/eliyah1111/fyp-trainer/main/scripts/install-fyp-trainer.sh | bash
```

The installer clones or updates the runtime at `~/.fyp-trainer`, runs bootstrap, and registers a Codex skill at `~/.codex/skills/fyp-trainer`.

## User Experience

The user should say something like:

```text
Use FYP Trainer. I want my TikTok FYP to become AI tech news, Claude Code, Codex, Gemini, new AI tools, and creative AI builds.
```

The agent should handle commands internally and keep the user in the approval loop.

## Required Flow

1. Run `npm run bootstrap` if dependencies are not installed.
2. Generate a profile with `node ./src/cli.js profile --input="<request>" --json`.
3. Show the summary and ask exactly `Approve this search plan? [Y/N]`.
4. On `N`, ask what to change and regenerate.
5. On `Y`, run `node ./src/cli.js train --confirmed --duration=60`.
6. Read the newest `sessions/session-*.json`.
7. Report what happened: searches, videos opened, watches, Not Interested count, likes, and final refresh.

## Do Not

- Ask the user to manually run terminal commands unless the agent cannot run shell commands.
- Claim the runtime uses the real default Chrome profile. It uses a persistent FYP Trainer browser profile because current Chrome blocks DevTools automation against the real default profile.
- Increase to hundreds of live searches/views/actions per minute.
- Collect credentials, solve CAPTCHA, bypass safety prompts, or send comments/messages/posts.

## Useful Commands

```bash
npm run bootstrap
node ./src/cli.js profile --input="<taste request>" --json
node ./src/cli.js plan
node ./src/cli.js train --confirmed --duration=60
node ./src/cli.js diagnose --isolated --query="ai tools"
```

