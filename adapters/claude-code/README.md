# Claude Code Adapter

## Activate From GitHub

After the user installs or clones the GitHub repo, tell Claude Code:

```text
/fyptrainer
```

## Commands

```bash
npm install
npm run install:browsers
npm run diagnose -- --isolated --query="cinematic fashion"
npm run profile -- --input="dark academia, classic books, classical piano" --json
npm run plan -- --searches=5
npm run train -- --confirmed --duration=60
```

The GitHub installer registers this as a personal Claude Code skill at `~/.claude/skills/fyptrainer/SKILL.md`. Invoke it as `/fyptrainer`. `npm run run` opens the user's Windows default supported browser app with FYP Trainer's persistent browser profile.

## Integration

Claude Code should treat `memory/profiles.json`, `memory/search-cache.json`, and `sessions/*.json` as the durable state surface. It should never edit the browser profile by hand and should use `--dry-run` for validation.
