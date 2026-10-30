# EAS Release Skill

Build, submit, and OTA steps with guardrails - a cookbook-style **Agent Skill** for shipping **Expo SDK 57** binaries and updates without unsafe automation.

Highlights / EAS Release Skill

* Skill output is a ordered build → submit → OTA checklist - not a tutorial on EAS concepts
* Always classify changes as JS-only vs native-impacting before choosing eas update vs eas build
* runtimeVersion and channel must appear in every OTA skill invocation
* Submit profiles mirror build profiles - production credentials never land in git
* Verification ends with eas channel:view and npx expo-doctor
* Pair with EAS Build Basics and OTA Updates Basics for human-readable depth

## What This Skill Does

Produces an **executable release plan**: `eas.json` profile selection, cloud build commands, store submit steps, and optional `eas update` - each gated by `runtimeVersion`, credentials, and change classification.

## When to Invoke

* First production release or new `eas.json` profile
* Choosing **OTA vs store binary** for a hotfix
* Wiring `--auto-submit` or CI non-interactive submit
* Adding preview/internal distribution before production
* Post-merge release on `release/*` branches

## Inputs

| Input | Why |
| --- | --- |
| `eas.json` | Profiles, env, submit targets |
| `app.config.ts` | `version`, `runtimeVersion`, bundle IDs |
| Change list | JS-only vs native (modules, permissions, plugins) |
| Target channel/branch | `production`, `preview`, etc. |
| Last known-good `updateId` | Rollback anchor for OTA path |
| Platform scope | `ios`, `android`, `all` |

## Outputs

* Ordered command checklist with `--non-interactive` CI variants
* Risk callouts (credentials, phased rollout, track selection)
* Verification: `eas build:list`, `eas submit`, `eas channel:view`, `npx expo-doctor`
* Explicit **stop** if change is native-impacting but human requested OTA-only

## Guardrails

1. **Native change → `eas build`.** New `expo-*` module, permission, config plugin, or `expo-build-properties` edit is never OTA-only.
2. **`runtimeVersion` must match** live store binaries for OTA - see [Runtime Version Policy](https://docs.wahwei/reactnative.codeguides.io/ota-updates/runtime-version-policy/).
3. **Submit to internal/TestFlight first** - production Play track rollout is a separate console step ([EAS Submit](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-submit/)).
4. **Secrets in EAS environments** - not committed `.env` files ([Build Profiles & Flavors](https://docs.wahwei/reactnative.codeguides.io/eas-build/build-profiles-and-flavors/)).
5. **Pause phased/staged rollout** before hotfix binary when crash storm is active.
6. **Run `npx expo-doctor`** after any skill-generated dependency or plugin change.

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
# 1. Classify change
npx expo-doctor
git diff --name-only HEAD~1   # scan package.json, app.config.ts, plugins/
 
# 2. Cloud build (store-shaped)
eas build --profile production --platform all --non-interactive
 
# 3. Submit latest artifacts
eas submit --platform ios --latest --non-interactive
eas submit --platform android --latest --non-interactive
 
# 4. JS-only hotfix (same runtimeVersion)
eas update --channel production --message "fix: checkout validation copy"
 
# 5. Verify
eas channel:view production
eas build:list --limit 3
```

```json
// eas.json (excerpt - SDK 57)
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview"
    },
    "production": {
      "channel": "production",
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": { "ascAppId": "1234567890" },
      "android": {
        "serviceAccountKeyPath": "./secrets/play-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

**When to reach for this skill:**

* Release captain needs a **single checklist** before Friday deploy
* Agent is asked to "ship the fix" without specifying OTA vs binary
* New engineer onboarding to EAS - skill enforces guardrails docs alone might skip

---

## Working Example

### Step 0 - Classify the change

```bash
npx expo-doctor
```

| Signal | Path |
| --- | --- |
| Only `.tsx`, hooks, copy | OTA candidate |
| `package.json` new `expo-camera` | **Build required** |
| `app.config.ts` plugin added | **Build required** |
| Hermes / RN version bump | **Build required** + `runtimeVersion` review |

### Step 1 - Build

```bash
eas build --profile production --platform all
# CI one-shot:
eas build --profile production --platform ios --auto-submit --non-interactive
```

* `developmentClient: true` → dev client, not store - [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/)
* CNG teams: native dirs generated on server - [Prebuild Basics](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/prebuild-basics/)

### Step 2 - Submit

```bash
eas submit --platform ios --latest
eas submit --platform android --latest
```

* Android `track: "internal"` in `eas.json` - promote in Play Console later
* iOS lands in TestFlight - phased release is App Store Connect step

### Step 3 - OTA (JS-only)

```bash
eas update --channel production --message "fix: cart total rounding"
eas channel:view production
```

* Record published `updateId` in release ticket - [Rollback Runbook](https://docs.wahwei/reactnative.codeguides.io/ota-updates/rollback-runbook/)
* Staged OTA rollout: [Staged Rollouts](https://docs.wahwei/reactnative.codeguides.io/ota-updates/staged-rollouts/)

### Step 4 - Verify

```bash
npx expo-doctor
eas build:list --limit 1
eas update:list --branch production --limit 3
```

---

## Example Invocation Prompts

```text
Invoke EAS Release skill. SDK 57.
Change: fixed typo in Settings screen - no package.json diff.
Give OTA commands for production channel. Include rollback note with last good updateId f7a2.
```

```text
Invoke EAS Release skill.
Added expo-notifications + config plugin in app.config.ts.
Produce full build + submit checklist for ios and android production profiles.
Flag anything that blocks OTA.
```

```text
Invoke EAS Release skill for CI.
Need non-interactive eas build --auto-submit on merge to release/2.4.
List required EAS secrets and eas.json submit block only.
```

---

## Decision: OTA vs Store Binary

```text
                    ┌─────────────────┐
                    │  Change landed  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ expo-doctor OK? │──no──► fix config/deps first
                    └────────┬────────┘
                             │ yes
                    ┌────────▼────────────────┐
                    │ Native-impacting change?  │
                    └────────┬────────────────┘
                         yes │      │ no
              ┌──────────────┘      └──────────────┐
              ▼                                    ▼
      eas build + submit                  runtimeVersion
      (new binary)                        matches store?
                                                    │
                                    yes ──► eas update
                                    no  ──► eas build (bump runtimeVersion)
```

---

## FAQs

Can the skill run eas submit to production Play track automatically?

Technically yes via `track: "production"` - guardrail: default to **internal** until QA signs off. Skill should warn when production track is requested.

Does --auto-submit skip TestFlight testing?

No - it uploads the binary. TestFlight distribution and App Review are still console steps unless your workflow promotes separately.

What if expo-doctor fails mid-release?

Stop. Skill output should not include submit/OTA until doctor passes. Fix skew with `npx expo install --fix` per [SDK Upgrade Skill](https://docs.wahwei/reactnative.codeguides.io/skills/sdk-upgrade-skill/).

## Related

* [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - profiles, first cloud build
* [EAS Submit](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-submit/) - ASC and Play upload cookbook
* [Build Profiles & Flavors](https://docs.wahwei/reactnative.codeguides.io/eas-build/build-profiles-and-flavors/) - env and credentials
* [OTA Updates Basics](https://docs.wahwei/reactnative.codeguides.io/ota-updates/ota-updates-basics/) - channels and branches
* [Rollback Runbook](https://docs.wahwei/reactnative.codeguides.io/ota-updates/rollback-runbook/) - bad OTA recovery
* [Mobile CI/CD Basics](https://docs.wahwei/reactnative.codeguides.io/cicd/mobile-ci-cd-basics/) - pipeline integration
* [Agent Skills Basics](https://docs.wahwei/reactnative.codeguides.io/skills/agent-skills-basics/) - SKILL.md structure

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
