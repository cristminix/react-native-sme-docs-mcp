# Interactive Rebase & Worktrees

A cookbook for **parallel SDK upgrade spikes** using `git worktree` and **interactive rebase** - so `expo upgrade` does not freeze `main` and your stash list does not become archaeology.

Highlights / Interactive Rebase & Worktrees

* git worktree add runs two branches with separate node\_modules - no stash stack
* Interactive rebase squashes WIP commits before PR - reviewers see one logical change
* SDK upgrade spikes live on spike/\* branches without blocking main feature work
* Never rebase public release or hotfix branches - only feat/\* and spike/\*
* Each worktree gets its own Metro port - avoid packager collisions
* Cherry-pick finished upgrade commits back to main as one squash merge

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
# From primary clone - add SDK spike worktree (sibling directory)
cd ~/WEBDEV/ShipApp
git fetch origin
git worktree add ../ShipApp-sdk57-spike -b spike/sdk-57-upgrade origin/main
```

```bash
# Spike worktree - upgrade in isolation
cd ../ShipApp-sdk57-spike
npm ci
npx expo install expo@~57.0.4 --fix
npx expo-doctor
npm run typecheck && npm run test -- --ci
```

```bash
# Primary clone - keep shipping features on main
cd ~/WEBDEV/ShipApp
git checkout main
git checkout -b feat/SHIP-501-settings-redesign
# Metro on default 8081 - spike uses 8082 (see below)
```

```bash
# Before PR - squash fixup commits on feature branch
git checkout feat/SHIP-501-settings-redesign
git fetch origin && git rebase -i origin/main
# Mark WIP commits as squash/fixup; keep one feat commit
```

```bash
# After spike validated - remove worktree
cd ~/WEBDEV/ShipApp
git worktree remove ../ShipApp-sdk57-spike
```

**When to reach for this:**

* **Expo SDK upgrade** spanning days while features must merge to `main`.
* **Native prebuild diff** you need to compare side-by-side with production branch.
* **Long-running spike** (new navigation library) without blocking teammates' `npm ci`.
* **PR cleanup** - ten "fix lint" commits should be one commit before review.

**When to avoid:**

* Shared `release/*` or `hotfix/*` branches others have checked out - rebase rewrites history.
* Already-pushed branch others based work on - coordinate or merge instead of rebase.
* Disk-constrained laptop - two full `node_modules` trees cost gigabytes.

## Working Example

**Scenario:** ShipApp runs Expo SDK 56 in production. Team needs SDK 57 spike while `feat/*` branches land daily on `main`.

**Step 1 - Create spike worktree**

```bash
cd ~/WEBDEV/ShipApp
git pull --ff-only origin main
git worktree add ../ShipApp-sdk57-spike -b spike/sdk-57-upgrade origin/main
git worktree list
```

```text
/Users/csjcode/WEBDEV/ShipApp              abc1234 [main]
/Users/csjcode/WEBDEV/ShipApp-sdk57-spike  abc1234 [spike/sdk-57-upgrade]
```

Both directories share one `.git` object store - branches differ, disks separate.

**Step 2 - Isolate Metro ports**

```bash
# ../ShipApp-sdk57-spike/.env.local (gitignored)
EXPO_PACKAGER_PORT=8082
```

```bash
cd ../ShipApp-sdk57-spike
npm ci
npx expo start --port 8082
```

Primary clone keeps `npx expo start` on 8081 - no "port already in use" collisions.

**Step 3 - Run upgrade with checkpoint commits**

```bash
cd ../ShipApp-sdk57-spike
 
npx expo install expo@~57.0.4 --fix
git add package.json package-lock.json
git commit -m "chore(sdk): bump expo to SDK 57 [SPIKE-57]"
 
npx expo prebuild --clean
git add ios android
git commit -m "chore(native): prebuild after SDK 57 [SPIKE-57]"
 
npm run typecheck
# fix breaks...
git commit -am "fix(types): navigation params after RN 0.86 [SPIKE-57]"
```

WIP commits are fine **on spike branch** - interactive rebase before opening PR.

**Step 4 - Parallel feature work in primary clone**

```bash
cd ~/WEBDEV/ShipApp
git checkout -b feat/SHIP-501-settings-redesign
# unaffected by spike's package.json - separate node_modules
npm ci
npm run test -- --ci
git push -u origin feat/SHIP-501-settings-redesign
```

Teammates never pull half-upgraded SDK from `main`.

**Step 5 - Interactive rebase before PR**

Feature branch accumulated noise:

```bash
git checkout feat/SHIP-501-settings-redesign
git log --oneline origin/main..HEAD
```

```text
a1b2c3d fix typo
d4e5f6g fix lint
g7h8i9j feat(settings): redesign layout [SHIP-501]
j1k2l3m wip
```

```bash
git rebase -i origin/main
```

In the editor, reorder and mark:

```text
pick g7h8i9j feat(settings): redesign layout [SHIP-501]
squash j1k2l3m wip
squash d4e5f6g fix lint
squash a1b2c3d fix typo
```

```bash
git push --force-with-lease origin feat/SHIP-501-settings-redesign
```

* `--force-with-lease` - safer than `--force`; fails if remote advanced
* Only rewrite **your** feature branches - never `main`, `release/*`, `hotfix/*`

**Step 6 - Finish spike and land on main**

```bash
cd ../ShipApp-sdk57-spike
npm run lint && npm run typecheck && npm run test -- --ci
npx expo-doctor
```

Squash spike commits for review:

```bash
git rebase -i origin/main
# squash all SPIKE-57 commits into one:
# chore(sdk): upgrade to Expo SDK 57 [SPIKE-57]
```

```bash
git push -u origin spike/sdk-57-upgrade
# Open PR → main; full device matrix + EAS preview build required
```

After merge:

```bash
cd ~/WEBDEV/ShipApp
git pull --ff-only origin main
git worktree remove ../ShipApp-sdk57-spike
git branch -d spike/sdk-57-upgrade   # if merged
```

Trigger [preview build on PR](https://docs.wahwei/reactnative.codeguides.io/cicd/preview-builds-on-prs/) for SDK PRs - Expo Go alone misses native changes.

## Rebase Safety Matrix

| Branch type | Interactive rebase? | Force push? |
| --- | --- | --- |
| `feat/*` (solo) | Yes | `--force-with-lease` OK |
| `spike/*` | Yes | `--force-with-lease` OK |
| `main` | **No** | **Never** |
| `release/*` | **No** | Breaks RC audit |
| `hotfix/*` | **No** | Cherry-pick instead |
| Shared `feat/*` | Coordinate | Prefer merge |

```bash
# Abort a rebase gone wrong
git rebase --abort
 
# Recovery reflog
git reflog | head -20
git checkout -b recovery-branch HEAD@{3}
```

## Worktree Commands Reference

```bash
git worktree list
git worktree add ../path -b new-branch start-point
git worktree remove ../path
git worktree prune   # clean stale metadata
 
# Cannot remove worktree with uncommitted changes
git -C ../ShipApp-sdk57-spike status
```

```bash
# Optional: shared node_modules via pnpm (advanced)
# Prefer full npm ci per worktree for fidelity with CI
```

## Gotchas

* **One branch checked out in two worktrees** - Git forbids this. **Fix:** Different branch per worktree directory.
* **Rebasing after PR review started** - Invalidates review comments on old SHAs. **Fix:** Rebase before requesting review, or merge `main` instead.
* **Spike merges without `expo-doctor` in CI** - Hidden dependency skew. **Fix:** Add doctor step to [PR checks](https://docs.wahwei/reactnative.codeguides.io/cicd/mobile-ci-cd-basics/).
* **Forgotten worktree consumes disk** - `git worktree list` monthly. **Fix:** `git worktree remove` + `git worktree prune`.
* **Interactive rebase on merge commits** - Confusing conflicts. **Fix:** `git rebase -i --rebase-merges` or avoid merge commits on feature branches.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `git stash` | 30-minute context switch | Multi-day SDK spike |
| Second full clone | Simple mental model | Double fetch time and disk |
| Feature flags on main | Small SDK delta | Native folder overhaul |
| Draft PR from spike | Visibility without merge | Still blocks CI if targeting main early |

## FAQs

worktree vs second git clone?

Worktrees share object database - faster, less disk. Second clone is simpler but duplicates `.git` history. Prefer worktrees for same-repo parallel branches.

How many worktrees are practical?

Two or three (main + spike + hotfix investigation). More than that - disk and mental overhead exceed benefit.

Should spike branch merge or rebase onto main before PR?

`git merge origin/main` into spike before PR is safer for long spikes. Interactive rebase **onto** main produces linear history but costs conflict resolution time.

Can CI run on worktree branches?

Yes - worktrees push to same `origin`. Branch `spike/sdk-57-upgrade` triggers same GitHub Actions as any remote branch.

What commits belong in one squash?

One logical unit: one ticket or one SDK bump. Separate `feat` from `chore(sdk)` if reviewers need to bisect later.

## Related

* [Git Basics for Mobile Teams](https://docs.wahwei/reactnative.codeguides.io/git/git-basics-for-mobile-teams/) - when not to touch release branches
* [GitHub Flow & Release Branches](https://docs.wahwei/reactnative.codeguides.io/git/github-flow-and-release-branches/) - hotfix lanes avoid rebase
* [GitHub Actions Integration](https://docs.wahwei/reactnative.codeguides.io/git/github-actions-integration/) - SDK PR requires preview build evidence
* [Preview Builds on PRs](https://docs.wahwei/reactnative.codeguides.io/cicd/preview-builds-on-prs/) - native validation for SDK upgrades
* [EAS Workflows](https://docs.wahwei/reactnative.codeguides.io/cicd/eas-workflows/) - `expo-doctor` before `type: build`
* [Mobile CI/CD Basics](https://docs.wahwei/reactnative.codeguides.io/cicd/mobile-ci-cd-basics/) - PR checks spike branches use
* [Git & GitHub Best Practices](https://docs.wahwei/reactnative.codeguides.io/git/best-practices/) - 25-item summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
