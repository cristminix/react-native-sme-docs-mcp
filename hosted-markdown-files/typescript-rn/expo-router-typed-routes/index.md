# Expo Router Typed Routes

Expo Router can generate TypeScript types from your `app/` file tree. When typed routes are enabled, `href` strings, `router.push` calls, and param hooks are checked against real routes - so a renamed screen file becomes a compile error instead of a runtime 404.

Highlights / Expo Router Typed Routes

* Enable `experiments.typedRoutes` in app config - default Expo Router templates on SDK 57 often ship with this already on
* Expo CLI regenerates route types when `npx expo start` runs - output lands in `.expo/types` and `expo-env.d.ts`
* `Href` autocomplete catches typos in `<Link href>` and `router.push` at compile time
* Dynamic routes require object hrefs with strictly typed `params` - string templates alone are not enough
* Run `npx expo customize tsconfig.json` on CI so typecheck works without starting Metro

## Recipe

> Quick-reference recipe card - copy-paste ready.

```json
// app.json - enable typed routes (beta; required on older scaffolds)
{
  "expo": {
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

```bash
# Regenerate route types and tsconfig includes
npx expo customize tsconfig.json
npx expo start
```

```tsx
import { Link, router } from "expo-router";
 
// Autocomplete and compile-time validation
<Link href="/settings" />
router.push("/settings");
```

**When to reach for this:**

* Multi-screen Expo Router apps where broken links should fail in CI, not on a device.
* Teams that rename, move, or group routes frequently with `(tabs)` and `(auth)` segments.
* Dynamic segments like `app/user/[id].tsx` where param keys must match the file name.
* Imperative navigation (`router.push`, `router.replace`) shared across hooks and deep links.
* Monorepos that typecheck mobile without starting the Metro dev server.

## Working Example

Assume this file tree:

```
app/
  _layout.tsx
  index.tsx
  settings.tsx
  user/
    [id].tsx
```

```tsx
// app/_layout.tsx
import { Stack } from "expo-router";
 
export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Home" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="user/[id]" options={{ title: "User" }} />
    </Stack>
  );
}
```

```tsx
// app/index.tsx - declarative links with generated Href types
import { View, Text, StyleSheet } from "react-native";
import { Link, router } from "expo-router";
 
export default function HomeScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Home</Text>
 
      <Link href="/settings" style={styles.link}>
        Settings
      </Link>
 
      <Text
        style={styles.link}
        onPress={() => router.push({ pathname: "/user/[id]", params: { id: "42" } })}
      >
        User 42
      </Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: "600" },
  link: { color: "#2563eb", fontSize: 16 },
});
```

```tsx
// app/user/[id].tsx - strongly typed params from the route path
import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
 
export default function UserScreen() {
  const { id } = useLocalSearchParams<"/user/[id]">();
 
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>User {id}</Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24 },
  title: { fontSize: 22, fontWeight: "600" },
});
```

```json
// tsconfig.json - after `npx expo customize tsconfig.json`
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": { "strict": true },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ]
}
```

**What this demonstrates:**

* Static routes (`/settings`) autocomplete and reject typos like `/setings`.
* Dynamic routes use **object hrefs** with `pathname` and strictly typed `params`.
* `useLocalSearchParams<"/user/[id]">()` ties param names to the file-based segment.
* `tsconfig.json` includes `.expo/types` and `expo-env.d.ts` so `tsc --noEmit` sees generated types.
* Both `<Link href>` and `router.push` share the same generated `Href` union.

## Deep Dive

### How It Works

* **Metro + Expo CLI** scan the `app/` directory (or `src/app/` when using a top-level `src` layout) and build a route manifest.
* With `experiments.typedRoutes: true`, CLI writes generated declarations into **`.expo/types`** and a git-ignored **`expo-env.d.ts`** at the project root.
* The global **`Href`** type (and exported **`Route`**) represent every valid path in the project.
* `<Link href>`, `router.push`, `router.replace`, and `useRouter()` consume `Href` - invalid strings error in the IDE.
* Types refresh when the dev server starts; they are **not** committed to git by default.

### Setup Checklist

| Step | Command / file | Notes |
| --- | --- | --- |
| Enable experiment | `app.json` → `expo.experiments.typedRoutes: true` | Default Router templates on SDK 57 may already set this |
| tsconfig includes | `npx expo customize tsconfig.json` | Adds `.expo/types/**/*.ts` and `expo-env.d.ts` |
| Generate types | `npx expo start` (or customize on CI) | First run creates `expo-env.d.ts` and updates `.gitignore` |
| CI typecheck | `npx expo customize tsconfig.json && npx tsc --noEmit` | No Metro required for generation |
| Do not edit | `expo-env.d.ts` | Auto-generated; stays gitignored |

### Static vs Dynamic Hrefs

```tsx
import { Link } from "expo-router";
 
// Static - string href
<Link href="/settings" />
 
// Dynamic - object href with params matching the file segment name
<Link href={{ pathname: "/user/[id]", params: { id: userId } }} />
 
// Template strings work when the expression is typed as Href
const id = "42";
<Link href={`/user/${id}` as const} />
```

| Form | Supported | Notes |
| --- | --- | --- |
| `"/settings"` | Yes | Static segments |
| `{ pathname: "/user/[id]", params: { id } }` | Yes | Required for dynamic segments |
| `"/user/[id]"` (string only) | No | Type error - params missing |
| `"./settings"` (relative) | No | Use absolute paths or `useSegments()` |

### Query Parameters

Query params are not in the file system - type them manually:

```tsx
import { useLocalSearchParams } from "expo-router";
 
// Query only
const { q } = useLocalSearchParams<{ q?: string }>();
 
// Route + query - first generic is the route, second is query shape
const { id, tab } = useLocalSearchParams<"/user/[id]", { tab?: "posts" | "about" }>();
```

### Relative Navigation with useSegments

Typed routes require absolute hrefs. Build tab-relative paths from the current segments:

```tsx
import { Link, useSegments } from "expo-router";
 
export function ProfileTabLink() {
  const [group] = useSegments(); // e.g. "(tabs)" or "(auth)"
  return <Link href={`/${group}/profile`}>Profile</Link>;
}
```

### TypeScript Notes

```tsx
import { type Href, type Route } from "expo-router";
 
// Href - valid navigation targets
const settings: Href = "/settings";
 
// Route - matches any valid route string in the project
const route: Route = "/user/123";
 
// Typed segments for a specific layout branch
import { useSegments } from "expo-router";
const segments = useSegments<"/(tabs)/profile">();
```

* Generated types apply in **`.tsx` files** - plain `.ts` modules may not get `Href` autocomplete unless they import the types explicitly.
* After moving or renaming route files, restart `expo start` if the IDE shows stale autocomplete.
* `expo-env.d.ts` also augments React Native Web types (e.g. `className` on `View`) when typed routes are enabled.

## Gotchas

* **Skipping `npx expo customize tsconfig.json`** - `tsc --noEmit` in CI cannot see `.expo/types` and every `href` becomes `string`. **Fix:** Run customize in CI before typecheck.
* **String href to dynamic routes** - `href="/user/[id]"` typechecks as invalid because `id` is missing. **Fix:** Use `{ pathname: "/user/[id]", params: { id } }`.
* **Wrong param key names** - File is `[id].tsx` but params use `{ userId: "1" }`. **Fix:** Param keys must match bracket segment names exactly.
* **Committing `expo-env.d.ts`** - It is regenerated per machine and clutters diffs. **Fix:** Leave it gitignored; regenerate in CI with `expo customize`.
* **Removing `.expo/types` from tsconfig** - Autocomplete silently breaks; invalid routes compile. **Fix:** Keep both `.expo/types/**/*.ts` and `expo-env.d.ts` in `include`.
* **Relative `./` hrefs** - Typed routes do not support relative paths. **Fix:** Absolute paths or `useSegments()`-built paths.
* **Stale types after a big route refactor** - IDE still suggests deleted routes. **Fix:** Restart the dev server; run `npx expo customize tsconfig.json` if `include` paths changed.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Generated typed routes (`experiments.typedRoutes`) | Expo Router file-based apps on SDK 57 | Plain React Navigation without Expo Router |
| Manual `href` union type | Tiny apps with 3–4 static routes | Apps with dynamic segments and route groups |
| `useLocalSearchParams<MyParams>()` only | Quick param typing without enabling the experiment | You also need link `href` validation across the codebase |
| Runtime param validation (Zod) | Params arrive from deep links / push notifications | You want compile-time link checking - use both together |
| React Navigation typed navigators | Brownfield apps on `@react-navigation/native` | Greenfield Expo Router projects with file-based routing |

## FAQs

How do I enable typed routes in Expo SDK 57?

* Set `"experiments": { "typedRoutes": true }` under `"expo"` in `app.json` or `app.config.js`.
* Run `npx expo customize tsconfig.json` and start the dev server once.
* Default `create-expo-app` Router templates often enable this already - verify `app.json` before changing.

Where are generated route types stored?

* `.expo/types/**/*.ts` - route manifest types.
* `expo-env.d.ts` at the project root - global augmentations (gitignored).
* Both are listed in `tsconfig.json` `include` after customization.

Why does CI typecheck fail without starting Metro?

* Types are generated by Expo CLI, not Metro alone.
* Run `npx expo customize tsconfig.json` on CI before `npx tsc --noEmit`.
* Commit the updated `tsconfig.json` - not `expo-env.d.ts`.

What is the difference between Href and Route?

* `Href` - targets you can pass to `<Link href>` and `router.push`.
* `Route` - broader union of valid route strings in the project.
* Both are generated from your `app/` directory structure.

How do I link to a dynamic route?

```tsx
<Link href={{ pathname: "/user/[id]", params: { id: "42" } }} />
```

* Use an object with `pathname` matching the file (`[id]` segment).
* `params` keys must match bracket names in the file path.

Can I use template strings for href?

```tsx
const id = "42";
router.push(`/user/${id}`);
```

* Works when TypeScript can verify the result is a valid `Href`.
* Cast with `as Href` only when you have already validated `id` (e.g. with Zod).

How do I type query parameters?

* Query params are not generated from the file tree.
* Pass a manual generic: `useLocalSearchParams<{ ref?: string }>()`.
* Combine route + query with two generics on `useLocalSearchParams`.

Do relative paths like ./settings work?

* No - typed routes require absolute paths.
* Use `useSegments()` to prefix the current tab or group segment.

Does typed routes work with a src/app directory?

* Yes - Expo Router supports a top-level `src/app` layout.
* Generation follows the same rules; types update when the dev server runs.

What happens if I edit expo-env.d.ts by hand?

* The next `expo start` overwrites your changes.
* Do not commit the file - treat it as a build artifact.

Do I still need Zod for route params?

* Typed routes catch invalid **links** at compile time.
* Deep links and push notifications can still deliver malformed param values at runtime.
* Pair generated types with Zod validation on the screen boundary for external entry points.

How do I type useRouter and router.push?

```tsx
import { useRouter } from "expo-router";
 
const router = useRouter();
router.push("/settings");
router.replace({ pathname: "/user/[id]", params: { id: "1" } });
```

* `useRouter()` returns a typed router when the experiment is enabled.
* The standalone `router` import from `expo-router` is also typed.

Typed routes broke after I renamed a route file - what now?

* Restart `npx expo start` to regenerate types.
* Fix compile errors - they point at stale `href` strings still using the old path.
* Run `npx tsc --noEmit` to find every callsite.

## Related

* [TypeScript in RN Basics](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typescript-in-rn-basics/) - manual `useLocalSearchParams<Params>()` before generated types
* [Typing Navigation & Route Params](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-navigation-and-route-params/) - param validation and React Navigation overlap
* [Typed Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router/typed-routes/) - Expo Router section guide to links and href
* [Link & href](https://docs.wahwei/reactnative.codeguides.io/expo-router/link-and-href/) - declarative navigation patterns
* [Route Groups & Organizing app](https://docs.wahwei/reactnative.codeguides.io/expo-router/route-groups-and-organizing-app/) - how `(groups)` affect generated paths
* [Typing API Responses & Zod](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-api-responses-and-zod/) - validate deep-link params at runtime

### External Related Links

* [docs.expo.dev](https://docs.expo.dev/) - official Expo docs (recommended framework)
* [reactnative.dev/docs](https://reactnative.dev/docs/getting-started) - full RN documentation
* [react.dev](https://react.dev/) - core React concepts RN builds on

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

383k393a3c3q3e393a3o1r3e3k3x383c3e3k221y1u3x1v1t1v1z1t20

Reviewed by Chris St. John·Last updated Jul 19, 2026
