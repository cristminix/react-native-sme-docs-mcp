# Networking & APIs Highlights Summary

Every highlight bullet from the 8 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Networking & APIs Highlights Summary

* React Native ships fetch and AbortController - no polyfill required on Hermes
* fetch is zero-dependency on Hermes - axios adds ~13–15 KB gzip to your JS bundle
* Wire focusManager to AppState - refetch stale queries when users return from background
* Retry only idempotent requests or those with idempotency keys - never blind POST retries
* WebSockets stay open - iOS and Android will suspend them in background without a keepalive strategy
* urql is smaller and composable - good default for Expo apps with modest GraphQL needs

## [Networking Basics](https://docs.wahwei/reactnative.codeguides.io/networking-api/networking-basics/)

* React Native ships fetch and AbortController - no polyfill required on Hermes
* Always set timeouts on mobile; LTE handoffs hang longer than Wi‑Fi
* Cancel in-flight requests on unmount to avoid setState-after-unmount warnings
* Parse JSON at the edge with Zod - never trust raw response shapes
* Classify errors: offline, timeout, HTTP status - UX copy differs for each
* Centralize fetch in one api/client module - attach auth headers once

## [Fetch vs axios](https://docs.wahwei/reactnative.codeguides.io/networking-api/fetch-vs-axios/)

* fetch is zero-dependency on Hermes - axios adds ~13–15 KB gzip to your JS bundle
* axios interceptors centralize auth refresh; fetch needs a thin wrapper module
* Upload progress requires XMLHttpRequest or expo-file-system - fetch has no onUploadProgress
* Default to fetch until you need interceptors, progress, or automatic JSON transforms
* Both run on the JS thread - neither replaces offline cache or TanStack Query

## [TanStack Query on Mobile](https://docs.wahwei/reactnative.codeguides.io/networking-api/tanstack-query-on-mobile/)

* Wire focusManager to AppState - refetch stale queries when users return from background
* Wire onlineManager to NetInfo - pause retries offline, resume on reconnect
* Default staleTime 30–60s on feeds - balance freshness with battery on LTE
* Forward AbortSignal from queryFn to fetch for automatic cancellation
* persistQueryClient pairs with AsyncStorage for read-mostly offline shells

## [Retries, Backoff & Idempotency](https://docs.wahwei/reactnative.codeguides.io/networking-api/retries-backoff-and-idempotency/)

* Retry only idempotent requests or those with idempotency keys - never blind POST retries
* Exponential backoff with jitter prevents thundering herds when LTE returns
* Cap attempts at 3–5 - infinite retry drains battery in airplane mode
* Pair retries with onlineManager - pause while offline, resume on reconnect
* 429 Retry-After headers deserve respect - sleep before next attempt

## [WebSockets & Real-Time](https://docs.wahwei/reactnative.codeguides.io/networking-api/websockets-and-real-time/)

* WebSockets stay open - iOS and Android will suspend them in background without a keepalive strategy
* Exponential reconnect backoff prevents reconnect storms when towers recover
* Fall back to polling when backgrounded or on metered networks to save battery
* AppState drives connect/disconnect - do not leave sockets open when inactive
* Pair real-time updates with TanStack Query cache patches - avoid duplicate sources of truth

## [GraphQL with urql/Apollo](https://docs.wahwei/reactnative.codeguides.io/networking-api/graphql-with-urql-apollo/)

* urql is smaller and composable - good default for Expo apps with modest GraphQL needs
* Apollo Client 4 offers the richest normalized cache - justify bundle size on complex graphs
* Persist normalized cache to AsyncStorage for faster cold start - exclude sensitive fields
* Automatic Persisted Queries (APQ) shrink payloads on LTE - SHA-256 query hash over GET
* Wire the same focusManager and onlineManager patterns as REST TanStack Query

## [Certificate Pinning](https://docs.wahwei/reactnative.codeguides.io/networking-api/certificate-pinning/)

* Default to system TLS on SDK 57 - pinning is the exception, not the baseline
* Pinning requires native code - Expo Go cannot validate pins; dev-client rebuilds mandatory
* Expired or rotated pins brick the app until a store update - plan backup pins first
* Corporate MITM proxies break pinning - finance apps need an explicit bypass ADR
* Threat model: pinning helps compromised CAs and rogue APs - not reverse-engineered clients

## [Networking Best Practices](https://docs.wahwei/reactnative.codeguides.io/networking-api/best-practices/)

* Never block the UI thread - parse JSON and retry logic off the critical render path
* Always surface network state - offline, stale, and error are distinct UX modes
* Centralize transport in one api/client module with HTTPS enforcement
* Default fetch; add axios only when interceptors or progress justify bundle cost
* Wire TanStack Query focusManager and onlineManager before shipping feeds
* Retry idempotent reads; never blind-retry POST without idempotency keys

3730363230327c3037396f6967637c6f692e73656469756765646f63

Reviewed by Chris St. John·Last updated Jul 19, 2026
