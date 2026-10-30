# iOS Credentials & Provisioning

Certs, profiles, and **EAS managed credentials** - the cookbook for iOS signing on Expo SDK 57 without every engineer maintaining Xcode signing folders.

Highlights / iOS Credentials & Provisioning

* EAS can generate and store distribution certs, provisioning profiles, and push keys
* App Store builds need Apple Distribution cert + App Store provisioning profile
* Internal/ad hoc builds need profiles that include registered device UDIDs
* Bundle ID in app.config.ts must match the Apple Developer portal identifier
* Push notification keys are separate from signing certs - configure once per team
* Never commit .p12 files or provisioning profiles to git - use eas credentials

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
# Interactive credential setup
eas credentials --platform ios
 
# First production build (prompts for Apple login)
eas build --profile production --platform ios
 
# Non-interactive CI build after credentials exist
eas build --profile production --platform ios --non-interactive
```

```ts
// app.config.ts - bundle ID is the signing anchor
import type { ExpoConfig } from "expo/config";
 
const config: ExpoConfig = {
  name: "ShopApp",
  slug: "shop-app",
  ios: {
    bundleIdentifier: "com.example.shopapp",
    buildNumber: "1",
  },
  extra: {
    eas: { projectId: "00000000-0000-0000-0000-000000000000" },
  },
};
 
export default config;
```

```json
// eas.json - store vs internal distribution affects profile type
{
  "build": {
    "production": {
      "distribution": "store",
      "ios": { "simulator": false }
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false }
    }
  }
}
```

**When to reach for this:**

* First `eas build --platform ios` asks about certificates and provisioning profiles.
* Xcode reports "No profiles for bundle identifier" on a teammate's machine.
* Rotating off an engineer who was the only Apple Developer portal admin.
* Adding push, Sign in with Apple, or associated domains before TestFlight QA.

## Working Example

**Step 1 - Register the bundle identifier**

1. Apple Developer → **Certificates, Identifiers & Profiles** → **Identifiers**.
2. Create **App ID** matching `ios.bundleIdentifier` in `app.config.ts`.
3. Enable capabilities you need (Push, Associated Domains, etc.) - see [Entitlements & Capabilities](https://docs.wahwei/reactnative.codeguides.io/ios-platform/entitlements-and-capabilities/).

**Step 2 - Let EAS manage signing credentials**

```bash
eas credentials --platform ios
```

Choose for a greenfield app:

```text
? What do you want to do? › Set up credentials for a new bundle identifier
? Generate a new Apple Distribution Certificate? › Yes
? Generate a new Apple Provisioning Profile? › Yes
```

EAS stores:

* **Apple Distribution Certificate** (`.p12` equivalent, encrypted on Expo servers)
* **Provisioning Profile** (App Store or Ad Hoc depending on `distribution`)
* Optional **Push Notification Key** (`.p8`) for APNs

**Step 3 - Register devices for internal builds**

```bash
# Create a registration link for testers
eas device:create
 
# List registered devices
eas device:list
```

Internal (`"distribution": "internal"`) profiles embed registered **UDIDs**. Testers must register before you rebuild.

**Step 4 - Build and verify**

```bash
eas build --profile production --platform ios
eas build --profile preview --platform ios   # ad hoc / internal testers
```

Download the IPA and install via TestFlight (`eas submit`) or ad hoc link - [Internal Distribution](https://docs.wahwei/reactnative.codeguides.io/eas-build/internal-distribution/).

---

## Credential Types

| Credential | Purpose | Managed by EAS? |
| --- | --- | --- |
| **Apple Distribution Certificate** | Signs release IPAs | Yes - recommended |
| **Provisioning Profile (App Store)** | Store / TestFlight distribution | Yes |
| **Provisioning Profile (Ad Hoc)** | Registered device installs | Yes - refreshes when devices added |
| **Development Certificate** | Local `expo run:ios` debug | Optional - local Xcode |
| **APNs Key (.p8)** | Push notifications | Yes - one key per team is typical |
| **App Store Connect API Key** | `eas submit` automation | Separate from signing - see [EAS Submit](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-submit/) |

---

## Common Operations

### Rotate a compromised distribution certificate

```bash
eas credentials --platform ios
# Choose: Remove distribution certificate → Generate new → Rebuild all profiles
eas build --profile production --platform ios --clear-cache
```

* Apple allows **two** active distribution certs - plan rotation before expiry
* All IPAs signed with the old cert remain valid until profiles expire
* Notify the team - CI `--non-interactive` builds pick up new credentials automatically

### Upload existing credentials (brownfield migration)

```bash
eas credentials --platform ios
# Choose: Upload distribution certificate (.p12 + password)
# Choose: Upload provisioning profile (.mobileprovision)
```

* Match **bundle ID**, **team ID**, and **capabilities** exactly to your existing app
* Revoke duplicate certs in Apple portal after confirming EAS builds succeed
* Pair with [Migrating Manual Native Projects to CNG](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/migrating-manual-native-projects-to-cng/) when moving off hand-edited Xcode projects

### Sync capabilities from app.config

EAS can enable portal capabilities that match your config plugins:

```json
{
  "build": {
    "production": {
      "ios": {
        "autoIncrement": true
      }
    }
  }
}
```

```ts
// app.config.ts - associated domains require portal + entitlements alignment
ios: {
  associatedDomains: ["applinks:shop.example.com"],
},
plugins: [["expo-notifications", { icon: "./assets/notification-icon.png" }]],
```

* Capability mismatches surface as **provisioning profile doesn't include entitlement** errors
* Fix in `app.config.ts` / plugins first - then regenerate profiles via `eas credentials`

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| "No valid code signing certificates" | Expired or missing distribution cert | `eas credentials` → regenerate |
| "Profile doesn't match bundle identifier" | `bundleIdentifier` drift vs portal | Align `app.config.ts` with App ID |
| "Device not in provisioning profile" | New tester UDID | `eas device:create` → rebuild internal profile |
| Push works in dev, fails in TestFlight | Wrong APNs environment | Production push needs production entitlements - [TestFlight Distribution](https://docs.wahwei/reactnative.codeguides.io/ios-platform/testflight-distribution/) |
| "Account not enrolled in Apple Developer Program" | Personal Apple ID only | Enroll at developer.apple.com ($99/year) |

---

## FAQs

Should we use EAS-managed credentials or local Xcode signing?

* **EAS-managed** for teams - one encrypted source of truth, CI-friendly.
* **Local Xcode** only for engineers debugging signing edge cases - not for production pipeline.
* Never commit `.p12`, `.mobileprovision`, or passwords to git.

What is the difference between App Store and Ad Hoc profiles?

* **App Store** - `distribution: "store"` - TestFlight and App Review uploads.
* **Ad Hoc** - `distribution: "internal"` - direct IPA install to registered devices (max 100 per year per device type rules apply).
* TestFlight is usually preferable over ad hoc for iOS QA - see [Internal Distribution](https://docs.wahwei/reactnative.codeguides.io/eas-build/internal-distribution/).

Do I need a Mac for credential setup?

* **No** - `eas credentials` and `eas build` handle Apple portal API calls from any OS.
* A Mac is only required for local `expo run:ios` or Xcode Instruments.

How do push keys relate to signing certs?

* **APNs auth key (.p8)** authenticates your server to Apple Push Notification service.
* **Distribution cert** signs the IPA - separate concerns.
* Configure the push key once in `eas credentials` - entitlements come from [Entitlements & Capabilities](https://docs.wahwei/reactnative.codeguides.io/ios-platform/entitlements-and-capabilities/).

## Related

* [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - first cloud iOS build
* [Internal Distribution](https://docs.wahwei/reactnative.codeguides.io/eas-build/internal-distribution/) - ad hoc and TestFlight paths
* [EAS Submit](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-submit/) - upload to App Store Connect
* [../ios-platform/entitlements-and-capabilities/entitlements-and-capabilities.md](https://docs.wahwei/reactnative.codeguides.io/ios-platform/entitlements-and-capabilities/) - push, associated domains, background modes
* [../ios-platform/testflight-distribution/testflight-distribution.md](https://docs.wahwei/reactnative.codeguides.io/ios-platform/testflight-distribution/) - internal/external tester groups
* [../ios-platform/ios-basics-for-rn-devs/ios-basics-for-rn-devs.md](https://docs.wahwei/reactnative.codeguides.io/ios-platform/ios-basics-for-rn-devs/) - Xcode signing vocabulary
* [../cng-prebuild/prebuild-basics/prebuild-basics.md](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/prebuild-basics/) - bundle ID flows into generated Xcode project
* [../expo-rules/release-and-ota-rules/release-and-ota-rules.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/) - store builds vs OTA eligibility

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
