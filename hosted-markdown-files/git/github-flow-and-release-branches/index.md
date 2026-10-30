# GitHub Flow & Release Branches

A cookbook for **GitHub Flow adapted to mobile** - continuous integration on `main`, **release branches** for store trains, and **hotfix branches parallel to OTA channels** so production JavaScript and live store binaries stay aligned.

Highlights / GitHub Flow & Release Branches

* GitHub Flow on main - open PR, review, merge, deploy from tip or tag
* release/\* branches hold store candidates; hotfix/\* branches patch live versions
* OTA channels map to Git branches - production OTA never from unmerged feat/\*
* Hotfix cherry-picks flow release → main → optional OTA publish
* Parallel hotfix lanes when 2.4 and 2.5 are both in market
* Branch protection enforces freeze rules - not Slack honor system

## Recipe

> Quick-reference recipe card - copy-paste ready.

```text
GitHub Flow (mobile adaptation)
  1. Branch from main     → feat/SHIP-220-dark-mode
  2. Open PR              → CI + device evidence required
  3. Merge to main        → squash preferred
  4. Deploy               → OTA to preview channel OR tag for store build
```

```bash
# Hotfix for live store version 2.4.x (parallel to 2.5 RC on release/2.5.0)
git fetch --tags
git checkout -b hotfix/2.4.2 v2.4.1
git cherry-pick <fix-sha>
git tag -a v2.4.2 -m "Hotfix: crash on cold start [SHIP-991]"
git push origin hotfix/2.4.2 v2.4.2
```

```bash
# JS-only hotfix on same runtimeVersion - OTA from hotfix branch
git checkout hotfix/2.4.2
eas update --branch production --channel production --environment production \
  --message "hotfix: cold start crash [SHIP-991]"
```

```text
Parallel lanes example
  main              ← integration
  release/2.5.0     ← RC in TestFlight review
  hotfix/2.4.2      ← production store 2.4.x users
  (OTA production channel ← hotfix/2.4.2 commits only)
```

**When to reach for this:**

* Users on **two store versions** simultaneously (staged rollout lag).
* **OTA production channel** must not receive commits meant for next store release.
* Team outgrows "tag everything from `main`" but does not want GitFlow `develop`.
* Hotfix needed while `release/2.5.0` is frozen in App Review.

**When to avoid:**

* Single version in market, OTA disabled - simpler trunk + tags may suffice.
* Hotfix requires new native module - must be store build, not OTA-only lane.

## Working Example

**Scenario:** `v2.4.1` is live in production (50% Play rollout). `release/2.5.0` waits in App Review. A cold-start crash affects 2.4.x users only.

**Step 1 - Map Git branches to EAS channels**

```markdown
<!-- docs/branch-channel-map.md -->
| Git branch       | Store version | EAS Update branch | EAS channel  |
|------------------|---------------|-------------------|--------------|
| main             | (next)        | preview           | preview      |
| release/2.5.0    | 2.5.0 RC      | staging           | staging      |
| hotfix/2.4.2     | 2.4.2 live    | production        | production   |
```

```bash
eas channel:view production
# Confirm channel points at production branch - not main
```

See [Release Channels & Branches](https://docs.wahwei/reactnative.codeguides.io/ota-updates/release-channels-and-branches/) for channel semantics.

**Step 2 - Land fix on main first (integration truth)**

```bash
git checkout main && git pull --ff-only
git checkout -b fix/SHIP-991-cold-start
# ... fix ...
git commit -m "fix(app): guard null session on cold start [SHIP-991]"
git push -u origin fix/SHIP-991-cold-start
# PR → squash merge to main
```

**Step 3 - Open hotfix branch from live tag**

```bash
git fetch --tags
git checkout -b hotfix/2.4.2 v2.4.1
git cherry-pick <squashed-sha-from-main>
npm run typecheck && npm run test -- --ci
git push -u origin hotfix/2.4.2
```

* Branch from **tag** `v2.4.1`, not from `main` - guarantees same `runtimeVersion` and native code
* Cherry-pick one commit - not `git merge main`

**Step 4 - Store submit for native hotfix (if required)**

```bash
# Bump app version on hotfix branch only
# app.json → version 2.4.2, ios.buildNumber++, android.versionCode++
 
git commit -am "chore(release): bump to 2.4.2 [SHIP-991]"
git tag -a v2.4.2 -m "Hotfix 2.4.2 - build_id xyz789"
git push origin hotfix/2.4.2 v2.4.2
```

Tag triggers [EAS release workflow](https://docs.wahwei/reactnative.codeguides.io/cicd/github-actions-plus-eas/) - expedited profile, same `build_id` QA tested.

**Step 5 - OTA parallel lane (JS-only path)**

If the fix is JavaScript-only and `runtimeVersion` matches `v2.4.1`:

```bash
git checkout hotfix/2.4.2
eas update --branch production --channel production --environment production \
  --message "hotfix: cold start [SHIP-991]"
```

```bash
# Verify production channel head matches hotfix tip
git rev-parse hotfix/2.4.2
eas update:list --branch production --limit 1
```

**Step 6 - Backport to main and release/2.5.0**

```bash
# main already has fix from step 2
git checkout release/2.5.0 && git pull --ff-only
git cherry-pick <same-sha>
git push origin release/2.5.0
```

2.5.0 users get the fix when the store binary ships - not from production OTA channel.

## GitHub Flow vs Release Branch - Decision Table

| Situation | Flow | Branch |
| --- | --- | --- |
| New feature | GitHub Flow | `feat/*` → `main` |
| Weekly store train | Release branch | `release/X.Y.0` from `main` |
| Live crash on old version | Hotfix lane | `hotfix/X.Y.Z` from tag |
| JS typo on production | OTA | `hotfix/*` or `main` if same runtime |
| SDK bump | Spike | `spike/sdk-57` or worktree |

```bash
# List branches still receiving OTA
git branch -r | grep -E 'hotfix|release'
eas channel:list
```

## Branch Protection Template

```yaml
# Document in CONTRIBUTING.md - enforce in GitHub Settings
main:
  required_checks: [quality, pr-template]
  required_reviews: 1
  allow_force_push: false
 
release/*:
  required_checks: [quality, maestro-smoke]
  required_reviews: 2
  restrict_push: [release-managers]
 
hotfix/*:
  required_checks: [quality]
  required_reviews: 2  # expedited but not solo
```

## Gotchas

* **OTA from `main` while 2.4 and 2.5 differ in native code** - 2.5 binary may load incompatible JS. **Fix:** Publish production OTA only from `hotfix/*` tied to live `runtimeVersion`.
* **Hotfix branch from `release/2.5.0` for 2.4 users** - Wrong native baseline. **Fix:** `git checkout -b hotfix/2.4.2 v2.4.1`.
* **Forgetting cherry-pick to `release/2.5.0`** - Fix ships to old users only; 2.5 regresses. **Fix:** Backport checklist in PR template.
* **Deleting hotfix branch before channel repoint** - Production channel orphaned. **Fix:** `eas channel:edit` only after new tag lane documented.
* **Parallel hotfixes same version** - Second branch from wrong tag. **Fix:** Sequential tags `v2.4.2`, `v2.4.3`; one open hotfix at a time per major.minor.

cGJxcnRodnFyZi52YnxwdHZiOTc0fDIwMjYwNw==

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Trunk + tag only | One version in market | Staged rollout leaves two versions live |
| GitFlow `develop` | Mandated by org | OTA channel mapping becomes unclear |
| Long-lived `production` Git branch | Strict OTA audit | Drifts from `main` without discipline |
| Fork hotfix per platform | iOS/Android ship different patches | Adds merge burden - prefer one hotfix |

## FAQs

Is GitHub Flow enough without release branches?

For small apps with continuous store submission - often yes. Add `release/*` when review windows, RC soak, or parallel versions demand a frozen candidate branch.

How many hotfix branches can be open?

One per **live store minor** (e.g. one `hotfix/2.4.x` lane). Multiple patches chain as `v2.4.2`, `v2.4.3`. A separate `hotfix/2.3.x` only if you still support that cohort.

Does hotfix merge to main or only cherry-pick?

Fix lands on `main` via normal PR first. Hotfix branch **cherry-picks** that SHA - never merge hotfix → main (brings version bump noise backward).

Who owns production OTA publishes?

CI on tag or release manager with `EXPO_TOKEN` - not feature developers from laptops. Matches [Release Train Calendar](https://docs.wahwei/reactnative.codeguides.io/cicd/release-train-calendar/) policy.

What if hotfix needs native code?

Store build from `hotfix/*`, new tag, expedited submit - OTA alone is insufficient. Bump `runtimeVersion` if native ABI changes ([Runtime Version Policy](https://docs.wahwei/reactnative.codeguides.io/ota-updates/runtime-version-policy/)).

## Related

* [Git Basics for Mobile Teams](https://docs.wahwei/reactnative.codeguides.io/git/git-basics-for-mobile-teams/) - freeze windows and cherry-pick rules
* [Interactive Rebase & Worktrees](https://docs.wahwei/reactnative.codeguides.io/git/interactive-rebase-and-worktrees/) - clean history before hotfix cherry-pick
* [GitHub Actions Integration](https://docs.wahwei/reactnative.codeguides.io/git/github-actions-integration/) - PR checks on hotfix PRs
* [Release Channels & Branches](https://docs.wahwei/reactnative.codeguides.io/ota-updates/release-channels-and-branches/) - channel ↔ branch mapping
* [Rollback Runbook](https://docs.wahwei/reactnative.codeguides.io/ota-updates/rollback-runbook/) - revert bad OTA on production channel
* [Automated Store Promotion](https://docs.wahwei/reactnative.codeguides.io/cicd/automated-store-promotion/) - tag-gated submit
* [Git & GitHub Best Practices](https://docs.wahwei/reactnative.codeguides.io/git/best-practices/) - 25-item summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 19, 2026
