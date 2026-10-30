# Observability Highlights Summary

Every highlight bullet from the 8 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Observability Highlights Summary

* Mobile observability spans native crashes, JS fatals, ANRs, and product analytics - not one SDK
* Initialize Sentry before any other app imports in \_layout or index.js
* Structured logs are JSON lines with stable keys - grep-friendly in any backend
* Analytics is not crash reporting - separate consent, retention, and vendor contracts
* Transactions span a user-perceived operation - screen load, checkout, not every setState
* OpenTelemetry is vendor-neutral - export to Honeycomb, Datadog, Grafana Tempo, or OTLP collector

## [Observability Basics](https://docs.wahwei/reactnative.codeguides.io/observability/observability-basics/)

* Mobile observability spans native crashes, JS fatals, ANRs, and product analytics - not one SDK
* Crash-free sessions measure user impact; raw crash counts hide low-traffic screens
* JS errors and native crashes need separate pipelines - Hermes stacks differ from iOS native frames
* Tag every event with release, OTA update id, and route - triage without reproducing on device
* ANRs on Android are slow main-thread work - profile before blaming React
* Pair crash reporters with structured logs - breadcrumbs alone miss offline-first failures

## [Sentry for React Native](https://docs.wahwei/reactnative.codeguides.io/observability/sentry-for-react-native/)

* Initialize Sentry before any other app imports in \_layout or index.js
* Upload source maps on every EAS build - unsymbolicated Hermes stacks are unreadable
* Set release to native version+build and dist to OTA update id when applicable
* Enable native crash capture - @sentry/react-native includes iOS and Android native layers
* Breadcrumbs from navigation and fetch beat post-mortem guesswork
* Release Health tracks crash-free sessions - align numerators with your SLO doc

## [Structured Logging On Device](https://docs.wahwei/reactnative.codeguides.io/observability/structured-logging-on-device/)

* Structured logs are JSON lines with stable keys - grep-friendly in any backend
* Buffer on device; ship batches on foreground and before background - not per log line
* Cap buffer size and drop verbose levels first - unbounded logs OOM low-RAM Android
* Attach release, OTA id, sessionId, and route to every batch header
* Never persist access tokens or PII in log payloads - hash user ids
* Pair with crash reporters - logs uploaded on prior foreground explain native crashes

## [Analytics & Privacy](https://docs.wahwei/reactnative.codeguides.io/observability/analytics-and-privacy/)

* Analytics is not crash reporting - separate consent, retention, and vendor contracts
* Gate all product analytics behind explicit consent resolved before first track call
* iOS ATT applies to tracking that links user data across apps - align SDK config with legal review
* Segment is a router - one identify() fans out to Amplitude, Braze, etc. with transformations
* Reset analytics identity on logout - same discipline as auth token clearing
* Use coarse event schemas - stable names, typed properties, no PII in property keys

## [Performance Monitoring](https://docs.wahwei/reactnative.codeguides.io/observability/performance-monitoring/)

* Transactions span a user-perceived operation - screen load, checkout, not every setState
* Instrument navigation at the router layer - leaf screens should not each start spans
* Propagate trace headers on API calls to join mobile TT with backend latency
* Sample production traces - 100% capture overwhelms cost and obscures p99
* Name spans with op codes: navigation, http.client, ui.load - dashboards group by op
* Compare traces against TTI budgets from Performance Basics - observability without budgets is noise

## [OpenTelemetry on Mobile](https://docs.wahwei/reactnative.codeguides.io/observability/opentelemetry-on-mobile/)

* OpenTelemetry is vendor-neutral - export to Honeycomb, Datadog, Grafana Tempo, or OTLP collector
* Mobile spans must propagate W3C traceparent to your API - otherwise traces stop at the device
* Batch and compress OTLP exports - mobile radios punish per-span HTTPS
* Resource attributes carry service.name, app.version, and deployment.environment
* Sample aggressively in production - head sampling at 1–10% is typical on client
* Align span names with Performance Monitoring - one taxonomy across Sentry and OTel if both run

## [SLOs for Mobile Apps](https://docs.wahwei/reactnative.codeguides.io/observability/slos-for-mobile-apps/)

* SLOs are user-facing promises with error budgets - not aspirational dashboard targets
* Crash-free sessions is the default reliability SLO - define session end rules explicitly
* Cold start SLOs must name reference device and percentile - p95 on Pixel 6a class
* OTA success rate measures download+apply - failed silent updates erode trust invisibly
* Burn-rate alerts fire before budget exhaustion - 2% crash rate for 1h matters more than 28-day average
* Correlate SLO regressions with release, dist, and channel - native vs JS attribution

## [Observability Best Practices](https://docs.wahwei/reactnative.codeguides.io/observability/best-practices/)

* Correlate release, OTA update id, sessionId, and route on every signal
* Crash reporting, structured logs, performance traces, and analytics serve different questions
* Upload source maps and native symbols on every production build - unsymbolicated stacks waste incidents
* Gate product analytics behind consent; crash stability telemetry may use separate policy
* Define SLOs with error budgets before launch week - not after the first spike
* Mid-tier Android validates performance SLOs - flagship phones hide cold start and jank regressions

636f64656775696465732e696f7c6367696f3933357c323032363037

Reviewed by Chris St. John·Last updated Jul 19, 2026
