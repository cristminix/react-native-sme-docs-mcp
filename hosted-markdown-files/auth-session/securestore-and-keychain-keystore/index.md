# SecureStore & Keychain/Keystore

`expo-secure-store` is the default token vault for Expo apps. It delegates to **iOS Keychain** and **Android Keystore**, keeping refresh tokens out of unencrypted SQLite (AsyncStorage) and out of your JS bundle.

Highlights / SecureStore & Keychain/Keystore

* expo-secure-store maps to iOS Keychain and Android Keystore - hardware-backed on supported devices
* Never store refresh tokens, PINs, or API secrets in AsyncStorage or plain MMKV
* SecureStore has a ~2 KB per-item limit - store tokens, not entire user profiles
* Use WHEN\_UNLOCKED\_THIS\_DEVICE\_ONLY so backups and iCloud Keychain do not export secrets
* Migrate legacy AsyncStorage tokens on upgrade - one-time read, write, delete
* Pair secure storage clears with navigation reset on logout

## Prerequisites

```bash
npx expo install expo-secure-store
```

No config plugin is required for basic usage on SDK 57 - install and import.

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**.

---

## Why Not AsyncStorage for Secrets

```text
Threat model comparison
 
AsyncStorage          SecureStore (Keychain / Keystore)
────────────────────  ─────────────────────────────────────────
Unencrypted SQLite    Hardware-backed encryption (device-dependent)
Readable on rooted    Requires device unlock + app entitlement
  devices with file     on iOS; Keystore-backed on Android
  browsers
Backed up as plain    WHEN_UNLOCKED_THIS_DEVICE_ONLY excludes
  app data in some      iCloud Keychain sync (iOS)
  Android backups
```

```ts
// ❌ Never do this
import AsyncStorage from "@react-native-async-storage/async-storage";
await AsyncStorage.setItem("refresh_token", token);
 
// ✅ Correct
import * as SecureStore from "expo-secure-store";
await SecureStore.setItemAsync("auth.refresh_token", token, {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
});
```

* AsyncStorage is appropriate for **theme**, **last tab**, and **draft UI state** - not credentials
* Attackers with physical device access and jailbreak/root tools can dump AsyncStorage trivially
* Compliance frameworks (PCI, SOC2 mobile annexes) explicitly flag unencrypted local credential storage
* Grep PRs for `AsyncStorage` + `token` - automate in CI with a custom ESLint rule

> **Related:** [../expo-rules/security-rules-for-mobile/security-rules-for-mobile.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/security-rules-for-mobile/) - Tier 2 storage rules

---

## Token Storage Adapter

Wrap SecureStore behind an interface so tests swap in memory and migrations stay centralized.

```ts
// src/features/auth/adapters/secureTokenStorage.ts
import * as SecureStore from "expo-secure-store";
 
const KEYS = {
  refreshToken: "auth.refresh_token",
  lastUserId: "auth.last_user_id",
} as const;
 
const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
 
export const secureTokenStorage = {
  async saveRefreshToken(token: string) {
    await SecureStore.setItemAsync(KEYS.refreshToken, token, secureOptions);
  },
 
  async loadRefreshToken() {
    return SecureStore.getItemAsync(KEYS.refreshToken, secureOptions);
  },
 
  async clearAll() {
    await Promise.all(
      Object.values(KEYS).map((key) => SecureStore.deleteItemAsync(key)),
    );
  },
};
```

* **Namespaced keys** (`auth.refresh_token`) avoid collisions with other features using SecureStore
* Export a **single adapter** - screens never call `SecureStore` directly
* `clearAll` is the logout primitive - call from sign-out and account-switch flows
* Keep keys in one module - scattered string literals cause orphan secrets after refactors

> **Related:** [Mobile Auth Basics](https://docs.wahwei/reactnative.codeguides.io/auth-session/mobile-auth-basics/) - cold-start session restore

---

## Keychain Accessibility Options

iOS Keychain accessibility controls when items can be read.

```ts
import * as SecureStore from "expo-secure-store";
 
// Recommended for refresh tokens:
SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
 
// Alternatives - use deliberately:
SecureStore.AFTER_FIRST_UNLOCK          // background fetch can read - higher risk
SecureStore.WHEN_UNLOCKED                 // may sync via iCloud Keychain
SecureStore.ALWAYS                        // avoid for auth secrets
```

| Option | Background read | iCloud sync | Use case |
| --- | --- | --- | --- |
| `WHEN_UNLOCKED_THIS_DEVICE_ONLY` | No | No | Refresh tokens (default choice) |
| `AFTER_FIRST_UNLOCK` | Yes (until lock) | No | Background refresh before user unlocks |
| `WHEN_UNLOCKED` | No | Possible | Rare - cross-device keychain needs |

* Default to **`WHEN_UNLOCKED_THIS_DEVICE_ONLY`** for refresh tokens - matches banking app posture
* Choose `AFTER_FIRST_UNLOCK` only when you must refresh in background **before** first unlock and accept the tradeoff
* Android maps these to equivalent Keystore protection levels - Expo abstracts the platform differences
* Document the choice in an ADR if compliance asks why background refresh works pre-unlock

---

## Size Limits and What Not to Store

SecureStore is for **small secrets** - not arbitrary JSON caches.

```ts
// ❌ Too large - user object with avatar URL, preferences, roles
await SecureStore.setItemAsync("user", JSON.stringify(largeUserObject));
 
// ✅ Store token + non-sensitive ID; fetch profile from API
await SecureStore.setItemAsync("auth.refresh_token", refreshToken, secureOptions);
await SecureStore.setItemAsync("auth.last_user_id", userId, secureOptions);
```

* Expo documents a **~2048 byte** limit per value - oversized payloads fail at runtime
* Store **user profiles** in TanStack Query cache or encrypted MMKV if offline reads are required - not SecureStore
* Store **access tokens** in memory when possible - only persist refresh tokens unless offline demands otherwise
* If you need large encrypted blobs, evaluate `react-native-mmkv` with encryption key stored in SecureStore

---

## Migration from AsyncStorage

Ship a one-time migration for apps that previously stored tokens incorrectly.

```ts
// src/features/auth/adapters/migrateTokenStorage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
 
const LEGACY_KEY = "refresh_token";
const SECURE_KEY = "auth.refresh_token";
const MIGRATION_FLAG = "auth.storage_migrated_v1";
 
export async function migrateLegacyTokens() {
  const done = await AsyncStorage.getItem(MIGRATION_FLAG);
  if (done) return;
 
  const legacy = await AsyncStorage.getItem(LEGACY_KEY);
  if (legacy) {
    await SecureStore.setItemAsync(SECURE_KEY, legacy, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    await AsyncStorage.removeItem(LEGACY_KEY);
  }
 
  await AsyncStorage.setItem(MIGRATION_FLAG, "1");
}
```

* Run migration **before** cold-start refresh in `AuthProvider` bootstrap
* Delete legacy AsyncStorage entries immediately after successful SecureStore write
* Set a **migration flag** so the path runs once - not on every launch
* Log migration success in analytics (without token values) to measure adoption

---

## Biometric-Gated Reads (Optional Layer)

SecureStore stores secrets; biometrics gate **access** to the app - see the dedicated biometrics page for step-up patterns.

```ts
// SecureStore holds the token; biometrics gate whether app unlocks session
import * as LocalAuthentication from "expo-local-authentication";
 
export async function unlockAppOrSignOut(
  loadRefresh: () => Promise<string | null>,
  signOut: () => Promise<void>,
) {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
 
  if (!hasHardware || !enrolled) {
    return loadRefresh();
  }
 
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Unlock MyApp",
    fallbackLabel: "Use passcode",
  });
 
  if (!result.success) {
    await signOut();
    return null;
  }
 
  return loadRefresh();
}
```

* Biometrics **do not replace** SecureStore - they add a user-presence check before reading tokens
* Failed biometric after N attempts should **not** delete tokens automatically - offer sign-out explicitly
* On Android, fingerprint and face unlock map to the same `authenticateAsync` API

> **Related:** [Biometrics with LocalAuthentication](https://docs.wahwei/reactnative.codeguides.io/auth-session/biometrics-with-localauthentication/) - step-up auth patterns

---

## Logout and Key Deletion

```ts
export async function signOutCompletely(queryClient: { clear: () => void }) {
  await secureTokenStorage.clearAll();
  queryClient.clear();
  // Navigation reset handled by caller - router.replace("/sign-in")
}
```

* `deleteItemAsync` is idempotent - safe to call when key is already absent
* Missing logout cleanup is a top mobile security audit finding - test: logout → kill app → relaunch → no authenticated API calls
* Pair with [server revocation](https://docs.wahwei/reactnative.codeguides.io/auth-session/mobile-auth-basics/) when user selects "Sign out everywhere"

---

## Testing SecureStore in Jest

Mock the module in Jest - SecureStore is not available in Node.

```ts
// jest.setup.ts
jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
}));
```

* Unit-test your **adapter** logic with the mock - not Expo's native bridge
* E2E tests (Detox) should run on device/simulator for real Keychain behavior
* iOS Simulator Keychain persists across app deletes in some Xcode versions - reset simulator content when tests flake

---

## FAQs

Is SecureStore safe on jailbroken or rooted devices?

* No client storage survives a fully compromised device - treat SecureStore as raising the bar, not absolute protection.
* Combine with certificate pinning, jailbreak detection, and short token TTL for high-risk apps.

Does SecureStore work in Expo Go?

* Yes - it uses the device Keychain/Keystore under Expo Go's bundle ID.
* Production OAuth and Keychain access groups still require your standalone bundle ID - test on dev builds.

Can I share tokens between app extensions?

* Requires iOS Keychain access groups - custom native config beyond default Expo SecureStore.
* Prefer extension-to-host IPC or re-authentication instead of sharing refresh tokens.

What about expo-crypto for encryption?

* Use `expo-crypto` for hashing and random bytes - not as a replacement for SecureStore.
* Pattern: generate data encryption key with crypto, store key in SecureStore, encrypt blobs in MMKV.

## Related

* [Mobile Auth Basics](https://docs.wahwei/reactnative.codeguides.io/auth-session/mobile-auth-basics/) - token roles and cold-start restore
* [Biometrics with LocalAuthentication](https://docs.wahwei/reactnative.codeguides.io/auth-session/biometrics-with-localauthentication/) - gating access to stored sessions
* [Multi-Account & Device Binding](https://docs.wahwei/reactnative.codeguides.io/auth-session/multi-account-and-device-binding/) - per-account secure storage keys
* [../expo-rules/security-rules-for-mobile/security-rules-for-mobile.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/security-rules-for-mobile/) - storage tier rules
* [../expo-sdk/expo-secure-store-and-expo-crypto/expo-secure-store-and-expo-crypto.md](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-secure-store-and-expo-crypto/) - hashing and random bytes with expo-crypto

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

383k393a3c3q3e393a3o1r3e3k3x383c3e3k221t1w3x1v1t1v1z1t20

Reviewed by Chris St. John·Last updated Jul 19, 2026
