# App Store Review Guidelines

Common rejection reasons for Expo apps in 2026 - a cookbook for passing **automated upload checks** and **human App Review** when shipping React Native binaries built with EAS, not Expo Go.

Highlights / App Store Review Guidelines

* Guideline 2.1 crashes on launch are the fastest rejection - test Release builds on device
* ITMS-91053 missing privacy manifest reasons block upload before human review
* Sign in with Apple is mandatory when third-party social login creates accounts
* Account deletion in-app is required for apps that support account creation
* Permission strings and Privacy Nutrition Labels must match actual SDK behavior
* Expo WebView shells and minimum-functionality clones fail Guideline 4.2

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
# Pre-submission gate (run on every release branch)
npx expo-doctor
npm audit --audit-level=high
eas build --profile production --platform ios
 
# Install Release-equivalent build on device before submit
eas build --profile preview --platform ios   # internal distribution
# Dogfood: cold start, login, paywall, push tap, universal link, logout + delete account
 
# Submit with metadata from repo (not from memory)
eas submit --platform ios --latest
 
# Privacy manifest sanity - after prebuild
plutil -p ios/ShopApp/PrivacyInfo.xcprivacy 2>/dev/null || \
  grep -r NSPrivacyAccessedAPIType ios/
```

```ts
// app.config.ts - rejection preventers bundled together
export default {
  expo: {
    ios: {
      bundleIdentifier: "com.example.shopapp",
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
            NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
          },
        ],
      },
      infoPlist: {
        NSCameraUsageDescription: "ShopApp uses the camera to scan product barcodes.",
        NSPhotoLibraryUsageDescription: "ShopApp lets you choose photos for your profile.",
      },
    },
    plugins: ["expo-apple-authentication", "expo-notifications"],
  },
};
```

**When to reach for this:**

* First App Store submission for an Expo app.
* Responding to a rejection email with a Guideline number (4.2, 5.1.1, 2.1, etc.).
* Automated upload fails with ITMS-91053 or missing compliance.
* Product asks "can we ship this WebView wrapper / AI chat clone?"
* You need a checklist before `eas submit`.

## Working Example

### Rejection 1 - ITMS-91053 (Privacy manifest / Required Reason APIs)

**Symptom:** Upload or TestFlight processing fails within minutes; email lists `NSPrivacyAccessedAPICategory*` APIs without approved reasons.

**Fix:**

1. Run `npx expo install --fix` - Expo SDK packages ship `PrivacyInfo.xcprivacy` files.
2. Merge third-party reasons into `ios.privacyManifests` - see [iOS Privacy Manifests](https://docs.wahwei/reactnative.codeguides.io/ios-platform/ios-privacy-manifests-and-required-reason-apis/).
3. Rebuild - manifests are native, not OTA.

```ts
ios: {
  privacyManifests: {
    NSPrivacyAccessedAPITypes: [
      {
        NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryFileTimestamp",
        NSPrivacyAccessedAPITypeReasons: ["C617.1"],
      },
    ],
  },
},
```

### Rejection 2 - Guideline 4.8 (Sign in with Apple)

**Symptom:** "App offers Google login but not Sign in with Apple."

**Fix:** Add `expo-apple-authentication` when offering Google/Facebook/email-password **account creation**. Login-only apps without third-party auth may be exempt - document in Review notes.

### Rejection 3 - Guideline 5.1.1 (Account deletion)

**Symptom:** "Users can create accounts but cannot delete them in the app."

**Fix:** Settings → Delete Account → confirm → call backend delete API. Link to web deletion is **not** sufficient if the app supports in-app registration.

```tsx
// Settings screen pattern - must actually delete server-side account
async function deleteAccount() {
  await api.delete("/me");
  await signOut();
  router.replace("/welcome");
}
```

### Rejection 4 - Guideline 2.1 (Crashes / incomplete metadata)

**Symptom:** Reviewer cannot log in, hits white screen, or demo account fails.

**Fix checklist:**

| Item | Pass criteria |
| --- | --- |
| Demo account | Active credentials in App Store Connect → App Review Information |
| Release build | Test `eas build --profile production`, not Metro Debug |
| ATT / permissions | First-launch flows completable without dead ends |
| Offline | App does not crash on airplane mode at splash |
| Universal links | Marketing URL opens app - [iOS Universal Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/ios-universal-links/) |

### Rejection 5 - Guideline 4.2 (Minimum functionality)

**Symptom:** "App is primarily a website wrapper" or "duplicate of existing apps without differentiation."

**Fix:**

* Use native navigation, offline cache, push, widgets, or platform APIs - not a single full-screen WebView to your marketing site.
* If hybrid, show **native** primary flows; WebView for help docs is fine as secondary.

### Rejection 6 - Guideline 5.1.2 / 2.5.4 (Background modes & data collection)

**Symptom:** Declared `audio`, `location`, or `fetch` background modes without feature; privacy label mismatch.

**Fix:**

* Remove unused `UIBackgroundModes` from `infoPlist`.
* App Store Connect **Privacy Nutrition Labels** must reflect analytics SDKs (`expo-updates`, Sentry, Amplitude, etc.).
* Privacy Policy URL must load and describe collection practices.

**What this demonstrates:**

* **Automated gates** (manifests, export compliance) block before humans see the app.
* **Account, auth, and deletion** rules are strict in 2026 - plan in product design.
* **Release binaries** behave differently from dev clients - test the right artifact.
* **Metadata honesty** - labels, screenshots, and permission strings must match runtime behavior.

## Deep Dive

### 2026 rejection matrix for Expo teams

| Code / theme | Typical Expo cause | Prevention |
| --- | --- | --- |
| **ITMS-91053** | SDK uses UserDefaults, disk space, boot time APIs | `privacyManifests` + `expo install --fix` |
| **2.1 Performance** | Hermes crash, missing native module in Release, bad OTA | Production profile QA; feature flags off broken screens |
| **4.2 Design** | WebView shell, template clone | Native UX, offline, platform value |
| **4.8 Login** | Google without Apple | `expo-apple-authentication` |
| **5.1.1 Privacy** | Missing deletion, vague policy, ATT without `NSUserTrackingUsageDescription` | In-app delete; accurate labels |
| **2.3.3 Screenshots** | Expo Go UI in screenshots | Capture from production build |
| **3.1.1 IAP** | Digital goods via Stripe only | StoreKit for consumables/subscriptions |
| **2.5.4 Background** | Copy-paste `UIBackgroundModes` | Only modes you implement |
| **5.4 VPN / MDM** | Enterprise APIs without entitlement | Remove unused entitlements |

### App Review Information block

Fill every field in App Store Connect before submit:

```text
Sign-in required: Yes
User name: review@example.com
Password: <rotating demo password>
Notes: Tap "Browse as guest" on login to skip auth. Push notifications require
physical device - universal links tested at https://shop.example.com/orders/demo.
Account deletion: Settings → Account → Delete Account.
```

* Rotate demo passwords after each review cycle.
* If backend is geo-fenced, provide a US-accessible endpoint for Apple reviewers.

### Export compliance and encryption

Expo apps use HTTPS (standard encryption). In Connect:

* **Uses encryption:** Yes
* **Exempt:** Yes (standard algorithms only)

`ITSAppUsesNonExemptEncryption = false` in `infoPlist` avoids annual paperwork for typical apps.

### Kids Category and ATT

* Apps for kids: no third-party analytics or ads without strict compliance - most Expo analytics SDKs disqualify Kids Category.
* Tracking (IDFA): `expo-tracking-transparency` + `NSUserTrackingUsageDescription` before any tracking SDK initializes.

### What reviewers can see

* Production-signed IPA - same as TestFlight external after Beta App Review.
* They **will** try Settings, privacy prompts, logout, and deep links from Safari/Notes.
* They **will not** have your Metro server - all JS must be embedded in Release.

## Gotchas

* **Submitting a dev client by mistake** - wrong icons, `expo-dev-menu` visible. **Fix:** `production` profile without `developmentClient: true`.
* **Screenshots from wrong device class** - iPad shots required if `supportsTablet: true`. **Fix:** 13" iPad screenshots or disable tablet support intentionally.
* **OTA broke Release after review** - rare but possible if OTA ships broken JS post-approval. **Fix:** channel rollback; staged rollout.
* **Universal link opens Safari in review** - AASA failure. **Fix:** CDN headers, correct `appID` - not "works on simulator only."
* **Placeholder permission strings** - `"Allow $(PRODUCT_NAME) to access camera"` left as TODO. **Fix:** human-readable product-specific copy.
* **Hiding features behind geo/IP** - Review tests from US. **Fix:** feature flags on for review builds or global access.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| TestFlight external first | Soften risk before public App Store | Simple bugfix - internal may suffice |
| App Store Connect API + `eas submit` | Repeatable CI releases | One-off - manual upload OK |
| Phased release (7-day) | Limit blast radius | Hotfix needed immediately worldwide |
| Enterprise distribution | Employee-only apps | Consumer App Store product |

## FAQs

Does Expo Go affect review?

* You do not submit Expo Go - only your signed IPA.
* Screenshots and metadata must not imply features Expo Go cannot represent (your bundle ID entitlements).

How long does review take in 2026?

* First submission: often 24–72 hours; resubmissions faster.
* External TestFlight Beta App Review adds a similar gate before public testers.

Can I appeal a rejection?

* Reply in Resolution Center with reproduction steps and fixes.
* Escalate via App Review Board only with clear technical evidence - not "please reconsider."

Do I need a privacy policy URL?

* Yes for virtually all networked apps - especially account creation, analytics, or payments.
* Must be reachable without login.

What about EU Digital Services Act trader status?

* App Store Connect collects trader identity for EU distribution - incomplete forms block release in EU territories.

## Related

* [iOS Privacy Manifests](https://docs.wahwei/reactnative.codeguides.io/ios-platform/ios-privacy-manifests-and-required-reason-apis/) - ITMS-91053 deep dive
* [TestFlight Distribution](https://docs.wahwei/reactnative.codeguides.io/ios-platform/testflight-distribution/) - pre-App Store QA track
* [Entitlements & Capabilities](https://docs.wahwei/reactnative.codeguides.io/ios-platform/entitlements-and-capabilities/) - background modes and push
* [EAS Submit](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-submit/) - automated upload
* [Security Rules for Mobile](https://docs.wahwei/reactnative.codeguides.io/expo-rules/security-rules-for-mobile/) - pre-submission security checklist
* [iOS Universal Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/ios-universal-links/) - reviewer deep link tests

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
