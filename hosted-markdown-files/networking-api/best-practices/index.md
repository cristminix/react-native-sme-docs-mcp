# Networking Best Practices

A condensed summary of the 25 most important networking practices drawn from every page in this section.

Highlights / Networking Best Practices

* Never block the UI thread - parse JSON and retry logic off the critical render path
* Always surface network state - offline, stale, and error are distinct UX modes
* Centralize transport in one api/client module with HTTPS enforcement
* Default fetch; add axios only when interceptors or progress justify bundle cost
* Wire TanStack Query focusManager and onlineManager before shipping feeds
* Retry idempotent reads; never blind-retry POST without idempotency keys

1. **Centralize HTTP in one client module:** Attach base URL, auth headers, timeouts, and HTTPS checks in `api/client.ts` - features never scatter raw `fetch` to arbitrary hosts.
2. **Enforce HTTPS in production builds:** Reject `http://` at the client choke point - `android.usesCleartextTraffic` is for local dev only.
3. **Always set request timeouts:** Use `AbortController` + timer (8–15 s reads, tighter for mutations) - LTE handoffs hang indefinitely without them.
4. **Cancel in-flight requests on unmount:** Pass `signal` from `useEffect` cleanup or TanStack Query `queryFn` - prevents setState-after-unmount and wasted radio time.
5. **Parse JSON at the network edge with Zod:** Never cast `res.json()` blindly - one schema per endpoint catches backend drift before users see crashes.
6. **Classify errors before showing copy:** Offline (`TypeError`), timeout (`AbortError`), HTTP status, and parse failures need different messages - see [Network Failure UX](https://docs.wahwei/reactnative.codeguides.io/error-resilience/network-failure-ux/).
7. **Default to fetch on Hermes:** Zero extra bundle bytes - add [axios](https://docs.wahwei/reactnative.codeguides.io/networking-api/fetch-vs-axios/) only when interceptors, `isAxiosError`, or team conventions justify ~13–15 KB gzip.
8. **Implement interceptors once:** Whether fetch wrapper or axios, auth attachment and 401 handling live in a single module paired with [Refresh Token Rotation](https://docs.wahwei/reactnative.codeguides.io/auth-session/refresh-token-rotation/).
9. **Upload progress requires XMLHttpRequest or FileSystem:** Neither fetch nor axios exposes reliable upload progress on React Native - plan XHR or `expo-file-system` for avatars and media.
10. **Adopt TanStack Query for shared server state:** Replace manual `useEffect` fetch hooks when multiple screens read the same API - cache, dedupe, and background refetch are free.
11. **Wire `focusManager` to `AppState`:** Refetch stale queries when the app becomes `active` - mobile has no `window` focus events.
12. **Wire `onlineManager` to NetInfo:** Pause query retries offline; resume on reconnect - uncapped retries in airplane mode drain battery.
13. **Tune `staleTime` per query key:** 30–60 s for feeds, longer for catalogs - global `staleTime: 0` refetches too aggressively on every foreground.
14. **Show staleness labels:** Display `dataUpdatedAt` or "Updated 2 min ago" - users on flaky LTE need to know data may be old.
15. **Retry GET with exponential backoff and jitter:** Cap at 3–4 attempts - jitter prevents synchronized client spikes when towers recover.
16. **Never retry non-idempotent POST blindly:** Use `Idempotency-Key` headers and server deduplication for payments and creates - see [Retries, Backoff & Idempotency](https://docs.wahwei/reactnative.codeguides.io/networking-api/retries-backoff-and-idempotency/).
17. **Set TanStack Query `mutations.retry` to 0 by default:** Transport-layer retry with stable idempotency keys beats duplicate mutation function invocations.
18. **Persist read caches selectively:** `persistQueryClient` with AsyncStorage or MMKV for catalogs - clear on logout; exclude unencrypted PII.
19. **Close WebSockets in background:** Reconnect with backoff on foreground - leaving sockets open wastes battery and gets killed by the OS.
20. **Offer polling fallback for real-time features:** Slower intervals on cellular and in background - or push notifications for must-deliver events.
21. **Choose urql for lean GraphQL; Apollo for complex graphs:** Measure bundle with `expo export` - persist normalized cache with size caps on device.
22. **Default to system TLS; pin only with an ADR:** Certificate pinning needs native rebuilds, rotation runbooks, and breaks corporate proxies - most apps should not pin on day one.
23. **Queue offline mutations with optimistic UI:** Persist failed writes, show `pending` state, flush on reconnect - pair with [Optimistic UI](https://docs.wahwei/reactnative.codeguides.io/data-offline/optimistic-ui/).
24. **Never block the UI thread on network parsing:** Large JSON transforms belong off the hot path; stream or paginate huge lists - keep presses responsive.
25. **Pre-release networking checklist:** Physical device on LTE, airplane-mode retry behavior, logout cache clear, idempotency spot-check, and TLS policy grep before store submission.

## FAQs

fetch or axios for a new Expo SDK 57 app?

**fetch** with a thin client wrapper unless interceptors or upload ergonomics force axios. TanStack Query sits above either transport.

Minimum TanStack Query mobile setup?

`QueryClientProvider`, `focusManager` + `AppState`, `onlineManager` + NetInfo, sensible `staleTime`, and `signal` in `queryFn`.

When is certificate pinning required?

Rare - regulated finance/health with security ops owning rotation. Default system TLS per [Certificate Pinning](https://docs.wahwei/reactnative.codeguides.io/networking-api/certificate-pinning/) and Security Rules.

How do networking and offline-first relate?

Networking pages cover transport, cache, and failure UX. Full offline-first adds SQLite sync - [Offline-First Basics](https://docs.wahwei/reactnative.codeguides.io/data-offline/offline-first-basics/).

## Related

* [Networking Basics](https://docs.wahwei/reactnative.codeguides.io/networking-api/networking-basics/) - timeouts, cancellation, and parsing
* [Fetch vs axios](https://docs.wahwei/reactnative.codeguides.io/networking-api/fetch-vs-axios/) - interceptors and bundle trade-offs
* [TanStack Query on Mobile](https://docs.wahwei/reactnative.codeguides.io/networking-api/tanstack-query-on-mobile/) - focus and online managers
* [Retries, Backoff & Idempotency](https://docs.wahwei/reactnative.codeguides.io/networking-api/retries-backoff-and-idempotency/) - safe retries on LTE
* [WebSockets & Real-Time](https://docs.wahwei/reactnative.codeguides.io/networking-api/websockets-and-real-time/) - reconnect and polling fallbacks
* [GraphQL with urql/Apollo](https://docs.wahwei/reactnative.codeguides.io/networking-api/graphql-with-urql-apollo/) - normalized cache on device
* [Certificate Pinning](https://docs.wahwei/reactnative.codeguides.io/networking-api/certificate-pinning/) - threat model and Expo managed costs
* [Network Failure UX](https://docs.wahwei/reactnative.codeguides.io/error-resilience/network-failure-ux/) - banners and retry queues
* [Mobile Auth Basics](https://docs.wahwei/reactnative.codeguides.io/auth-session/mobile-auth-basics/) - tokens at the client layer
* [Offline-First Basics](https://docs.wahwei/reactnative.codeguides.io/data-offline/offline-first-basics/) - beyond networked cache

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4). 636f64656775696465732e696f7c6367696f3934327c323032363037

Reviewed by Chris St. John·Last updated Jul 19, 2026
