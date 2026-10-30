# Git & GitHub Highlights Summary

Every highlight bullet from the 5 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Git & GitHub Highlights Summary

* main is always shippable - release branches cut from tags, not long-lived forks
* GitHub Flow on main - open PR, review, merge, deploy from tip or tag
* git worktree add runs two branches with separate node\_modules - no stash stack
* PR template checkboxes force device OS, build\_id, and test path evidence
* main stays shippable - feature branches are days, not months

## [Git Basics for Mobile Teams](https://docs.wahwei/reactnative.codeguides.io/git/git-basics-for-mobile-teams/)

* main is always shippable - release branches cut from tags, not long-lived forks
* Code freeze windows block feature merges into release/\* during store review
* Separate lanes for store binaries (tags) and OTA bundles (channel branches)
* Lockfiles and native folders committed - never gitignore package-lock.json
* Conventional commits with ticket IDs make cherry-picks and hotfixes traceable
* Pre-commit hooks run lint and typecheck - same scripts CI will call

## [GitHub Flow & Release Branches](https://docs.wahwei/reactnative.codeguides.io/git/github-flow-and-release-branches/)

* GitHub Flow on main - open PR, review, merge, deploy from tip or tag
* release/\* branches hold store candidates; hotfix/\* branches patch live versions
* OTA channels map to Git branches - production OTA never from unmerged feat/\*
* Hotfix cherry-picks flow release → main → optional OTA publish
* Parallel hotfix lanes when 2.4 and 2.5 are both in market
* Branch protection enforces freeze rules - not Slack honor system

## [Interactive Rebase & Worktrees](https://docs.wahwei/reactnative.codeguides.io/git/interactive-rebase-and-worktrees/)

* git worktree add runs two branches with separate node\_modules - no stash stack
* Interactive rebase squashes WIP commits before PR - reviewers see one logical change
* SDK upgrade spikes live on spike/\* branches without blocking main feature work
* Never rebase public release or hotfix branches - only feat/\* and spike/\*
* Each worktree gets its own Metro port - avoid packager collisions
* Cherry-pick finished upgrade commits back to main as one squash merge

## [GitHub Actions Integration](https://docs.wahwei/reactnative.codeguides.io/git/github-actions-integration/)

* PR template checkboxes force device OS, build\_id, and test path evidence
* GitHub Actions validates template sections - empty placeholders fail the check
* Branch protection requires quality + pr-evidence before merge
* Device matrix table in PR body - iOS and Android both required for UI changes
* Links EAS preview QR and Maestro recording attach to the PR thread
* Same npm scripts in Actions as local - no CI-only test commands

## [Git & GitHub Best Practices](https://docs.wahwei/reactnative.codeguides.io/git/best-practices/)

* main stays shippable - feature branches are days, not months
* release/\* freezes during store review; hotfix/\* branches from tags, not main
* Production OTA publishes from hotfix lanes - not unvetted main tip
* git worktree for SDK spikes; interactive rebase only on private feat/\* branches
* PR templates require device evidence - iOS and Android with build\_id
* Same npm scripts locally, in hooks, and in GitHub Actions - one command surface

Reviewed by Chris St. John·Last updated Jul 18, 2026
