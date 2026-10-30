# Stack Navigation

Push/pop, headers, and screen options in `app/` directories. `Stack` from `expo-router` is the file-based face of `@react-navigation/native-stack` - every sibling route file under a folder with `_layout.tsx` becomes a stack screen.

Highlights / Stack Navigation

* Stack from expo-router wraps native-stack - file names become pushable screens automatically
* screenOptions on \_layout.tsx sets team-wide header defaults; per-route options override
* presentation: modal and headerShown: false are the two most common stack tweaks in production
* useNavigation().setOptions updates titles after async data loads without remounting
* Nested stacks under tabs keep the tab bar visible while detail screens push on top
* Android hardware back and iOS swipe-back follow React Navigation stack rules - test both

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install expo-router
```

```text
app/
├── _layout.tsx           # Root stack
├── index.tsx
├── settings.tsx
└── orders/
    ├── _layout.tsx       # Nested stack for /orders/*
    ├── index.tsx
    └── [id].tsx
```

```tsx
// app/_layout.tsx
import { Stack } from "expo-router";
 
export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" options={{ title: "Home" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
    </Stack>
  );
}
```

```tsx
// app/orders/_layout.tsx
import { Stack } from "expo-router";
 
export default function OrdersLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Orders" }} />
      <Stack.Screen name="[id]" options={{ title: "Order" }} />
    </Stack>
  );
}
```

**When to reach for this:**

* Linear drill-down flows (list → detail → edit)
* Full-screen modals via `presentation: "modal"`
* Hiding headers on splash/auth screens with `headerShown: false`
* Nested stacks inside tabs when one tab needs its own push history

## Working Example

A root stack with a hidden-header splash, a settings screen with a dynamic title, and a nested orders stack.

```tsx
// app/_layout.tsx
import { Stack } from "expo-router";
import { ThemeProvider } from "@/shared/theme";
 
export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="settings"
          options={{
            title: "Settings",
            presentation: "card",
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
```

```tsx
// app/settings.tsx
import { useNavigation } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
 
export default function SettingsScreen() {
  const navigation = useNavigation();
 
  useEffect(() => {
    navigation.setOptions({ title: "Account Settings" });
  }, [navigation]);
 
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text>Settings content</Text>
    </View>
  );
}
```

```tsx
// app/orders/[id].tsx
import { useLocalSearchParams, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
 
export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [title, setTitle] = useState(`Order #${id}`);
 
  useEffect(() => {
    // Simulate fetch - then update header via layout child
    const timer = setTimeout(() => setTitle(`Order ${id} - Shipped`), 400);
    return () => clearTimeout(timer);
  }, [id]);
 
  return (
    <>
      <Stack.Screen options={{ title }} />
      <View style={{ flex: 1, padding: 16 }}>
        <Text>Detail for order {id}</Text>
      </View>
    </>
  );
}
```

```tsx
// Navigate between stack screens
import { Link, router } from "expo-router";
import { Pressable, Text, View } from "react-native";
 
export function HomeActions() {
  return (
    <View style={{ gap: 12 }}>
      <Link href="/settings">Settings (declarative)</Link>
      <Pressable onPress={() => router.push("/orders/42")}>
        <Text>Order 42 (imperative)</Text>
      </Pressable>
    </View>
  );
}
```

## Deep Dive

### How the filesystem becomes a stack

```text
app/orders/_layout.tsx  →  <Stack> wraps this folder
app/orders/index.tsx    →  initial route (bottom of stack)
app/orders/[id].tsx     →  pushed when navigating to /orders/:id
app/orders/new.tsx      →  pushed when navigating to /orders/new
```

* Expo Router **auto-registers** every route file as a `Stack.Screen` - explicit `<Stack.Screen name="...">` is optional but recommended for options
* The **initial route** is the first matching screen on navigation; deep links can open `[id]` directly
* **Sibling files** share one stack history - folders without `_layout.tsx` inherit the parent navigator

### Header configuration layers

| Layer | API | Precedence |
| --- | --- | --- |
| Navigator default | `screenOptions` on `<Stack>` | Lowest |
| Layout child | `<Stack.Screen options={...}>` | Medium |
| Route file | `export const options = {...}` | Medium |
| Runtime | `navigation.setOptions()` or `<Stack.Screen options>` in render | Highest |

```tsx
// Per-route static options (co-located)
export const options = {
  title: "Profile",
  headerBackTitle: "Back",
};
```

### Presentation modes

```tsx
<Stack.Screen
  name="compose"
  options={{
    presentation: "modal",        // iOS card modal; Android full-screen
    gestureEnabled: true,
    headerShown: true,
  }}
/>
```

* **`card`** (default) - standard push animation
* **`modal`** - modal presentation; pair with a `(modals)` route group for organization
* **`transparentModal`** - overlays previous screen (use sparingly - accessibility and Android back differ)
* **`fullScreenModal`** - edge-to-edge modal on iOS

### Nesting stacks under tabs

```text
(tabs)/_layout.tsx     → Tabs (tab bar always visible)
(tabs)/orders/_layout  → Stack (push within Orders tab only)
```

Each tab maintains an **independent stack history** - switching tabs preserves each tab's stack state by default. Reset stacks on logout with `router.replace` or remounting the navigator key.

## Gotchas

* **Missing `_layout.tsx` in a folder with multiple screens** - siblings may flatten into the parent stack unexpectedly. **Fix:** Add `orders/_layout.tsx` with `<Stack />` when a folder has `index` + `[id]`.
* **Duplicate screen names from index files** - `orders.tsx` and `orders/index.tsx` conflict. **Fix:** Pick one URL shape per feature.
* **`headerShown: false` on root stack but expecting nested headers** - child stacks must set `headerShown: true` explicitly. **Fix:** Configure headers at the nested `_layout.tsx` where screens live.
* **Dynamic title flicker** - default title shows before fetch completes. **Fix:** Use a skeleton title or `headerLargeTitle: false` until data loads; set options in `useEffect`.
* **`router.push` after login duplicates auth on back stack** - users swipe back to login. **Fix:** `router.replace('/(tabs)')` after successful auth.
* **Modal without Android back handling** - `presentation: "modal"` still respects hardware back, but custom overlays may not. **Fix:** Test Android back; prefer real routes over absolute-position overlays.
* **Deep link opens stack mid-tree without index** - `/orders/99` may skip list screen. **Fix:** Acceptable for notifications; use `router.back()` fallback UI when stack is empty.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `Stack` (native-stack) | Default push/pop, native headers, gestures | You need cross-stack shared element transitions (limited) |
| `Tabs` | Top-level sections with persistent tab bar | Linear wizard with no section switching |
| `Drawer` | Many sections, tablet-first navigation | Phone apps with ≤4 primary destinations |
| Modal as route (`presentation: "modal"`) | Full-screen forms, compose flows | Tiny tooltips or dropdowns |
| Imperative overlay (`react-native` Modal) | Blocking alerts, one-off pickers | Navigation that should appear in history/deep links |
| React Navigation JS stack (`@react-navigation/stack`) | Custom card animations on older setups | New SDK 57 projects - native-stack is default |

## FAQs

How do I hide the header on one screen?

```tsx
// In _layout.tsx
<Stack.Screen name="login" options={{ headerShown: false }} />
 
// Or export from the route file
export const options = { headerShown: false };
```

Set `headerShown: false` on the specific screen - parent `screenOptions` can still apply to siblings.

How do I add a header right button?

```tsx
import { Stack, router } from "expo-router";
import { Pressable, Text } from "react-native";
 
export default function EditScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push("/preview")}>
              <Text>Preview</Text>
            </Pressable>
          ),
        }}
      />
      {/* screen body */}
    </>
  );
}
```

Use `headerLeft`, `headerRight`, or `headerTitle` render props - same API as React Navigation.

Can I use a custom header component?

Yes - `header: () => <MyHeader />` in screen options. Prefer design-system headers for consistency. Hide the default with `headerShown: false` and render your own in the screen body only when the stack header is insufficient.

How does Android hardware back work?

Hardware back pops the current stack. At the root stack's first screen, back exits the app (or moves to background). Test nested stacks inside tabs - back should pop detail before switching tabs.

How do I reset the stack on logout?

```tsx
import { router } from "expo-router";
 
router.replace("/(auth)/login");
```

`replace` removes prior routes from history. For complex resets, remount the navigator with a `key` tied to `userId` on the root layout.

Should modals be routes or React Native Modal?

**Routes** when the modal has a URL, deep link, or should appear in navigation history. **RN `Modal`** for ephemeral UI with no shareable path. Document team choice in an ADR when both patterns appear.

How do I pass data between stack screens?

* **URL params** for IDs and shallow state (`params: { id }`)
* **Global store** (Zustand, TanStack Query) for shared entities
* **Avoid** large JSON in params - URLs are logged and persisted in navigation state

See [Typed Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router/typed-routes/) for param typing.

What animation options does native-stack support?

`animation: "slide_from_right" | "fade" | "fade_from_bottom" | "flip" | "simple_push" | "none"` in `screenOptions`. Platform defaults differ - verify on both iOS and Android simulators.

Can I nest a stack inside another stack?

Yes - `app/settings/_layout.tsx` can export `<Stack>` while sitting inside the root stack. Limit depth to **two stacks** (root + feature) before UX and debugging suffer.

How do I disable swipe-back on a sensitive screen?

```tsx
<Stack.Screen name="confirm-payment" options={{ gestureEnabled: false }} />
```

Use for irreversible actions. Pair with an explicit cancel button for accessibility.

## Related

* [Expo Router Basics](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/) - filesystem mental model and `_layout.tsx`
* [Tabs & Drawers](https://docs.wahwei/reactnative.codeguides.io/expo-router/tabs-and-drawers/) - nesting stacks under tabs
* [Link & href](https://docs.wahwei/reactnative.codeguides.io/expo-router/link-and-href/) - declarative push targets
* [Route Groups & Organizing `app/`](https://docs.wahwei/reactnative.codeguides.io/expo-router/route-groups-and-organizing-app/) - `(modals)` group pattern
* [../expo-rules/navigation-and-routing-rules/navigation-and-routing-rules.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/navigation-and-routing-rules/) - review checklist
* [../architecture-design/adr-navigation-library-choice/adr-navigation-library-choice.md](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-navigation-library-choice/) - Expo Router vs manual React Navigation

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
