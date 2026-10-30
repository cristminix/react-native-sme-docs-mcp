# expo-secure-store & expo-crypto

Secrets, hashing, and random bytes on device - the `expo-secure-store` and `expo-crypto` cookbook for Expo SDK 57 apps that vault refresh tokens, derive fingerprints, and generate nonces.

Highlights / expo-secure-store & expo-crypto

* SecureStore maps to Keychain (iOS) and Keystore (Android) - not encrypted files
* ~2 KB per-item limit - store tokens, not JSON user profiles
* WHEN\_UNLOCKED\_THIS\_DEVICE\_ONLY excludes iCloud Keychain export
* expo-crypto provides SHA digests and secure random bytes - not password storage
* Clear SecureStore keys on logout alongside Query cache and navigation
* Auth tokens pair with auth-session patterns - never AsyncStorage

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install expo-secure-store expo-crypto
```

```ts
import * as SecureStore from "expo-secure-store";
 
const REFRESH_KEY = "auth.refresh_token";
 
export async function saveRefreshToken(token: string) {
  await SecureStore.setItemAsync(REFRESH_KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}
 
export async function loadRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}
 
export async function clearAuthSecrets() {
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}
```

```ts
import * as Crypto from "expo-crypto";
 
export async function sha256Hex(input: string) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input
  );
}
 
export function randomNonce(bytes = 16) {
  return Crypto.getRandomBytes(bytes);
}
```

**When to reach for this:**

* Refresh tokens and API keys that must survive app restarts.
* PKCE `code_verifier` generation for OAuth - see auth-session.
* Content-addressed cache keys (hash of URL + etag).
* Device binding fingerprints (hash of stable device id + server salt).

**When to avoid:**

* Large JSON blobs - SecureStore item size limit (~2048 bytes).
* Passwords you can validate locally - mobile clients are untrusted; use server auth.
* Replacing TLS - crypto helpers complement transport security, do not replace HTTPS.

## Working Example

Token vault adapter, logout purge, and hashed cache keys with secure random IDs.

```bash
npx expo install expo-secure-store expo-crypto
```

```ts
// src/auth/secureTokenVault.ts
import * as SecureStore from "expo-secure-store";
 
const keys = {
  refresh: (userId: string) => `auth.refresh_token.${userId}`,
  device: "auth.device_binding",
} as const;
 
export const tokenVault = {
  async saveRefresh(userId: string, token: string) {
    await SecureStore.setItemAsync(keys.refresh(userId), token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },
 
  async loadRefresh(userId: string) {
    return SecureStore.getItemAsync(keys.refresh(userId));
  },
 
  async clearUser(userId: string) {
    await SecureStore.deleteItemAsync(keys.refresh(userId));
  },
 
  async clearAllKnownUsers(userIds: string[]) {
    await Promise.all(userIds.map((id) => tokenVault.clearUser(id)));
    await SecureStore.deleteItemAsync(keys.device);
  },
};
```

```ts
// src/cache/cacheKey.ts
import * as Crypto from "expo-crypto";
 
export async function cacheKeyForUrl(url: string) {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    url
  );
  return `cache:${hash.slice(0, 16)}`;
}
```

```ts
// src/auth/logout.ts
import { tokenVault } from "./secureTokenVault";
 
export async function logout(userId: string, allUserIds: string[]) {
  await tokenVault.clearAllKnownUsers(allUserIds);
  // Also: queryClient.clear(), router.replace('/sign-in') - see auth-session
}
```

**What this demonstrates:**

* **Per-user key namespaces** - multi-account without token bleed.
* **`WHEN_UNLOCKED_THIS_DEVICE_ONLY`** - excludes iCloud Keychain sync.
* **SHA-256 cache keys** - stable filenames without raw URL PII in paths.
* **Logout clears vault** - paired with navigation and Query cache in auth-session.

## Deep Dive

### SecureStore Limits and Options

| Constraint | Detail |
| --- | --- |
| Item size | ~2048 bytes - store compact tokens only |
| `keychainAccessible` | `WHEN_UNLOCKED_THIS_DEVICE_ONLY` recommended for refresh tokens |
| Web | Limited - use web-specific auth storage patterns |
| Expo Go | Works for dev - test Keychain on dev client before release |

```ts
await SecureStore.setItemAsync("pin.step_up", "verified", {
  requireAuthentication: true, // iOS: Face ID to read
  authenticationPrompt: "Confirm identity to view account",
});
```

* **`requireAuthentication`** is iOS-only biometric gate - pair with [../auth-session/biometrics-with-localauthentication/biometrics-with-localauthentication.md](https://docs.wahwei/reactnative.codeguides.io/auth-session/biometrics-with-localauthentication/).
* Android Keystore backing is device-dependent - still vastly better than AsyncStorage.

### expo-crypto Capabilities

| API | Purpose |
| --- | --- |
| `digestStringAsync` | SHA-1/256/512 hex digests |
| `getRandomBytes` | CSPRNG bytes for nonces |
| `getRandomBytesAsync` | Async variant for large buffers |
| `randomUUID` | UUID v4 strings |

```ts
import * as Crypto from "expo-crypto";
 
const verifier = Crypto.getRandomBytes(32);
const uuid = Crypto.randomUUID();
```

* Use **`getRandomBytes`** for PKCE verifiers - never `Math.random()`.
* Hashing is one-way - cannot recover input; suitable for fingerprints, not encryption.

### Storage Tier Reminder

```text
Refresh token     → expo-secure-store
Access token      → memory or short SecureStore session
User preferences  → AsyncStorage / MMKV
Photos            → expo-file-system paths
```

* Cross-read [../auth-session/securestore-and-keychain-keystore/securestore-and-keychain-keystore.md](https://docs.wahwei/reactnative.codeguides.io/auth-session/securestore-and-keychain-keystore/) for full auth storage ADRs.
* Cross-read [../auth-session/mobile-auth-basics/mobile-auth-basics.md](https://docs.wahwei/reactnative.codeguides.io/auth-session/mobile-auth-basics/) for session models.

### Logout and Account Switch

```ts
// Minimum logout sequence
await SecureStore.deleteItemAsync("auth.refresh_token");
queryClient.clear();
router.replace("/sign-in");
```

* Account switch: purge **per-user keys** before loading the next user's refresh token.
* Namespace keys with `userId` - `auth.refresh_token.${userId}`.

## Gotchas

* **AsyncStorage for refresh tokens** - Trivial dump on rooted devices. **Fix:** SecureStore only.
* **Storing entire user profile in SecureStore** - Exceeds size limit. **Fix:** API fetch + SQLite/Query cache.
* **`Math.random` for OAuth verifier** - Predictable. **Fix:** `Crypto.getRandomBytes`.
* **Forgetting SecureStore on logout** - Next user inherits session. **Fix:** explicit `deleteItemAsync` list.
* **Logging digests of secrets** - Still aids offline cracking attempts. **Fix:** never log token material.
* **Assuming SecureStore encrypts from JS** - Protection is OS keystore - still send tokens over HTTPS only.

pbqrthvqrf.vb|ptvb922|202607

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `expo-secure-store` | Tokens, small secrets | Multi-KB JSON documents |
| Encrypted MMKV | Large encrypted KV with custom key | Refresh tokens without hardware backing |
| Server-only sessions | Web-style cookie apps | Mobile offline refresh needs |
| `expo-crypto` digests | Cache keys, fingerprints | Encrypting large files at rest |

## FAQs

How do I install secure-store and crypto on SDK 57?

```bash
npx expo install expo-secure-store expo-crypto
```

No config plugin required for basic SecureStore on SDK 57.

What fits in SecureStore?

* Refresh tokens, API keys under ~2 KB, short opaque session handles.
* Not: user objects, SQLite dumps, image base64.

How does this relate to auth-session?

* **auth-session** owns OAuth flows and session lifecycle.
* **expo-secure-store** is the default vault implementation - see [../auth-session/securestore-and-keychain-keystore/securestore-and-keychain-keystore.md](https://docs.wahwei/reactnative.codeguides.io/auth-session/securestore-and-keychain-keystore/).

Can I use SHA-256 for passwords?

* Never hash passwords only on device for server verification - use server-side Argon2/bcrypt.
* Client hashing is appropriate for **cache keys** and **content fingerprints** only.

Does SecureStore work in Expo Go?

* Yes for development - validate on dev client with production bundle ID before store submission.

## Related

* [Expo SDK Basics](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-sdk-basics/) - module install
* [expo-file-system](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-file-system/) - files are not a vault
* [../auth-session/securestore-and-keychain-keystore/securestore-and-keychain-keystore.md](https://docs.wahwei/reactnative.codeguides.io/auth-session/securestore-and-keychain-keystore/) - Keychain patterns
* [../auth-session/mobile-auth-basics/mobile-auth-basics.md](https://docs.wahwei/reactnative.codeguides.io/auth-session/mobile-auth-basics/) - session models
* [../expo-rules/security-rules-for-mobile/security-rules-for-mobile.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/security-rules-for-mobile/) - storage rules
* [Expo SDK Packages Best Practices](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/best-practices/) - secrets checklist

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 19, 2026
