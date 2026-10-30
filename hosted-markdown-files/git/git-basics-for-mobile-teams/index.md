# Git Basics for Mobile Teams

A cookbook for a **branching model that respects store release freezes** - trunk-based integration on `main`, short-lived feature branches, and release lanes that do not collide with App Store or Play review windows.

Highlights / Git Basics for Mobile Teams

* main is always shippable - release branches cut from tags, not long-lived forks
* Code freeze windows block feature merges into release/\* during store review
* Separate lanes for store binaries (tags) and OTA bundles (channel branches)
* Lockfiles and native folders committed - never gitignore package-lock.json
* Conventional commits with ticket IDs make cherry-picks and hotfixes traceable
* Pre-commit hooks run lint and typecheck - same scripts CI will call

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
# Daily feature work
git checkout main && git pull --ff-only
git checkout -b feat/SHIP-412-checkout-summary
# ... commits ...
git push -u origin feat/SHIP-412-checkout-summary
# Open PR → squash merge to main after review + CI green
```

```bash
# Release cut (Tuesday - before Thursday freeze)
git checkout main && git pull --ff-only
git checkout -b release/2.6.0
git push -u origin release/2.6.0
# Only bugfixes cherry-picked or PRs targeting release/2.6.0 until tag
```

```bash
# Tag after QA sign-off (post-review)
git checkout release/2.6.0
git tag -a v2.6.0 -m "Release 2.6.0 - build_id abc123"
git push origin v2.6.0
```

```text
Branch lanes (mobile)
  main              ← integration; always green CI
  feat/*            ← days, squash merge
  release/X.Y       ← weeks; freeze during store review
  hotfix/X.Y.Z      ← hours; from tag, cherry-pick to main
  ota/production    ← optional long-lived for channel-only JS (see GitHub Flow page)
```

**When to reach for this:**

* First mobile team adopting Git after ad-hoc laptop builds.
* Store submission windows where merging features mid-review risks rejection.
* Coordinating OTA JavaScript updates with tagged store binaries.
* Onboarding engineers who know web Git but not native artifact discipline.

**When to avoid:**

* Solo side project with no QA or store cadence - `main` + tags may be enough.
* GitFlow with `develop` lasting months - mobile store review punishes drift.

## Working Example

End-to-end **feature → release → freeze → tag** for an Expo SDK 57 app shipping through EAS.

**Step 1 - Bootstrap repo hygiene**

```bash
npx create-expo-app@latest ShipApp --template blank-typescript
cd ShipApp
git init
```

```gitignore
# .gitignore - mobile essentials (do NOT ignore lockfile)
node_modules/
.expo/
dist/
*.jks
*.p8
*.p12
*.mobileprovision
ios/Pods/
android/.gradle/
android/app/build/
```

```json
{
  "scripts": {
    "lint": "expo lint",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "format:check": "prettier --check .",
    "prepare": "husky"
  }
}
```

```bash
# .husky/pre-commit
npm run format:check && npm run lint && npm run typecheck
```

* Commit `package-lock.json` - CI uses `npm ci` ([Mobile CI/CD Basics](https://docs.wahwei/reactnative.codeguides.io/cicd/mobile-ci-cd-basics/))
* Never commit signing keys - EAS stores credentials ([GitHub Actions + EAS](https://docs.wahwei/reactnative.codeguides.io/cicd/github-actions-plus-eas/))

**Step 2 - Feature branch with ticket-scoped commits**

```bash
git checkout main && git pull --ff-only
git checkout -b feat/SHIP-412-checkout-summary
 
git add src/screens/CheckoutSummary.tsx
git commit -m "feat(checkout): add order summary sheet [SHIP-412]"
 
git push -u origin feat/SHIP-412-checkout-summary
```

PR targets `main`. Squash merge preserves one commit per feature - easier cherry-picks to `release/*` later.

**Step 3 - Cut release branch before freeze**

```markdown
<!-- docs/release-calendar.md (excerpt) -->
| Week | Event                          | Git rule                          |
|------|--------------------------------|-----------------------------------|
| W12  | Cut release/2.6.0 Tue 10:00    | New features → main only          |
| W12  | Code freeze Thu 18:00 UTC      | release/2.6.0: bugfixes only      |
| W12  | Submit Fri after Maestro       | Tag v2.6.0 from release branch    |
| W13  | Store review in flight         | No native changes on release/2.6.0|
```

```bash
git checkout main && git pull --ff-only
git checkout -b release/2.6.0
git push -u origin release/2.6.0
```

Branch protection on `release/2.6.0`:

* Require PR reviews
* Require status checks (`quality` from [GitHub Actions Integration](https://docs.wahwei/reactnative.codeguides.io/git/github-actions-integration/))
* Block direct pushes except release managers

**Step 4 - Cherry-pick a bugfix during freeze**

A critical fix lands on `main` after the cut. Cherry-pick - do not merge all of `main`.

```bash
git checkout release/2.6.0 && git pull --ff-only
git cherry-pick <sha-from-main>
git push origin release/2.6.0
```

```bash
# Verify the cherry-pick is the only diff vs tag candidate
git log --oneline main..release/2.6.0
git diff main...release/2.6.0 --stat
```

**Step 5 - Tag triggers release pipeline**

```bash
git checkout release/2.6.0
git tag -a v2.6.0 -m "Release 2.6.0 - QA build_id abc123"
git push origin v2.6.0
```

Tag `v*` triggers `eas build` in CI - same artifact QA tested ([Automated Store Promotion](https://docs.wahwei/reactnative.codeguides.io/cicd/automated-store-promotion/)).

**Step 6 - Merge release back to main**

After store approval and staged rollout:

```bash
git checkout main && git pull --ff-only
git merge --ff-only release/2.6.0
git push origin main
git branch -d release/2.6.0
git push origin --delete release/2.6.0
```

## Mobile-Specific Git Rules

| Rule | Web habit | Mobile reality |
| --- | --- | --- |
| Lockfile | Sometimes ignored | **Always commit** - reproducible native builds |
| `ios/` / `android/` | N/A | Commit after `prebuild`; review native diffs on SDK bumps |
| Long `develop` branch | Common | **Avoid** - OTA and store binaries diverge from `main` |
| Merge Friday 5 p.m. | Acceptable | **Risky** - no on-call for broken store binary |
| Force-push `main` | Rare disaster | **Never** - breaks release tags and OTA audit trail |

```bash
# Inspect what changed in native folders before merging SDK bump
git diff main -- ios/ android/ app.json eas.json
npx expo-doctor
```

## Gotchas

* **Merging `main` into `release/*` during review** - Pulls in un-QA'd features; store rejection risk. **Fix:** Cherry-pick only listed SHAs.
* **Feature branch from stale `main`** - Rebase before PR; outdated `runtimeVersion` conflicts surface late. **Fix:** `git fetch && git rebase origin/main` weekly.
* **`.env` committed "just for CI"** - Secrets in Git forever. **Fix:** EAS environment variables ([Environments and EAS Environment Variables](https://docs.wahwei/reactnative.codeguides.io/expo-platform/environments-and-eas-environment-variables/)).
* **Binary assets in Git without LFS** - Repo bloat slows CI checkout. **Fix:** `git lfs track "*.psd"` or host in CDN.
* **Squash merge loses cherry-pick metadata** - Ticket ID in commit body still required for release picks.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Trunk-only (`main` + tags) | Solo dev, weekly store releases | Parallel QA on next version during review |
| GitFlow `develop` | Legacy enterprise mandate | Greenfield mobile - prefer release branches |
| Monorepo `apps/mobile` | Shared packages | Without path filters in CI - burns minutes |
| Fork-based OSS workflow | External contributors | Internal team - branch on same repo |

## FAQs

How long should feature branches live?

Target **1–3 days**. Longer branches conflict with `app.json` version bumps, native folder changes, and EAS profile edits. Rebase or merge `main` daily.

What merges are allowed during code freeze?

Bugfixes with QA evidence, copy tweaks that do not change native code, and security patches. No new screens, permissions, or Expo modules - those need a new store binary and reset review clock.

Should OTA updates come from main or release branches?

**JS-only hotfixes** on the same `runtimeVersion` can publish from `main` to the production channel after soak. **Store-bound code** must match the tagged `release/*` commit QA signed off on. See [Release Channels & Branches](https://docs.wahwei/reactnative.codeguides.io/ota-updates/release-channels-and-branches/).

Merge commit or squash merge?

**Squash** for `feat/*` → `main` - one ticket, one commit. **Merge commit** optional for `release/*` → `main` if you want to preserve release boundary. Never squash a release branch without team agreement - loses cherry-pick SHAs.

How do I handle SDK upgrade branches?

Use a dedicated long-lived spike branch or [git worktrees](https://docs.wahwei/reactnative.codeguides.io/git/interactive-rebase-and-worktrees/) - do not block `main` for two weeks while `expo upgrade` runs.

## Related

* [GitHub Flow & Release Branches](https://docs.wahwei/reactnative.codeguides.io/git/github-flow-and-release-branches/) - hotfix lanes parallel to OTA channels
* [Interactive Rebase & Worktrees](https://docs.wahwei/reactnative.codeguides.io/git/interactive-rebase-and-worktrees/) - parallel SDK spikes without stashing
* [GitHub Actions Integration](https://docs.wahwei/reactnative.codeguides.io/git/github-actions-integration/) - PR templates and required checks
* [Release Train Calendar](https://docs.wahwei/reactnative.codeguides.io/cicd/release-train-calendar/) - freeze windows on a shared calendar
* [Mobile CI/CD Basics](https://docs.wahwei/reactnative.codeguides.io/cicd/mobile-ci-cd-basics/) - what CI runs on each branch
* [Release Channels & Branches](https://docs.wahwei/reactnative.codeguides.io/ota-updates/release-channels-and-branches/) - Git branch vs EAS Update branch
* [Git & GitHub Best Practices](https://docs.wahwei/reactnative.codeguides.io/git/best-practices/) - 25-item summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
