# Responsive & Adaptive Layout

Phone/tablet/foldable breakpoints without web CSS assumptions.

Highlights / Responsive & Adaptive Layout

* There are no CSS media queries - use useWindowDimensions and app-defined breakpoints
* 768 dp is the common tablet threshold; 600 dp matches Material compact-to-medium
* Adaptive layout changes structure (split view), not just spacing
* Foldables and split-screen shrink window width - test narrow states
* Combine breakpoints with flexbox - dimensions pick the tree, flex distributes space
* Safe area insets are orthogonal to breakpoints - handle both

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import React, { useMemo } from "react";
import { useWindowDimensions, View, StyleSheet } from "react-native";
 
export const BREAKPOINTS = { phone: 0, tablet: 768, wide: 1024 } as const;
 
export type LayoutClass = keyof typeof BREAKPOINTS;
 
export function useLayoutClass(): LayoutClass {
  const { width } = useWindowDimensions();
  if (width >= BREAKPOINTS.wide) return "wide";
  if (width >= BREAKPOINTS.tablet) return "tablet";
  return "phone";
}
 
export function AdaptiveColumns({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const layout = useLayoutClass();
  const columns = layout === "phone" ? 1 : layout === "tablet" ? 2 : 3;
  const gap = layout === "phone" ? 12 : 16;
 
  const itemWidth = useMemo(
    () => (width - gap * (columns + 1)) / columns,
    [width, columns, gap]
  );
 
  return (
    <View style={[styles.grid, { gap, padding: gap }]}>
      {React.Children.map(children, (child, index) => (
        <View key={index} style={{ width: itemWidth }}>
          {child}
        </View>
      ))}
    </View>
  );
}
 
const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap" },
});
```

**When to reach for this:** Screens that must change column count, navigation pattern, or master-detail structure across phones, tablets, foldables, and rotation - without assuming browser CSS media queries.

## Working Example

```tsx
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
 
const TABLET_MIN = 768;
 
type Message = { id: string; subject: string; preview: string };
 
const MESSAGES: Message[] = [
  { id: "1", subject: "Sprint review", preview: "Demo adaptive layout on iPad." },
  { id: "2", subject: "Foldable QA", preview: "Test narrow window after fold." },
  { id: "3", subject: "Breakpoint tokens", preview: "Document 768 in the design system." },
];
 
export default function InboxAdaptiveScreen() {
  const { width, height } = useWindowDimensions();
  const minDim = Math.min(width, height);
  const isTablet = minDim >= TABLET_MIN;
  const isWide = width >= 1024;
  const isLandscape = width > height;
 
  const listWidth = isWide ? 360 : isTablet ? (isLandscape ? 320 : 280) : undefined;
 
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={[styles.shell, isTablet && styles.shellTablet]}>
        {/* List pane - full width on phone, fixed sidebar on tablet */}
        <View style={[styles.list, isTablet && { width: listWidth }]}>
          <Text style={styles.heading}>Inbox</Text>
          <Text style={styles.meta}>
            {width}×{height} · {isTablet ? "tablet layout" : "phone layout"}
          </Text>
          {MESSAGES.map((msg) => (
            <View key={msg.id} style={styles.row}>
              <Text style={styles.subject}>{msg.subject}</Text>
              <Text style={styles.preview} numberOfLines={1}>
                {msg.preview}
              </Text>
            </View>
          ))}
        </View>
 
        {/* Detail pane - visible only on tablet+; phone navigates via stack */}
        {isTablet ? (
          <ScrollView style={styles.detail} contentContainerStyle={styles.detailInner}>
            <Text style={styles.detailTitle}>Select a message</Text>
            <Text style={styles.detailBody}>
              Master-detail split view. On phone, push this screen from the list via Expo Router.
            </Text>
          </ScrollView>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
 
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  shell: { flex: 1 },
  shellTablet: { flexDirection: "row" },
  list: { flex: 1, borderColor: "#e2e8f0" },
  heading: { fontSize: 28, fontWeight: "700", padding: 16, paddingBottom: 4 },
  meta: { fontSize: 13, color: "#64748b", paddingHorizontal: 16, paddingBottom: 12 },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#f1f5f9",
    gap: 2,
  },
  subject: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  preview: { fontSize: 14, color: "#64748b" },
  detail: { flex: 1, backgroundColor: "#f8fafc" },
  detailInner: { padding: 24 },
  detailTitle: { fontSize: 22, fontWeight: "600" },
  detailBody: { fontSize: 16, lineHeight: 24, color: "#475569", marginTop: 8 },
});
```

**What this demonstrates:**

* `useWindowDimensions()` driving re-layout on rotation, fold, and split-screen resize.
* `min(width, height)` for foldable-safe tablet detection (not just raw width).
* Structural adaptation: column on phone, `flexDirection: "row"` master-detail on tablet.
* Different sidebar widths for portrait vs landscape tablet.
* Phone omits the detail pane - real apps navigate to a separate stack screen.

## Deep Dive

### How It Works

* **No built-in media queries** - React Native has no `@media` or container queries. You read `width` and `height` from `useWindowDimensions()` and branch layout in JSX or derived style objects.
* **Reactive dimensions** - `useWindowDimensions` subscribes to dimension change events. Rotation, fold state changes, and Android split-screen all trigger re-renders with new values. One-shot `Dimensions.get("window")` does **not** update.
* **Density-independent pixels** - Breakpoint numbers (768, 1024) are in dp, comparable across devices. They are not physical pixels.
* **Adaptive vs responsive** - *Responsive* tweaks spacing and column counts. *Adaptive* changes the UI structure (tabs vs sidebar, stack vs split view). Mobile apps need both.
* **Breakpoints are team conventions** - Document your thresholds in a shared constants file. There is no global RN standard.

For hook mechanics, `fontScale`, and `PixelRatio`, see [Dimensions & Responsive Layout](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/dimensions-and-responsive-layout/).

### Breakpoint Constants

```tsx
// Width-based (most common)
export const BP = {
  phone: 0,
  tablet: 768,   // iPad portrait, many Android tablets
  desktop: 1024, // iPad landscape, large tablets, foldable inner display
} as const;
 
// Material-inspired alternative
export const MATERIAL = { compact: 0, medium: 600, expanded: 840 } as const;
```

| Threshold | Typical devices | Common use |
| --- | --- | --- |
| `< 768` | Phones, narrow split-screen | Single column, stack navigation |
| `768–1023` | Tablet portrait, small foldable inner | Two columns, split master-detail |
| `>= 1024` | Tablet landscape, desktop-class | Three columns, persistent side rail |

### Detection Strategies

```tsx
import { Platform, useWindowDimensions } from "react-native";
 
function useDeviceLayout() {
  const { width, height } = useWindowDimensions();
  const minDim = Math.min(width, height);
  const maxDim = Math.max(width, height);
 
  return {
    width,
    height,
    isLandscape: width > height,
    isTablet: minDim >= 768,
    isWide: width >= 1024,
    isIPad: Platform.OS === "ios" && Platform.isPad,
    // Foldable: inner display may be square - minDim catches "tablet-class"
    isTabletClass: minDim >= 600,
  };
}
```

* **`width >= 768`** - simple, works for most tablets in portrait.
* **`min(width, height) >= 768`** - better for foldables and square aspect ratios.
* **`Platform.isPad`** - iOS-only; pair with width checks for Android.

### Adaptive Layout Patterns

| Pattern | Phone | Tablet / wide |
| --- | --- | --- |
| Master-detail | Stack push to detail screen | Side-by-side list + detail |
| Navigation | Bottom tabs | Side rail or permanent drawer |
| Grid | 1–2 columns | 2–4 columns |
| Modal | Full-screen sheet | Centered dialog `maxWidth: 560` |
| Typography | `fontSize: 16` | `fontSize: 17–18`, wider `lineLength` |

```tsx
// Modal width cap on large screens
const { width } = useWindowDimensions();
const modalWidth = Math.min(width - 48, 560);
```

### Combining Breakpoints with Flexbox

Breakpoints choose **which tree** to render; flexbox distributes **space within** each pane:

```tsx
const isTablet = width >= 768;
 
return (
  <View style={{ flex: 1, flexDirection: isTablet ? "row" : "column" }}>
    <View style={isTablet ? { width: 320 } : { flex: 1 }}>{/* list */}</View>
    {isTablet && <View style={{ flex: 1 }}>{/* detail */}</View>}
  </View>
);
```

See [Flexbox Deep Dive](https://docs.wahwei/reactnative.codeguides.io/styling-layout/flexbox-deep-dive/) for `flex`, `gap`, and row recipes.

### useResponsiveValue Hook

```tsx
import { useWindowDimensions, ScaledSize } from "react-native";
 
type Breakpoint = "phone" | "tablet" | "wide";
 
function getBreakpoint({ width }: ScaledSize): Breakpoint {
  if (width >= 1024) return "wide";
  if (width >= 768) return "tablet";
  return "phone";
}
 
function useResponsiveValue<T>(map: Record<Breakpoint, T>): T {
  const window = useWindowDimensions();
  return map[getBreakpoint(window)];
}
 
// Usage
const padding = useResponsiveValue({ phone: 16, tablet: 24, wide: 32 });
const columns = useResponsiveValue({ phone: 1, tablet: 2, wide: 3 });
```

### TypeScript Notes

```tsx
import type { ScaledSize } from "react-native";
 
interface ResponsiveProps {
  phone: React.ReactNode;
  tablet?: React.ReactNode;
  wide?: React.ReactNode;
}
 
function Responsive({ phone, tablet, wide }: ResponsiveProps) {
  const window = useWindowDimensions();
  const bp = getBreakpoint(window);
  if (bp === "wide" && wide) return <>{wide}</>;
  if (bp === "tablet" && tablet) return <>{tablet}</>;
  return <>{phone}</>;
}
```

* Share `BREAKPOINTS` and `getBreakpoint` from one module - avoid magic numbers in screens.
* Type `LayoutClass` as a union so `switch` statements exhaustiveness-check.

## Gotchas

* **`Dimensions.get()` without subscription** - Layout frozen after rotation. **Fix:** Use `useWindowDimensions()` in any component that branches on size.
* **Hard-coded `width: 375` from a design mock** - iPhones range 320–430+ dp; Android varies more. **Fix:** Derive widths from `useWindowDimensions()` or use `flex` and percentages.
* **Tablet check on `width` only in landscape** - A phone in landscape can exceed 768 dp falsely. **Fix:** Use `min(width, height) >= 768` for device-class detection.
* **Ignoring Android split-screen** - Window width shrinks to phone-narrow on a tablet. **Fix:** Test split-screen; prefer flex layouts that degrade to single column gracefully.
* **Responsive spacing only, no structural change** - Cramming a tablet layout into a phone with smaller padding still feels wrong. **Fix:** Adapt navigation and pane structure, not just `paddingHorizontal`.
* **Caching breakpoint in `useRef`** - Stale layout after rotation. **Fix:** Derive breakpoint from `useWindowDimensions()` each render.
* **Forgetting safe area with responsive padding** - Wider tablet padding does not replace inset handling. **Fix:** Combine [Safe Areas & Notches](https://docs.wahwei/reactnative.codeguides.io/styling-layout/safe-areas-and-notches/) with breakpoint tokens.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `useWindowDimensions` + constants | Default - zero deps, full control | Dimension reads outside React (use `Dimensions` + listener) |
| `useResponsiveValue` helper | Many tokens vary by breakpoint | One `isTablet` branch in a single screen |
| `Platform.isPad` | iOS-only popover vs sheet | Cross-platform tablet detection |
| Platform files (`*.tablet.tsx`) | Radically different tablet UIs | Minor spacing tweaks (if/else is simpler) |
| `react-native-responsive-screen` | Team wants `widthPercentageToDP` | You prefer hooks and explicit breakpoints |
| CSS media queries (Expo web) | Web-only responsive targets | Native iOS/Android production layouts |

## FAQs

Why are there no media queries in React Native?

RN layout is Yoga flexbox, not a browser CSS engine. Simulate media queries with `useWindowDimensions()` and breakpoint constants. Expo web targets can use CSS, but native apps use hook-based branching.

What breakpoint should I use for tablet?

`768` dp is the most common (iPad portrait width). Material uses `600` for medium width. `1024` suits large tablet landscape and desktop-class layouts. Pick one set, document it, and use it consistently.

useWindowDimensions vs Dimensions.get - which wins?

`useWindowDimensions` - it re-renders on change. `Dimensions.get("window")` is a one-time snapshot fine for logging, wrong for responsive UI. See [Dimensions & Responsive Layout](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/dimensions-and-responsive-layout/).

How do I build master-detail for phone and tablet?

On tablet (`min(width,height) >= 768`), render list and detail in `flexDirection: "row"`. On phone, show only the list and push the detail screen via Expo Router / React Navigation stack. Share the same data hooks in both layouts.

Should I use min(width, height) or width for tablet detection?

`min(width, height)` is safer for foldables, square displays, and orientation changes. Raw `width >= 768` works when you explicitly want landscape-tablet behavior (e.g., only split in landscape).

Gotcha: Why does my app think it is a tablet in phone landscape?

A phone in landscape can exceed 768 dp width. Use `Math.min(width, height) >= 768` for device-class, or require both width and minDim thresholds.

How do foldables affect responsive layout?

Fold/unfold and split-screen change `useWindowDimensions` abruptly. Avoid device-model detection; react to window size. Test narrow widths (320–400 dp) even on foldable hardware.

Can I share breakpoints with dark mode tokens?

Yes - keep orthogonal concerns in one theme module:

```tsx
const theme = {
  spacing: useResponsiveValue({ phone: 16, tablet: 24, wide: 32 }),
  colors: palette[useColorScheme() ?? "light"],
};
```

See [Dark Mode & Color Schemes](https://docs.wahwei/reactnative.codeguides.io/styling-layout/dark-mode-and-color-schemes/).

How many columns should a responsive grid use?

Common pattern: 1 column phone, 2 tablet, 3 wide. Calculate item width: `(width - gap * (columns + 1)) / columns`. Use `flexWrap: "wrap"` on the container.

Does Expo Router support adaptive layouts?

Yes. Use `useWindowDimensions` in layout and screen files. Some teams use parallel route groups for tablet (`(tablet)/`) - hook-based branching in one file is simpler for moderate differences.

How do I limit modal width on tablet?

```tsx
const modalWidth = Math.min(useWindowDimensions().width - 48, 560);
<View style={{ width: modalWidth, alignSelf: "center" }} />
```

What about fontScale and accessibility?

`useWindowDimensions` also returns `fontScale`. Enlarged system text can break fixed-height rows. Allow wrapping and `flexShrink: 1`. Test with large accessibility text enabled.

Should I create separate .tablet.tsx files?

Only when the tablet UI is radically different (distinct navigation tree). For master-detail toggles and column counts, an `isTablet` branch in one file is easier to maintain.

How does responsive layout interact with flexbox?

Breakpoints select structure (one vs two panes). Flex distributes space inside each pane (`flex: 1`, `gap`, row vs column). Both layers work together - see [Flexbox Deep Dive](https://docs.wahwei/reactnative.codeguides.io/styling-layout/flexbox-deep-dive/).

How do I test responsive layouts in the simulator?

* iOS Simulator: rotate, use iPad devices, split View (iPad).
* Android Emulator: tablet AVD, split-screen mode.
* Expo: test web resize for quick iteration; verify on native for accurate insets and density.

## Related

* [Dimensions & Responsive Layout](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/dimensions-and-responsive-layout/) - `useWindowDimensions`, `PixelRatio`, and hook mechanics
* [Flexbox Deep Dive](https://docs.wahwei/reactnative.codeguides.io/styling-layout/flexbox-deep-dive/) - distributing space inside adaptive panes
* [Safe Areas & Notches](https://docs.wahwei/reactnative.codeguides.io/styling-layout/safe-areas-and-notches/) - insets independent of breakpoints
* [Dark Mode & Color Schemes](https://docs.wahwei/reactnative.codeguides.io/styling-layout/dark-mode-and-color-schemes/) - theme tokens alongside layout tokens
* [Style Performance](https://docs.wahwei/reactnative.codeguides.io/styling-layout/style-performance/) - avoiding re-layout cost when dimensions change
* [Styling Basics](https://docs.wahwei/reactnative.codeguides.io/styling-layout/styling-basics/) - StyleSheet patterns for conditional styles

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
