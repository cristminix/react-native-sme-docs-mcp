# Native Modules Basics

Ten examples for when JavaScript-only solutions fail and you must cross the **native boundary** - the foundation every Expo SDK 57 team needs before adding third-party libraries, config plugins, or custom modules.

Highlights / Native Modules Basics

* Native modules bridge JavaScript to Swift, Kotlin, and C++ via JSI on RN 0.86
* Expo SDK packages are native modules with TypeScript surfaces - prefer them over raw bridge code
* Expo Go ships a fixed native binary - custom or third-party native deps need a development build
* Every native dependency change requires rebuilding ios/ and android/ - OTA cannot ship native code
* Search Expo SDK and config plugins before writing Swift or Kotlin - see Native Module Rules

## Prerequisites

Start from a blank Expo app with a development build path ready - native modules do not run in Jest without mocks and cannot load arbitrary code in Expo Go:

```bash
npx create-expo-app@latest NativeBasics --template blank-typescript@sdk-57 --yes
cd NativeBasics
npx expo install expo-dev-client expo-modules-core
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**. Pair this page with [Native Module Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/) before adding any package with native code.

---

## Basic Examples

### 1. When Hardware APIs Have No JS Equivalent

Camera frames, GPS fixes, accelerometer streams, and biometric sensors read **device hardware** through OS APIs. JavaScript cannot access them without a native module:

```tsx
import { CameraView, useCameraPermissions } from "expo-camera";
import { Button } from "react-native";
 
export function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
 
  if (!permission?.granted) {
    return <Button title="Allow camera" onPress={requestPermission} />;
  }
 
  return <CameraView style={{ flex: 1 }} facing="back" />;
}
```

* **`expo-camera`** wraps AVFoundation (iOS) and CameraX (Android) - no pure-JS substitute
* Permission prompts require **Info.plist** and **AndroidManifest** entries - config plugins handle this
* Expo Go includes `expo-camera`; arbitrary camera SDKs do not

---

### 2. When Secure Storage Must Use Keychain / Keystore

`AsyncStorage` is unencrypted SQLite. Tokens, refresh secrets, and PII belong in **Keychain** (iOS) or **Keystore** (Android):

```ts
import * as SecureStore from "expo-secure-store";
 
export async function saveRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync("refresh_token", token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}
 
export async function loadRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync("refresh_token");
}
```

* **Hardware-backed encryption** is a native capability - web `localStorage` patterns do not apply
* See [SecureStore & Keychain/Keystore](https://docs.wahwei/reactnative.codeguides.io/auth-session/securestore-and-keychain-keystore/) for rotation and multi-account patterns
* Jest tests must mock `expo-secure-store` - see [Mocking Native Modules](https://docs.wahwei/reactnative.codeguides.io/testing/mocking-native-modules/)

---

### 3. When Background Work Exceeds JS Thread Limits

Timers and `fetch` pause when the app is backgrounded or killed. Push delivery, location updates, and background uploads need **native schedulers**:

```ts
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
 
const TASK_NAME = "background-location";
 
TaskManager.defineTask(TASK_NAME, ({ data, error }) => {
  if (error) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  // Upload locations to your API - native task keeps firing
});
 
export async function startBackgroundLocation(): Promise<void> {
  await Location.startLocationUpdatesAsync(TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 100,
    showsBackgroundLocationIndicator: true,
  });
}
```

* **Background modes** require entitlements and manifest flags - never hand-edit after [CNG prebuild](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/prebuild-basics/)
* iOS kills apps that claim background capability without real usage - App Store review rejects phantom modes

---

### 4. When Push Notifications Need APNs / FCM Native Tokens

Push is not HTTP polling. Device tokens come from **Apple Push Notification service** and **Firebase Cloud Messaging** native SDKs:

```ts
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
 
export async function registerPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
 
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return null;
 
  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}
```

* **Simulator push** behavior differs from device - always verify on hardware before release
* Custom notification extensions (rich media, categories) are fully native - JS orchestrates, native renders

---

### 5. When You Need Native UI Components

Some views cannot be faithfully reproduced in React Native layout - maps, video players, PDF renderers, and WebViews embed **platform-native views** inside the RN tree:

```tsx
import MapView, { Marker } from "react-native-maps";
 
export function StoreMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={{
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }}
    >
      <Marker coordinate={{ latitude: lat, longitude: lng }} title="Store" />
    </MapView>
  );
}
```

* Native views participate in the **Fabric** shadow tree on New Architecture - layout props still apply to the container
* Third-party map SDKs ship their own native binaries - evaluate compatibility before `npm install`

---

### 6. When Platform-Only APIs Block Your Feature

HealthKit, NFC, CarPlay, Siri shortcuts, and Android intents exist only on one platform. Feature detection gates JS; native modules implement the call:

```ts
import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
 
export async function biometricGate(): Promise<boolean> {
  if (Platform.OS === "web") return false;
 
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;
 
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!enrolled) return false;
 
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Unlock to continue",
  });
  return result.success;
}
```

* **`Platform.OS` checks** prevent crashes; they do not replace native implementation
* Platform-specific modules should expose a **unified TypeScript API** in your app layer - hide `Platform.select` inside services

---

### 7. When Performance-Critical Work Must Leave the JS Thread

Heavy image transforms, video encoding, cryptography, and ML inference block the JS thread if done in pure JavaScript. Native modules run work on **background queues** or **GPU paths**:

```ts
import * as ImageManipulator from "expo-image-manipulator";
 
export async function resizeAvatar(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 256 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}
```

* **Hermes** is fast for app logic - it is not a substitute for Core Image, MediaCodec, or SIMD C++
* Profile on device: if JS frame drops coincide with your function, move the work native or to a worker

---

### 8. When System Integrations Require Native Entry Points

Share sheets, home-screen widgets, App Clips, and universal links register at the **native app layer**. JavaScript receives deep-link events; native code owns registration:

```ts
import * as Linking from "expo-linking";
 
export function subscribeToDeepLinks(onUrl: (url: string) => void): () => void {
  const sub = Linking.addEventListener("url", ({ url }) => onUrl(url));
  Linking.getInitialURL().then((url) => {
    if (url) onUrl(url);
  });
  return () => sub.remove();
}
```

```json
// app.json excerpt - associated domains are native entitlements
{
  "expo": {
    "scheme": "myapp",
    "ios": {
      "associatedDomains": ["applinks:shop.example.com"]
    }
  }
}
```

* **Associated domains** and Android intent filters are applied during [prebuild](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/expo-prebuild-workflow/) - express them in config, not manual `Info.plist` edits

---

### 9. When Bluetooth / BLE Needs GATT Native Stacks

Web Bluetooth is unavailable on React Native. BLE scanning, pairing, and GATT read/write require **CoreBluetooth** (iOS) and **BluetoothGatt** (Android):

```ts
// Conceptual - real BLE libraries expose native modules
import { BleManager } from "react-native-ble-plx";
 
const manager = new BleManager();
 
export async function scanForPeripherals(): Promise<void> {
  manager.startDeviceScan(null, null, (error, device) => {
    if (error) return;
    if (device?.name) console.log("Found", device.name);
  });
}
```

* BLE libraries are **never** in Expo Go - plan `expo-dev-client` from day one
* Background BLE on iOS requires additional entitlements and drains battery - document in your ADR

---

### 10. When JS Polyfills Cannot Satisfy Store or Security Requirements

Sometimes the gap is not capability but **compliance**: certificate pinning, jailbreak detection, proprietary payment SDKs, or MDM-required APIs. These ship as native binaries with no Expo SDK equivalent:

```ts
// App-layer facade - implementation is a native module or third-party SDK
export type AttestationResult = { passed: boolean; reason?: string };
 
export async function attestDevice(): Promise<AttestationResult> {
  // Native module: DeviceCheck (iOS) / Play Integrity (Android)
  const NativeAttestation = require("../native/attestation").default;
  return NativeAttestation.runAsync();
}
```

* **Store review** may require specific native SDK versions - JS wrappers must match pinned native builds
* Every polyfill-only workaround that touches security should be rejected in code review - see [Native Module Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/)

---

## How Native Modules Load on SDK 57

```
JavaScript (Hermes)
    │
    ▼
expo-modules-core / JSI host object
    │
    ├── Expo Modules API (expo-camera, expo-file-system, …)
    ├── React Native TurboModules (community libraries)
    └── Legacy bridge fallback (older libraries only)
    │
    ▼
Swift / Kotlin / C++ native implementation
```

| Layer | What you import | Rebuild required? |
| --- | --- | --- |
| Expo SDK module | `import * as Camera from "expo-camera"` | Yes, after install |
| Community native lib | `import MapView from "react-native-maps"` | Yes, after install |
| Custom Expo module | `import MyModule from "my-local-module"` | Yes, always |
| JS-only package | `import { z } from "zod"` | No - OTA can ship |

```tsx
import { requireNativeModule, requireOptionalNativeModule } from "expo-modules-core";
 
// Throws if native class missing from binary
const FileSystem = requireNativeModule("ExpoFileSystem");
 
// Returns null in tests or when module not linked
const Optional = requireOptionalNativeModule("ExpoCustomFeature");
```

See [Expo Modules Core](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-modules-core/) for bootstrap details and [Expo Go vs Development Builds](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-go-vs-development-builds/) for runtime constraints.

---

## Gotchas

* **Expecting Expo Go to load any native npm package** - only preinstalled modules work. **Fix:** `npx expo install expo-dev-client` and build a development client.
* **Installing with `npm install` instead of `npx expo install`** - JS and native binary versions drift. **Fix:** Always `npx expo install <package>` for native deps.
* **Skipping native rebuild after `package.json` change** - Metro hot reload does not compile Swift/Kotlin. **Fix:** `npx expo run:ios` / `eas build` after every native change.
* **Calling native modules at module top-level in tests** - Jest has no bridge. **Fix:** Mock at service boundary or use `jest-expo`.
* **Hand-editing `ios/` and `android/` in CNG apps** - next `prebuild --clean` wipes edits. **Fix:** Encode changes in config plugins per [CNG prebuild](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/best-practices/).

---

## FAQs

What is a native module?

A bridge between JavaScript and platform code (Swift, Kotlin, Objective-C, Java, C++). On React Native 0.86 with New Architecture, most modules use JSI and TurboModules for synchronous, typed calls.

Do I need native code for every Expo SDK package?

No - you consume them from JavaScript. The Expo team maintains the native implementation. You only write native code when no SDK or community package fits.

Can I ship native code changes over OTA?

No. OTA (EAS Update) ships JavaScript and assets only. Native dependency changes require a new store binary or development build.

Expo Go vs development build - quick rule?

Expo Go: SDK modules only, fastest spike. Development build: your `package.json` native deps, required for third-party and custom modules.

How do I know if an npm package has native code?

Look for `ios/`, `android/`, `.podspec`, or `expo-module.config.json` in the package. Run `npx expo-doctor` after install - it flags incompatible native deps.

## Related

* [Using Third-Party Native Libraries](https://docs.wahwei/reactnative.codeguides.io/native-modules/using-third-party-native-libraries/) - compatibility checklist
* [Config Plugins](https://docs.wahwei/reactnative.codeguides.io/native-modules/config-plugins/) - permissions and manifest changes
* [create-expo-module](https://docs.wahwei/reactnative.codeguides.io/native-modules/create-expo-module/) - scaffold a local module
* [Native Module Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/) - decision checklist
* [Prebuild Basics](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/prebuild-basics/) - generating native projects
* [Expo Modules Core](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-modules-core/) - JSI loader internals
* [Expo Go vs Development Builds](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-go-vs-development-builds/) - runtime limits
* [Mocking Native Modules](https://docs.wahwei/reactnative.codeguides.io/testing/mocking-native-modules/) - Jest without a bridge

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
