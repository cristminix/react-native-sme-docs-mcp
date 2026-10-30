# Essential Libraries Basics

10 examples to understand how we **pick**, **pin**, and **sunset** dependencies on mobile - 7 basic and 3 intermediate. These are the team defaults for Expo SDK 57 apps; deeper cookbooks for each library follow in this section.

Highlights / Essential Libraries Basics

* npx expo install pins native modules to the SDK 57 compatibility table - not npm guesses
* Every native dependency is autolinking surface, install size, and an EAS rebuild trigger
* Server state → TanStack Query; client UI → Zustand; never duplicate API caches in global stores
* Sunset unused libraries before SDK upgrades - knip and depcheck catch dead weight early
* ADR or team defaults beat per-feature library roulette - one list stack, one crash reporter
* Lockfile + expo-doctor in CI catches version skew before expensive native builds

## Prerequisites

Start from a pinned SDK 57 project. Essential libraries are **curated defaults** - not every npm package that solves a problem belongs in a shipping app.

```bash
npx create-expo-app@latest LibBasics --template default@sdk-57
cd LibBasics
npx expo install @tanstack/react-query @react-native-community/netinfo zustand
npx expo-doctor
```

Confirm the baseline pin before adding native modules:

```json
{
  "dependencies": {
    "expo": "~57.0.4",
    "react": "19.2.3",
    "react-native": "0.86.0"
  }
}
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**. Native modules require a **development build** or EAS build - not stock Expo Go alone when the package ships custom native code.

---

## Basic Examples

### 1. Pick by Problem Class - Not by GitHub Stars

Mobile dependency decisions start with **what kind of state or I/O** you need - not trending repos.

```text
┌────────────────────┬─────────────────────────┬──────────────────────────┐
│ Problem            │ Default library         │ Do not use for           │
├────────────────────┼─────────────────────────┼──────────────────────────┤
│ API / server cache │ @tanstack/react-query   │ Cart badge, theme toggle │
│ Global client UI   │ zustand                 │ Product catalog rows     │
│ Fast local KV      │ react-native-mmkv       │ Relational offline data  │
│ Long lists         │ @shopify/flash-list     │ 8-row settings screen    │
│ Gestures / motion  │ Reanimated 4 + RNGH     │ One-shot 200ms fade      │
│ Crash reporting    │ @sentry/react-native    │ Console.log in prod      │
└────────────────────┴─────────────────────────┴──────────────────────────┘
```

* **One library per problem class** - two list libraries or two global stores creates migration debt
* **Prefer Expo-first packages** - `npx expo install` resolves versions; fewer native build surprises
* Document exceptions in an ADR - not in a Slack thread nobody finds during onboarding

> **Related:** [State Management Basics](https://docs.wahwei/reactnative.codeguides.io/state-management/state-management-basics/) - server vs client split

---

### 2. Pin with `npx expo install` - Not Raw npm

Expo maintains a **compatibility matrix** per SDK. Hand-pinning `react-native-reanimated@latest` breaks EAS builds when the native ABI does not match RN 0.86.

```bash
# Correct - resolves SDK 57-compatible version
npx expo install react-native-reanimated react-native-gesture-handler
 
# Risky for native modules - may install incompatible semver
npm install react-native-reanimated
```

```bash
# Verify after any dependency change
npx expo-doctor
```

* **`npx expo install`** writes the tilde-pinned range Expo tested against your SDK
* **JS-only packages** (`zod`, `@tanstack/react-query`, `zustand`) can use `npm install` - no native bridge
* Run **`expo-doctor`** on release and nightly CI - catches skew before `eas build`
* Commit **lockfile changes** with the dependency PR - reproducible installs on EAS

> **Related:** [Expo SDK Basics](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-sdk-basics/) - when `npm install` is acceptable

---

### 3. Audit Native Transitive Deps Before Adopting

Every library with native code pulls in **autolinking**, **config plugins**, and **store binary size**. Read the install docs before merging.

```bash
# After adding a candidate library
npx expo install react-native-mmkv
npx expo prebuild --dry-run   # surfaces config plugin changes
npx expo-doctor
```

Checklist before merge:

| Question | Pass | Fail → defer or find alternative |
| --- | --- | --- |
| Works in Expo managed workflow? | Yes | Requires bare fork |
| Needs config plugin in `app.config`? | Documented | Surprise native diff |
| Requires dev client rebuild? | Planned in sprint | Blocked on Expo Go-only QA |
| Duplicates existing library? | No overlap | Consolidate first |

* **MMKV, FlashList, Sentry, Reanimated** all require a dev build or EAS binary - plan rebuild time
* `expo prebuild --dry-run` previews native project changes without writing `ios/` / `android/`
* Count **total native modules** - each one is an SDK upgrade reconciliation item

> **Related:** [Dead Code & Dependency Analysis](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/dead-code-and-dependency-analysis/) - keep the graph lean

---

### 4. Lock the Team Default Stack in package.json

Pin the **essential stack** in one PR during project bootstrap so every feature branch inherits the same versions.

```json
{
  "dependencies": {
    "expo": "~57.0.4",
    "react": "19.2.3",
    "react-native": "0.86.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^5.0.0",
    "react-native-reanimated": "~4.0.0",
    "react-native-gesture-handler": "~2.28.0",
    "@sentry/react-native": "^6.0.0"
  }
}
```

Native list/storage pins (`@shopify/flash-list`, `react-native-mmkv`, `@react-native-community/netinfo`) are written by `npx expo install` - do not hand-edit those ranges.

```bash
npx expo install @tanstack/react-query @react-native-community/netinfo zustand \
  @shopify/flash-list react-native-mmkv react-native-reanimated \
  react-native-gesture-handler @sentry/react-native
```

* Let **`npx expo install`** set exact compatible ranges - do not hand-edit native pins
* **One crash reporter** - Sentry or an enterprise alternative, never both
* **One list implementation** per app - FlashList for feeds; FlatList for short static screens is fine
* Document the stack in README or ADR - onboarding copies `package.json`, not tribal knowledge

---

### 5. Separate Server State from Client State

The most expensive library mistake is **duplicating API data** in Zustand or Context when TanStack Query already owns it.

```tsx
// ❌ Anti-pattern - manual fetch + global store for server data
const useProductStore = create((set) => ({
  products: [] as Product[],
  load: async () => {
    const res = await fetch("/products");
    set({ products: await res.json() });
  },
}));
 
// ✅ Pattern - Query owns server cache; Zustand owns UI-only flags
const { data: products } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
const filter = useFilterStore((s) => s.category); // client-only
```

* **TanStack Query** - loading, error, stale time, dedupe, background refetch, persistence
* **Zustand** - cart, onboarding flags, composer drafts, filter chips - synchronous client UI
* **Never** store JWTs or refresh tokens in Zustand persist - use `expo-secure-store`
* See [@tanstack/react-query](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/tanstack-react-query/) and [zustand](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/zustand/) cookbooks

> **Related:** [TanStack Query](https://docs.wahwei/reactnative.codeguides.io/state-management/tanstack-query/) - full server-state deep dive

---

### 6. Know When AsyncStorage Is Enough - Before MMKV

Not every app needs `react-native-mmkv` on day one. Start with AsyncStorage; upgrade when profiling proves sync reads matter.

```text
Storage pick order:
1. In-memory React state / Query cache     → ephemeral
2. @react-native-async-storage/async-storage → small JSON, boot hydration
3. react-native-mmkv                       → hot-path sync reads every frame
4. expo-sqlite                             → relational rows, migrations, queries
5. expo-secure-store                       → tokens, secrets
```

```bash
npx expo install @react-native-async-storage/async-storage
# Add MMKV only after React DevTools Profiler shows storage await on critical path
npx expo install react-native-mmkv
```

* **AsyncStorage** is async - `await getItem` on every render causes jank
* **MMKV** is synchronous - ideal for Zustand persist and feature flags read every mount
* **MMKV is not a database** - no SQL, no joins; use SQLite for offline relational data
* MMKV requires a **dev build** - not available in stock Expo Go

> **Related:** [react-native-mmkv](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/react-native-mmkv/) - fast KV cookbook

---

### 7. List Library: FlatList First, FlashList When Profiled

`@shopify/flash-list` is a performance upgrade - not a day-one requirement for every screen.

```tsx
// Short settings list - FlatList is fine
import { FlatList } from "react-native";
 
// Image-heavy feed with scroll jank on Android - migrate
import { FlashList } from "@shopify/flash-list";
```

Migration trigger checklist:

* Profiler shows **frame drops** during fast flick scroll on a mid-range Android device
* List has **50+ rows** with images or variable content
* `windowSize` tuning on FlatList did not fix blank flashes

```bash
npx expo install @shopify/flash-list
```

* Do not migrate **every** `FlatList` preemptively - estimate tuning has a cost
* See [@shopify/flash-list](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/shopify-flash-list/) for the full migration checklist

> **Related:** [FlashList vs FlatList](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/flashlist-vs-flatlist/) - trade-offs before adopting

---

## Intermediate Examples

### 8. Sunset a Library - Remove Before SDK Upgrade

Sunsetting is a **planned removal** - not letting a package rot in `package.json` until the upgrade explodes.

```bash
# 1. Confirm zero imports
npx knip
npx depcheck
 
# 2. Remove package and lockfile entry
npm uninstall legacy-state-library
 
# 3. Remove native config plugin from app.config.ts if present
# 4. Rebuild dev client - autolinking must drop the native module
eas build --profile development --platform all
 
# 5. Verify on device
npx expo-doctor
```

```ts
// app.config.ts - remove plugin stanza when sunsetting
export default {
  plugins: [
    // ["legacy-library-expo-plugin"],  ← delete
    "expo-router",
  ],
};
```

* **Sunset in a dedicated PR** - easier to bisect than bundled with a feature
* Run **knip** before removal - orphaned files often hide the last import
* **Rebuild native** after removing any package with native code - stale dev clients crash mysteriously
* Document **why** it was removed in the PR description - prevents re-introduction next quarter

> **Related:** [Dead Code & Dependency Analysis](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/dead-code-and-dependency-analysis/)

---

### 9. Dependency PR Review Template

Standardize review questions so every new library gets the same scrutiny.

```markdown
## Dependency PR: @shopify/flash-list
 
- [ ] Problem class documented (list performance - feed screen)
- [ ] Installed with `npx expo install`
- [ ] `npx expo-doctor` clean
- [ ] Native rebuild scheduled / completed
- [ ] No duplicate library (FlatList remains for settings)
- [ ] Bundle impact noted (source size + native)
- [ ] Test plan on physical Android device
- [ ] ADR updated if this changes team default
```

```yaml
# .github/workflows/pr-checks.yml - add on dependency-label PRs
- name: Expo doctor
  if: contains(github.event.pull_request.labels.*.name, 'dependencies')
  run: npx expo-doctor
```

* Label dependency PRs **`dependencies`** - triggers extra CI steps
* **Block merge** if `expo-doctor` fails - version skew is cheaper to fix in PR than in EAS queue
* Require **device test note** for native modules - simulators miss autolinking failures
* Link to the **cookbook** in this section when adopting a standard library

---

### 10. SDK Upgrade Reconciliation Pass

SDK bumps are when unpinned or duplicate libraries hurt most. Run a reconciliation pass **before** merging the SDK PR.

```bash
# Upgrade workflow (simplified)
npx expo install expo@~57.0.4 --fix
npx expo-doctor
npx knip
npm run typecheck && npm test
 
# Reinstall essential native stack against new matrix
npx expo install react-native-reanimated react-native-gesture-handler \
  react-native-mmkv @shopify/flash-list @sentry/react-native
 
eas build --profile preview --platform all
```

| Step | Goal |
| --- | --- |
| `expo install --fix` | Align all `expo-*` modules to SDK 57 |
| `expo-doctor` | Catch incompatible peer deps |
| `knip` | Remove libraries that died during the last release cycle |
| Preview EAS build | Validate native compile before production tag |
| Re-read Babel config | Reanimated plugin must stay **last** |

* **Do not upgrade SDK and add new libraries in one PR** - bisect failures
* Check **config plugin changelogs** - Sentry and notifications plugins move between SDKs
* Re-run **Maestro smoke** on preview binary - gestures and lists break silently on native bumps

> **Related:** [Upgrading Expo SDK Versions](https://docs.wahwei/reactnative.codeguides.io/expo-platform/upgrading-expo-sdk-versions/)

---

## Anti-Patterns

| Anti-pattern | Why it fails |
| --- | --- |
| `npm install` every native module | Version skew → EAS native compile errors |
| Redux + Zustand + Context for same cart | Three sources of truth; logout cleanup nightmare |
| FlashList everywhere on day one | Estimate tuning cost with no measurable gain |
| Keeping unused native modules "just in case" | Autolinking bloat; SDK upgrade pain |
| Skipping dev client rebuild after native add | "Works in Metro" but crashes on device |
| Two crash reporters | Duplicate events; double SDK overhead |

---

## FAQs

Which libraries are in the Essential Libraries section?

TanStack Query, Zustand, MMKV, FlashList, Reanimated + Gesture Handler, and Sentry - the default production stack for Expo SDK 57 apps in this docs site.

Can I use npm install for @tanstack/react-query?

Yes - it is JS-only with no Expo native module. Still pin a semver range and commit the lockfile. For any package Expo documents in the SDK reference, prefer `npx expo install`.

How many global stores should I have?

One Zustand store per **domain** (cart, preferences, onboarding) - not one mega-store. See [zustand](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/zustand/).

When do I need a new EAS build after adding a library?

Whenever the package adds **native code** or a **config plugin** - MMKV, FlashList, Sentry, Reanimated. JS-only packages need Metro restart only.

How do I justify a non-default library to the team?

Write a short ADR: problem, alternatives considered, native cost, sunset plan. Link it from the dependency PR.

## Related

* [@tanstack/react-query](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/tanstack-react-query/) - server state defaults cookbook
* [zustand](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/zustand/) - minimal global store cookbook
* [react-native-mmkv](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/react-native-mmkv/) - fast KV when AsyncStorage is too slow
* [@shopify/flash-list](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/shopify-flash-list/) - migration checklist
* [react-native-reanimated & gesture-handler](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/react-native-reanimated-and-gesture-handler/) - SDK 57 install matrix
* [sentry-expo / @sentry/react-native](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/sentry-expo-sentry-react-native/) - crash reporting on EAS
* [Essential Libraries Best Practices](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/best-practices/) - 25-item summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4). 3730363230327c3132396f6967637c6f692e73656469756765646f63

Reviewed by Chris St. John·Last updated Jul 19, 2026
