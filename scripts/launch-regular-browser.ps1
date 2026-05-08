param(
  [ValidateSet("default", "chrome", "msedge", "brave")]
  [string]$Browser = "chrome",

  [int]$Port = 9222,

  [switch]$UseDefaultProfile,

  [string]$UserDataDir = "",

  [string]$ProfileDirectory = "Default",

  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Resolve-BrowserPath {
  param([string]$Name)

  $candidates = if ($Name -eq "chrome") {
    @(
      "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
      "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
      "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    )
  } elseif ($Name -eq "msedge") {
    @(
      "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
      "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
      "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
    )
  } elseif ($Name -eq "brave") {
    @(
      "$env:ProgramFiles\BraveSoftware\Brave-Browser\Application\brave.exe",
      "${env:ProgramFiles(x86)}\BraveSoftware\Brave-Browser\Application\brave.exe",
      "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\Application\brave.exe"
    )
  } else {
    throw "Unsupported browser: $Name"
  }

  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path -LiteralPath $candidate)) {
      return $candidate
    }
  }

  throw "Could not find $Name. Install it or pass a browser already launched with --remote-debugging-port=$Port."
}

function Resolve-DefaultUserDataDir {
  param([string]$Name)

  if ($Name -eq "chrome") {
    return "$env:LOCALAPPDATA\Google\Chrome\User Data"
  }

  if ($Name -eq "msedge") {
    return "$env:LOCALAPPDATA\Microsoft\Edge\User Data"
  }

  if ($Name -eq "brave") {
    return "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\User Data"
  }

  throw "Unsupported browser user data dir: $Name"
}

function Resolve-DefaultBrowser {
  $userChoicePath = "HKCU:\Software\Microsoft\Windows\Shell\Associations\UrlAssociations\https\UserChoice"
  $progId = (Get-ItemProperty -Path $userChoicePath -ErrorAction Stop).ProgId

  if ($progId -match "Chrome") {
    return "chrome"
  }

  if ($progId -match "MSEdge|Edge") {
    return "msedge"
  }

  if ($progId -match "Brave") {
    return "brave"
  }

  throw "Default browser '$progId' is not supported for automation. Set Chrome, Edge, or Brave as the default browser, or run with --isolated."
}

if ($Browser -eq "default") {
  $Browser = Resolve-DefaultBrowser
  Write-Output "Resolved Windows default browser to: $Browser"
}

$browserPath = Resolve-BrowserPath -Name $Browser

if ($UseDefaultProfile) {
  $UserDataDir = Resolve-DefaultUserDataDir -Name $Browser
} elseif (-not $UserDataDir) {
  $UserDataDir = Join-Path (Resolve-Path ".").Path "memory\$Browser-cdp-profile"
}

$launchArgs = @(
  "--remote-debugging-port=$Port",
  "--user-data-dir=""$UserDataDir""",
  "--profile-directory=""$ProfileDirectory""",
  "https://www.tiktok.com/"
)

Write-Output "Launching $Browser with DevTools at http://127.0.0.1:$Port"
Write-Output "User data dir: $UserDataDir"
Write-Output "Browser executable: $browserPath"
if ($DryRun) {
  Write-Output "Dry run only. Browser was not launched."
  exit 0
}

if ($UseDefaultProfile) {
  $running = Get-Process -Name $Browser -ErrorAction SilentlyContinue
  if ($running) {
    Write-Warning "$Browser is already running. Close all $Browser windows first, then run this command again so remote debugging attaches to the regular profile."
    exit 2
  }
}

New-Item -ItemType Directory -Force -Path $UserDataDir | Out-Null
Start-Process -FilePath $browserPath -ArgumentList $launchArgs
