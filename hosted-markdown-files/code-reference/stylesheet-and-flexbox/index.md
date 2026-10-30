# StyleSheet and Flexbox

Layout and styling idioms for React Native - Yoga Flexbox defaults, StyleSheet, and platform-aware styles.

Highlights / StyleSheet and Flexbox

* StyleSheet.create Basics
* Flex Direction Row
* justifyContent Alignment
* Gap in Flex Containers
* useWindowDimensions

#### StyleSheet.create Basics

`StyleSheet.create` validates keys at build time and lets you reference styles by name. Prefer it over huge inline objects for static styles.

```tsx
import { StyleSheet, View, Text } from "react-native";
 
const styles = StyleSheet.create({
  box: { padding: 12, backgroundColor: "#fff" },
  title: { fontSize: 18, fontWeight: "600" },
});
```

#### Flex Direction Column

Default `flexDirection` is `column` (unlike web CSS). Children stack top to bottom unless you change it.

```tsx
<View style={{ flex: 1, flexDirection: "column" }}>
  <Header />
  <Content />
</View>
```

#### Flex Direction Row

Use `row` for toolbars, list rows with leading icons, and horizontal groups.

```tsx
<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
  <Avatar />
  <Text>{name}</Text>
</View>
```

#### justifyContent Alignment

Main-axis distribution: `flex-start`, `center`, `flex-end`, `space-between`, `space-around`, `space-evenly`.

```tsx
<View style={{ flexDirection: "row", justifyContent: "space-between" }}>
  <Text>Title</Text>
  <Text>Action</Text>
</View>
```

#### alignItems Cross Axis

Cross-axis alignment for children: `stretch` (default in column), `center`, `flex-start`, `flex-end`, `baseline`.

```tsx
<View style={{ alignItems: "center", padding: 16 }}>
  <Icon />
  <Text>Centered block</Text>
</View>
```

#### flex Grow Shrink

`flex: 1` makes a child fill remaining space on the main axis. Use it so body content consumes leftover height.

```tsx
<View style={{ flex: 1 }}>
  <Header />
  <View style={{ flex: 1 }}>{body}</View>
  <Footer />
</View>
```

#### Absolute Positioning

Position overlays with `position: "absolute"` and edge offsets. Parent usually needs non-static layout context.

```tsx
<View style={{ position: "relative" }}>
  <Image style={{ width: 64, height: 64 }} source={src} />
  <View style={{ position: "absolute", top: -4, right: -4 }}>
    <Badge />
  </View>
</View>
```

#### Gap in Flex Containers

Modern RN supports `gap`, `rowGap`, and `columnGap` on flex containers - cleaner than margin hacks.

```tsx
<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
  {tags.map((t) => (
    <Tag key={t} label={t} />
  ))}
</View>
```

#### Platform-Specific Styles

`Platform.select` picks values per OS without scattering `if (Platform.OS)` through JSX.

```tsx
import { Platform, StyleSheet } from "react-native";
 
const styles = StyleSheet.create({
  shadow: Platform.select({
    ios: { shadowOpacity: 0.15, shadowRadius: 8 },
    android: { elevation: 3 },
    default: {},
  }),
});
```

#### Dynamic Style from Props

Compose with arrays: base styles, then conditionals, then overrides from props.

```tsx
function Pill({ active }: { active: boolean }) {
  return <View style={[styles.pill, active && styles.pillActive]} />;
}
```

#### Percent Width Height

Percentages are relative to the parent. Combine with `flex` carefully - know which constraint wins.

```tsx
<View style={{ width: "100%", maxWidth: 480, alignSelf: "center" }} />
```

#### Border Radius Shadows

iOS uses shadow\* props; Android uses `elevation`. Set both when you need cross-platform depth.

```tsx
const card = {
  borderRadius: 12,
  backgroundColor: "#fff",
  ...Platform.select({
    ios: { shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
    android: { elevation: 4 },
  }),
};
```

#### useWindowDimensions

Subscribe to window size so layout updates on rotation and split-screen without a manual Dimensions listener.

```tsx
import { useWindowDimensions, View } from "react-native";
 
const { width } = useWindowDimensions();
const columns = width > 600 ? 2 : 1;
```

#### PixelRatio Rounding

Round layout numbers when you need crisp hairlines on high-DPI screens.

```tsx
import { PixelRatio, StyleSheet } from "react-native";
 
const hairline = StyleSheet.hairlineWidth; // or 1 / PixelRatio.get()
```

#### StyleSheet.flatten Compose

`StyleSheet.flatten` merges style arrays into one object - handy for debugging or third-party props that need a plain object.

```tsx
const flat = StyleSheet.flatten([styles.base, props.style]);
```

## Related

* [Core Views and Text](https://docs.wahwei/reactnative.codeguides.io/code-reference/core-views-and-text/) - components these styles attach to
* [Lists and Virtualization](https://docs.wahwei/reactnative.codeguides.io/code-reference/lists-and-virtualization/) - row layout at list scale
* [Performance and Lists](https://docs.wahwei/reactnative.codeguides.io/code-reference/performance-and-lists/) - avoid inline style thrash in hot paths

### External Related Links

* [reactnative.dev/docs](https://reactnative.dev/docs/getting-started) - full RN documentation
* [reactnative.dev](https://reactnative.dev/) - official React Native site
* [react.dev](https://react.dev/) - core React concepts RN builds on

> **Stack versions:** React 19.2.3 · React Native 0.86.0 · Expo SDK 57

Reviewed by Chris St. John·Last updated Jul 18, 2026
