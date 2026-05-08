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

The installer clones or updates the runtime at `~/.fyp-trainer`, runs bootstrap, and registers:

- Codex/OpenAI-style skill: `~/.codex/skills/fyptrainer`
- Claude Code skill: `~/.claude/skills/fyptrainer`
- Gemini CLI command: `~/.gemini/commands/fyptrainer.toml`

## User Experience

The user should say something like:

```text
$fyptrainer
```

Claude Code and Gemini CLI should use:

```text
/fyptrainer
```

The agent should ask what kind of TikTok For You Page the user wants, handle commands internally, and keep the user in the approval loop.

## Required Flow

1. Run `npm run bootstrap` if dependencies are not installed.
2. Generate a profile with `node ./src/cli.js profile --input="<request>" --json`.
3. Ask `How long are you willing to wait?` and normalize the answer to 30-300 seconds.
4. Run `node ./src/cli.js plan --duration=<seconds>`.
5. Show the summary, selected time budget, search count, and ask exactly `Approve this search plan? [Y/N]`.
6. On `N`, ask what to change and regenerate.
7. On `Y`, run `node ./src/cli.js train --confirmed --duration=<seconds>`.
8. Read the newest `sessions/session-*.json`.
9. Report what happened: searches, videos opened, watches, Not Interested count, likes, final refresh URL, and `outcome.feedAudit.status`.

Do not call the run successful only because automation completed. Treat `outcome.feedAudit.status` as the outcome:

- `validated`: refreshed For You sample contains enough matching signals.
- `warming`: training signals were sent, but the refreshed For You sample is not aligned enough yet.
- `no-data`: the audit could not inspect enough feed context.

Default live sessions are fast but bounded: up to 24 high-value searches per minute, with a hard cap of 30 per minute if an agent requests more.

## Do Not

- Ask the user to manually run terminal commands unless the agent cannot run shell commands.
- Claim the runtime uses the real default Chrome profile. It uses a persistent FYP Trainer browser profile because current Chrome blocks DevTools automation against the real default profile.
- Increase to hundreds of live searches/views/actions per minute.
- Collect credentials, solve CAPTCHA, bypass safety prompts, or send comments/messages/posts.

## Useful Commands

```bash
npm run bootstrap
node ./src/cli.js profile --input="<taste request>" --json
node ./src/cli.js plan --duration=120
node ./src/cli.js train --confirmed --duration=120
node ./src/cli.js diagnose --isolated --query="ai tools"
```

