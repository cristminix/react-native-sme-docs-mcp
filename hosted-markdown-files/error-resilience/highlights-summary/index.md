# Error Handling Highlights Summary

Every highlight bullet from the 8 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Error Handling Highlights Summary

* try/catch handles async and event-handler failures; Error Boundaries catch render-time crashes
* Error boundaries are class components - they catch render, lifecycle, and child-constructor errors
* Detect connectivity with @react-native-community/netinfo - not a one-time fetch probe
* ErrorUtils.setGlobalHandler is React Native's last-resort JS fatal error hook
* Wrap risky screens in a flag gate - remote kill switches beat waiting for App Store review
* Probe native capability once at the module edge - not with try/catch around every call

## [Error Handling Basics](https://docs.wahwei/reactnative.codeguides.io/error-resilience/error-handling-basics/)

* try/catch handles async and event-handler failures; Error Boundaries catch render-time crashes
* Model screens as loading / error / success - never leave users staring at a blank View
* Error Boundaries still require a class component; there is no hook equivalent in React 19
* Retry buttons should re-run the failing operation, not just dismiss the error message
* Offline banners belong at the app shell level so every screen inherits connectivity context
* ErrorUtils.setGlobalHandler is the last line of defense for uncaught JS errors on device

## [Error Boundaries in RN](https://docs.wahwei/reactnative.codeguides.io/error-resilience/error-boundaries-in-rn/)

* Error boundaries are class components - they catch render, lifecycle, and child-constructor errors
* Wrap one boundary per screen (or route layout), not every leaf component
* Fallback UI should offer retry (reset) and a safe navigation escape hatch
* Log in componentDidCatch; never show raw stack traces to users
* Boundaries do not catch event handlers, async code, or errors inside the boundary itself
* Nest boundaries when a widget can fail without taking down the whole screen

## [Network Failure UX](https://docs.wahwei/reactnative.codeguides.io/error-resilience/network-failure-ux/)

* Detect connectivity with @react-native-community/netinfo - not a one-time fetch probe
* Show a persistent offline banner; distinguish offline from server errors
* TanStack Query onlineManager ties query retries to real network state
* Stale-while-revalidate: keep showing cached data with a clear last-updated label
* Queue failed mutations locally and flush when isConnected returns
* Retry buttons should call refetch - not reload the entire app

## [Global Error Handlers](https://docs.wahwei/reactnative.codeguides.io/error-resilience/global-error-handlers/)

* ErrorUtils.setGlobalHandler is React Native's last-resort JS fatal error hook
* Always chain the previous handler - dev redbox and native crash reporting depend on it
* Register handlers once at app bootstrap, before other instrumentation
* Global handlers log and report - screen fallbacks still come from error boundaries
* Unhandled promise rejections need explicit .catch at API boundaries
* Use isFatal to decide whether to show recovery UI vs immediate crash reporting

## [Feature Flags for Safe Rollout](https://docs.wahwei/reactnative.codeguides.io/error-resilience/feature-flags-for-safe-rollout/)

* Wrap risky screens in a flag gate - remote kill switches beat waiting for App Store review
* Increment a crash counter in componentDidCatch and auto-disable the screen after a threshold
* Cache flags in AsyncStorage so a dead config endpoint does not brick the app
* Default to safe (off) when flags are unknown - never assume a new screen is production-ready
* Pair flags with error boundaries - the boundary reports; the flag service decides exposure
* Expo Updates channels let you roll back JS while flags hide the broken route immediately

## [Graceful Degradation Patterns](https://docs.wahwei/reactnative.codeguides.io/error-resilience/graceful-degradation-patterns/)

* Probe native capability once at the module edge - not with try/catch around every call
* requireOptionalNativeModule returns null in Expo Go when the binary is missing
* Expose a Degraded | Full | Unavailable tier - UI picks copy and actions per tier
* Permission denied is a degradation state, not a thrown exception
* Ship a no-op facade so feature code stays linear without if-chains in every screen
* Log degradation events - silent fallbacks hide missing QA coverage

## [User-Facing Error Copy](https://docs.wahwei/reactnative.codeguides.io/error-resilience/user-facing-error-copy/)

* Users need what happened, what is safe, and what to do next - not a stack trace
* Map internal errors to a small set of user messages at the network and boundary edges
* Primary action first: Retry, Check connection, or Contact support - one clear CTA
* accessibilityLiveRegion announces errors without moving focus away from the task
* **DEV** shows diagnostics; production shows the same calm copy on every screen
* Never echo raw API bodies - 'Request failed with status 500' is not actionable

## [Error Boundaries Best Practices](https://docs.wahwei/reactnative.codeguides.io/error-resilience/best-practices/)

* Use try/catch in event handlers; boundaries only catch render errors
* Wrap each major screen in its own error boundary
* Reset boundaries with a key bump or refetch - not empty retry buttons
* Wire NetInfo to TanStack Query onlineManager for offline-aware retries
* Chain ErrorUtils.setGlobalHandler and report fatals to your crash SDK
* Pair kill switches with per-screen crash counters for safe rollout

Reviewed by Chris St. John·Last updated Jul 18, 2026
