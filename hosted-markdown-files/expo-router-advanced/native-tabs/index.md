# Native Tabs

Platform tab bars via Expo Router native tabs API. `NativeTabs` from `expo-router/unstable-native-tabs` renders **UIKit / Material** tab bars - including iOS liquid glass styling - instead of JavaScript-drawn tabs. The API is **alpha** in SDK 57; pin behavior in QA before shipping production UX that depends on edge cases.

Highlights / Native Tabs

* NativeTabs from expo-router/unstable-native-tabs - alpha in SDK 57, uses system tab bars
* Unlike Stack/Tabs, routes are NOT auto-added - declare each NativeTabs.Trigger explicitly
* Nest Stack inside each tab folder for headers and push navigation
* SDK 55+ uses NativeTabs.Trigger.Icon / .Label / .Badge compound API
* hidden on Trigger removes a tab; disabled only blocks tab bar taps - router.push still works
* Fall back to JavaScript Tabs when you need fully custom tab bar UI

## Recipe

> Quick-reference recipe card - copy-paste ready.

```text
app/
├── _layout.tsx              # NativeTabs root
├── index.tsx                # first tab
├── explore.tsx
└── settings/
    ├── _layout.tsx          # Stack inside tab
    └── index.tsx
```

```tsx
// app/_layout.tsx - SDK 57 (SDK 55+ compound API)
import { NativeTabs } from "expo-router/unstable-native-tabs";
 
export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "house", selected: "house.fill" }}
          md="home"
        />
      </NativeTabs.Trigger>
 
      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="safari" md="explore" />
      </NativeTabs.Trigger>
 
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gear" md="settings" />
        <NativeTabs.Trigger.Badge>2</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
```

```tsx
// app/settings/_layout.tsx - stack per tab (headers + push)
import { Stack } from "expo-router";
 
export default function SettingsStack() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Settings" }} />
      <Stack.Screen name="account" options={{ title: "Account" }} />
    </Stack>
  );
}
```

**When to reach for this:**

* **Platform-native tab chrome** - liquid glass, SF Symbols, system blur
* **Accessibility** - system tab bar VoiceOver / TalkBack behavior
* **Performance** - less JS layout work vs custom tab bars
* **Badges and native scroll-to-top** on tab re-tap (Android SDK 55+)

## Working Example

Native tabs with per-tab stacks, dynamic badge, conditional tab visibility, and iOS dynamic colors.

```tsx
// app/_layout.tsx
import { DynamicColorIOS } from "react-native";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useUnreadCount } from "@/features/inbox";
 
export default function TabLayout() {
  const unread = useUnreadCount();
  const showInbox = true; // feature flag - set before mount, not toggled live
 
  return (
    <NativeTabs
      labelStyle={{
        color: DynamicColorIOS({ dark: "white", light: "black" }),
      }}
      tintColor={DynamicColorIOS({ dark: "white", light: "#007AFF" })}
    >
      <NativeTabs.Trigger name="index" disablePopToTop={false}>
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "house", selected: "house.fill" }}
          md={{ default: "home", selected: "home" }}
        />
      </NativeTabs.Trigger>
 
      <NativeTabs.Trigger name="inbox" hidden={!showInbox}>
        <NativeTabs.Trigger.Label>Inbox</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="tray" md="inbox" />
        {unread > 0 && <NativeTabs.Trigger.Badge>{unread > 9 ? "9+" : unread}</NativeTabs.Trigger.Badge>}
      </NativeTabs.Trigger>
 
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label hidden />
        <NativeTabs.Trigger.Icon sf="gear" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
```

```tsx
// app/inbox/_layout.tsx
import { Stack } from "expo-router";
 
export default function InboxStack() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Inbox" }} />
      <Stack.Screen name="[id]" options={{ title: "Message" }} />
    </Stack>
  );
}
```

```tsx
// Hiding tab bar on focused screen (SDK 55+ hidden prop on NativeTabs)
import { createContext, use, useState } from "react";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useFocusEffect } from "expo-router";
 
export const TabBarContext = createContext({
  setTabBarHidden: (_hidden: boolean) => {},
});
 
export default function TabLayout() {
  const [hidden, setTabBarHidden] = useState(false);
 
  return (
    <TabBarContext value={{ setTabBarHidden }}>
      <NativeTabs hidden={hidden}>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </TabBarContext>
  );
}
 
// In immersive screen:
export function useHideTabBarOnFocus() {
  const { setTabBarHidden } = use(TabBarContext);
  useFocusEffect(() => {
    setTabBarHidden(true);
    return () => setTabBarHidden(false);
  });
}
```

## Deep Dive

### Native tabs vs JavaScript tabs

|  | `NativeTabs` | `Tabs` (expo-router) |
| --- | --- | --- |
| Tab bar rendering | Native system | React Navigation JS |
| Route registration | Manual `Trigger` per route | Auto from `app/` files |
| Custom tab bar UI | Limited | `tabBar` prop, full custom |
| Stack inside tab | ✅ Recommended | ✅ |
| `Tabs.Protected` | Use root `Stack.Protected` wrapping tabs | ✅ Built-in |
| Status | Alpha (SDK 54+) | Stable |

### Icon sources

```tsx
<NativeTabs.Trigger.Icon
  sf={{ default: "star", selected: "star.fill" }}  // SF Symbols (iOS)
  md={{ default: "star", selected: "star" }}     // Material Symbols (Android)
  src={require("@/assets/icon.png")}             // Custom image
  xcasset="home-icon"                            // iOS asset catalog (SDK 55+)
  renderingMode="template"                       // iOS tint vs original colors
/>
```

* **`sf` takes precedence on iOS** over `src`; Android uses `src` / `md`.
* **Distinct selected icons on Android** need SDK 56+ / `react-native-screens` 4.25+.
* **Vector icon fonts** - rasterize with `@react-native-vector-icons/get-image` at module scope.

### Tab interaction props (SDK 55+)

| Prop | Platform | Behavior |
| --- | --- | --- |
| `disablePopToTop` | Android | Re-tap does not pop stack to root |
| `disableScrollToTop` | Android | Re-tap does not scroll list to top |
| `hidden` | Both | Tab not shown; **not navigable** |
| `disabled` | SDK 56+ | Tab visible but not tappable; **JS navigation still works** |

> Dynamically hiding tabs **remounts** the navigator and resets state. Toggle visibility before first mount or when the tab bar is not visible.

### Nesting with root stack

```tsx
// app/_layout.tsx at project root is often a Stack, not NativeTabs
import { Stack } from "expo-router";
 
export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="compose" options={{ presentation: "modal" }} />
    </Stack>
  );
}
 
// app/(tabs)/_layout.tsx - NativeTabs live one level down
```

See [Nested Navigators](https://docs.wahwei/reactnative.codeguides.io/expo-router-advanced/nested-navigators/).

## Gotchas

* **Forgetting `NativeTabs.Trigger`** - Files in `app/` do not appear in the tab bar automatically. **Fix:** Add a `Trigger` for every routable tab.
* **Using `disabled` for auth gating** - `router.push('/settings')` bypasses disabled. **Fix:** `Stack.Protected` at root.
* **Toggling `hidden` at runtime** - Remounts navigator; loses stack state. **Fix:** Feature flags resolved before first render.
* **Custom tab bar branding** - Native tabs follow system chrome. **Fix:** JavaScript [custom tabs](https://docs.expo.dev/router/advanced/custom-tabs/) or `Tabs` with `tabBar` prop.
* **Expecting `Tabs.Protected` on NativeTabs** - Use outer stack guards. **Fix:** Wrap `(tabs)` group in `Stack.Protected`.
* **Alpha API breaking changes** - Pin `expo-router` and read SDK changelog before upgrade. **Fix:** QA tab icons, badges, and back behavior each SDK bump.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `NativeTabs` | System-native look, liquid glass iOS | Fully custom tab bar design |
| JavaScript `Tabs` | `Tabs.Protected`, custom `tabBar` | You need UIKit tab bar fidelity |
| Custom tabs (`expo-router/ui`) | Marketing-heavy branded chrome | You want zero maintenance of tab primitives |
| Bottom sheet nav | Single primary action surface | Standard 3–5 section app |
| No tabs - drawer only | Many sections, few top-level | Phone-first 4-tab product pattern |

## FAQs

How do I migrate from JavaScript Tabs to NativeTabs?

1. Replace `import { Tabs }` with `NativeTabs` from `expo-router/unstable-native-tabs`.
2. Add `NativeTabs.Trigger` for each former `Tabs.Screen`.
3. Move icons into `NativeTabs.Trigger.Icon` (SDK 55+ compound API).
4. Keep per-tab `_layout.tsx` stacks unchanged.

Can native tabs use expo-router typed routes?

* Yes - `name` on `Trigger` matches the route file (`index`, `settings`, folder names).
* `Link href="/settings/account"` works the same as with JavaScript tabs.

How do badges update with new messages?

* Re-render `NativeTabs.Trigger.Badge` when unread count changes.
* Badge is declarative - no imperative API.
* Empty badge dot: `<NativeTabs.Trigger.Badge />` with no children.

Why do selected icons look the same on Android?

* Distinct `selected` variants for `src` / `md` require SDK 56+ and `react-native-screens` 4.25+.
* Upgrade or use `@react-native-vector-icons/get-image` with separate glyphs.

Native tabs vs compound in-screen tabs?

* **NativeTabs** - route-level navigation; each tab is a URL.
* **Compound tabs** (component patterns) - local panel switching inside one screen.
* See [../component-patterns/compound-components/compound-components.md](https://docs.wahwei/reactnative.codeguides.io/component-patterns/compound-components/).

Is NativeTabs production-ready?

* Documented as **alpha** - API may change.
* Suitable for teams that accept SDK churn and test on real devices each release.
* Use stable JavaScript `Tabs` when compliance requires frozen navigation APIs.

## Related

* [Nested Navigators](https://docs.wahwei/reactnative.codeguides.io/expo-router-advanced/nested-navigators/) - stacks inside native tabs
* [Protected Routes & Middleware](https://docs.wahwei/reactnative.codeguides.io/expo-router-advanced/protected-routes-and-middleware/) - auth above tab shell
* [Split View & Tablet Layouts](https://docs.wahwei/reactnative.codeguides.io/expo-router-advanced/split-view-and-tablet-layouts/) - tablet patterns beyond bottom tabs
* [../expo-router/tabs-and-drawers/tabs-and-drawers.md](https://docs.wahwei/reactnative.codeguides.io/expo-router/tabs-and-drawers/) - JavaScript tabs baseline
* [../expo-router/stack-navigation/stack-navigation.md](https://docs.wahwei/reactnative.codeguides.io/expo-router/stack-navigation/) - per-tab stack headers
* [../ios-platform/ios-basics-for-rn-devs/ios-basics-for-rn-devs.md](https://docs.wahwei/reactnative.codeguides.io/ios-platform/ios-basics-for-rn-devs/) - SF Symbols and HIG context

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
