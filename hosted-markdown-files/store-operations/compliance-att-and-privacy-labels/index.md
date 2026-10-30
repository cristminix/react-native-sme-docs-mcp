# Compliance: ATT & Privacy Labels

Tracking transparency and nutrition labels - the cookbook for aligning **iOS App Tracking Transparency (ATT)**, **Privacy Nutrition Labels**, and **Google Play Data safety** with what your Expo SDK 57 app actually does at runtime. Policy context lives in [App Store Review Guidelines](https://docs.wahwei/reactnative.codeguides.io/ios-platform/app-store-review-guidelines/) and [Permissions & Play Policy](https://docs.wahwei/reactnative.codeguides.io/android-platform/permissions-and-play-policy/).

Highlights / Compliance: ATT & Privacy Labels

* ATT applies when you track users across apps/websites owned by other companies - not all analytics
* NSUserTrackingUsageDescription is required before AppTrackingTransparency prompt
* Privacy Nutrition Labels and App Privacy in Connect must match PrivacyInfo.xcprivacy
* Play Data safety must tell the same story as iOS labels - auditors compare both
* IDFA access without ATT prompt is a fast rejection and policy violation
* Rebuild native after privacy manifest or ATT changes - not OTA

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install expo-tracking-transparency
```

```ts
// app.config.ts - ATT string + honest tracking declaration
export default {
  expo: {
    ios: {
      bundleIdentifier: "com.example.shopapp",
      infoPlist: {
        NSUserTrackingUsageDescription:
          "ShopApp uses this identifier to measure ad campaign performance and limit duplicate offers.",
      },
      privacyManifests: {
        NSPrivacyTracking: false, // set true only if you track across other companies' apps/sites
        NSPrivacyTrackingDomains: [],
        NSPrivacyCollectedDataTypes: [
          {
            NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeCrashData",
            NSPrivacyCollectedDataTypeLinked: false,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              "NSPrivacyCollectedDataTypePurposeAppFunctionality",
            ],
          },
        ],
      },
    },
  },
};
```

```tsx
// features/ads/requestTrackingIfNeeded.ts
import * as TrackingTransparency from "expo-tracking-transparency";
import { Platform } from "react-native";
 
export async function requestTrackingIfNeeded(): Promise<boolean> {
  if (Platform.OS !== "ios") return true;
 
  const { status: current } = await TrackingTransparency.getTrackingPermissionsAsync();
  if (current === "granted") return true;
  if (current === "denied") return false;
 
  // Show your own pre-prompt explaining value BEFORE system dialog
  const { status } = await TrackingTransparency.requestTrackingPermissionsAsync();
  return status === "granted";
}
```

**When to reach for this:**

* Adding AdMob, Facebook SDK, AppsFlyer, or any SDK that reads IDFA.
* First App Store submission - Nutrition Labels and App Privacy questionnaire.
* Play Console **Data safety** redraft after SDK upgrade.
* Rejection citing Guideline **5.1.2** (tracking) or inaccurate privacy labels.
* Legal asks for **cross-store privacy parity** documentation.

---

## Working Example

### Step 1 - Inventory data collection

Build a **privacy inventory** spreadsheet from code and dependencies:

| Source | Data type | Linked to user? | Used for tracking? | Store surfaces |
| --- | --- | --- | --- | --- |
| Your API | Email, name | Yes | No | Both |
| Sentry | Crash logs | No | No | iOS manifest + Play diagnostics |
| Firebase Analytics | Usage events | No\* | No\* | Labels + Data safety |
| AdMob | Advertising ID | Yes | Yes | ATT + ads declaration |

\*Verify SDK config - default Firebase settings may differ.

```bash
# Dependency audit starting points
grep -r "expo-" package.json
grep -r "analytics\|sentry\|ads\|tracking" app.config.ts features/
```

### Step 2 - iOS: ATT decision tree

```
Do you link user/device data with third-party data for advertising
OR share with data brokers
OR use IDFA for cross-app/website tracking (other companies)?
├── NO → NSPrivacyTracking: false; do NOT call ATT; declare analytics as non-tracking
└── YES → NSPrivacyTracking: true; NSUserTrackingUsageDescription; request ATT before IDFA
```

**ATT prompt rules:**

* Request **after** user understands context - use pre-prompt screen.
* Never gate core app features on accepting tracking.
* If user denies, **do not read IDFA** - ad SDKs must run in non-personalized mode.
* `expo-tracking-transparency` wraps `ATTrackingManager`.

### Step 3 - iOS: Privacy Nutrition Labels

App Store Connect → **App Privacy**:

1. Match categories to inventory (contact info, identifiers, usage data, diagnostics).
2. For each type: **linked to identity**, **used for tracking**, **purposes**.
3. Publish labels - preview on listing.

Align `NSPrivacyCollectedDataTypes` in `app.config.ts` with Connect answers - see [iOS Privacy Manifests](https://docs.wahwei/reactnative.codeguides.io/ios-platform/ios-privacy-manifests-and-required-reason-apis/).

```ts
// Example: purchase history declared in manifest
{
  NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypePurchaseHistory",
  NSPrivacyCollectedDataTypeLinked: true,
  NSPrivacyCollectedDataTypeTracking: false,
  NSPrivacyCollectedDataTypePurposes: [
    "NSPrivacyCollectedDataTypePurposeAppFunctionality",
  ],
}
```

### Step 4 - Android: Data safety alignment

Play Console → **App content** → **Data safety**:

| iOS label claim | Play Data safety field |
| --- | --- |
| Contact info collected | Personal info → email/name |
| Identifiers → User ID | Device or other IDs |
| Diagnostics → crash data | App info and performance |
| Data used for tracking | **Advertising or marketing** + **Data sharing** |

* **Collected** vs **shared** must reflect SDK network calls - not just your API.
* **Ephemeral processing** only if you truly do not retain.
* **Deletion request** URL or in-app path if you collect personal data.

Full checklist: [Google Play Console Workflow](https://docs.wahwei/reactnative.codeguides.io/store-operations/google-play-console-workflow/).

### Step 5 - Permission strings match behavior

iOS `infoPlist` usage descriptions must describe **current** feature:

```ts
infoPlist: {
  NSCameraUsageDescription: "ShopApp uses the camera to scan product barcodes.",
  NSPhotoLibraryUsageDescription: "ShopApp lets you choose a photo for your profile.",
  NSLocationWhenInUseUsageDescription: "ShopApp uses your location to find nearby stores.",
}
```

Android dangerous permissions - request in context; Data safety must mention location if `expo-location` runs.

### Step 6 - Verify before submit

```bash
npx expo prebuild --platform ios --clean
plutil -p ios/ShopApp/PrivacyInfo.xcprivacy
npx expo config --type public | jq '.ios.infoPlist.NSUserTrackingUsageDescription'
```

**Manual QA script:**

* Fresh install → tracking SDKs **inactive** until consent flows complete
* Deny ATT → ads still work (non-personalized) or ads disabled gracefully
* Account deletion removes PII per privacy policy
* Connect **App Privacy** export matches Play **Data safety** PDF for legal

### Step 7 - Rebuild and submit

Privacy manifest and ATT strings are **native** - ship new binary via [EAS Submit](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-submit/).

---

## Cross-Store Alignment Matrix

| Topic | iOS | Android |
| --- | --- | --- |
| Tracking consent | ATT prompt | No ATT; ads ID + UMP/consent SDK |
| Label UI | Nutrition Labels on App Store | Data safety section on Play |
| Manifest file | `PrivacyInfo.xcprivacy` | Manifest permissions + Data safety form |
| Account deletion | Required if accounts created | Required by policy; link in Data safety |
| Kids / COPPA | Age rating + no tracking children | Target audience form |

---

## Common Mistakes

| Mistake | Consequence |
| --- | --- |
| Ad SDK in `package.json` but "no data collected" on forms | Rejection + regulatory risk |
| ATT prompt on launch before value explanation | Low opt-in + poor UX; review scrutiny |
| Reading IDFA when `NSPrivacyTracking: false` | Guideline 5.1.2 rejection |
| OTA-only "fix" for manifest | Stores still serve old non-compliant binary |
| iOS says no location; Android manifest has `ACCESS_FINE_LOCATION` | Play policy strike |

---

## FAQs

Is first-party analytics tracking?

* Analytics confined to your app, not linked to third-party ad networks for cross-app profiling, is generally **not** ATT tracking.
* Still declare usage/diagnostics data in labels and Data safety.

Do I need ATT for push notifications?

* No - push tokens are not IDFA.
* Declare device identifiers if you use token for cross-app ad profiling (unusual).

Expo Go and privacy testing?

* ATT and manifests apply to **store builds** - test on EAS production or preview dev client builds with matching entitlements.

What if labels were wrong in a live app?

* Update Connect and Play forms immediately.
* Ship compliant binary if SDK behavior must change.
* See [Store Incident Response](https://docs.wahwei/reactnative.codeguides.io/store-operations/store-incident-response/) for disclosure decisions.

## Related

* [iOS Privacy Manifests](https://docs.wahwei/reactnative.codeguides.io/ios-platform/ios-privacy-manifests-and-required-reason-apis/) - ITMS-91053 and Required Reason APIs
* [App Store Review Guidelines](https://docs.wahwei/reactnative.codeguides.io/ios-platform/app-store-review-guidelines/) - 5.1 privacy rejections
* [Permissions & Play Policy](https://docs.wahwei/reactnative.codeguides.io/android-platform/permissions-and-play-policy/) - Android permissions vs Data safety
* [Google Play Console Workflow](https://docs.wahwei/reactnative.codeguides.io/store-operations/google-play-console-workflow/) - Data safety checklist
* [App Store Connect Workflow](https://docs.wahwei/reactnative.codeguides.io/store-operations/app-store-connect-workflow/) - App Privacy questionnaire
* [EAS Submit](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-submit/) - ship native privacy changes

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
