# EAS Submit

Automating **App Store Connect** and **Play Console** uploads - the cookbook for shipping EAS Build artifacts to TestFlight, App Review, and Google Play tracks on Expo SDK 57.

Highlights / EAS Submit

* eas submit uploads finished EAS builds or local IPA/AAB artifacts to store consoles
* iOS needs App Store Connect API key or Apple ID + app-specific password
* Android needs a Play Console service account JSON with release permissions
* eas.json submit profiles mirror build profiles for repeatable CI uploads
* --auto-submit on eas build chains compile + upload in one workflow
* Submit to internal tracks first - production rollout is a separate Play Console step

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
# Build then submit latest artifact
eas build --profile production --platform ios
eas submit --platform ios --latest
 
eas build --profile production --platform android
eas submit --platform android --latest
 
# One-shot build + submit
eas build --profile production --platform ios --auto-submit
```

```json
// eas.json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "release@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCDE12345"
      },
      "android": {
        "serviceAccountKeyPath": "./secrets/play-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

```bash
# Non-interactive CI submit
eas submit --platform all --profile production --latest --non-interactive
```

**When to reach for this:**

* QA passed on a preview build - promote the production artifact to stores.
* CI should upload to TestFlight / Play internal track on every main merge.
* Replacing manual Transporter.app or Play Console drag-and-drop uploads.
* Standardizing which Play track receives each profile's AAB.

## Working Example

### iOS - App Store Connect

**Step 1 - Create App Store Connect API key**

1. App Store Connect → **Users and Access** → **Integrations** → **App Store Connect API**.
2. Generate key with **App Manager** or **Admin** role.
3. Download `.p8` once - store in team secrets vault.

```bash
eas credentials --platform ios
# Configure App Store Connect API key for submit
```

**Step 2 - Configure eas.json**

```json
{
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "1234567890",
        "appleTeamId": "ABCDE12345"
      }
    }
  }
}
```

Find `ascAppId` in App Store Connect → **App Information** → **Apple ID** (numeric).

**Step 3 - Build and submit**

```bash
eas build --profile production --platform ios
eas submit --platform ios --profile production --latest
```

Or with auto-submit:

```json
{
  "build": {
    "production": {
      "distribution": "store",
      "autoIncrement": true
    }
  }
}
```

```bash
eas build --profile production --platform ios --auto-submit
```

* Submitted builds appear in **TestFlight** within minutes - [TestFlight Distribution](https://docs.wahwei/reactnative.codeguides.io/ios-platform/testflight-distribution/)
* App Review submission is a separate step in App Store Connect after TestFlight validation
* Signing credentials come from [iOS Credentials & Provisioning](https://docs.wahwei/reactnative.codeguides.io/eas-build/ios-credentials-and-provisioning/) - submit uses different API keys

---

### Android - Google Play Console

**Step 1 - Create service account**

1. Google Cloud Console → create service account with no default roles.
2. Play Console → **Users and permissions** → invite service account email.
3. Grant **Release to production, exclude devices, and use Play App Signing** (or narrower release permissions for CI).
4. Download JSON key → `./secrets/play-service-account.json` (gitignored).

**Step 2 - Configure eas.json tracks**

```json
{
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./secrets/play-service-account.json",
        "track": "internal",
        "releaseStatus": "completed"
      }
    },
    "closed-beta": {
      "android": {
        "serviceAccountKeyPath": "./secrets/play-service-account.json",
        "track": "alpha"
      }
    }
  }
}
```

**Step 3 - Build AAB and submit**

```bash
eas build --profile production --platform android
eas submit --platform android --profile production --latest
```

* **`track": "internal"`** - fastest QA loop - [Internal Testing Tracks](https://docs.wahwei/reactnative.codeguides.io/android-platform/internal-testing-tracks/)
* Promote internal → closed → open → production in Play Console UI
* `versionCode` must exceed all prior uploads - use `autoIncrement` on build profile

---

## Submit Profiles and CI

```yaml
# .github/workflows/release.yml (excerpt)
name: Release
on:
  push:
    tags: ["v*"]
jobs:
  submit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm install -g eas-cli
      - run: eas submit --platform all --profile production --latest --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

```bash
# Submit a specific build ID (not just --latest)
eas submit --platform ios --id <build-uuid>
```

* **`EXPO_TOKEN`** - machine token from expo.dev → Access tokens
* Store Apple `.p8` and Play JSON as CI secrets - reference paths in `eas.json` or env overrides
* Gate submit on fingerprint unchanged or explicit release approval

---

## Local Artifact Submit

Submit IPAs or AABs built outside EAS:

```bash
eas submit --platform ios --path ./dist/ShopApp.ipa
eas submit --platform android --path ./dist/ShopApp.aab --profile production
```

Use when:

* Migrating from legacy CI that produces artifacts locally
* Re-submitting a known-good build after a metadata-only rejection

---

## Common Errors

| Error | Platform | Fix |
| --- | --- | --- |
| "Invalid Provisioning Profile" | iOS | Rebuild with valid distribution profile - [iOS Credentials](https://docs.wahwei/reactnative.codeguides.io/eas-build/ios-credentials-and-provisioning/) |
| "Redundant Binary Upload" | iOS | Increment `buildNumber` - enable `autoIncrement` |
| "Version code has already been used" | Android | Bump `versionCode` in `app.config.ts` or remote version |
| "APK/AAB not signed with upload key" | Android | Align EAS keystore with Play upload certificate |
| "Service account lacks permission" | Android | Re-invite SA in Play Console with release rights |

---

## FAQs

Does eas submit replace App Store Connect metadata?

* **No** - screenshots, descriptions, and pricing remain in App Store Connect / Play Console.
* Submit uploads the **binary** only - metadata is configured separately or via App Store Connect API elsewhere.

Can I submit a preview profile build to production?

* Technically yes if signing and bundle ID match production - **not recommended**.
* Build with the **production** profile so env vars, channels, and entitlements match release.

What is the difference between internal track and production on Play?

* **internal** - up to 100 testers, minutes to availability.
* **production** - public users; use staged rollout percentage after tracks pass QA.
* See [Internal Distribution](https://docs.wahwei/reactnative.codeguides.io/eas-build/internal-distribution/).

How does auto-submit interact with App Review?

* Auto-submit uploads to **App Store Connect** - TestFlight processing still applies.
* Selecting **App Review** for public release remains a manual or API-driven promotion step.
* Read [App Store Review Guidelines](https://docs.wahwei/reactnative.codeguides.io/ios-platform/app-store-review-guidelines/) before first submission.

## Related

* [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - producing store-shaped artifacts
* [iOS Credentials & Provisioning](https://docs.wahwei/reactnative.codeguides.io/eas-build/ios-credentials-and-provisioning/) - signing vs submit API keys
* [Android Keystores & Signing](https://docs.wahwei/reactnative.codeguides.io/eas-build/android-keystores-and-signing/) - upload key alignment
* [Internal Distribution](https://docs.wahwei/reactnative.codeguides.io/eas-build/internal-distribution/) - TestFlight and Play internal paths
* [../ios-platform/testflight-distribution/testflight-distribution.md](https://docs.wahwei/reactnative.codeguides.io/ios-platform/testflight-distribution/) - tester groups and build expiry
* [../ios-platform/app-store-review-guidelines/app-store-review-guidelines.md](https://docs.wahwei/reactnative.codeguides.io/ios-platform/app-store-review-guidelines/) - review readiness
* [../android-platform/internal-testing-tracks/internal-testing-tracks.md](https://docs.wahwei/reactnative.codeguides.io/android-platform/internal-testing-tracks/) - track promotion workflow
* [../cng-prebuild/cng-in-ci/cng-in-ci.md](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/cng-in-ci/) - CI build + submit pipelines
* [../expo-rules/release-and-ota-rules/release-and-ota-rules.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/) - OTA after store submit

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
