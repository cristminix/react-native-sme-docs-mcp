# Dark Mode & Color Schemes

`useColorScheme`, dynamic palettes, and system sync.

Highlights / Dark Mode & Color Schemes

* useColorScheme returns 'light', 'dark', or null - branch styles from a token object
* Define semantic tokens (background, text, border) - not raw hex per component
* Appearance.setColorScheme overrides system choice for in-app toggle
* Expo userInterfaceStyle in app.json sets the app-level default and splash behavior
* StatusBar and navigation bar styles must follow the active scheme
* Test both schemes - automatic OS sync is the default users expect

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import { useColorScheme, StyleSheet, Text, View } from "react-native";
 
const colors = {
  light: { background: "#ffffff", text: "#0f172a", muted: "#64748b", border: "#e2e8f0" },
  dark: { background: "#0f172a", text: "#f8fafc", muted: "#94a3b8", border: "#334155" },
} as const;
 
export function ThemedCard({ title, body }: { title: string; body: string }) {
  const scheme = useColorScheme() ?? "light";
  const theme = colors[scheme];
 
  return (
    <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.body, { color: theme.muted }]}>{body}</Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 6 },
  title: { fontSize: 17, fontWeight: "600" },
  body: { fontSize: 15, lineHeight: 22 },
});
```

**When to reach for this:** Any screen that must respect the system light/dark setting - or offer an in-app override - without maintaining two separate component trees.

## Working Example

```tsx
import { useCallback, useMemo, useState } from "react";
import {
  Appearance,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
 
type Scheme = "light" | "dark";
type Preference = "system" | Scheme;
 
const palette = {
  light: {
    background: "#f8fafc",
    surface: "#ffffff",
    text: "#0f172a",
    subtext: "#475569",
    accent: "#2563eb",
    border: "#cbd5e1",
  },
  dark: {
    background: "#020617",
    surface: "#0f172a",
    text: "#f8fafc",
    subtext: "#94a3b8",
    accent: "#60a5fa",
    border: "#334155",
  },
} as const;
 
function useAppColorScheme(): Scheme {
  const system = useColorScheme();
  return system === "dark" ? "dark" : "light";
}
 
export default function SettingsAppearanceScreen() {
  const scheme = useAppColorScheme();
  const theme = palette[scheme];
  const [preference, setPreference] = useState<Preference>("system");
 
  const applyPreference = useCallback((next: Preference) => {
    setPreference(next);
    if (next === "system") {
      Appearance.setColorScheme(null); // follow OS again
    } else {
      Appearance.setColorScheme(next);
    }
  }, []);
 
  const styles = useMemo(() => makeStyles(theme), [theme]);
 
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
 
      <Text style={styles.heading}>Appearance</Text>
      <Text style={styles.subheading}>
        System is {scheme}. Preference: {preference}.
      </Text>
 
      <View style={styles.card}>
        {(["system", "light", "dark"] as const).map((option) => (
          <Pressable
            key={option}
            onPress={() => applyPreference(option)}
            style={[styles.row, preference === option && styles.rowActive]}
          >
            <Text style={styles.rowLabel}>{option}</Text>
            {preference === option && <Text style={styles.check}>✓</Text>}
          </Pressable>
        ))}
      </View>
 
      <View style={[styles.preview, { backgroundColor: theme.surface }]}>
        <Text style={styles.previewTitle}>Preview card</Text>
        <Text style={styles.previewBody}>Semantic tokens swap with the active scheme.</Text>
      </View>
    </SafeAreaView>
  );
}
 
function makeStyles(theme: (typeof palette)[Scheme]) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background, padding: 16, gap: 12 },
    heading: { fontSize: 28, fontWeight: "700", color: theme.text },
    subheading: { fontSize: 15, color: theme.subtext },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    rowActive: { backgroundColor: theme.background },
    rowLabel: { fontSize: 16, color: theme.text, textTransform: "capitalize" },
    check: { color: theme.accent, fontWeight: "700" },
    preview: {
      borderRadius: 12,
      padding: 16,
      gap: 6,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    previewTitle: { fontSize: 17, fontWeight: "600", color: theme.text },
    previewBody: { fontSize: 15, lineHeight: 22, color: theme.subtext },
  });
}
```

**What this demonstrates:**

* `useColorScheme()` reading the active system scheme (`"light"` | `"dark"` | `null`).
* Semantic **token objects** (`background`, `surface`, `text`) instead of hard-coded hex in components.
* `Appearance.setColorScheme()` for an in-app light/dark/system preference toggle.
* `StatusBar` from `expo-status-bar` switching `style` with the active scheme.
* `useMemo` to rebuild `StyleSheet` when the theme changes.

## Deep Dive

### How It Works

* **`useColorScheme`** is a React hook from `react-native` that subscribes to the OS appearance setting. It returns `"light"`, `"dark"`, or `null` (unknown / unavailable) and re-renders when the user toggles system dark mode.
* **`Appearance` API** - `Appearance.getColorScheme()` for one-shot reads; `Appearance.addChangeListener` for manual subscriptions; `Appearance.setColorScheme("dark" | "light" | null)` to override the app independently of the system (`null` restores system sync).
* **Semantic tokens** - Define colors by role (`textPrimary`, `borderSubtle`) not by value (`gray500`). Components reference roles; the palette maps roles to hex per scheme.
* **Expo `userInterfaceStyle`** - In `app.json` / `app.config.js`, `"userInterfaceStyle": "automatic"` follows the OS (default). `"light"` or `"dark"` locks the app regardless of system setting.
* **Native chrome** - Status bar, Android navigation bar, and iOS home indicator areas must use contrasting styles per scheme (see [Safe Areas & Notches](https://docs.wahwei/reactnative.codeguides.io/styling-layout/safe-areas-and-notches/)).

### useColorScheme vs Appearance

| API | Type | Use for |
| --- | --- | --- |
| `useColorScheme()` | Hook - triggers re-render | Component styles, themed JSX |
| `Appearance.getColorScheme()` | Snapshot | Module-level one-time checks (rare) |
| `Appearance.addChangeListener` | Event subscription | Non-React code paths (prefer hook in components) |
| `Appearance.setColorScheme()` | Override | In-app theme picker (system / light / dark) |

```tsx
import { Appearance, useColorScheme } from "react-native";
 
// In a component - reactive
function Banner() {
  const scheme = useColorScheme() ?? "light";
  return <View style={{ backgroundColor: scheme === "dark" ? "#1e293b" : "#fff" }} />;
}
 
// Override for in-app toggle
Appearance.setColorScheme("dark");  // force dark
Appearance.setColorScheme(null);    // follow system again
```

### Token Structure Patterns

**Flat palette (small apps)**

```tsx
const colors = {
  light: { bg: "#fff", text: "#111", accent: "#2563eb" },
  dark: { bg: "#111", text: "#f8fafc", accent: "#60a5fa" },
};
```

**Semantic roles (recommended)**

```tsx
const tokens = {
  light: {
    backgroundPrimary: "#ffffff",
    textPrimary: "#0f172a",
    borderDefault: "#e2e8f0",
  },
  dark: {
    backgroundPrimary: "#0f172a",
    textPrimary: "#f8fafc",
    borderDefault: "#334155",
  },
};
```

**Context provider (shared access)**

```tsx
import { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
 
type Theme = (typeof palette)["light"];
 
const ThemeContext = createContext<Theme>(palette.light);
 
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme() ?? "light";
  const theme = useMemo(() => palette[scheme], [scheme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
 
export function useTheme() {
  return useContext(ThemeContext);
}
```

### Expo app.json Configuration

```json
{
  "expo": {
    "userInterfaceStyle": "automatic",
    "ios": { "userInterfaceStyle": "automatic" },
    "android": { "userInterfaceStyle": "automatic" }
  }
}
```

* `"automatic"` - follow OS (recommended default).
* `"light"` / `"dark"` - lock the app; `useColorScheme` still reports the forced value.
* Splash screen background should match the launch scheme to avoid a flash.

### TypeScript Notes

```tsx
import { ColorSchemeName, useColorScheme } from "react-native";
 
type Scheme = "light" | "dark";
 
function resolveScheme(name: ColorSchemeName): Scheme {
  return name === "dark" ? "dark" : "light";
}
 
function useResolvedScheme(): Scheme {
  return resolveScheme(useColorScheme());
}
 
// Typed palette - exhaustiveness checked
const palette: Record<Scheme, { background: string; text: string }> = {
  light: { background: "#fff", text: "#111" },
  dark: { background: "#111", text: "#fff" },
};
```

* `ColorSchemeName` is `"light" | "dark" | null | undefined`.
* Always handle `null` - default to `"light"` or your app's fallback.

## Gotchas

* **Hard-coded colors in `StyleSheet.create` at module scope** - Styles are frozen at load time; they do not react to scheme changes. **Fix:** Build styles inside the component with `useMemo`, or apply dynamic colors inline: `style={[styles.card, { backgroundColor: theme.surface }]}`.
* **Ignoring `null` from `useColorScheme`** - On some paths the hook returns `null`. **Fix:** `const scheme = useColorScheme() ?? "light"`.
* **Light status bar on a light background** - White-on-white status bar icons disappear. **Fix:** `StatusBar style="dark"` in light mode, `style="light"` in dark mode.
* **Forgetting images and icons** - Logos and illustrations designed for white backgrounds look wrong on dark surfaces. **Fix:** Provide `@2x` dark variants, use `tintColor`, or wrap in a themed container.
* **`Appearance.setColorScheme` without persisting preference** - User's choice resets on restart. **Fix:** Store preference in `AsyncStorage` / MMKV and apply on app launch before first paint.
* **Locked `userInterfaceStyle: "light"` in app.json while building dark UI** - Config contradicts your theme work. **Fix:** Use `"automatic"` unless you intentionally ship a single-scheme app.
* **Semi-transparent overlays** - `rgba(0,0,0,0.5)` works on light; on dark backgrounds the same overlay can look muddy. **Fix:** Define separate overlay tokens per scheme.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `useColorScheme` + token object | Default - zero deps, full control | You need complex theming with breakpoints and media queries |
| React Context `ThemeProvider` | Many nested components share tokens | One-off screens (inline branch is fine) |
| `Appearance.setColorScheme` | In-app light/dark/system toggle | Replacing token definitions - it only changes the active scheme |
| `@react-navigation/native` theme | Navigation chrome matches app colors | Non-navigation UI (still need your own tokens) |
| `react-native-unistyles` / Tamagui / NativeWind | Design-system scale, responsive + dark tokens | Simple apps with a dozen colors |
| `expo-system-ui` | Set root background color natively on scheme change | Component-level text colors |

## FAQs

What does useColorScheme return?

`"light"`, `"dark"`, or `null`. Treat `null` as unknown and fall back to `"light"` (or your app's default). The hook re-renders the component when the OS appearance changes.

How do I add an in-app dark mode toggle?

```tsx
import { Appearance } from "react-native";
 
Appearance.setColorScheme("dark");  // force dark
Appearance.setColorScheme("light"); // force light
Appearance.setColorScheme(null);    // follow system
```

Persist the user's choice and re-apply on cold start. `useColorScheme` reflects the effective scheme after override.

Should I use StyleSheet.create for themed styles?

Static keys (fontSize, fontWeight, borderRadius) can live in a static `StyleSheet`. Colors that change per scheme should be applied dynamically - either rebuild styles with `useMemo` when the scheme changes, or use `style={[styles.base, { color: theme.text }]}`.

What is userInterfaceStyle in app.json?

Expo config that sets the app-level appearance policy: `"automatic"` (follow OS), `"light"`, or `"dark"`. It affects splash screen and native shell defaults. Prefer `"automatic"` for most apps.

How do I theme the status bar?

```tsx
import { StatusBar } from "expo-status-bar";
 
<StatusBar style={scheme === "dark" ? "light" : "dark"} />
```

Light content (white icons) on dark backgrounds; dark content on light backgrounds.

Gotcha: Why do my colors not update when I toggle system dark mode?

You likely hard-coded colors in a module-level `StyleSheet.create`. Move color values to a palette keyed by scheme and apply them in render, or rebuild styles when `useColorScheme` changes.

Should I define separate components for light and dark?

No - branch styles, not trees. One component structure with theme tokens is easier to maintain than duplicated JSX for each scheme.

How do semantic tokens help?

Components reference `theme.text` instead of `#0f172a`. When you adjust the dark palette, every screen updates. Renaming `gray-700` to a role like `textSecondary` survives palette overhauls.

Does React Navigation respect dark mode?

Pass a `theme` and `darkTheme` to `NavigationContainer` using your token palette. Screen content still needs its own `useColorScheme` branching - navigation theming only covers headers, tabs, and cards built into the navigator.

How do I avoid a white flash on launch in dark mode?

Set splash `backgroundColor` to your dark `background` token in `app.json`. Use `expo-system-ui` to set the root view background. Apply theme before rendering the first screen.

Can I detect dark mode outside a React component?

`Appearance.getColorScheme()` returns the current value synchronously. For reactive UI, prefer `useColorScheme` in components or `Appearance.addChangeListener` in non-UI modules.

How do shadows and borders change in dark mode?

Shadows are less visible on dark backgrounds - rely more on border tokens (`borderColor: theme.border`) and subtle surface elevation. See [Shadows, Elevation & Borders](https://docs.wahwei/reactnative.codeguides.io/styling-layout/shadows-elevation-and-borders/).

What about images that only work on light backgrounds?

Use `scheme === "dark"` to swap `source`, apply a light `tintColor`, or place the image on a fixed `surface` container that stays light in both schemes (e.g., brand logo lockup).

Does useColorScheme work with Expo Router?

Yes - it is a standard React Native hook. Use it in any client screen or layout. It updates when the system appearance changes while the app is running.

How does dark mode interact with safe areas?

Safe area insets are independent of color scheme, but status bar contrast depends on both. Coordinate `StatusBar` style with your header background. See [Safe Areas & Notches](https://docs.wahwei/reactnative.codeguides.io/styling-layout/safe-areas-and-notches/).

## Related

* [Styling Basics](https://docs.wahwei/reactnative.codeguides.io/styling-layout/styling-basics/) - StyleSheet vs inline styles and dynamic color application
* [Safe Areas & Notches](https://docs.wahwei/reactnative.codeguides.io/styling-layout/safe-areas-and-notches/) - status bar style on edge-to-edge screens
* [Shadows, Elevation & Borders](https://docs.wahwei/reactnative.codeguides.io/styling-layout/shadows-elevation-and-borders/) - platform shadows that need per-scheme tuning
* [Typography Scale & Font Loading](https://docs.wahwei/reactnative.codeguides.io/styling-layout/typography-scale-and-font-loading/) - readable text contrast in both schemes
* [Responsive & Adaptive Layout](https://docs.wahwei/reactnative.codeguides.io/styling-layout/responsive-and-adaptive-layout/) - layout tokens that may also vary by breakpoint
* [Views, Text & Core Components](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/views-text-and-core-components/) - `Text` color inheritance and nesting

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

cGJxcnRodnFyZi52YnxwdHZiODg5fDIwMjYwNw==

Reviewed by Chris St. John·Last updated Jul 19, 2026
