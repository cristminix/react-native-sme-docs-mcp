# Store Operations Basics

10 examples to get you started with Store Operations - 7 basic and 3 intermediate. Each example moves one step along the **build → test → submit → release → monitor** path for Expo SDK 57 apps on App Store Connect and Google Play Console.

Highlights / Store Operations Basics

* Store ops starts after a production-shaped EAS build - not Expo Go or debug APKs
* Bump ios.buildNumber and android.versionCode on every store upload - stores reject duplicates
* TestFlight and Play internal tracks validate signing and policy before App Review
* Metadata, privacy forms, and review notes live in git - not only in console UIs
* eas submit automates upload; humans still own release timing and rollout percentage
* Phased release on iOS and staged rollout on Play are your first rollback levers

## Prerequisites

Store operations assume you already ship binaries with EAS Build. Scaffold or confirm an Expo project pinned to SDK 57:

```bash
npx create-expo-app@latest MyStoreApp --template blank-typescript
cd MyStoreApp
npx expo install expo-dev-client
eas init
```

Confirm versions in `package.json`:

```json
{
  "dependencies": {
    "expo": "~57.0.4",
    "react": "19.2.3",
    "react-native": "0.86.0"
  }
}
```

Link the project to EAS and configure at least a `production` build profile in `eas.json`. Store uploads require **store distribution** builds - not `development` or simulator artifacts.

| Stage | iOS artifact | Android artifact |
| --- | --- | --- |
| Local QA | EAS internal / dev client | EAS internal APK or AAB |
| Pre-store | TestFlight IPA | Play internal AAB |
| Store submit | Production IPA | Production AAB |
| Live users | App Store release | Production track |

> **Tooling:** These examples target **Expo SDK 57**, **React Native 0.86**, and **React 19.2.3**. Automate uploads with [EAS Submit](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-submit/); policy details live in [App Store Review Guidelines](https://docs.wahwei/reactnative.codeguides.io/ios-platform/app-store-review-guidelines/) and [Permissions & Play Policy](https://docs.wahwei/reactnative.codeguides.io/android-platform/permissions-and-play-policy/).

---

## Basic Examples

### 1. Version Bump in `app.config.ts`

Every store upload needs a **new build number** (iOS) and **versionCode** (Android). Marketing `version` can stay the same for hotfixes; native integers must always increase.

```ts
// app.config.ts
import type { ExpoConfig } from "expo/config";
 
const config: ExpoConfig = {
  expo: {
    name: "ShopApp",
    slug: "shop-app",
    version: "2.4.0",
    ios: {
      bundleIdentifier: "com.example.shopapp",
      buildNumber: "240012", // CFBundleVersion - increment every upload
    },
    android: {
      package: "com.example.shopapp",
      versionCode: 240012, // monotonic integer - increment every upload
    },
  },
};
 
export default config;
```

* **`version`** is user-facing semver on both stores
* **`buildNumber`** / **`versionCode`** must increase even for "same version" rebuilds
* CI can derive integers from `git rev-list --count HEAD` - document the scheme in README
* Run `npx expo config --type public` before build to catch typos

> **Related:** [App Store Connect Workflow](https://docs.wahwei/reactnative.codeguides.io/store-operations/app-store-connect-workflow/) - metadata tied to version strings

---

### 2. Production EAS Build for Both Platforms

Store submission starts with **release-shaped** binaries signed with production credentials.

```bash
# One command per platform (or both)
eas build --profile production --platform ios
eas build --profile production --platform android
 
# Verify build finished
eas build:list --limit 5
```

```json
// eas.json - minimum production profile
{
  "build": {
    "production": {
      "distribution": "store",
      "ios": { "simulator": false },
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

* **`distribution: "store"`** produces App Store IPA and Play AAB - not ad-hoc internal links
* Download and smoke-test on physical devices before submit - simulators hide push, biometrics, and IAP
* Tag the git commit that produced the build - store incidents trace back to source

---

### 3. Pre-Store Gate with `expo-doctor`

Catch SDK drift and config mistakes before burning a review cycle.

```bash
npx expo-doctor
npx expo config --type public > /tmp/public-config.json
npm run typecheck
npm test -- --ci
```

```markdown
<!-- docs/release-gates.md - copy into every release PR -->
## Pre-submit gate
- [ ] expo-doctor green
- [ ] Release build installed on iOS + Android device
- [ ] Cold start, login, paywall, push tap, deep link, logout, account delete
- [ ] Privacy labels / Data safety match SDK inventory
- [ ] Review notes updated with demo credentials
```

* **`expo-doctor`** flags incompatible package versions against SDK 57
* Treat the device smoke test as non-negotiable - Guideline 2.1 rejections are often "crashes on launch"
* Keep gates in git so new engineers do not rely on tribal memory

---

### 4. TestFlight and Play Internal Before Public Review

Validate signing, entitlements, and policy forms on **real store pipelines** before production users or App Review see the build.

```bash
# iOS → TestFlight (same binary as App Store submit)
eas build --profile production --platform ios
eas submit --platform ios --latest
 
# Android → internal testing track
eas submit --platform android --profile production --latest
# eas.json submit.android.track: "internal"
```

| Track | Console path | Typical audience |
| --- | --- | --- |
| TestFlight internal | App Store Connect → TestFlight | Up to 100 ASC users, no Beta Review |
| TestFlight external | TestFlight → External testing | Up to 10k, Beta App Review |
| Play internal | Testing → Internal testing | Up to 100 emails, minutes to process |

* Internal tracks catch **wrong bundle ID**, **missing push entitlement**, and **Data safety** gaps cheaply
* External TestFlight and open beta add review latency - plan calendar accordingly
* See [TestFlight Distribution](https://docs.wahwei/reactnative.codeguides.io/ios-platform/testflight-distribution/) and [Internal Testing Tracks](https://docs.wahwei/reactnative.codeguides.io/android-platform/internal-testing-tracks/)

---

### 5. Store Metadata Snapshot in the Repo

Listing copy, URLs, and keywords should not exist only in App Store Connect or Play Console - version them beside code.

```ts
// store/metadata.ts - single source for both stores
export const storeMetadata = {
  appName: "ShopApp",
  subtitle: "Scan, save, checkout fast",
  shortDescription:
    "Shop smarter with barcode scan, saved lists, and secure checkout.",
  fullDescription: `ShopApp helps you build grocery lists, compare prices, and check out in seconds.
 
• Barcode scanner for in-aisle adds
• Shared household lists
• Secure sign-in and account deletion in Settings`,
  keywords: ["grocery", "scanner", "shopping", "list"],
  privacyPolicyUrl: "https://example.com/privacy",
  supportUrl: "https://example.com/support",
  marketingUrl: "https://example.com",
} as const;
```

* Paste from this file into Connect and Play - reduces typo drift between platforms
* **Privacy policy URL** must load without login - reviewers and Play bots check this
* Localize in `store/metadata.en.ts`, `store/metadata.de.ts` when you add locales

> **Related:** [App Store Connect Workflow](https://docs.wahwei/reactnative.codeguides.io/store-operations/app-store-connect-workflow/) - full metadata checklist

---

### 6. Review Notes Template for App Review

Reviewers need working credentials, feature flags off, and reproduction paths - especially for login-gated Expo apps.

```markdown
<!-- store/review-notes-ios.md -->
## App Review notes (iOS)
 
**Demo account**
- Email: reviewer@example.com
- Password: ReviewDemo2026!
 
**How to test core flow**
1. Launch app → tap Sign In → use demo account above
2. Home → tap Scan → grant Camera when prompted → scan any UPC
3. Profile → Settings → Delete Account (required for account-creation apps)
 
**Backend**
- Production API; no VPN required
- Push notifications: send test from Profile → Notification test
 
**ATT / tracking**
- We do not track users across apps; ATT prompt is not shown
- Analytics: first-party only (Sentry crashes, no ad ID)
 
**Contact**
- engineering-mobile@example.com (responds within 4 business hours)
```

* Attach the same content in **App Store Connect → App Review Information → Notes**
* Update passwords every release - expired demo accounts cause false rejections
* Mention if features are geo-gated or require hardware (NFC, LiDAR)

---

### 7. `eas submit` to Both Stores

Automate upload after QA signs off - humans still choose **when** the build goes live.

```bash
eas submit --platform ios --latest
eas submit --platform android --latest
```

```json
// eas.json - submit profiles
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "you@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCDE12345"
      },
      "android": {
        "serviceAccountKeyPath": "./secrets/play-service-account.json",
        "track": "production"
      }
    }
  }
}
```

* iOS upload lands in **App Store Connect → TestFlight** first; you manually submit for review
* Android `track: "production"` uploads to production - use `internal` until policy forms pass
* Store API credentials in EAS Secrets or encrypted CI vaults - never commit JSON keys

> **Related:** [EAS Submit](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-submit/) - credential setup and CI wiring

---

## Intermediate Examples

### 8. Coordinated Dual-Store Release Branch

Ship iOS and Android from one release branch with a shared checklist and frozen dependencies.

```bash
git checkout -b release/2.4.0
# bump version + build numbers in app.config.ts
git commit -am "chore(release): 2.4.0 build 240012"
eas build --profile production --platform all --non-interactive
```

```yaml
# .github/workflows/release.yml (excerpt)
jobs:
  store-submit:
    if: github.ref == 'refs/heads/release/2.4.0'
    steps:
      - run: npx expo-doctor
      - run: eas submit --platform ios --latest --non-interactive
      - run: eas submit --platform android --latest --non-interactive
```

| Role | Responsibility |
| --- | --- |
| Mobile lead | Merge release branch, trigger builds |
| QA | Sign TestFlight + internal track checklists |
| PM | Approve metadata and "What's New" copy |
| Eng on-call | Monitor crash rate first 24h after rollout |

* **Do not** cherry-pick unrelated features onto `release/*` - hotfixes get their own patch branch
* If one platform rejects, tag the approved build - do not rebuild both unnecessarily
* Record actual submit timestamps in `CHANGELOG.md`

---

### 9. Post-Submit Monitoring Dashboard

Store approval is not the finish line - watch crashes and ANRs as rollout percentage increases.

```ts
// lib/releaseHealth.ts - tag sessions with store build
import * as Application from "expo-application";
import Constants from "expo-constants";
 
export function releaseContext() {
  return {
    appVersion: Application.nativeApplicationVersion,
    buildNumber: Application.nativeBuildVersion,
    updateId: Constants.expoConfig?.updates?.checkAutomatically,
    platform: Application.applicationId,
  };
}
```

```markdown
## First 72 hours after live
- [ ] Crash-free sessions ≥ 99.5% (Sentry / Play Vitals)
- [ ] No spike in 1-star reviews mentioning "crash" or "login"
- [ ] iOS phased release day 1–2: hold at 1% if crashes climb
- [ ] Play staged rollout: pause at 20% if ANR rate doubles baseline
- [ ] Support inbox macro ready for "update app" replies
```

* Compare **build number** in crash reports to the build you promoted - OTA cannot fix native regressions
* Pair with [Phased Release & Rollback](https://docs.wahwei/reactnative.codeguides.io/store-operations/phased-release-and-rollback/) procedures
* Set PagerDuty thresholds before rollout - not after Twitter notices

---

### 10. Release Train Calendar (Build → Live)

A recurring calendar prevents "Friday submit" surprises and aligns marketing with phased rollout timing.

```markdown
<!-- docs/release-train.md -->
| Week | Activity | Owner |
|------|----------|-------|
| T-14 | Feature freeze on `main` | EM |
| T-10 | Cut `release/x.y.z`, bump build numbers | Mobile lead |
| T-7  | TestFlight + Play internal to QA | QA |
| T-5  | Metadata + privacy forms signed off | PM + Legal |
| T-3  | `eas submit` both platforms | Mobile lead |
| T-2  | iOS: submit for review; Android: production with 5% rollout | Mobile lead |
| T-0  | iOS: release with phased 7-day; Android: 20% → 50% → 100% | Mobile lead |
| T+1  | Go/no-go from crash dashboards | On-call |
```

* **iOS phased release** takes up to 7 days to reach 100% - plan marketing pushes after day 3–4 if metrics are clean
* **Play staged rollout** is manual percentage - document who can pause it (see incident runbook)
* EU **Digital Services Act** trader forms and age ratings must be complete before `T-3` or EU territories block

---

## FAQs

Can I ship the same marketing version twice?

* Yes - increment **buildNumber** / **versionCode** every upload.
* "What's New" copy can reference the same `version` string for a hotfix rebuild.

Does eas submit also release to users?

* **iOS:** Upload only - you still choose manual release, phased release, or scheduled date in App Store Connect.
* **Android:** `track` in `eas.json` determines destination; production uploads still need rollout % in Play Console unless you set 100%.

Expo Go vs development build vs store build?

* **Expo Go** cannot be submitted to stores.
* **Development builds** validate features; store ops uses **production** `distribution: "store"` profiles.

What if only Android is ready?

* Ship platforms independently - document version skew in support macros.
* Keep API backward compatibility when iOS trails Android by a week.

Where do privacy compliance tasks fit?

* Before submit: ATT, Nutrition Labels, Play Data safety - see [Compliance: ATT & Privacy Labels](https://docs.wahwei/reactnative.codeguides.io/store-operations/compliance-att-and-privacy-labels/).

## Related

* [App Store Connect Workflow](https://docs.wahwei/reactnative.codeguides.io/store-operations/app-store-connect-workflow/) - iOS listing and review checklist
* [Google Play Console Workflow](https://docs.wahwei/reactnative.codeguides.io/store-operations/google-play-console-workflow/) - Play listing and policy checklist
* [EAS Submit](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-submit/) - automated upload
* [App Store Review Guidelines](https://docs.wahwei/reactnative.codeguides.io/ios-platform/app-store-review-guidelines/) - common iOS rejections
* [Permissions & Play Policy](https://docs.wahwei/reactnative.codeguides.io/android-platform/permissions-and-play-policy/) - Android permissions and Data safety
* [Phased Release & Rollback](https://docs.wahwei/reactnative.codeguides.io/store-operations/phased-release-and-rollback/) - pause rollout safely

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 10, 2026
