# Cursor Agents Adapter

## Activate From GitHub

After the user installs or clones the GitHub repo, reference it in Cursor chat:

```text
$fyptrainer
```

## Commands

```bash
npm install
npm run install:browsers
npm run profile -- --input="clean girl minimalism, jazz, pilates, avoid prank content" --json
npm run plan -- --searches=5
npm run train -- --confirmed --duration=60
```

`npm run run` now opens the user's Windows default supported browser app with FYP Trainer's persistent browser profile.

## Integration

Cursor Agents should use the CLI as the source of truth, preview cache-aware plans before live training, and inspect session JSON after each run. Live sessions require explicit user confirmation. If the environment supports command-style prompts, use `$fyptrainer`; if it follows slash-command conventions, use `/fyptrainer`.
