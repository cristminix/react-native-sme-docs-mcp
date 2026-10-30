# Expo Rules Highlights Summary

Every highlight bullet from the 8 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Expo Rules Highlights Summary

* Pin SDK 57 at scaffold with default@sdk-57 and verify with expo-doctor before the first feature PR
* Route files re-export feature screens - no business logic in app/
* Search expo SDK packages and config plugins before writing Swift or Kotlin
* EXPO\_PUBLIC\_ and extra are client-visible - never put API secrets or signing keys there
* Channels map to environments: development, preview, production - not engineer first names
* Measure on mid-tier Android - iPhone Pro hides jank and memory pressure

## [Expo Project Rules Checklist](https://docs.wahwei/reactnative.codeguides.io/expo-rules/expo-project-rules-checklist/)

* Pin SDK 57 at scaffold with default@sdk-57 and verify with expo-doctor before the first feature PR
* app.config.ts is the source of truth - never commit secrets to extra or EXPO\_PUBLIC\_\*
* Thin app/ routes; business logic lives in features// with one public export per feature
* Gitignore ios/ and android/ under CNG - regenerate on EAS Build or expo prebuild --clean
* Use npx expo install for every Expo package - manual npm install skews native binaries
* Commit lockfiles, .env.example, and eas.json - never commit .env.local or hand-edited native folders

## [Navigation & Routing Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/navigation-and-routing-rules/)

* Route files re-export feature screens - no business logic in app/
* One root \_layout.tsx owns providers; nested layouts only handle stack/tab chrome
* Declare scheme and associated domains in app.config before shipping deep links
* Validate route params with Zod at the feature boundary - never trust URL input
* Use typed routes (experiments.typedRoutes) and href objects - not stringly-typed paths
* Test critical deep links in Maestro smoke flows and contract-test param parsing in Jest

## [Native Module Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/)

* Search expo SDK packages and config plugins before writing Swift or Kotlin
* Expo Go cannot load arbitrary native code - use expo-dev-client when you leave the SDK path
* Express native changes as idempotent config plugins, not hand-edited ios/ or android/
* npx expo install pins native-compatible versions - manual npm install causes runtime crashes
* Rebuild dev clients and store binaries after every native dependency or SDK change
* Custom native modules require an ADR with maintenance owner and New Architecture compatibility plan

## [Security Rules for Mobile](https://docs.wahwei/reactnative.codeguides.io/expo-rules/security-rules-for-mobile/)

* EXPO\_PUBLIC\_ and extra are client-visible - never put API secrets or signing keys there
* Store refresh tokens in expo-secure-store; never AsyncStorage or unencrypted MMKV
* EAS Secrets and eas env:pull for build-time values - not .env committed to git
* Certificate pinning is a product decision - ADR required; default to system TLS on SDK 57
* Clear secure storage and navigation stack on logout - back gesture must not expose PII
* Audit npx expo config --type public before every release for leaked endpoints and keys

## [Release & OTA Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/)

* Channels map to environments: development, preview, production - not engineer first names
* runtimeVersion policy must match between eas build and eas update or OTAs miss devices
* Native dependency changes require store builds - OTA is JavaScript and assets only
* eas update --environment is required on SDK 55+ - local .env is ignored on update runners
* Define rollback triggers before launch: crash rate, failed payments, auth outage
* Never ship JS that calls new native APIs until store adoption crosses your threshold

## [Performance Budget Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/performance-budget-rules/)

* Measure on mid-tier Android - iPhone Pro hides jank and memory pressure
* Set JS bundle budget with owner: mobile platform team gates production OTA
* TTI from cold start to interactive primary tab - track per release on reference device
* 60 fps for scroll and gestures; 55 fps sustained minimum on lists during audit
* Hermes bundle analyzer in CI - fail PRs that exceed budget without ADR exception
* Performance regressions are rollback triggers - link to Release & OTA Rules

## [Architecture Decision Records](https://docs.wahwei/reactnative.codeguides.io/expo-rules/architecture-decision-records/)

* Mobile ADRs add Platform Impact, OTA vs Store, and Rollback sections web templates omit
* Store ADRs in docs/adr/NNNN-title.md with status Accepted, Superseded, or Deprecated
* Every custom native module, cert pinning choice, and budget waiver gets an ADR
* Link ADRs from PRs and expo-rules checklists - culture erodes without traceability
* Revisit date is mandatory - mobile decisions expire when SDK or threat model changes

## [Expo Rules Best Practices](https://docs.wahwei/reactnative.codeguides.io/expo-rules/best-practices/)

* Pin SDK 57 at scaffold; app.config.ts and expo-doctor gate every upgrade
* Thin app/ routes, typed Expo Router hrefs, and Zod-validated deep-link params
* Expo SDK and config plugins before custom native; rebuild dev clients after native deps
* Tokens in expo-secure-store; audit public config; pinning only with ADR
* runtimeVersion, channels, and rollback triggers before production OTA
* Performance budgets with owners; mid-tier Android is the truth device

WTI5a1pXZDFhV1JsY3k1cGIzeGpaMmx2T1RRMGZESXdNall3Tnc9PQ==

Reviewed by Chris St. John·Last updated Jul 19, 2026
