# Codex Adapter

## Activate From GitHub

After the user installs or clones the GitHub repo, tell Codex:

```text
Use FYP Trainer from this repository. Generate the profile first, ask `Approve this search plan? [Y/N]`, and only train after I answer Y.
```

## Commands

```bash
npm install
npm run install:browsers
node ./src/cli.js diagnose --isolated --query="streetwear"
node ./src/cli.js profile --input="archive fashion, runway edits, ambient techno, avoid celebrity drama" --json
node ./src/cli.js plan --searches=5
node ./src/cli.js train --confirmed --duration=60
```

`npm run run` now opens the user's Windows default supported browser app with FYP Trainer's persistent browser profile.

## Integration

Codex can import `src/index.js` for programmatic workflows or call the CLI. Use `plan` to preview ranked cache-aware discovery, `--dry-run` during code changes, and `--confirmed` only after the user approves the profile summary.
