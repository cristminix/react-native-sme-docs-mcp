# Expo Router Basics

10 examples to get you started with Expo Router - 7 basic and 3 intermediate. File-based routes, `_layout.tsx`, and the mental model vs React Navigation.

Highlights / Expo Router Basics

* File names in app/ map to URLs - settings.tsx becomes /settings without a central route table
* app/\_layout.tsx is the root navigator: wrap providers once, then export Stack, Tabs, or Slot
* Expo Router is React Navigation under the hood - you gain file-based routes, not a different renderer
* main: expo-router/entry in package.json wires Metro to the router bootstrap instead of App.tsx
* Dynamic segments [id].tsx and catch-all [...slug].tsx power entity detail and CMS-style URLs
* Thin route files re-export feature screens - logic belongs in features/, not beside \_layout.tsx

## Prerequisites

Scaffold an SDK 57 app with the default template - it ships Expo Router, TypeScript, and the recommended entry point.

```bash
npx create-expo-app@latest MyRouterApp --template default@sdk-57
cd MyRouterApp
npm install
npx expo install expo-router
```

Confirm the router entry and SDK pin:

```json
{
  "main": "expo-router/entry",
  "dependencies": {
    "expo": "~57.0.4",
    "expo-router": "~6.0.8",
    "react": "19.2.3",
    "react-native": "0.86.0"
  }
}
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**.

---

## Basic Examples

### 1. File-Based Routes Map to URLs

Every file under `app/` becomes a route segment. The file name is the path - no central `linking` config required for standard screens.

```text
app/
├── index.tsx           → /
├── settings.tsx        → /settings
├── profile/
│   └── index.tsx       → /profile
└── orders/
    ├── index.tsx       → /orders
    └── [id].tsx        → /orders/:id
```

```tsx
// app/settings.tsx
import { Text, View } from "react-native";
 
export default function SettingsScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text>Settings</Text>
    </View>
  );
}
```

* **`app/index.tsx`** is the `/` route - the app's default landing screen
* **Nested folders** add path segments (`app/profile/index.tsx` → `/profile`)
* **`[id].tsx`** is a dynamic segment - access `id` via `useLocalSearchParams()`
* Route files should stay **thin** - import screens from `features/` when logic grows

> **Related:** [Route Groups & Organizing `app/`](https://docs.wahwei/reactnative.codeguides.io/expo-router/route-groups-and-organizing-app/) - `(auth)` and `(tabs)` without changing URLs | [../expo-rules/navigation-and-routing-rules/navigation-and-routing-rules.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/navigation-and-routing-rules/) - team routing conventions

---

### 2. Root `_layout.tsx` Owns the Navigator

`_layout.tsx` files define navigators (Stack, Tabs, Drawer) for their directory. The root layout wraps global providers and exports the top-level navigator.

```tsx
// app/_layout.tsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
 
export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="index" options={{ title: "Home" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
      </Stack>
    </>
  );
}
```

* **`Stack` from `expo-router`** is a file-based wrapper around `@react-navigation/native-stack`
* **`<Stack.Screen name="settings">`** configures the screen that matches `app/settings.tsx`
* Child routes **inherit** the parent navigator - `app/orders/[id].tsx` pushes onto the root stack unless a nested `_layout.tsx` says otherwise
* Mount **providers once** here (theme, query client, auth) - not in every nested layout

> **Related:** [Stack Navigation](https://docs.wahwei/reactnative.codeguides.io/expo-router/stack-navigation/) - headers, `screenOptions`, and push/pop | [../architecture-design/feature-sliced-design-for-rn/feature-sliced-design-for-rn.md](https://docs.wahwei/reactnative.codeguides.io/architecture-design/feature-sliced-design-for-rn/) - keep `app/` as the FSD app layer

---

### 3. Mental Model: Files vs React Navigation Config

React Navigation builds a **navigator tree in code**. Expo Router builds the **same tree from the filesystem** - you trade imperative `createNativeStackNavigator` for declarative file names.

```tsx
// React Navigation (imperative tree)
const Stack = createNativeStackNavigator();
 
function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
```

```text
// Expo Router (filesystem tree)
app/
├── _layout.tsx      → Stack navigator for this folder
├── index.tsx        → "Home" screen (name derived from file)
└── settings.tsx     → "Settings" screen
```

| Concept | React Navigation | Expo Router |
| --- | --- | --- |
| Screen registration | `<Stack.Screen name="Settings" />` | `app/settings.tsx` exists |
| Nested navigator | Navigator inside a screen | `app/(tabs)/_layout.tsx` |
| Deep link path | Manual `linking` config | File path ≈ URL path |
| Screen options | `options` prop on `Screen` | `export const options` or `<Stack.Screen options>` |

* Expo Router **is** React Navigation - `useNavigation`, `useFocusEffect`, and header APIs still apply
* File names become **route names** - `settings.tsx` registers as `"settings"` in the stack
* Brownfield apps can adopt Expo Router incrementally - see [ADR: Navigation Library Choice](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-navigation-library-choice/)

> **Related:** [Link & href](https://docs.wahwei/reactnative.codeguides.io/expo-router/link-and-href/) - declarative navigation without memorizing route names | [Typed Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router/typed-routes/) - compile-time path safety

---

### 4. `expo-router/entry` Bootstrap

`package.json` `main` points Metro at Expo Router's entry instead of `expo/AppEntry.js` or a hand-written `App.tsx`.

```json
{
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios"
  }
}
```

```tsx
// You do NOT need App.tsx - the entry loads app/_layout.tsx automatically
// app/_layout.tsx is the true application root
import { Slot } from "expo-router";
 
export default function RootLayout() {
  return <Slot />;
}
```

* **`expo-router/entry`** registers the root component, linking handlers, and error boundaries
* **`Slot`** renders the matched child route - use it when you want a layout **without** forcing a Stack/Tabs wrapper
* Removing `main: "expo-router/entry"` breaks routing - the bundler will not discover `app/` routes
* `npx expo install expo-router` ensures the router version matches SDK 57's React Navigation peers

> **Related:** [../project-setup/project-setup-basics/project-setup-basics.md](https://docs.wahwei/reactnative.codeguides.io/project-setup/project-setup-basics/) - SDK pin and default template layout

---

### 5. Dynamic Segments and Params

Bracket syntax creates dynamic URL segments. Read params with `useLocalSearchParams` - validate before use.

```tsx
// app/orders/[id].tsx
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
 
export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
 
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text>Order #{id}</Text>
    </View>
  );
}
```

```tsx
// Navigate programmatically (imperative)
import { router } from "expo-router";
 
router.push({ pathname: "/orders/[id]", params: { id: "42" } });
```

* **`[id]`** matches one segment - `/orders/42` sets `id: "42"` (always strings from URLs)
* **Multiple dynamics** - `app/users/[userId]/posts/[postId].tsx` exposes both params
* **Validate params** at the feature boundary with Zod - URLs are untrusted input
* Prefer **path segments** over query strings for entity IDs - clearer deep links and analytics

> **Related:** [Typed Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router/typed-routes/) - generated `Href` types for param-safe navigation | [../expo-rules/navigation-and-routing-rules/navigation-and-routing-rules.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/navigation-and-routing-rules/) - param validation rules

---

### 6. Index Routes as Folder Defaults

`index.tsx` inside a folder is the default screen for that path segment - like `index.html` on the web.

```text
app/
├── index.tsx              → /
└── orders/
    ├── _layout.tsx        → Stack for /orders/*
    ├── index.tsx          → /orders (list)
    └── [id].tsx           → /orders/:id (detail)
```

```tsx
// app/orders/index.tsx
import { Link } from "expo-router";
import { Text, View } from "react-native";
 
const ORDERS = [{ id: "1" }, { id: "2" }];
 
export default function OrdersListScreen() {
  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      {ORDERS.map((order) => (
        <Link key={order.id} href={{ pathname: "/orders/[id]", params: { id: order.id } }}>
          Order #{order.id}
        </Link>
      ))}
    </View>
  );
}
```

* **`/orders`** resolves to `orders/index.tsx`, not `orders.tsx` - pick one pattern per feature
* Nested **`_layout.tsx`** wraps all siblings in that folder (`index.tsx` and `[id].tsx`)
* Use index routes for **list hubs**; dynamic segments for **entity detail** - predictable REST-like URLs

> **Related:** [Redirects & Index Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router/redirects-and-index-routes/) - default landing and auth-gated entry | [Link & href](https://docs.wahwei/reactnative.codeguides.io/expo-router/link-and-href/) - `Link` vs `router.push`

---

### 7. Screen Options from Route Files

Export `options` from a route file or configure screens in `_layout.tsx` - both feed React Navigation's screen options API.

```tsx
// app/settings.tsx
import { Stack } from "expo-router";
import { Text, View } from "react-native";
 
export const options = {
  title: "Settings",
  headerLargeTitle: true,
};
 
export default function SettingsScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text>Settings</Text>
    </View>
  );
}
```

```tsx
// app/_layout.tsx (alternative - centralize chrome)
import { Stack } from "expo-router";
 
export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        animation: "slide_from_right",
      }}
    />
  );
}
```

* **`screenOptions`** on the navigator sets defaults; per-file **`options`** overrides for one screen
* **`Stack.Screen name="settings" options={{...}}`** in `_layout.tsx` is equivalent to exporting `options` from `settings.tsx`
* Dynamic titles use **`useNavigation().setOptions()`** inside the screen when data loads
* Header buttons and modals are configured the same way as React Navigation - Expo Router forwards the API

> **Related:** [Stack Navigation](https://docs.wahwei/reactnative.codeguides.io/expo-router/stack-navigation/) - cookbook for headers, gestures, and presentation modes

---

## Intermediate Examples

### 8. Nested Stack Inside Tabs

The default SDK 57 template nests stacks under tabs - each tab folder can push detail screens without losing the tab bar.

```text
app/
├── _layout.tsx
└── (tabs)/
    ├── _layout.tsx        → Tabs navigator
    ├── index.tsx          → Home tab
    └── orders/
        ├── _layout.tsx    → Stack inside the Orders tab
        ├── index.tsx      → /orders list (tab root)
        └── [id].tsx       → /orders/:id (pushed, tab bar stays)
```

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
 
export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: "Orders", tabBarIcon: ({ color }) => <Ionicons name="list" size={24} color={color} /> }}
      />
    </Tabs>
  );
}
```

```tsx
// app/(tabs)/orders/_layout.tsx
import { Stack } from "expo-router";
 
export default function OrdersStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Orders" }} />
      <Stack.Screen name="[id]" options={{ title: "Order" }} />
    </Stack>
  );
}
```

* **Tabs at `(tabs)/_layout.tsx`** - each immediate child folder or file becomes a tab
* **Stack inside `orders/`** - pushes `[id]` on top of `orders/index` while the tab bar remains visible
* Parentheses in **`(tabs)`** are a route group - they organize files without adding `/tabs` to the URL
* Deep nesting increases mental load - flatten when a tab has only one screen

> **Related:** [Tabs & Drawers](https://docs.wahwei/reactnative.codeguides.io/expo-router/tabs-and-drawers/) - tab bar styling, drawer composition | [Route Groups & Organizing `app/`](https://docs.wahwei/reactnative.codeguides.io/expo-router/route-groups-and-organizing-app/) - `(tabs)` conventions

---

### 9. Route Groups for Auth vs App Shell

Route groups `(auth)` and `(app)` separate login flows from the main shell without changing URL paths.

```text
app/
├── _layout.tsx
├── index.tsx              → Redirect hub (see redirects article)
├── (auth)/
│   ├── _layout.tsx        → Stack for login/signup
│   ├── login.tsx          → /login
│   └── register.tsx       → /register
└── (app)/
    ├── _layout.tsx          → Authenticated shell (tabs or stack)
    └── (tabs)/
        ├── _layout.tsx
        └── index.tsx        → / (when signed in)
```

```tsx
// app/(auth)/_layout.tsx
import { Stack } from "expo-router";
 
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
```

* **`(auth)` and `(app)`** do not appear in URLs - `/login` not `/auth/login`
* Split layouts let you apply **different transitions and headers** per flow
* Auth gates usually live in root `_layout.tsx` or `index.tsx` with `<Redirect />` - see the redirects cookbook
* Keep redirect logic **minimal** in layouts - session state comes from a provider, not fetches in `_layout.tsx`

> **Related:** [Redirects & Index Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router/redirects-and-index-routes/) - auth-gated entry | [../auth-session/mobile-auth-basics/mobile-auth-basics.md](https://docs.wahwei/reactnative.codeguides.io/auth-session/mobile-auth-basics/) - session providers

---

### 10. Thin Routes Re-Exporting Feature Screens

Production apps keep `app/` as a routing layer - screens, hooks, and API calls live in `features/`.

```text
features/
└── orders/
    ├── index.ts
    ├── ui/
    │   ├── OrdersListScreen.tsx
    │   └── OrderDetailScreen.tsx
    └── model/
        └── useOrder.ts
 
app/
└── (tabs)/
    └── orders/
        ├── index.tsx      → re-export only
        └── [id].tsx       → re-export only
```

```tsx
// features/orders/index.ts
export { OrdersListScreen } from "./ui/OrdersListScreen";
export { OrderDetailScreen } from "./ui/OrderDetailScreen";
```

```tsx
// app/(tabs)/orders/index.tsx
export { OrdersListScreen as default } from "@/features/orders";
```

```tsx
// app/(tabs)/orders/[id].tsx
export { OrderDetailScreen as default } from "@/features/orders";
```

* Route files stay **under ~20 lines** - easy to grep and review in PRs
* Features remain **testable without the router** - import screens directly in RNTL tests
* One **public export per feature** via `index.ts` - no cross-feature deep imports
* Aligns with [Feature-Sliced Design](https://docs.wahwei/reactnative.codeguides.io/architecture-design/feature-sliced-design-for-rn/) - `app/` is the app layer, not a god folder

> **Related:** [Expo Router Fundamentals Best Practices](https://docs.wahwei/reactnative.codeguides.io/expo-router/best-practices/) - full section summary | [../project-setup/folder-structure-for-features/folder-structure-for-features.md](https://docs.wahwei/reactnative.codeguides.io/project-setup/folder-structure-for-features/) - scaling past the starter tree

---

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
