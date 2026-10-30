# Spikes, PoCs & New Architecture

A cookbook for evaluating **Expo UI**, **brownfield embed**, and **experimental flags** safely - time-boxed branches, clear success criteria, and ADR outcomes so exploration does not become permanent production debt.

Highlights / Spikes, PoCs & New Architecture

* Spike branches are time-boxed - ADR outcome required before any merge to main
* PoC success criteria written before code - 'looks cool' is not a metric
* Expo UI and experimental Router APIs belong on spike/\* with feature flags off in production
* Brownfield spikes use isolated worktree + artifact publish - not copy-paste into host main
* New Architecture validation needs release-like eas build - Expo Go is not proof
* Kill spikes loudly - document why not to pursue saves future sprint debates

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
# Spike bootstrap (never on main)
git checkout main && git pull --ff-only
git worktree add ../MyApp-spike-ui spike/expo-ui-tabs
cd ../MyApp-spike-ui
EXPO_PACKAGER_PORT=8082 npx expo start
```

```markdown
# docs/spikes/TEMPLATE.md - copy per spike
## Spike: <name>
- **Owner:** @engineer
- **Time box:** 3 days (hard stop)
- **Hypothesis:** <what we learn>
- **Success criteria:** <measurable>
- **Out of scope:** production merge, perf sign-off, a11y audit
- **Outcome:** ADOPT | DEFER | REJECT + link to ADR
```

```text
Spike lifecycle
  charter (30 min) → branch → time box → demo → ADR → delete branch
                              ↓
                    never merge without ADR + flags + QA matrix
```

**When to reach for this:**

* Evaluating **Expo UI** (SwiftUI/Jetpack Compose interop) for a new screen class.
* **Brownfield** embed feasibility before native squad commits CI changes.
* **New Architecture** validation after adding a bridge-only native module.
* **Experimental** `app.config.ts` or Expo Router APIs flagged unstable in docs.
* Leadership asks for PoC "this sprint" without success criteria - charter first.

**When to avoid:**

* Production bug fix - use `fix/*` branch, not `spike/*`.
* Already-adopted pattern (Expo Router file routes) - ship in feature branch with normal QA.
* Re-litigating decided ADR without new constraints - read `docs/adr/` first.

## Working Example A - Expo UI Spike

Evaluate whether **Expo UI** components can replace a custom native tab chrome for tablet layouts.

**Step 1 - Charter (before code)**

```markdown
## Spike: expo-ui-tablet-tabs
- **Time box:** 3 days
- **Hypothesis:** Expo UI tab primitives reduce native PRs for iPad split view
- **Success:** Tab switch &lt; 100ms on iPad 10th gen; TypeScript types compile SDK 57
- **Fail:** Crash on Android API 26 or requires hand-edited ios/ outside CNG
- **Outcome doc:** docs/adr/0012-expo-ui-tabs.md
```

**Step 2 - Isolated branch + flag**

```ts
// src/shared/config/featureFlags.ts
export const flags = {
  expoUiTabs: __DEV__ && process.env.EXPO_PUBLIC_SPIKE_EXPO_UI === "1",
};
```

```bash
EXPO_PUBLIC_SPIKE_EXPO_UI=1 EXPO_PACKAGER_PORT=8082 npx expo start
```

* **Never enable spike flags** in `production` EAS profile
* Pair with [Navigation and Routing Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/navigation-and-routing-rules/) - one navigator owner

**Step 3 - Validation matrix**

| Check | Command / action |
| --- | --- |
| Doctor | `npx expo-doctor` |
| Types | `npx tsc --noEmit` |
| Release-like perf | `eas build --profile preview` + Flashlight |
| Tablet layout | Physical iPad or ASC screenshot sizes |
| Android parity | API 26 device - not emulator-only |

**Step 4 - Outcome ADR**

```markdown
# ADR 0012: Expo UI for tablet tabs - DEFER
- **Reason:** Android parity gaps; team lacks SwiftUI reviewer
- **Revisit:** SDK 58 or when Expo UI hits stable in changelog
- **Branch deleted:** spike/expo-ui-tabs
```

* **DEFER** is valid - link calendar reminder in [Deprecation & EOL Tracking](https://docs.wahwei/reactnative.codeguides.io/governance/deprecation-and-end-of-life-tracking/)
* **ADOPT** requires feature flag rollout plan - [Feature Flags for Safe Rollout](https://docs.wahwei/reactnative.codeguides.io/error-resilience/feature-flags-for-safe-rollout/)

---

## Working Example B - Brownfield Embed PoC

Prove **expo-brownfield** artifact loads in existing native host without Node on host CI.

**Step 1 - Two-repo spike layout**

```text
rn-checkout/          # Expo module repo (spike branch)
  expo-brownfield build → AAR + XCFramework
host-ios-android/     # Native host (spike/brownfield-checkout branch)
  consumes artifact v0.0.1-spike.1
```

```bash
# RN repo
npx create-expo-app@latest CheckoutRn --template blank-typescript@sdk-57
npx expo install expo-brownfield
# build artifacts per expo-brownfield docs
```

* Follow [Brownfield Basics](https://docs.wahwei/reactnative.codeguides.io/brownfield/brownfield-basics/) - isolated vs integrated decision first
* PoC **does not merge** into host `main` until CI publishes artifacts automatically - [Brownfield CI/CD](https://docs.wahwei/reactnative.codeguides.io/brownfield/brownfield-ci-cd/)

**Step 2 - Success criteria**

```markdown
- [ ] Host launches RN checkout screen from native button
- [ ] Cold start RN surface &lt; 2s on mid-tier Android
- [ ] Back navigation returns to native without leak (Instruments / LeakCanary)
- [ ] Auth token passed via bridge contract v1 - document in ADR
- [ ] No manual copy of JS bundle into host assets
```

**Step 3 - Bridge contract version**

```ts
// Document in ADR - host and RN must bump together
export const BRIDGE_CONTRACT_VERSION = "1.0.0-spike";
```

> **Related:** [Shared Authentication and Bridges](https://docs.wahwei/reactnative.codeguides.io/brownfield/shared-authentication-and-bridges/)

---

## Working Example C - New Architecture Validation

Third-party camera module claims NA support - validate before store release.

**Step 1 - Enable NA on spike only**

```bash
git checkout -b spike/new-arch-camera
npx expo prebuild --clean
```

```ts
// app.config.ts - spike documents explicit NA (SDK 57 greenfield may default true)
export default {
  expo: {
    plugins: ["expo-camera", "expo-build-properties"],
  },
};
```

**Step 2 - Build matrix (required)**

```bash
npx expo-doctor
eas build --profile preview --platform ios
eas build --profile preview --platform android
```

| Test | Pass criteria |
| --- | --- |
| Open camera | No redbox on NA build |
| Take photo | File URI returned |
| Background / resume | No crash |
| Flashlight score | No regression vs Old Arch baseline |

* **Expo Go is invalid** for NA proof - custom dev client or EAS preview
* If fail: registry row in [Deprecation & EOL Tracking](https://docs.wahwei/reactnative.codeguides.io/governance/deprecation-and-end-of-life-tracking/); evaluate alternate module

**Step 3 - Merge criteria if ADOPT**

```markdown
- [ ] ADR: New Architecture enabled project-wide
- [ ] All native modules NA-compatible or replaced
- [ ] eas build production matrix green
- [ ] 72h crash-free on preview channel
```

---

## Experimental Flags and Config

| Surface | Safe spike pattern | Production rule |
| --- | --- | --- |
| `EXPO_PUBLIC_*` spike toggles | `.env.local` only | Never in EAS production env |
| `experiments` in app config | spike branch | Remove or ADR before merge |
| Expo Router unstable API | `spike/*` | Pin to documented API version |
| React 19 experimental | Match SDK 57 template | No manual canary override |

```ts
// ❌ Never merge to main without ADR
export default {
  expo: {
    experiments: {
      // typedRoutes, reactCompiler, etc. - spike only until stable
    },
  },
};
```

* Read Expo changelog **Experimental** section each SDK bump
* [Expo Project Rules Checklist](https://docs.wahwei/reactnative.codeguides.io/expo-rules/expo-project-rules-checklist/) - config source of truth in `app.config.ts`

---

## Spike Governance Rules

| Rule | Rationale |
| --- | --- |
| Max **5 active spikes** per squad | Focus dilution |
| Hard **time box** (3–5 days default) | Spikes expand to fill sprint |
| **Demo on day N** - even if fail | Forces articulation of learning |
| **No spike code in release branch** | Cherry-pick poison |
| **ADR for ADOPT, DEFER, REJECT** | Institutional memory |
| Delete branch after outcome | Prevents accidental merge months later |

```bash
# After REJECT - delete worktree
git worktree remove ../MyApp-spike-ui
git branch -D spike/expo-ui-tabs
```

---

## PoC vs Spike vs Production Pilot

| Type | Duration | Ships to users? | Doc |
| --- | --- | --- | --- |
| **Spike** | 3–5 days | No | Short ADR |
| **PoC** | 1–2 sprints | Internal TestFlight / internal track only | ADR + test plan |
| **Pilot** | 1 release | Flagged 1–5% production | Full QA + rollback runbook |

Promotion path: **Spike → ADR → PoC → Pilot → GA** - skipping steps requires EM + platform sign-off.

---

## FAQs

Spike succeeded - can we merge Friday?

Only with **ADR**, **feature flag off by default**, normal **PR template evidence**, and **no spike-only hacks** left in `app.config.ts`. Otherwise schedule PoC sprint.

Who approves brownfield spike merging into host repo?

**Native platform lead** + **mobile lead** + CI owner. RN-only approval is insufficient - host binary ships to stores.

New Architecture spike failed - do we block SDK 57?

**No** - document module replacement plan. SDK 57 / RN 0.86 still ships; failing module gets registry EOL row and swap timeline.

## Related

* [Brownfield Basics](https://docs.wahwei/reactnative.codeguides.io/brownfield/brownfield-basics/) - embed vs rewrite
* [Incremental Adoption ADR](https://docs.wahwei/reactnative.codeguides.io/brownfield/incremental-adoption-adr/) - strangler pattern
* [SDK Upgrade Policy](https://docs.wahwei/reactnative.codeguides.io/governance/sdk-upgrade-policy/) - upgrade spikes
* [Architecture Decision Records](https://docs.wahwei/reactnative.codeguides.io/expo-rules/architecture-decision-records/) - ADR format
* [Interactive Rebase & Worktrees](https://docs.wahwei/reactnative.codeguides.io/git/interactive-rebase-and-worktrees/) - parallel spike work
* [Governance Best Practices](https://docs.wahwei/reactnative.codeguides.io/governance/best-practices/) - spike policy summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
