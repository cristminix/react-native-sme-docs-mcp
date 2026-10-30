# Git & GitHub Best Practices

A condensed summary of the **25 most important Git and GitHub practices** for Expo SDK 57 mobile teams - drawn from every page in this section.

Highlights / Git & GitHub Best Practices

* main stays shippable - feature branches are days, not months
* release/\* freezes during store review; hotfix/\* branches from tags, not main
* Production OTA publishes from hotfix lanes - not unvetted main tip
* git worktree for SDK spikes; interactive rebase only on private feat/\* branches
* PR templates require device evidence - iOS and Android with build\_id
* Same npm scripts locally, in hooks, and in GitHub Actions - one command surface

1. **`main` is always integration truth:** Every merged PR must pass CI; never leave `main` broken overnight - store and OTA pipelines assume a green tip ([Git Basics for Mobile Teams](https://docs.wahwei/reactnative.codeguides.io/git/git-basics-for-mobile-teams/)).
2. **Commit the lockfile:** `package-lock.json` (or `pnpm-lock.yaml`) is required for reproducible `npm ci` in [Mobile CI/CD Basics](https://docs.wahwei/reactnative.codeguides.io/cicd/mobile-ci-cd-basics/) - never gitignore it.
3. **Ticket IDs in every commit:** `feat(checkout): summary sheet [SHIP-412]` - cherry-picks to `release/*` and `hotfix/*` depend on traceable messages.
4. **Squash merge features to `main`:** One ticket, one commit on integration branch - simplifies cherry-pick to release and hotfix lanes.
5. **Short-lived feature branches:** Target 1–3 days; rebase or merge `main` daily to avoid `app.json`, native folder, and `eas.json` conflicts.
6. **Cut `release/X.Y` before freeze:** Release branch holds the store candidate; new features land on `main` only until the train ships ([Release Train Calendar](https://docs.wahwei/reactnative.codeguides.io/cicd/release-train-calendar/)).
7. **Code freeze is a Git policy:** During App Review, `release/*` accepts bugfixes only - enforce with branch protection, not Slack reminders.
8. **Cherry-pick - never merge `main` into `release/*`:** Merging pulls un-QA'd features into the store candidate; pick explicit SHAs listed in the release ticket.
9. **Tag from `release/*` after QA sign-off:** `v2.6.0` triggers EAS release CI; tag message includes `build_id` QA tested ([Automated Store Promotion](https://docs.wahwei/reactnative.codeguides.io/cicd/automated-store-promotion/)).
10. **Merge `release/*` back to `main` after rollout:** Fast-forward or merge commit preserves train boundary; delete the release branch when 100% rollout completes.
11. **Hotfix branches from tags:** `git checkout -b hotfix/2.4.2 v2.4.1` - not from `main` or `release/2.5.0` - guarantees correct `runtimeVersion` and native baseline ([GitHub Flow & Release Branches](https://docs.wahwei/reactnative.codeguides.io/git/github-flow-and-release-branches/)).
12. **Parallel hotfix lanes per live minor:** When 2.4.x and 2.5.0 RC coexist, separate `hotfix/2.4.*` and `release/2.5.0` - one open hotfix per minor at a time.
13. **Backport every hotfix:** Cherry-pick fix SHA to `main` (if not already there) and to open `release/*` - production OTA alone does not protect the next store binary.
14. **Map Git branches to OTA channels:** Production channel publishes from `hotfix/*` or documented production branch - never from `feat/*` ([Release Channels & Branches](https://docs.wahwei/reactnative.codeguides.io/ota-updates/release-channels-and-branches/)).
15. **Never force-push `main`, `release/*`, or `hotfix/*`:** Rewriting shared history breaks audit trails, tags, and OTA bundle lineage.
16. **SDK upgrades on `spike/*` + worktrees:** `git worktree add` keeps `main` open for features while `expo upgrade` runs in isolation ([Interactive Rebase & Worktrees](https://docs.wahwei/reactnative.codeguides.io/git/interactive-rebase-and-worktrees/)).
17. **Interactive rebase on private branches only:** Squash WIP before PR with `git rebase -i origin/main`; use `--force-with-lease`, never `--force` on shared branches.
18. **Separate Metro ports per worktree:** `EXPO_PACKAGER_PORT=8082` in spike worktree - avoids packager collisions with daily feature work.
19. **Pre-commit hooks mirror CI:** Husky runs `format:check`, `lint`, `typecheck` - same scripts as `pr-checks.yml` ([GitHub Actions Integration](https://docs.wahwei/reactnative.codeguides.io/git/github-actions-integration/)).
20. **PR template requires device evidence:** iOS and Android rows with `PASS`, test paths, and EAS `build_id` or install link - not "tested locally" placeholders.
21. **Auto-label UI and native paths:** `needs-device-qa` on `src/**`, `ios/**`, `android/**` changes; `skip-device-qa` for docs-only PRs.
22. **Branch protection requires `quality` + `evidence`:** GitHub Actions gates merge - policy beats honor system; pair with [Preview Builds on PRs](https://docs.wahwei/reactnative.codeguides.io/cicd/preview-builds-on-prs/) for QR installs.
23. **Never commit signing secrets:** No `.p8`, `.jks`, or `.env` with API keys - EAS credentials and [EAS environment variables](https://docs.wahwei/reactnative.codeguides.io/expo-platform/environments-and-eas-environment-variables/) only.
24. **Review native diffs on SDK bumps:** `git diff main -- ios/ android/ app.json eas.json` before merge; run `npx expo-doctor` in CI on spike PRs.
25. **Document rollback in PR and tag messages:** OTA channel, feature flag, or hotfix branch plan - ties Git history to [Rollback Runbook](https://docs.wahwei/reactnative.codeguides.io/ota-updates/rollback-runbook/) and on-call actions.

## FAQs

GitFlow develop branch or trunk + release?

Prefer **trunk (`main`) + short `release/*` + `hotfix/*`**. Long-lived `develop` diverges from store binaries and OTA channels on mobile teams.

Minimum Git setup for a solo developer?

`main` + feature branches + squash merge + Husky hooks + tag-driven `eas build`. Add release branches and PR evidence when QA or a second engineer joins.

Merge commit or rebase onto main before PR?

**Squash merge** at PR time is enough for most teams. Rebase onto `main` before review if you want linear history; avoid rebasing after review starts.

How do Git practices connect to CI/CD?

Tags trigger release pipelines; PRs trigger quality gates; branch protection connects both. Git choices define what CI builds - see [CI/CD Best Practices](https://docs.wahwei/reactnative.codeguides.io/cicd/best-practices/).

Biggest Git mistake on mobile teams?

Publishing production OTA from `main` while two store versions with different `runtimeVersion` values are live - use hotfix lanes mapped to channels.

## Related

* [Git Basics for Mobile Teams](https://docs.wahwei/reactnative.codeguides.io/git/git-basics-for-mobile-teams/) - freeze windows, cherry-picks, repo hygiene
* [GitHub Flow & Release Branches](https://docs.wahwei/reactnative.codeguides.io/git/github-flow-and-release-branches/) - hotfix parallel to OTA channels
* [Interactive Rebase & Worktrees](https://docs.wahwei/reactnative.codeguides.io/git/interactive-rebase-and-worktrees/) - SDK spikes without stashing
* [GitHub Actions Integration](https://docs.wahwei/reactnative.codeguides.io/git/github-actions-integration/) - PR templates and evidence workflows
* [Mobile CI/CD Basics](https://docs.wahwei/reactnative.codeguides.io/cicd/mobile-ci-cd-basics/) - what runs on each Git event
* [GitHub Actions + EAS](https://docs.wahwei/reactnative.codeguides.io/cicd/github-actions-plus-eas/) - secrets and release triggers
* [Release Train Calendar](https://docs.wahwei/reactnative.codeguides.io/cicd/release-train-calendar/) - shared freeze calendar
* [Testing Best Practices](https://docs.wahwei/reactnative.codeguides.io/testing/best-practices/) - device vs unit test boundaries

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
