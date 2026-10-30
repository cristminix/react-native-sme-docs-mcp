# Expo Rules Best Practices

A condensed summary of the 25 most important best practices drawn from every page in this section.

Highlights / Expo Rules Best Practices

* Pin SDK 57 at scaffold; app.config.ts and expo-doctor gate every upgrade
* Thin app/ routes, typed Expo Router hrefs, and Zod-validated deep-link params
* Expo SDK and config plugins before custom native; rebuild dev clients after native deps
* Tokens in expo-secure-store; audit public config; pinning only with ADR
* runtimeVersion, channels, and rollback triggers before production OTA
* Performance budgets with owners; mid-tier Android is the truth device

1. **Pin the SDK at scaffold time:** Use `npx create-expo-app@latest --template default@sdk-57` so `expo` starts at `~57.0.4` - upgrading three SDKs in one PR compounds breaking changes.
2. **`app.config.ts` is the source of truth:** Dynamic config supports environments, plugins, and typed helpers - run `npx expo config --type public` before every store submission.
3. **Never commit secrets to `extra` or `EXPO_PUBLIC_*`:** Client bundles expose these values - server secrets belong in EAS Secrets and backend code only.
4. **Commit lockfiles and use `npx expo install`:** CI and EAS must resolve the same dependency tree - manual `npm install` on Expo packages skews native binaries.
5. **Keep `app/` thin; features own logic:** Route files re-export screens from `features/<name>/` - no fetch calls, hooks, or business rules beside `_layout.tsx`.
6. **Gitignore `ios/` and `android/` under CNG:** Committed native folders block RN 0.86 prebuild templates - regenerate on EAS Build or `expo prebuild --clean`.
7. **Run `expo-doctor` in CI on every PR:** Catches version skew, invalid config, and dependency mistakes before they reach TestFlight.
8. **Prefer `href` objects and typed routes:** Enable `experiments.typedRoutes` - `router.push({ pathname: '/orders/[id]', params: { id } })` beats string paths that typo silently.
9. **Validate route params at the feature boundary:** Parse `useLocalSearchParams()` with Zod before render - malformed deep links show recoverable UI, not redboxes.
10. **Auth gates live in layouts; reset stack on logout:** One `(app)/_layout.tsx` redirect - `router.replace` after logout so back gesture never returns to PII with a cleared token.
11. **Declare `scheme` and associated domains in `app.config`:** Universal links and custom schemes are config-plugin territory - not hand-edited generated native files.
12. **Search Expo SDK packages before writing native code:** `npx expo install expo-*` first - custom Swift/Kotlin requires dev-client rebuilds, ADRs, and ongoing ownership.
13. **Express native changes as idempotent config plugins:** Hand-editing `Info.plist` or `AndroidManifest.xml` is lost on `prebuild --clean` - plugins must be safe on repeated runs.
14. **Rebuild dev clients after every native dependency change:** OTA updates JavaScript only - new native modules need `eas build --profile development` before QA sign-off.
15. **Expo Go is not a native QA target:** Custom modules and real bundle IDs require dev-client or preview EAS builds - Expo Go hides production linking and permission behavior.
16. **Store tokens in `expo-secure-store`:** Refresh and access tokens never go in AsyncStorage or unencrypted MMKV - clear secure storage on logout.
17. **Audit public config before release:** `npx expo config --type public` with production env - grep CI for `sk_live`, private keys, and internal hostnames.
18. **Default to system TLS; pin only with an ADR:** Certificate pinning needs rotation runbooks and native modules - most apps should not pin on day one.
19. **Set explicit `runtimeVersion` policy:** `appVersion`, `sdkVersion`, or `fingerprint` must match between `eas build` and `eas update` - mismatches strand users on stale bundles.
20. **Channels map to environments, not people:** `development` → `preview` → `production` with preview soak - use `eas update --environment production` on SDK 55+ runners.
21. **Native changes require store builds:** New modules, plugins, permissions, and schemes are never OTA-only - gate JS calling new native APIs until binary adoption threshold.
22. **Define rollback triggers before launch:** Crash rate, auth failures, and payment drops each have an owner, metric threshold, and last known-good bundle ID.
23. **Publish performance budgets with named owners:** Bundle MB, cold-start TTI, and scroll FPS floors are merge gates - anonymous budgets are ignored in crunch week.
24. **Measure on mid-tier Android reference devices:** iPhone Pro hides jank and memory pressure - if it passes on Pixel-class hardware, iOS usually follows.
25. **ADR for every non-default architectural choice:** Custom native modules, pinning, committed `ios/`, budget waivers, and modal patterns get `docs/adr/` records with mandatory revisit dates.

## FAQs

How do we enforce these in PR review?

Attach the relevant checklist page to the PR template - project, routing, native, security, release, or performance. Block merge on Tier 1 violations unless an ADR is linked.

Which rules are merge blockers vs recommendations?

Secrets, lockfiles, illegal hook placement in lists, missing secure store for tokens, and wrong-channel production OTA are blockers. Performance waivers and pinning skips need ADR exceptions with expiry.

Do these apply to monorepos?

Yes - add one `react-native` instance, per-app EAS `projectId`, and boundary rules for cross-feature imports. Metro customization waits until SDK 57 auto config fails.

Where do I start for a new Expo SDK 57 app?

Read [Expo Project Rules Checklist](https://docs.wahwei/reactnative.codeguides.io/expo-rules/expo-project-rules-checklist/) Tier 1, then [Navigation & Routing Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/navigation-and-routing-rules/) before adding screens.

How do ADRs and checklists interact?

Checklists state defaults the team enforces. ADRs document approved exceptions with rollback and revisit - link ADRs from PRs that deviate.

## Related

* [Expo Project Rules Checklist](https://docs.wahwei/reactnative.codeguides.io/expo-rules/expo-project-rules-checklist/) - 25 project scaffolding non-negotiables
* [Navigation & Routing Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/navigation-and-routing-rules/) - Expo Router and deep-link hygiene
* [Native Module Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/) - SDK vs custom native and CNG
* [Security Rules for Mobile](https://docs.wahwei/reactnative.codeguides.io/expo-rules/security-rules-for-mobile/) - secrets, storage, and pinning
* [Release & OTA Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/) - channels, runtime versions, rollback
* [Performance Budget Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/performance-budget-rules/) - bundle, TTI, and FPS owners
* [Architecture Decision Records](https://docs.wahwei/reactnative.codeguides.io/expo-rules/architecture-decision-records/) - mobile ADR template

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 9, 2026
