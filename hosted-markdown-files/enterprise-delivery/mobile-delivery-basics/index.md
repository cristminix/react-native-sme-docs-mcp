# Mobile Delivery Basics

Ten examples for coordinating **native store releases** with **OTA JavaScript trains** - the operational foundation enterprise mobile teams need before scaling past one engineer tagging Friday builds.

Highlights / Mobile Delivery Basics

* Two clocks: store binary (native) and OTA bundle (JS) - never confuse which path a change takes
* runtimeVersion links Clock A binaries to Clock B updates - mismatch strands users silently
* Feature flags decouple binary live from feature visible - essential for coordinated trains
* Backend API changes deploy before or with the mobile binary that depends on them
* Same build\_id from EAS through QA to eas submit - no rebuild between sign-off and store
* OTA-only weeks skip store submit but still need channel discipline and rollback cards

## Prerequisites

Enterprise delivery assumes you already have EAS Build and EAS Update configured:

```bash
npx create-expo-app@latest EnterpriseDelivery --template blank-typescript@sdk-57 --yes
cd EnterpriseDelivery
npx expo install expo-updates
npx eas init
npx eas update:configure
npx eas build:configure
```

Confirm the stack pin:

```json
{
  "dependencies": {
    "expo": "~57.0.4",
    "react": "19.2.3",
    "react-native": "0.86.0"
  }
}
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**. Read [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) and [OTA Updates Basics](https://docs.wahwei/reactnative.codeguides.io/ota-updates/ota-updates-basics/) before coordinating trains.

---

## Basic Examples

### 1. Two Delivery Clocks

Every enterprise release decision starts with **which clock** the change belongs to:

```text
Clock A - Store binary (eas build + eas submit)
  Changes: native modules, SDK bumps, permissions, entitlements, icons
  Cadence: biweekly or monthly release train
  Rollback: new store version (hours to days)
 
Clock B - OTA bundle (eas update)
  Changes: JS, TypeScript, assets, copy - same runtimeVersion as Clock A
  Cadence: daily to weekly between store trains
  Rollback: eas update:rollback (minutes)
```

| Clock | CI entrypoint | Owner | User impact if mistimed |
| --- | --- | --- | --- |
| A | `eas build` on tag | Mobile platform | Crash on launch, store rejection |
| B | `eas update` on merge | Mobile feature | Wrong UI, JS errors on old binary |

* **Clock A** is slow but changes the native shell - Hermes, native modules, push entitlements
* **Clock B** is fast but cannot add native code - only JS the binary already supports
* Enterprise teams document both clocks on a shared calendar - [Release Train Calendar](https://docs.wahwei/reactnative.codeguides.io/cicd/release-train-calendar/)

---

### 2. Map Changes to the Right Clock

Use a simple decision table in every PR template:

| Change | Clock | Why |
| --- | --- | --- |
| Button color fix | B (OTA) | Pure JS |
| New `expo-camera` dependency | A (store) | Native module + permission strings |
| API client reads new optional field | B (OTA) | Tolerant reader in JS |
| Hermes / SDK 57 bump | A (store) | Native runtime change |
| Swap hero image asset | B (OTA) | Bundled asset |
| Add `NSCameraUsageDescription` | A (store) | Info.plist in binary |

```bash
# PR checklist snippet - paste into .github/pull_request_template.md
## Delivery path
- [ ] JS-only → preview soak → production OTA
- [ ] Native change → eas build required; OTA blocked until new binary ships
```

> **Related:** [OTA Updates Basics](https://docs.wahwei/reactnative.codeguides.io/ota-updates/ota-updates-basics/) - what OTA can and cannot change

---

### 3. Link Store Binary to OTA with runtimeVersion

`runtimeVersion` is the contract between Clock A and Clock B:

```ts
// app.config.ts
import type { ExpoConfig } from "expo/config";
 
const config: ExpoConfig = {
  name: "EnterpriseDelivery",
  slug: "enterprise-delivery",
  version: "2.5.0",
  runtimeVersion: {
    policy: "appVersion", // "2.5.0" line receives 2.5.x OTAs only
  },
  updates: {
    url: "https://u.expo.dev/<project-id>",
  },
  ios: { bundleIdentifier: "com.example.enterprisedelivery" },
  android: { package: "com.example.enterprisedelivery" },
};
 
export default config;
```

```json
// eas.json - channel embedded at build time
{
  "build": {
    "production": {
      "channel": "production",
      "environment": "production"
    }
  }
}
```

* Production binaries built with `runtimeVersion: 2.5.0` receive OTAs published for `2.5.0` only
* Bumping `version` to `2.6.0` without a new store build strands `2.5.0` users on stale JS
* See [Runtime Version Policy](https://docs.wahwei/reactnative.codeguides.io/ota-updates/runtime-version-policy/) for `fingerprint` and `sdkVersion` alternatives

---

### 4. Align eas.json Channel with Update Target

Every production binary must listen on the same channel you publish to:

```bash
# Build production binary - channel baked in at compile time
eas build --profile production --platform all --non-interactive
 
# OTA must target the same channel
eas update --channel production --environment production \
  --message "fix: checkout total rounding"
```

```bash
# Verify alignment before every production OTA
eas channel:view production
# Confirm channel points at production branch and runtimeVersion matches app.config
```

* Mismatched channels cause "update never arrives" support tickets - not crashes
* White-label apps need **separate channels per bundle ID** - never share one production channel
* [Release Channels & Branches](https://docs.wahwei/reactnative.codeguides.io/ota-updates/release-channels-and-branches/) documents the promotion flow

---

### 5. Store Train + OTA Train on One Calendar

Enterprise teams run **one shared calendar** - not separate iOS, Android, and JS spreadsheets:

```markdown
# Release 2.5.0 - Week of 2026-07-14
 
## Clock A (store)
- Thu W1: code freeze 18:00 UTC
- Fri W1: tag v2.5.0; eas build production; gated submit
- Mon W2: Play staged 10% → 50%
- Wed W2: ASC phased release 100%
 
## Clock B (OTA)
- Mon–Wed W1: OTA to preview channel only (behind flags)
- Thu W1: freeze OTA to production until store RC signed
- Wed W2: OTA hotfix lane open if runtimeVersion unchanged
 
## Dependencies
- [ ] API v3 on prod - @backend - Thu W1
- [ ] Feature flag checkout_v3 at 0% - @mobile - Fri W1
```

* **OTA freeze** during store RC prevents JS drift between QA sign-off and submit
* **Hotfix lane** reopens after store binary is live and `runtimeVersion` is stable
* Full template: [Release Train Calendar](https://docs.wahwei/reactnative.codeguides.io/cicd/release-train-calendar/)

---

### 6. Pin build\_id from QA to Submit

The artifact QA tested must be the artifact stores receive:

```bash
# Release pipeline records build_id in ticket
eas build --profile production --platform ios --non-interactive
# build_id: abc123-def456-...
 
# QA signs off on abc123 - never rebuild before submit
eas submit --platform ios --id abc123-def456-... --non-interactive
```

```yaml
# .github/workflows/release.yml - submit pinned ID from workflow output
- name: Submit iOS (pinned build)
  run: eas submit --platform ios --id ${{ needs.build.outputs.ios_build_id }} --non-interactive
```

* Rebuilding between QA and submit invalidates crash-symbolication mapping and review screenshots
* `--latest` submit is for emergencies only - document when it is allowed
* [Automated Store Promotion](https://docs.wahwei/reactnative.codeguides.io/cicd/automated-store-promotion/) automates the pin

---

### 7. Coordinate Backend Before Mobile OTA

JS that calls a new API must not ship OTA until the backend is live:

```text
Wrong order:  OTA ships Monday → API deploys Thursday → 3 days of 404s
Right order:  API deploys Thursday (backward compatible) → OTA ships Friday
```

```ts
// src/api/checkout.ts - tolerant reader until flag ramps
export async function fetchCheckoutConfig(): Promise<CheckoutConfig> {
  const res = await api.get("/v3/checkout/config");
  if (res.status === 404) {
    return api.get("/v2/checkout/config"); // fallback for old path
  }
  return res.json();
}
```

* **Backward-compatible API** deploys first; mobile OTA enables UI via feature flag second
* **Breaking API removal** requires Clock A store binary without old calls - coordinate deprecation window
* Contract tests in PR checks catch drift - [Contract Tests for APIs](https://docs.wahwei/reactnative.codeguides.io/testing/contract-tests-for-apis/)

---

### 8. Feature Flags Bridge Binary and OTA

Store binaries can sit in review for days while JS ships daily - flags decouple **live** from **visible**:

```text
Day 1: eas build ships v2.5.0 to TestFlight - checkout_v3 flag OFF
Day 3: eas update ships checkout UI - still hidden behind flag
Day 5: App Review approves; staged rollout begins - flag 0%
Day 7: OTA + flag ramp to 10% internal cohort
Day 10: flag 100% after metrics pass
```

* **Binary live** means the native shell is in the store - users can install it
* **Feature visible** means the flag (or channel) exposes the new experience
* Deep dive: [Feature Flags on Mobile](https://docs.wahwei/reactnative.codeguides.io/enterprise-delivery/feature-flags-on-mobile/)

---

### 9. OTA-Only Week (No Store Train)

When the train is JS-only, skip Clock A but keep discipline:

```bash
# Mon - merge behind flags; publish preview
eas update --channel preview --environment preview --message "feat: loyalty points UI"
 
# Tue - QA soak on preview binary (same runtimeVersion as production)
# Wed - staged production rollout
eas update --channel production --environment production \
  --rollout-percentage=10 --message "rollout: loyalty @ 10%"
 
# Thu - monitor Sentry; roll back if crash-free drops
# Fri - 100% if metrics hold
```

* OTA-only weeks still need **preview soak** on revenue paths - rollouts are not a substitute
* Record **last known-good update ID** in every ticket - [Rollback Runbook](https://docs.wahwei/reactnative.codeguides.io/ota-updates/rollback-runbook/)
* [Staged Rollouts](https://docs.wahwei/reactnative.codeguides.io/ota-updates/staged-rollouts/) documents percentage gates

---

### 10. Rollback Paths per Clock

Document rollback before you need it - enterprise incidents move faster with pre-written cards:

| Clock | Trigger | Action | ETA |
| --- | --- | --- | --- |
| B (OTA) | Crash-free -2% after publish | `eas update:rollback` + flag off | < 15 min |
| B (OTA) | Payment success -1% | Flag off first; rollback second | < 10 min |
| A (store) | Native crash on launch | Halt staged rollout; promote previous version | 1–24 hr |
| A (store) | Store rejection | Fix binary; resubmit - OTA cannot fix native | days |

```bash
# OTA rollback card - fill per release
eas update:list --branch production --limit 3
# Last known-good: <update-group-id>
eas update:rollback
```

* **OTA cannot fix native crashes** - escalate to Clock A hotfix binary
* **runtimeVersion mismatch** requires new store build - not channel republish
* Advanced patterns: [Canary OTA & Blue-Green](https://docs.wahwei/reactnative.codeguides.io/enterprise-delivery/canary-ota-and-blue-green/)

---

## FAQs

Can we ship OTA during App Store review?

Yes, if `runtimeVersion` matches the binary in review and the OTA does not change behavior reviewers will test. Keep production OTAs behind flags until approval - reviewers may test a build that receives an OTA on launch.

How often should enterprise teams run store trains?

Biweekly is common for consumer apps; monthly for regulated industries. OTA fills the gap between trains - daily or weekly for JS fixes. Match cadence to store-review risk and backend dependency windows.

Who owns the release calendar?

Engineering manager or release captain - accountable. Mobile, backend, QA, and support are consulted. The calendar lives in a shared doc or Jira epic, not one engineer's notebook.

Do iOS and Android need separate OTA publishes?

One `eas update` serves both platforms when they share `runtimeVersion` and channel. Store submits remain per-platform - [EAS Submit](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-submit/).

## Related

* [Mobile CI/CD Basics](https://docs.wahwei/reactnative.codeguides.io/cicd/mobile-ci-cd-basics/) - PR checks vs release pipelines
* [Release Train Calendar](https://docs.wahwei/reactnative.codeguides.io/cicd/release-train-calendar/) - three-clock coordination
* [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - store binary foundation
* [OTA Updates Basics](https://docs.wahwei/reactnative.codeguides.io/ota-updates/ota-updates-basics/) - OTA-safe vs store-required changes
* [Release Channels & Branches](https://docs.wahwei/reactnative.codeguides.io/ota-updates/release-channels-and-branches/) - channel promotion
* [Feature Flags on Mobile](https://docs.wahwei/reactnative.codeguides.io/enterprise-delivery/feature-flags-on-mobile/) - controlled exposure cookbook
* [Release Checklist & Go/No-Go](https://docs.wahwei/reactnative.codeguides.io/enterprise-delivery/release-checklist-and-go-no-go/) - pre-submit sign-off

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
