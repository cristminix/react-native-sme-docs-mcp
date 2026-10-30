# Mobile CI/CD Basics

10 examples to understand **PR checks**, **release pipelines**, and **nightly builds** for Expo SDK 57 apps - 7 basic and 3 intermediate.

Highlights / Mobile CI/CD Basics

* PR checks are fast gates - lint, typecheck, unit tests - every merge request
* Release pipelines produce store binaries and OTA bundles from tagged commits
* Nightly builds catch integration drift when PR volume is high
* Same npm scripts locally and in CI - no special CI-only commands
* EAS Build replaces laptop Xcode/Android Studio for reproducible native artifacts
* Separate PR feedback (minutes) from release trains (hours/days) - different failure budgets

## Prerequisites

CI/CD for React Native differs from web: you ship **native binaries** (store builds) and optionally **OTA JavaScript bundles** ([OTA Updates Basics](https://docs.wahwei/reactnative.codeguides.io/ota-updates/ota-updates-basics/)). Cloud builds via [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) keep signing keys off laptops.

```bash
npx create-expo-app@latest ShipApp --template blank-typescript
cd ShipApp
npx expo install eas-cli --save-dev
npx eas-cli@latest build:configure
```

Standardize scripts CI will call:

```json
{
  "scripts": {
    "lint": "expo lint",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "format:check": "prettier --check ."
  }
}
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**. E2E snippets assume dev or preview builds - not Expo Go alone.

---

## Basic Examples

### 1. Three Pipeline Types

Mobile teams run **three distinct automation lanes** with different speed, cost, and blast-radius goals.

```text
┌─────────────────────────────────────────────────────────────┐
│ PR checks        │ Every PR     │ 2–8 min  │ Block merge   │
├──────────────────┼──────────────┼──────────┼───────────────┤
│ Release pipeline │ Tag / main   │ 20–60 min│ Store + OTA   │
├──────────────────┼──────────────┼──────────┼───────────────┤
│ Nightly          │ Cron 02:00   │ 30–90 min│ Drift signal  │
└─────────────────────────────────────────────────────────────┘
```

| Lane | Triggers | Typical jobs | Blocks |
| --- | --- | --- | --- |
| PR checks | `pull_request` | lint, tsc, Jest | Merge to `main` |
| Release | `push` tag `v*`, manual | EAS build, Maestro smoke, submit | Store promotion |
| Nightly | `schedule: cron` | Full matrix build, contract tests | Nothing - alerts only |

* **PR checks fail fast** - no native compile until TypeScript and unit tests pass
* **Release pipelines** produce the **same artifact** QA signed off on and stores receive
* **Nightlies** catch "green PRs, broken together" when twenty branches land overnight

> **Related:** [CI Quality Gates](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/ci-quality-gates/) - script surface PR checks call

---

### 2. PR Checks - What Runs on Every Pull Request

PR automation answers: *"Is this diff safe to merge?"* - not *"Is this ready for the App Store?"*

```yaml
# .github/workflows/pr-checks.yml
name: PR Checks
on:
  pull_request:
    branches: [main]
 
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx expo customize tsconfig.json
      - run: npm run format:check
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test -- --ci
```

* Runs on **every push** to an open PR - developers get feedback before review
* **No EAS build** on every PR unless preview builds are explicitly budgeted ([Preview Builds on PRs](https://docs.wahwei/reactnative.codeguides.io/cicd/preview-builds-on-prs/))
* Branch protection requires the `quality` check - policy, not honor system
* Same commands locally: `npm run lint && npm run typecheck && npm test`

> **Related:** [Mobile Testing Basics](https://docs.wahwei/reactnative.codeguides.io/testing/mobile-testing-basics/) - pyramid layers PR checks cover

---

### 3. Release Pipeline - Tag to Store Binary

Release automation answers: *"Build and ship the version we tagged."*

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags: ["v*"]
 
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: npm ci
      - run: npm run typecheck && npm run test -- --ci
      - run: eas build --profile production --platform all --non-interactive
```

```json
// eas.json (excerpt)
{
  "build": {
    "production": {
      "autoIncrement": true,
      "channel": "production"
    }
  }
}
```

* Trigger on **semver Git tags** (`v2.4.0`) - tag ↔ binary traceability
* `EXPO_TOKEN` robot account - never personal passwords in CI ([GitHub Actions + EAS](https://docs.wahwei/reactnative.codeguides.io/cicd/github-actions-plus-eas/))
* **`production` profile** maps to store signing credentials in EAS
* QA tests the **build ID** from this pipeline - not a laptop archive

> **Related:** [Build Profiles & Flavors](https://docs.wahwei/reactnative.codeguides.io/eas-build/build-profiles-and-flavors/) - `preview` vs `production`

---

### 4. Nightly Builds - Catch Integration Drift

When PR volume is high, individual green checks hide **cross-branch integration failures**. Nightlies run on a schedule without blocking merges.

```yaml
# .github/workflows/nightly.yml
name: Nightly Integration
on:
  schedule:
    - cron: "0 6 * * 1-5"  # weekdays 06:00 UTC
  workflow_dispatch:
 
jobs:
  nightly:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { ref: main }
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: npm ci
      - run: npx expo-doctor
      - run: npm run test -- --ci
      - run: eas build --profile preview --platform android --non-interactive
```

* **Alerts channel** (`#mobile-ci`) on failure - do not block daytime merges
* Include `npx expo-doctor` - catches SDK skew nobody touched in today's PRs
* Build **one platform** nightly if credits are tight; rotate iOS/Android weekly
* Pair with **contract tests** against staging APIs ([Contract Tests for APIs](https://docs.wahwei/reactnative.codeguides.io/testing/contract-tests-for-apis/))

---

### 5. PR Checks vs Preview Builds

Not every PR needs a native binary. Split **fast gates** from **optional preview builds**.

| Signal | PR check only | + Preview build |
| --- | --- | --- |
| Copy change in `Text` | ✓ | ✗ |
| New native module (`expo-camera`) | lint/tsc | ✓ |
| Navigation refactor | unit tests | ✓ (Maestro smoke) |
| Config plugin change | tsc + doctor | ✓ |

```yaml
# Label-gated preview - saves EAS credits
on:
  pull_request:
    types: [labeled]
jobs:
  preview:
    if: contains(github.event.pull_request.labels.*.name, 'needs-preview')
    # ... eas build --profile preview
```

* Default: **quality gates only** - preview on label or `paths` filter for native-impacting dirs
* Preview builds install via **QR code** on real devices - see [Preview Builds on PRs](https://docs.wahwei/reactnative.codeguides.io/cicd/preview-builds-on-prs/)
* Document the label in CONTRIBUTING.md so designers know when to add `needs-preview`

---

### 6. OTA in the Release Train

JS-only fixes ship via `eas update` **inside** the release pipeline - native changes still need `eas build`.

```yaml
# .eas/workflows/release-ota.yml (excerpt)
jobs:
  quality:
    steps:
      - uses: eas/checkout
      - uses: eas/install_node_modules
      - run: npm run typecheck && npm run test -- --ci
 
  update_production:
    needs: [quality]
    type: update
    params:
      channel: production
      message: ${{ github.sha }}
```

* OTA runs **after** the same quality scripts as PR checks
* **`runtimeVersion`** must match the store binary users installed - [Runtime Version Policy](https://docs.wahwei/reactnative.codeguides.io/ota-updates/runtime-version-policy/)
* Never OTA a bundle that imports a native module absent from the installed binary
* Rollback path: `eas update --roll-back` - [Rollback Runbook](https://docs.wahwei/reactnative.codeguides.io/ota-updates/rollback-runbook/)

---

### 7. Artifact Promotion - Same Binary CI to Store

The anti-pattern: QA tests a laptop build; stores receive a different cloud build.

```text
❌ Laptop build → QA sign-off → CI rebuild → Store
✅ EAS build ID abc123 → QA sign-off → eas submit --id abc123 → Store
```

```bash
# Promote the exact build QA tested
eas submit --platform ios --id <BUILD_ID> --non-interactive
eas submit --platform android --id <BUILD_ID> --non-interactive
```

* Store **build IDs** in release notes and Slack threads
* `eas submit --latest` is convenient but risky if a newer build queued after QA
* [Automated Store Promotion](https://docs.wahwei/reactnative.codeguides.io/cicd/automated-store-promotion/) gates submit on Maestro smoke

> **Related:** [EAS Submit](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-submit/) - App Store Connect and Play Console handoff

---

## Intermediate Examples

### 8. Monorepo-Aware PR Triggers

Turborepo monorepos should not run mobile CI when only the marketing site changed.

```yaml
on:
  pull_request:
    paths:
      - "apps/mobile/**"
      - "packages/ui/**"
      - "package-lock.json"
```

```yaml
# Or path filter action
- uses: dorny/paths-filter@v3
  id: changes
  with:
    filters: |
      mobile:
        - 'apps/mobile/**'
        - 'packages/**'
- if: steps.changes.outputs.mobile == 'true'
  run: npm run typecheck -w apps/mobile
```

* Root lockfile changes always trigger mobile - dependency graph may have shifted
* `turbo run lint typecheck test --filter=mobile` fans out with cache - [GitHub Actions + EAS](https://docs.wahwei/reactnative.codeguides.io/cicd/github-actions-plus-eas/)
* Nightly still builds **full main** - path filters are for PR speed, not integration coverage

---

### 9. Release Train with Staged Gates

Advanced teams chain **quality → build → E2E → submit** in one workflow file.

```yaml
# .eas/workflows/store-release.yml (sketch)
name: Store Release
on:
  push:
    tags: ["v*"]
 
jobs:
  quality:
    steps:
      - uses: eas/checkout
      - uses: eas/install_node_modules
      - run: npm run lint && npm run typecheck && npm run test -- --ci
 
  build_ios:
    needs: [quality]
    type: build
    params: { platform: ios, profile: production }
 
  smoke_ios:
    needs: [build_ios]
    type: maestro
    params:
      build_id: ${{ needs.build_ios.outputs.build_id }}
      flow_path: [".maestro/smoke.yml"]
 
  submit_ios:
    needs: [smoke_ios]
    type: submit
    params:
      platform: ios
      build_id: ${{ needs.build_ios.outputs.build_id }}
```

* **`needs`** chains enforce ordering - submit cannot run if Maestro failed
* Smoke flows stay **short** - login, home, one critical tab ([Maestro E2E](https://docs.wahwei/reactnative.codeguides.io/testing/maestro-e2e/))
* Android and iOS can parallelize after quality - see [EAS Workflows](https://docs.wahwei/reactnative.codeguides.io/cicd/eas-workflows/) checklist

---

### 10. Coordinating JS, Native, and Backend

Mobile releases rarely ship alone. Document **deploy dependencies** in a release calendar.

```text
Week 12 release train
  Tue - Backend API v3 deploys to staging (contract tests green)
  Wed - eas build production (native + embedded JS)
  Thu - eas update production (JS hotfix if needed, same runtimeVersion)
  Fri - eas submit after Maestro + manual QA
  Mon - Staged rollout 10% → 50% → 100%
```

| Change type | Ships via | Backend dependency |
| --- | --- | --- |
| Button color | OTA | None |
| New API field (optional) | OTA | Backend live first |
| New native module | Store build | Feature flag off until binary live |
| Breaking API | Store + backend same window | Coordinate freeze |

* [Release Train Calendar](https://docs.wahwei/reactnative.codeguides.io/cicd/release-train-calendar/) expands the calendar model
* Feature flags decouple **binary live** from **feature visible** - [Feature Flags for Safe Rollout](https://docs.wahwei/reactnative.codeguides.io/error-resilience/feature-flags-for-safe-rollout/)
* Contract tests in PR checks catch API shape drift before nightly

---

## Anti-Patterns

| Anti-pattern | Why it fails |
| --- | --- |
| `eas build` on every PR commit | Burns credits; 20-minute feedback loops |
| Skipping tests on release tags | "Hotfix" tags ship regressions |
| Laptop archive to TestFlight | Non-reproducible; signing drift |
| OTA without channel discipline | Staging bundle hits production users |
| One pipeline for everything | PR waits 45 minutes; team disables CI |

---

## FAQs

What belongs in PR checks vs release?

PR: lint, format, tsc, unit tests, optional contract tests. Release: EAS build, E2E smoke, submit, OTA to production channel.

How often should nightlies run?

Weekdays for active teams; weekly for small apps. Increase frequency after SDK upgrades or monorepo migrations.

Can I skip CI with a commit message?

EAS Workflows honor `[eas skip]` on push triggers. Prefer label-gated previews over routine skip tokens - branch protection should still require PR checks.

Do I need both GitHub Actions and EAS Workflows?

Many teams use GitHub Actions for PR checks and EAS Workflows for build/test/submit chains. Keep npm scripts identical across both.

## Related

* [EAS Workflows](https://docs.wahwei/reactnative.codeguides.io/cicd/eas-workflows/) - YAML checklist for build, test, submit, update jobs
* [GitHub Actions + EAS](https://docs.wahwei/reactnative.codeguides.io/cicd/github-actions-plus-eas/) - secrets, caching, monorepo triggers
* [Preview Builds on PRs](https://docs.wahwei/reactnative.codeguides.io/cicd/preview-builds-on-prs/) - QR distribution for QA
* [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - first cloud build and `eas.json`
* [OTA Updates Basics](https://docs.wahwei/reactnative.codeguides.io/ota-updates/ota-updates-basics/) - what OTA can change
* [Mobile Testing Basics](https://docs.wahwei/reactnative.codeguides.io/testing/mobile-testing-basics/) - test pyramid for CI layers
* [CI/CD Best Practices](https://docs.wahwei/reactnative.codeguides.io/cicd/best-practices/) - 25-item summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
