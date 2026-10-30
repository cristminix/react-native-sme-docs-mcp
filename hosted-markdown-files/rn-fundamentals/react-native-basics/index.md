# React Native Basics

10 examples to get you started with React Native Fundamentals - 7 basic and 3 intermediate.

Highlights / React Native Basics

* View is the layout primitive; all visible UI must live inside View or Text
* StyleSheet.create caches styles on the native side for better performance
* Flexbox defaults to column direction - opposite of web CSS
* Pressable replaces TouchableOpacity for touch targets with style callbacks
* useState triggers a re-render; state updates are async and batched
* Platform.select and useWindowDimensions handle OS and screen-size differences
* SafeAreaView from react-native-safe-area-context respects notches and home indicators

## Prerequisites

React Native apps need a native runtime. The fastest path is **Expo**, which ships a preconfigured Metro bundler, dev client, and common native modules.

```bash
npx create-expo-app@latest MyApp
cd MyApp
npx expo start
```

Scan the QR code with **Expo Go** on a physical device, or press `i` / `a` in the terminal to open the iOS Simulator or Android emulator. Edit `App.tsx` - every example below can replace that file to run immediately.

> **Tooling:** These examples target **Expo SDK 57**, **React Native 0.86**, and **React 19.2.3**. TypeScript (`.tsx`) is used throughout; Expo projects include it by default.

---

## Basic Examples

### 1. View and Text

The two primitives every React Native screen is built from - `View` for layout containers and `Text` for anything the user reads.

```tsx
import { View, Text, StyleSheet } from "react-native";
 
export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello, React Native!</Text>
      <Text style={styles.subtitle}>Built with View and Text.</Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold" },
  subtitle: { fontSize: 16, color: "#666", marginTop: 8 },
});
```

* Unlike the web, there is no `<div>` or `<p>` - **`View` maps to a native container** and `Text` maps to a native text node
* **All text must be wrapped in `<Text>`** - putting a raw string inside `View` throws a runtime error
* `flex: 1` on the container makes it fill the entire screen, which is the standard root layout pattern
* Styles are JavaScript objects, not CSS classes - property names use camelCase (`fontSize`, not `font-size`)

> **Related:** [Views, Text & Core Components](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/views-text-and-core-components/) - nesting rules, `TextInput`, and platform rendering quirks

---

### 2. StyleSheet

Use `StyleSheet.create` to define reusable, validated style objects instead of inline literals.

```tsx
import { View, Text, StyleSheet } from "react-native";
 
export default function App() {
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>StyleSheet.create</Text>
      <Text style={styles.body}>
        Styles are defined once and referenced by key.
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
    borderWidth: 1,
    borderColor: "#c7d2fe",
  },
  heading: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 20, color: "#374151" },
});
```

* `StyleSheet.create` **validates property names at dev time** and sends a style ID to the native layer instead of a full object each render
* Inline styles (`style={{ margin: 16 }}`) work for one-offs, but **`StyleSheet` is preferred** for anything reused or composed
* Combine styles with an array: `style={[styles.base, isActive && styles.active]}` - later entries override earlier ones
* React Native supports a subset of CSS - no cascade, no selectors, no `em`/`rem` units

> **Related:** [Views, Text & Core Components](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/views-text-and-core-components/) - how styles attach to native views

---

### 3. Flexbox Layout

React Native uses Flexbox for all layout. The default `flexDirection` is **`column`**, not `row` like many web layouts assume.

```tsx
import { View, Text, StyleSheet } from "react-native";
 
export default function App() {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Header</Text>
      </View>
      <View style={styles.row}>
        <View style={[styles.box, styles.boxA]}>
          <Text>A</Text>
        </View>
        <View style={[styles.box, styles.boxB]}>
          <Text>B</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Footer</Text>
      </View>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  header: { padding: 12, backgroundColor: "#dbeafe", borderRadius: 8 },
  headerText: { fontWeight: "600" },
  row: { flex: 1, flexDirection: "row", gap: 12, marginVertical: 16 },
  box: { flex: 1, justifyContent: "center", alignItems: "center", borderRadius: 8 },
  boxA: { backgroundColor: "#bbf7d0" },
  boxB: { backgroundColor: "#fde68a" },
  footer: { padding: 12, backgroundColor: "#f3f4f6", borderRadius: 8 },
  footerText: { textAlign: "center", color: "#6b7280" },
});
```

* `flex: 1` on sibling views makes them **share remaining space equally** along the parent's main axis
* `flexDirection: "row"` switches the main axis to horizontal - essential for side-by-side layouts
* `justifyContent` aligns children along the main axis; `alignItems` aligns along the cross axis
* The `gap` property (RN 0.71+) adds spacing between flex children without margin hacks

> **Related:** [Dimensions & Responsive Layout](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/dimensions-and-responsive-layout/) - breakpoints, tablets, and adaptive grids

---

### 4. Pressable

`Pressable` is the modern touch primitive - it exposes press state so you can style feedback without a separate opacity wrapper.

```tsx
import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
 
export default function App() {
  const [lastPress, setLastPress] = useState("No taps yet");
 
  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setLastPress(new Date().toLocaleTimeString())}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={styles.buttonText}>Tap me</Text>
      </Pressable>
      <Text style={styles.status}>{lastPress}</Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  button: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonPressed: { backgroundColor: "#1d4ed8", transform: [{ scale: 0.97 }] },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  status: { color: "#6b7280" },
});
```

* The `style` prop accepts a **function** `({ pressed }) => [...]` so pressed-state styling stays declarative
* `onPress` fires on a completed tap; use `onPressIn` / `onPressOut` for press-and-hold or drag scenarios
* Add `hitSlop` to enlarge the touch target without changing visual size - critical for accessibility on small icons
* `Pressable` supersedes `TouchableOpacity` and `TouchableHighlight` in new code

> **Related:** [Event Handling & Touchables](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/event-handling-and-touchables/) - `hitSlop`, long press, and gesture layering

---

### 5. useState

`useState` works the same as in React for web - a state change schedules a re-render of the component tree.

```tsx
import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
 
export default function App() {
  const [count, setCount] = useState(0);
 
  return (
    <View style={styles.container}>
      <Text style={styles.count}>{count}</Text>
      <View style={styles.row}>
        <Pressable style={styles.button} onPress={() => setCount((c) => c - 1)}>
          <Text style={styles.buttonText}>−</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => setCount((c) => c + 1)}>
          <Text style={styles.buttonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", gap: 24 },
  count: { fontSize: 48, fontWeight: "bold" },
  row: { flexDirection: "row", gap: 12 },
  button: {
    backgroundColor: "#2563eb",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 24, fontWeight: "600" },
});
```

* State updates are **asynchronous** - reading `count` immediately after `setCount` still returns the old value
* Use the **updater form** `setCount((c) => c + 1)` when the new value depends on the previous one
* Each `useState` call triggers a re-render of this component and its children - keep state as local as possible
* On mobile, unnecessary re-renders cost more than on web because layout runs on the native UI thread

> **Related:** [Props, State & Re-renders on Mobile](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/props-state-and-re-renders-on-mobile/) - how updates cross the JS/native boundary

---

### 6. Image

Display local bundled assets with `require()` or remote images with a `{ uri }` source object.

```tsx
import { View, Image, Text, StyleSheet } from "react-native";
 
const REMOTE_URI =
  "https://reactnative.dev/img/tiny_logo.png";
 
export default function App() {
  return (
    <View style={styles.container}>
      <Image source={require("./assets/icon.png")} style={styles.local} />
      <Image source={{ uri: REMOTE_URI }} style={styles.remote} />
      <Text style={styles.caption}>Local asset (top) and remote URI (bottom)</Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  local: { width: 64, height: 64, borderRadius: 12 },
  remote: { width: 64, height: 64 },
  caption: { fontSize: 13, color: "#6b7280", textAlign: "center", paddingHorizontal: 24 },
});
```

* `require("./assets/icon.png")` resolves at **build time** - the bundler includes the file and picks the correct density (`@2x`, `@3x`)
* Remote images need explicit `width` and `height` (or `aspectRatio`) - RN cannot infer dimensions from a URL alone
* Add `resizeMode` (`cover`, `contain`, `stretch`) to control how the image fills its bounds
* For animated or progressively loaded images, consider `expo-image` - covered in the dedicated images guide

> **Related:** [Images & Assets](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/images-and-assets/) - density buckets, `expo-asset`, and caching strategies

---

### 7. SafeAreaView

Wrap screen content in `SafeAreaView` so it clears notches, status bars, and home indicators.

```tsx
import { Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
 
export default function App() {
  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Safe Area Layout</Text>
      <Text style={styles.body}>
        Content stays below the status bar and above the home indicator.
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

* Import from **`react-native-safe-area-context`**, not `react-native` - the built-in `SafeAreaView` is iOS-only and deprecated for new apps
* Expo projects include `react-native-safe-area-context` by default; wrap your root in `SafeAreaProvider` (Expo's template does this)
* Use `useSafeAreaInsets()` when you need **per-edge control** - e.g., a full-bleed header with only top padding
* Pair with `StatusBar` from `expo-status-bar` to match the status bar style to your background color

> **Related:** [Views, Text & Core Components](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/views-text-and-core-components/) - screen-level layout primitives

---

## Intermediate Examples

### 8. Platform Detection

Use `Platform.OS` for simple branching and `Platform.select` for platform-specific style values.

```tsx
import { View, Text, Platform, StyleSheet } from "react-native";
 
export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Running on {Platform.OS === "ios" ? "iOS" : "Android"}
      </Text>
      <View style={styles.card}>
        <Text style={styles.cardText}>
          {Platform.OS === "ios"
            ? "San Francisco system font"
            : "Roboto system font"}
        </Text>
      </View>
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  label: { fontSize: 16, color: "#6b7280" },
  card: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
    }),
  },
  cardText: { fontSize: 15 },
});
```

* `Platform.OS` returns `"ios"`, `"android"`, `"web"`, or `"windows"` - use it for **small conditional branches**
* `Platform.select({ ios: {...}, android: {...} })` returns the matching value and spreads cleanly into `StyleSheet` objects
* iOS uses `shadow*` properties; Android uses `elevation` - `Platform.select` is the idiomatic way to handle this split
* For larger platform differences, use **`.ios.tsx` / `.android.tsx` file extensions** instead of inline conditionals

> **Related:** [Platform-Specific Code](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/platform-specific-code/) - file extensions, native modules, and `Platform.Version`

---

### 9. Responsive Layout with useWindowDimensions

React to screen size changes - rotation, foldables, and tablets - with the `useWindowDimensions` hook.

```tsx
import { View, Text, useWindowDimensions, StyleSheet } from "react-native";
 
export default function App() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const columns = isTablet ? 3 : 2;
  const gap = isTablet ? 16 : 8;
  const horizontalPadding = 32;
  const tileSize =
    (width - horizontalPadding - gap * (columns - 1)) / columns;
 
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>
        {columns}-column layout ({Math.round(width)}px wide)
      </Text>
      <View style={[styles.grid, { gap }]}>
        {Array.from({ length: 6 }, (_, i) => (
          <View key={i} style={[styles.tile, { width: tileSize, height: tileSize }]}>
            <Text>Item {i + 1}</Text>
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

* `useWindowDimensions` **re-renders on rotation and window resize**, unlike the static `Dimensions.get("window")` snapshot
* Define breakpoints (e.g., `768` for tablet) as named constants shared across the app
* Compute tile sizes from `width` minus padding and gaps - numeric dimensions avoid percentage layout surprises
* For complex responsive layouts, pair breakpoints with `flexBasis` and `flexWrap` rather than absolute positioning

> **Related:** [Dimensions & Responsive Layout](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/dimensions-and-responsive-layout/) - `Dimensions` API, orientation hooks, and foldable support

---

### 10. Composed Profile Card

Combine View, Text, Image, Pressable, StyleSheet, and `Platform.select` into a reusable, interactive card.

```tsx
import { useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  Platform,
  StyleSheet,
} from "react-native";
 
const AVATAR_URI = "https://reactnative.dev/img/tiny_logo.png";
 
export default function App() {
  const [following, setFollowing] = useState(false);
 
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Image source={{ uri: AVATAR_URI }} style={styles.avatar} />
        <Text style={styles.name}>Alex Rivera</Text>
        <Text style={styles.bio}>React Native developer · 42 projects</Text>
        <Pressable
          onPress={() => setFollowing((f) => !f)}
          style={({ pressed }) => [
            styles.followButton,
            following && styles.following,
            pressed && styles.followPressed,
          ]}
        >
          <Text
            style={[
              styles.followText,
              following && styles.followingText,
            ]}
          >
            {following ? "Following" : "Follow"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#f3f4f6" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
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
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  name: { fontSize: 20, fontWeight: "bold" },
  bio: { fontSize: 14, color: "#6b7280", marginTop: 4, marginBottom: 16 },
  followButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 20,
  },
  following: { backgroundColor: "#e5e7eb" },
  followPressed: { opacity: 0.85 },
  followText: { color: "#fff", fontWeight: "600" },
  followingText: { color: "#374151" },
});
```

* Real screens are **compositions of primitives** - layout (`View`), content (`Text`, `Image`), interaction (`Pressable`), and styling (`StyleSheet`)
* Toggle UI state with `useState` and derive button label and style from the same boolean - a single source of truth
* Style arrays let you layer base, state, and platform styles without duplicating component trees
* Extract this card into its own file with typed props (`name`, `bio`, `avatarUri`) as the next step toward a component library

> **Related:** [Props, State & Re-renders on Mobile](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/props-state-and-re-renders-on-mobile/) - extracting reusable components | [Best Practices](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/best-practices/) - patterns for production-ready mobile UI

---

### External Related Links

* [reactnative.dev](https://reactnative.dev/) - official React Native site
* [reactnative.dev/docs](https://reactnative.dev/docs/getting-started) - full RN documentation
* [react.dev](https://react.dev/) - core React concepts RN builds on

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
