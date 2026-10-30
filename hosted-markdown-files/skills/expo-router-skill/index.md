# Expo Router Skill

Route scaffolding, typed params, and deep-link wiring - an **Agent Skill** for adding screens safely on **Expo Router** with **Expo SDK 57** file-based routing.

Highlights / Expo Router Skill

* Skill scaffolds app/ files, typed Href builders, and scheme-based deep links for SDK 57
* experiments.typedRoutes: true is mandatory output - run tsc --noEmit to verify
* Dynamic routes use object hrefs with pathname + params - never raw string interpolation
* Deep links require scheme in app.config.ts plus optional universal links host
* Validate runtime URL params with Zod - generated types do not prove deep-link input
* Delegate navigation concepts to expo-router section docs - skill produces file tree + code

## What This Skill Does

Generates:

* `app/` route file tree (layouts, index, dynamic segments)
* `experiments.typedRoutes` config and href builder modules
* Deep link / universal link wiring in `app.config.ts`
* `tsc --noEmit` verification steps

## When to Invoke

* New feature needs routes under `app/` (tabs, stacks, modals)
* Adding dynamic route `/orders/[id]` with typed navigation
* Wiring `myapp://` or `https://` deep links to existing screens
* Refactoring string `router.push` calls to centralized `Href` builders
* Post-auth redirects and protected route groups

## Inputs

| Input | Why |
| --- | --- |
| Route map | Paths, groups `(auth)`, tab vs stack |
| Param shapes | `{ id: string }`, optional query fields |
| `app.config.ts` | `scheme`, `ios.bundleIdentifier`, linking |
| Existing `app/` tree | Avoid duplicate layouts |
| Deep link examples | `myapp://orders/42`, notification payloads |

## Outputs

* File tree diff (`app/...`)
* `app.config.ts` linking snippet
* `src/navigation/hrefs.ts` (or `routes.ts`) with typed builders
* Screen param validation stub (Zod)
* Commands: `npx expo start`, `npx tsc --noEmit`

## Guardrails

1. **Enable `experiments.typedRoutes: true`** - regenerate types after every `app/` change ([Typed Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router/typed-routes/)).
2. **Dynamic routes use object `href`** - `{ pathname: "/orders/[id]", params: { id } }`.
3. **Validate runtime params** - types don't prove malicious deep-link input.
4. **Keep routes thin** - re-export feature screens from `src/features/` ([Mobile Architecture Basics](https://docs.wahwei/reactnative.codeguides.io/architecture-design/mobile-architecture-basics/)).
5. **Don't nest duplicate `_layout` providers** - one auth/session boundary at root.
6. **Test deep links on dev build** - Expo Go scheme handling differs from production.

## Recipe

> Quick-reference recipe card - copy-paste ready.

```ts
// app.config.ts
export default {
  scheme: "myapp",
  experiments: { typedRoutes: true },
} satisfies import("expo/config").ExpoConfig;
```

```tsx
// app/orders/[id].tsx
import { useLocalSearchParams } from "expo-router";
import { z } from "zod";
 
const paramsSchema = z.object({ id: z.string().min(1) });
 
export default function OrderDetailScreen() {
  const raw = useLocalSearchParams<{ id: string }>();
  const { id } = paramsSchema.parse(raw);
  // ...
}
```

```ts
// src/navigation/hrefs.ts
import type { Href } from "expo-router";
 
export const orderDetailHref = (id: string): Href => ({
  pathname: "/orders/[id]",
  params: { id },
});
```

```tsx
// Usage
import { Link, router } from "expo-router";
import { orderDetailHref } from "@/navigation/hrefs";
 
<Link href={orderDetailHref("42")}>Order 42</Link>
router.push(orderDetailHref("42"));
```

```bash
npx expo start    # regen .expo/types/router.d.ts
npx tsc --noEmit  # catch invalid href at compile time
```

**When to reach for this skill:**

* Product asks for three new screens with cross-links and shareable URLs
* Push notification payload maps to a route - need deep link wiring
* TypeScript CI fails after `app/` restructure

---

## Working Example

### 1. Scaffold route group

```text
app/
├── _layout.tsx           # root Stack or Slot
├── (tabs)/
│   ├── _layout.tsx
│   ├── index.tsx
│   └── orders/
│       ├── index.tsx
│       └── [id].tsx
└── (auth)/
    ├── _layout.tsx
    └── login.tsx
```

* Route groups `(tabs)` don't appear in URL - [Route Groups](https://docs.wahwei/reactnative.codeguides.io/expo-router/route-groups-and-organizing-app/)
* Tab layout: [Tabs & Drawers](https://docs.wahwei/reactnative.codeguides.io/expo-router/tabs-and-drawers/)

### 2. Root layout (auth gate sketch)

```tsx
// app/_layout.tsx
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { useSession } from "@/features/auth/session";
 
export default function RootLayout() {
  const { session, isLoading } = useSession();
  const segments = useSegments();
  const router = useRouter();
 
  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === "(auth)";
    if (!session && !inAuth) router.replace("/(auth)/login");
    if (session && inAuth) router.replace("/(tabs)");
  }, [session, isLoading, segments]);
 
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

* Advanced patterns: [Protected Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router-advanced/protected-routes-and-middleware/)

### 3. Deep links

```ts
// app.config.ts
export default {
  scheme: "myapp",
  ios: { bundleIdentifier: "com.example.myapp" },
  android: { package: "com.example.myapp" },
  // Optional universal links:
  // ios: { associatedDomains: ["applinks:myapp.com"] },
} satisfies import("expo/config").ExpoConfig;
```

| URL | Resolves to |
| --- | --- |
| `myapp://orders/42` | `app/orders/[id].tsx` with `id=42` |
| `myapp://(tabs)/orders` | orders list |

* Declarative links: [Link & href](https://docs.wahwei/reactnative.codeguides.io/expo-router/link-and-href/)
* Imperative after mutation: `router.replace("/(tabs)")` post-login

### 4. Verify

```bash
npx expo start
npx tsc --noEmit
 
# iOS simulator deep link test
xcrun simctl openurl booted "myapp://orders/42"
```

---

## Example Invocation Prompts

```text
Use Expo Router skill. SDK 57, typedRoutes on.
Add /settings/notifications and /settings/profile under (tabs).
Provide href builders and tsc verification. Routes thin - screens live in src/features/settings/.
```

```text
Use Expo Router skill.
Deep link: myapp://orders/[id] from push payload { orderId }.
Map to typed route, Zod validate id, document simctl test command.
```

```text
Use Expo Router skill.
Migrate router.push("/order/" + id) calls to centralized Href module.
List every file to touch and tsc gate.
```

---

## Skill Output Checklist

```markdown
- [ ] app/ tree documented
- [ ] experiments.typedRoutes: true in app.config.ts
- [ ] href builders exported from single module
- [ ] Zod (or equivalent) on dynamic params
- [ ] scheme / associatedDomains if deep links required
- [ ] npx tsc --noEmit in verification section
- [ ] No business logic duplicated in route files
```

---

## FAQs

Should the skill generate modal routes?

Yes when requested - use `presentation: "modal"` in layout options. See [Modal Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router-advanced/modal-and-presentation-routes/) for SDK 57 presentation patterns.

Does typedRoutes catch invalid optional params?

Partially. Generated `Href` unions cover pathnames; optional search params still need runtime validation at screen entry.

Web vs native href differences?

Skill should use `expo-router` `Href` type - works on web and native. Platform-specific linking config belongs in `app.config.ts` only.

## Related

* [Expo Router Basics](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/) - file-based routing intro
* [Typed Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router/typed-routes/) - generated `Href` unions
* [Link & href](https://docs.wahwei/reactnative.codeguides.io/expo-router/link-and-href/) - Link vs router
* [Stack Navigation](https://docs.wahwei/reactnative.codeguides.io/expo-router/stack-navigation/) - stack layouts
* [Redirects & Index Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router/redirects-and-index-routes/) - index and redirect patterns
* [Agent Skills Basics](https://docs.wahwei/reactnative.codeguides.io/skills/agent-skills-basics/) - when to invoke skills

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
