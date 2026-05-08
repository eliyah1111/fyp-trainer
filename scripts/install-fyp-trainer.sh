#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/eliyah1111/fyp-trainer.git}"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.fyp-trainer}"
CODEX_SKILLS_DIR="${CODEX_SKILLS_DIR:-$HOME/.codex/skills}"
BRANCH="${BRANCH:-}"
SKIP_BOOTSTRAP="${SKIP_BOOTSTRAP:-0}"
SKIP_CODEX_SKILL="${SKIP_CODEX_SKILL:-0}"

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

  local skill_dir="$CODEX_SKILLS_DIR/fyp-trainer"
  local agent_dir="$skill_dir/agents"
  mkdir -p "$agent_dir"

  cat > "$skill_dir/SKILL.md" <<EOF
---
name: fyp-trainer
description: GitHub-installed FYP Trainer runtime for user-confirmed TikTok For You Page personalization. Use when the user asks to train, personalize, curate, or reshape their TikTok FYP with a visible browser, Node.js, Playwright, adaptive search planning, Y/N approval, and safe capped browsing sessions.
---

# FYP Trainer

Runtime installed at:

~~~text
$INSTALL_DIR
~~~

Use this skill as an agent-operated runtime. Do not ask the user to manually run commands unless the agent cannot run shell commands.

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

4. Preview the plan:

~~~bash
node ./src/cli.js plan --searches=5
~~~

5. Show the profile and ask exactly:

~~~text
Approve this search plan? [Y/N]
~~~

6. Only after \`Y\`, run:

~~~bash
node ./src/cli.js train --confirmed --duration=60
~~~

For the full interactive flow, run:

~~~bash
npm run run
~~~

## Rules

- Open TikTok visibly in the user's default supported Chromium browser app when supported.
- Wait for manual login when needed.
- Never collect credentials or bypass CAPTCHA, age gates, safety prompts, or login protections.
- Keep live sessions capped and realistic; do not perform hundreds of live searches, views, likes, follows, or Not Interested actions per minute.
- Use \`memory/search-cache.json\` as private local discovery memory.
- Summarize the newest \`sessions/session-*.json\` after a run.
EOF

  if [[ -f "$INSTALL_DIR/agents/openai.yaml" ]]; then
    cp "$INSTALL_DIR/agents/openai.yaml" "$agent_dir/openai.yaml"
  fi

  echo "Registered Codex skill at $skill_dir"
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

echo
echo "FYP Trainer installed."
echo "Runtime: $INSTALL_DIR"
if [[ "$SKIP_CODEX_SKILL" != "1" ]]; then
  echo "Codex skill: $CODEX_SKILLS_DIR/fyp-trainer"
fi
echo
echo "Now tell your AI agent:"
echo "Use FYP Trainer."
echo "The agent will ask what kind of TikTok For You Page you want."

