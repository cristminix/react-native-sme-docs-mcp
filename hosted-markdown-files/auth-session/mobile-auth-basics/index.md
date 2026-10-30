# Mobile Auth Basics

10 examples to get you started with mobile authentication - 7 basic and 3 intermediate. Covers session models, where tokens live on device, and what **logout everywhere** means when users switch accounts or revoke access.

Highlights / Mobile Auth Basics

* Mobile apps are untrusted clients - assume tokens can be extracted from a compromised device
* Prefer short-lived access tokens + refresh rotation; never infinite sessions on device
* Store refresh tokens in expo-secure-store - AsyncStorage is for preferences only
* Logout must clear secure storage, server session, and client caches - not just React state
* OAuth on mobile uses PKCE and custom URL schemes - not implicit flow in a WebView
* Pair auth with API client interceptors - see networking-api for 401 retry patterns

## Prerequisites

Scaffold an Expo app with SDK 57 and install the auth storage primitives you will use throughout this section:

```bash
npx create-expo-app@latest AuthBasics --template blank-typescript
cd AuthBasics
npx expo install expo-secure-store expo-auth-session expo-crypto
```

Confirm the SDK pin:

```json
{
  "dependencies": {
    "expo": "~57.0.4",
    "react": "19.2.3",
    "react-native": "0.86.0"
  }
}
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**.

---

## Basic Examples

### 1. Session Models on Mobile

Mobile apps typically use one of three session shapes. Pick based on your backend - do not invent a fourth unless compliance demands it.

```text
┌─────────────────────────────────────────────────────────────────┐
│ Model              │ Access token │ Refresh │ Server session   │
├────────────────────┼──────────────┼─────────┼──────────────────┤
│ JWT + refresh      │ Short JWT    │ Rotating│ Optional sid     │
│ Opaque bearer      │ Opaque token │ Rotating│ Required         │
│ Cookie (rare RN)   │ HttpOnly*    │ HttpOnly│ Required         │
└─────────────────────────────────────────────────────────────────┘
* HttpOnly cookies are awkward in RN - prefer Authorization header + secure store.
```

```ts
// src/features/auth/model/session.ts
export type Session = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms - client-side hint only; server validates
  userId: string;
};
```

* **JWT + refresh** is the most common Expo pattern - access token in memory or secure store, refresh in secure store only
* **Opaque bearer** pushes validation entirely server-side - client stores opaque strings, never parses claims
* **Cookie sessions** in React Native require cookie jars and are fragile with deep links - avoid unless you own a mature cookie stack
* Treat `expiresAt` as a **client hint** for proactive refresh - the server clock is authoritative

> **Related:** [Refresh Token Rotation](https://docs.wahwei/reactnative.codeguides.io/auth-session/refresh-token-rotation/) - silent refresh and forced re-login | [../networking-api/networking-basics/networking-basics.md](https://docs.wahwei/reactnative.codeguides.io/networking-api/networking-basics/) - attaching tokens to API calls

---

### 2. Access vs Refresh Token Roles

Access tokens authorize API calls. Refresh tokens obtain new access tokens - they are higher value and must be stored more carefully.

```ts
// src/shared/api/createApiClient.ts
type ApiClientOptions = {
  getAccessToken: () => Promise<string | null>;
};
 
export function createApiClient({ getAccessToken }: ApiClientOptions) {
  return async function apiFetch(path: string, init: RequestInit = {}) {
    const token = await getAccessToken();
    const headers = new Headers(init.headers);
 
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
 
    return fetch(`${process.env.EXPO_PUBLIC_API_URL}${path}`, {
      ...init,
      headers,
    });
  };
}
```

* **Access tokens** ride on every authenticated request via `Authorization: Bearer`
* **Refresh tokens** never appear in routine API headers - only in the dedicated `/refresh` endpoint
* Keep access tokens **short-lived** (5–15 minutes) so a leaked token has a narrow window
* Never log either token - scrub `Authorization` in crash reporters (see [Security Rules for Mobile](https://docs.wahwei/reactnative.codeguides.io/expo-rules/security-rules-for-mobile/))

> **Related:** [SecureStore & Keychain/Keystore](https://docs.wahwei/reactnative.codeguides.io/auth-session/securestore-and-keychain-keystore/) - where refresh tokens live on device

---

### 3. Token Storage Overview

Mobile storage tiers have different threat models. Match sensitivity to the store.

```text
┌──────────────────┬────────────────────────────────────────────────┐
│ Store            │ Appropriate for                                │
├──────────────────┼────────────────────────────────────────────────┤
│ React state      │ In-memory access token during active session   │
│ expo-secure-store│ Refresh tokens, long-lived secrets             │
│ AsyncStorage     │ Theme, onboarding flags, non-sensitive prefs   │
│ MMKV (encrypted) │ Large caches - not a substitute for Keychain   │
│ expo-file-system │ Files, media - never raw tokens                │
└──────────────────┴────────────────────────────────────────────────┘
```

```ts
import * as SecureStore from "expo-secure-store";
 
const REFRESH_KEY = "auth.refresh_token";
 
export async function saveRefreshToken(token: string) {
  await SecureStore.setItemAsync(REFRESH_KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}
 
export async function loadRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_KEY);
}
```

* **Secure Store** maps to iOS Keychain and Android Keystore - hardware-backed on supported devices
* **AsyncStorage** is unencrypted SQLite - fine for `hasSeenOnboarding`, fatal for refresh tokens
* **In-memory** access tokens disappear on process kill - pair with silent refresh on cold start
* Audit PRs for `AsyncStorage.setItem` with token-like key names

> **Related:** [SecureStore & Keychain/Keystore](https://docs.wahwei/reactnative.codeguides.io/auth-session/securestore-and-keychain-keystore/) - keychain accessibility options and size limits

---

### 4. Cold Start: Restore Session from Secure Store

On launch, read the refresh token, exchange it for a fresh access token, then hydrate app state.

```tsx
// src/features/auth/AuthProvider.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import type { Session } from "./model/session";
 
type AuthContextValue = {
  session: Session | null;
  bootstrapping: boolean;
};
 
const AuthContext = createContext<AuthContextValue>({ session: null, bootstrapping: true });
 
async function refreshFromStoredToken(): Promise<Session | null> {
  const refreshToken = await SecureStore.getItemAsync("auth.refresh_token");
  if (!refreshToken) return null;
 
  const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
 
  if (!res.ok) return null;
  return res.json() as Promise<Session>;
}
 
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
 
  useEffect(() => {
    refreshFromStoredToken()
      .then(setSession)
      .finally(() => setBootstrapping(false));
  }, []);
 
  return (
    <AuthContext.Provider value={{ session, bootstrapping }}>
      {children}
    </AuthContext.Provider>
  );
}
 
export function useAuth() {
  return useContext(AuthContext);
}
```

* Show a **splash or skeleton** while `bootstrapping` is true - do not flash the login screen for signed-in users
* Failed refresh on cold start means **no session** - route to sign-in without retry loops
* Persist the **new refresh token** if your backend rotates on every refresh call
* Wrap the root layout so every screen reads the same auth context

> **Related:** [Auth Session Lifecycle](https://docs.wahwei/reactnative.codeguides.io/auth-session/auth-session-lifecycle/) - foreground refresh when returning from background

---

### 5. Sign-In: Persist Session After Password Login

After a successful credential exchange, write tokens to secure store and update context.

```ts
// src/features/auth/api/signInWithPassword.ts
import * as SecureStore from "expo-secure-store";
import type { Session } from "../model/session";
 
export async function signInWithPassword(email: string, password: string): Promise<Session> {
  const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
 
  if (!res.ok) {
    throw new Error("Invalid credentials");
  }
 
  const session = (await res.json()) as Session;
 
  await SecureStore.setItemAsync("auth.refresh_token", session.refreshToken, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
 
  return session;
}
```

* Write **refresh token only** to secure store - access token can live in React state until refresh
* Use `WHEN_UNLOCKED_THIS_DEVICE_ONLY` so backups and other devices do not export the keychain item
* Return the full `Session` to the caller so UI can navigate immediately without a second read
* Never store passwords locally - not even in secure store

> **Related:** [expo-auth-session & OAuth](https://docs.wahwei/reactnative.codeguides.io/auth-session/expo-auth-session-and-oauth/) - when sign-in uses Google or Apple instead of passwords

---

### 6. Sign-Out: Local Logout

Local logout clears device artifacts and in-memory state. It is the minimum every app must implement.

```ts
// src/features/auth/api/signOutLocal.ts
import * as SecureStore from "expo-secure-store";
 
const AUTH_KEYS = ["auth.refresh_token", "auth.device_binding_id"] as const;
 
export async function signOutLocal() {
  await Promise.all(AUTH_KEYS.map((key) => SecureStore.deleteItemAsync(key)));
}
```

```tsx
// In your settings screen
import { useAuth } from "../AuthProvider";
import { signOutLocal } from "../api/signOutLocal";
 
async function handleSignOut() {
  await signOutLocal();
  setSession(null); // from AuthProvider state setter exposed via context
  router.replace("/sign-in");
}
```

* Delete **every** secure-store key your auth flow wrote - refresh, device binding, biometric unlock flags
* **Reset navigation** to the sign-in stack - Android back must not return to authenticated screens
* Clearing React state alone is insufficient - users relaunch into an authenticated shell with stale tokens
* Pair with TanStack Query `queryClient.clear()` when server-backed caches hold user PII

> **Related:** [Multi-Account & Device Binding](https://docs.wahwei/reactnative.codeguides.io/auth-session/multi-account-and-device-binding/) - cache purge when switching users

---

### 7. Logout Everywhere (Server Revocation)

**Logout everywhere** revokes refresh tokens server-side so stolen devices cannot silently refresh.

```ts
// src/features/auth/api/signOutEverywhere.ts
import * as SecureStore from "expo-secure-store";
 
export async function signOutEverywhere(accessToken: string) {
  await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/revoke-all`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
 
  await SecureStore.deleteItemAsync("auth.refresh_token");
}
```

* Backend maintains a **refresh token family** or session table - `revoke-all` invalidates every device for that user
* Call **before** clearing local storage so you still have a valid access token for the revocation request
* Offer two UX paths: **Sign out** (this device) vs **Sign out everywhere** (all devices)
* After revocation, treat 401 on refresh as expected - route to sign-in without alarming error toasts

> **Related:** [Refresh Token Rotation](https://docs.wahwei/reactnative.codeguides.io/auth-session/refresh-token-rotation/) - how rotation detects token reuse after a breach

---

## Intermediate Examples

### 8. Discriminated Auth State for Navigation

Model auth as a finite state so Expo Router layouts can gate routes without nested conditionals.

```ts
// src/features/auth/model/authState.ts
export type AuthState =
  | { status: "bootstrapping" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; session: Session }
  | { status: "session_expired" };
```

```tsx
// app/_layout.tsx (Expo Router)
import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/features/auth/AuthProvider";
 
export default function RootLayout() {
  const { authState } = useAuth();
 
  if (authState.status === "bootstrapping") {
    return null; // or <SplashScreen />
  }
 
  if (authState.status === "unauthenticated" || authState.status === "session_expired") {
    return <Redirect href="/sign-in" />;
  }
 
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

* **`bootstrapping`** prevents the login flash during cold-start refresh
* **`session_expired`** lets you show "Session expired - sign in again" instead of a generic error
* Keep route guards in **layout files** - individual screens should assume auth already passed
* `session_expired` often follows a failed silent refresh - do not infinite-retry

> **Related:** [Auth Session Lifecycle](https://docs.wahwei/reactnative.codeguides.io/auth-session/auth-session-lifecycle/) - transitions between foreground and background refresh

---

### 9. OAuth vs Password: Same Session Shape

Whether users sign in with email or Google, normalize to one `Session` type so the rest of the app stays provider-agnostic.

```ts
// src/features/auth/model/mapOAuthToSession.ts
import type { Session } from "./session";
 
type OAuthTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: { id: string };
};
 
export function mapOAuthToSession(payload: OAuthTokenResponse): Session {
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: Date.now() + payload.expires_in * 1000,
    userId: payload.user.id,
  };
}
```

* OAuth and password flows **converge** at `Session` - features import one type
* Provider-specific code stays in `expo-auth-session` wiring - not in order lists or settings
* Store refresh tokens the same way regardless of sign-in method
* Backend should issue **your** tokens after OAuth code exchange - do not use Google access tokens as your API bearer long-term

> **Related:** [expo-auth-session & OAuth](https://docs.wahwei/reactnative.codeguides.io/auth-session/expo-auth-session-and-oauth/) - PKCE and redirect URI setup

---

### 10. Auth-Aware API Client with Single 401 Retry

Centralize token refresh so feature code never hand-rolls retry logic.

```ts
// src/shared/api/authenticatedFetch.ts
let refreshPromise: Promise<Session | null> | null = null;
 
export function createAuthenticatedFetch(
  getSession: () => Session | null,
  setSession: (s: Session | null) => void,
  refreshSession: () => Promise<Session | null>,
) {
  return async function authenticatedFetch(path: string, init?: RequestInit) {
    const session = getSession();
    const headers = new Headers(init?.headers);
 
    if (session?.accessToken) {
      headers.set("Authorization", `Bearer ${session.accessToken}`);
    }
 
    let response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}${path}`, {
      ...init,
      headers,
    });
 
    if (response.status !== 401) return response;
 
    refreshPromise ??= refreshSession().finally(() => {
      refreshPromise = null;
    });
 
    const refreshed = await refreshPromise;
    if (!refreshed) return response;
 
    setSession(refreshed);
    headers.set("Authorization", `Bearer ${refreshed.accessToken}`);
 
    return fetch(`${process.env.EXPO_PUBLIC_API_URL}${path}`, { ...init, headers });
  };
}
```

* **One retry** on 401 - infinite refresh loops mask server misconfiguration
* Deduplicate concurrent refreshes with a shared `refreshPromise` - ten parallel 401s should trigger one refresh
* Failed refresh sets session to `null` and routes to sign-in
* Wire this client into TanStack Query's `queryFn` for consistent behavior

> **Related:** [../networking-api/fetch-vs-axios/fetch-vs-axios.md](https://docs.wahwei/reactnative.codeguides.io/networking-api/fetch-vs-axios/) - interceptor patterns | [Refresh Token Rotation](https://docs.wahwei/reactnative.codeguides.io/auth-session/refresh-token-rotation/) - rotation edge cases

---

## FAQs

Should I store the access token in secure store too?

* In-memory is enough for most apps if cold start always refreshes.
* Persist access token only when your backend cannot refresh frequently and UX demands offline reads - still prefer short TTL.

Is Expo Go safe for testing auth flows?

* OAuth redirect URIs differ between Expo Go and standalone builds - test on a development build before release.
* Secure Store works in Expo Go, but custom URL schemes for OAuth require `expo-auth-session` redirect config per environment.

What is the difference between sign out and revoke?

* **Sign out** clears this device.
* **Revoke / logout everywhere** invalidates server-side refresh tokens for all devices - required for stolen-device scenarios.

Can I use JWT claims for authorization in the client?

* Decode claims for UX only (display name, avatar).
* Never trust client-side role checks for security - server validates every request.

Where do API keys go?

* Public keys in `EXPO_PUBLIC_*` only if designed for client exposure.
* Never put OAuth client secrets in the app - exchange codes on your backend.

## Related

* [expo-auth-session & OAuth](https://docs.wahwei/reactnative.codeguides.io/auth-session/expo-auth-session-and-oauth/) - PKCE flows and provider setup
* [SecureStore & Keychain/Keystore](https://docs.wahwei/reactnative.codeguides.io/auth-session/securestore-and-keychain-keystore/) - token persistence details
* [Refresh Token Rotation](https://docs.wahwei/reactnative.codeguides.io/auth-session/refresh-token-rotation/) - silent refresh and clock skew
* [../expo-rules/security-rules-for-mobile/security-rules-for-mobile.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/security-rules-for-mobile/) - secrets and storage rules
* [../networking-api/networking-basics/networking-basics.md](https://docs.wahwei/reactnative.codeguides.io/networking-api/networking-basics/) - authenticated API patterns

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

pbqrthvqrf.vb|ptvb879|202607

Reviewed by Chris St. John·Last updated Jul 19, 2026
