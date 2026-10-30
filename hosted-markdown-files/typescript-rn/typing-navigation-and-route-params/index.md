# Typing Navigation & Route Params

Expo Router can generate static route types from your `app/` file tree, giving `<Link>`, `router.push`, and param hooks compile-time checks. Route params still cross a trust boundary - they originate from URLs, notifications, and OS intents - so pair generated types with runtime validation.

Highlights / Typing Navigation & Route Params

* Enable experiments.typedRoutes so Expo CLI generates Href and Route types
* Dynamic segments require Href objects with a params map - string paths alone fail
* Pass the route literal to useLocalSearchParams for strongly typed path params
* Query strings are not inferred from the file tree - type them with a second generic
* URL params arrive as strings - validate and coerce at the screen boundary
* Zod parse at the trust boundary catches deep links and stale bookmarks

## Recipe

> Quick-reference recipe card - copy-paste ready.

```json
// app.json - enable typed routes (beta in SDK 57)
{
  "expo": {
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

```tsx
// app/user/[id].tsx
import { Link, router, useLocalSearchParams, type Href } from "expo-router";
import { Text, View } from "react-native";
import { z } from "zod";
 
const Params = z.object({
  id: z.string().regex(/^\d+$/),
});
 
export default function UserScreen() {
  const raw = useLocalSearchParams<"/user/[id]">();
  const { id } = Params.parse(raw); // runtime gate - params are strings
 
  return (
    <View>
      <Text>User {id}</Text>
      <Link href={{ pathname: "/user/[id]", params: { id: "42" } }}>User 42</Link>
    </View>
  );
}
 
// Imperative navigation - Href catches typos
export function openUser(userId: string) {
  const href = { pathname: "/user/[id]", params: { id: userId } } satisfies Href;
  router.push(href);
}
```

**When to reach for this:** You use Expo Router file-based routes and want autocomplete on `href`, typed path segments in screens, and validation before trusting deep-link params.

## Working Example

Assume this `app/` tree:

```
app/
  _layout.tsx
  index.tsx
  places/
    index.tsx
    [placeId].tsx
  search/
    [...terms].tsx
```

```tsx
// app/places/[placeId].tsx
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { z } from "zod";
 
const PathParams = z.object({
  placeId: z.string().uuid(),
});
 
const QueryParams = z.object({
  tab: z.enum(["overview", "photos"]).default("overview"),
  ref: z.string().optional(),
});
 
type PlaceDetail = { id: string; name: string; city: string };
 
async function fetchPlace(id: string): Promise<PlaceDetail> {
  // Replace with your API client
  return { id, name: "Mission Dolores Park", city: "San Francisco" };
}
 
export default function PlaceDetailScreen() {
  const raw = useLocalSearchParams<
    "/places/[placeId]",
    { tab?: string; ref?: string }
  >();
 
  const path = PathParams.safeParse(raw);
  const query = QueryParams.safeParse(raw);
 
  const [place, setPlace] = useState<PlaceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
 
  useEffect(() => {
    if (!path.success) {
      setError("Invalid place id in URL");
      return;
    }
    fetchPlace(path.data.placeId)
      .then(setPlace)
      .catch(() => setError("Failed to load place"));
  }, [path.success, path.success ? path.data.placeId : null]);
 
  if (!path.success || !query.success) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>This link is invalid or outdated.</Text>
      </View>
    );
  }
 
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }
 
  if (!place) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
 
  const { tab, ref } = query.data;
 
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: place.name }} />
      <Text style={styles.title}>{place.name}</Text>
      <Text style={styles.meta}>{place.city}</Text>
      <Text style={styles.meta}>
        Tab: {tab}
        {ref ? ` · ref=${ref}` : ""}
      </Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 22, fontWeight: "700" },
  meta: { fontSize: 15, color: "#64748b" },
  error: { color: "#dc2626", textAlign: "center" },
});
```

```tsx
// app/places/index.tsx - typed links to dynamic routes
import { Link, useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text } from "react-native";
 
const PLACES = [
  { id: "550e8400-e29b-41d4-a716-446655440000", name: "Dolores Park" },
  { id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8", name: "Golden Gate" },
] as const;
 
export default function PlacesIndex() {
  const router = useRouter();
 
  return (
    <FlatList
      data={PLACES}
      keyExtractor={(p) => p.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/places/[placeId]",
              params: { placeId: item.id, tab: "photos" },
            })
          }
        >
          <Text style={styles.row}>{item.name}</Text>
          <Link
            href={{
              pathname: "/places/[placeId]",
              params: { placeId: item.id, tab: "overview", ref: "list" },
            }}
            style={styles.link}
          >
            Open via Link
          </Link>
        </Pressable>
      )}
    />
  );
}
 
const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  row: { fontSize: 17, fontWeight: "600" },
  link: { color: "#2563eb", marginTop: 4 },
});
```

```tsx
// app/search/[...terms].tsx - catch-all segments are string[]
import { useGlobalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { z } from "zod";
 
const TermsParams = z.object({
  terms: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .pipe(z.array(z.string()).min(1)),
});
 
export default function SearchScreen() {
  const raw = useGlobalSearchParams<"/search/[...terms]">();
  const parsed = TermsParams.safeParse(raw);
 
  if (!parsed.success) {
    return <Text>Missing search terms</Text>;
  }
 
  return (
    <View>
      <Text>Searching: {parsed.data.terms.join(" · ")}</Text>
    </View>
  );
}
```

**What this demonstrates:**

* `useLocalSearchParams<"/places/[placeId]">()` types path keys; a second generic covers query params.
* Zod validates UUID path segments and enum query tabs after TypeScript checks the route shape.
* `router.push` and `<Link href={{ pathname, params }}>` share the same `Href` object form for dynamic routes.
* Catch-all routes (`[...terms]`) need transforms because Expo Router may deliver `string | string[]`.

## Deep Dive

### How It Works

1. With `experiments.typedRoutes: true`, Expo CLI generates types when you run `npx expo start` (or `npx expo customize tsconfig.json` on CI).
2. Generated definitions land in `.expo/types/router.d.ts` and are pulled in through `expo-env.d.ts` - do not edit or commit these files.
3. `Href` accepts static paths (`"/places"`) and `HrefObject` shapes for dynamic segments (`{ pathname: "/places/[placeId]", params: { placeId } }`).
4. `useLocalSearchParams<Route>()` types **path** segment names for that screen; query keys are mostly manual unless declared via the second generic.
5. All param values arrive as **strings** (or `string[]` for catch-alls and repeated keys) - TypeScript cannot prove runtime coercion.
6. Relative paths (`./profile`) are not part of `Href`; build absolute paths with `useSegments()` when you need tab-relative navigation.

### Setup Checklist

| Step | Command / file | Purpose |
| --- | --- | --- |
| Enable flag | `app.json` → `experiments.typedRoutes` | Turns on code generation |
| TS includes | `npx expo customize tsconfig.json` | Adds `expo-env.d.ts` + `.expo` to `include` |
| Dev / CI types | `npx expo start` or customize on CI | Regenerates routes when files move |
| Git ignore | `.gitignore` ← `expo-env.d.ts` | Keeps generated env types local |

### Param Layers

| Layer | Tool | Guarantees |
| --- | --- | --- |
| Route existence | `Href`, `Route` | Path matches a file in `app/` |
| Path segment names | `useLocalSearchParams<"/user/[id]">()` | Keys exist for that pattern |
| Query keys | Second generic or Zod | App-specific search params |
| Value shapes | Zod / custom guards | UUIDs, numbers, enums at runtime |

### TypeScript Notes

```tsx
import { type Href, useRouter, useSegments } from "expo-router";
 
// Tab-relative profile navigation without relative Href strings
function ProfileShortcut() {
  const [group] = useSegments();
  const router = useRouter();
  const href = `/${group}/profile` as Href; // cast after building from segments
  return null; // wire to a Pressable in real UI
}
 
// Narrow imperative navigation behind a helper
function navToPlace(placeId: string, tab: "overview" | "photos" = "overview") {
  const router = useRouter();
  router.push({
    pathname: "/places/[placeId]",
    params: { placeId, tab },
  });
}
```

## Gotchas

* **String path for dynamic routes** - `<Link href="/places/[placeId]" />` may type-check in loose setups but omits required `params`. **Fix:** Use `{ pathname, params }` objects for every `[param]` segment.
* **Trusting typed params as numbers** - `useLocalSearchParams<"/product/[id]">()` still returns `id: string`. **Fix:** Parse with `z.coerce.number()` or `Number()` behind validation.
* **Stale types after moving files** - Renaming routes without restarting Metro leaves outdated `Href` unions. **Fix:** Restart `npx expo start` or run the customize command on CI before `tsc`.
* **Query params assumed auto-typed** - Only file-system segments appear in generated types. **Fix:** Add a second generic to `useLocalSearchParams` or a Zod schema for `?tab=` and `?ref=` keys.
* **Catch-all type surprises** - `[...terms]` may be `string` when one segment and `string[]` when several. **Fix:** Normalize with `Array.isArray(v) ? v : [v]` before use.
* **Relative `href` strings** - `./settings` is intentionally excluded from `Href`. **Fix:** Prefix with `useSegments()` or hard-code absolute paths.
* **Optional params in push** - Passing `params: { id: undefined }` can stringify `"undefined"` in the URL. **Fix:** Omit keys or filter before navigation.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Expo Router typed routes (`Href`) | File-based `app/` layouts in SDK 57 | React Navigation without Expo Router |
| Zod param schemas | Deep links, push notifications, external URLs | Params never leave trusted in-app navigation |
| React Navigation typed navigator | Custom navigators, non-file routing | Greenfield Expo Router apps |
| Manual `RootStackParamList` | Brownfield React Navigation migration | New projects - generated types stay in sync |
| Runtime guards without Zod | Tiny apps with one or two params | Teams already using Zod for API responses |

## FAQs

How do I enable typed routes in Expo SDK 57?

Set `experiments.typedRoutes` to `true` in `app.json`, run `npx expo customize tsconfig.json`, then start the dev server with `npx expo start`. Generated types update when route files change.

Where are generated route types stored?

Expo CLI writes into `.expo/types/` and references them from a git-ignored `expo-env.d.ts` at the project root. Do not commit or hand-edit these files.

Why must dynamic routes use href objects?

Dynamic segments need a `params` map alongside `pathname`. The object form ensures every `[placeId]` or `[id]` token receives a value and matches the generated `Href` union.

How do I type query parameters?

Pass a second generic to `useLocalSearchParams`:

```tsx
const { tab } = useLocalSearchParams<"/places/[placeId]", { tab?: string }>();
```

Or validate with Zod for enums, defaults, and coercion.

What is the difference between useLocalSearchParams and useGlobalSearchParams?

`useLocalSearchParams` returns params for the current screen's route pattern. `useGlobalSearchParams` returns the merged params for the entire navigation tree - useful for catch-all routes and nested layouts, but broader in scope.

Are route params typed as strings?

Yes. URL segments and query values are strings at the native boundary. TypeScript generics name the keys; Zod (or similar) proves value shapes at runtime.

How do I navigate imperatively with types?

Import `router` from `expo-router` or call `useRouter()`. Both accept `Href` paths: `router.push("/places")` for static routes and `router.push({ pathname: "/places/[placeId]", params: { placeId } })` for dynamic ones.

Can I use typed routes without starting Metro?

Run `npx expo customize tsconfig.json` on CI before `tsc` so types exist without a dev server. For fresh route files, still regenerate when the `app/` tree changes.

Gotcha: Why does autocomplete not show my new route?

Types generate on dev server start. If you added a file while Metro was idle, restart `npx expo start`. Confirm `experiments.typedRoutes` is `true` and `tsconfig.json` includes `expo-env.d.ts`.

How do catch-all routes type their params?

A file `search/[...terms].tsx` maps to `useLocalSearchParams<"/search/[...terms]">()` with `terms` as `string | string[]`. Normalize to an array before joining or displaying.

Should I validate params if TypeScript already checks them?

Yes. Typed routes prove route **shape**, not user **input**. Deep links, QR codes, and OS share intents can supply malformed values - validate at the screen boundary.

How do route groups affect types?

Groups like `(tabs)` are omitted from the URL but appear in file paths. Generated types include group segments where applicable - use the exact string literal TypeScript suggests when passing generics to hooks.

How do I build tab-relative links without relative href?

Read the current segments with `useSegments()` and construct an absolute path:

```tsx
const [group] = useSegments();
<Link href={`/${group}/profile` as Href}>Profile</Link>
```

Can Zod share schemas between API and route params?

Yes. Reuse primitives (`z.string().uuid()`) across API response schemas and route param schemas. Keep screen-specific objects separate to avoid coupling fetch shapes to URL shapes.

What if I migrate from React Navigation param lists?

Map each screen to a file route, enable typed routes, then replace manual `RootStackParamList` entries incrementally. See [Gradual Typing in Brownfield Apps](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/gradual-typing-in-brownfield-apps/) for migration pacing.

## Related

* [Expo Router Typed Routes](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/expo-router-typed-routes/) - generated types and keeping them synced with the file tree
* [Typed Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router/typed-routes/) - Expo Router section deep dive on `Href` and relative paths
* [Typing API Responses & Zod](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-api-responses-and-zod/) - reuse Zod patterns at network and URL boundaries
* [Typing Components & Props](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-components-and-props/) - typing screen components that consume params
* [TypeScript in RN Basics](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typescript-in-rn-basics/) - `tsconfig` setup that typed routes depend on
* [Expo Router Basics](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/) - file-based routing mental model before adding generics

### External Related Links

* [reactnavigation.org](https://reactnavigation.org/) - official React Navigation docs
* [docs.expo.dev](https://docs.expo.dev/) - official Expo docs (recommended framework)
* [reactnative.dev](https://reactnative.dev/) - official React Native site

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
