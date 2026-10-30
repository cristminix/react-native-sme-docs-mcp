# Error Boundaries Best Practices

A condensed summary of the 25 most important best practices drawn from every page in this section.

Highlights / Error Boundaries Best Practices

* Use try/catch in event handlers; boundaries only catch render errors
* Wrap each major screen in its own error boundary
* Reset boundaries with a key bump or refetch - not empty retry buttons
* Wire NetInfo to TanStack Query onlineManager for offline-aware retries
* Chain ErrorUtils.setGlobalHandler and report fatals to your crash SDK
* Pair kill switches with per-screen crash counters for safe rollout

1. **Know the two layers:** `try/catch` for async work and event handlers; error boundaries for render and lifecycle throws - neither replaces the other.
2. **Wrap major screens, not only the root:** One leaf crash should not white-screen the entire app - per-route boundaries contain blast radius.
3. **Keep a root boundary as last resort:** Catches provider failures and navigation shell bugs - still log and offer restart, not a blank screen.
4. **Use class boundaries or react-error-boundary:** Functional components cannot implement `getDerivedStateFromError` - do not fake boundaries with hooks.
5. **Log in componentDidCatch always:** Production crashes without telemetry are invisible - forward to Sentry or your reporter before calling `reset`.
6. **Never show stack traces to users:** Fallback UI gets actionable copy; engineers read logs - `error.message` leaks implementation detail.
7. **Reset with remount or refetch:** `reset()` alone re-renders the same corrupt state - bump a `key` on children or refetch screen queries in `onReset`.
8. **Try/catch inside onPress:** Handler throws bypass boundaries - wrap native module and fetch calls and surface toasts or inline errors.
9. **Distinguish offline from server errors:** `NetInfo` false does not mean HTTP 500 - different copy and retry strategies for each.
10. **Hide offline banner during reachability probe:** `isInternetReachable === null` on launch is not offline - show banner only on confirmed disconnect.
11. **Wire onlineManager to NetInfo:** TanStack Query should pause retries offline - uncapped retries on airplane mode drain battery.
12. **Label stale cached data:** Show `dataUpdatedAt` or "Saved data from …" during SWR - users must know prices or balances may be old.
13. **Persist failed mutations:** Optimistic UI without a queue loses creates offline - AsyncStorage or MMKV replay with idempotency keys on reconnect.
14. **Install global handler once at bootstrap:** `ErrorUtils.setGlobalHandler` in root `_layout` before routes mount - chain to the previous handler after logging.
15. **Treat isFatal seriously:** Fatal JS errors may leave the bundle unhealthy - report immediately; do not only `console.warn`.
16. **Catch unhandled promise rejections:** Add `onunhandledrejection` (where supported) as a safety net beside `setGlobalHandler`.
17. **Do not reload the app on Retry:** `Updates.reloadAsync()` discards in-memory state - prefer `refetch()` or boundary reset.
18. **Feature-flag risky screens:** Remote kill switch plus local crash counter auto-disables a screen after repeated boundary trips.
19. **Cache flag payloads with TTL:** AsyncStorage defaults let the app boot when the flag service is down - stale-off is safer than stale-on for new crashes.
20. **Model capability tiers:** `full` / `degraded` / `unavailable` for biometrics, location, and camera - degrade with clear copy, do not throw.
21. **Use requireOptionalNativeModule in Expo Go paths:** Missing native classes should downgrade features - not crash at import time.
22. **Map errors to user-facing categories:** Network, auth, validation, and unknown each get distinct headline + action - one generic "Something went wrong" is a last resort.
23. **Offer one primary recovery action:** Retry, Go back, or Contact support - not three equal buttons that paralyze mobile users.
24. **Keep boundary fallback JSX trivial:** No data fetching inside the boundary component - throws in fallback escalate to the parent boundary.
25. **Test airplane mode and boundary reset on device:** Simulators hide NetInfo flapping and remount races - QA scripts should include offline + retry + kill-switch paths.

## FAQs

Do error boundaries catch async await errors?

* No - unless the rejection happens during render (anti-pattern).
* Use try/catch in the async function or let TanStack Query surface `isError`.

How many boundaries does a tab app need?

* One per primary stack screen plus a root boundary.
* Heavy feature tabs (checkout, maps) merit their own even when nested.

Should global handlers replace Sentry?

* No - forward to Sentry (or similar) from both global handler and `componentDidCatch`.
* Global handler catches what boundaries miss; boundaries add screen context.

When do feature flags beat hotfix OTA?

* When a specific screen crashes on launch and you need an instant off switch without waiting for store review.
* Pair with a fix OTA or store build - flags contain damage; they do not replace the patch.

## Related

* [Error Handling Basics](https://docs.wahwei/reactnative.codeguides.io/error-resilience/error-handling-basics/) - try/catch vs boundaries tour
* [Error Boundaries in RN](https://docs.wahwei/reactnative.codeguides.io/error-resilience/error-boundaries-in-rn/) - screen fallbacks and recovery UI
* [Network Failure UX](https://docs.wahwei/reactnative.codeguides.io/error-resilience/network-failure-ux/) - offline banners and retry queues
* [Global Error Handlers](https://docs.wahwei/reactnative.codeguides.io/error-resilience/global-error-handlers/) - ErrorUtils and unhandled rejections
* [Feature Flags for Safe Rollout](https://docs.wahwei/reactnative.codeguides.io/error-resilience/feature-flags-for-safe-rollout/) - kill switches
* [User-Facing Error Copy](https://docs.wahwei/reactnative.codeguides.io/error-resilience/user-facing-error-copy/) - actionable messages

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

636f64656775696465732e696f7c6367696f3935327c323032363037

Reviewed by Chris St. John·Last updated Jul 19, 2026
