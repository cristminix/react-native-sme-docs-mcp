# Dimensions & Responsive Layout

`useWindowDimensions`, breakpoints, and tablet/phone layouts.

Highlights / Dimensions & Responsive Layout

* `useWindowDimensions` re-renders on rotation and fold - prefer it over one-shot `Dimensions.get()`
* React Native uses density-independent pixels (dp); `PixelRatio` converts to physical pixels
* Breakpoints are app-defined constants - there is no built-in `isTablet` API in core RN
* Tablet layouts often use side-by-side master-detail; phones use stacked navigation
* Safe area insets are separate from window dimensions - use `react-native-safe-area-context`
* Avoid hard-coded pixel widths; derive spacing and columns from current window width

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import { useMemo } from "react";
import { useWindowDimensions, View, Text, StyleSheet } from "react-native";
 
const BREAKPOINTS = { phone: 0, tablet: 768, desktop: 1024 } as const;
 
function useBreakpoint() {
  const { width } = useWindowDimensions();
  if (width >= BREAKPOINTS.desktop) return "desktop" as const;
  if (width >= BREAKPOINTS.tablet) return "tablet" as const;
  return "phone" as const;
}
 
export function ResponsiveGrid({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const bp = useBreakpoint();
 
  const columns = bp === "phone" ? 1 : bp === "tablet" ? 2 : 3;
  const gap = width < BREAKPOINTS.tablet ? 12 : 16;
 
  const itemWidth = useMemo(
    () => (width - gap * (columns + 1)) / columns,
    [width, columns, gap]
  );
 
  return (
    <View style={[styles.grid, { gap, padding: gap }]}>
      {Array.isArray(children)
        ? children.map((child, i) => (
            <View key={i} style={{ width: itemWidth }}>
              {child}
            </View>
          ))
        : children}
    </View>
  );
}
 
const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap" },
});
```

**When to reach for this:** Any layout that must adapt to phone vs tablet, portrait vs landscape, or foldable screen size changes - especially master-detail screens, grids, and modals.

## Working Example

```tsx
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
 
const TABLET_MIN = 768;
 
type Item = { id: string; title: string; body: string };
 
const ITEMS: Item[] = [
  { id: "1", title: "Inbox", body: "3 new messages" },
  { id: "2", title: "Drafts", body: "1 unsent draft" },
  { id: "3", title: "Archive", body: "128 archived" },
];
 
export default function MailScreen() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= TABLET_MIN;
  const isLandscape = width > height;
 
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={[styles.shell, isTablet && styles.shellTablet]}>
        {/* Sidebar / list */}
        <View
          style={[
            styles.listPane,
            isTablet ? { width: isLandscape ? 320 : 280 } : styles.listPanePhone,
          ]}
        >
          <Text style={styles.heading}>Mail</Text>
          {ITEMS.map((item) => (
            <View key={item.id} style={styles.listRow}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowBody} numberOfLines={1}>
                {item.body}
              </Text>
            </View>
          ))}
        </View>
 
        {/* Detail - side-by-side on tablet, hidden on phone (navigate separately in real app) */}
        {isTablet && (
          <ScrollView style={styles.detailPane} contentContainerStyle={styles.detailContent}>
            <Text style={styles.detailTitle}>Select a message</Text>
            <Text style={styles.detailBody}>
              On tablet ({width}×{height}), list and detail share the screen.
            </Text>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
 
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  shell: { flex: 1 },
  shellTablet: { flexDirection: "row" },
  listPane: { borderRightWidth: StyleSheet.hairlineWidth, borderColor: "#ddd" },
  listPanePhone: { flex: 1 },
  heading: { fontSize: 28, fontWeight: "700", padding: 16 },
  listRow: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#eee" },
  rowTitle: { fontSize: 16, fontWeight: "600" },
  rowBody: { fontSize: 14, color: "#666", marginTop: 2 },
  detailPane: { flex: 1 },
  detailContent: { padding: 24 },
  detailTitle: { fontSize: 22, fontWeight: "600" },
  detailBody: { fontSize: 16, color: "#444", marginTop: 8, lineHeight: 24 },
});
```

**What this demonstrates:**

* `useWindowDimensions()` driving re-layout on rotation and resize.
* A hand-rolled tablet breakpoint (`>= 768`) toggling row vs column layout.
* Different sidebar widths for landscape vs portrait tablet.
* `SafeAreaView` for notch/inset-aware layout separate from raw window size.

## Deep Dive

### How It Works

* **`useWindowDimensions`** subscribes to dimension change events and returns `{ width, height, scale, fontScale }`. When the user rotates the device or resizes a split-screen window, the hook triggers a re-render with updated values.
* **`Dimensions.get('window')`** returns a one-time snapshot. It does not subscribe to changes - fine for module-level constants, wrong for responsive UI state.
* **Density-independent pixels (dp)** - Layout numbers in StyleSheet are dp, not physical pixels. A `width: 100` box is roughly the same physical size on a 2x and 3x screen. `PixelRatio.get()` tells you the multiplier (typically 2 or 3).
* **`fontScale`** - Reflects the user's accessibility text-size setting. Respect it for body text; avoid locking critical UI to fixed font sizes when possible.
* **Breakpoints are conventions** - Unlike CSS media queries in the browser, React Native has no global breakpoint system. Teams define constants (often 768 for tablet, 1024 for large tablet/desktop-class).

### `useWindowDimensions` vs `Dimensions`

| API | Subscribes to changes | Best for |
| --- | --- | --- |
| `useWindowDimensions()` | Yes - re-renders component | Responsive layouts, grids, conditional columns |
| `Dimensions.get('window')` | No - snapshot only | One-time logging, static config at module load |
| `Dimensions.addEventListener('change', …)` | Manual subscription | Legacy pattern - prefer the hook |

```tsx
import { Dimensions, useWindowDimensions, PixelRatio } from "react-native";
 
// Snapshot - will NOT update on rotation
const { width: staticWidth } = Dimensions.get("window");
 
// Reactive - updates on rotation
function Layout() {
  const { width, height, scale, fontScale } = useWindowDimensions();
  const physicalWidth = width * PixelRatio.get();
  // ...
}
```

### Common Breakpoint Patterns

```tsx
// Width-based (most common)
const isTablet = width >= 768;
 
// Orientation
const isLandscape = width > height;
 
// Minimum dimension (useful for foldables - tablet-ish when either axis is large)
const minDim = Math.min(width, height);
const isTabletClass = minDim >= 600;
 
// Platform + width (iPad always reports large width; Android tablets vary)
import { Platform } from "react-native";
const isIPad = Platform.OS === "ios" && Platform.isPad;
```

### Tablet / Phone Layout Strategies

| Pattern | Phone | Tablet |
| --- | --- | --- |
| Master-detail | Stack navigation - list pushes to detail | Split view - list + detail side by side |
| Grid columns | 1–2 columns | 2–4 columns |
| Modal | Full-screen sheet | Centered dialog (`maxWidth: 560`) |
| Navigation | Bottom tabs | Side rail or permanent sidebar |

### Safe Area vs Window Dimensions

Window dimensions include the full screen. Safe area insets exclude notches, status bars, and home indicators:

```tsx
import { useSafeAreaInsets } from "react-native-safe-area-context";
 
function Header() {
  const insets = useSafeAreaInsets();
  return <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }} />;
}
```

Do not conflate `width` from `useWindowDimensions` with the usable content area - subtract insets and any app chrome (tab bars, headers).

### TypeScript Notes

```tsx
import { useWindowDimensions, ScaledSize } from "react-native";
 
type Breakpoint = "phone" | "tablet" | "desktop";
 
function getBreakpoint(window: ScaledSize): Breakpoint {
  if (window.width >= 1024) return "desktop";
  if (window.width >= 768) return "tablet";
  return "phone";
}
 
function useResponsiveValue<T>(values: Record<Breakpoint, T>): T {
  const window = useWindowDimensions();
  return values[getBreakpoint(window)];
}
 
// Usage
const padding = useResponsiveValue({ phone: 16, tablet: 24, desktop: 32 });
```

## Gotchas

* **`Dimensions.get()` in render without a subscription** - UI stays in portrait layout after rotating to landscape. **Fix:** Use `useWindowDimensions()` or `Dimensions.addEventListener`.
* **Hard-coded `width: 375` designs** - iPhones range from 320 to 430+ logical width; Android is wider still. **Fix:** Percentage widths, `flex`, and breakpoint-based column counts.
* **Ignoring `fontScale`** - Users with large accessibility text see clipped labels. **Fix:** Allow text to wrap, use `flexShrink: 1`, and test with enlarged system font.
* **Using screen width for modals** - `Dimensions.get('screen')` includes areas under system UI; `window` is usually correct for layout. **Fix:** Default to `'window'` unless you have a specific reason for `'screen'`.
* **Tablet check only on iOS** - `Platform.isPad` does not help on Android tablets. **Fix:** Width breakpoint (`>= 768`) works cross-platform.
* **Split-screen on Android** - Window width can be very narrow even on a tablet. **Fix:** Use `min(width, height)` or test narrow-window states, not just device class.
* **Safe area double-padding** - Applying `paddingTop: insets.top` inside a screen already wrapped in `SafeAreaView` with `edges={['top']}`. **Fix:** Choose one owner for safe-area padding per axis.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `useWindowDimensions` | Default for responsive React components | You need dimension values outside a component (use `Dimensions` snapshot + listener) |
| Percentage widths (`width: '50%'`) | Simple two-column splits | Precise pixel gutters and multi-column math (use calculated dp) |
| `flex` / `flexWrap` | Fluid grids without explicit breakpoints | Strict master-detail that must not share a row on phone |
| `react-native-responsive-screen` (community) | Teams wanting `widthPercentageToDP` helpers | You prefer zero extra deps - hooks + constants are enough |
| Platform-specific files (`*.tablet.tsx`) | Radically different tablet UIs | Minor spacing tweaks (breakpoint if/else is simpler) |

## FAQs

Why prefer `useWindowDimensions` over `Dimensions.get('window')`?

`Dimensions.get()` returns a snapshot at call time. It does not re-render your component when the user rotates the device or resizes split-screen. `useWindowDimensions` is a hook that subscribes to dimension changes and triggers a re-render automatically.

What is the difference between `window` and `screen` dimensions?

* `window` - the usable app viewport (what most layouts need).
* `screen` - the full physical display, including areas under status/navigation bars on some Android devices.

Default to `window` unless you have a specific fullscreen use case.

What logical width should I use for a tablet breakpoint?

`768` is the most common convention (iPad portrait is 768 dp). Some teams use `600` (Material "tablet" threshold) or `1024` for desktop-class layouts. Pick one, document it, and use it consistently.

How do density-independent pixels relate to physical pixels?

```tsx
import { PixelRatio } from "react-native";
 
const physicalPixels = layoutDp * PixelRatio.get();
```

A 100×100 dp box is 200×200 physical pixels on a 2x device and 300×300 on a 3x device.

How do I build a master-detail layout for phone and tablet?

On tablet (`width >= 768`), render list and detail in a `flexDirection: 'row'` container. On phone, use Expo Router / React Navigation stack - list screen pushes detail screen. Pass the same data layer to both layouts.

Does `useWindowDimensions` work with Expo Router?

Yes. It is a standard React Native hook. Use it inside any client component screen or layout. It updates when the router-mounted screen rotates or resizes.

Gotcha: Why does my layout break in Android split-screen?

Split-screen shrinks `window.width` dramatically. A tablet-width breakpoint may not fire even on a large device. Test narrow widths and prefer `flex`-based layouts that degrade gracefully.

How do I handle orientation lock?

Use `expo-screen-orientation` to lock or unlock orientation per screen. Even with a lock, always write layouts defensively - OS policies and foldables can still change effective viewport size.

Should I use `Platform.isPad` for iOS tablet detection?

`Platform.isPad` is reliable on iOS but has no Android equivalent. For cross-platform tablet layouts, width breakpoints are the portable choice. `Platform.isPad` is fine for iOS-only branching (e.g., popover vs sheet).

How does `fontScale` affect layout?

Users can enlarge system text in accessibility settings. `fontScale` on `useWindowDimensions` reflects this multiplier. Avoid fixed-height rows that clip enlarged text; prefer wrapping and `flexShrink`.

Can I use CSS-like media queries in React Native?

Not natively. Simulate them with `useWindowDimensions` + breakpoint constants, or use libraries like `react-native-media-query` on web targets. For iOS/Android, hook-based breakpoints are the standard pattern.

How do I limit modal width on tablet?

```tsx
const { width } = useWindowDimensions();
const modalWidth = Math.min(width - 48, 560);
 
<View style={{ width: modalWidth, alignSelf: "center" }} />
```

What is `scale` in `useWindowDimensions`?

`scale` is the pixel ratio (same as `PixelRatio.get()`). `fontScale` is the user accessibility text scaling factor. Both are included in the hook return value.

How do images interact with responsive layout?

Set image dimensions relative to column width (calculated from `useWindowDimensions`) rather than fixed global pixels. See [Images & Assets](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/images-and-assets/) for asset sizing guidance.

## Related

* [Views, Text & Core Components](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/views-text-and-core-components/) - `View`, `flex`, and StyleSheet fundamentals
* [Images & Assets](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/images-and-assets/) - sizing images relative to viewport width
* [Props, State & Re-renders on Mobile](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/props-state-and-re-renders-on-mobile/) - how dimension-driven state triggers re-renders
* [Platform-Specific Code](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/platform-specific-code/) - `Platform.isPad` and per-platform layout files
* [React Native Basics](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/react-native-basics/) - introductory layout tour
* [Best Practices](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/best-practices/) - team breakpoint conventions and testing matrix

### External Related Links

* [reactnative.dev](https://reactnative.dev/) - official React Native site
* [reactnative.dev/docs](https://reactnative.dev/docs/getting-started) - full RN documentation
* [react.dev](https://react.dev/) - core React concepts RN builds on

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4). NzA2MjAyfDM1OW9pZ2N8b2kuc2VkaXVnZWRvYw==

Reviewed by Chris St. John·Last updated Jul 19, 2026
