# Shadows, Elevation & Borders

Platform differences between iOS shadow and Android elevation.

Highlights / Shadows, Elevation & Borders

* iOS uses shadowColor, shadowOffset, shadowOpacity, and shadowRadius - Android ignores them
* Android elevation draws a material shadow from the view background - set backgroundColor
* overflow: hidden on iOS clips shadow spread - apply shadow to a wrapper View
* StyleSheet.hairlineWidth gives a crisp 1-device-pixel border on both platforms
* borderRadius with overflow hidden is the standard recipe for rounded image masks
* Platform.select inside StyleSheet.create keeps one file for cross-platform cards

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import { Platform, StyleSheet, Text, View } from "react-native";
 
export function ElevatedCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.shadowWrapper}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        {children}
      </View>
    </View>
  );
}
 
const styles = StyleSheet.create({
  shadowWrapper: {
    ...Platform.select({
      ios: {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  title: { fontSize: 17, fontWeight: "600", color: "#0f172a" },
});
```

**When to reach for this:** Cards, sheets, floating buttons, or list rows that need depth - you want one component that looks correct on both iOS and Android without fighting clipped shadows or missing elevation.

## Working Example

```tsx
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
 
const AVATAR = require("./assets/avatar.png");
 
export function ProfileHeader() {
  return (
    <View style={styles.screen}>
      <View style={styles.heroShadow}>
        <View style={styles.heroCard}>
          <View style={styles.avatarRing}>
            <Image source={AVATAR} style={styles.avatar} />
          </View>
          <Text style={styles.name}>Alex Chen</Text>
          <Text style={styles.subtitle}>React Native · Expo SDK 57</Text>
        </View>
      </View>
 
      <Pressable style={({ pressed }) => [styles.fabShadow, pressed && styles.fabPressed]}>
        <View style={styles.fab}>
          <Text style={styles.fabLabel}>+</Text>
        </View>
      </Pressable>
 
      <View style={styles.dividerRow}>
        <View style={styles.hairline} />
        <Text style={styles.dividerLabel}>Recent</Text>
        <View style={styles.hairline} />
      </View>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 20, backgroundColor: "#f8fafc", gap: 24 },
  heroShadow: {
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#cbd5e1",
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: "#2563eb",
    overflow: "hidden",
    ...Platform.select({
      ios: { borderCurve: "continuous" },
      default: {},
    }),
  },
  avatar: { width: "100%", height: "100%" },
  name: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
  subtitle: { fontSize: 14, color: "#64748b" },
  fabShadow: {
    alignSelf: "flex-end",
    borderRadius: 28,
    ...Platform.select({
      ios: {
        shadowColor: "#2563eb",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },
  fabPressed: { opacity: 0.9, transform: [{ scale: 0.96 }] },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  fabLabel: { fontSize: 28, color: "#fff", lineHeight: 32 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  hairline: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: "#cbd5e1" },
  dividerLabel: { fontSize: 12, fontWeight: "600", color: "#94a3b8", letterSpacing: 1 },
});
```

**What this demonstrates:**

* Shadow on an outer `shadowWrapper` - inner card can use `overflow: "hidden"` without clipping iOS shadow
* `Platform.select` pairs iOS `shadow*` props with Android `elevation` in one `StyleSheet`
* `StyleSheet.hairlineWidth` for borders and divider lines that stay crisp on all densities
* `borderCurve: "continuous"` on iOS for smoother circular avatars (ignored on Android)
* FAB uses colored shadow on iOS and higher `elevation` on Android for a floating action look

## Deep Dive

### iOS Shadows

iOS renders shadows from the view's **background and alpha channel**. Four props control the effect:

| Prop | Role | Typical starting value |
| --- | --- | --- |
| `shadowColor` | Shadow tint | `"#000"` or brand color |
| `shadowOffset` | `{ width, height }` offset in dp | `{ width: 0, height: 4 }` |
| `shadowOpacity` | Alpha 0–1 | `0.08` – `0.15` for cards |
| `shadowRadius` | Blur radius in dp | `8` – `16` for soft cards |

```tsx
// iOS-only shadow block
{
  shadowColor: "#0f172a",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
}
```

Requirements on iOS:

* Set an opaque or translucent **`backgroundColor`** on the shadowed view - transparent backgrounds produce weak or invisible shadows.
* **`overflow: "hidden"` clips the shadow** - apply shadow to a parent wrapper; keep `overflow: "hidden"` on the inner content view.
* Shadows do not follow `borderRadius` perfectly on all OS versions - wrapper + inner radius usually matches design intent.

### Android Elevation

Android uses a single **`elevation`** number (dp) to draw a material shadow and z-order the view above siblings.

| `elevation` | Visual weight | Typical use |
| --- | --- | --- |
| `0` | Flat | Flush list rows |
| `2` – `4` | Subtle lift | Cards, chips |
| `6` – `8` | Prominent | FABs, modals |
| `12`+ | Heavy | Dialogs, bottom sheets |

```tsx
// Android-only elevation
{ elevation: 4, backgroundColor: "#fff" }
```

Requirements on Android:

* **`backgroundColor` is mandatory** - elevation draws from the view's background shape.
* `shadowColor`, `shadowOffset`, `shadowOpacity`, and `shadowRadius` are **ignored**.
* Elevation also affects **touch z-order** - higher elevation views receive touches above lower siblings.

### Cross-Platform Pattern

```tsx
const cardShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  android: { elevation: 4 },
  default: {},
});
 
// Spread into StyleSheet entry
card: {
  backgroundColor: "#fff",
  borderRadius: 12,
  ...cardShadow,
},
```

For design-system tokens, export shadow presets:

```tsx
export const shadows = {
  sm: Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
    android: { elevation: 2 },
  }),
  md: Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
    android: { elevation: 4 },
  }),
} as const;
```

### Borders

| Prop | Notes |
| --- | --- |
| `borderWidth` | Uniform or per-side via `borderTopWidth`, etc. |
| `borderColor` | Applies to all sides unless overridden per side |
| `borderRadius` | Rounds corners; use per-corner props for asymmetric radii |
| `borderStyle` | `"solid"` (default), `"dotted"`, `"dashed"` - dashed support varies |
| `StyleSheet.hairlineWidth` | Thinnest visible line (~1 physical pixel) |

```tsx
// Per-side border (common for list separators)
{
  borderBottomWidth: StyleSheet.hairlineWidth,
  borderBottomColor: "#e2e8f0",
}
 
// Rounded mask for images
{
  borderRadius: 12,
  overflow: "hidden",
}
```

**iOS-only:** `borderCurve: "continuous"` produces smoother corners on large radii - especially avatars and pills. Android ignores this prop safely.

### Wrapper vs Single View

```
┌─ shadowWrapper (shadow / elevation, borderRadius) ─┐
│  ┌─ card (backgroundColor, overflow: hidden) ─────┐ │
│  │  content                                       │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

Use a wrapper when the inner view needs `overflow: "hidden"` for images, gradients, or clipped children but must still cast a shadow on iOS.

### TypeScript Notes

```tsx
import type { ViewStyle } from "react-native";
import { Platform, StyleSheet } from "react-native";
 
type ShadowPreset = Pick<
  ViewStyle,
  "shadowColor" | "shadowOffset" | "shadowOpacity" | "shadowRadius" | "elevation"
>;
 
const presets: Record<"sm" | "md", ShadowPreset | undefined> = {
  sm: Platform.select({ ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 }, android: { elevation: 2 } }),
  md: Platform.select({ ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 }, android: { elevation: 4 } }),
};
```

* `Platform.select` return type is a union - spreading into `StyleSheet.create` is valid.
* `shadowOffset` requires `{ width: number; height: number }` - not a tuple.
* `borderCurve` is iOS-specific; TypeScript may include it in `ViewStyle` behind platform extensions.

## Gotchas

* **Shadow invisible on iOS** - Missing `backgroundColor` or fully transparent card background. **Fix:** Set `backgroundColor: "#fff"` (or your surface color) on the shadowed view.
* **`overflow: "hidden"` clips shadow** - Common on cards with rounded images. **Fix:** Move shadow props to an outer wrapper; keep `overflow: "hidden"` on the inner view only.
* **Shadow props on Android** - `shadowColor` and friends silently do nothing. **Fix:** Always pair with `elevation` via `Platform.select`.
* **Elevation without background** - Android draws nothing. **Fix:** Explicit `backgroundColor` on every elevated surface.
* **Hairline borders too thick** - Using `borderWidth: 1` on retina screens looks heavy. **Fix:** `StyleSheet.hairlineWidth` for separators and card outlines.
* **Dashed borders inconsistent** - `borderStyle: "dashed"` renders differently across platforms. **Fix:** Use an SVG or a dedicated border component for pixel-perfect dashes.
* **Shadow on `Text`** - Core `Text` does not support shadow props reliably for card-style depth. **Fix:** Wrap text in a `View` that carries the shadow/elevation.
* **Competing elevations in stacks** - Multiple elevated siblings can produce muddy Android shadows. **Fix:** Elevate only the topmost floating element; keep list rows flat (`elevation: 0`).

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `Platform.select` shadow presets | Standard cards, FABs, chips | You need identical pixel-perfect shadow mockups on both OSes |
| Wrapper + inner card | Rounded content with `overflow: "hidden"` | Simple flat chips with no clipping |
| `react-native-shadow-2` (community) | Complex multi-layer box shadows from design | Expo managed apps avoiding extra native deps |
| `expo-linear-gradient` border fake | Gradient borders without SVG | Simple solid `borderColor` suffices |
| `box-shadow` via WebView / Skia | Design mandates exact CSS shadows | Normal native cards and lists |
| Flat borders only (no shadow) | Dense data tables and settings lists | Marketing hero cards needing depth |

## FAQs

Why does my iOS shadow not show up?

* The view likely has no `backgroundColor` - shadows render from the background layer.
* `overflow: "hidden"` on the same view clips the shadow spread.
* `shadowOpacity: 0` or a zero `shadowRadius` makes the effect invisible.
* Fix: add `backgroundColor`, move shadow to a parent wrapper, and start with `shadowOpacity: 0.1` and `shadowRadius: 8`.

What should I use on Android instead of shadowColor?

* `elevation` - a single number in density-independent pixels.
* Pair with `backgroundColor` on the same view.
* Tune by eye: cards usually land between `2` and `6`; FABs between `6` and `12`.

Can I use the same shadow values on iOS and Android?

* No - iOS uses four shadow props; Android uses `elevation`.
* Visual weight will never match pixel-perfectly - design for perceptual parity, not identical specs.
* `Platform.select` presets per tier (`sm`, `md`, `lg`) keep teams consistent.

Why does overflow hidden break my card shadow?

* On iOS, `overflow: "hidden"` clips everything outside the border box, including shadow blur.
* Pattern: outer `View` carries shadow; inner `View` has `borderRadius`, `backgroundColor`, and `overflow: "hidden"`.

What is StyleSheet.hairlineWidth?

* The thinnest line the device can render - typically one physical pixel.
* Prefer it over `borderWidth: 1` for list separators and subtle card outlines.
* Works for `borderWidth` and for `height` on divider `View`s.

Does borderRadius affect Android elevation?

* Yes - elevation shadow follows the view's background shape including `borderRadius`.
* Very large radii (pills) produce pill-shaped shadows - tune `elevation` down if it looks too heavy.

What is borderCurve continuous on iOS?

* A smoother corner curve than the default circular arc - matches Apple's squircle aesthetic.
* Set `borderCurve: "continuous"` alongside `borderRadius` on iOS.
* Android ignores the prop; no guard needed.

Gotcha: Why do my list row shadows look muddy on Android?

* Stacking `elevation` on every row multiplies shadow draw calls.
* Material lists are usually flat with hairline separators instead.
* Reserve elevation for floating elements (FAB, sticky footer, modal).

Can Text have a shadow?

* `Text` supports `textShadowColor`, `textShadowOffset`, and `textShadowRadius` for glyph outlines.
* View-style `shadow*` props are for containers, not paragraph depth.
* For card elevation, wrap `Text` in an elevated `View`.

How do I border only one side?

```tsx
{
  borderBottomWidth: StyleSheet.hairlineWidth,
  borderBottomColor: "#e2e8f0",
}
```

* Use per-side props: `borderTopWidth`, `borderLeftColor`, etc.
* `borderWidth` alone sets all four sides.

Do shadows impact performance?

* Moderate shadow/blur on a few cards is fine.
* Hundreds of elevated list rows can cost GPU fill on Android.
* Prefer flat rows in long lists; see the style performance article for list tuning.

How do dark mode surfaces affect shadows?

* Light cards on dark backgrounds need lower `shadowOpacity` on iOS - strong black shadows look harsh.
* On Android, elevation is subtler on dark themes but still benefits from a distinct `backgroundColor`.
* Swap shadow presets when the color scheme changes - see the dark mode article.

Can I animate elevation or shadow?

* `Animated` and Reanimated can interpolate `shadowOpacity` and `elevation` for press states.
* Animate sparingly - shadow changes trigger repaints.
* Press feedback often uses `opacity` + `scale` instead of animating blur radius.

What about outline for focus rings?

* React Native has no CSS `outline` prop.
* Use `borderWidth` / `borderColor` toggles on focus, or a dedicated focus ring `View`.
* Accessibility focus indicators are often handled by the OS on pressable elements.

Should I put shadows in a design token file?

* Yes - export `shadows.sm`, `shadows.md`, `shadows.lg` as `Platform.select` objects.
* Spread tokens into `StyleSheet.create` entries to avoid copy-paste drift.
* Pair with surface `backgroundColor` tokens from your theme.

## Related

* [Styling Basics](https://docs.wahwei/reactnative.codeguides.io/styling-layout/styling-basics/) - `StyleSheet.create` and the RN styling mental model
* [Style Performance](https://docs.wahwei/reactnative.codeguides.io/styling-layout/style-performance/) - avoiding inline shadow objects in list rows
* [Dark Mode & Color Schemes](https://docs.wahwei/reactnative.codeguides.io/styling-layout/dark-mode-and-color-schemes/) - surface colors that pair with shadow presets
* [Flexbox Deep Dive](https://docs.wahwei/reactnative.codeguides.io/styling-layout/flexbox-deep-dive/) - stacking elevated FABs and footers in flex layouts
* [Views, Text & Core Components](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/views-text-and-core-components/) - `Platform.select` and card layout primitives
* [Platform-Specific Code](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/platform-specific-code/) - when to split `.ios` / `.android` style files
* [Images & Assets](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/images-and-assets/) - rounded image masks with `overflow: "hidden"`

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
