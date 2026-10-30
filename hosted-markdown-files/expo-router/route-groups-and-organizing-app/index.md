# Route Groups & Organizing `app/`

`(auth)`, `(tabs)`, and private folder conventions. Route groups keep large `app/` trees navigable without polluting URLs or deep-link paths.

Highlights / Route Groups & Organizing `app/`

* Parentheses folders are route groups - they organize files without adding URL segments
* (auth), (app), (tabs), and (modals) are the four groups most production apps need
* Leading underscore marks private files - \_components/ is not a route
* Multiple groups at the same level compose URLs from non-group segments only
* Split auth and app shells with separate \_layout.tsx files per group
* Mirror features/ in src/ - app/ stays a thin routing map, not a feature dump

## Recipe

> Quick-reference recipe card - copy-paste ready.

```text
app/
├── _layout.tsx                 # Root providers + top navigator
├── index.tsx                   # Entry redirect hub
├── (auth)/
│   ├── _layout.tsx             # Auth stack (no header)
│   ├── login.tsx               # /login
│   └── register.tsx            # /register
├── (app)/
│   ├── _layout.tsx             # Authenticated guard shell
│   └── (tabs)/
│       ├── _layout.tsx
│       ├── index.tsx           # /
│       └── settings.tsx        # /settings
├── (modals)/
│   ├── _layout.tsx             # presentation: modal
│   └── compose.tsx             # /compose
└── _components/                # Private - NOT a route
    └── ScreenChrome.tsx
```

```tsx
// app/(app)/_layout.tsx - minimal auth shell
import { Redirect, Stack } from "expo-router";
import { useSession } from "@/features/auth";
 
export default function AppShellLayout() {
  const { session, isLoading } = useSession();
 
  if (isLoading) return null;
  if (!session) return <Redirect href="/login" />;
 
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

**When to reach for this:**

* Separating **auth** vs **authenticated** flows with different layouts
* Grouping **modals** for shared `presentation: "modal"` options
* Organizing **tabs** without `/tabs` in every URL
* Colocating **non-route helpers** in `_components/` next to layouts

## Working Example

A production-shaped tree with auth group, app shell, tabs, modals, and private folders.

```tsx
// app/_layout.tsx
import { Stack } from "expo-router";
import { AppProviders } from "@/app-providers";
 
export default function RootLayout() {
  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="(modals)" options={{ presentation: "modal" }} />
      </Stack>
    </AppProviders>
  );
}
```

```tsx
// app/(auth)/_layout.tsx
import { Stack } from "expo-router";
 
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
```

```tsx
// app/(modals)/_layout.tsx
import { Stack } from "expo-router";
 
export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: "modal",
        headerShown: true,
      }}
    />
  );
}
```

```tsx
// app/(app)/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
 
export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
```

```tsx
// app/_components/LoadingGate.tsx - import from layouts; never routed
import { ActivityIndicator, View } from "react-native";
 
export function LoadingGate() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator />
    </View>
  );
}
```

```text
URL map (groups omitted from path):
 
/login           → (auth)/login.tsx
/register        → (auth)/register.tsx
/                → (app)/(tabs)/index.tsx
/settings        → (app)/(tabs)/settings.tsx
/compose         → (modals)/compose.tsx
```

## Deep Dive

### Route group syntax

| Pattern | URL impact | Purpose |
| --- | --- | --- |
| `(auth)/login.tsx` | `/login` | Group name omitted from URL |
| `(tabs)/index.tsx` | `/` | Organize tab files |
| `[id].tsx` | `/:id` | Dynamic segment (not a group) |
| `_layout.tsx` | - | Navigator for folder |
| `_components/` | - | Private folder (underscore prefix) |

* Groups can **nest**: `(app)/(tabs)/` is valid - both names are stripped from the URL
* **Sibling groups** at the same level merge into one route tree - avoid duplicate route names across groups
* **Route groups are not layout groups** - you still need `_layout.tsx` per folder for navigators

### Organizing principles

```text
app/                          features/
├── routing & layouts only    ├── business logic
├── re-exports                ├── hooks & API
├── redirects                 └── UI screens
└── _components/ (private)
```

1. **One concern per group** - `(auth)` for sign-in, `(app)` for signed-in shell, `(modals)` for overlays
2. **Mirror feature names** - `app/(app)/(tabs)/orders/` maps to `features/orders/`
3. **Keep root `index.tsx` thin** - redirect hub only; see [Redirects & Index Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router/redirects-and-index-routes/)
4. **Cap folder depth at 4** - `app/(app)/(tabs)/orders/[id].tsx` is enough; deeper paths signal refactor time

### Private folders and colocation

```text
app/(tabs)/
├── _layout.tsx
├── _components/
│   └── TabIcon.tsx
├── index.tsx
└── profile.tsx
```

* **`_prefix`** marks files/folders **non-routable** - Expo Router ignores them for URL generation
* Colocate layout-only components in `_components/` - do not put them in `features/` unless reused
* **`+html.tsx`**, **`+not-found.tsx`** are special files - learn their roles before customizing web/not-found

### Multiple root groups pattern

```tsx
// app/_layout.tsx - explicit registration prevents ambiguous auto-discovery
<Stack>
  <Stack.Screen name="(auth)" />
  <Stack.Screen name="(app)" />
</Stack>
```

Explicit `<Stack.Screen name="(auth)" />` documents top-level segments for reviewers and keeps screen options centralized.

## Gotchas

* **Duplicate routes across groups** - `(auth)/index.tsx` and `(app)/index.tsx` both map to `/`. **Fix:** Single `app/index.tsx` redirect hub; one group owns `/`.
* **Forgetting group parentheses** - `auth/login.tsx` creates `/auth/login`, breaking marketing links. **Fix:** Rename to `(auth)/login.tsx`.
* **Business logic in `_layout.tsx`** - data fetching in layouts runs on every child navigation. **Fix:** Auth redirect only; screens own data.
* **God `(app)` group** - every screen dumped under one group. **Fix:** Sub-groups `(tabs)`, `(modals)`, feature folders.
* **`_components` without underscore** - `components/Header.tsx` becomes `/components/Header` route. **Fix:** Prefix private folders with `_`.
* **Cross-group `router.push` with wrong path** - pushing `/(app)/settings` includes group in some APIs. **Fix:** Use URL paths `/settings` or typed `Href` objects.
* **Monorepo shared `app/`** - white-label apps diverge in route trees. **Fix:** Separate `apps/brand-a/app/` per binary - see [../project-setup/multiple-apps-in-one-repo/multiple-apps-in-one-repo.md](https://docs.wahwei/reactnative.codeguides.io/project-setup/multiple-apps-in-one-repo/).

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Route groups `(name)` | Organize without URL segments | You need `/auth/login` in the public URL |
| Flat `app/` tree | <10 routes total | Parallel squads editing one folder daily |
| `src/routes` manual React Navigation | Brownfield without file-based routing | New SDK 57 greenfield apps |
| Feature flags for sections | Seasonal tabs | Permanent auth vs app split |
| Separate Expo apps | Truly different products | White-label variants - use config instead |
| Deep folder mirroring org chart | Never recommended | - |

## FAQs

Do parentheses appear in URLs?

No. `(auth)/login.tsx` maps to `/login`, not `/auth/login`. Groups exist purely for filesystem organization and layout boundaries.

Can I nest multiple route groups?

Yes - `app/(app)/(tabs)/(hidden)/` is valid. Each group name is stripped. Avoid unnecessary nesting that obscures the route map.

What is a private folder?

Files and folders starting with `_` (except `_layout.tsx`) are not turned into routes. Use `_components/`, `_hooks/`, etc., for colocated non-route code.

How do groups interact with deep links?

Deep links target **URL paths**, not group names. `/settings` opens `(app)/(tabs)/settings.tsx` regardless of group folders. Configure `scheme` in `app.config.ts` once at the app level.

Should auth and app share a root layout?

Yes - one `app/_layout.tsx` mounts providers for both groups. Split **navigators** per group (`(auth)/_layout`, `(app)/_layout`), not duplicate provider trees.

How do I organize modals?

Create `(modals)/` with its own `_layout.tsx` setting `presentation: "modal"`. Register `(modals)` on the root stack. URLs stay `/compose`, not `/modals/compose`.

Can two groups each have an index route?

Both would resolve to `/` - a conflict. Use a single `app/index.tsx` as the entry redirect instead.

How does this map to Feature-Sliced Design?

`app/` is the FSD **app layer** (routing only). `features/`, `entities/`, `shared/` live outside `app/`. Route groups segment flows; feature slices segment business domains - see [../architecture-design/feature-sliced-design-for-rn/feature-sliced-design-for-rn.md](https://docs.wahwei/reactnative.codeguides.io/architecture-design/feature-sliced-design-for-rn/).

When should URLs include the segment explicitly?

When marketing, SEO (web), or support docs publish the path - e.g. `/pricing` for a public web page. Use normal folders, not groups, when the segment must appear in the URL.

How do I document the route map for new hires?

Maintain a `docs/routes.md` table: URL → file path → feature owner. Update on every new group. Pair with typed routes so TypeScript catches drift.

## Related

* [Expo Router Basics](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/) - file-based routing fundamentals
* [Redirects & Index Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router/redirects-and-index-routes/) - `app/index.tsx` redirect hub
* [Tabs & Drawers](https://docs.wahwei/reactnative.codeguides.io/expo-router/tabs-and-drawers/) - `(tabs)` and `(drawer)` layout patterns
* [Stack Navigation](https://docs.wahwei/reactnative.codeguides.io/expo-router/stack-navigation/) - per-group stack options
* [../architecture-design/feature-sliced-design-for-rn/feature-sliced-design-for-rn.md](https://docs.wahwei/reactnative.codeguides.io/architecture-design/feature-sliced-design-for-rn/) - feature boundaries vs `app/`
* [../expo-rules/navigation-and-routing-rules/navigation-and-routing-rules.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/navigation-and-routing-rules/) - structure review checklist

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
