# Observability Best Practices

A condensed summary of the 25 most important best practices drawn from every page in this section.

Highlights / Observability Best Practices

* Correlate release, OTA update id, sessionId, and route on every signal
* Crash reporting, structured logs, performance traces, and analytics serve different questions
* Upload source maps and native symbols on every production build - unsymbolicated stacks waste incidents
* Gate product analytics behind consent; crash stability telemetry may use separate policy
* Define SLOs with error budgets before launch week - not after the first spike
* Mid-tier Android validates performance SLOs - flagship phones hide cold start and jank regressions

1. **Know the four signals:** Crashes/fatals, handled errors, performance transactions, and product analytics - one vendor rarely replaces all four.
2. **Tag every report with release identity:** Native `version+build`, `otaUpdateId`, `runtimeVersion`, and `channel` - triage without reproducing on device.
3. **Generate sessionId on cold start:** Rotate on logout - same lifecycle discipline as [Mobile Auth Basics](https://docs.wahwei/reactnative.codeguides.io/auth-session/mobile-auth-basics/) tokens.
4. **Attach route to crashes and logs:** Expo Router `pathname` beats component display names - refactors rename components, routes stay stable.
5. **Separate native crashes from JS errors:** Different symbolication pipelines - Hermes maps and iOS dSYM / Android ProGuard are all required.
6. **Chain ErrorUtils handlers:** Never replace the previous global handler wholesale - dev redbox and SDK integrations depend on chaining.
7. **Initialize Sentry before routes mount:** Earliest `_layout` or `index.js` side effect - late init misses startup failures.
8. **Upload source maps on every EAS production build:** Unsymbolicated stacks are a release blocker, not a nice-to-have.
9. **Set Sentry `dist` to OTA update id:** Distinguish JS regressions from native regressions on the same store version.
10. **Enable native crash capture:** `@sentry/react-native` native modules - JS-only wrappers miss SIGABRT and OOM kills.
11. **Cap breadcrumbs and log buffers:** Unbounded rings OOM on chatty screens - drop `debug` first under pressure.
12. **Batch structured logs; ship on foreground:** Per-line HTTPS wastes battery - flush on `active` and best-effort on `background`.
13. **Never log tokens, emails, or card data:** Hash user ids; strip PII in `beforeSend` and analytics `sanitize()`.
14. **Gate analytics behind explicit consent:** Separate toggles for crash reporting vs product analytics - legal owns the policy, engineering implements gates.
15. **Request ATT only when needed on iOS:** Align `NSUserTrackingUsageDescription` with actual cross-app tracking - vague copy fails review.
16. **Reset analytics identity on logout:** `segment.reset()` / Amplitude `reset()` alongside secure store clearing.
17. **Use stable analytics event names:** `checkout_completed` not `completeCheckout` - renames break year-over-year charts.
18. **Sample production traces at 10–20%:** 100% capture overwhelms cost; 100% on checkout/payment routes is fine.
19. **Instrument navigation at the router layer:** One navigation span per pathname - not per leaf `useEffect`.
20. **Propagate trace headers on API calls:** `sentry-trace` or W3C `traceparent` - mobile-only latency hides backend blame.
21. **Define crash-free sessions SLO with session rules:** Align with Sentry session tracking - exclude dev and preview environments from production numerators.
22. **Track OTA apply success explicitly:** Silent `fetchUpdateAsync` failures erode trust - measure check → download → apply → next-launch `updateId`.
23. **Pair cold start SLO with reference device:** p95 on Pixel 6a class per [Performance Basics](https://docs.wahwei/reactnative.codeguides.io/performance/performance-basics/) - iPhone Pro lies.
24. **Use error budgets to gate releases:** Burn > 50% in a week → feature freeze; 0% → halt store and OTA per [Rollback Runbook](https://docs.wahwei/reactnative.codeguides.io/ota-updates/rollback-runbook/).
25. **Run observability review before major OTAs:** Staged rollout + Release Health + OTA success SLO - rollback channel before store emergency.

## FAQs

Can one tool replace Sentry, Segment, and OpenTelemetry?

* Unified platforms exist but rarely excel at all four signal types on day one.
* Start with crash + logs + consent-gated analytics; add OTel when backend tracing matures.

What is the minimum viable observability for v1?

* Sentry with source maps, release tags, route breadcrumbs, and crash-free dashboard.
* Structured log buffer shipping on foreground is a close second for offline-first apps.

Should observability run in Expo Go?

* No - validate on development builds and EAS preview binaries; Expo Go shell skews crashes and performance.

How do observability and performance sections differ?

* [Performance](https://docs.wahwei/reactnative.codeguides.io/observability/performance-monitoring/) defines **budgets and optimization** - observability **measures and alerts** against those budgets in production.

## Related

* [Observability Basics](https://docs.wahwei/reactnative.codeguides.io/observability/observability-basics/) - signal stack tour
* [Sentry for React Native](https://docs.wahwei/reactnative.codeguides.io/observability/sentry-for-react-native/) - production crash setup
* [Structured Logging On Device](https://docs.wahwei/reactnative.codeguides.io/observability/structured-logging-on-device/) - batched JSON logs
* [Analytics & Privacy](https://docs.wahwei/reactnative.codeguides.io/observability/analytics-and-privacy/) - consent and ATT
* [Performance Monitoring](https://docs.wahwei/reactnative.codeguides.io/observability/performance-monitoring/) - navigation and API traces
* [SLOs for Mobile Apps](https://docs.wahwei/reactnative.codeguides.io/observability/slos-for-mobile-apps/) - error budgets
* [Performance Best Practices](https://docs.wahwei/reactnative.codeguides.io/performance/best-practices/) - device matrix and TTI owners
* [OTA Updates Best Practices](https://docs.wahwei/reactnative.codeguides.io/ota-updates/best-practices/) - release correlation
* [Auth Session Lifecycle](https://docs.wahwei/reactnative.codeguides.io/auth-session/auth-session-lifecycle/) - telemetry vs auth session boundaries

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4). Y29kZWd1aWRlcy5pb3xjZ2lvOTQzfDIwMjYwNw==

Reviewed by Chris St. John·Last updated Jul 19, 2026
