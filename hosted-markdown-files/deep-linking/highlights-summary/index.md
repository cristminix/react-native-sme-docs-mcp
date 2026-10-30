# Deep Linking Highlights Summary

Every highlight bullet from the 8 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Deep Linking Highlights Summary

* Custom schemes (myapp://) work everywhere but show an 'Open in app?' prompt on the web
* Linking.parse breaks any inbound URL into path, hostname, and queryParams
* Universal Links open https:// URLs directly in your app when AASA verification passes
* App Links verify https:// URLs at install time via Digital Asset Links
* Deferred deep links route users to the intended screen after first install
* Put routing paths in notification data payload - not only in title/body text

## [Deep Linking Basics](https://docs.wahwei/reactnative.codeguides.io/deep-linking/deep-linking-basics/)

* Custom schemes (myapp://) work everywhere but show an 'Open in app?' prompt on the web
* Universal Links (iOS) and App Links (Android) open https:// URLs directly in the installed app
* Declare scheme and associated domains in app.config.ts before shipping deep links
* Expo Router maps file paths to URLs - app/orders/[id].tsx becomes /orders/:id
* expo-linking parses URLs into path, queryParams, and hostname for custom handlers
* Test cold-start links on development builds - Expo Go scheme behavior differs from store binaries

## [expo-linking API](https://docs.wahwei/reactnative.codeguides.io/deep-linking/expo-linking-api/)

* Linking.parse breaks any inbound URL into path, hostname, and queryParams
* getInitialURL handles cold start - addEventListener handles warm start
* createURL builds outbound links that respect your configured scheme
* Gate navigation until Router and auth state are ready - or initial links are dropped
* Call canOpenURL before opening third-party schemes - returns false when app is missing
* Expo Router subsumes most parsing when using file-based routes - use Linking for side effects

## [iOS Universal Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/ios-universal-links/)

* Universal Links open https:// URLs directly in your app when AASA verification passes
* associatedDomains in app.config.ts must use the applinks: prefix
* apple-app-site-association must be served over HTTPS with no redirects and application/json
* CDN caching mistakes are the top production failure - stale AASA blocks new paths
* Users can force Safari with long-press - design web fallbacks for the same URLs
* Rebuild and reinstall after entitlement changes - OTA cannot add associated domains

## [Android App Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/android-app-links/)

* App Links verify https:// URLs at install time via Digital Asset Links
* intentFilters with autoVerify: true trigger Android domain verification
* assetlinks.json must list your signing certificate SHA-256 fingerprint
* Play App Signing uses Google's cert - register Play Console fingerprint, not only upload key
* Verification failures fall back to a disambiguation chooser - users pick browser or app
* Rebuild after intent filter changes - manifest updates require a new native binary

## [Deferred Deep Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/deferred-deep-links/)

* Deferred deep links route users to the intended screen after first install
* iOS does not expose a reliable install referrer - attribution SDKs or server-side matching required
* Android Play Install Referrer API provides campaign metadata - respect user privacy disclosures
* SKAdNetwork and ATT limit deterministic user-level attribution on iOS
* Store pending deep-link intent in memory + SecureStore - not AsyncStorage for sensitive targets
* Always offer a manual fallback path when deferred matching fails

## [Push Notification Deep Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/push-notification-deep-links/)

* Put routing paths in notification data payload - not only in title/body text
* Handle cold start (getLastNotificationResponseAsync) and warm tap (addNotificationResponseReceivedListener)
* Gate navigation on auth ready - order notifications must not flash before login
* Use router.push for browsable stacks, router.replace for transactional one-shots
* Validate payload paths with Zod - malformed push data should not crash the app
* Expo Go push credentials differ from production - test on dev client builds

## [Deep Link Testing Matrix](https://docs.wahwei/reactnative.codeguides.io/deep-linking/deep-link-testing-matrix/)

* Test matrix spans link type, app state, platform, and build flavor - not a single happy path
* Cold start and warm start behave differently - both need explicit rows
* Universal links fail silently in Safari when verification breaks - device testing is mandatory
* CI can smoke-test custom schemes via Maestro; HTTPS verification needs hosted JSON checks
* Expo Go is not a substitute for dev-client or store builds in deep-link QA
* Log path + query in test builds only - redact tokens before analytics

## [Deep Linking Best Practices](https://docs.wahwei/reactnative.codeguides.io/deep-linking/best-practices/)

* 25 essentials for schemes, universal links, push taps, and deferred routing
* Validate every inbound path and query param - URLs are untrusted input
* Gate navigation on auth and onboarding - cold-start links wait for ready state
* Test cold and warm starts on dev clients - Expo Go is not production parity
* Host AASA and assetlinks.json with CI checks - CDN regressions fail silently
* Idempotent routes and safe fallbacks prevent crashes from malformed marketing links

Reviewed by Chris St. John·Last updated Jul 18, 2026
