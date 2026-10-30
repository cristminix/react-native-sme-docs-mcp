# GitHub Actions Integration

A cookbook for **GitHub Actions + PR templates** that require **device test evidence** - so "tested on simulator" does not merge native navigation changes without a real iPhone and Android QA path.

Highlights / GitHub Actions Integration

* PR template checkboxes force device OS, build\_id, and test path evidence
* GitHub Actions validates template sections - empty placeholders fail the check
* Branch protection requires quality + pr-evidence before merge
* Device matrix table in PR body - iOS and Android both required for UI changes
* Links EAS preview QR and Maestro recording attach to the PR thread
* Same npm scripts in Actions as local - no CI-only test commands

## Recipe

> Quick-reference recipe card - copy-paste ready.

```markdown
<!-- .github/pull_request_template.md -->
## Summary
<!-- What changed and why -->
 
## Ticket
<!-- SHIP-___ -->
 
## Device test evidence (required for UI / native / navigation)
| Platform | Device / OS        | Build source     | Result |
|----------|--------------------|------------------|--------|
| iOS      | e.g. iPhone 14 / 17| EAS preview QR   | PASS   |
| Android  | e.g. Pixel 7 / 14  | EAS preview QR   | PASS   |
 
## Test paths exercised
- [ ] Cold start / login
- [ ] Changed screen(s): ___
- [ ] Deep link / push (if applicable)
 
## Screenshots / recordings
<!-- Drag Maestro cloud link, screen recording, or screenshot -->
 
## CI
- [ ] `quality` check green
- [ ] Preview build ID noted: ___
```

```yaml
# .github/workflows/pr-evidence.yml
name: PR Evidence
on:
  pull_request:
    types: [opened, edited, synchronize, reopened]
 
jobs:
  evidence:
    runs-on: ubuntu-latest
    steps:
      - name: Validate PR template
        uses: actions/github-script@v7
        with:
          script: |
            const body = context.payload.pull_request.body ?? '';
            const needsDevice = /native|navigation|gesture|camera|ui/i.test(body)
              || context.payload.pull_request.labels.some(l => l.name === 'needs-device-qa');
            if (!needsDevice) {
              core.info('No device-heavy paths detected - evidence check skipped');
              return;
            }
            const required = ['Device test evidence', 'Test paths exercised', 'iOS', 'Android', 'PASS'];
            const missing = required.filter(r => !body.includes(r));
            if (missing.length) {
              core.setFailed(`PR body missing: ${missing.join(', ')}`);
            }
```

```yaml
# .github/workflows/pr-checks.yml (excerpt - pair with evidence)
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
      - run: npm run format:check && npm run lint && npm run typecheck
      - run: npm run test -- --ci
```

**When to reach for this:**

* UI regressions slipped through because PRs only listed "Jest green."
* [Preview builds on PRs](https://docs.wahwei/reactnative.codeguides.io/cicd/preview-builds-on-prs/) exist but nobody records which `build_id` they tested.
* Maestro or Detox runs locally but evidence is not attached to the PR.
* Branch protection needs a **second gate** beyond lint and TypeScript.

**When to avoid:**

* Docs-only PRs - label `skip-device-qa` or path-filter workflows.
* Automated Maestro on every preview build already posts results - template can be lighter.

## Working Example

**Step 1 - Add PR template and labels**

```bash
mkdir -p .github
```

```markdown
<!-- .github/pull_request_template.md -->
## Summary
 
## Ticket
SHIP-
 
## Change type
- [ ] JS / copy only (OTA-safe)
- [ ] UI layout / styling
- [ ] Navigation / gestures
- [ ] Native module / config plugin
- [ ] SDK upgrade
 
## Device test evidence
> Required when any box above except "JS / copy only" is checked.
 
| Platform | Device / OS | Build (`build_id` or preview link) | Result |
|----------|-------------|-----------------------------------|--------|
| iOS      |             |                                   | PASS / FAIL |
| Android  |             |                                   | PASS / FAIL |
 
## Test paths exercised
- [ ] Cold start
- [ ] Auth / session restore
- [ ] Feature under change: ___
 
## Automation
- [ ] Maestro flow: `flows/smoke.yaml` (link or CI artifact)
- [ ] Screenshot / screen recording attached
 
## Rollback notes (if production-impacting)
<!-- OTA channel, feature flag, or hotfix branch plan -->
```

```bash
# Create GitHub labels (gh CLI)
gh label create "needs-device-qa" --color B60205 --description "Requires device evidence in PR"
gh label create "skip-device-qa" --color C5DEF5 --description "Docs or CI-only - no device matrix"
```

**Step 2 - Path-based auto-label**

```yaml
# .github/workflows/pr-labeler.yml
name: PR Labeler
on:
  pull_request:
    types: [opened, synchronize]
 
jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/labeler@v5
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
```

```yaml
# .github/labeler.yml
needs-device-qa:
  - changed-files:
      - any-glob-to-any-file:
          - 'app/**'
          - 'src/**/*.tsx'
          - 'ios/**'
          - 'android/**'
          - 'app.json'
          - 'eas.json'
```

**Step 3 - Evidence validation workflow**

```yaml
# .github/workflows/pr-evidence.yml
name: PR Evidence
on:
  pull_request:
    types: [opened, edited, synchronize, reopened]
 
permissions:
  pull-requests: read
 
jobs:
  evidence:
    if: >-
      !contains(github.event.pull_request.labels.*.name, 'skip-device-qa')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/github-script@v7
        with:
          script: |
            const pr = context.payload.pull_request;
            const body = pr.body ?? '';
            const title = pr.title ?? '';
 
            const uiPaths = /(src\/|app\/|\.tsx|navigation|gesture|native|plugin)/i;
            const needsEvidence =
              pr.labels.some(l => l.name === 'needs-device-qa') ||
              uiPaths.test(body) ||
              uiPaths.test(title);
 
            if (!needsEvidence) {
              core.info('Skipping device evidence - JS/docs-only change');
              return;
            }
 
            const fail = (msg) => core.setFailed(msg);
 
            if (!/\| iOS \|.*\|.*\|.*PASS/i.test(body.replace(/\n/g, ' '))) {
              fail('iOS row with PASS missing in device table');
            }
            if (!/\| Android \|.*\|.*\|.*PASS/i.test(body.replace(/\n/g, ' '))) {
              fail('Android row with PASS missing in device table');
            }
            if (!body.includes('Test paths exercised')) {
              fail('Test paths exercised section missing');
            }
            const buildRef = /build_id|eas\.dev|expo\.dev\/accounts/i;
            if (!buildRef.test(body)) {
              fail('No EAS preview build_id or install link in PR body');
            }
```

**Step 4 - Branch protection**

```text
GitHub → Settings → Branches → main:
  Require status checks:
    - quality          (pr-checks.yml)
    - evidence         (pr-evidence.yml)
  Require pull request reviews: 1
```

Document in `CONTRIBUTING.md` - reviewers reject PRs with placeholder `e.g. iPhone` text.

**Step 5 - Contributor workflow with preview build**

```bash
# Author adds label after opening PR (or labeler adds automatically)
gh pr create --fill
gh pr edit --add-label needs-device-qa
```

Request preview from [Preview Builds on PRs](https://docs.wahwei/reactnative.codeguides.io/cicd/preview-builds-on-prs/):

```bash
gh pr edit 42 --add-label needs-preview
# CI posts QR - author installs on physical devices
```

```bash
# Run Maestro locally against preview binary
maestro test flows/checkout-smoke.yaml
# Attach recording; paste build_id into PR table
```

Example filled PR table:

```markdown
| Platform | Device / OS        | Build source                          | Result |
|----------|----------------------|---------------------------------------|--------|
| iOS      | iPhone 14 / iOS 17.4 | build_id 8f3a2c (PR #42 preview)      | PASS   |
| Android  | Pixel 7 / API 34     | build_id 8f3a2c (PR #42 preview)      | PASS   |
```

**Step 6 - Optional Maestro upload on preview success**

```yaml
# .github/workflows/preview-maestro.yml (excerpt)
- name: Maestro smoke on preview artifact
  if: success()
  run: |
    maestro test flows/smoke.yaml --format junit --output maestro.xml
- uses: actions/upload-artifact@v4
  with:
    name: maestro-${{ github.event.pull_request.number }}
    path: maestro.xml
```

Link artifact in PR - satisfies "Automation" checkbox.

## Integration with EAS and CI/CD

| Check | Workflow | Blocks merge |
| --- | --- | --- |
| Lint / tsc / Jest | `pr-checks.yml` | Yes |
| Template evidence | `pr-evidence.yml` | Yes (UI paths) |
| Preview build | `preview-build.yml` | No - informs evidence |
| Maestro on EAS | EAS Workflow | Release only |

```bash
# Robot token for preview workflows - never personal account
# GitHub Secret: EXPO_TOKEN (see GitHub Actions + EAS)
```

Hybrid pattern: GitHub Actions for PR gates; [EAS Workflows](https://docs.wahwei/reactnative.codeguides.io/cicd/eas-workflows/) for tag release chains.

## Gotchas

* **Regex too strict on table formatting** - Minor markdown spacing fails check. **Fix:** Loosen regex or use a small validation script with clear error messages.
* **Evidence workflow on draft PRs** - Authors cannot fill template yet. **Fix:** `if: github.event.pull_request.draft == false`.
* **Simulator-only "PASS"** - Misses Android manufacturer skins and iOS safe areas. **Fix:** Policy: physical device for `needs-device-qa`.
* **Stale preview build\_id** - Author rebased but table references old binary. **Fix:** Re-run preview on `synchronize`; CI comment with latest `build_id`.
* **Skipping evidence with empty summary** - Label `skip-device-qa` misuse. **Fix:** CODEOWNERS review for label removal.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Honor-system template | Tiny team, high trust | Store submissions failing QA |
| Required Maestro in EAS only | Budget for cloud devices | Need fast PR feedback |
| Manual QA sign-off in Jira | Regulated industries | No link between ticket and PR |
| Danger JS PR linter | Complex custom rules | Team prefers YAML-only |

## FAQs

Should docs-only PRs run evidence check?

No. Use `skip-device-qa` label or path filters excluding `docs/**` and `*.md`. Keep `quality` check for all PRs.

What if QA owns device testing, not the author?

Allow QA to edit PR body or comment with evidence table; `pull_request_target` on `edited` re-runs validation. Better: QA posts comment template author copies into body.

Is Expo Go enough for evidence?

Not for native modules, config plugins, or SDK upgrades. Record **EAS preview** or dev client `build_id` - [Maestro E2E](https://docs.wahwei/reactnative.codeguides.io/testing/maestro-e2e/).

How does this relate to Jest in CI?

Jest proves logic; device evidence proves layout, gestures, and native bridges. Both required for UI PRs - [Mobile Testing Basics](https://docs.wahwei/reactnative.codeguides.io/testing/mobile-testing-basics/).

Can I use issue forms instead of markdown template?

Yes - GitHub Issue Forms support required fields. Convert the device table to required form inputs; Actions still validates PR body if contributors use `Closes #` linking.

## Related

* [Git Basics for Mobile Teams](https://docs.wahwei/reactnative.codeguides.io/git/git-basics-for-mobile-teams/) - branch protection and pre-commit hooks
* [GitHub Flow & Release Branches](https://docs.wahwei/reactnative.codeguides.io/git/github-flow-and-release-branches/) - hotfix PRs need expedited evidence
* [Interactive Rebase & Worktrees](https://docs.wahwei/reactnative.codeguides.io/git/interactive-rebase-and-worktrees/) - SDK PRs require preview builds
* [GitHub Actions + EAS](https://docs.wahwei/reactnative.codeguides.io/cicd/github-actions-plus-eas/) - `EXPO_TOKEN`, caching, monorepo
* [Preview Builds on PRs](https://docs.wahwei/reactnative.codeguides.io/cicd/preview-builds-on-prs/) - QR installs for evidence
* [Mobile CI/CD Basics](https://docs.wahwei/reactnative.codeguides.io/cicd/mobile-ci-cd-basics/) - PR vs release pipeline split
* [Maestro E2E](https://docs.wahwei/reactnative.codeguides.io/testing/maestro-e2e/) - flows to attach as automation proof
* [Git & GitHub Best Practices](https://docs.wahwei/reactnative.codeguides.io/git/best-practices/) - 25-item summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

383k393a3c3q3e393a3o1r3e3k3x383c3e3k21211y3x1v1t1v1z1t20

Reviewed by Chris St. John·Last updated Jul 19, 2026
