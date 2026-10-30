# Signing & Play App Signing

Upload keys, Play App Signing, and EAS credential sync - how Android release identity works for Expo SDK 57 teams. Signing proves updates come from you; Play App Signing adds Google's key custody so lost laptops do not end your app.

Highlights / Signing & Play App Signing

* You sign AABs with an upload key; Google re-signs with the app signing key for users
* Play App Signing certificate SHA-256 goes in assetlinks.json - not your upload key
* EAS manages keystores remotely - eas credentials is the source of truth for teams
* Losing an upload key is recoverable with Play App Signing; losing the app signing key is catastrophic
* Never commit keystore files or passwords to git - use EAS secrets or CI encrypted storage

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
# First Android production build - let EAS generate credentials
eas build --platform android --profile production
 
# Inspect and download credentials (admin)
eas credentials --platform android
 
# Build with existing remote keystore
eas build --platform android --profile production --non-interactive
```

```json
// eas.json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./play-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

```bash
# Local debug fingerprint (development / adb App Links testing only)
keytool -list -v -keystore ~/.android/debug.keystore \
  -alias androiddebugkey -storepass android -keypass android | grep SHA256
 
# Play Console → App integrity → App signing key certificate → SHA-256
# Use THAT fingerprint in assetlinks.json for production App Links
```

**When to reach for this:**

* First `eas build` for Android production asks about keystore generation.
* App Links verification fails - fingerprint mismatch between upload and Play signing cert.
* A teammate rotated off and only they had the `.jks` file on a laptop.
* Play Console rejects an AAB with "signed with wrong key."

## Working Example

**Step 1 - Enable Play App Signing (new app)**

1. Create app in Play Console.
2. On first AAB upload, accept **Google Play App Signing** (recommended - mandatory for new apps).
3. Google holds the **app signing key**; you keep an **upload key**.

**Step 2 - Generate upload credentials with EAS**

```bash
eas credentials --platform android
# Choose: Set up a new keystore (or upload existing if migrating)
# EAS stores keystore + passwords encrypted on Expo servers
```

**Step 3 - Production build and submit**

```bash
eas build --platform android --profile production
eas submit --platform android --profile production --latest
```

**Step 4 - Register App Links fingerprint**

```bash
# Play Console → Release → App integrity → App signing
# Copy SHA-256 certificate fingerprint
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

See [Android App Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/android-app-links/) for full verification setup.

**Step 5 - Rotate upload key (lost laptop scenario)**

1. Play Console → **App integrity** → **Upload key** → **Request upload key reset**.
2. Generate new upload keystore locally or via `eas credentials`.
3. Submit PEM certificate to Google; wait for approval.
4. Future EAS builds use new upload key; user-facing app signing key unchanged.

**What this demonstrates:**

* **Upload vs app signing** - two keys, two purposes.
* **EAS remote credentials** - team builds without passing `.jks` in Slack.
* **assetlinks.json** - must use Play App Signing cert for production links.
* **Upload key rotation** - supported; app signing key stays stable.

## Deep Dive

### How It Works

* **APK/AAB signing** - Gradle signs the release artifact with your **upload private key** before upload to Play.
* **Play App Signing** - Google strips your signature, re-signs with the **app signing key**, and serves that binary to users.
* **Certificate fingerprints** - SHA-256 of the public cert identifies your app for App Links, Firebase, Google Sign-In, and API key restrictions.
* **EAS Build** - pulls credentials from Expo's credential service at build time; injects `keystore`, `key alias`, and passwords into Gradle signing config.
* **Version code** - monotonic integer per `applicationId`; Play rejects duplicates. EAS can auto-increment via `eas.json`.

### Key Types

| Key | Who holds it | Used for |
| --- | --- | --- |
| Debug keystore | Your machine (`~/.android/debug.keystore`) | `npx expo run:android` local debug |
| Upload key | You / EAS | Signing AAB before Play upload |
| App signing key | Google Play | Signing APKs users download |
| Local release keystore (no Play Signing) | You only | Legacy - avoid for new apps |

### EAS Credentials Commands

| Command | Action |
| --- | --- |
| `eas credentials` | Interactive credential manager |
| `eas credentials --platform android` | Android keystore menu |
| Download keystore | Backup for disaster recovery - store in vault |
| Upload keystore | Migrate existing app to EAS |
| Remove credentials | Dangerous - only when rotating with Play support |

```bash
# Non-interactive CI - credentials already configured on Expo account
eas build --platform android --profile production --non-interactive
```

### Gradle Signing (Bare Reference)

Expo prebuild generates signing config; bare teams may see:

```gradle
// android/app/build.gradle (release) - EAS injects via env in cloud builds
signingConfigs {
    release {
        storeFile file(MYAPP_UPLOAD_STORE_FILE)
        storePassword MYAPP_UPLOAD_STORE_PASSWORD
        keyAlias MYAPP_UPLOAD_KEY_ALIAS
        keyPassword MYAPP_UPLOAD_KEY_PASSWORD
    }
}
```

Do not commit passwords - EAS uses encrypted secrets; local `gradle.properties` entries belong in `.gitignore`.

### Fingerprint Cheat Sheet

| Need | Which fingerprint |
| --- | --- |
| Production App Links | Play **App signing** SHA-256 |
| Internal EAS build App Links (before Play) | Upload or debug cert - test separately |
| Firebase Android app | Usually Play app signing SHA-256 + debug for dev |
| Google Sign-In OAuth | SHA-1 and SHA-256 of signing certs |

## Gotchas

* **assetlinks.json uses upload key fingerprint** - Production links fail verification. **Fix:** Play Console app signing SHA-256.
* **Committing `*.jks` to git** - Key compromise; Play may force rotation. **Fix:** EAS remote credentials + vault backup only.
* **Reusing debug keystore for release** - Play rejects; security disaster. **Fix:** Separate upload keystore via EAS.
* **Version code not incremented** - `eas submit` fails "version code already used." **Fix:** `autoIncrement: true` in `eas.json` or bump `android.versionCode` in `app.config`.
* **Package name mismatch** - `com.example.shopapp` in config vs keystore registered to old package. **Fix:** New Play listing or correct `applicationId` before first publish.
* **Opting out of Play App Signing** - Loses upload key recovery path. **Fix:** Accept Play App Signing on new listings.

WTI5a1pXZDFhV1JsY3k1cGIzeGpaMmx2T1RFNGZESXdNall3Tnc9PQ==

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| EAS managed credentials | Default for Expo teams | Air-gapped enterprise with HSM-only policy |
| Local keystore + manual upload | Legal requirement to hold keys on-prem | Small team without HSM discipline |
| Google Cloud KMS signing | Enterprise key custody | Standard indie/small SaaS overhead |
| APK instead of AAB | Legacy sideload channels | Play Store production - AAB required |

## FAQs

Does EAS store my keystore securely?

* Yes - encrypted at rest on Expo infrastructure; accessible to project members with credentials permission.
* Download a backup to your company vault after generation.

Can multiple apps share one keystore?

* Technically yes (same key, different `applicationId`) - **not recommended**. One compromise affects all apps; use per-app keystores.

What if I lose the upload key?

* With Play App Signing: request upload key reset in Play Console, register new cert, update EAS credentials.
* Without Play App Signing: you cannot ship updates - new listing with new package name.

How do I migrate from local Gradle signing to EAS?

* `eas credentials` → upload existing `.jks` + alias + passwords.
* Confirm next `eas build` fingerprint matches what Play expects.

Why did Google Sign-In break after first Play release?

* Debug SHA-1 was registered in Firebase; production uses Play app signing SHA-1.
* Add **both** debug and Play signing fingerprints in Firebase/Google Cloud console.

Do internal testing builds need the same key?

* Same upload key pipeline; Play re-signs all tracks with app signing key.
* Test App Links on internal track with Play signing fingerprint after first upload.

What is the difference between SHA-1 and SHA-256?

* App Links and modern APIs use SHA-256.
* Some Google Cloud console entries still ask for SHA-1 - provide both from the same cert.

Can I sign locally and upload to Play manually?

* Yes - `cd android && ./gradlew bundleRelease` with local keystore, then Play Console upload.
* EAS is preferred for reproducibility and credential sync across teammates.

How does signing relate to package name?

* Keystore does not encode package name - `applicationId` in Gradle must match Play listing.
* Changing package name after publish requires a new store listing.

Where do App Links fit?

* Verified links bind HTTPS URLs to your package + **signing certificate**.
* Full recipe: [Android App Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/android-app-links/).

## Related

* [Android App Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/android-app-links/) - SHA-256 fingerprint in assetlinks.json
* [Internal Testing Tracks](https://docs.wahwei/reactnative.codeguides.io/android-platform/internal-testing-tracks/) - ship signed AABs to testers before production
* [Permissions & Play Policy](https://docs.wahwei/reactnative.codeguides.io/android-platform/permissions-and-play-policy/) - Play Console compliance (separate from signing)
* [../eas-build/android-keystores-and-signing/android-keystores-and-signing.md](https://docs.wahwei/reactnative.codeguides.io/eas-build/android-keystores-and-signing/) - EAS-focused signing deep dive
* [../eas-build/eas-submit/eas-submit.md](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-submit/) - automated Play uploads

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 19, 2026
