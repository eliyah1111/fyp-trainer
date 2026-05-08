# Agent Contract

FYP Trainer is an agent-operated runtime. Agents integrate through CLI commands, JSON files, and the exported ESM API in `src/index.js`.

## Required User Approval

Before live training, show the generated profile summary and ask exactly:

```text
Approve this search plan? [Y/N]
```

Only `Y` starts live training. `N` means collect changes and regenerate.

## Stable Commands

```bash
npm run bootstrap
node ./src/cli.js profile --input="<request>" --json
node ./src/cli.js plan
node ./src/cli.js train --confirmed --duration=60
node ./src/cli.js diagnose --isolated --query="cinematic fashion"
```

`plan` is cache-aware. It returns ranked search items with discovery scores, orchestration mode, search count, candidate count, and interaction caps. Agents should use this as the preflight view before asking the user for final approval.

## Outputs

- Profiles: `memory/profiles.json`
- Search cache: `memory/search-cache.json`
- Session logs: `sessions/session-*.json`
- Diagnostics: `sessions/diagnostic-*`

## Browser

Default mode opens the user's Windows default Chromium browser app through local CDP with a persistent FYP Trainer profile in `memory/<browser>-cdp-profile`.
