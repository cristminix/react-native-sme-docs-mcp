# EAS Workflows

A **checklist** for YAML pipelines that **build**, **test**, **submit**, and **update** Expo SDK 57 apps on EAS infrastructure. Work through every item before calling your release train production-ready.

Highlights / EAS Workflows

* Workflow files live in `.eas/workflows/` - versioned beside `eas.json`
* Job types: custom steps, build, maestro, submit, update - chain with `needs`
* PR triggers use `pull\_request`; releases use `push` tags or `workflow\_dispatch`
* Quality gates run before `type: build` - same npm scripts as GitHub Actions
* Maestro jobs consume `build\_id` from an upstream build job - no manual APK upload
* Submit and update jobs promote artifacts already produced - never rebuild at submit time

## How to Use This Checklist

* Run **Tier 1–2** before your first `workflow:run`; **Tier 3–5** before store automation goes live.
* Keep **one workflow per intent** - `pr-quality.yml`, `preview-pr.yml`, `store-release.yml` - not one mega-file.
* Mirror npm scripts from [CI Quality Gates](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/ci-quality-gates/) - developers and workflows call the same commands.
* Re-run failed tiers after fixes; a green local `eas build` does not mean workflow YAML is wired correctly.

### Tier Overview

| Tier | Items | When | Owner |
| --- | --- | --- | --- |
| **1** | 1–6 | First workflow | Mobile engineer |
| **2** | 7–12 | PR + preview automation | Mobile + QA |
| **3** | 13–18 | Store release train | EM + mobile lead |
| **4** | 19–24 | OTA + rollback readiness | Mobile + backend |
| **5** | 25–30 | Operations + cost control | Platform / EM |

---

## Tier 1: Project Setup (1–6)

1. **EAS project linked** - `app.json` / `app.config.ts` contains `extra.eas.projectId` after `eas init`.

   * **Signal:** `eas workflow:run` prompts to create a project interactively.
   * **Fix:** `npx eas-cli@latest init` on SDK 57; commit the generated project ID.
   * **Priority:** P0 - blocks all workflow runs.
2. **`eas.json` profiles exist for each intent** - at minimum `preview`, `production`, and `e2e-test`.

   * **Signal:** Workflow `params.profile` references a missing key.
   * **Fix:** [Build Profiles & Flavors](https://docs.wahwei/reactnative.codeguides.io/eas-build/build-profiles-and-flavors/).
   * **Priority:** P0.
3. **`.eas/workflows/` directory committed** - YAML is source code, reviewed like application changes.

   * **Signal:** Workflows only exist on one engineer's laptop.
   * **Fix:** Add `quality-gates.yml` first; expand from there.
   * **Priority:** P0.
4. **`EXPO_TOKEN` robot account in CI secrets** - not a personal access token tied to one developer.

   * **Signal:** Workflows fail when that developer is on vacation.
   * **Fix:** Expo dashboard → Access Tokens → machine user; store in GitHub / EAS secrets.
   * **Priority:** P0.
5. **Workflow CLI tested locally** - `npx eas-cli@latest workflow:run .eas/workflows/quality-gates.yml`.

   * **Signal:** First run fails on YAML syntax discovered only in cloud.
   * **Fix:** Run manually before wiring `on: pull_request`.
   * **Priority:** P1.
6. **Concurrency group configured** - cancel superseded runs on rapid PR pushes.

   * **Signal:** Five identical builds queue for one PR.
   * **Fix:**

```yaml
concurrency:
  cancel_in_progress: true
  group: ${{ workflow.filename }}-${{ github.ref }}
```

* **Priority:** P1.

---

## Tier 2: Quality & PR Workflows (7–12)

7. **Custom quality job before any `type: build`** - lint, typecheck, test on `eas/checkout`.
   * **Signal:** Native builds start while TypeScript is broken.
   * **Fix:**

```yaml
# .eas/workflows/quality-gates.yml
name: Quality Gates
on:
  pull_request:
    branches: [main]
 
jobs:
  quality:
    steps:
      - uses: eas/checkout
      - uses: eas/use_npm_token
      - uses: eas/install_node_modules
      - run: npx expo customize tsconfig.json
      - run: npm run format:check
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test -- --ci
```

* **Priority:** P0 on every PR.

8. **`needs: [quality]` on downstream build jobs** - builds wait for green scripts.

   * **Signal:** `build_ios` and `quality` run in parallel.
   * **Fix:** Add `needs` array on every `type: build` job.
   * **Priority:** P0.
9. **PR trigger matches branch policy** - `pull_request.branches: [main]` or `release/*`.

   * **Signal:** Workflows never fire on team forks or wrong base branch.
   * **Fix:** Align with GitHub branch protection targets.
   * **Priority:** P1.
10. **Preview build profile for PR workflows** - `distribution: internal` or `simulator` / `apk` as needed.

    * **Signal:** PR workflow tries `production` credentials.
    * **Fix:** Separate `preview` profile in `eas.json` - [Internal Distribution](https://docs.wahwei/reactnative.codeguides.io/eas-build/internal-distribution/).
    * **Priority:** P0 for PR previews.
11. **Build job outputs `build_id` consumed downstream** - Maestro and submit reference the same artifact.

    * **Signal:** Submit job calls `--latest` instead of pinned ID.
    * **Fix:**

```yaml
  build_android:
    needs: [quality]
    type: build
    params:
      platform: android
      profile: preview
 
  maestro_smoke:
    needs: [build_android]
    type: maestro
    params:
      build_id: ${{ needs.build_android.outputs.build_id }}
      flow_path: [".maestro/smoke.yml"]
```

```
- **Priority:** P0 before automated submit.
```

12. **Maestro `appId` matches `eas.json` bundle IDs** - flows launch the built app, not Expo Go.
- **Signal:** Maestro job succeeds locally but fails in workflow - wrong `appId`.
- **Fix:** [Maestro E2E](https://docs.wahwei/reactnative.codeguides.io/testing/maestro-e2e/).
- **Priority:** P0 on first E2E workflow.

---

## Tier 3: Build, Submit & Release (13–18)

13. **Production build workflow triggered by semver tag** - `on.push.tags: ["v*"]`.

    * **Signal:** Every merge to `main` submits to stores.
    * **Fix:** Tag-driven release; manual `workflow_dispatch` for hotfixes.
    * **Priority:** P0.
14. **`type: build` with `profile: production` and `autoIncrement`** - build numbers advance without hand-editing plists.

    * **Signal:** Store rejects duplicate `versionCode` / build number.
    * **Fix:** `"autoIncrement": true` in `eas.json` production profile.
    * **Priority:** P0.
15. **`type: submit` references `build_id` from paired build job** - not `--latest`.

    * **Signal:** Store receives a build QA never tested.
    * **Fix:**

```yaml
  submit_ios:
    needs: [smoke_ios]
    type: submit
    params:
      platform: ios
      build_id: ${{ needs.build_ios.outputs.build_id }}
```

```
- **Priority:** P0 - [Automated Store Promotion](./automated-store-promotion.md).
```

16. **Maestro smoke gates submit** - at least login + one revenue-critical path.
- **Signal:** Submit runs immediately after build with no device verification.
- **Fix:** `needs: [maestro_smoke]` on submit jobs.
- **Priority:** P0 for automated promotion.

17. **iOS and Android submit jobs parallel after platform-specific smoke** - do not serialize unnecessarily.

    * **Signal:** Android waits for iOS TestFlight processing.
    * **Fix:** Separate build → smoke → submit chains per platform.
    * **Priority:** P1.
18. **Slack / email notification on workflow failure** - on-call knows before users do.

    * **Signal:** Failed release discovered Monday morning.
    * **Fix:** GitHub notifications or custom step posting to webhook.
    * **Priority:** P1.

---

## Tier 4: OTA Update Workflows (19–24)

19. **`type: update` job targets explicit channel** - `production`, `staging`, not implicit default.

    * **Signal:** Staging bundle promoted to production channel by typo.
    * **Fix:** [Release Channels & Branches](https://docs.wahwei/reactnative.codeguides.io/ota-updates/release-channels-and-branches/).
    * **Priority:** P0.
20. **OTA workflow runs quality gates first** - same lint/tsc/test as PR checks.

    * **Signal:** Broken TypeScript ships via OTA.
    * **Fix:** `needs: [quality]` before `type: update`.
    * **Priority:** P0.
21. **`runtimeVersion` policy documented** - OTA compatible only with matching store binaries.

    * **Signal:** OTA crashes on older app versions.
    * **Fix:** [Runtime Version Policy](https://docs.wahwei/reactnative.codeguides.io/ota-updates/runtime-version-policy/).
    * **Priority:** P0.
22. **OTA message includes Git SHA** - traceability in EAS dashboard.

    * **Signal:** Cannot correlate update with merged PR.
    * **Fix:** `message: ${{ github.sha }}` in update params.
    * **Priority:** P1.
23. **Rollback workflow documented and tested** - `eas update --roll-back` or channel republish.

    * **Signal:** First production incident has no runbook.
    * **Fix:** [Rollback Runbook](https://docs.wahwei/reactnative.codeguides.io/ota-updates/rollback-runbook/).
    * **Priority:** P0 before first OTA to production.
24. **Native-impacting changes blocked from OTA-only workflow** - config plugin edits trigger build workflow.

    * **Signal:** OTA imports `expo-camera` not in installed binary.
    * **Fix:** Path filters or required review label `native-change`.
    * **Priority:** P0.

---

## Tier 5: Operations & Cost (25–30)

25. **Skip tokens documented** - `[eas skip]` in commit message for docs-only pushes.

    * **Signal:** Team avoids workflows entirely because they cannot skip.
    * **Fix:** Document in CONTRIBUTING.md; do not overuse.
    * **Priority:** P2.
26. **PR preview builds label-gated or path-filtered** - not every typo triggers EAS build.

    * **Signal:** EAS credit burn exceeds budget mid-quarter.
    * **Fix:** [Preview Builds on PRs](https://docs.wahwei/reactnative.codeguides.io/cicd/preview-builds-on-prs/).
    * **Priority:** P1.
27. **Build profile matrix documented** - which profile runs on PR, nightly, release.

    * **Signal:** New engineer triggers production build from feature branch.
    * **Fix:** Table in README or [Mobile CI/CD Basics](https://docs.wahwei/reactnative.codeguides.io/cicd/mobile-ci-cd-basics/).
    * **Priority:** P1.
28. **Secrets rotated on schedule** - `EXPO_TOKEN`, App Store Connect API key, Play service account.

    * **Signal:** Token leak requires emergency revoke with no backup.
    * **Fix:** Quarterly rotation calendar entry.
    * **Priority:** P1.
29. **Workflow duration monitored** - quality + build + Maestro p95 tracked.

    * **Signal:** Release train misses Friday window silently.
    * **Fix:** EAS dashboard build times; optimize `install_node_modules` caching.
    * **Priority:** P2.
30. **Disaster drill: failed Maestro blocks submit** - verified in staging, not assumed.

    * **Signal:** Submit job has loose `needs` wiring; smoke failure ignored.
    * **Fix:** Intentionally fail a flow in staging workflow quarterly.
    * **Priority:** P1.

---

## Reference: Job Types

| `type` | Purpose | Key `params` |
| --- | --- | --- |
| *(custom steps)* | lint, tsc, test, doctor | `run: npm run …` |
| `build` | Cloud native binary | `platform`, `profile` |
| `maestro` | E2E on built artifact | `build_id`, `flow_path` |
| `submit` | Store upload | `platform`, `build_id` |
| `update` | OTA bundle | `channel`, `message` |

### Full Release Workflow Sketch

```yaml
# .eas/workflows/store-release.yml
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
 
  build_android:
    needs: [quality]
    type: build
    params: { platform: android, profile: production }
 
  smoke_android:
    needs: [build_android]
    type: maestro
    params:
      build_id: ${{ needs.build_android.outputs.build_id }}
      flow_path: [".maestro/smoke.yml"]
 
  submit_android:
    needs: [smoke_android]
    type: submit
    params:
      platform: android
      build_id: ${{ needs.build_android.outputs.build_id }}
 
  update_production:
    needs: [submit_android]
    type: update
    params:
      channel: production
      message: "Post-release OTA sync ${{ github.sha }}"
```

---

## FAQs

Where do workflow files live?

`.eas/workflows/*.yml` at the project root (sibling to `eas.json`). Name by intent: `quality-gates.yml`, `preview-pr.yml`, `store-release.yml`.

How do I run a workflow manually?

```bash
npx eas-cli@latest workflow:run .eas/workflows/quality-gates.yml
```

Use `workflow_dispatch` in `on:` for GitHub UI triggers.

GitHub Actions or EAS Workflows?

GitHub Actions excels at PR checks on every push. EAS Workflows excel at build → Maestro → submit chains on Expo infra. Many teams use both - keep npm scripts identical.

Can one workflow do build and OTA?

Yes - chain `type: build` then `type: update` with `needs`. OTA-only hotfixes can use a separate workflow with just quality + update jobs.

## Related

* [Mobile CI/CD Basics](https://docs.wahwei/reactnative.codeguides.io/cicd/mobile-ci-cd-basics/) - PR vs release vs nightly lanes
* [GitHub Actions + EAS](https://docs.wahwei/reactnative.codeguides.io/cicd/github-actions-plus-eas/) - hybrid CI setup
* [Automated Store Promotion](https://docs.wahwei/reactnative.codeguides.io/cicd/automated-store-promotion/) - gated submit after smoke
* [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - profiles and first build
* [OTA Updates Basics](https://docs.wahwei/reactnative.codeguides.io/ota-updates/ota-updates-basics/) - OTA constraints
* [Maestro E2E](https://docs.wahwei/reactnative.codeguides.io/testing/maestro-e2e/) - flow files and `e2e-test` profile
* [CI Quality Gates](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/ci-quality-gates/) - scripts workflows should call

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
