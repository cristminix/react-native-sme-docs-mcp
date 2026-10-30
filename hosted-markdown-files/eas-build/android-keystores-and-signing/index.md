# Android Keystores & Signing

Upload keys and **Play App Signing** interplay - the EAS-focused cookbook for Android release identity on Expo SDK 57.

Highlights / Android Keystores & Signing

* EAS generates and stores upload keystores encrypted - eas credentials is team source of truth
* Play App Signing holds the app signing key; you sign AABs with the upload key
* assetlinks.json must use Play App Signing SHA-256 - not the upload key fingerprint
* Losing an upload key is recoverable with Play App Signing enabled
* Never commit .jks, .keystore, or passwords to git
* versionCode must increase monotonically on every Play upload

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
# First production build - let EAS generate the keystore
eas build --platform android --profile production
 
# Inspect remote credentials (admin)
eas credentials --platform android
 
# CI production build
eas build --platform android --profile production --non-interactive
```

```json
// eas.json
{
  "build": {
    "production": {
      "distribution": "store",
      "android": {
        "buildType": "app-bundle"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

```ts
// app.config.ts
export default {
  expo: {
    version: "2.4.0",
    android: {
      package: "com.example.shopapp",
      versionCode: 240001,
    },
  },
};
```

**When to reach for this:**

* First `eas build --platform android` prompts for keystore generation.
* Play Console rejects an AAB: "signed with the wrong key."
* App Links verification fails - fingerprint mismatch in `assetlinks.json`.
* Migrating from a legacy keystore on a former employee's laptop.

## Working Example

**Step 1 - Enable Play App Signing (new app)**

1. Create the app in Google Play Console.
2. On first AAB upload, accept **Google Play App Signing** (mandatory for new apps).
3. Google holds the **app signing key**; your team keeps the **upload key**.

**Step 2 - Generate upload credentials with EAS**

```bash
eas credentials --platform android
```

```text
? What do you want to do? › Set up a new keystore
? Generate a new Android Keystore? › Yes
```

EAS stores:

* **Keystore file** (encrypted)
* **Keystore password**, **key alias**, **key password**

**Step 3 - Production AAB build**

```bash
eas build --profile production --platform android
eas submit --platform android --profile production --latest
```

**Step 4 - Register App Links with Play signing fingerprint**

```bash
# Play Console → Release → App integrity → App signing key certificate
# Copy SHA-256 - NOT the upload key fingerprint
```

```json
// https://shop.example.com/.well-known/assetlinks.json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.example.shopapp",
      "sha256_cert_fingerprints": ["PLAY_APP_SIGNING_SHA256_HERE"]
    }
  }
]
```

See [Signing & Play App Signing](https://docs.wahwei/reactnative.codeguides.io/android-platform/signing-and-play-app-signing/) for the full Play Console walkthrough.

---

## Upload Key vs App Signing Key

| Key | Who holds it | Used for |
| --- | --- | --- |
| **Upload key** | Your team / EAS | Signing AABs you upload to Play |
| **App signing key** | Google (Play App Signing) | Signing APKs users download from Play |

```bash
# Upload key fingerprint (EAS credentials download - admin only)
eas credentials --platform android
 
# Debug keystore - local development ONLY
keytool -list -v -keystore ~/.android/debug.keystore \
  -alias androiddebugkey -storepass android -keypass android | grep SHA256
```

* **Never** put the debug keystore fingerprint in production `assetlinks.json`
* If Play App Signing is disabled (legacy apps), the upload key **is** the app signing key - treat loss as catastrophic

---

## Migrating an Existing Keystore

Brownfield apps already on Play must upload the **same upload key** EAS will use:

```bash
eas credentials --platform android
# Choose: Upload existing keystore
# Provide: .jks path, store password, key alias, key password
```

Checklist:

1. Export keystore from the previous CI system or developer machine
2. Confirm fingerprint matches Play Console → **App integrity** → **Upload key certificate**
3. Run a test `eas build` and `eas submit` to internal track before production
4. Revoke local copies after EAS upload succeeds - EAS is now source of truth

---

## Credential Recovery

### Lost upload key (Play App Signing enabled)

1. Play Console → **App integrity** → **Request upload key reset**
2. Generate a new upload key via `eas credentials --platform android`
3. Submit the new certificate to Google for approval
4. Rebuild and upload AAB - users unaffected (app signing key unchanged)

### Lost upload key (Play App Signing disabled)

* **No recovery path** - you cannot publish updates to the same package name
* This is why Play App Signing is mandatory for new apps

### Rotating off a teammate

```bash
# Admin downloads credentials backup (one-time export) and stores in team vault
eas credentials --platform android
 
# Remove local .jks from laptops - CI uses EAS remote credentials only
```

---

## eas.json Signing Options

```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle",
        "gradleCommand": ":app:bundleRelease"
      }
    },
    "development": {
      "android": {
        "buildType": "apk",
        "withoutCredentials": false
      }
    }
  }
}
```

* **`buildType": "app-bundle"`** - required for Play production
* **`buildType": "apk"`** - preview / internal sideload without Play
* **`withoutCredentials": true`** - unsigned debug-style builds only; rare for RN apps

---

## FAQs

Should EAS generate our keystore or should we bring our own?

* **Greenfield** - let EAS generate; simplest team onboarding.
* **Existing Play app** - upload the current upload keystore; fingerprint must match Play records.
* Never generate a second upload key for a live app without Play Console reset workflow.

Where does the keystore live?

* Encrypted on Expo servers, referenced by `eas credentials`.
* Optional one-time download for disaster recovery - store in a team password manager vault.
* Not in your git repo.

How do I auto-increment versionCode?

```json
{
  "cli": { "appVersionSource": "remote" },
  "build": {
    "production": { "autoIncrement": true }
  }
}
```

* Remote version source keeps CI and local builds aligned
* Play rejects duplicate `versionCode` - always increment on upload

APK or AAB for internal QA?

* **APK** - direct download link from EAS; no Play Console required.
* **AAB + internal track** - closer to production delivery; see [Internal Testing Tracks](https://docs.wahwei/reactnative.codeguides.io/android-platform/internal-testing-tracks/).

## Related

* [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - first cloud Android build
* [EAS Submit](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-submit/) - Play Console upload automation
* [Internal Distribution](https://docs.wahwei/reactnative.codeguides.io/eas-build/internal-distribution/) - APK links vs Play internal track
* [../android-platform/signing-and-play-app-signing/signing-and-play-app-signing.md](https://docs.wahwei/reactnative.codeguides.io/android-platform/signing-and-play-app-signing/) - Play Console app integrity deep dive
* [../android-platform/internal-testing-tracks/internal-testing-tracks.md](https://docs.wahwei/reactnative.codeguides.io/android-platform/internal-testing-tracks/) - internal → production promotion
* [../android-platform/android-basics-for-rn-devs/android-basics-for-rn-devs.md](https://docs.wahwei/reactnative.codeguides.io/android-platform/android-basics-for-rn-devs/) - `applicationId` and Gradle basics
* [../cng-prebuild/prebuild-basics/prebuild-basics.md](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/prebuild-basics/) - package name from app.config
* [../expo-rules/release-and-ota-rules/release-and-ota-rules.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/) - native builds vs OTA

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
