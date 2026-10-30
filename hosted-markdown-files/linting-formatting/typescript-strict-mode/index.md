# TypeScript Strict Mode

`strict: true` turns on the compiler checks that catch undefined route params, stale API shapes, and implicit `any` in native bridges - before Metro bundles a broken screen. On Expo SDK 57, you extend `expo/tsconfig.base` and tighten incrementally instead of fighting a thousand-error wall.

Highlights / TypeScript Strict Mode

* Extend expo/tsconfig.base - SDK 57 already sets jsx and moduleResolution Metro expects
* strict: true enables eight checks; noUncheckedIndexedAccess is separate and high-value for RN
* Type route params and API JSON at boundaries - not every StyleSheet line at once
* npx tsc --noEmit in CI catches cross-file breaks ESLint cannot see
* Enable strictNullChecks first when tightening a brownfield app
* Pair compiler strictness with @typescript-eslint/no-floating-promises for async screens

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
# Verify types without emitting JS (CI-friendly)
npx tsc --noEmit
 
# Track remaining errors while migrating
npx tsc --noEmit 2>&1 | rg "error TS" | wc -l
```

```json
// tsconfig.json - Expo SDK 57 baseline
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

**When to reach for this:**

* New Expo TypeScript projects - keep `strict: true` from day one.
* Apps reading `useLocalSearchParams()` or push notification payloads without validation.
* API helpers that `JSON.parse` into typed objects without runtime checks.
* Brownfield migrations moving `.js` screens to `.tsx` without a feature freeze.
* CI gates that need to block merges when a shared hook change breaks distant screens.

## Working Example

```json
// tsconfig.json - production-shaped Expo app
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

```json
// package.json scripts
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "expo lint"
  }
}
```

```tsx
// app/orders/[id].tsx - strictNullChecks + typed route params
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
 
import { fetchOrder, type Order } from "@/lib/api/orders";
 
type OrderParams = {
  id: string;
};
 
function parseOrderParams(raw: Record<string, string | string[] | undefined>): OrderParams {
  const value = raw.id;
  const id = Array.isArray(value) ? value[0] : value;
  if (!id) {
    throw new Error("Missing route param: id");
  }
  return { id };
}
 
export default function OrderDetailScreen() {
  const params = useLocalSearchParams();
  const { id } = parseOrderParams(params);
 
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
 
  useEffect(() => {
    let cancelled = false;
 
    fetchOrder(id)
      .then((data) => {
        if (!cancelled) setOrder(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load order");
        }
      });
 
    return () => {
      cancelled = true;
    };
  }, [id]);
 
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }
 
  if (!order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
 
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Order {order.id}</Text>
      <Text>Status: {order.status}</Text>
      <Text>Total: ${(order.totalCents / 100).toFixed(2)}</Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "600" },
  error: { color: "#dc2626" },
});
```

```ts
// lib/api/orders.ts - unknown at the boundary, typed after validation
import { z } from "zod";
 
const OrderSchema = z.object({
  id: z.string(),
  totalCents: z.number().int().nonnegative(),
  status: z.enum(["pending", "shipped", "delivered"]),
});
 
export type Order = z.infer<typeof OrderSchema>;
 
export async function fetchOrder(id: string): Promise<Order> {
  const res = await fetch(`https://api.example.com/orders/${id}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const json: unknown = await res.json();
  return OrderSchema.parse(json);
}
```

```ts
// components/TagList.tsx - noUncheckedIndexedAccess in action
import { Text, View, StyleSheet } from "react-native";
 
const TAGS = ["mobile", "expo", "typescript"] as const;
 
export function TagList() {
  const first = TAGS[0]; // type: "mobile" | "typescript" | "expo" | undefined
 
  return (
    <View style={styles.row}>
      {first ? <Text style={styles.chip}>{first}</Text> : <Text>No tags</Text>}
    </View>
  );
}
 
const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  chip: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "#e2e8f0", borderRadius: 6 },
});
```

**What this demonstrates:**

* `expo/tsconfig.base` supplies SDK-correct `jsx` and `moduleResolution`; you add strict flags on top.
* Route params are parsed once at the screen boundary - `useLocalSearchParams()` is not trusted blindly.
* API responses flow through `unknown` → Zod → `Order`, satisfying `strictNullChecks` without `as Order`.
* `noUncheckedIndexedAccess` forces a guard before using `TAGS[0]`.
* `typecheck` script runs the same command locally and in CI.

## Deep Dive

### How It Works

* `"strict": true` is an umbrella flag enabling `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, and five related checks.
* Flags like `noUncheckedIndexedAccess` are **not** part of `strict` - enable them explicitly when you want stricter indexed access.
* `tsc --noEmit` typechecks the whole project graph; one broken export in `packages/ui` fails every consumer.
* Expo generates route types under `.expo/types` when typed routes are enabled - include that path in `tsconfig.json`.
* ESLint catches patterns (`react-hooks/exhaustive-deps`); TypeScript catches impossible types - both belong in quality gates.

### Strict Flags at a Glance

| Option | What it catches in RN apps |
| --- | --- |
| `strictNullChecks` | Undefined route params, optional API fields, `user?.name` gaps |
| `noImplicitAny` | Untyped event handlers, `fetch` results, legacy `.js` imports |
| `noUncheckedIndexedAccess` | `array[i]` and `record[key]` without guards |
| `noImplicitReturns` | Screen components that sometimes return `undefined` instead of `null` |
| `verbatimModuleSyntax` | Value/type import mix-ups that confuse Metro tree-shaking |
| `exactOptionalPropertyTypes` | Distinguishes "missing" vs "explicitly undefined" props - strict; optional |

### Incremental Enablement

```json
// Phase 1 - highest ROI per error fixed (brownfield)
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "allowJs": true,
    "strict": false,
    "strictNullChecks": true,
    "skipLibCheck": true
  },
  "include": ["**/*.ts", "**/*.tsx", "**/*.js", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

```json
// Phase 2 - flip the umbrella when Phase 1 is clean
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

| Phase | Enable | Stop when |
| --- | --- | --- |
| 1 | `strictNullChecks` | `tsc` errors trend to zero in `app/` and `lib/` |
| 2 | `noImplicitAny` | Legacy `.js` is migrated or shimmed |
| 3 | `strict: true` | Remaining individual strict flags are clean |
| 4 | `noUncheckedIndexedAccess` | Indexed access sites have guards or helpers |

### TypeScript Notes

```tsx
// Prefer import type for types-only - verbatimModuleSyntax enforces clarity
import type { Order } from "@/lib/api/orders";
import { fetchOrder } from "@/lib/api/orders";
 
// StyleProp<ViewStyle> for components accepting style overrides
import type { StyleProp, ViewStyle } from "react-native";
 
interface CardProps {
  title: string;
  style?: StyleProp<ViewStyle>;
}
```

```ts
// Temporary suppression - prefer @ts-expect-error with a ticket over @ts-ignore
// @ts-expect-error RN-204 - LegacyDeviceModule untyped until bridge wrapper lands
const reading = NativeModules.LegacyDeviceModule.getLastReading();
```

## Gotchas

* **Disabling `strict` to green CI** - The build passes while `any` leaks into navigation and fetch layers. **Fix:** Fix boundaries first; use `@ts-expect-error` with ticket IDs for known legacy gaps.
* **`noUncheckedIndexedAccess` noise on safe indexes** - Every `items[0]` becomes `T | undefined`. **Fix:** Narrow with `if (item)`, use `.at(0)` with a guard, or a small `function first<T>(arr: T[]): T | undefined` helper - avoid blanket `!` assertions.
* **Untyped `useLocalSearchParams()`** - Deep links deliver strings; missing keys become `undefined` at runtime. **Fix:** Parse params in one function per screen; throw or redirect when required keys are absent.
* **`skipLibCheck: false` during SDK upgrades** - Conflicts inside `@types/react` and RN typings block merges unrelated to your code. **Fix:** Keep `skipLibCheck: true` (Expo default) unless you maintain custom DefinitelyTyped forks.
* **`tsc` not seeing Expo Router types** - Generated files live under `.expo/types`. **Fix:** Add `.expo/types/**/*.ts` to `include` and run `npx expo customize tsconfig.json` after enabling typed routes.
* **Type-aware ESLint rules without `parserOptions.project`** - Rules like `@typescript-eslint/no-floating-promises` silently skip or error. **Fix:** Point ESLint at `tsconfig.json` or run those rules only in a dedicated CI job.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| JavaScript + JSDoc `@ts-check` | Tiny Expo module or config-only package | App code with navigation, async storage, and API layers |
| `strict: false` + Zod only at runtime | Prototyping with heavy `any` tolerance | You need compile-time guarantees on refactors |
| [Gradual Typing in Brownfield Apps](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/gradual-typing-in-brownfield-apps/) | Large `.js` codebase mid-migration | Greenfield SDK 57 app - start strict immediately |
| Flow or PropTypes | Legacy RN codebase already on Flow | New Expo TypeScript project - TS is the default template |

## FAQs

Does Expo SDK 57 enable strict mode by default?

* The `blank-typescript` and `default@sdk-57` templates extend `expo/tsconfig.base` with `strict: true`.
* Verify your `tsconfig.json` after ejecting or merging branches - brownfield apps often ship with `strict: false`.

What is the difference between strict and noUncheckedIndexedAccess?

* `strict` is an umbrella of eight compiler options.
* `noUncheckedIndexedAccess` is separate - array and index-signature access becomes `T | undefined`.
* Enable it when you want safer list and map access in screens and reducers.

Should I run tsc or rely on expo lint?

* `expo lint` runs ESLint - fast, per-file, great for hooks and imports.
* `tsc --noEmit` validates the whole type graph - catches broken exports across packages.
* Run both in CI; they overlap minimally.

How do I enable strict mode incrementally?

1. Turn on `strictNullChecks` only.
2. Fix errors folder by folder (`lib/`, then `app/`).
3. Enable `noImplicitAny`, then `strict: true`.
4. Add `noUncheckedIndexedAccess` last.

See [Gradual Typing in Brownfield Apps](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/gradual-typing-in-brownfield-apps/).

Gotcha: Why do I get errors after adding typed Expo Router routes?

* Typed routes generate `.expo/types/router.d.ts`.
* Without that path in `include`, param types stay `string | string[]`.
* Run `npx expo start` once to regenerate types, then `tsc --noEmit`.

Does strict mode slow Metro?

* Typechecking is separate from Metro bundling - `tsc` runs in CI and editor, not on every fast refresh.
* Type-aware ESLint rules are slower; keep them in CI if editor performance suffers.

When should I use @ts-expect-error vs any?

* `@ts-expect-error` on the **next line** with a ticket comment - fails when the error is fixed (good).
* `any` propagates and disables checking downstream (bad).
* Prefer typed wrappers around native modules instead of either when possible.

How do TextInput strings interact with strict typing?

* `TextInput` values are always `string`.
* Use `z.coerce.number()` or explicit `parseInt` before numeric comparison.
* See [Validation with Zod](https://docs.wahwei/reactnative.codeguides.io/forms-input/validation-with-zod/).

Is exactOptionalPropertyTypes worth enabling?

* It breaks `{ foo?: string }` assignments of `undefined` unless types distinguish missing vs undefined.
* Most RN apps skip it - enable only if your API models require that distinction.

What belongs in include for an Expo Router app?

```json
"include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
```

* Add `**/*.js` only during brownfield migration with `allowJs: true`.

Can monorepo packages share one strict tsconfig?

* Yes - `packages/typescript-config/base.json` extended by `apps/mobile` and `packages/ui`.
* See [Monorepo with Turborepo](https://docs.wahwei/reactnative.codeguides.io/project-setup/monorepo-with-turborepo/).

Which ESLint rules complement strict tsconfig?

```js
"@typescript-eslint/no-floating-promises": "error",
"@typescript-eslint/no-misused-promises": "error",
"react-hooks/exhaustive-deps": "warn",
```

* Type-aware `@typescript-eslint/*` rules need `parserOptions.project` pointing at your `tsconfig.json`.

## Related

* [TypeScript in RN Basics](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typescript-in-rn-basics/) - first strict tsconfig and component prop patterns
* [Gradual Typing in Brownfield Apps](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/gradual-typing-in-brownfield-apps/) - incremental strictness without a feature freeze
* [Typing API Responses & Zod](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-api-responses-and-zod/) - `unknown` in, typed `Order` out
* [Expo Router Typed Routes](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/expo-router-typed-routes/) - generated `.expo/types` param safety
* [CI Quality Gates](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/ci-quality-gates/) - run `typecheck` on every PR
* [Prettier & Import Sorting](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/prettier-and-import-sorting/) - separate formatting from type errors

> **Stack versions:** This page was written for **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**.

Reviewed by Chris St. John·Last updated Jul 16, 2026
