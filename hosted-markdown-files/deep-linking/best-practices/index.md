# Deep Linking Best Practices

A condensed summary of **25 deep linking essentials** for Expo SDK 57 apps - idempotent routes, safe fallbacks for bad URLs, and verification hygiene drawn from every page in this section.

Highlights / Deep Linking Best Practices

* 25 essentials for schemes, universal links, push taps, and deferred routing
* Validate every inbound path and query param - URLs are untrusted input
* Gate navigation on auth and onboarding - cold-start links wait for ready state
* Test cold and warm starts on dev clients - Expo Go is not production parity
* Host AASA and assetlinks.json with CI checks - CDN regressions fail silently
* Idempotent routes and safe fallbacks prevent crashes from malformed marketing links

1. **Declare `scheme` in `app.config.ts` before shipping any deep link:** Custom schemes are the fastest dev path and the OAuth redirect backbone - without a registered scheme, `createURL` and store binaries cannot claim inbound URLs.
2. **Prefer verified HTTPS links for consumer marketing:** Universal Links and App Links open without disambiguation sheets - custom schemes are fine for dev and OAuth but frustrate email campaigns when another app registers the same scheme.
3. **Rebuild native binaries after scheme or domain changes:** Entitlements and intent filters are baked at prebuild - OTA updates cannot add `associatedDomains` or `autoVerify` intent filters.
4. **Use `Linking.createURL` for outbound links - never hardcode `myapp://`:** Flavors, prefixes, and triple-slash Android quirks are handled centrally - hardcoded strings break across staging and production.
5. **Let Expo Router map file paths to URLs when using file-based routing:** `app/orders/[id].tsx` already handles `/orders/:id` - duplicate manual parsers drift from route files and typed routes.
6. **Centralize inbound URL handling in one root hook:** Cold start (`getInitialURL`), warm start (`addEventListener`), push taps, and deferred first-open should converge on one validated navigation function - scatter causes double pushes.
7. **Gate deep-link navigation on `authReady` and onboarding completion:** Protected screens that mount before session restore flash data and drop return URLs - queue intent until bootstrap finishes.
8. **Validate route params with Zod at the linking boundary:** Deep links are untrusted input - malformed `id` values should `router.replace("/")` or a dedicated error screen, not throw during render.
9. **Treat query params as public - never put secrets in URLs:** `token`, `email`, and `code` query keys land in analytics, logs, and referrer headers - exchange one-time codes server-side after navigation.
10. **Handle cold start and warm start explicitly:** `getInitialURL` alone misses background taps; listener-only setups miss kill-state launches - implement both with cleanup and duplicate guards.
11. **Use `router.replace` for magic links and password resets:** Users should not back-navigate into pre-auth stacks - transactional one-shots replace; browsable content pushes.
12. **Make routes idempotent:** Tapping the same `orders/42` link twice should not corrupt stack depth - `router.push` to the same screen may duplicate; consider `router.navigate` or dedupe by path ref.
13. **Host `apple-app-site-association` with no redirects and `application/json`:** iOS rejects redirected or HTML-wrapped AASA - serve 200 on apex and `/.well-known/` paths with valid TLS.
14. **Host `assetlinks.json` with Play App Signing SHA-256 fingerprints:** Upload-key fingerprints alone fail verification on Play-distributed builds - copy the cert from Play Console → App integrity.
15. **Narrow `pathPrefix` and AASA `paths` - do not claim `/`:** Over-broad paths hijack blog and admin URLs into the app - use explicit prefixes and `NOT` exclusions.
16. **Run `adb shell pm get-app-links` on Android QA builds:** Verification status is deterministic - `legacy_failure` before device tap saves hours of guessing.
17. **Test universal links on TestFlight and internal tracks - not only simulators:** iOS caches AASA on device; simulator pass + device Safari fallback is a common false positive.
18. **Kill the app between cold-start test cases:** Warm-start-only QA misses the highest crash segment - Maestro `stopApp: true` and manual kill-before-tap are mandatory.
19. **Put routing data in push `data` payload - not only title/body:** Notification tap handlers read `content.data` - parse discriminated types and validate before `router.push`.
20. **Pair push cold start with `getLastNotificationResponseAsync`:** Same pattern as `getInitialURL` - listener-only push handling fails when the app was killed.
21. **Plan deferred deep links without assuming iOS install referrer:** Android Install Referrer plus server-side click IDs are the privacy-durable pattern - MMP SDKs require ATT and privacy disclosures when tracking across apps.
22. **Offer a web fallback and manual continue CTA when deferred match fails:** 30–50% of deferred attribution misses - land on a sensible default with "Continue your offer?" rather than a blank home screen.
23. **CI-verify hosted AASA and assetlinks.json on every web deploy:** JSON hosting breaks silently when marketing changes CDN rules - script `fetch` + `JSON.parse` before native release.
24. **Contract-test URL parsing in Jest - Maestro cannot cover every malformed input:** Unit tests for `Linking.parse` → route mapping are cheap and block `%20`, empty ids, and injection attempts.
25. **Document schemes, domains, and test matrix in the release runbook:** Deep links touch `app.config.ts`, CDN, push payloads, and auth - tie P0 matrix rows to release checklist owners so linking is not an afterthought on submission day.

## FAQs

How do I prioritize these 25 items?

* **Week 1:** Items 1, 4, 6, 7, 8, 10 - scheme, central hook, auth gate, validation, cold/warm.
* **Before store submission:** Items 2, 3, 13, 14, 16, 17, 18 - verified links and device QA.
* **With push or UA spend:** Items 19, 20, 21, 22, 23 - notification and deferred flows plus CI hosting.

Does Expo Router remove the need for expo-linking?

* Router handles path mapping - keep `expo-linking` for `createURL`, `openURL`, and custom pre-navigation.
* See [expo-linking API](https://docs.wahwei/reactnative.codeguides.io/deep-linking/expo-linking-api/).

What is the minimum test bar before release?

* Custom scheme cold + warm on dev client (items 10, 18).
* HTTPS verified link tap on physical iOS and Android (items 14, 16, 17).
* Jest parse contracts + hosted JSON CI (items 23, 24).

How do deep links interact with auth redirects?

* OAuth uses custom schemes - separate from marketing universal links but shares `scheme` config.
* See [../auth-session/expo-auth-session-and-oauth/expo-auth-session-and-oauth.md](https://docs.wahwei/reactnative.codeguides.io/auth-session/expo-auth-session-and-oauth/).

Can I ship with custom scheme only?

* Yes for internal and OAuth-heavy apps - add HTTPS verified links before large consumer email campaigns (item 2).

## Related

* [Deep Linking Basics](https://docs.wahwei/reactnative.codeguides.io/deep-linking/deep-linking-basics/) - 10 foundational examples
* [expo-linking API](https://docs.wahwei/reactnative.codeguides.io/deep-linking/expo-linking-api/) - parse, listen, bootstrap
* [iOS Universal Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/ios-universal-links/) - AASA and CDN
* [Android App Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/android-app-links/) - assetlinks and verification
* [Deep Link Testing Matrix](https://docs.wahwei/reactnative.codeguides.io/deep-linking/deep-link-testing-matrix/) - QA tables and CI tiers
* [../expo-router/expo-router-basics/expo-router-basics.md](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/) - file-based routing
* [../expo-rules/navigation-and-routing-rules/navigation-and-routing-rules.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/navigation-and-routing-rules/) - team routing rules

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
