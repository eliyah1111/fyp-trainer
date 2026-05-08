# OpenAI Agents Adapter

## Activate

Use the CLI as a local tool or import `tool.js` from an OpenAI Agent tool wrapper.

```js
import { runFypTrainerCli } from "./adapters/openai-agents/tool.js";

const profile = await runFypTrainerCli(["profile", "--input=archive fashion and cinematic edits", "--json"]);
```

## Commands

```bash
npm install
npm run install:browsers
node ./src/cli.js diagnose --isolated --query="archive fashion"
node ./src/cli.js profile --input="archive fashion and cinematic edits" --json
node ./src/cli.js plan --searches=5
node ./src/cli.js train --confirmed --duration=60
```

By default, browser-launching commands open the user's Windows default supported browser app through local CDP with FYP Trainer's persistent browser profile. Use `--isolated` for bundled Playwright Chromium.

## Integration

Expose three tools to the agent: `fyp_profile`, `fyp_plan`, and `fyp_train`. Require a user confirmation gate between `fyp_plan` and `fyp_train`.
