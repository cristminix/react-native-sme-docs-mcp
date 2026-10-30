# Entitlements & Capabilities

Push, associated domains, keychain, and background modes - configuring iOS entitlements through `app.config.ts` and config plugins so Expo prebuild writes the correct `.entitlements` file before EAS Build or TestFlight.

Highlights / Entitlements & Capabilities

* Entitlements are signed capabilities - they ship in the IPA, not via OTA
* Declare push, associated domains, and background modes in app.config.ts or plugins
* associatedDomains uses applinks: prefix for universal links - rebuild after changes
* Keychain access groups require matching entitlements for expo-secure-store sharing
* UIBackgroundModes must match real behavior - App Review rejects speculative entries
* Expo Go cannot represent your production entitlements - test on dev clients

## Recipe

> Quick-reference recipe card - copy-paste ready.

```ts
// app.config.ts - common entitlements via Expo config
import type { ExpoConfig } from "expo/config";
 
const config: ExpoConfig = {
  name: "ShopApp",
  slug: "shop-app",
  ios: {
    bundleIdentifier: "com.example.shopapp",
    // Universal Links
    associatedDomains: ["applinks:shop.example.com"],
    // Keychain access group (optional - Secure Store)
    entitlements: {
      "keychain-access-groups": ["$(AppIdentifierPrefix)com.example.shopapp.shared"],
    },
    infoPlist: {
      UIBackgroundModes: ["remote-notification"],
    },
  },
  plugins: [
    "expo-router",
    [
      "expo-notifications",
      {
        icon: "./assets/notification-icon.png",
        color: "#ffffff",
        sounds: ["./assets/notification.wav"],
      },
    ],
  ],
};
 
export default config;
```

**When to reach for this:**

* Adding push notifications or universal links to a production bundle.
* Sharing tokens between app and widget extension via keychain / app groups.
* Enabling background fetch, processing, or `remote-notification` for silent push.
* App Review rejects with "missing entitlement" or "background modes without justification."
* Migrating entitlements from hand-edited Xcode tabs to CNG-friendly config.

## Working Example

### Push notifications

**Step 1 - Plugin + permission strings**

```ts
// app.config.ts
export default {
  expo: {
    plugins: ["expo-notifications"],
    ios: {
      infoPlist: {
        UIBackgroundModes: ["remote-notification"],
      },
    },
  },
};
```

**Step 2 - Apple Developer portal**

1. Identifiers → your App ID → enable **Push Notifications**.
2. Keys → create APNs key (`.p8`) - upload to EAS or your push provider.
3. EAS credentials: `eas credentials` → iOS → Push Key.

**Step 3 - Rebuild and test on device**

```bash
npx expo prebuild --platform ios
eas build --profile development --platform ios
# Push does not deliver to simulators - use USB device
```

```tsx
// app/_layout.tsx (excerpt)
import * as Notifications from "expo-notifications";
 
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowList: true,
  }),
});
```

### Associated domains (Universal Links)

```ts
ios: {
  associatedDomains: [
    "applinks:shop.example.com",
    "webcredentials:shop.example.com", // Password AutoFill (optional)
  ],
},
```

* Host `apple-app-site-association` on the domain - see [iOS Universal Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/ios-universal-links/).
* Prefix must be `applinks:` - not bare hostnames.
* **Rebuild** after changes - OTA cannot add associated domains.

```bash
xcrun simctl openurl booted "https://shop.example.com/orders/42"
```

### Keychain and app groups

```ts
ios: {
  entitlements: {
    "keychain-access-groups": [
      "$(AppIdentifierPrefix)com.example.shopapp.shared",
    ],
    "com.apple.security.application-groups": [
      "group.com.example.shopapp",
    ],
  },
},
```

```tsx
import * as SecureStore from "expo-secure-store";
 
await SecureStore.setItemAsync("refresh_token", token, {
  keychainAccessible: SecureStore.WHEN_UNLOCKED,
  // accessGroup: "group.com.example.shopapp", // when extension must read same secret
});
```

* App group identifiers must match between main app and extensions (widgets).
* Keychain sharing requires identical access group in both targets' entitlements.

### Background modes

| Mode | Legitimate use | Config |
| --- | --- | --- |
| `remote-notification` | Silent push wakes app | `infoPlist.UIBackgroundModes` + push entitlement |
| `fetch` | Legacy background fetch | Plugin + real periodic sync implementation |
| `processing` | `BGTaskScheduler` deferred work | `expo-background-task` plugin |
| `audio` | Playback continues backgrounded | `expo-av` / audio plugin |
| `location` | Turn-by-turn / approved tracking | `expo-location` + usage strings |

```ts
plugins: [
  "expo-background-task", // adds processing + BGTaskSchedulerPermittedIdentifiers
],
```

**What this demonstrates:**

* **Entitlements** flow from config → `.entitlements` at prebuild.
* **Push** needs portal + binary rebuild + device testing.
* **Associated domains** pair with hosted AASA files.
* **Background modes** must reflect actual code paths - not copy-paste from Stack Overflow.

## Deep Dive

### What entitlements are

Entitlements are **key-value pairs** in `YourApp.entitlements` that Apple code-signs into the IPA. They gate APIs:

```xml
<!-- Generated excerpt - do not hand-edit under CNG -->
<key>com.apple.developer.associated-domains</key>
<array>
  <string>applinks:shop.example.com</string>
</array>
<key>aps-environment</key>
<string>development</string> <!-- production in App Store builds -->
```

| Capability | Entitlement key | Set via |
| --- | --- | --- |
| Push | `aps-environment` | `expo-notifications` + EAS credentials |
| Universal Links | `com.apple.developer.associated-domains` | `ios.associatedDomains` |
| App Groups | `com.apple.security.application-groups` | `ios.entitlements` or widget plugin |
| Keychain groups | `keychain-access-groups` | `ios.entitlements` |
| Sign in with Apple | `com.apple.developer.applesignin` | `expo-apple-authentication` plugin |

### Development vs production push

| Build type | `aps-environment` | APNs endpoint |
| --- | --- | --- |
| Debug / dev client | `development` | `api.sandbox.push.apple.com` |
| TestFlight / App Store | `production` | `api.push.apple.com` |

EAS sets this from the distribution profile. Mismatch symptoms: token registers but notifications never arrive.

### Config plugins vs `ios.entitlements`

```ts
// Prefer high-level config fields when Expo documents them
ios: { associatedDomains: ["applinks:example.com"] }
 
// Use ios.entitlements for keys without first-class fields
ios: {
  entitlements: {
    "com.apple.developer.networking.networkextension": ["app-proxy-provider"],
  },
}
 
// Or a local config plugin with withEntitlementsPlist
```

See [Config Plugins](https://docs.wahwei/reactnative.codeguides.io/native-modules/config-plugins/) - `withEntitlementsPlist` is the escape hatch.

### Verifying entitlements in a built IPA

```bash
# After eas build --local or Xcode Archive
unzip -q ShopApp.ipa -d /tmp/shop
codesign -d --entitlements :- /tmp/shop/Payload/ShopApp.app > /tmp/entitlements.plist
/usr/libexec/PlistBuddy -c Print /tmp/entitlements.plist
```

Compare output to `app.config.ts` before blaming application code.

## Gotchas

* **Editing Signing & Capabilities in Xcode under CNG** - overwritten on prebuild. **Fix:** `app.config.ts` only.
* **Missing `applinks:` prefix** - associated domain silently ignored. **Fix:** `applinks:host.example.com`.
* **Expecting OTA to add push or domains** - entitlements are native. **Fix:** new `eas build`.
* **UIBackgroundModes without implementation** - Guideline 2.5.4 rejection. **Fix:** remove unused modes.
* **Expo Go for universal link QA** - wrong bundle ID. **Fix:** dev client with your `bundleIdentifier`.
* **Widget reads keychain but no app group** - extension cannot see main app data. **Fix:** matching `group.` identifiers - see [App Extensions & Widgets](https://docs.wahwei/reactnative.codeguides.io/ios-platform/app-extensions-and-widgets/).

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Xcode Capabilities GUI | One-off brownfield rescue | CNG projects - not durable |
| `withEntitlementsPlist` plugin | Custom enterprise entitlements | Simple push - use `expo-notifications` |
| Custom scheme only | Internal OAuth | Marketing HTTPS links - use associated domains |
| FCM-only on Android | Cross-platform push backend | iOS still needs APNs entitlements |

## FAQs

Where do permission usage strings go?

* `ios.infoPlist.NSCameraUsageDescription`, etc. - often set automatically by Expo module plugins (`expo-camera`, `expo-location`).
* Missing strings crash at runtime on first permission request.

Do I need Sign in with Apple?

* Required when offering third-party social login (Google, Facebook) for account creation - App Review enforces Guideline 4.8.
* Add `expo-apple-authentication` plugin and entitlement via config.

Can I use wildcard associated domains?

* Entitlements support `applinks:*.example.com` - AASA still requires per-host files.
* See [iOS Universal Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/ios-universal-links/).

How do entitlements interact with EAS?

* `eas build` runs prebuild (unless `ios/` committed) and signs with credentials matching the App ID capabilities enabled in Apple Developer portal.
* Portal capability must be ON **and** config must declare the entitlement.

What about iCloud or HealthKit?

* Enable in Apple Developer portal, add entitlement via config plugin, provide Review notes and usage justification.
* HealthKit requires explicit feature need - speculative entitlements trigger rejection.

## Related

* [iOS Universal Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/ios-universal-links/) - AASA hosting and verification
* [Push Notification Deep Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/push-notification-deep-links/) - tap → route wiring
* [App Extensions & Widgets](https://docs.wahwei/reactnative.codeguides.io/ios-platform/app-extensions-and-widgets/) - app groups and extension entitlements
* [Config Plugins](https://docs.wahwei/reactnative.codeguides.io/native-modules/config-plugins/) - `withEntitlementsPlist`
* [iOS Credentials & Provisioning](https://docs.wahwei/reactnative.codeguides.io/eas-build/ios-credentials-and-provisioning/) - APNs keys and profiles
* [Background Sync & TaskManager](https://docs.wahwei/reactnative.codeguides.io/data-offline/background-sync-and-taskmanager/) - `processing` background mode

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
