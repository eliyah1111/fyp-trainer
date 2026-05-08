param(
  [string]$RepoUrl = "https://github.com/eliyah1111/fyp-trainer.git",
  [string]$InstallDir = "$env:USERPROFILE\.fyp-trainer",
  [string]$CodexSkillsDir = "$env:USERPROFILE\.codex\skills",
  [string]$Branch = "",
  [switch]$SkipBootstrap,
  [switch]$SkipCodexSkill
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param([string]$Name, [string]$InstallHint)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name is required. $InstallHint"
  }
}

function Run-Native {
  param([string]$File, [string[]]$Arguments)
  & $File @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: $File $($Arguments -join ' ')"
  }
}

function Run-InRepo {
  param([string[]]$Command)
  Push-Location $InstallDir
  try {
    $file = $Command[0]
    $nativeArgs = @()
    if ($Command.Length -gt 1) {
      $nativeArgs = $Command[1..($Command.Length - 1)]
    }
    Run-Native $file $nativeArgs
  } finally {
    Pop-Location
  }
}

function Git-Text {
  param([string[]]$Arguments)
  $output = & git @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: git $($Arguments -join ' ')"
  }
  return ($output -join "`n").Trim()
}

function Save-LocalTrackedEdits {
  $dirty = & git -C $InstallDir status --porcelain --untracked-files=no
  if ($dirty) {
    Write-Output "Local tracked edits found in managed install; saving them to a git stash before updating."
    Run-Native "git" @("-C", $InstallDir, "stash", "push", "-m", "fyp-trainer installer backup before update")
  }
}

function Update-ManagedRepo {
  $branchName = $Branch.Trim()
  if (-not $branchName) {
    $branchName = Git-Text @("-C", $InstallDir, "rev-parse", "--abbrev-ref", "HEAD")
    if (-not $branchName -or $branchName -eq "HEAD") {
      $branchName = "main"
    }
  }

  $targetRef = "origin/$branchName"
  Run-Native "git" @("-C", $InstallDir, "remote", "set-url", "origin", $RepoUrl)
  Run-Native "git" @("-C", $InstallDir, "fetch", "origin")

  & git -C $InstallDir rev-parse --verify $targetRef *> $null
  if ($LASTEXITCODE -ne 0) {
    throw "Remote branch not found: $targetRef"
  }

  Save-LocalTrackedEdits
  Run-Native "git" @("-C", $InstallDir, "checkout", "-B", $branchName, $targetRef)

  & git -C $InstallDir merge-base --is-ancestor "HEAD" $targetRef
  if ($LASTEXITCODE -eq 0) {
    Run-Native "git" @("-C", $InstallDir, "merge", "--ff-only", $targetRef)
    return
  }

  Write-Output "Remote history changed; resetting managed install to $targetRef."
  Run-Native "git" @("-C", $InstallDir, "reset", "--hard", $targetRef)
}

function Install-OrUpdateRepo {
  if (Test-Path -LiteralPath $InstallDir) {
    if (-not (Test-Path -LiteralPath (Join-Path $InstallDir ".git"))) {
      throw "InstallDir exists but is not a git repository: $InstallDir"
    }

    Write-Output "Updating FYP Trainer at $InstallDir"
    Update-ManagedRepo
    return
  }

  Write-Output "Installing FYP Trainer to $InstallDir"
  if ($Branch.Trim()) {
    Run-Native "git" @("clone", "--branch", $Branch, $RepoUrl, $InstallDir)
  } else {
    Run-Native "git" @("clone", $RepoUrl, $InstallDir)
  }
}

function Register-CodexSkill {
  if ($SkipCodexSkill) {
    return
  }

  $skillDir = Join-Path $CodexSkillsDir "fyp-trainer"
  $agentDir = Join-Path $skillDir "agents"
  New-Item -ItemType Directory -Force -Path $agentDir | Out-Null

  $skillBody = @"
---
name: fyp-trainer
description: GitHub-installed FYP Trainer runtime for user-confirmed TikTok For You Page personalization. Use when the user invokes `$fyp-trainer` or asks to train, personalize, curate, or reshape their TikTok FYP with a visible browser, Node.js, Playwright, adaptive search planning, Y/N approval, and safe capped browsing sessions.
---

# FYP Trainer

Invoke this skill with:

~~~text
`$fyp-trainer
~~~

Runtime installed at:

~~~text
$InstallDir
~~~

Use this skill as an agent-operated runtime. Do not ask the user to manually run commands unless the agent cannot run shell commands.

If the user invokes only the skill name with no taste description, ask:

~~~text
What kind of TikTok For You Page do you want?
~~~

If the user invokes the skill with a taste description in the same message, use that description directly.

## Workflow

1. From the runtime root, run:

~~~powershell
cd "$InstallDir"
npm run bootstrap
~~~

2. If the user did not describe the desired FYP yet, ask:

~~~text
What kind of TikTok For You Page do you want?
~~~

3. Generate the profile:

~~~powershell
node ./src/cli.js profile --input="<user request>" --json
~~~

4. Preview the plan:

~~~powershell
node ./src/cli.js plan --searches=5
~~~

5. Show the profile and ask exactly:

~~~text
Approve this search plan? [Y/N]
~~~

6. Only after `Y`, run:

~~~powershell
node ./src/cli.js train --confirmed --duration=60
~~~

For the full interactive flow, run:

~~~powershell
npm run run
~~~

## Rules

- Open TikTok visibly in the user's default supported Chromium browser app.
- Wait for manual login when needed.
- Never collect credentials or bypass CAPTCHA, age gates, safety prompts, or login protections.
- Keep live sessions capped and realistic; do not perform hundreds of live searches, views, likes, follows, or Not Interested actions per minute.
- Use `memory/search-cache.json` as private local discovery memory.
- Summarize the newest `sessions/session-*.json` after a run.
"@

  Set-Content -LiteralPath (Join-Path $skillDir "SKILL.md") -Value $skillBody -Encoding UTF8

  $sourceOpenAiYaml = Join-Path $InstallDir "agents\openai.yaml"
  if (Test-Path -LiteralPath $sourceOpenAiYaml) {
    Copy-Item -LiteralPath $sourceOpenAiYaml -Destination (Join-Path $agentDir "openai.yaml") -Force
  }

  Write-Output "Registered Codex skill at $skillDir"
}

Require-Command "git" "Install Git from https://git-scm.com/downloads"
Require-Command "node" "Install Node.js 20+ from https://nodejs.org/"
Require-Command "npm" "Install Node.js 20+ from https://nodejs.org/"

Install-OrUpdateRepo

if (-not $SkipBootstrap) {
  Write-Output "Bootstrapping FYP Trainer"
  Run-InRepo @("npm", "run", "bootstrap")
}

Register-CodexSkill

Write-Output ""
Write-Output "FYP Trainer installed."
Write-Output "Runtime: $InstallDir"
if (-not $SkipCodexSkill) {
  Write-Output "Codex skill: $(Join-Path $CodexSkillsDir "fyp-trainer")"
}
Write-Output ""
Write-Output "Now tell your AI agent:"
Write-Output '$fyp-trainer'
Write-Output "The agent will ask what kind of TikTok For You Page you want."

