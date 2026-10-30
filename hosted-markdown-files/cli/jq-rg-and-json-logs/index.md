# jq, rg & JSON Logs

`jq` and `rg` (ripgrep) are the **fast inspection layer** for CI and EAS JSON - extract artifact URLs from `eas build:list`, grep JSONL logs for `Gradle failure`, and wire GitHub Actions outputs without a throwaway Node script. On Expo SDK 57 teams, these two tools turn cloud build metadata into bash you can check into the repo.

Highlights / jq, rg & JSON Logs

* eas build:list --json is the canonical EAS artifact feed for shell scripts
* jq -r selects fields without writing Node one-off parsers in CI
* rg searches JSONL build logs faster than grep - respects .gitignore, skips binaries
* Combine curl + jq to download the latest finished APK URL in one pipeline
* GitHub Actions step outputs pair with jq for downstream Maestro or adb install
* Keep jq filters in repo scripts - same query locally and on CI runners

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
# Latest finished production Android APK URL
eas build:list --platform android --status finished --limit 1 --json \
  | jq -r '.[0].artifacts.buildUrl // empty'
 
# iOS simulator .app download + bundle id from same JSON blob
eas build:list --platform ios --status finished --limit 1 --json \
  | jq -r '.[0] | "\(.applicationArchiveUrl // .artifacts.buildUrl)\t\(.buildDetails?.buildConfiguration ?? "n/a")"'
 
# Grep EAS/GitHub JSON log export for failure signature
rg -n '"level":"error"|Gradle failure|pod install' ./artifacts/build-logs.jsonl
 
# GitHub Actions: set output for downstream install step
echo "apk_url=$(jq -r '.[0].artifacts.buildUrl' build.json)" >> "$GITHUB_OUTPUT"
```

**When to reach for this:**

* CI needs the **latest green build URL** after `eas build --wait`.
* You are triaging a 40 MB EAS log file for the first `error` line.
* A script must branch on `buildProfile` or `gitCommitHash` from JSON.
* You want portable queries that run on macOS and Linux agents identically.
* PR bots comment with preview build links parsed from `eas build:list`.

## Working Example

**GitHub Actions: wait for EAS, extract APK URL, install on emulator, grep logs on failure.**

```bash
#!/usr/bin/env bash
# scripts/ci/fetch-latest-apk.sh - run after eas build --wait
set -euo pipefail
 
PLATFORM="${1:-android}"
PROFILE="${2:-preview}"
OUT_JSON="${3:-./eas-last-build.json}"
 
eas build:list \
  --platform "$PLATFORM" \
  --buildProfile "$PROFILE" \
  --status finished \
  --limit 1 \
  --json > "$OUT_JSON"
 
# Fail loudly if no artifact
APK_URL=$(jq -er '.[0].artifacts.buildUrl' "$OUT_JSON")
BUILD_ID=$(jq -er '.[0].id' "$OUT_JSON")
GIT_SHA=$(jq -r '.[0].gitCommitHash // "unknown"' "$OUT_JSON")
 
echo "build_id=$BUILD_ID" >> "${GITHUB_OUTPUT:-/dev/null}"
echo "apk_url=$APK_URL" >> "${GITHUB_OUTPUT:-/dev/null}"
echo "git_sha=$GIT_SHA" >> "${GITHUB_OUTPUT:-/dev/null}"
 
curl -fsSL "$APK_URL" -o ./artifacts/app.apk
adb install -r ./artifacts/app.apk
```

**On failure - download logs and ripgrep:**

```bash
# EAS prints log URL in build JSON when available
LOG_URL=$(jq -r '.[0].logFiles[]? // empty' eas-last-build.json | head -1)
curl -fsSL "$LOG_URL" -o ./artifacts/build.log
 
rg -n --max-count 5 'FAILURE|error:|❌|Gradle failure|pod install' ./artifacts/build.log
jq -r 'select(.level=="error") | .message' ./artifacts/build.jsonl 2>/dev/null || true
```

**What this demonstrates:**

* **`jq -er`** - exit non-zero when field missing; CI fails instead of installing empty URL.
* **`eas build:list` filters** - `platform`, `buildProfile`, `status` narrow to the artifact you intend.
* **`curl -fsSL`** - silent fail on 404 HTML error pages masquerading as artifacts.
* **`rg --max-count`** - first five failure lines without scrolling megabytes.
* **GitHub `$GITHUB_OUTPUT`** - downstream `adb install` or Maestro steps consume parsed fields.

## Deep Dive

### How It Works

* **EAS CLI** can emit **JSON** (`--json`) for `build:list`, `build:view`, `submit:list`, and similar - stable for scripting.
* **`jq`** is a JSON query language - filters run in milliseconds on CI-sized files.
* **`rg`** recursively searches text with sane defaults - faster than `grep -R`, respects `.gitignore`.
* **JSONL** (one JSON object per line) appears in exported telemetry - `jq` reads line-by-line with `-c` or `inputs`.

### EAS build:list Field Map

| jq path | Meaning |
| --- | --- |
| `.[0].id` | Build UUID for `eas build:view` |
| `.[0].status` | `finished`, `errored`, `canceled`, `in-progress` |
| `.[0].platform` | `ios` or `android` |
| `.[0].buildProfile` | `development`, `preview`, `production` |
| `.[0].gitCommitHash` | Commit EAS built |
| `.[0].artifacts.buildUrl` | Installable artifact (APK/AAB/IPA/simulator) |
| `.[0].applicationArchiveUrl` | Alternate archive link on some profiles |
| `.[0].logFiles[]` | Remote log URLs when present |

```bash
# Pretty-print full latest build
eas build:list --limit 1 --json | jq '.[0]'
 
# Table of last 10 builds
eas build:list --limit 10 --json \
  | jq -r '.[] | [.id[0:8], .platform, .buildProfile, .status, .createdAt] | @tsv'
 
# Find last errored Android production build
eas build:list --platform android --status errored --limit 1 --json \
  | jq '.[0] | {id, error: .error.message}'
```

### jq Patterns for CI

```bash
# Safe default with // operator
jq -r '.[0].artifacts.buildUrl // "none"'
 
# Require field or exit 1
jq -er '.[0].artifacts.buildUrl' build.json > apk.url
 
# Map all artifact URLs (matrix builds)
jq -r '.[] | select(.status=="finished") | .artifacts.buildUrl'
 
# Extract nested Expo config from custom metadata (if your pipeline adds it)
jq -r '.[0].metadata | fromjson? | .updateGroup // empty'
 
# Slurp JSON array from file without stdin pipe
jq -r '.[0].id' < eas-last-build.json
```

### rg Patterns for Logs

```bash
# First Gradle OOM in EAS Android log
rg -m 1 'OutOfMemoryError|Java heap space' artifacts/android-build.log
 
# CocoaPods resolution failure (iOS)
rg -n 'CocoaPods could not find compatible versions|pod install' artifacts/ios-build.log
 
# JSONL: lines containing error level (literal ripgrep)
rg '"level":"error"' artifacts/telemetry.jsonl
 
# Search CI folder but only markdown/json
rg -g '*.{json,jsonl,log}' 'buildProfile' .github/
 
# Context lines around match (like grep -C)
rg -C 3 'Metro bundler' artifacts/expo-start.log
```

### Pipelines: Comment PR with Preview Links

```bash
# After eas build in GitHub Actions
eas build:list --buildProfile preview --status finished --limit 3 --json > previews.json
 
jq -r '
  .[] | "- [\(.platform) \(.buildProfile)](\(.artifacts.buildUrl)) - `\(.gitCommitHash[0:7])`"
' previews.json >> "$GITHUB_STEP_SUMMARY"
```

### Bash Notes

```bash
# Install on macOS / Linux CI images
# brew install jq ripgrep   # macOS
# apt-get install -y jq     # Debian; rg from GitHub release or cargo
 
# Validate JSON before jq - catches eas CLI auth errors returned as text
jq empty < eas-last-build.json
 
# Avoid piping curl progress into jq
curl -fsSL "$URL" -o artifact.apk
 
# Large JSONL - stream with jq inputs
jq -c 'select(.level=="error")' < huge.jsonl | head -20
```

## Gotchas

* **Parsing `eas build:list` without `--json`** - human table is not machine-readable. **Fix:** always pass `--json`; pin `eas-cli` version in CI.
* **`jq` on empty array** - `.[0]` is `null`; silent bad deploys. **Fix:** `jq -er '.[0].artifacts.buildUrl'`.
* **Downloading IPA when CI needs APK** - wrong `platform` filter. **Fix:** `--platform android` and verify `buildProfile`.
* **`grep -R node_modules`** - slow and noisy. **Fix:** `rg` with `-g` globs or path limits.
* **Assuming log URL always exists** - older builds may omit `logFiles`. **Fix:** `eas build:view --json` fallback by `id`.
* **Secrets in JSON logs** - `EXPO_TOKEN` echo in debug steps. **Fix:** `rg` artifacts before uploading; mask secrets in CI.

WTI5a1pXZDFhV1JsY3k1cGIzeGpaMmx2T1RJMGZESXdNall3Tnc9PQ==

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `eas build:view --json` | You already have build UUID | Listing "latest green" across profiles |
| Node `JSON.parse` script | Complex transforms needing npm libs | One-field extraction - `jq` is simpler |
| `jless` / `fx` TUI | Interactive local exploration | GitHub Actions headless runners |
| Expo dashboard UI | Human QA browsing builds | Automated install pipelines |

## FAQs

jq vs python -m json.tool?

* `json.tool` pretty-prints only - no filtering.
* `jq` selects fields, maps arrays, and exits with errors for CI guards.

How do I get JSON for a specific build ID?

* `eas build:view <BUILD_ID> --json`
* Combine with `jq '.artifacts.buildUrl'`

rg not found on GitHub ubuntu-latest?

* `sudo apt-get install -y ripgrep` or `cargo install ripgrep`.
* Many teams add a setup step once per workflow.

Can jq parse eas submit output?

* `eas submit:list --json` - same patterns for submission status and ASC/Play links.

How do I search Metro logs in CI?

* Save Metro output as `metro.log` - `rg 'Bundling|ERROR|Unable to resolve' metro.log`.
* Pair with `npx expo export` failures logged in JSON wrappers.

## Related

* [CLI Basics for RN](https://docs.wahwei/reactnative.codeguides.io/cli/cli-basics-for-rn/) - `eas build:list` and `--json` flags
* [adb & Android Devices](https://docs.wahwei/reactnative.codeguides.io/cli/adb-and-android-devices/) - install APK from parsed URL
* [xcrun simctl & iOS Simulators](https://docs.wahwei/reactnative.codeguides.io/cli/xcrun-simctl-and-ios-simulators/) - install simulator `.app` from URL
* [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - profiles that shape JSON artifacts
* [GitHub Actions + EAS](https://docs.wahwei/reactnative.codeguides.io/cicd/github-actions-plus-eas/) - wire `EXPO_TOKEN` and build steps
* [Mobile CI/CD Basics](https://docs.wahwei/reactnative.codeguides.io/cicd/mobile-ci-cd-basics/) - where JSON parsing fits PR vs release lanes

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 19, 2026
