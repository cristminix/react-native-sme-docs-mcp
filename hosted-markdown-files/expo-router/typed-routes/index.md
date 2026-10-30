# Typed Routes

Generated types and safe param passing between screens. Typed routes turn your `app/` filesystem into a TypeScript `Href` union - invalid paths fail `tsc` before they ship.

Highlights / Typed Routes

* experiments.typedRoutes: true generates .expo/types/router.d.ts from your app/ tree
* Href and Route types catch invalid pathnames at compile time - not at runtime in production
* Dynamic routes require params objects - /orders/[id] needs { id: string } in the href
* Run tsc --noEmit in CI after every app/ restructure - generated types drift silently otherwise
* Central href builders return Href - one typo fix updates every callsite
* Validate URL params with Zod at screen entry - types do not prove runtime deep-link input

## Recipe

> Quick-reference recipe card - copy-paste ready.

```ts
// app.config.ts
export default {
  experiments: {
    typedRoutes: true,
  },
} satisfies import("expo/config").ExpoConfig;
```

```bash
# Regenerate types after adding routes
npx expo start
# or
npm run typecheck   # tsc --noEmit
```

```tsx
import { Link, router, type Href } from "expo-router";
 
// ✅ Static route - string href
const settings: Href = "/settings";
 
// ✅ Dynamic route - object with params
const order: Href = { pathname: "/orders/[id]", params: { id: "42" } };
 
<Link href={order}>Open order</Link>
router.push(order);
```

```ts
// src/navigation/hrefs.ts
import type { Href } from "expo-router";
 
export const orderDetailHref = (id: string): Href => ({
  pathname: "/orders/[id]",
  params: { id },
});
```

**When to reach for this:**

* Any production app with **more than ~10 routes**
* Teams using **`router.push` in hooks** - typos are invisible at runtime
* **Monorepos** sharing navigation helpers across white-label apps
* CI pipelines that already run **`tsc --noEmit`**

## Working Example

Enable typed routes, define href builders, consume in screens, and validate runtime params.

```ts
// app.config.ts
import type { ExpoConfig, ConfigContext } from "expo/config";
 
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "TypedRoutesApp",
  slug: "typed-routes-app",
  experiments: {
    typedRoutes: true,
  },
});
```

```text
app/
├── _layout.tsx
├── settings.tsx
└── orders/
    ├── index.tsx
    └── [id].tsx
```

```ts
// src/navigation/hrefs.ts
import type { Href } from "expo-router";
 
export const hrefs = {
  settings: "/settings" as Href,
  orders: "/orders" as Href,
  orderDetail: (id: string): Href => ({
    pathname: "/orders/[id]",
    params: { id },
  }),
} as const;
```

```tsx
// features/orders/ui/OrdersListScreen.tsx
import { Link } from "expo-router";
import { Text, View } from "react-native";
import { hrefs } from "@/navigation/hrefs";
 
export function OrdersListScreen() {
  return (
    <View style={{ padding: 16 }}>
      <Link href={hrefs.orderDetail("99")}>
        <Text>Order 99</Text>
      </Link>
    </View>
  );
}
```

```tsx
// features/orders/ui/OrderDetailScreen.tsx
import { useLocalSearchParams } from "expo-router";
import { z } from "zod";
import { Text, View } from "react-native";
 
const paramsSchema = z.object({
  id: z.string().min(1),
});
 
export function OrderDetailScreen() {
  const raw = useLocalSearchParams();
  const parsed = paramsSchema.safeParse(raw);
 
  if (!parsed.success) {
    return (
      <View style={{ padding: 16 }}>
        <Text>Invalid order link</Text>
      </View>
    );
  }
 
  const { id } = parsed.data;
 
  return (
    <View style={{ padding: 16 }}>
      <Text>Order {id}</Text>
    </View>
  );
}
```

```tsx
// Compile-time failure examples (do not ship):
// router.push("/orders");           // ❌ missing params for [id] route
// router.push("/settigns");          // ❌ typo in static path
// <Link href="/unknown" />          // ❌ route does not exist in app/
```

## Deep Dive

### Generated types location

```text
.expo/types/router.d.ts    # Auto-generated - do not hand-edit
```

* Types regenerate when **Metro starts** or when Expo CLI scans `app/`
* **Commit or gitignore?** - gitignore `.expo/`; CI runs `expo start` or `npx expo customize tsconfig` flow so types exist before `tsc`
* `tsconfig.json` should include Expo's types:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts"]
}
```

### Core types

| Type | Purpose |
| --- | --- |
| `Href` | Union of all valid `href` values for `Link` and `router` |
| `Href<T>` | Narrow href for a specific route |
| Route path strings | Literal union of static segments |

```tsx
import type { Href } from "expo-router";
 
function navigate(href: Href) {
  router.push(href);
}
```

### Dynamic segment typing

```text
app/users/[userId]/posts/[postId].tsx
```

```tsx
const href: Href = {
  pathname: "/users/[userId]/posts/[postId]",
  params: { userId: "1", postId: "9" },
};
```

* **All dynamic params required** in the object - partial params fail `tsc`
* **Optional search params** follow the generated shape for your route - consult generated `router.d.ts` when unsure
* **Catch-all routes** `[...slug].tsx` generate array or string param types depending on configuration

### Runtime vs compile-time safety

```text
Compile-time (typed routes):     Developer typos in router.push / Link
Runtime (Zod):                 Deep links, push notifications, malformed URLs
```

Typed routes **do not validate** external input - always parse `useLocalSearchParams()` before fetching.

### CI checklist

```bash
npx expo customize tsconfig.json   # first-time setup if needed
npx expo start --non-interactive & # generate .expo/types
sleep 5
npm run typecheck
```

Add to PR checks when `app/` changes - route renames without updated hrefs break builds loudly (desired).

## Gotchas

* **Types stale after rename** - `tsc` passes locally with old `.expo/types` until Metro restarts. **Fix:** Restart dev server or run typecheck in CI fresh each time.
* **Assuming types validate notification payloads** - push opens `/orders/abc` with extra query junk. **Fix:** Zod at screen boundary.
* **String interpolation bypasses checks** - `router.push(\`/orders/${id}` as Href)`defeats the system. **Fix:** Object href builders without`as Href` casts.
* **Monorepo app path not scanned** - types generated for wrong workspace root. **Fix:** Run Expo CLI from the app package directory.
* **Missing `experiments.typedRoutes`** - `Href` widens to `string`. **Fix:** Enable in `app.config.ts` on day one.
* **Shared package imports app types** - coupling the wrong direction. **Fix:** `packages/navigation` exports builders; app owns generated types.
* **Route groups in pathname** - typed hrefs use **URL paths**, not `(tabs)` group names. **Fix:** `/settings` not `/(tabs)/settings` in href objects.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `experiments.typedRoutes` | Expo Router apps on SDK 57 | Non-Expo React Navigation codebases |
| Manual `routes.ts` const object | Tiny apps (<8 routes) | Fast-growing `app/` trees |
| Zod-only validation | Untyped brownfield | Greenfield - add typed routes too |
| Codegen from OpenAPI paths | Backend-driven web parity | Mobile-first file-based routing |
| ESLint `no-restricted-syntax` on string push | Enforcing migration | You have typed routes enabled already |

## FAQs

How do I enable typed routes?

```ts
// app.config.ts
experiments: { typedRoutes: true }
```

Restart Metro. Confirm `.expo/types/router.d.ts` exists. Run `tsc --noEmit`.

Where are types generated?

`.expo/types/router.d.ts` - auto-generated from files in `app/`. Do not edit manually; restart the dev server after route changes.

Why does tsc fail after adding a route?

Generated types updated - existing string hrefs may now be invalid. Update callsites to use the new path or add missing `params` for dynamic segments.

Do typed routes work with route groups?

Yes - groups like `(tabs)` are omitted from URL types. `/settings` is valid; `/(tabs)/settings` is typically not in the `Href` union.

How do I type useLocalSearchParams?

```tsx
const { id } = useLocalSearchParams<{ id: string }>();
```

Generated types may also export route-specific param maps - inspect `router.d.ts`. Still validate with Zod for external entry points.

Can I use typed routes in a monorepo?

Yes - run type generation per app package (`apps/mobile`). Share **href builder functions** from `packages/navigation`; each app validates against its own `app/` tree.

What about catch-all routes?

`app/docs/[...slug].tsx` generates href types requiring `slug` - often `string | string[]`. Test deep links with multiple segments in Maestro smoke flows.

Should I cast string paths as Href?

Avoid `as Href` casts - they silence real errors. Fix the path or use object form with required params.

Do typed routes affect runtime bundle size?

No - types are compile-time only. Zero production JS cost.

How do href builders interact with features?

Features import `orderDetailHref` from `@/navigation/hrefs` - never import from `.expo/types` directly. The builder return type is `Href`.

## Related

* [Link & href](https://docs.wahwei/reactnative.codeguides.io/expo-router/link-and-href/) - `Link`, `router`, and prefetch
* [Expo Router Basics](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/) - dynamic `[id]` segments
* [Redirects & Index Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router/redirects-and-index-routes/) - typed `Redirect href`
* [../expo-rules/navigation-and-routing-rules/navigation-and-routing-rules.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/navigation-and-routing-rules/) - Tier 2 typed route rules
* [../project-setup/project-setup-basics/project-setup-basics.md](https://docs.wahwei/reactnative.codeguides.io/project-setup/project-setup-basics/) - `tsc --noEmit` in CI
* [../architecture-design/feature-sliced-design-for-rn/feature-sliced-design-for-rn.md](https://docs.wahwei/reactnative.codeguides.io/architecture-design/feature-sliced-design-for-rn/) - navigation helpers in shared layer

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
