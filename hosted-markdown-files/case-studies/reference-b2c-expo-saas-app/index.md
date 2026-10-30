# Reference: B2C Expo SaaS App

A composite reference architecture for a **B2C subscription SaaS** mobile client - team collaboration, habit tracking, or lightweight CRM. The stack is pinned to **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**. This is not one shipped product; it distills patterns that recur across production SaaS apps on EAS.

Highlights / Reference: B2C Expo SaaS App

* Expo Router route groups split auth and app trees - one root gate in \_layout.tsx
* TanStack Query owns server snapshots; MMKV holds session prefs; SQLite is deferred until relational offline needs appear
* EAS profiles map development, preview, and production to channels and environments
* runtimeVersion policy appVersion ties OTA bundles to store binaries without drift
* OTA ships JS fixes weekly; native bumps ride monthly store trains
* Deep links, push payloads, and marketing URLs share the same file-based route manifest

## Context

**Constraints at kickoff:**

* Ship iOS and Android from one TypeScript codebase with **weekly JS releases** and **monthly native** cadence.
* Marketing needs **universal links** into paywalled content; push notifications must open the correct screen.
* Backend is REST + WebSocket; no offline mutation queue in v1 - reads should survive brief tunnel drops.
* Team of six engineers; no dedicated native squad; CI publishes through **EAS Build** and **EAS Update**.

**Non-goals for v1:** Certificate pinning, multi-tenant white-label flavors, brownfield native embedding.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         B2C SaaS - logical layers                        │
├─────────────────────────────────────────────────────────────────────────┤
│  app/ (Expo Router)                                                      │
│    (auth)/sign-in, sign-up          ← unauthenticated route group        │
│    (app)/(tabs)/home|inbox|settings ← authenticated shell               │
│    (app)/paywall/[sku]              ← modal presentation                  │
├─────────────────────────────────────────────────────────────────────────┤
│  src/features/*                     ← screens, hooks, feature APIs       │
│  src/api/client.ts                  ← fetch wrapper + auth header        │
├─────────────────────────────────────────────────────────────────────────┤
│  TanStack Query (server state)      ← cache, staleTime, mutations        │
│  MMKV (prefs, flags)                ← theme, last tab, feature toggles     │
├─────────────────────────────────────────────────────────────────────────┤
│  expo-secure-store                  ← refresh token only                   │
├─────────────────────────────────────────────────────────────────────────┤
│  EAS Build (binaries)               development | preview | production   │
│  EAS Update (JS OTA)                channel per profile, runtimeVersion   │
└─────────────────────────────────────────────────────────────────────────┘
```

**Request path (authenticated read):**

```text
Screen mount → useQuery(key) → Query cache hit?
  ├─ yes + fresh → render
  ├─ yes + stale → render + background refetch
  └─ no → client.ts fetch → API → cache write → render
```

**Release path:**

```text
Git tag v2.4.0 → eas build --profile production → store submit
       │
       └─ same runtime → eas update --channel production (JS hotfix)
```

Cold start loads the root `_layout.tsx`, which reads session from SecureStore, hydrates Query `queryClient`, and redirects between `(auth)` and `(app)` groups. Route files stay thin - they re-export feature screens per [Mobile Architecture Basics](https://docs.wahwei/reactnative.codeguides.io/architecture-design/mobile-architecture-basics/).

> **Related:** [Expo Router Basics](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/) - file-based routing on SDK 57

---

## Recipe

> Quick-reference stack card for a greenfield B2C SaaS on SDK 57.

```bash
npx create-expo-app@latest AcmeSaaS --template default@sdk-57
cd AcmeSaaS
npx expo install @tanstack/react-query expo-secure-store react-native-mmkv
eas build:configure
```

```json
// eas.json (excerpt) - profile → channel → environment
{
  "build": {
    "development": { "developmentClient": true, "channel": "development" },
    "preview": { "distribution": "internal", "channel": "preview" },
    "production": { "channel": "production" }
  }
}
```

```ts
// app.config.ts (excerpt) - runtime ties OTA to store version
export default {
  version: "2.4.0",
  runtimeVersion: { policy: "appVersion" },
  updates: { url: "https://u.expo.dev/<project-id>" },
};
```

**When this reference fits:** Subscription consumer apps with auth-gated tabs, REST backends, and EAS-managed release trains.

**When to diverge:** Offline mutation queues, regulated data, or brownfield native shells - see sibling case studies in this section.

---

## Decisions Made

| # | Decision | Choice | Rationale |
| --- | --- | --- | --- |
| 1 | Navigation | **Expo Router** with `(auth)` / `(app)` groups | File paths are the link manifest; typed routes reduce param bugs - [ADR: Navigation Library Choice](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-navigation-library-choice/) |
| 2 | Server state | **TanStack Query** | Stale-while-revalidate matches SaaS dashboards; `onlineManager` wired to NetInfo - [TanStack Query](https://docs.wahwei/reactnative.codeguides.io/state-management/tanstack-query/) |
| 3 | Token storage | **expo-secure-store** for refresh; access token in memory | Meets [Security Rules for Mobile](https://docs.wahwei/reactnative.codeguides.io/expo-rules/security-rules-for-mobile/) Tier 2 |
| 4 | Local prefs | **MMKV** for flags and UI state | Faster than AsyncStorage for tab restoration; no tokens |
| 5 | Build system | **EAS Build + CNG** | No committed `ios/` / `android/`; prebuild on cloud runners - [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) |
| 6 | OTA policy | **`runtimeVersion: appVersion`** + channel per profile | Preview QA receives preview-channel OTAs; production OTAs cannot hit dev clients - [Release & OTA Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/) |
| 7 | Deep links | **Universal links + Expo Router** | Push and email share `https://app.acme.com/inbox/[id]` paths - [iOS Universal Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/ios-universal-links/) |
| 8 | Observability | **Sentry + structured analytics** | Scrub `Authorization` breadcrumbs before upload - [Observability Basics](https://docs.wahwei/reactnative.codeguides.io/observability/observability-basics/) |

**Rejected alternatives:**

* **Redux for server cache** - duplicated Query capabilities; team standardized on Query in week two.
* **Expo Go for QA sign-off** - preview dev clients on physical devices replaced Go before first store submission.
* **OTA on every commit** - production updates require preview soak and CI publish per Tier 2 release rules.

---

## Outcomes

After twelve weeks on SDK 57 (migrated from SDK 54 during sprint zero - see [Before/After: Expo SDK Major Upgrade](https://docs.wahwei/reactnative.codeguides.io/case-studies/before-after-expo-sdk-major-upgrade/)):

| Metric | Result |
| --- | --- |
| **Release cadence** | 3–4 `eas update` production promotions per month; 1 store binary per month |
| **Cold start (mid Android)** | ~1.8s to interactive home (TTI budget met per [Performance Budget Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/performance-budget-rules/)) |
| **Deep link success** | 97% of marketing QA matrix paths land correct screen - [Deep Link Testing Matrix](https://docs.wahwei/reactnative.codeguides.io/deep-linking/deep-link-testing-matrix/) |
| **OTA rollback** | One production rollback in quarter one - bad paywall copy; reverted channel pointer in 12 minutes |
| **Incident class avoided** | No runtimeVersion mismatch strandings after adopting `appVersion` policy |

Paywall modal route (`presentation: "modal"`) shipped without navigator JSX churn - product could A/B SKU params via OTA while native StoreKit config stayed stable.

---

## Lessons

1. **Pin SDK 57 in the narrative and in `package.json`.** Upgrade notes belong in ADRs; case studies without version pins age badly - annotate every architecture diagram with the SDK that shaped it.
2. **Thin routes, fat features.** The highest churn was `src/features/inbox/`, not `app/(app)/(tabs)/inbox.tsx`. Onboarding improved when new engineers learned the filesystem for URLs only.
3. **Channels are environments, not engineers.** Renaming `jane-dev` to `preview` eliminated accidental production OTA publishes.
4. **Query `staleTime` is a product knob.** Inbox at 30s stale, settings at 5m - one global `staleTime` caused unnecessary battery drain.
5. **Rebuild dev clients after native-affecting bumps.** SDK 57 Reanimated and expo-image updates required new `development` profile binaries; Metro-only refreshes lied about native behavior.
6. **Document what OTA cannot change.** Marketing once requested a new camera permission via OTA - blocked until store build; now listed in release checklist Tier 1.

---

## Related

* [Expo Router Basics](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/) - route groups and layouts
* [TanStack Query](https://docs.wahwei/reactnative.codeguides.io/state-management/tanstack-query/) - server-state cache
* [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - profiles and first cloud build
* [expo-updates (Client API)](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-updates-client-api/) - check, fetch, reload
* [Release & OTA Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/) - channel and runtime policy
* [Auth Session Lifecycle](https://docs.wahwei/reactnative.codeguides.io/auth-session/auth-session-lifecycle/) - foreground refresh
* [Before/After: React Navigation → Expo Router](https://docs.wahwei/reactnative.codeguides.io/case-studies/before-after-react-navigation-expo-router/) - if migrating an existing SaaS shell

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
