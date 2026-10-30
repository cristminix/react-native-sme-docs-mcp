# Auth Security Highlights Summary

Every highlight bullet from the 8 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Auth Security Highlights Summary

* Mobile apps are untrusted clients - assume tokens can be extracted from a compromised device
* Mobile OAuth must use Authorization Code + PKCE - never implicit flow in a WebView
* expo-secure-store maps to iOS Keychain and Android Keystore - hardware-backed on supported devices
* Biometrics prove user presence - they do not replace server authentication
* Rotate refresh tokens on every exchange - detect reuse as a breach signal
* Account switch must purge TanStack Query cache, Zustand slices, and in-memory tokens

## [Mobile Auth Basics](https://docs.wahwei/reactnative.codeguides.io/auth-session/mobile-auth-basics/)

* Mobile apps are untrusted clients - assume tokens can be extracted from a compromised device
* Prefer short-lived access tokens + refresh rotation; never infinite sessions on device
* Store refresh tokens in expo-secure-store - AsyncStorage is for preferences only
* Logout must clear secure storage, server session, and client caches - not just React state
* OAuth on mobile uses PKCE and custom URL schemes - not implicit flow in a WebView
* Pair auth with API client interceptors - see networking-api for 401 retry patterns

## [expo-auth-session & OAuth](https://docs.wahwei/reactnative.codeguides.io/auth-session/expo-auth-session-and-oauth/)

* Mobile OAuth must use Authorization Code + PKCE - never implicit flow in a WebView
* Register redirect URIs per environment: Expo Go, dev client, and production scheme differ
* Exchange authorization codes on your backend - client secrets do not belong in the app
* Google requires platform-specific OAuth client IDs; Apple Sign In is mandatory for some App Store categories
* Use makeRedirectUri() - hardcoded redirect strings break across build flavors
* Test OAuth on development builds - Expo Go redirect behavior is not identical to store binaries

## [SecureStore & Keychain/Keystore](https://docs.wahwei/reactnative.codeguides.io/auth-session/securestore-and-keychain-keystore/)

* expo-secure-store maps to iOS Keychain and Android Keystore - hardware-backed on supported devices
* Never store refresh tokens, PINs, or API secrets in AsyncStorage or plain MMKV
* SecureStore has a ~2 KB per-item limit - store tokens, not entire user profiles
* Use WHEN\_UNLOCKED\_THIS\_DEVICE\_ONLY so backups and iCloud Keychain do not export secrets
* Migrate legacy AsyncStorage tokens on upgrade - one-time read, write, delete
* Pair secure storage clears with navigation reset on logout

## [Biometrics with LocalAuthentication](https://docs.wahwei/reactnative.codeguides.io/auth-session/biometrics-with-localauthentication/)

* Biometrics prove user presence - they do not replace server authentication
* Use expo-local-authentication for Face ID, Touch ID, and Android fingerprint
* Step-up auth re-prompts biometrics before sensitive actions - transfers, password changes
* Offer passcode fallback - Apple requires it; never trap users without biometrics enrolled
* Store tokens in SecureStore; biometrics gate reading them - not a second password store
* Respect accessibility - always provide PIN/password path for users who cannot use biometrics

## [Refresh Token Rotation](https://docs.wahwei/reactnative.codeguides.io/auth-session/refresh-token-rotation/)

* Rotate refresh tokens on every exchange - detect reuse as a breach signal
* Deduplicate concurrent refresh calls - one in-flight promise for parallel 401s
* Silent refresh on cold start and foreground resume - users should not re-login hourly
* Forced re-login when rotation detects reuse, family revoked, or refresh TTL expired
* Clock skew breaks expiresAt checks - skew buffer and trust server 401 over client clock
* Never infinite-retry refresh - one 401 retry per request, then route to sign-in

## [Multi-Account & Device Binding](https://docs.wahwei/reactnative.codeguides.io/auth-session/multi-account-and-device-binding/)

* Account switch must purge TanStack Query cache, Zustand slices, and in-memory tokens
* Use per-account SecureStore keys - not one shared refresh\_token key
* Device binding ties refresh tokens to a device ID - server rejects unknown devices
* Never show previous user's data while new user's session bootstraps - use purge + skeleton
* Add account is not sign-in - preserve existing accounts in storage until explicit removal
* Test account switch on slow networks - race conditions leak PII without ordered purge

## [Auth Session Lifecycle](https://docs.wahwei/reactnative.codeguides.io/auth-session/auth-session-lifecycle/)

* AppState drives foreground refresh - resume from background triggers proactive token exchange
* Idle timeout may expire server sessions even when client expiresAt looks valid
* Background tasks cannot show biometric UI - refresh uses stored tokens without step-up
* Jailbreak/root detection is a risk signal - degrade gracefully, never false-lock legitimate users
* Combine lifecycle hooks with NetInfo - offline refresh failures should not force sign-out
* Document lifecycle ADR when banking/compliance mandates idle lock or compromised-device policy

## [Authentication Best Practices](https://docs.wahwei/reactnative.codeguides.io/auth-session/best-practices/)

* 25 essentials mapped to OWASP Mobile - storage, transport, session, and OAuth
* Mobile clients are untrusted - short TTL, rotation, and server-side authorization
* Never AsyncStorage for tokens; never client secrets in EXPO\_PUBLIC\_
* Logout clears SecureStore, Query cache, and navigation - not React state alone
* OAuth uses PKCE + system browser - not implicit flow in WebView
* Account switch and compromised-device policies need explicit ADRs for regulated apps

Reviewed by Chris St. John·Last updated Jul 18, 2026
