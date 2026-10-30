# Release Channels & Branches

Staging → production promotion with EAS Update - a cookbook for **channels**, **branches**, and the linear promotion flow that keeps preview QA aligned with production behavior.

Highlights / Release Channels & Branches

* Channels map to environments - development, preview, staging, production
* eas.json build.channel embeds the channel in each binary at build time
* Branches hold update history; channels point at a branch head
* Promotion is republish or channel redirect - never skip preview on revenue paths
* eas update --environment is required on SDK 55+ for env parity with builds
* Production publish should be CI-only with audit trail in release tickets

## Recipe

> Quick-reference recipe card - copy-paste ready.

```json
// eas.json - channel per build profile
{
  "build": {
    "preview": { "distribution": "internal", "channel": "preview" },
    "production": { "channel": "production" }
  }
}
```

```bash
# Publish to preview branch (soak)
eas update --branch preview --channel preview --environment preview \
  --message "feat: checkout validation fix"
 
# After QA sign-off - publish same commit to production channel
eas update --branch production --channel production --environment production \
  --message "promote: checkout validation fix"
```

```bash
# Inspect what each channel serves
eas channel:view production
eas update:list --branch production --limit 5
```

**When to reach for this:**

* Setting up first `development` → `preview` → `production` flow.
* Promoting a soaked preview bundle to production users.
* Mapping Git branches to EAS Update branches for trunk-based teams.
* Auditing which bundle ID production channel currently serves.

**When to avoid:**

* Per-engineer channels (`jane-dev`) - use preview builds + branch updates instead.
* Direct production publish from a feature branch without preview soak on revenue paths.
* Sharing one production channel across two bundle IDs - white-label needs separate channels.

## Working Example

End-to-end **staging → preview → production** promotion with channel/branch tables and CI gate.

**Step 1 - Document the channel map**

```markdown
<!-- docs/release-channels.md -->
| Channel      | Binary profile | Audience        | Who may publish      |
|--------------|----------------|-----------------|----------------------|
| development  | development    | Engineers       | Any dev (local)      |
| preview      | preview        | QA + stakeholders | Tech lead on-call  |
| staging      | preview*       | Pre-prod soak   | Release manager      |
| production   | production     | Store users     | CI tag only          |
 
* staging uses preview profile binary with `expo-channel-name: staging` header override if needed
```

**Step 2 - Wire branches to channels**

```bash
# One-time: ensure channels point at intended branches
eas channel:create preview
eas channel:create production
eas channel:edit preview --branch preview
eas channel:edit production --branch production
```

**Step 3 - Feature work on preview**

```bash
git checkout -b fix/checkout-validation
# ... JS changes only (OTA-safe) ...
 
eas update --branch preview --channel preview --environment preview \
  --message "fix: card validation regex"
```

**Step 4 - QA on preview binary**

```bash
# QA installs eas build --profile preview artifact
# Maestro smoke + manual payment path on physical device
eas update:list --branch preview --limit 3
```

**Step 5 - Promote to production (CI preferred)**

```yaml
# .github/workflows/eas-update-production.yml (excerpt)
name: Promote OTA to production
on:
  workflow_dispatch:
    inputs:
      message:
        required: true
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: eas update --branch production --channel production \
               --environment production \
               --message "${{ github.event.inputs.message }}"
```

**What this demonstrates:**

* **Branches** store update history; **channels** are the pointer apps query at runtime
* Preview soak happens on the **same channel** QA binaries embed via `requestHeaders`
* Production promotion is a deliberate second publish - not an accidental channel edit
* CI-only production publish leaves an audit trail (`eas update:list`, GitHub Actions logs)

## Deep Dive

### Channels vs Branches

```text
eas update --branch feature-x     →  writes bundle to branch "feature-x"
eas channel:edit preview --branch feature-x   →  preview channel now serves feature-x
App checks channel "preview"      →  receives head of branch feature-x
```

| Concept | Role |
| --- | --- |
| **Channel** | Named endpoint devices query (`expo-channel-name` header) |
| **Branch** | Git-like line of updates; holds bundle history |
| **Build profile** | Embeds default channel in binary via `eas.json` |

* `eas update --channel production` publishes to the branch currently linked to `production`
* Prefer explicit `--branch` when promoting so history stays traceable
* `eas channel:view <name>` shows branch mapping and current update ID

### Linear Promotion Flow

```text
development  →  preview (QA)  →  staging (optional soak)  →  production
     ↑              ↑                      ↑                        ↑
  engineer      internal build         24–48h soak              CI tag only
```

* **development:** rapid iteration; may break; not for stakeholders
* **preview:** release-like internal binary; Maestro smoke required
* **staging (optional):** longer soak for auth/payment; same binary class as preview
* **production:** store users; two-person rule or CI-only

### Mapping Git Branches to EAS Branches

```bash
# Trunk-based: publish from main to preview branch
git checkout main
eas update --branch preview --channel preview --environment preview
 
# GitFlow: publish from release/x.y to staging branch
git checkout release/2.4
eas update --branch staging --channel staging --environment staging
```

* EAS branches are **not** automatically tied to Git branches - you enforce mapping in CI
* Document which Git branch may publish to which EAS channel in CONTRIBUTING.md
* Reject direct `production` publish from unmerged feature branches

### Republish Promotion Pattern

When preview and production should run the **same bundle artifact**:

```bash
# Option A - cherry-pick commit and publish to production branch
git checkout main
git cherry-pick <preview-commit-sha>
eas update --branch production --channel production --environment production \
  --message "promote: <ticket-id>"
 
# Option B - channel redirect (advanced; use with care)
eas channel:edit production --branch preview
# Follow immediately with branch split if preview continues diverging
```

* Option A preserves clear Git history per channel
* Option B is faster but blurs branch semantics - document in runbook
* Always record **preview soak window** and **bundle ID** in the release ticket

## Gotchas

* **Channel header ≠ eas update channel** - Binary built with `preview` header never sees `production` updates. **Fix:** Rebuild or match publish channel to embedded header.
* **Skipping preview for "tiny" payment fix** - Incidents cost more than soak time. **Fix:** Minimum 24h preview on revenue paths per [Release & OTA Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/).
* **Local `.env` on production publish** - Wrong API host in OTA bundle. **Fix:** `eas update --environment production` always.
* **Two apps, one channel** - Consumer app receives business app JS. **Fix:** Separate `projectId`, channel, and bundle ID per variant.
* **Friday production OTA without weekend on-call** - Rollback at 6 p.m. with no coverage. **Fix:** Policy in release rules.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Branch per Git feature | Parallel QA of features | Too many stale branches |
| Single `main` branch for all channels | Small team, linear flow | Need parallel soaks |
| `eas channel:rollout` | Gradual production exposure | Need full soak on preview first |
| Store-only releases | Native every sprint | Weekly JS-only fixes |

## FAQs

How many channels do we need?

Minimum: `development`, `preview`, `production`. Add `staging` when revenue paths need 48h soak. Avoid per-person channels.

Can preview and production share a branch?

Technically yes, but it erases promotion audit trails. Prefer separate branches and promote via explicit publish or documented channel edit.

How do I see what production is serving?

```bash
eas channel:view production
eas update:view <update-id>
```

Does eas update --channel differ from --branch?

`--channel` publishes to the branch linked to that channel. `--branch` targets a branch directly. Use both for clarity during promotion.

Should production be CI-only?

Strongly recommended. Break-glass laptop publish needs second approver, `eas update:list` screenshot, and postmortem requirement.

## Related

* [OTA Updates Basics](https://docs.wahwei/reactnative.codeguides.io/ota-updates/ota-updates-basics/) - OTA vs store boundaries
* [expo-updates Configuration](https://docs.wahwei/reactnative.codeguides.io/ota-updates/expo-updates-configuration/) - `requestHeaders` wiring
* [Staged Rollouts](https://docs.wahwei/reactnative.codeguides.io/ota-updates/staged-rollouts/) - percentage rollouts on channels
* [Rollback Runbook](https://docs.wahwei/reactnative.codeguides.io/ota-updates/rollback-runbook/) - channel republish in minutes
* [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - profiles that embed channels
* [Release & OTA Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/) - Tier 2 promotion checklist

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
