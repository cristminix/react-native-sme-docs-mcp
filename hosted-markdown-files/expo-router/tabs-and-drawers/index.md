# Tabs & Drawers

Tab bars, drawer gestures, and nested layout composition. `Tabs` and `Drawer` from `expo-router` wrap React Navigation navigators - file names under the layout folder become destinations automatically.

Highlights / Tabs & Drawers

* Tabs from expo-router maps each child file or folder to a tab - icons live in \_layout.tsx
* Nest a Stack inside a tab folder when that section needs list → detail push without losing the tab bar
* Drawer requires @react-navigation/drawer - install with npx expo install and wrap in app/(drawer)/
* href: null hides a route from the tab bar while keeping it addressable via router.push
* Lazy tabs mount on first visit - prefetch heavy tabs with Link prefetch when UX demands
* Three-level nesting (drawer → tabs → stack) is the practical ceiling before flattening

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install expo-router
# Drawer only:
npx expo install @react-navigation/drawer react-native-gesture-handler react-native-reanimated
```

```text
app/
├── _layout.tsx
└── (tabs)/
    ├── _layout.tsx       → Tabs
    ├── index.tsx         → Home tab
    ├── explore.tsx       → Explore tab
    └── orders/
        ├── _layout.tsx     → Stack nested in Orders tab
        ├── index.tsx
        └── [id].tsx
```

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
 
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2563eb",
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, size }) => <Ionicons name="compass" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

**When to reach for this:**

* **Tabs** - 3–5 peer destinations users switch between constantly (home, search, profile)
* **Drawer** - 6+ sections, tablet layouts, or hamburger-first IA
* **Nested stack** - one tab has drill-down flows while siblings stay flat

## Working Example

Tabs with a nested orders stack and an optional drawer shell for wider navigation.

```tsx
// app/_layout.tsx
import { Stack } from "expo-router";
 
export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(drawer)" />
      <Stack.Screen name="(auth)" options={{ presentation: "modal" }} />
    </Stack>
  );
}
```

```tsx
// app/(drawer)/_layout.tsx
import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
 
export default function DrawerLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer screenOptions={{ headerShown: false }}>
        <Drawer.Screen name="(tabs)" options={{ title: "Main" }} />
        <Drawer.Screen name="settings" options={{ title: "Settings" }} />
      </Drawer>
    </GestureHandlerRootView>
  );
}
```

```tsx
// app/(drawer)/(tabs)/orders/_layout.tsx
import { Stack } from "expo-router";
 
export default function OrdersStack() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Orders" }} />
      <Stack.Screen name="[id]" options={{ title: "Order Detail" }} />
    </Stack>
  );
}
```

```tsx
// Hide a screen from tab bar but keep it navigable
// app/(tabs)/_layout.tsx (excerpt)
<Tabs.Screen
  name="hidden-settings"
  options={{
    href: null,
    title: "Hidden",
  }}
/>
```

```tsx
// app/(tabs)/hidden-settings.tsx - reachable via router.push("/hidden-settings")
import { Text, View } from "react-native";
 
export default function HiddenSettingsScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text>Not shown in tab bar</Text>
    </View>
  );
}
```

## Deep Dive

### Tabs layout rules

```text
app/(tabs)/_layout.tsx
├── index.tsx      → tab 1 (often Home)
├── explore.tsx    → tab 2
└── profile.tsx    → tab 3
```

* Every **immediate child** of `(tabs)/` becomes a tab unless `href: null`
* **Folders** become a single tab - the folder's `_layout.tsx` chooses stack/drawer inside that tab
* **`tabBarButton`** customizes press behavior - use for special center FAB tabs
* **`lazy: true`** (default) defers mounting until first focus - improves cold start

### Drawer layout rules

```tsx
import { Drawer } from "expo-router/drawer";
```

* Import from **`expo-router/drawer`**, not `expo-router` - drawer has extra native dependencies
* Wrap the tree in **`GestureHandlerRootView`** at the drawer layout or root
* **`drawerPosition`**, **`drawerType`**, and **`overlayColor`** match React Navigation drawer options
* On phones, many teams use **tabs primary + drawer for secondary** - not both competing for thumb reach

### Composition patterns

| Pattern | Structure | Best for |
| --- | --- | --- |
| Tabs only | `(tabs)/` at root | Consumer apps, 3–5 sections |
| Drawer → Tabs | `(drawer)/(tabs)/` | Many sections; tabs for daily use |
| Stack → Tabs | Root stack pushes modals over tabs | Auth modal, global compose |
| Tabs → Stack | Stack inside one tab folder | List/detail in one section |

```text
Recommended max depth:
 
Root Stack
  └── Drawer (optional)
        └── Tabs
              └── Stack (per heavy tab)
```

### Tab bar styling

```tsx
<Tabs
  screenOptions={{
    tabBarStyle: { backgroundColor: "#0f172a" },
    tabBarLabelStyle: { fontSize: 12 },
    tabBarHideOnKeyboard: true,
  }}
/>
```

* **`tabBarHideOnKeyboard`** prevents the bar from covering text inputs on Android
* Safe area insets apply automatically - test on iPhone with home indicator
* **`tabBarBadge`** for unread counts - keep badges in sync with push notification state

## Gotchas

* **Every file in `(tabs)/` shows as a tab** - helper routes leak into the bar. **Fix:** `href: null` or move non-tab screens into a nested stack folder.
* **Drawer without gesture-handler root** - swipes silently fail. **Fix:** `GestureHandlerRootView` wrapping drawer layout; ensure `react-native-reanimated` Babel plugin is configured (default in SDK 57 template).
* **Double headers (tabs + stack)** - tab layout and nested stack both show headers. **Fix:** `headerShown: false` on tabs for folders that own a nested stack (`orders` tab pattern).
* **Tab state survives logout** - previous user's stack remains in memory. **Fix:** Remount `(tabs)` with `key={userId}` on the layout or `router.replace` to auth.
* **Deep link to `/orders/5` with wrong tab focused** - user lands on detail but wrong tab highlighted. **Fix:** Ensure route lives under the correct tab folder; test universal links per tab.
* **Too many tabs (6+)** - iOS tab bar truncates labels. **Fix:** Move rare destinations to drawer, profile menu, or "More" stack.
* **Drawer on iPhone as primary nav** - thumb reach and discoverability suffer vs bottom tabs. **Fix:** Reserve drawer for tablet or 6+ destinations.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Bottom `Tabs` | 3–5 daily destinations | Flat IA with one linear flow |
| `Drawer` | Many sections, tablet-first | Simple 3-tab consumer app |
| Top material tabs (`@react-navigation/material-top-tabs`) | Swipeable content sections inside one area | App-wide primary navigation |
| Single `Stack` + hub screen | Very small apps, wizards | Users need one-tap section switching |
| Custom tab bar (`tabBar: () => <MyBar />`) | Branded FAB, animated bar | You only need tint colors - use `screenOptions` |
| iOS sidebar (`@react-navigation/drawer` permanent on iPad) | Split-view tablet layouts | Phone-only MVP |

## FAQs

How do I install drawer support?

```bash
npx expo install @react-navigation/drawer react-native-gesture-handler react-native-reanimated
```

Use `import { Drawer } from "expo-router/drawer"`. The SDK 57 template already includes Reanimated's Babel plugin.

How do I hide a route from the tab bar?

```tsx
<Tabs.Screen name="secret" options={{ href: null }} />
```

The route remains navigable via `router.push("/secret")` or `Link href="/secret"`.

Can one tab have a stack and others stay flat?

Yes - add `app/(tabs)/orders/_layout.tsx` with `<Stack />` while `explore.tsx` stays a single screen. Set `headerShown: false` on the orders tab entry in tabs layout.

How do I change the active tab programmatically?

```tsx
import { router } from "expo-router";
 
router.push("/(tabs)/explore");
```

Navigate to the tab's root path. Use `router.replace` when you should not preserve back history.

How do I add a middle FAB tab?

```tsx
<Tabs.Screen
  name="create"
  options={{
    tabBarButton: (props) => (
      <Pressable {...props} style={[props.style, styles.fab]}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    ),
  }}
/>
```

Style the custom button - ensure hit slop and accessibility label.

Should the drawer wrap tabs or the reverse?

**Drawer wrapping tabs** is most common - drawer for app sections, tabs for high-frequency subset. Tabs wrapping drawer is rare and confuses back behavior.

How do badges work on tab icons?

```tsx
<Tabs.Screen
  name="inbox"
  options={{
    tabBarBadge: 3,
    tabBarBadgeStyle: { backgroundColor: "#ef4444" },
  }}
/>
```

Update badge values from notification store or query cache - clear on tab focus if appropriate.

Do tabs preserve scroll position?

Yes - inactive tabs stay mounted by default (`lazy` only delays first mount). Use `unmountOnBlur: true` in screen options if memory pressure requires tearing down heavy tabs.

How do I test tab navigation in RNTL?

Use `expo-router/testing-library` `renderRouter` with a fixture `app` directory. Assert tab switches via `user.press` on tab labels and verify URL segments.

Can I use native iOS tab bar APIs?

Expo Router tabs use React Navigation's JS tab bar by default. For fully native UITabBar experiments, you'd leave file-based tabs - uncommon for most Expo teams. Prefer styling via `screenOptions` first.

## Related

* [Stack Navigation](https://docs.wahwei/reactnative.codeguides.io/expo-router/stack-navigation/) - nested stacks inside tabs
* [Route Groups & Organizing `app/`](https://docs.wahwei/reactnative.codeguides.io/expo-router/route-groups-and-organizing-app/) - `(tabs)` and `(drawer)` groups
* [Expo Router Basics](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/) - layout mental model
* [Link & href](https://docs.wahwei/reactnative.codeguides.io/expo-router/link-and-href/) - tab switching and prefetch
* [../expo-rules/navigation-and-routing-rules/navigation-and-routing-rules.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/navigation-and-routing-rules/) - layout review rules
* [../architecture-design/feature-sliced-design-for-rn/feature-sliced-design-for-rn.md](https://docs.wahwei/reactnative.codeguides.io/architecture-design/feature-sliced-design-for-rn/) - where feature screens live vs `app/`

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
