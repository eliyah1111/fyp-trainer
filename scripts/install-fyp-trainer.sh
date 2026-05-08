#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/eliyah1111/fyp-trainer.git}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.fyp-trainer}"
CODEX_SKILLS_DIR="${CODEX_SKILLS_DIR:-$HOME/.codex/skills}"
CLAUDE_SKILLS_DIR="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
GEMINI_COMMANDS_DIR="${GEMINI_COMMANDS_DIR:-$HOME/.gemini/commands}"
CODEX_SKILL_NAME="${CODEX_SKILL_NAME:-fyptrainer}"
BRANCH="${BRANCH:-}"
SKIP_BOOTSTRAP="${SKIP_BOOTSTRAP:-0}"
SKIP_CODEX_SKILL="${SKIP_CODEX_SKILL:-0}"
SKIP_CLAUDE_SKILL="${SKIP_CLAUDE_SKILL:-0}"
SKIP_GEMINI_COMMAND="${SKIP_GEMINI_COMMAND:-0}"

require_command() {
  local name="$1"
  local hint="$2"
  if ! command -v "$name" >/dev/null 2>&1; then
    echo "$name is required. $hint" >&2
    exit 1
  fi
}

save_local_tracked_edits() {
  local dirty
  dirty="$(git -C "$INSTALL_DIR" status --porcelain --untracked-files=no)"
  if [[ -n "$dirty" ]]; then
    echo "Local tracked edits found in managed install; saving them to a git stash before updating."
    git -C "$INSTALL_DIR" stash push -m "fyp-trainer installer backup before update"
  fi
}

update_managed_repo() {
  local branch_name="$BRANCH"
  if [[ -z "$branch_name" ]]; then
    branch_name="$(git -C "$INSTALL_DIR" rev-parse --abbrev-ref HEAD || true)"
    if [[ -z "$branch_name" || "$branch_name" == "HEAD" ]]; then
      branch_name="main"
    fi
  fi

  local target_ref="origin/$branch_name"
  git -C "$INSTALL_DIR" remote set-url origin "$REPO_URL"
  git -C "$INSTALL_DIR" fetch origin
  if ! git -C "$INSTALL_DIR" rev-parse --verify "$target_ref" >/dev/null 2>&1; then
    echo "Remote branch not found: $target_ref" >&2
    exit 1
  fi

  save_local_tracked_edits
  git -C "$INSTALL_DIR" checkout -B "$branch_name" "$target_ref"
}

remove_legacy_codex_skill() {
  if [[ "$CODEX_SKILL_NAME" == "fyp-trainer" ]]; then
    return
  fi

  local legacy_dir="$CODEX_SKILLS_DIR/fyp-trainer"
  if [[ ! -d "$legacy_dir" ]]; then
    return
  fi

  case "$legacy_dir" in
    "$CODEX_SKILLS_DIR"/*)
      rm -rf "$legacy_dir"
      echo "Removed legacy Codex skill alias at $legacy_dir"
      ;;
    *)
      echo "Refusing to remove legacy skill outside Codex skills directory: $legacy_dir" >&2
      exit 1
      ;;
  esac
}

install_or_update_repo() {
  if [[ -d "$INSTALL_DIR" ]]; then
    if [[ ! -d "$INSTALL_DIR/.git" ]]; then
      echo "INSTALL_DIR exists but is not a git repository: $INSTALL_DIR" >&2
      exit 1
    fi

    echo "Updating FYP Trainer at $INSTALL_DIR"
    update_managed_repo
    return
  fi

  echo "Installing FYP Trainer to $INSTALL_DIR"
  if [[ -n "$BRANCH" ]]; then
    git clone --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
  else
    git clone "$REPO_URL" "$INSTALL_DIR"
  fi
}

register_codex_skill() {
  if [[ "$SKIP_CODEX_SKILL" == "1" ]]; then
    return
  fi

  remove_legacy_codex_skill

  local skill_dir="$CODEX_SKILLS_DIR/$CODEX_SKILL_NAME"
  local agent_dir="$skill_dir/agents"
  mkdir -p "$agent_dir"

  cat > "$skill_dir/SKILL.md" <<EOF
---
name: $CODEX_SKILL_NAME
description: GitHub-installed FYP Trainer runtime for user-confirmed TikTok For You Page personalization. Use when the user invokes \$fyptrainer or asks to train, personalize, curate, or reshape their TikTok FYP with a visible browser, Node.js, Playwright, adaptive search planning, Y/N approval, and safe capped browsing sessions.
---

# FYP Trainer

Invoke this skill with:

~~~text
\$fyptrainer
~~~

Runtime installed at:

~~~text
$INSTALL_DIR
~~~

Use this skill as an agent-operated runtime. Do not ask the user to manually run commands unless the agent cannot run shell commands.

If the user invokes only the skill name with no taste description, ask:

~~~text
What kind of TikTok For You Page do you want?
~~~

If the user invokes the skill with a taste description in the same message, use that description directly.

## Workflow

1. From the runtime root, run:

~~~bash
cd "$INSTALL_DIR"
npm run bootstrap
~~~

2. If the user did not describe the desired FYP yet, ask:

~~~text
What kind of TikTok For You Page do you want?
~~~

3. Generate the profile:

~~~bash
node ./src/cli.js profile --input="<user request>" --json
~~~

4. Ask how long the user is willing to wait:

~~~text
How long are you willing to wait?
~~~

Normalize the answer to 30-300 seconds.

5. Preview the plan with that time budget:

~~~bash
node ./src/cli.js plan --duration=<seconds>
~~~

6. Show the profile, selected time budget, search count, and ask exactly:

~~~text
Approve this search plan? [Y/N]
~~~

7. Only after \`Y\`, run:

~~~bash
node ./src/cli.js train --confirmed --duration=<seconds>
~~~

For the full interactive flow, run:

~~~bash
npm run run
~~~

## Rules

- Open TikTok visibly in the user's default supported Chromium browser app when supported.
- Wait for manual login when needed.
- Never collect credentials or bypass CAPTCHA, age gates, safety prompts, or login protections.
- Keep live sessions fast but capped: up to 24 live searches per minute, hard cap 30 per minute, and no hundreds of robotic searches, views, likes, follows, or Not Interested actions per minute.
- Use \`memory/search-cache.json\` as private local discovery memory.
- Summarize the newest \`sessions/session-*.json\` after a run.
EOF

  cat > "$agent_dir/openai.yaml" <<EOF
interface:
  display_name: "FYP Trainer"
  short_description: "Agent-run TikTok FYP training workflow"
  default_prompt: "\$fyptrainer"

policy:
  allow_implicit_invocation: true
EOF

  echo "Registered Codex skill at $skill_dir"
}

register_claude_skill() {
  if [[ "$SKIP_CLAUDE_SKILL" == "1" ]]; then
    return
  fi

  local skill_dir="$CLAUDE_SKILLS_DIR/$CODEX_SKILL_NAME"
  mkdir -p "$skill_dir"

  cat > "$skill_dir/SKILL.md" <<EOF
---
name: $CODEX_SKILL_NAME
description: GitHub-installed FYP Trainer runtime for user-confirmed TikTok For You Page personalization. Use when the user invokes /fyptrainer or asks to train, personalize, curate, or reshape their TikTok FYP with a visible browser, Node.js, Playwright, adaptive search planning, Y/N approval, and safe capped browsing sessions.
argument-hint: "[taste profile]"
---

# FYP Trainer

Invoke this Claude Code skill with:

~~~text
/fyptrainer
~~~

Runtime installed at:

~~~text
$INSTALL_DIR
~~~

If the user invokes only /fyptrainer with no taste description, ask:

~~~text
What kind of TikTok For You Page do you want?
~~~

If the user invokes /fyptrainer with a taste description in the same message, use that description directly.

Run the workflow from the runtime root. Bootstrap if needed, generate a profile, ask how long the user is willing to wait, show the plan, ask exactly \`Approve this search plan? [Y/N]\`, and only after \`Y\` run the confirmed training session.

~~~bash
cd "$INSTALL_DIR"
npm run bootstrap
node ./src/cli.js profile --input="<user request>" --json
node ./src/cli.js plan --duration=<seconds>
node ./src/cli.js train --confirmed --duration=<seconds>
~~~

Rules:
- Open TikTok visibly in the user's default supported Chromium browser app when supported.
- Wait for manual login when needed.
- Never collect credentials or bypass CAPTCHA, age gates, safety prompts, or login protections.
- Keep live sessions fast but capped: up to 24 live searches per minute, hard cap 30 per minute.
- Summarize the newest \`sessions/session-*.json\` after a run.
EOF

  echo "Registered Claude Code skill at $skill_dir"
}

register_gemini_command() {
  if [[ "$SKIP_GEMINI_COMMAND" == "1" ]]; then
    return
  fi

  mkdir -p "$GEMINI_COMMANDS_DIR"
  local command_path="$GEMINI_COMMANDS_DIR/fyptrainer.toml"

  cat > "$command_path" <<EOF
description = "FYP Trainer: user-confirmed TikTok For You Page personalization workflow."
prompt = '''
# FYP Trainer

You are running the GitHub-installed FYP Trainer runtime.

Runtime path:
$INSTALL_DIR

If the user's /fyptrainer command includes a taste description, use it directly. If not, ask:

What kind of TikTok For You Page do you want?

Then:
1. Run bootstrap if dependencies are missing.
2. Generate a profile with:
   node ./src/cli.js profile --input="<user request>" --json
3. Ask how long the user is willing to wait, normalized to 30-300 seconds.
4. Preview the plan:
   node ./src/cli.js plan --duration=<seconds>
5. Show the plan and ask exactly:
   Approve this search plan? [Y/N]
6. Only after Y, run:
   node ./src/cli.js train --confirmed --duration=<seconds>
7. Summarize the newest sessions/session-*.json.

Rules:
- Open TikTok visibly in the user's default supported Chromium browser app when supported.
- Wait for manual login when needed.
- Never collect credentials or bypass CAPTCHA, age gates, safety prompts, or login protections.
- Keep live sessions fast but capped: up to 24 live searches per minute, hard cap 30 per minute.
'''
EOF

  echo "Registered Gemini CLI command at $command_path"
}

require_command git "Install Git from https://git-scm.com/downloads"
require_command node "Install Node.js 20+ from https://nodejs.org/"
require_command npm "Install Node.js 20+ from https://nodejs.org/"

install_or_update_repo

if [[ "$SKIP_BOOTSTRAP" != "1" ]]; then
  echo "Bootstrapping FYP Trainer"
  (cd "$INSTALL_DIR" && npm run bootstrap)
fi

register_codex_skill
register_claude_skill
register_gemini_command

echo
echo "FYP Trainer installed."
echo "Runtime: $INSTALL_DIR"
if [[ "$SKIP_CODEX_SKILL" != "1" ]]; then
  echo "Codex skill: $CODEX_SKILLS_DIR/$CODEX_SKILL_NAME"
fi
if [[ "$SKIP_CLAUDE_SKILL" != "1" ]]; then
  echo "Claude Code skill: $CLAUDE_SKILLS_DIR/$CODEX_SKILL_NAME"
fi
if [[ "$SKIP_GEMINI_COMMAND" != "1" ]]; then
  echo "Gemini CLI command: $GEMINI_COMMANDS_DIR/fyptrainer.toml"
fi
echo
echo "Now invoke it with:"
echo '$fyptrainer'
echo '/fyptrainer'
echo 'Codex-style agents use $fyptrainer. Claude Code and Gemini CLI use /fyptrainer.'

