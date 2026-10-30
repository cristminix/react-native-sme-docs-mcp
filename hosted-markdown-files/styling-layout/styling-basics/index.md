# Styling Basics

10 examples to get you started with Styling & Layout - 7 basic and 3 intermediate.

Highlights / Styling Basics

* React Native styles are JavaScript objects - no CSS cascade, classes, or selectors
* StyleSheet.create validates properties and sends cached IDs to the native layer
* Flexbox defaults to column direction - the opposite of most web layouts
* Combine styles with arrays; later entries override earlier ones
* useColorScheme reads the system light/dark preference for dynamic palettes
* SafeAreaView from react-native-safe-area-context clears notches and home indicators
* Platform.select is the idiomatic way to branch iOS shadow vs Android elevation

## Prerequisites

React Native styling runs in a native layout engine, not a browser. The fastest way to try these snippets is an **Expo** project with the default TypeScript template.

```bash
npx create-expo-app@latest MyApp
cd MyApp
npx expo start
```

Replace `App.tsx` with any example below. `react-native-safe-area-context` ships with Expo - wrap your root in `SafeAreaProvider` (the default template already does).

> **Tooling:** These examples target **Expo SDK 57**, **React Native 0.86**, and **React 19.2.3**. Dimensions are in density-independent pixels (dp), not `rem` or `em`.

---

## Basic Examples

### 1. StyleSheet.create

Define reusable style objects with `StyleSheet.create` instead of scattering literals through JSX.

```tsx
import { View, Text, StyleSheet } from "react-native";
 
export default function App() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>StyleSheet.create</Text>
      <Text style={styles.body}>
        Named keys keep styles organized and validated at dev time.
      </Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  card: {
    margin: 16,
    padding: 20,
    backgroundColor: "#f0f4ff",
    borderRadius: 12,
  },
  title: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 20, color: "#374151" },
});
```

* Property names use **camelCase** (`backgroundColor`, `borderRadius`) - hyphenated CSS names are invalid
* `StyleSheet.create` **validates keys in development** and registers styles once so the native side receives stable IDs
* Only a **subset of CSS** is supported - no pseudo-selectors, no inheritance, no `vh`/`vw` units
* Keep `styles` at module scope so they are not recreated on every render

> **Related:** [Style Performance](https://docs.wahwei/reactnative.codeguides.io/styling-layout/style-performance/) - why cached styles matter on mobile | [Styling Best Practices](https://docs.wahwei/reactnative.codeguides.io/styling-layout/best-practices/) - naming and file organization

---

### 2. Inline vs Cached Styles

Inline style objects work for one-offs, but a new object reference is created every render unless you memoize it.

```tsx
import { View, Text, StyleSheet } from "react-native";
 
const PADDING = 16;
 
export default function App() {
  const isHighlighted = true;
 
  return (
    <View style={styles.container}>
      <View style={styles.box}>
        <Text>Cached via StyleSheet</Text>
      </View>
      <View style={{ padding: PADDING, backgroundColor: "#fde68a" }}>
        <Text>Inline literal - fine for rare one-offs</Text>
      </View>
      <View
        style={[
          styles.box,
          isHighlighted && { borderWidth: 2, borderColor: "#2563eb" },
        ]}
      >
        <Text>Cached base + small inline override</Text>
      </View>
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  box: { padding: 16, backgroundColor: "#bbf7d0", borderRadius: 8 },
});
```

* `style={{ padding: 16 }}` allocates a **new object each render** - harmless for a single static prop, costly when passed deep into lists
* Prefer `StyleSheet.create` for anything **reused or composed** across components
* Small dynamic overrides (a border color from props) inline or via `useMemo` are acceptable - profile before optimizing
* Constants like `PADDING` at module scope avoid magic numbers without triggering re-creation

> **Related:** [Style Performance](https://docs.wahwei/reactnative.codeguides.io/styling-layout/style-performance/) - `useMemo` for dynamic styles and list pitfalls

---

### 3. Flex Column Default

Every `View` is a flex container. The default `flexDirection` is **`column`**, not `row` like many web layouts assume.

```tsx
import { View, Text, StyleSheet } from "react-native";
 
export default function App() {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.label}>Header (stacked first)</Text>
      </View>
      <View style={styles.main}>
        <Text style={styles.label}>Main content fills middle</Text>
      </View>
      <View style={styles.footer}>
        <Text style={styles.label}>Footer (stacked last)</Text>
      </View>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  header: { padding: 12, backgroundColor: "#dbeafe", borderRadius: 8 },
  main: { flex: 1, justifyContent: "center", alignItems: "center", marginVertical: 12 },
  footer: { padding: 12, backgroundColor: "#f3f4f6", borderRadius: 8 },
  label: { fontWeight: "600" },
});
```

* Children stack **top to bottom** without any explicit direction - this is the RN layout mental model
* `flex: 1` on `main` makes it **consume remaining vertical space** between header and footer
* `justifyContent` aligns along the main axis (vertical here); `alignItems` along the cross axis (horizontal)
* Switch to `flexDirection: "row"` when you need side-by-side siblings - covered in depth in the flexbox guide

> **Related:** [Flexbox Deep Dive](https://docs.wahwei/reactnative.codeguides.io/styling-layout/flexbox-deep-dive/) - direction, flex grow/shrink, and common recipes

---

### 4. Padding, Margin, and Gap

Spacing in React Native uses the same box model as CSS, with shorthand and per-edge props - all numbers are dp.

```tsx
import { View, Text, StyleSheet } from "react-native";
 
export default function App() {
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Spacing primitives</Text>
        <View style={styles.row}>
          <View style={styles.chip}>
            <Text>A</Text>
          </View>
          <View style={styles.chip}>
            <Text>B</Text>
          </View>
          <View style={styles.chip}>
            <Text>C</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, backgroundColor: "#f9fafb" },
  card: {
    padding: 20,
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  title: { marginBottom: 12, fontWeight: "600" },
  row: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#e0e7ff",
    borderRadius: 16,
  },
});
```

* `padding` affects **inside** the element; `margin` pushes away from siblings and parent edges
* Use `paddingHorizontal` / `paddingVertical` (or `marginTop`, etc.) when edges need different values
* `gap` (RN 0.71+) adds space **between flex children** without margin on every child - prefer it in rows and grids
* Negative margins are not supported - use transforms or adjust parent padding instead

> **Related:** [Typography Scale & Font Loading](https://docs.wahwei/reactnative.codeguides.io/styling-layout/typography-scale-and-font-loading/) - line height and readable text spacing | [Styling Best Practices](https://docs.wahwei/reactnative.codeguides.io/styling-layout/best-practices/) - spacing scales and tokens

---

### 5. Composing Styles with Arrays

Pass an array to `style` to layer base, state, and override styles - later entries win on conflicting keys.

```tsx
import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
 
export default function App() {
  const [active, setActive] = useState(false);
 
  return (
    <View style={styles.container}>
      <Pressable onPress={() => setActive((v) => !v)}>
        <View style={[styles.tab, active && styles.tabActive]}>
          <Text style={[styles.tabText, active && styles.tabTextActive]}>
            {active ? "Active" : "Inactive"}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#e5e7eb",
  },
  tabActive: { backgroundColor: "#2563eb" },
  tabText: { color: "#374151", fontWeight: "500" },
  tabTextActive: { color: "#fff" },
});
```

* `style={[styles.base, condition && styles.modifier]}` is the standard pattern for **state-driven UI**
* Falsy entries (`false`, `undefined`) are ignored - no need to filter the array manually
* Order matters: `[styles.a, styles.b]` means `b` overrides `a` on duplicate keys
* `Pressable` also accepts a style **function** `({ pressed }) => [...]` for touch feedback - pair with arrays for complex states

> **Related:** [Flexbox Deep Dive](https://docs.wahwei/reactnative.codeguides.io/styling-layout/flexbox-deep-dive/) - aligning composed layouts | [Dark Mode & Color Schemes](https://docs.wahwei/reactnative.codeguides.io/styling-layout/dark-mode-and-color-schemes/) - theme-aware style arrays

---

### 6. useColorScheme Intro

Read the user's system appearance preference and swap background and text colors without a separate theme library.

```tsx
import { View, Text, useColorScheme, StyleSheet } from "react-native";
 
const palette = {
  light: { bg: "#ffffff", text: "#111827", card: "#f3f4f6" },
  dark: { bg: "#111827", text: "#f9fafb", card: "#1f2937" },
};
 
export default function App() {
  const scheme = useColorScheme() ?? "light";
  const colors = palette[scheme];
 
  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          System scheme: {scheme}
        </Text>
        <Text style={{ color: colors.text, opacity: 0.7 }}>
          Toggle light/dark in device settings to see this update.
        </Text>
      </View>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, justifyContent: "center" },
  card: { padding: 20, borderRadius: 12 },
  title: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
});
```

* `useColorScheme()` returns `"light"`, `"dark"`, or `null` - **default to `"light"`** when null (some Android configs)
* A plain `palette` object is enough to start; extract tokens to a shared module as the app grows
* Dynamic colors inline (`{ color: colors.text }`) are fine here because the scheme changes rarely
* For navigation bars, status bar, and persisted user overrides, see the dedicated dark-mode guide

> **Related:** [Dark Mode & Color Schemes](https://docs.wahwei/reactnative.codeguides.io/styling-layout/dark-mode-and-color-schemes/) - dynamic palettes, `Appearance`, and system sync

---

### 7. SafeAreaView

Keep screen content clear of notches, status bars, and home indicators by wrapping the root in `SafeAreaView`.

```tsx
import { Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
 
export default function App() {
  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Safe Area Layout</Text>
      <Text style={styles.body}>
        Content respects system insets on iOS and edge-to-edge Android.
      </Text>
    </SafeAreaView>
  );
}
 
const styles = StyleSheet.create({
  safe: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 22, color: "#4b5563" },
});
```

* Import from **`react-native-safe-area-context`**, not `react-native` - the core `SafeAreaView` is iOS-only and limited
* Expo templates wrap the app in `SafeAreaProvider` - required for inset values to resolve
* `flex: 1` on `SafeAreaView` lets children fill the **inset-adjusted** area, not the raw screen
* Use `useSafeAreaInsets()` when only some edges need padding (e.g., a full-bleed header image)

> **Related:** [Safe Areas & Notches](https://docs.wahwei/reactnative.codeguides.io/styling-layout/safe-areas-and-notches/) - per-edge insets and RN 0.86 edge-to-edge Android

---

## Intermediate Examples

### 8. Platform.select for Platform Styles

iOS and Android render shadows differently - `Platform.select` keeps one style object with platform branches.

```tsx
import { View, Text, Platform, StyleSheet } from "react-native";
 
export default function App() {
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Platform-aware card</Text>
        <Text style={styles.body}>
          iOS uses shadow props; Android uses elevation.
        </Text>
      </View>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f3f4f6",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  title: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  body: { fontSize: 14, color: "#6b7280", lineHeight: 20 },
});
```

* `Platform.select` returns the matching value for the current OS - spread it into `StyleSheet` objects cleanly
* iOS shadows need **`shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`** together; Android uses **`elevation`**
* `Platform.OS` works for small JSX branches; prefer `Platform.select` when only style values differ
* Borders and hairline separators also differ by platform - see the shadows and borders guide

> **Related:** [Shadows, Elevation & Borders](https://docs.wahwei/reactnative.codeguides.io/styling-layout/shadows-elevation-and-borders/) - hairlines, overflow, and elevation limits

---

### 9. Responsive Sizing with useWindowDimensions

Derive layout values from the current window width so rotation and tablets reflow without hard-coded pixel widths.

```tsx
import { View, Text, useWindowDimensions, StyleSheet } from "react-native";
 
export default function App() {
  const { width } = useWindowDimensions();
  const columns = width >= 768 ? 3 : 2;
  const gap = 12;
  const horizontalPadding = 32;
  const tileSize =
    (width - horizontalPadding - gap * (columns - 1)) / columns;
 
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>
        {columns} columns · {Math.round(width)}px wide
      </Text>
      <View style={[styles.grid, { gap }]}>
        {Array.from({ length: 6 }, (_, i) => (
          <View
            key={i}
            style={[styles.tile, { width: tileSize, height: tileSize }]}
          >
            <Text>Tile {i + 1}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  heading: { fontSize: 16, fontWeight: "600", marginBottom: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  tile: {
    backgroundColor: "#e0e7ff",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
});
```

* `useWindowDimensions` **re-renders on rotation and resize** - unlike the one-time `Dimensions.get("window")` snapshot
* Compute tile sizes from `width` minus padding and gaps - numeric dimensions avoid percentage surprises in flex grids
* Name breakpoints as constants (`TABLET = 768`) shared across screens for consistent adaptive behavior
* Foldables and split-screen need more than width alone - the responsive layout guide covers breakpoints and hooks

> **Related:** [Responsive & Adaptive Layout](https://docs.wahwei/reactnative.codeguides.io/styling-layout/responsive-and-adaptive-layout/) - tablets, foldables, and split view

---

### 10. Theme Tokens on a Settings Row

Combine `StyleSheet`, `useColorScheme`, and a small token module into a reusable pattern production apps use before reaching for a styling library.

```tsx
import { View, Text, useColorScheme, StyleSheet } from "react-native";
 
const spacing = { sm: 8, md: 16, lg: 24 } as const;
 
const themes = {
  light: {
    screen: "#f9fafb",
    card: "#ffffff",
    text: "#111827",
    muted: "#6b7280",
    border: "#e5e7eb",
  },
  dark: {
    screen: "#111827",
    card: "#1f2937",
    text: "#f9fafb",
    muted: "#9ca3af",
    border: "#374151",
  },
} as const;
 
export default function App() {
  const scheme = useColorScheme() ?? "light";
  const theme = themes[scheme];
 
  return (
    <View style={[styles.screen, { backgroundColor: theme.screen }]}>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.label, { color: theme.muted }]}>Account</Text>
        <Text style={[styles.value, { color: theme.text }]}>alex@example.com</Text>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <Text style={[styles.label, { color: theme.muted }]}>Plan</Text>
        <Text style={[styles.value, { color: theme.text }]}>Pro · renews Aug 1</Text>
      </View>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", padding: spacing.md },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.lg,
  },
  label: { fontSize: 13, marginBottom: spacing.sm },
  value: { fontSize: 16, fontWeight: "600", marginBottom: spacing.md },
  divider: { height: StyleSheet.hairlineWidth, marginBottom: spacing.md },
});
```

* **Tokens** (`spacing`, `themes`) live beside or above components - static layout in `StyleSheet`, semantic colors from the theme object
* `StyleSheet.hairlineWidth` is the thinnest visible line on the current device - use it for dividers instead of hard-coding `1`
* Type token objects with `as const` so keys stay narrow and typos fail at compile time
* When tokens span the whole app, promote them to `theme.ts` and align with your design system - see best practices before adopting styled-components or NativeWind

> **Related:** [Styling Best Practices](https://docs.wahwei/reactnative.codeguides.io/styling-layout/best-practices/) - token naming and library trade-offs | [Dark Mode & Color Schemes](https://docs.wahwei/reactnative.codeguides.io/styling-layout/dark-mode-and-color-schemes/) - syncing navigation and status bar with theme

---

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
