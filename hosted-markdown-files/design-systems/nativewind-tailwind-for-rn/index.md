# NativeWind (Tailwind for RN)

Utility classes, dark mode, and build setup on Expo.

Highlights / NativeWind (Tailwind for RN)

* NativeWind v4 maps Tailwind classes to RN style objects at build time via Metro
* global.css + tailwind.config content paths must include app/ and components/
* dark: variants follow useColorScheme when darkMode is set to class
* Prefer semantic tokens in tailwind.config theme.extend - not arbitrary values in screens
* className composes like style arrays - later classes override earlier ones
* Profile bundle size before adopting on small apps - config cost has a floor

NativeWind brings **Tailwind CSS ergonomics** to React Native: `className="flex-1 p-4 bg-white dark:bg-slate-900"` instead of sprawling `StyleSheet` objects. On **Expo SDK 57**, NativeWind v4 hooks into Metro and compiles utilities to RN styles at build time - not a runtime CSS parser on device.

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx create-expo-app@latest MyWindApp --template blank-typescript
cd MyWindApp
npx expo install nativewind tailwindcss@^3.4.0 react-native-reanimated react-native-safe-area-context
npm install --save-dev prettier-plugin-tailwindcss
npx tailwindcss init
```

```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#2563eb", muted: "#93c5fd" },
      },
    },
  },
  plugins: [],
};
```

```css
/* global.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

```js
// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
 
const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: "./global.css" });
```

```ts
// nativewind-env.d.ts
/// <reference types="nativewind/types" />
```

```tsx
// app/_layout.tsx (Expo Router) or App.tsx
import "../global.css";
import { Stack } from "expo-router";
 
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

```tsx
// components/Card.tsx
import { Text, View } from "react-native";
 
export function Card({ title, body }: { title: string; body: string }) {
  return (
    <View className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">{title}</Text>
      <Text className="mt-1 text-sm text-slate-600 dark:text-slate-400">{body}</Text>
    </View>
  );
}
```

**When to reach for this:**

* Designers and engineers already use **Tailwind on web** and want the same utility vocabulary on mobile.
* You have **dozens of screens** where `StyleSheet` duplication is slowing velocity.
* Dark mode needs **`dark:` variants** tied to system scheme without hand-maintaining two palettes per component.
* You want **responsive-ish** utilities (`md:`, `lg:`) for tablet layouts alongside phone defaults.

## Working Example

Settings screen with system dark mode, semantic brand tokens, and a pressed-state button.

```tsx
// app/settings.tsx
import { Pressable, ScrollView, Text, useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
 
const ROWS = [
  { id: "profile", label: "Edit profile" },
  { id: "notifications", label: "Notifications" },
  { id: "privacy", label: "Privacy" },
] as const;
 
export default function SettingsScreen() {
  const scheme = useColorScheme() ?? "light";
 
  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <ScrollView contentContainerClassName="gap-3 p-4">
        <Text className="text-2xl font-bold text-slate-900 dark:text-slate-50">Settings</Text>
 
        <View className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          {ROWS.map((row) => (
            <Pressable
              key={row.id}
              accessibilityRole="button"
              className="border-b border-slate-100 px-4 py-3.5 active:bg-slate-100 dark:border-slate-800 dark:active:bg-slate-800"
            >
              <Text className="text-base text-slate-900 dark:text-slate-100">{row.label}</Text>
            </Pressable>
          ))}
        </View>
 
        <Pressable
          accessibilityRole="button"
          className="items-center rounded-xl bg-brand px-4 py-3.5 active:opacity-80"
        >
          <Text className="text-base font-semibold text-white">Save changes</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
```

```js
// tailwind.config.js - darkMode for class-based dark: utilities
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#2563eb", foreground: "#ffffff" },
      },
    },
  },
};
```

```tsx
// providers/ThemeModeProvider.tsx - optional in-app override
import { createContext, useContext, useEffect, useState } from "react";
import { Appearance, useColorScheme } from "react-native";
import { colorScheme } from "nativewind";
 
type Mode = "light" | "dark" | "system";
 
const ThemeModeContext = createContext<{ mode: Mode; setMode: (m: Mode) => void }>({
  mode: "system",
  setMode: () => {},
});
 
export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setMode] = useState<Mode>("system");
 
  useEffect(() => {
    if (mode === "system") {
      Appearance.setColorScheme(null);
      colorScheme.set(system === "dark" ? "dark" : "light");
    } else {
      Appearance.setColorScheme(mode);
      colorScheme.set(mode);
    }
  }, [mode, system]);
 
  return (
    <ThemeModeContext.Provider value={{ mode, setMode }}>{children}</ThemeModeContext.Provider>
  );
}
 
export function useThemeMode() {
  return useContext(ThemeModeContext);
}
```

**What this demonstrates:**

* **`withNativeWind`** in Metro compiles `global.css` and wires `className` on RN primitives.
* **`dark:`** variants respond to NativeWind's `colorScheme` API synced with `useColorScheme`.
* **`contentContainerClassName`** on `ScrollView` applies utilities to the scroll content wrapper.
* **Semantic `brand`** color in `theme.extend` - screens use `bg-brand`, not raw hex.
* **`active:`** pseudo-utility for press feedback without inline `StyleSheet` state.

## Deep Dive

### How It Works

* **NativeWind v4** uses a Metro transformer to parse Tailwind classes and emit React Native style objects at bundle time.
* **`nativewind/preset`** maps web Tailwind utilities to RN-supported properties - unsupported CSS is stripped or warned in dev.
* **`className`** is not a native prop - NativeWind patches supported components (`View`, `Text`, `Pressable`, etc.) via the `jsxImportSource` or Babel plugin depending on setup.
* **Dark mode** - with `darkMode: "class"`, call `colorScheme.set("dark")` from `nativewind` when overriding system appearance; `dark:` classes activate accordingly.
* **Tokens** - define design decisions in `tailwind.config.js` `theme.extend`; screens consume utilities, not one-off `text-[#334155]` arbitrary values.

### NativeWind vs StyleSheet

| Concern | StyleSheet + tokens | NativeWind |
| --- | --- | --- |
| Learning curve | RN-native | Tailwind vocabulary |
| Bundle overhead | Minimal | Config + compiler floor |
| Dark mode | Manual theme object | `dark:` variants |
| List hot paths | Stable references easy | Keep class strings static |
| Designer handoff | Token table | Utility class spec |

### TypeScript Notes

```ts
// nativewind-env.d.ts
/// <reference types="nativewind/types" />
```

* Add the reference file so `className` is typed on RN components.
* For third-party components without `className`, use `cssInterop` from NativeWind to map `className` → `style`.
* Keep **static class strings** in list `renderItem` - dynamic template literals defeat compile-time extraction.

### Expo Router Layout

```tsx
// app/_layout.tsx
import "../global.css";
import { ThemeModeProvider } from "../providers/ThemeModeProvider";
import { Stack } from "expo-router";
 
export default function RootLayout() {
  return (
    <ThemeModeProvider>
      <Stack />
    </ThemeModeProvider>
  );
}
```

Import `global.css` **once** at the root layout - child routes inherit compiled utilities.

## Gotchas

* **Missing `content` paths** - Tailwind purges unused classes; if `./app/**` is omitted, styles silently disappear. **Fix:** Include every folder with `className` strings.
* **Forgot `global.css` import** - Utilities never register. **Fix:** Import at root `App.tsx` or `app/_layout.tsx`.
* **Metro cache stale after config change** - Old styles persist. **Fix:** `npx expo start --clear` after `tailwind.config.js` edits.
* **Arbitrary values everywhere** - `p-[13px]` bypasses your scale. **Fix:** Extend `theme.spacing` and enforce in code review.
* **Dynamic class concatenation in lists** - `` `bg-${color}-500` `` breaks compile-time extraction. **Fix:** Use a fixed map: `const bg = { red: "bg-red-500", blue: "bg-blue-500" }`.
* **`dark:` without syncing colorScheme** - In-app toggle changes `Appearance` but not NativeWind. **Fix:** Call `colorScheme.set()` in your theme provider.
* **Third-party `TextInput` ignores className** - Not all components are patched. **Fix:** `cssInterop(TextInput, { className: "style" })` in a setup file.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| **NativeWind v4** | Tailwind team, many screens, dark variants | Two-screen app with five styles |
| **StyleSheet + tokens** | Minimal deps, full control | Designers mandate utility workflow |
| **Tamagui** | Compiled tokens + components + web | You only want class strings, not a component kit |
| **React Native Paper** | Material components out of the box | Custom brand unrelated to MD3 |
| **Unistyles** | Runtime themes with breakpoints | Team has zero RN styling library experience |

## FAQs

Does NativeWind work with Expo SDK 57?

Yes. Install via `npx expo install nativewind tailwindcss react-native-reanimated`, wrap Metro with `withNativeWind`, and import `global.css` at the app root. Clear Metro cache after config changes.

Where do I put design tokens?

In `tailwind.config.js` under `theme.extend` - colors, spacing, fontSize, borderRadius. Screens reference `text-brand`, `p-md`, not raw values. Align names with [Design Systems Basics](https://docs.wahwei/reactnative.codeguides.io/design-systems/design-systems-basics/).

How does dark mode work?

Set `darkMode: "class"` and use `dark:bg-slate-900` utilities. Sync with system via `useColorScheme`, or override with `colorScheme.set("dark")` from `nativewind` when the user picks an in-app theme. See [Dark Mode & Color Schemes](https://docs.wahwei/reactnative.codeguides.io/styling-layout/dark-mode-and-color-schemes/).

Can I use NativeWind with Expo Router?

Yes. Import `global.css` in `app/_layout.tsx`. Add `./app/**/*` to Tailwind `content` paths.

className vs style - which wins?

Treat `className` like a base layer and pass `style` for truly dynamic values (animated width). Avoid duplicating the same property in both.

Does NativeWind work on web (Expo web)?

NativeWind targets React Native views. Expo web may render some utilities, but validate layout separately - web-specific issues belong in [Styling Basics](https://docs.wahwei/reactnative.codeguides.io/styling-layout/styling-basics/).

How do I add custom fonts?

Load fonts with `expo-font`, then map `fontFamily` in `tailwind.config.js` `theme.extend`. See [Typography Scale & Font Loading](https://docs.wahwei/reactnative.codeguides.io/styling-layout/typography-scale-and-font-loading/).

Performance in FlatList?

Keep **static** `className` strings on row components. Extract rows to `memo()` children. Profile before assuming utilities are free - see [Style Performance](https://docs.wahwei/reactnative.codeguides.io/styling-layout/style-performance/).

## Related

* [Design Systems Basics](https://docs.wahwei/reactnative.codeguides.io/design-systems/design-systems-basics/) - tokens and component APIs before adopting a library
* [Dark Mode & Color Schemes](https://docs.wahwei/reactnative.codeguides.io/styling-layout/dark-mode-and-color-schemes/) - semantic palettes and `Appearance` API
* [Styling Basics](https://docs.wahwei/reactnative.codeguides.io/styling-layout/styling-basics/) - StyleSheet fundamentals NativeWind compiles toward
* [Tamagui](https://docs.wahwei/reactnative.codeguides.io/design-systems/tamagui/) - compiled design system alternative
* [Style Performance](https://docs.wahwei/reactnative.codeguides.io/styling-layout/style-performance/) - list hot paths and style reference stability
* [Accessibility Basics](https://docs.wahwei/reactnative.codeguides.io/accessibility/accessibility-basics/) - `accessibilityRole` on styled pressables

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
