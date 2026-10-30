# Dynamic Type & Font Scaling

Respecting system text size without layout breaks. A cookbook for **`allowFontScaling`**, **`maxFontSizeMultiplier`**, and **layout patterns** that survive iOS Dynamic Type and Android font size settings.

Highlights / Dynamic Type & Font Scaling

* allowFontScaling defaults to true on Text - disabling app-wide breaks accessibility compliance
* maxFontSizeMultiplier caps growth on dense UI without blocking body copy scaling
* Flexible layouts with flexWrap and minHeight survive extreme Dynamic Type settings
* PixelRatio.getFontScale() helps adapt toolbars and chips at runtime
* Design-system Text primitives should own scaling policy per variant
* Test maximum font scale on smallest phone before store submission

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import type { TextProps } from "react-native";
import { PixelRatio, StyleSheet, Text, View } from "react-native";
 
type AppTextProps = TextProps & {
  variant?: "body" | "caption" | "toolbar";
};
 
const SCALE_CAPS = {
  body: undefined,
  caption: 1.5,
  toolbar: 1.2,
} as const;
 
export function AppText({ variant = "body", style, ...rest }: AppTextProps) {
  const cap = SCALE_CAPS[variant];
 
  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={cap}
      style={[typography[variant], style]}
      {...rest}
    />
  );
}
 
const typography = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 24 },
  caption: { fontSize: 13, lineHeight: 18 },
  toolbar: { fontSize: 14, lineHeight: 18, fontWeight: "600" },
});
 
export function useFontScale() {
  return PixelRatio.getFontScale();
}
 
export function ScalableRow({ title, meta }: { title: string; meta: string }) {
  return (
    <View style={styles.row}>
      <AppText variant="body" style={styles.title}>
        {title}
      </AppText>
      <AppText variant="caption" style={styles.meta}>
        {meta}
      </AppText>
    </View>
  );
}
 
const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingVertical: 12, alignItems: "center" },
  title: { flexShrink: 1 },
  meta: { color: "#64748b" },
});
```

**When to reach for this:** Any screen with fixed-height toolbars, chips, bottom tabs, or multi-column rows - users with large text settings will clip or overlap your UI unless you plan for scale.

## Working Example

Settings list that reflows from single-line to multi-line when font scale exceeds a threshold.

```tsx
import { useMemo } from "react";
import { PixelRatio, Pressable, StyleSheet, Text, View } from "react-native";
 
const LARGE_SCALE_THRESHOLD = 1.3;
 
export function SettingsScreen() {
  const fontScale = PixelRatio.getFontScale();
  const stacked = useMemo(() => fontScale >= LARGE_SCALE_THRESHOLD, [fontScale]);
 
  return (
    <View style={styles.screen}>
      <View style={[styles.toolbar, stacked && styles.toolbarStacked]}>
        <Text
          style={styles.toolbarTitle}
          maxFontSizeMultiplier={1.2}
          numberOfLines={stacked ? 2 : 1}
        >
          Settings
        </Text>
      </View>
 
      <Pressable style={[styles.row, stacked && styles.rowStacked]}>
        <Text style={styles.rowTitle} allowFontScaling>
          Notifications
        </Text>
        <Text style={styles.rowValue} maxFontSizeMultiplier={1.4}>
          Enabled
        </Text>
      </Pressable>
 
      <Pressable style={[styles.row, stacked && styles.rowStacked]}>
        <Text style={styles.rowTitle} allowFontScaling>
          Language
        </Text>
        <Text style={styles.rowValue} maxFontSizeMultiplier={1.4}>
          English
        </Text>
      </Pressable>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 8 },
  toolbar: { minHeight: 44, justifyContent: "center" },
  toolbarStacked: { minHeight: 56, paddingVertical: 8 },
  toolbarTitle: { fontSize: 20, fontWeight: "700" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
    paddingVertical: 8,
    gap: 12,
  },
  rowStacked: { flexDirection: "column", alignItems: "flex-start" },
  rowTitle: { fontSize: 16, fontWeight: "600", flexShrink: 1 },
  rowValue: { fontSize: 14, color: "#64748b" },
});
```

**What this demonstrates:**

* **`PixelRatio.getFontScale()`** drives layout mode switches at extreme scales
* **`maxFontSizeMultiplier`** on toolbar vs uncapped body text
* **`flexWrap` / column reflow** instead of `numberOfLines={1}` truncation on primary labels
* **`minHeight`** on rows preserves touch targets when text wraps

## Cookbook Patterns

### Pattern 1: Scaling Policy Table

| UI region | `allowFontScaling` | `maxFontSizeMultiplier` | Layout note |
| --- | --- | --- | --- |
| Body paragraphs | `true` | none (uncapped) | Let text wrap; avoid fixed heights |
| Buttons (primary) | `true` | `1.3`–`1.5` | `minHeight: 44`, vertical padding |
| Tab bar labels | `true` | `1.1`–`1.2` | Short labels; allow two lines if needed |
| Chips / badges | `true` | `1.1` | `flexWrap` on chip rows |
| Data table headers | `true` | `1.2` | Switch to card layout at high scale |
| Decorative icons | N/A | N/A | Icon size fixed; label carries meaning |

### Pattern 2: AppText in the Design System

Centralize typography tokens - see [Typography Scale & Font Loading](https://docs.wahwei/reactnative.codeguides.io/styling-layout/typography-scale-and-font-loading/) and [Design Systems Basics](https://docs.wahwei/reactnative.codeguides.io/design-systems/design-systems-basics/).

```tsx
// shared/ui/AppText.tsx - single scaling policy
export const typography = StyleSheet.create({
  display: { fontSize: 34, lineHeight: 40 },
  title: { fontSize: 22, lineHeight: 28 },
  body: { fontSize: 16, lineHeight: 24 },
  caption: { fontSize: 13, lineHeight: 18 },
});
```

* Ban raw `Text` in `features/**` via ESLint - force `AppText` variants
* Document which variants are **uncapped** in Storybook

### Pattern 3: Avoid Clipping with Flexible Layout

```tsx
// Fragile - fixed height clips large text
<View style={{ height: 40 }}>
  <Text numberOfLines={1}>Account settings and privacy controls</Text>
</View>
 
// Resilient - grows with content
<View style={{ minHeight: 44, paddingVertical: 8 }}>
  <Text style={{ flexShrink: 1 }}>Account settings and privacy controls</Text>
</View>
```

| Anti-pattern | Fix |
| --- | --- |
| `height: 32` on labels | `minHeight` + padding |
| `numberOfLines={1}` on titles | Wrap or stack layout |
| Horizontal row without `flexShrink` | `flexShrink: 1` on text side |
| Absolute-positioned badges over text | Move badge below title at high scale |

### Pattern 4: adjustsFontSizeToFit (iOS, Use Sparingly)

```tsx
<Text
  adjustsFontSizeToFit
  numberOfLines={1}
  minimumFontScale={0.85}
  maxFontSizeMultiplier={1.2}
  style={styles.tabLabel}
>
  Dashboard
</Text>
```

* Shrinks text to fit box - acceptable for **single-word tab labels**, not body copy
* Android ignores `adjustsFontSizeToFit` - do not rely on it cross-platform

### Pattern 5: Listen for Font Scale Changes

Font scale can change while the app is backgrounded (user adjusts system settings).

```tsx
import { useEffect, useState } from "react";
import { PixelRatio, AppState } from "react-native";
 
export function useFontScale() {
  const [scale, setScale] = useState(PixelRatio.getFontScale());
 
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setScale(PixelRatio.getFontScale());
      }
    });
    return () => sub.remove();
  }, []);
 
  return scale;
}
```

* Recompute layout flags when app returns active
* Pair with responsive breakpoints on tablets - [Split View & Tablet Layouts](https://docs.wahwei/reactnative.codeguides.io/expo-router-advanced/split-view-and-tablet-layouts/)

### Pattern 6: Do Not Disable Scaling Globally

```tsx
// Anti-pattern - rejects accessibility settings
<Text allowFontScaling={false}>Terms and conditions</Text>
 
// Prefer selective cap on dense chrome only
<Text maxFontSizeMultiplier={1.15} style={styles.badge}>
  PRO
</Text>
```

Disabling scaling app-wide is a **store-review and procurement risk** - cap selectively instead.

## Deep Dive

### iOS Dynamic Type vs Android Font Size

| Setting path | Effect in RN |
| --- | --- |
| iOS Display & Text Size → Larger Text | Scales `Text` when `allowFontScaling` is true |
| Android Display → Font size | Same via `PixelRatio.getFontScale()` |
| Per-app text size (iOS 15+) | Still flows through font scale APIs |

`lineHeight` should scale with `fontSize` - use token pairs (`16/24`, `22/28`), not arbitrary single values.

### Testing Procedure

```text
1. iOS: Settings → Accessibility → Display & Text Size → Larger Text → maximum
2. Android: Settings → Display → Font size → largest
3. Walk onboarding, form, tab bar, and checkout
4. Verify: no clipped CTAs, no overlapping tab icons, no truncated legal text
5. Screenshot failures for design review - not just engineering tickets
```

### Relationship to Screen Readers

Large text and screen readers often overlap - users may enable both. Layouts that survive font scaling usually help **zoom and reader** users too. Announce layout changes sparingly; reflow alone does not need `announceForAccessibility`.

## Gotchas

* **`allowFontScaling={false}` on `TextInput`** - users cannot enlarge field text; avoid unless duplicating preview text nearby.
* **Mixed font sizes in a row** - misaligned baselines when only one side scales; normalize variants.
* **Icons sized in dp only** - text grows, icons do not; leave gap between icon and label.
* **Bottom tabs with fixed tab bar height** - Expo Router native tabs may clip; test on device.
* **WebView content** - RN font scale does not propagate; native chrome still must scale.

## FAQs

What is a safe default for maxFontSizeMultiplier?

* Body: uncapped.
* Navigation chrome: `1.1`–`1.2`.
* Buttons and list titles: `1.3`–`1.5`.
* Tune per design system - document in Storybook knobs.

Should images and icons scale with text?

* Icons generally stay fixed size; increase tap padding.
* Illustrations with embedded text should use SVG/text overlays that scale - or provide accessible labels.

Does PixelRatio.getFontScale() update live?

* Not continuously - re-read on `AppState` active or dimension changes.
* Do not poll in a `setInterval` - event-driven refresh is enough.

## Related

* [Typography Scale & Font Loading](https://docs.wahwei/reactnative.codeguides.io/styling-layout/typography-scale-and-font-loading/) - font tokens and line heights
* [Styling Best Practices](https://docs.wahwei/reactnative.codeguides.io/styling-layout/best-practices/) - scaling caps on dense UI
* [Design Systems Basics](https://docs.wahwei/reactnative.codeguides.io/design-systems/design-systems-basics/) - `AppText` primitive ownership
* [Accessibility Basics](https://docs.wahwei/reactnative.codeguides.io/accessibility/accessibility-basics/) - device testing fundamentals
* [Accessibility Audit Checklist](https://docs.wahwei/reactnative.codeguides.io/accessibility/accessibility-audit-checklist/) - font scale gate before release
* [Accessibility Best Practices](https://docs.wahwei/reactnative.codeguides.io/accessibility/best-practices/) - section summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
