# Standards Basics

10 examples for team conventions **beyond ESLint** - naming, folders, and **native touch rules** that survive SDK churn and new hires. Seven basic and three intermediate.

Highlights / Standards Basics

* ESLint catches syntax; standards catch architecture - naming and folders need a written doc
* PascalCase components, camelCase hooks, kebab-case route folders - one table in CONTRIBUTING.md
* features/<name>/index.ts is the only public import path - deep imports are merge blockers
* Native touch rules: who edits ios/, android/, plugins/, and when prebuild --clean is mandatory
* ADR required for every native folder commit under CNG - otherwise drift becomes permanent
* Pair standards with expo-rules checklist and lint CI gates - docs alone do not enforce

## Prerequisites

Start from an Expo SDK 57 project with TypeScript and Expo Router. Standards live in `docs/CONTRIBUTING.md` (or `docs/standards.md`) and are enforced in PR review - not only in chat.

```bash
npx create-expo-app@latest MyApp --template default@sdk-57
cd MyApp
npx expo lint
```

```json
{
  "dependencies": {
    "expo": "~57.0.4",
    "react": "19.2.3",
    "react-native": "0.86.0"
  }
}
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**. ESLint setup is in [Linting Basics](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/linting-basics/); project rules are in [Expo Project Rules Checklist](https://docs.wahwei/reactnative.codeguides.io/expo-rules/expo-project-rules-checklist/).

---

## Basic Examples

### 1. Naming Conventions Table

Publish one table - debate once, reference forever.

| Artifact | Convention | Example | Avoid |
| --- | --- | --- | --- |
| React components | PascalCase | `OrderSummaryCard.tsx` | `orderSummary.tsx` |
| Hooks | `use` + camelCase | `useOrders.ts` | `OrdersHook.ts` |
| Route folders (Expo Router) | kebab-case | `app/order-history/` | `app/orderHistory/` |
| Feature folders | kebab-case | `src/features/order-history/` | `src/features/OrderHistory/` |
| Constants (module scope) | SCREAMING\_SNAKE | `MAX_RETRY_COUNT` | `maxRetry` |
| Test files | `.test.ts(x)` suffix | `useOrders.test.ts` | `useOrders.spec.js` |
| Env-specific config | `development`, `preview`, `production` | EAS profile names | `dev`, `prod2` |

```tsx
// src/features/order-history/components/OrderSummaryCard.tsx
export function OrderSummaryCard({ orderId }: { orderId: string }) {
  return null;
}
```

* **File name matches default export** for components - grep and IDE jump-to-definition stay predictable
* **Hooks live in `hooks/`** inside the feature or in `src/shared/hooks/` when cross-feature
* **Route param names** in Expo Router use camelCase in code (`orderId`) even when URL segment is kebab-case

> **Related:** [Prettier & Import Sorting](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/prettier-and-import-sorting/) - formatting is not naming | [Coding Standards & Style Guides](https://docs.wahwei/reactnative.codeguides.io/governance/coding-standards-and-style-guides/) - enforcement cookbook

---

### 2. Folder Layout - Greenfield Expo

Align with [Mobile Architecture Basics](https://docs.wahwei/reactnative.codeguides.io/architecture-design/mobile-architecture-basics/): thin `app/`, fat `src/features/`.

```text
MyApp/
├── app/                          # routes only - no business logic
│   ├── (tabs)/
│   │   ├── index.tsx
│   │   └── orders/
│   │       └── [id].tsx
│   └── _layout.tsx
├── src/
│   ├── shared/                   # api, ui primitives, config helpers
│   ├── entities/                 # User, Order - domain nouns
│   └── features/
│       ├── auth/
│       │   ├── index.ts          # public API
│       │   ├── screens/
│       │   ├── components/
│       │   ├── hooks/
│       │   └── model/
│       └── orders/
├── plugins/                      # config plugins - native touch zone
├── app.config.ts
├── eas.json
└── docs/
    ├── CONTRIBUTING.md           # standards live here
    └── adr/
```

* **`app/`** files should re-export feature screens - one line when possible
* **`src/features/<name>/index.ts`** is the only import path other modules use
* **`plugins/`** and **`app.config.ts`** changes trigger native review - see native touch rules below
* Do not create `src/utils/` junk drawer - promote to `shared/` with a named purpose

> **Related:** [Expo Project Rules Checklist](https://docs.wahwei/reactnative.codeguides.io/expo-rules/expo-project-rules-checklist/) - Tier 2 folder rules

---

### 3. Feature Public API - No Deep Imports

```tsx
// ✅ Correct - consumer imports from feature barrel
import { OrdersScreen, type Order } from "@/features/orders";
 
// ❌ Wrong - couples to internal refactor
import { OrderRow } from "@/features/orders/components/OrderRow";
```

```ts
// src/features/orders/index.ts
export { OrdersScreen } from "./screens/OrdersScreen";
export type { Order } from "./model/types";
// Do not export OrderRow unless another feature truly needs it
```

* **Barrel exports are intentional** - internal components stay private until a second feature needs them
* **ESLint `no-restricted-imports`** can enforce `@/features/*/*` paths - see [Custom ESLint Rules for RN](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/custom-eslint-rules-for-rn/)
* When two features share UI, move the component to `src/shared/ui/` - do not export sibling internals

---

### 4. Route File Discipline

```tsx
// app/(tabs)/orders/index.tsx
export { OrdersScreen as default } from "@/features/orders";
```

```tsx
// app/orders/[id].tsx - param parsing stays in the route layer
import { useLocalSearchParams } from "expo-router";
import { OrderDetailScreen } from "@/features/orders";
 
export default function OrderDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return <OrderDetailScreen orderId={id} />;
}
```

* **Parse params once** in the route file; pass typed props to the screen
* **Layouts** (`_layout.tsx`) own providers and stack/tab config - not feature business rules
* **Modal routes** follow [Navigation and Routing Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/navigation-and-routing-rules/) - one presentation pattern per app

---

### 5. Native Touch Rules - Who May Edit What

| Path / action | Default owner | PR requirement |
| --- | --- | --- |
| `ios/`, `android/` (CNG gitignored) | EAS Build / `expo prebuild` | No manual commits - regenerate |
| `ios/`, `android/` (checked in) | Mobile platform squad | Two reviewers + device build\_id |
| `plugins/*.ts` | Platform + feature lead | `expo prebuild --clean` diff attached |
| `app.config.ts` plugins array | Same as plugins | `npx expo config --type public` output in PR |
| `eas.json` credentials | Release manager | No drive-by profile edits |
| `metro.config.js`, `babel.config.js` | Infra / senior mobile | Explain bundle impact |

```bash
# After plugin or SDK change - mandatory on CNG teams
npx expo prebuild --clean
git diff ios/ android/
```

* **CNG teams gitignore native folders** - hand-editing `Info.plist` guarantees EAS overwrite
* **Brownfield** host repos follow [Brownfield Basics](https://docs.wahwei/reactnative.codeguides.io/brownfield/brownfield-basics/) - artifact version bumps, not copy-paste bundles
* Any exception needs an **ADR** in `docs/adr/` - "temporary" without ADR becomes years of drift

> **Related:** [Native Module Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/) - when JS is not enough

---

### 6. Branch and Ticket Naming

```text
feat/SHIP-412-order-summary-sheet
fix/SHIP-419-crash-on-logout
chore/upgrade-expo-sdk-57
spike/expo-ui-tab-bar
release/2.6.0
hotfix/2.5.1
```

* **Prefix matches conventional commit type** - `feat`, `fix`, `chore`, `spike`
* **Ticket ID required** when your org uses Jira/Linear - cherry-picks depend on traceability
* **`spike/*` never merges to `main` without ADR outcome** - see [Spikes, PoCs & New Architecture](https://docs.wahwei/reactnative.codeguides.io/governance/spikes-pocs-and-new-architecture/)
* **SDK upgrades** use dedicated `chore/upgrade-*` branches - not mixed with feature work

> **Related:** [Git Basics for Mobile Teams](https://docs.wahwei/reactnative.codeguides.io/git/git-basics-for-mobile-teams/)

---

### 7. Environment and Secret Naming

```text
EAS environment:     development | preview | production
.env files:          .env.local (gitignored), .env.example (committed)
Public runtime vars: EXPO_PUBLIC_* only - never secrets
Config:              app.config.ts reads process.env at build time
```

```ts
// app.config.ts - pattern
const IS_DEV = process.env.APP_ENV === "development";
 
export default {
  expo: {
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
    },
  },
};
```

* **`EXPO_PUBLIC_*` inlines at bundle time** - treat as visible to users; see [Security Rules for Mobile](https://docs.wahwei/reactnative.codeguides.io/expo-rules/security-rules-for-mobile/)
* **`.env.example`** documents every required key with placeholder values - onboarding copies to `.env.local`
* **Profile names in `eas.json`** match `development` / `preview` / `production` - no `staging2`

---

## Intermediate Examples

### 8. Monorepo Package Naming

```text
apps/
  mobile/                 # Expo app - primary consumer
packages/
  ui/                     # @myorg/ui - shared RN components
  api-client/             # @myorg/api-client - fetch layer
  tsconfig/               # @myorg/tsconfig - shared bases
```

```json
{
  "name": "@myorg/ui",
  "main": "src/index.ts",
  "peerDependencies": {
    "react": "19.2.3",
    "react-native": "0.86.0"
  }
}
```

* **One lockfile at repo root** - apps do not float independent trees
* **Packages expose `src/index.ts`** - same barrel rule as features
* **Peer deps pin RN/React** - workspace package must not bundle duplicate React
* **Turbo pipeline** runs same `lint` / `typecheck` scripts - [CI Quality Gates](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/ci-quality-gates/)

---

### 9. Native Module and Config Plugin Standards

When adding a config plugin or custom native module:

```text
plugins/
  withMySdk.ts            # config plugin
src/modules/
  my-sdk/                 # optional local Expo module
    expo-module.config.json
    ios/
    android/
```

```bash
# PR checklist for native-touch PRs
npx expo prebuild --clean
npx expo-doctor
eas build --profile preview --platform all
```

* **Plugin id** matches npm package or `with*` function name - one plugin per file
* **Document iOS/Android permissions** added in PR template - store review reads these strings
* **New Architecture compatibility** noted in ADR - RN 0.86 defaults NA on greenfield
* Follow [Native Module Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/) before `expo prebuild`

---

### 10. Standards Document Template

Commit `docs/CONTRIBUTING.md` with enforceable bullets - link from PR template.

```markdown
# Mobile Standards (SDK 57)
 
## Naming
- Components: PascalCase files matching export
- Routes: kebab-case folders under app/
 
## Imports
- Features: import only from @/features/<name>
- No default exports in hooks/utils - named exports only
 
## Native touch
- No manual ios/ android/ edits under CNG
- plugins/ changes require prebuild --clean diff in PR
 
## Review
- UI PRs: iOS + Android screenshot or build_id
- Native-touch PRs: platform reviewer required
 
## Exceptions
- Record in docs/adr/NNNN-title.md - link in PR
```

* **Revisit quarterly** and after every SDK bump - [Deprecation & EOL Tracking](https://docs.wahwei/reactnative.codeguides.io/governance/deprecation-and-end-of-life-tracking/)
* **PR template checkbox** - "I read CONTRIBUTING.md" beats Slack reminders
* **Onboarding day one** - assign reading [Expo Rules Best Practices](https://docs.wahwei/reactnative.codeguides.io/expo-rules/best-practices/) + this doc

---

## FAQs

ESLint already enforces style - why a separate standards doc?

ESLint catches **syntax and selected anti-patterns**. It does not know your feature boundaries, native ownership, or spike merge policy. Standards document **architecture and process** ESLint cannot express without unmaintainable custom rules.

Can we use snake\_case for API field mapping?

**External API shapes** may use snake\_case in adapters (`mapOrderFromApi`). **TypeScript/React layer** stays camelCase - transform at the `shared/api` boundary, not in components.

Who approves breaking a native touch rule?

Staff or lead mobile engineer + written ADR. Emergency hotfix may merge with retroactive ADR within one sprint - not "we'll document later" indefinitely.

## Related

* [Coding Standards & Style Guides](https://docs.wahwei/reactnative.codeguides.io/governance/coding-standards-and-style-guides/) - lint + review enforcement
* [Expo Project Rules Checklist](https://docs.wahwei/reactnative.codeguides.io/expo-rules/expo-project-rules-checklist/) - 25 non-negotiables
* [Linting Basics](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/linting-basics/) - ESLint 9 flat config
* [Mobile Architecture Basics](https://docs.wahwei/reactnative.codeguides.io/architecture-design/mobile-architecture-basics/) - layer boundaries
* [Native Module Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/) - native change governance
* [Governance Best Practices](https://docs.wahwei/reactnative.codeguides.io/governance/best-practices/) - condensed 25-point summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Y29kZWd1aWRlcy5pb3xjZ2lvODk4fDIwMjYwNw==

Reviewed by Chris St. John·Last updated Jul 19, 2026
