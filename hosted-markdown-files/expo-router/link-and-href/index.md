# Link & href

Declarative navigation and prefetch-friendly links. `Link` maps to anchor-like navigation on web and accessible press targets on native - `router` handles imperative flows after side effects.

Highlights / Link & href

* Link is the default navigation primitive - it preserves accessibility and web-like href semantics
* href accepts strings or objects with pathname and params - prefer objects for dynamic routes
* router.push, replace, and back are imperative - use after mutations and auth redirects
* Link prefetch loads lazy routes early - valuable for heavy tab screens and detail views
* asChild merges Link behavior into Pressable or custom components without wrapper views
* Centralize href builders in routes.ts - features import orderDetailHref(id) not raw strings

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import { Link, router, type Href } from "expo-router";
import { Pressable, Text, View } from "react-native";
 
// String href - static paths only
<Link href="/settings">Settings</Link>
 
// Object href - dynamic segments (preferred)
<Link href={{ pathname: "/orders/[id]", params: { id: "42" } }}>
  Order 42
</Link>
 
// Imperative after mutation
router.replace("/(tabs)");
 
// Prefetch on hover/focus (web) or manually
<Link href="/orders" prefetch />
```

```ts
// src/navigation/routes.ts
import type { Href } from "expo-router";
 
export const routes = {
  home: "/" as Href,
  settings: "/settings" as Href,
  orderDetail: (id: string): Href => ({
    pathname: "/orders/[id]",
    params: { id },
  }),
};
```

**When to reach for this:**

* **`Link`** - list rows, inline text links, tab-adjacent navigation, SEO-friendly web anchors
* **`router.push`** - navigate after form submit, scan QR, or timer callback
* **`router.replace`** - post-login, post-logout, onboarding completion
* **`prefetch`** - screens with heavy bundles or slow data waterfalls

## Working Example

List screen with `Link`, custom `Pressable` via `asChild`, imperative navigation, and centralized href builders.

```ts
// src/navigation/routes.ts
import type { Href } from "expo-router";
 
export function orderDetailHref(id: string): Href {
  return { pathname: "/orders/[id]", params: { id } };
}
 
export function settingsHref(): Href {
  return "/settings";
}
```

```tsx
// features/orders/ui/OrdersListScreen.tsx
import { Link, router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { orderDetailHref } from "@/navigation/routes";
 
const ORDERS = [
  { id: "101", label: "Widget shipment" },
  { id: "102", label: "Replacement part" },
];
 
export function OrdersListScreen() {
  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      {ORDERS.map((order) => (
        <Link key={order.id} href={orderDetailHref(order.id)} prefetch asChild>
          <Pressable style={{ padding: 12, backgroundColor: "#f1f5f9", borderRadius: 8 }}>
            <Text>{order.label}</Text>
          </Pressable>
        </Link>
      ))}
 
      <Link href="/settings">Account settings</Link>
 
      <Pressable
        onPress={() => router.push(orderDetailHref("draft"))}
        accessibilityRole="button"
      >
        <Text>Create draft (imperative)</Text>
      </Pressable>
    </View>
  );
}
```

```tsx
// After successful form submit - replace avoids back stack to form
import { router } from "expo-router";
 
async function onSubmit() {
  await saveProfile();
  router.replace("/(tabs)/profile");
}
```

```tsx
// Dismiss modal flow
import { router } from "expo-router";
 
function closeModal() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace("/");
  }
}
```

## Deep Dive

### `href` shapes

| Form | Example | Typed routes |
| --- | --- | --- |
| String path | `"/settings"` | Static routes |
| Object | `{ pathname: "/orders/[id]", params: { id } }` | Dynamic routes |
| Relative | `"./details"` | Sibling within folder |
| External | `"https://expo.dev"` | Opens browser / external app |

```tsx
// Relative navigation within app/orders/
<Link href="./[id]" params={{ id: "5" }}>Relative</Link>
```

* **Params are always strings** when parsed from URLs - coerce numbers in the screen
* **Query params** - `href="/search?q=shoes"` or `params: { q: "shoes" }` depending on route shape
* Enable **typed routes** so invalid `pathname` values fail at compile time - see [Typed Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router/typed-routes/)

### `Link` vs `router`

| API | Style | Best for |
| --- | --- | --- |
| `<Link href>` | Declarative | Lists, inline navigation, prefetch |
| `router.push` | Imperative | Post-async, programmatic redirects |
| `router.replace` | Imperative | Auth transitions, no back |
| `router.back` | Imperative | Cancel, modal dismiss |
| `router.navigate` | Imperative | Go to route if exists, else push (web-like) |

```tsx
// Link props that matter in production
<Link
  href="/orders"
  prefetch                    // preload route module
  replace                     // replace history instead of push
  push                        // force push even when replace might default
  asChild                     // merge into child Pressable
  disabled={!isReady}
/>
```

### Prefetch behavior

* **`prefetch` on `Link`** - Expo Router loads the target route's JavaScript bundle ahead of navigation
* Most impactful for **lazy tabs** and **heavy screens** with large dependency trees
* On web, prefetch may hook **focus/hover** depending on version - verify in your target SDK
* Do not prefetch **auth-gated** routes before session is known - wasted bandwidth and flicker

### `asChild` pattern

```tsx
<Link href="/settings" asChild>
  <Pressable style={styles.row}>
    <Text>Settings</Text>
  </Pressable>
</Link>
```

* Child must **forward props** (`onPress`, `href` on web) - use `Pressable` or custom components that spread props
* Avoid nesting **buttons inside buttons** - one pressable per `Link`
* Set **`accessibilityRole="link"`** on web; `Pressable` inherits link behavior from `Link`

### Centralized href builders

```ts
// packages/navigation/src/hrefs.ts (monorepo)
export const orderDetailHref = (id: string) =>
  ({ pathname: "/orders/[id]", params: { id } }) as const;
```

* One module prevents **typo drift** across features
* White-label apps share **`packages/navigation`** when route shapes match
* Pair with **Zod** validating params at screen entry - href builders do not validate runtime input

## Gotchas

* **String concatenation for dynamic paths** - `href={'/orders/' + id}` bypasses typed routes and breaks when segments change. **Fix:** Object form or `orderDetailHref(id)`.
* **`router.push` after login** - back gesture returns to login. **Fix:** `router.replace`.
* **`Link` wrapping non-forwarding components** - custom rows ignore press. **Fix:** `asChild` + spread props, or use `Pressable`.
* **External URLs in `router.push`** - may not open browser. **Fix:** `import { openURL } from "expo-linking"` for `https://` links.
* **Prefetching protected routes** - flashes unauthorized content. **Fix:** Gate prefetch behind session check or skip on auth screens.
* **Missing `accessibilityRole` on imperative Pressable** - screen readers announce "button" for navigation. **Fix:** `accessibilityRole="link"` or prefer `Link`.
* **Huge param payloads in href** - navigation state bloat, logs leak data. **Fix:** Pass IDs only; load bodies from store or API.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `<Link href>` | Default list/inline navigation | After async mutation before navigate |
| `router.push` / `replace` | Imperative control | You need prefetch and link semantics |
| `useNavigation().navigate` | React Navigation escape hatch | Standard Expo Router paths exist |
| `Redirect` component | Declarative auth gate in layout | Button-triggered navigation |
| Deep link URL manually | Push notifications payload | In-app taps - use typed href |
| `href` string | Quick prototypes | Production dynamic routes |

## FAQs

When should I use Link vs router.push?

* **`Link`** for user-tappable UI that navigates to a known route.
* **`router.push`** after async work completes (save, scan, permission grant).
* **`router.replace`** when back should not return to the current screen.

How do I navigate with query parameters?

```tsx
router.push({ pathname: "/search", params: { q: "shoes", sort: "price" } });
```

Read with `useLocalSearchParams()`. Prefer path segments for entity IDs; query for filters.

Does Link work on web?

Yes - `Link` renders an anchor on web with client-side navigation. String `href` values improve crawlability for public web builds.

How do I disable a Link?

```tsx
<Link href="/checkout" disabled={!cartReady} asChild>
  <Pressable disabled={!cartReady}>
    <Text>Checkout</Text>
  </Pressable>
</Link>
```

Set `disabled` on both `Link` and child when using `asChild`.

What is router.canGoBack()?

Returns whether the stack has a prior screen. Use before `router.back()` in modals opened via deep link - fall back to `router.replace("/")`.

How do I open an external URL?

```tsx
import * as Linking from "expo-linking";
 
await Linking.openURL("https://docs.expo.dev/router/introduction/");
```

Do not pass external URLs to `router.push` unless you've configured external linking handlers.

Can I prefetch programmatically?

Prefer `<Link prefetch />`. For advanced cases, consult Expo Router SDK 57 docs for `prefetch` utilities on the router instance - availability evolves per minor release.

How do relative hrefs work?

`./[id]` resolves relative to the current route's directory - useful inside `app/orders/` siblings. Prefer absolute builders in shared modules for clarity.

Should I use router.navigate vs push?

`navigate` deduplicates if the route is already focused (web-like). `push` always adds a stack entry. Use `push` for intentional duplicate detail stacks; `navigate` for tab-like behavior.

How do href builders work with typed routes?

Return type `Href` from `expo-router`. With `experiments.typedRoutes`, invalid pathnames error at compile time. See [Typed Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router/typed-routes/).

## Related

* [Typed Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router/typed-routes/) - compile-time `Href` safety
* [Redirects & Index Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router/redirects-and-index-routes/) - `Redirect` vs `router.replace`
* [Stack Navigation](https://docs.wahwei/reactnative.codeguides.io/expo-router/stack-navigation/) - back stack behavior
* [Expo Router Basics](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/) - route file layout
* [../expo-rules/navigation-and-routing-rules/navigation-and-routing-rules.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/navigation-and-routing-rules/) - `Link` vs imperative rules
* [../architecture-design/adr-navigation-library-choice/adr-navigation-library-choice.md](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-navigation-library-choice/) - deep linking rationale

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

49454e4f4d5f434e4f5904434556494d4345131d1956181a181c1a1d

Reviewed by Chris St. John·Last updated Jul 19, 2026
