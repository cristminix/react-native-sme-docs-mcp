# GitHub Actions + EAS

A cookbook for wiring **GitHub Actions** to **EAS Build**, **Submit**, and **Update** - covering secrets, caching, monorepo triggers, and `expo-github-action`.

Highlights / GitHub Actions + EAS

* expo-github-action installs EAS CLI and authenticates with EXPO\_TOKEN
* npm ci + Node 20 + setup-node cache: npm for deterministic PR checks
* Monorepos use paths-filter or turbo --filter to skip unrelated packages
* Never store Apple passwords in YAML - EAS credentials and ASC API keys only
* Hybrid pattern: GitHub Actions for PR gates, EAS Workflows for build chains
* Concurrency groups cancel stale runs when contributors push fixup commits

## Recipe

> Quick-reference recipe card - copy-paste ready.

```yaml
# .github/workflows/eas-build.yml
name: EAS Build
on:
  workflow_dispatch:
  push:
    tags: ["v*"]
 
env:
  EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
 
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: npm ci
      - run: npm run typecheck && npm run test -- --ci
      - run: eas build --profile production --platform all --non-interactive
```

```bash
# Create robot token (once, locally)
npx eas-cli@latest login
# Expo dashboard → Access Tokens → Create token → paste into GitHub Secrets as EXPO_TOKEN
```

**When to reach for this:**

* PR quality gates on GitHub free/cheap minutes; EAS cloud for native compiles.
* Tag-driven releases (`v*`) that must not depend on a developer laptop.
* Monorepos where only `apps/mobile` should trigger mobile workflows.
* Teams already using branch protection and required status checks on GitHub.

## Working Example

**Project layout:**

```text
your-expo-app/
  .github/workflows/
    pr-checks.yml
    eas-release.yml
  eas.json
  app.json
  package-lock.json
```

### PR checks (no EAS credits)

```yaml
# .github/workflows/pr-checks.yml
name: PR Checks
on:
  pull_request:
    branches: [main]
 
concurrency:
  group: pr-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
 
jobs:
  quality:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx expo customize tsconfig.json
      - run: npm run format:check
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test -- --ci --passWithNoTests
```

### Release build with expo-github-action

```yaml
# .github/workflows/eas-release.yml
name: EAS Release
on:
  push:
    tags: ["v*"]
 
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
          eas-cache: true
      - run: npm ci
      - run: npx expo-doctor
      - run: npm run typecheck && npm run test -- --ci
      - name: Build production
        run: eas build --profile production --platform all --non-interactive --wait
      - name: Submit iOS
        run: eas submit --platform ios --latest --non-interactive
      - name: Submit Android
        run: eas submit --platform android --latest --non-interactive
```

### Monorepo path filter

```yaml
# .github/workflows/mobile-pr.yml
name: Mobile PR
on:
  pull_request:
 
jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      mobile: ${{ steps.filter.outputs.mobile }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            mobile:
              - 'apps/mobile/**'
              - 'packages/ui/**'
              - 'packages/api-client/**'
              - 'package-lock.json'
 
  quality:
    needs: changes
    if: needs.changes.outputs.mobile == 'true'
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/mobile
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: package-lock.json
      - run: npm ci
      - run: npm run lint && npm run typecheck && npm run test -- --ci
```

```bash
# Monorepo root alternative with Turborepo
npx turbo run lint typecheck test --filter=mobile
```

**What this demonstrates:**

* **`EXPO_TOKEN`** authenticates `eas build` / `submit` without interactive login.
* **`eas-cache: true`** on `expo-github-action` speeds repeated CLI invocations.
* **`npm ci`** + `cache: npm` restores `node_modules` between workflow runs.
* **Path filters** skip mobile CI when only `apps/web` changes.
* **`--non-interactive`** is mandatory in CI - no prompts.

## Deep Dive

### Secrets Matrix

| Secret | Where | Used for |
| --- | --- | --- |
| `EXPO_TOKEN` | GitHub Secrets | `eas build`, `submit`, `update`, workflow runs |
| `NPM_TOKEN` | GitHub Secrets | Private packages during `npm ci` |
| App Store Connect API key | EAS credentials | iOS submit - not duplicated in GitHub if using EAS Submit |
| Play service account JSON | EAS credentials | Android submit |

Create `EXPO_TOKEN` from an Expo **robot** or **CI** access token - not a developer's personal token tied to 2FA sessions.

```bash
# Verify token locally before adding to GitHub
EXPO_TOKEN=xxx npx eas-cli@latest whoami
```

### expo-github-action Options

| Input | Purpose |
| --- | --- |
| `eas-version` | Pin CLI (`latest` or `16.x.x`) |
| `token` | Maps to `EXPO_TOKEN` |
| `eas-cache` | Cache EAS CLI download between jobs |
| `packager` | `npm` / `yarn` / `pnpm` - match repo |

### Caching Strategies

```yaml
# npm - simplest
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: npm
 
# Monorepo - point cache at root lockfile
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: npm
    cache-dependency-path: package-lock.json
 
# Turborepo remote cache (optional, larger repos)
env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

* **`npm ci`** always - not `npm install` - lockfile is the contract
* EAS Build has its own dependency install on Expo servers - GitHub cache does not speed cloud native compile
* Cache **saves PR check minutes**, not EAS build queue time

### Monorepo Trigger Patterns

| Pattern | Pros | Cons |
| --- | --- | --- |
| `paths:` on `on.pull_request` | Native GitHub, zero deps | Coarse - misses shared package renames |
| `dorny/paths-filter` | Per-job boolean outputs | Extra action dependency |
| `turbo --filter=[origin/main...]` | Affected-only in large repos | Requires Turbo graph setup |
| Always run root `turbo run lint` | Simple mental model | Slower on docs-only PRs |

For release tags, **always build from repo root** with full `npm ci` - path filters are PR-only optimizations.

### Hybrid: GitHub Actions + EAS Workflows

```text
PR opened → GitHub Actions (lint, tsc, test)     ← cheap, every push
Tag pushed  → EAS Workflow (build → Maestro → submit) ← native infra, gated chain
```

* Duplicate YAML is acceptable if **npm scripts stay identical**
* GitHub required checks: `quality` job from Actions
* EAS Workflows own `type: build` / `maestro` / `submit` - [EAS Workflows](https://docs.wahwei/reactnative.codeguides.io/cicd/eas-workflows/)

## Gotchas

* **Missing `EXPO_TOKEN`** - `eas build` hangs or prompts and fails. **Fix:** Organization secret available to the workflow; verify with `eas whoami` step.
* **`npm install` in CI** - Non-deterministic installs; "passes on CI, fails locally." **Fix:** `npm ci` when `package-lock.json` exists.
* **Running submit with `--latest` after QA tested older build** - Store gets untested binary. **Fix:** Pass `--id <BUILD_ID>` from the build step output.
* **Path filter ignores lockfile** - Dependency bump in root does not trigger mobile checks. **Fix:** Include `package-lock.json` / `pnpm-lock.yaml` in filter paths.
* **Apple ID password in GitHub Secrets** - Breaks on 2FA; security anti-pattern. **Fix:** EAS-managed credentials + App Store Connect API key.
* **No `concurrency` on PR workflows** - Six queued runs for rapid fixup pushes. **Fix:** `cancel-in-progress: true`.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| GitHub Actions + expo-github-action | PR gates + tag releases on GH | You want build→Maestro→submit only on EAS infra |
| EAS Workflows only | Single YAML home on Expo | You need GH marketplace actions ecosystem |
| Bitrise / CircleCI | Enterprise standard already paid | Greenfield Expo team - EAS is lower ceremony |
| Local `eas build` | Emergency one-off | Normal release train - non-reproducible |

## FAQs

Where do I store EXPO\_TOKEN?

GitHub → Settings → Secrets and variables → Actions → `EXPO_TOKEN`. For monorepos, organization-level secret shared across mobile repos.

Should I pin eas-version?

Pin (`16.4.0`) for reproducibility; use `latest` when you want CLI fixes automatically. Align with `eas-cli` devDependency in `package.json` when possible.

How do I run EAS build only on labels?

```yaml
on:
  pull_request:
    types: [labeled]
jobs:
  preview:
    if: contains(github.event.pull_request.labels.*.name, 'eas-preview')
```

See [Preview Builds on PRs](https://docs.wahwei/reactnative.codeguides.io/cicd/preview-builds-on-prs/).

pnpm monorepo?

```yaml
- uses: pnpm/action-setup@v4
  with: { version: 9 }
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: pnpm
- run: pnpm install --frozen-lockfile
```

Set `packager: pnpm` on `expo-github-action` when applicable.

Can GitHub Actions run Maestro?

Yes - but you manage emulator boot, APK install, and caching. EAS Workflows `type: maestro` is lower ceremony for Expo teams - [Maestro E2E](https://docs.wahwei/reactnative.codeguides.io/testing/maestro-e2e/).

## Related

* [Mobile CI/CD Basics](https://docs.wahwei/reactnative.codeguides.io/cicd/mobile-ci-cd-basics/) - three pipeline types
* [EAS Workflows](https://docs.wahwei/reactnative.codeguides.io/cicd/eas-workflows/) - YAML checklist for build chains
* [Preview Builds on PRs](https://docs.wahwei/reactnative.codeguides.io/cicd/preview-builds-on-prs/) - label-gated preview automation
* [CI Quality Gates](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/ci-quality-gates/) - scripts both platforms call
* [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - profiles and credentials
* [Expo Account, Projects & Permissions](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-account-projects-and-permissions/) - robot tokens and roles
* [Monorepo with Turborepo](https://docs.wahwei/reactnative.codeguides.io/project-setup/monorepo-with-turborepo/) - `turbo run` in CI

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
