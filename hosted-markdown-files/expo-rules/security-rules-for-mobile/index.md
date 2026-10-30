# Security Rules for Mobile

Secrets handling, secure storage, transport security, and certificate pinning decisions for Expo apps on SDK 57. Mobile clients are untrusted environments - assume attackers can extract bundled values, intercept traffic on compromised devices, and replay tokens. These rules define the minimum bar before store submission.

Highlights / Security Rules for Mobile

* EXPO\_PUBLIC\_ and extra are client-visible - never put API secrets or signing keys there
* Store refresh tokens in expo-secure-store; never AsyncStorage or unencrypted MMKV
* EAS Secrets and eas env:pull for build-time values - not .env committed to git
* Certificate pinning is a product decision - ADR required; default to system TLS on SDK 57
* Clear secure storage and navigation stack on logout - back gesture must not expose PII
* Audit npx expo config --type public before every release for leaked endpoints and keys

## How to Use This Checklist

* Complete **Tier 1** before the first auth or payment feature merges - retrofitting secure storage is painful and often misses edge cases.
* Review **Tiers 2–3** on any PR touching env vars, storage, networking, or third-party SDK keys.
* Run **Tier 4** in the release checklist - `expo config --type public` and logout flows are common audit failures.
* Certificate pinning exceptions and skips require an ADR with threat model - not a sprint-end shortcut.
* Pair with backend team on token lifetimes and revocation - client rules alone do not stop session hijacking.

---

## Tier 1: Secrets & Configuration (1–6)

1. **Never put secrets in `EXPO_PUBLIC_*` or `extra`:** Both inline into the client bundle - attackers extract them from the IPA/APK or Hermes bytecode.

   * **Public only:** Analytics client IDs meant for exposure, public API base URLs, feature flag keys designed for client-side SDKs.
   * **Server:** Payment intents, admin tokens, and signing secrets stay on backend and EAS Secrets for build hooks only.
2. **EAS Secrets for build-time and CI values:** `eas secret:create` and environment-scoped variables - not Slack, not committed `.env.production`.

   * **Pull locally:** `eas env:pull --environment development` - `.env.local` stays gitignored.
   * **OTA:** `eas update --environment production` uses EAS environment vars (SDK 55+) - local `.env` is ignored on update runners.
3. **Audit public config before every release:** `npx expo config --type public` - confirm no staging URLs, internal hostnames, or debug keys shipped to production profile.

   * **CI:** Script fails release job if forbidden substrings appear in public config output.
   * **Reject:** "We'll remove the staging URL in a follow-up PR."
4. **`.env.example` documents keys, not values:** List required `EXPO_PUBLIC_*` and `APP_ENV` vars with placeholder values - onboarding without leaking prod secrets.

   * **Rotate:** If a secret was ever committed, rotate immediately - git history retains it.
   * **Scan:** Enable secret scanning in GitHub for accidental commits.
5. **No secrets in crash logs or analytics breadcrumbs:** Sentry and logging utilities must scrub tokens, emails, and PAN fragments before upload.

   * **Pattern:** Redact `Authorization` headers in network breadcrumbs.
   * **Test:** Trigger a test crash in staging and inspect Sentry payload.
6. **Third-party SDK keys are client-exposure reviewed:** Maps, analytics, and attribution keys in the bundle are assumed public - restrict by bundle ID and platform in vendor dashboard.

   * **Reject:** Using a server-only Stripe secret in React Native code.
   * **ADR:** Document each third-party SDK's data collection for privacy policy alignment.

---

## Tier 2: Storage & Session Hygiene (7–12)

7. **Refresh and access tokens in `expo-secure-store`:** Hardware-backed keystore on supported devices - not `AsyncStorage`, unencrypted MMKV, or plain `expo-file-system` files.

   * **Install:** `npx expo install expo-secure-store`.
   * **Size limits:** Secure store is for tokens and small secrets - not large JSON blobs.
8. **AsyncStorage for non-sensitive preferences only:** Theme, last tab, draft UI state - never auth artifacts or PII caches.

   * **Migration:** Moving tokens from AsyncStorage to secure store requires a one-time migration on app upgrade.
   * **Audit:** Grep for `AsyncStorage.setItem` with token-like keys in PR review.
9. **Clear secure storage on logout:** `SecureStore.deleteItemAsync` for all auth keys - paired with navigation stack reset (see [Navigation & Routing Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/navigation-and-routing-rules/)).

   * **Test:** Logout → kill app → relaunch → no authenticated API calls.
   * **Reject:** Logout that only clears React state.
10. **Short-lived access tokens with refresh rotation:** Mobile clients should refresh proactively - handle 401 with single retry, not infinite loops.

    * **Background:** Refresh on `AppState` foreground if token nears expiry.
    * **Revocation:** Server-side revoke on logout and password change.
11. **Biometric gate for sensitive actions, not storage replacement:** `expo-local-authentication` unlocks UI or confirms transactions - it does not replace secure enclave storage for tokens.

    * **UX:** Optional biometric re-prompt before showing full card numbers or export.
    * **Fallback:** PIN or re-auth when biometrics fail.
12. **Encrypt offline caches that contain PII:** If MMKV or SQLite caches user health or financial data, use encryption or server-side minimization - default MMKV is fast, not confidential.

    * **Prefer:** Fetch on demand; cache non-sensitive derived views only.
    * **ADR:** Document offline PII scope for compliance reviewers.

---

## Tier 3: Transport & API Security (13–18)

13. **HTTPS only for production API calls:** Reject cleartext exceptions in production `app.config` - `android.usesCleartextTraffic` is for local dev builds only.

    * **Dev:** `http://localhost` in development profile with `APP_ENV=development`.
    * **CI:** Lint or grep block `http://` in `src/` outside `__tests__`.
14. **Certificate pinning is an explicit product decision:** Default to system certificate validation on SDK 57 - pinning breaks corporate proxies, complicates rotation, and requires native modules.

    * **When to pin:** High-threat apps (finance, health) with security team to operate rotation runbooks.
    * **ADR required:** Threat model, rotation procedure, and fallback when pins expire.
15. **If pinning, plan rotation before implementation:** Pin SPKI hashes with backup pins - store updates lag weeks; expired pins brick the app.

    * **Native:** Pinning libraries need dev-client rebuilds - not OTA-only.
    * **Monitor:** Alert 30 days before cert renewal.
16. **Validate TLS at the API client layer:** Central `fetch` wrapper rejects non-HTTPS in production builds - one choke point for headers and auth attachment.

    * **Pattern:** `api/client.ts` attaches bearer from secure store; features never call raw `fetch` to arbitrary URLs.
    * **Reject:** Scattered `fetch(process.env.EXPO_PUBLIC_API_URL + path)` without validation.
17. **Do not disable SSL verification in production:** `rejectUnauthorized: false` and custom `fetch` agents are debug-only - grep CI blocks them on `main`.

    * **Staging:** Use proper staging certs, not disabled verification.
    * **Charles proxy:** Document dev-only proxy setup; never ship proxy trust stores to prod.
18. **OAuth and deep links use PKCE and state parameters:** `expo-auth-session` with secure redirect - validate `state` on return; never embed client secrets in mobile OAuth flows.

    * **Redirect:** Registered schemes match `app.config` - no wildcard redirect URIs in provider console.
    * **Store:** Tokens via secure store after code exchange.

---

## Tier 4: Device, Release & Compliance (19–24)

19. **Jailbreak/root detection is policy-driven, not security theater:** If required by compliance, use a maintained SDK and document bypass limitations - do not claim "unhackable."

    * **Graceful:** Warn or limit features; avoid hard crash that traps legitimate power users.
    * **ADR:** Compliance requirement citation.
20. **Screenshot and screen recording policy for sensitive screens:** iOS `UITextField` secure flag or overlay for CVV entry - balance UX with PCI and HIPAA guidance.

    * **Android:** `FLAG_SECURE` via config plugin when mandated.
    * **Test:** Screenshot sensitive screens in QA matrix.
21. **Permissions are minimal and justified:** Request camera, location, and contacts only when the feature is active - iOS/Android review and user trust depend on it.

    * **Strings:** User-facing permission rationale in `app.config` and localized `locales/`.
    * **Reject:** Up-front permission carpet-bombing on first launch.
22. **Dependency audit before store submission:** `npm audit`, `expo-doctor`, and review native SDK privacy manifests (Apple Privacy Nutrition Labels).

    * **Supply chain:** Pin lockfile; review new native deps in security-sensitive PRs.
    * **Updates:** Patch critical CVEs in JS deps via OTA when no native bump required.
23. **Feature flags do not bypass server authorization:** Client flags hide UI - server must enforce entitlements on every mutation.

    * **OTA:** A malicious user can load old bundles - API is source of truth.
    * **See:** [Release & OTA Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/) for channel rollback on bad flags.
24. **Incident runbook for token and key compromise:** Document who rotates EAS Secrets, revokes OAuth clients, and forces logout - mobile leads know the steps before an incident.

    * **Force logout:** Server invalidates refresh tokens; ship OTA banner if needed.
    * **Postmortem:** Update this checklist when a rule would have prevented the incident.

## Applying the Checklist in Order

* **Tier 1 (1–6):** Secrets and config - highest blast radius; fix before any network code ships.
* **Tier 2 (7–12):** Storage and sessions - prevents token theft and logout bugs.
* **Tier 3 (13–18):** Transport - defaults are usually sufficient; pinning is the exception with paperwork.
* **Tier 4 (19–24):** Compliance and operations - gate store submission and incident readiness.

## FAQs

Can I put API keys in EXPO\_PUBLIC\_?

Only if the key is designed for client exposure (e.g., Google Maps client key restricted by bundle ID). Server secrets, Stripe secret keys, and admin tokens never belong in `EXPO_PUBLIC_*`.

Secure store vs encrypted MMKV?

Default to `expo-secure-store` for tokens on SDK 57. MMKV with encryption is an option for larger structured data - still requires an ADR and key management story; secure store is simpler for auth artifacts.

Should we implement certificate pinning?

Most apps should not pin initially - system TLS plus proper cert lifecycle on the server is enough. Pin when threat model and security operations can own rotation; document in an ADR.

How do EAS Secrets differ from EXPO\_PUBLIC\_?

EAS Secrets and environment variables inject at build/update time on EAS workers - they do not automatically mean safe for client bundles. Only non-sensitive values should reach JS via `extra` or public env. True secrets stay server-side.

Is Expo Go safe for testing auth flows?

Expo Go uses Expo's bundle identifier - OAuth redirect and some SDK restrictions differ from production. Test auth on dev-client or preview builds with your real bundle ID before release.

How do I verify nothing secret leaked?

Run `npx expo config --type public` with production env vars and inspect output. Add CI grep for patterns like `sk_live`, `BEGIN PRIVATE KEY`, and internal hostnames.

What clears on logout?

Secure store auth keys, in-memory session state, query caches with PII, and navigation stack to auth - in that order. Verify with automated test or Maestro smoke.

Can OTA updates fix a secret leak?

OTA can remove a leaked key from new bundles - but existing installs may retain old bundles until update. Rotate the compromised secret immediately on the server; treat OTA as distribution fix, not rotation.

Do I need jailbreak detection?

Only when compliance or fraud policy requires it - understand it is bypassable. Document limitations in ADR; do not rely on it for core authorization.

How long should access tokens live?

Short (minutes to low tens of minutes) with refresh rotation - mobile apps are long-lived installs. Coordinate refresh logic with background `AppState` handlers.

Are deep-link query params safe for auth?

No - treat URL params as untrusted input. Never grant privileges from `?role=admin`. Validate session server-side.

What about storing images with PII?

Avoid caching sensitive images on disk without encryption. Use expiring signed URLs and clear caches on logout.

Does React Native New Architecture change security rules?

No - secrets still ship in bundles, secure store APIs are unchanged. Keep the same checklist on RN 0.86.

## Related

* [Expo Project Rules Checklist](https://docs.wahwei/reactnative.codeguides.io/expo-rules/expo-project-rules-checklist/) - env files, app.config, and EAS environments
* [Navigation & Routing Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/navigation-and-routing-rules/) - logout navigation and deep-link param trust
* [Release & OTA Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/) - OTA rollback when bad config ships
* [Native Module Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/) - secure native SDK integration
* [Architecture Decision Records](https://docs.wahwei/reactnative.codeguides.io/expo-rules/architecture-decision-records/) - pinning and storage ADRs
* [Expo Rules Best Practices](https://docs.wahwei/reactnative.codeguides.io/expo-rules/best-practices/) - condensed enforcement summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 9, 2026
