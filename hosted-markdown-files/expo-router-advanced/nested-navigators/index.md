# Nested Navigators

Stacks inside tabs inside stacks without losing back behavior. Each `app/**/_layout.tsx` declares a navigator; child routes inherit that shell. Expo Router maps URLs to the correct nested screen - you navigate with full paths like `/orders/42`, not React Navigation's `{ screen, params }` objects.

Highlights / Nested Navigators

* Each \_layout.tsx owns one navigator - Stack, Tabs, or NativeTabs at that folder level
* Back pops the innermost stack first; only when that stack is at root does back leave the tab
* Deep links use full paths (/home/messages) - no nested screen params object required
* Nest Stack inside each tab when tabs need headers and push screens
* Export unstable\_settings.anchor on modal stacks so deep links keep navigation context
* Avoid duplicate route files across groups - one screen belongs in one navigator tree

## Recipe

> Quick-reference recipe card - copy-paste ready.

```text
app/
├── _layout.tsx              # Root Stack
├── index.tsx
└── (app)/
    ├── _layout.tsx          # Tabs (or NativeTabs)
    └── (tabs)/
        ├── _layout.tsx      # Tab bar
        ├── home/
        │   ├── _layout.tsx  # Stack per tab
        │   ├── index.tsx    # /home
        │   └── feed.tsx     # /home/feed
        └── settings/
            ├── _layout.tsx
            └── index.tsx
```

```tsx
// app/_layout.tsx - root stack wraps the tab group
import { Stack } from "expo-router";
 
export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(app)" />
      <Stack.Screen
        name="compose"
        options={{ presentation: "modal", title: "New post" }}
      />
    </Stack>
  );
}
```

```tsx
// app/(app)/(tabs)/_layout.tsx - tabs own four stacks
import { Tabs } from "expo-router";
 
export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="search" options={{ title: "Search" }} />
      <Tabs.Screen name="inbox" options={{ title: "Inbox" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
```

```tsx
// app/(app)/(tabs)/home/_layout.tsx - stack inside one tab
import { Stack } from "expo-router";
 
export default function HomeStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Home" }} />
      <Stack.Screen name="feed" options={{ title: "Feed" }} />
      <Stack.Screen name="[id]" options={{ title: "Post" }} />
    </Stack>
  );
}
```

**When to reach for this:**

* **Tabs + detail pushes** - each tab keeps its own back stack
* **Modal over tabs** - root stack presents `compose` above the tab shell
* **Auth group inside root stack** - `(auth)` and `(app)` as sibling stacks
* **Native tabs + headers** - nest `<Stack />` inside each native tab folder

## Working Example

Root stack → tabs → per-tab stacks, with predictable back behavior and deep-link targets.

```tsx
// app/_layout.tsx
import { Stack } from "expo-router";
import { SessionProvider } from "@/features/auth";
 
export default function RootLayout() {
  return (
    <SessionProvider>
      <Stack>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack>
    </SessionProvider>
  );
}
```

```tsx
// app/(app)/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
 
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" options={{ tabBarLabel: "Home" }} />
      <Tabs.Screen name="inbox" options={{ tabBarLabel: "Inbox" }} />
    </Tabs>
  );
}
```

```tsx
// app/(app)/(tabs)/inbox/_layout.tsx
import { Stack } from "expo-router";
 
export default function InboxStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Inbox" }} />
      <Stack.Screen name="[threadId]" options={{ title: "Thread" }} />
    </Stack>
  );
}
```

```tsx
// app/(app)/(tabs)/inbox/index.tsx
import { Link, router } from "expo-router";
import { FlatList, Pressable, Text } from "react-native";
 
const threads = [{ id: "t1", subject: "Hello" }, { id: "t2", subject: "Ship it" }];
 
export default function InboxListScreen() {
  return (
    <FlatList
      data={threads}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/inbox/${item.id}`)}>
          <Text style={{ padding: 16 }}>{item.subject}</Text>
        </Pressable>
      )}
    />
  );
}
```

```tsx
// app/(app)/(tabs)/inbox/[threadId].tsx
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { Button, Text, View } from "react-native";
 
export default function ThreadScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const router = useRouter();
 
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text>Thread: {threadId}</Text>
      <Button title="Back" onPress={() => router.back()} />
      <Link href="/compose" asChild>
        <Button title="Reply (modal)" />
      </Link>
    </View>
  );
}
```

```tsx
// Deep link - lands on thread inside inbox tab, back returns to inbox list
// myapp://inbox/t2
import { router } from "expo-router";
router.push("/inbox/t2");
```

## Deep Dive

### Back stack mental model

React Navigation nests navigators; Expo Router expresses the same tree through folders:

```text
User on /inbox/t2 presses Android back:
 
1. Inbox Stack pops t2 → /inbox (list)
2. User presses back again → stays on Inbox tab (tab root has nowhere to pop)
3. User switches to Home tab → Inbox stack state is preserved (default)
4. User opens /compose modal → back dismisses modal, tabs remain underneath
```

Control tab reset behavior with `unmountOnBlur` on `Tabs.Screen` when stale stacks are unacceptable (e.g. wizard flows).

### Stack inside native tabs

When using [Native Tabs](https://docs.wahwei/reactnative.codeguides.io/expo-router-advanced/native-tabs/), each tab folder gets its own `_layout.tsx` exporting `<Stack />`:

```tsx
// app/(app)/(native-tabs)/inbox/_layout.tsx
import { Stack } from "expo-router";
 
export default function InboxStack() {
  return <Stack />;
}
```

Native tab triggers do not auto-pop nested stacks unless `disablePopToTop` is false (default on Android SDK 55+).

### Modal anchoring for nested stacks

Deep-linking directly to a modal route without an anchor wipes the screen behind it. Export `unstable_settings` on the stack that owns the modal:

```tsx
// app/(app)/_layout.tsx
export const unstable_settings = {
  anchor: "(tabs)",
};
 
import { Stack } from "expo-router";
 
export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="filters" options={{ presentation: "modal" }} />
    </Stack>
  );
}
```

### Navigating across nested boundaries

| Goal | Expo Router |
| --- | --- |
| Open thread in inbox tab | `router.push("/inbox/t2")` |
| Switch tab and reset its stack | `router.replace("/home")` |
| Open modal above tabs | `router.push("/compose")` |
| Pop to tab root | `router.dismissTo("/inbox")` or tab re-tap (native tabs) |

Prefer `router.replace` after auth transitions so users cannot swipe back into credential screens - see [../expo-router/redirects-and-index-routes/redirects-and-index-routes.md](https://docs.wahwei/reactnative.codeguides.io/expo-router/redirects-and-index-routes/).

## Gotchas

* **Expecting one global back stack** - Each tab maintains its own stack. **Fix:** Design URLs per tab; document which flows use `replace` vs `push`.
* **Modal deep link with no anchor** - Opening `/compose` cold starts with no tab context. **Fix:** Set `unstable_settings.anchor` on the parent stack.
* **Duplicating screens across navigators** - Same `profile.tsx` in two tab folders causes ambiguous routes. **Fix:** One file per URL; use [shared routes](https://docs.expo.dev/router/advanced/shared-routes/) if truly needed.
* **Returning `null` from root layout** - Blocks static rendering and can break nested hydration. **Fix:** Splash screen + session provider; render `<Stack />` once ready.
* **Pushing with relative paths across tabs** - `../settings` from `/inbox/t2` may not land where you expect. **Fix:** Use absolute hrefs (`/settings`) with typed routes.
* **Nesting Drawer inside Tabs without planning** - Gesture conflicts and double headers. **Fix:** Drawer at root or tabs inside drawer - pick one primary pattern per app.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Single root stack (no tabs) | Linear flows, onboarding wizards | Four+ top-level destinations |
| Tabs without per-tab stacks | Flat tab content, no detail pushes | Each tab needs list → detail |
| Native tabs + per-tab stacks | Platform tab bar + headers | You need fully custom tab UI |
| One stack + segment-based UI | Simple two-pane tablet layout | True independent back stacks per section |
| React Native `Modal` component | Ephemeral alerts, no URL needed | Flow must be deep-linkable or in history |

## FAQs

Why does Android back stay on the tab instead of leaving the app?

* Back pops the **innermost** navigator first.
* At a tab's root screen, there is nothing left to pop inside that tab.
* Use `BackHandler` at true app exit points (e.g. home tab root) if product requires double-back-to-exit.

How do I reset a tab's stack when re-selecting it?

* JavaScript tabs: configure tab press listeners via React Navigation options.
* Native tabs: default re-tap pops to root; use `disablePopToTop` on `NativeTabs.Trigger` to keep depth.

Can I nest a Drawer inside Tabs?

```text
app/(app)/_layout.tsx     → Drawer
app/(app)/(drawer)/_layout.tsx → Stack or Tabs child
```

Yes - but prefer **one** primary shell. Deep nesting increases back-stack confusion and bundle size.

How do typed routes work with nesting?

* Enable `experiments.typedRoutes` in app config.
* Hrefs like `/(app)/(tabs)/inbox/[threadId]` generate compile-time checks.
* See [../expo-router/typed-routes/typed-routes.md](https://docs.wahwei/reactnative.codeguides.io/expo-router/typed-routes/).

Should modals live in the root stack or inside a tab stack?

* **Root stack** - global compose, filters, media picker (visible from any tab).
* **Tab stack** - detail actions scoped to one section (edit single inbox thread).
* Root modals need `anchor` for deep links.

How do I test nested navigation?

```tsx
import { renderRouter, screen } from "expo-router/testing-library";
 
renderRouter({
  "inbox/index": () => <InboxListScreen />,
  "inbox/[threadId]": () => <ThreadScreen />,
});
```

Assert pathname segments after `router.push` - see [../testing/react-native-testing-library/react-native-testing-library.md](https://docs.wahwei/reactnative.codeguides.io/testing/react-native-testing-library/).

## Related

* [Native Tabs](https://docs.wahwei/reactnative.codeguides.io/expo-router-advanced/native-tabs/) - platform tab bars with nested stacks
* [Modal & Presentation Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router-advanced/modal-and-presentation-routes/) - modals above nested shells
* [Protected Routes & Middleware](https://docs.wahwei/reactnative.codeguides.io/expo-router-advanced/protected-routes-and-middleware/) - auth groups in nested trees
* [../expo-router/tabs-and-drawers/tabs-and-drawers.md](https://docs.wahwei/reactnative.codeguides.io/expo-router/tabs-and-drawers/) - JavaScript tabs baseline
* [../expo-router/stack-navigation/stack-navigation.md](https://docs.wahwei/reactnative.codeguides.io/expo-router/stack-navigation/) - stack options and headers
* [../expo-router/route-groups-and-organizing-app/route-groups-and-organizing-app.md](https://docs.wahwei/reactnative.codeguides.io/expo-router/route-groups-and-organizing-app/) - `(app)` / `(auth)` folders

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
