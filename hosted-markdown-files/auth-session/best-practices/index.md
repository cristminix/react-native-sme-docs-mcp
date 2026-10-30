# Authentication Best Practices

A condensed summary of **25 authentication essentials** for Expo SDK 57 apps, mapped to **OWASP Mobile** themes: insecure storage (M2), insecure communication (M3), insecure authentication (M4), insufficient cryptography (M5), and insecure authorization (M6). Drawn from every page in this section.

Highlights / Authentication Best Practices

* 25 essentials mapped to OWASP Mobile - storage, transport, session, and OAuth
* Mobile clients are untrusted - short TTL, rotation, and server-side authorization
* Never AsyncStorage for tokens; never client secrets in EXPO\_PUBLIC\_
* Logout clears SecureStore, Query cache, and navigation - not React state alone
* OAuth uses PKCE + system browser - not implicit flow in WebView
* Account switch and compromised-device policies need explicit ADRs for regulated apps

1. **Treat the mobile client as untrusted:** Assume attackers can extract bundled values, hook native APIs, and replay tokens from compromised devices - design sessions that limit blast radius with short access TTL and refresh rotation.
2. **Never store refresh tokens in AsyncStorage:** Unencrypted SQLite is trivially readable on rooted devices - use `expo-secure-store` with `WHEN_UNLOCKED_THIS_DEVICE_ONLY` (OWASP M2: Insecure Data Storage).
3. **Keep access tokens short-lived:** 5–15 minute access token TTL limits damage from interception - refresh proactively before expiry, not only after 401 (OWASP M4: Insecure Authentication).
4. **Rotate refresh tokens on every exchange:** Issue a new refresh token and invalidate the previous one - detect reuse as a breach signal and revoke the entire token family (OWASP M4).
5. **Implement logout everywhere:** Local sign-out is insufficient for stolen devices - expose server-side refresh revocation that invalidates all sessions for the user (OWASP M4).
6. **Clear SecureStore, Query cache, and navigation on logout:** `deleteItemAsync` for all auth keys, `queryClient.clear()`, and `router.replace` to sign-in - Android back must not reveal authenticated screens (OWASP M2).
7. **Use Authorization Code + PKCE for OAuth:** Mobile is a public client - never implicit flow (`response_type=token`) or embedded WebViews; use `expo-auth-session` with `usePKCE: true` (OWASP M4).
8. **Exchange OAuth codes on your backend when secrets exist:** Client secrets do not belong in the app bundle - send `code` + `code_verifier` to your server for token exchange (OWASP M1: Improper Platform Usage).
9. **Register redirect URIs per build flavor:** `makeRedirectUri()` output must match Google, Apple, and IdP consoles for dev, preview, and production - `redirect_uri_mismatch` is the top OAuth integration failure.
10. **Never put OAuth client secrets in `EXPO_PUBLIC_*`:** Public env vars inline into the Hermes bundle - audit with `npx expo config --type public` before every release (OWASP M2).
11. **Attach tokens via `Authorization: Bearer` - not URL query params:** Query strings land in logs, analytics, and referrer headers - headers only for access tokens (OWASP M3: Insecure Communication).
12. **Use HTTPS for all auth and API endpoints:** No cleartext exceptions in production - system TLS on SDK 57 is the default; certificate pinning requires an ADR (OWASP M3).
13. **Single 401 retry with deduplicated refresh:** One in-flight refresh promise for parallel 401s - infinite retry loops mask misconfiguration and hammer the auth server (OWASP M4).
14. **Distinguish offline from revoked sessions:** Network failures during refresh should not force sign-out - `session_expired_offline` vs `session_expired` prevents airplane-mode logout rage (OWASP M7: Client Code Quality).
15. **Proactive refresh on foreground resume:** `AppState` listener refreshes when `shouldRefresh(session)` after background - users should not see hourly re-login prompts (OWASP M4).
16. **Apply clock skew buffer to client expiry:** Refresh 30–120 seconds before client `expiresAt` - prefer server `serverTime` in refresh responses over device clock alone (OWASP M5: Insufficient Cryptography).
17. **Biometrics prove presence - not identity to the server:** Use `expo-local-authentication` for step-up UX; high-risk endpoints still need server MFA or step-up tokens (OWASP M4).
18. **Offer passcode fallback for biometric flows:** `disableDeviceFallback: false` - trapping users without enrolled biometrics fails accessibility and App Review expectations (OWASP M1).
19. **Namespace SecureStore keys per account:** Multi-account apps use `auth.refresh_token.{accountId}` - switch account purges TanStack Query and Zustand before bootstrap (OWASP M2 / M6).
20. **Bind refresh tokens to device ID server-side:** Send stable `deviceId` on login and refresh - server rejects unknown devices; users can revoke lost devices from settings (OWASP M4).
21. **Include `userId` in TanStack Query cache keys:** Prevents cross-account data flash during switch even if purge races - `queryKey: ['orders', userId]` (OWASP M6: Insecure Authorization).
22. **Never trust client-side JWT claims for authorization:** Decode claims for display only - server validates roles and scopes on every request (OWASP M6).
23. **Scrub tokens from logs and crash reports:** Redact `Authorization` headers in Sentry breadcrumbs and structured logging - tokens in crash dumps are a common audit finding (OWASP M2).
24. **Degrade gracefully on jailbreak/root signals:** High-risk actions (payments, PII export) warrant blocks or MFA - do not hard-lock entire apps on spoofable signals without product/legal approval (OWASP M8: Code Tampering).
25. **Test auth on development builds - not only Expo Go:** OAuth redirect URIs, Keychain access groups, and Apple Sign In entitlements differ from Expo Go - E2E auth tests run against real bundle IDs before store submission (OWASP M9: Reverse Engineering).

## FAQs

Which OWASP Mobile categories does this section cover most?

* **M2** (storage), **M3** (transport), **M4** (authentication), **M5** (crypto), and **M6** (authorization) - the five categories most relevant to session handling.
* M7–M10 (code quality, tampering, reverse engineering, extraneous functionality) appear in lifecycle and integrity guidance.

What is the minimum auth stack for a new Expo app?

* `expo-secure-store` for refresh tokens.
* `expo-auth-session` + `expo-crypto` if OAuth.
* TanStack Query with user-scoped keys and `queryClient.clear()` on logout.
* `AuthProvider` with bootstrapping → authenticated → expired state machine.

Should I implement certificate pinning for auth?

* Default to system TLS - pinning is an ADR-level decision with operational cost (rotation, outages).
* See [Certificate Pinning](https://docs.wahwei/reactnative.codeguides.io/networking-api/certificate-pinning/) before enabling.

How do I prioritize these 25 items?

* **Week 1:** Items 2, 3, 6, 7, 10, 11 - storage, TTL, logout, OAuth basics.
* **Before production:** Items 4, 5, 9, 12, 13, 25 - rotation, revocation, redirect URIs, E2E on dev builds.
* **Multi-account / fintech:** Items 19, 20, 21, 24 - account isolation, device binding, integrity policy.

Where do backend auth requirements fit?

* Client rules assume server supports refresh rotation, device binding, and revocation endpoints.
* Pair with backend OWASP API Security - mobile auth fails if server accepts long-lived opaque sessions without rotation.

Does Expo Go satisfy production auth testing?

* No - use `expo-dev-client` with production bundle ID and OAuth credentials before release.
* SecureStore works in Expo Go, but redirect URIs and Apple/Google console entries will not match store binaries.

## Related

* [Mobile Auth Basics](https://docs.wahwei/reactnative.codeguides.io/auth-session/mobile-auth-basics/) - session models and logout everywhere
* [expo-auth-session & OAuth](https://docs.wahwei/reactnative.codeguides.io/auth-session/expo-auth-session-and-oauth/) - PKCE and provider quirks
* [SecureStore & Keychain/Keystore](https://docs.wahwei/reactnative.codeguides.io/auth-session/securestore-and-keychain-keystore/) - token storage tiers
* [Refresh Token Rotation](https://docs.wahwei/reactnative.codeguides.io/auth-session/refresh-token-rotation/) - silent refresh and forced re-login
* [Auth Session Lifecycle](https://docs.wahwei/reactnative.codeguides.io/auth-session/auth-session-lifecycle/) - foreground refresh and integrity signals
* [../expo-rules/security-rules-for-mobile/security-rules-for-mobile.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/security-rules-for-mobile/) - full mobile security checklist
* [../networking-api/best-practices/best-practices.md](https://docs.wahwei/reactnative.codeguides.io/networking-api/best-practices/) - API client and transport practices

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
