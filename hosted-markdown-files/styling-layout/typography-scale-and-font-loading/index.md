# Typography Scale & Font Loading

`expo-font`, custom families, and accessible text sizing.

Highlights / Typography Scale & Font Loading

* Load custom fonts with expo-font useFonts before rendering branded text
* Gate the splash screen until fonts resolve - avoid FOUT with SplashScreen.preventAutoHideAsync
* Define a typography scale as tokens (display, title, body, caption) not ad-hoc font sizes
* fontFamily must match the key passed to useFonts exactly - including weight variants
* allowFontScaling respects system accessibility settings - cap with maxFontSizeMultiplier on dense UI
* lineHeight is in dp; pair with fontSize for readable multi-line body copy

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install expo-font expo-splash-screen
```

```tsx
// app/_layout.tsx (Expo Router root) or App.tsx
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { typography } from "./theme/typography";
 
SplashScreen.preventAutoHideAsync();
 
export default function RootLayout() {
  const [loaded, error] = useFonts({
    "Inter-Regular": require("./assets/fonts/Inter-Regular.ttf"),
    "Inter-SemiBold": require("./assets/fonts/Inter-SemiBold.ttf"),
  });
 
  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);
 
  if (!loaded && !error) return null;
 
  return (
    <View style={{ flex: 1 }}>
      <Text style={typography.title}>Typography ready</Text>
      <Text style={typography.body}>Inter loads before first paint.</Text>
    </View>
  );
}
```

```tsx
// theme/typography.ts
import { StyleSheet } from "react-native";
 
export const typography = StyleSheet.create({
  title: {
    fontFamily: "Inter-SemiBold",
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.3,
    color: "#0f172a",
  },
  body: {
    fontFamily: "Inter-Regular",
    fontSize: 16,
    lineHeight: 24,
    color: "#334155",
  },
  caption: {
    fontFamily: "Inter-Regular",
    fontSize: 12,
    lineHeight: 16,
    color: "#64748b",
  },
});
```

**When to reach for this:** Brand fonts, consistent heading hierarchy, or accessibility-safe text - you need custom families loaded before UI renders and a token scale instead of magic numbers scattered in screens.

## Working Example

```tsx
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { PixelRatio, StyleSheet, Text, View } from "react-native";
 
SplashScreen.preventAutoHideAsync();
 
const FONT_SCALE = PixelRatio.getFontScale();
 
type TextVariant = "display" | "title" | "body" | "caption" | "label";
 
const variantStyles: Record<TextVariant, object> = {
  display: typography.display,
  title: typography.title,
  body: typography.body,
  caption: typography.caption,
  label: typography.label,
};
 
function AppText({
  variant = "body",
  children,
  maxScale = 1.35,
}: {
  variant?: TextVariant;
  children: React.ReactNode;
  maxScale?: number;
}) {
  return (
    <Text
      style={variantStyles[variant]}
      allowFontScaling
      maxFontSizeMultiplier={maxScale}
    >
      {children}
    </Text>
  );
}
 
export default function TypographyScreen() {
  const [fontsLoaded, fontError] = useFonts({
    "Inter-Regular": require("./assets/fonts/Inter-Regular.ttf"),
    "Inter-SemiBold": require("./assets/fonts/Inter-SemiBold.ttf"),
    "Inter-Bold": require("./assets/fonts/Inter-Bold.ttf"),
  });
 
  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);
 
  if (!fontsLoaded && !fontError) return null;
 
  return (
    <View style={styles.screen}>
      <AppText variant="display">Good morning</AppText>
      <AppText variant="title">Your tasks today</AppText>
      <AppText variant="body">
        System font scale is {FONT_SCALE.toFixed(2)}×. Body copy scales with accessibility
        settings up to the configured cap.
      </AppText>
      <AppText variant="caption">Last synced 2 min ago</AppText>
      <View style={styles.chip}>
        <AppText variant="label" maxScale={1.2}>
          3 overdue
        </AppText>
      </View>
    </View>
  );
}
 
const typography = StyleSheet.create({
  display: {
    fontFamily: "Inter-Bold",
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.5,
    color: "#0f172a",
  },
  title: {
    fontFamily: "Inter-SemiBold",
    fontSize: 22,
    lineHeight: 28,
    color: "#0f172a",
  },
  body: {
    fontFamily: "Inter-Regular",
    fontSize: 16,
    lineHeight: 24,
    color: "#334155",
  },
  caption: {
    fontFamily: "Inter-Regular",
    fontSize: 13,
    lineHeight: 18,
    color: "#64748b",
  },
  label: {
    fontFamily: "Inter-SemiBold",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#475569",
  },
});
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, gap: 12, backgroundColor: "#f8fafc" },
  chip: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#fee2e2",
  },
});
```

**What this demonstrates:**

* `useFonts` loads multiple weights as separate family keys - the Expo SDK 57 pattern for static TTF files
* Splash screen stays visible until fonts load or error, preventing flash of system font
* Typography tokens (`display`, `title`, `body`, `caption`, `label`) centralize size, line height, and family
* `AppText` wrapper applies `allowFontScaling` and per-variant `maxFontSizeMultiplier` caps
* `PixelRatio.getFontScale()` surfaces the current accessibility multiplier for layout debugging

## Deep Dive

### Loading Fonts with expo-font

`expo-font` ships with Expo SDK 57 and wraps native font registration on iOS and Android.

| API | Use case |
| --- | --- |
| `useFonts(map)` | React hook - returns `[loaded, error]`; best for root layout gating |
| `Font.loadAsync(map)` | Imperative preload in bootstrap routines alongside `Asset.loadAsync` |
| `Font.isLoaded(name)` | Check a single family before rendering a lazy subtree |

```tsx
import * as Font from "expo-font";
 
// Imperative batch (e.g. before navigation mounts)
await Font.loadAsync({
  "Inter-Regular": require("./assets/fonts/Inter-Regular.ttf"),
});
```

Install aligned to SDK 57:

```bash
npx expo install expo-font expo-splash-screen
```

Font files must live under `assets/` and be statically `require()`'d - Metro bundles them at build time.

### Splash Screen Gate

Without a gate, React renders immediately with the system font, then swaps when custom fonts arrive (**flash of unstyled text**).

```tsx
import * as SplashScreen from "expo-splash-screen";
 
SplashScreen.preventAutoHideAsync();
 
// In root component
useEffect(() => {
  if (loaded || error) SplashScreen.hideAsync();
}, [loaded, error]);
 
if (!loaded && !error) return null;
```

* Call `preventAutoHideAsync` at module scope before the first render.
* Return `null` (or a minimal placeholder) while `loaded` is false.
* Hide splash on **error** too - otherwise the app stalls on a frozen splash screen.

### Font Family vs fontWeight

React Native does **not** map `fontWeight: "600"` to a custom TTF automatically. Each weight/style is usually a separate file registered under its own family name.

```tsx
// Works - explicit family per file
{ fontFamily: "Inter-SemiBold", fontSize: 18 }
 
// Unreliable with custom fonts - may fall back to system bold
{ fontFamily: "Inter-Regular", fontWeight: "600", fontSize: 18 }
```

| Approach | Pros | Cons |
| --- | --- | --- |
| Separate files per weight (`Inter-Bold`, etc.) | Predictable on iOS and Android | More files to load |
| Single variable font (when supported) | One file | Verify RN/Expo support for your font format |
| System font (`fontFamily: undefined`) | Zero load time, native feel | No brand typography |

### Typography Scale Tokens

Define a fixed ramp - do not pick `fontSize` per screen ad hoc.

| Token | Typical `fontSize` / `lineHeight` | Use |
| --- | --- | --- |
| `display` | 32–40 / 38–48 | Hero headings |
| `title` | 20–24 / 26–32 | Screen titles, card headers |
| `body` | 15–17 / 22–26 | Paragraphs, list primary text |
| `caption` | 11–13 / 14–18 | Timestamps, metadata |
| `label` | 11–12 / 14–16 | Chips, badges, overlines |

```tsx
export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
} as const;
 
// lineHeight ≈ 1.4–1.5 × fontSize for body; tighter for display
```

Pair tokens with `letterSpacing` and `textTransform` on labels - keep numeric rhythm in one module.

### Accessible Text Sizing

iOS and Android expose **font scale** accessibility settings. React Native respects them by default on `Text`.

| Prop | Default | Purpose |
| --- | --- | --- |
| `allowFontScaling` | `true` | When `false`, ignores system font scale |
| `maxFontSizeMultiplier` | unlimited | Caps how large text can grow (iOS/Android) |
| `adjustsFontSizeToFit` | `false` | Shrinks text to fit `numberOfLines` box (iOS) |

```tsx
<Text allowFontScaling maxFontSizeMultiplier={1.3} style={typography.body}>
  Accessible body copy
</Text>
 
// Dense UI - toolbar, tab labels
<Text maxFontSizeMultiplier={1.1} numberOfLines={1}>
  Dashboard
</Text>
```

Use `PixelRatio.getFontScale()` to log or adapt layouts at extreme scales (e.g. switch list rows to two lines).

**Do not** disable `allowFontScaling` app-wide - it breaks accessibility. Cap selectively on chips, nav bars, and fixed-height buttons.

### lineHeight and Vertical Rhythm

* `lineHeight` is in **density-independent pixels**, not unitless like CSS `line-height: 1.5`.
* Rule of thumb: `lineHeight = fontSize × 1.4` for body, tighter for large display type.
* `Text` inside a row with `alignItems: "center"` may look off if line heights differ - normalize variants.

```tsx
body: {
  fontSize: 16,
  lineHeight: 24, // 1.5× - comfortable paragraph
},
display: {
  fontSize: 34,
  lineHeight: 40, // ~1.18× - tight hero
},
```

### Combining with Images and Assets

Load fonts in the same bootstrap routine as image preloading:

```tsx
import { Asset } from "expo-asset";
import * as Font from "expo-font";
 
export async function loadResources() {
  await Promise.all([
    Asset.loadAsync([require("./assets/logo.png")]),
    Font.loadAsync({
      "Inter-Regular": require("./assets/fonts/Inter-Regular.ttf"),
    }),
  ]);
}
```

See the images and assets article for splash coordination with `Asset.loadAsync`.

### TypeScript Notes

```tsx
import type { TextStyle } from "react-native";
 
export type TypographyVariant = "display" | "title" | "body" | "caption";
 
export const typography: Record<TypographyVariant, TextStyle> = StyleSheet.create({
  display: { fontFamily: "Inter-Bold", fontSize: 34, lineHeight: 40 },
  title: { fontFamily: "Inter-SemiBold", fontSize: 22, lineHeight: 28 },
  body: { fontFamily: "Inter-Regular", fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: "Inter-Regular", fontSize: 13, lineHeight: 18 },
});
```

* `TextStyle` includes `fontFamily`, `fontSize`, `lineHeight`, `letterSpacing`, `fontVariant`.
* Font map keys in `useFonts` are strings - use the same string in `fontFamily`.
* `require()` of `.ttf` / `.otf` returns a number (asset module ID) at build time.

## Gotchas

* **Flash of system font** - Rendering text before `useFonts` resolves. **Fix:** Gate root layout with splash screen + `return null` until `loaded`.
* **fontWeight with custom family** - `fontFamily: "Inter"` + `fontWeight: "700"` often ignores the custom file. **Fix:** Register each weight as its own family name and reference it directly.
* **Wrong font family string** - `fontFamily` must match the `useFonts` key exactly (`"Inter-SemiBold"`, not `"Inter SemiBold"`). **Fix:** Copy keys from the load map.
* **Missing font file in bundle** - Dynamic `require` paths fail Metro static analysis. **Fix:** Static `require("./assets/fonts/Inter-Regular.ttf")` only.
* **Uncapped scaling breaks layouts** - Large accessibility fonts overflow toolbars and chips. **Fix:** `maxFontSizeMultiplier` on dense components; allow full scaling on body copy.
* **lineHeight too small** - Descenders clip on Android with tight line heights. **Fix:** Increase `lineHeight` or add `paddingVertical` on single-line badges.
* **Splash never hides on font error** - Waiting only for `loaded`. **Fix:** `if (loaded || error) SplashScreen.hideAsync()` and show a fallback system-font UI.
* **Variable font assumptions** - Not all variable font files work identically across platforms. **Fix:** Test on both iOS and Android devices; fall back to static weights if weights do not resolve.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `useFonts` hook at root | Expo Router / single root layout | Fonts needed only in one lazy screen (still preload at root for consistency) |
| `Font.loadAsync` in bootstrap | Shared loader with `Asset.loadAsync` | You prefer hook-driven splash gating |
| System fonts only | Utilities, internal tools, fastest ship | Brand guidelines require custom type |
| `@expo-google-fonts/*` packages | Popular open fonts without bundling files | Corporate licensed fonts not on Google Fonts |
| `expo-google-fonts` + `useFonts` | Quick Inter/Roboto setup | You already ship licensed OTF/TTF assets |
| Tamagui / NativeWind text tokens | Design system with themed typography | One screen with two text styles |

## FAQs

How do I install expo-font in Expo SDK 57?

```bash
npx expo install expo-font expo-splash-screen
```

* `expo-font` is included in the Expo SDK - `expo install` pins a compatible version.
* Import `useFonts` from `expo-font` in your root layout.
* Place `.ttf` or `.otf` files under `assets/fonts/` and static `require()` them.

What is the difference between useFonts and Font.loadAsync?

* `useFonts` is a React hook that triggers re-render when loading completes - ideal for component trees.
* `Font.loadAsync` returns a Promise - ideal for imperative bootstrap before `registerRootComponent`.
* Both accept the same map of family name → `require()` asset.

Why must I load each font weight separately?

* React Native selects fonts by **family name**, not CSS-style weight synthesis.
* Each TTF file registers under the key you provide in `useFonts`.
* Reference `"Inter-Bold"` in `fontFamily`, not `"Inter"` with `fontWeight: "700"`.

How do I prevent the flash of unstyled text?

```tsx
SplashScreen.preventAutoHideAsync();
// ...
if (!loaded && !error) return null;
```

* Keep the splash visible until fonts load.
* Do not render branded `Text` until `loaded` is true.
* Hide splash on error so the app does not hang.

What is a typography scale?

* A fixed set of text styles (display, title, body, caption) with paired `fontSize` and `lineHeight`.
* Centralized in `theme/typography.ts` as `StyleSheet.create` or plain objects.
* Screens reference tokens - not raw `fontSize: 17` literals.

Should allowFontScaling be true or false?

* Default `true` for almost all user-facing copy - respects accessibility settings.
* Set `false` only for decorative text or fixed-size icons implemented as text (rare).
* Prefer `maxFontSizeMultiplier` over disabling scaling entirely.

What does maxFontSizeMultiplier do?

* Caps how much the system font scale can enlarge text.
* `1.0` means no scaling; `1.3` allows up to 30% larger than the style's `fontSize`.
* Apply lower caps on nav bars, chips, and buttons; keep body copy at `1.5` or higher.

Gotcha: Why does my custom font work on iOS but not Android?

* Family name mismatch - Android is stricter about the exact `fontFamily` string.
* Font file not included in the bundle - verify static `require()` path.
* Using `fontWeight` instead of the correct family file - load and reference each weight explicitly.

How do I set lineHeight correctly?

* Use dp values, not unitless multipliers: `lineHeight: 24` with `fontSize: 16`.
* Body text: ~1.4–1.5× `fontSize`; display headings: ~1.1–1.2×.
* If glyphs clip, increase `lineHeight` or add vertical padding.

Can I use Google Fonts without downloading files?

* `@expo-google-fonts/inter` and similar packages wrap `useFonts` with pre-bundled assets.
* Install: `npx expo install @expo-google-fonts/inter expo-font`.
* Corporate apps with licensed fonts still use local `require()` of OTF/TTF files.

How does font scale affect layout?

* Larger text increases line boxes and can reflow flex rows.
* Use `numberOfLines`, `flexShrink: 1`, and multi-line toolbars at high scales.
* `PixelRatio.getFontScale()` helps debug layout at accessibility settings.

Should I use adjustsFontSizeToFit?

* Shrinks text to fit a fixed box when `numberOfLines` is set - mostly iOS.
* Useful for dynamic labels in fixed-width tabs.
* Do not rely on it for body paragraphs - let text wrap naturally.

How do I type typography tokens in TypeScript?

```tsx
const typography = StyleSheet.create({ ... }) satisfies Record<string, TextStyle>;
```

* Export a union type for variant names: `type Variant = keyof typeof typography`.
* Prop-type wrapper components with `variant: Variant` for autocomplete.

Do fonts slow app startup?

* Each TTF adds decode and registration time at launch.
* Load only weights you use - omit thin/black weights if unused.
* Batch with splash gate so users see splash, not a font swap.

How do nested Text components inherit fonts?

* Nested `Text` inherits parent `fontSize`, `fontFamily`, `color`, and `lineHeight` unless overridden.
* Inline links inside body copy can omit `fontFamily` if the parent body style already sets it.
* Override only the keys that differ (color, fontFamily for monospace snippets).

## Related

* [Styling Basics](https://docs.wahwei/reactnative.codeguides.io/styling-layout/styling-basics/) - `StyleSheet.create` and text style composition
* [Style Performance](https://docs.wahwei/reactnative.codeguides.io/styling-layout/style-performance/) - stable typography tokens vs inline text styles
* [Responsive & Adaptive Layout](https://docs.wahwei/reactnative.codeguides.io/styling-layout/responsive-and-adaptive-layout/) - adapting layouts when font scale is high
* [Dark Mode & Color Schemes](https://docs.wahwei/reactnative.codeguides.io/styling-layout/dark-mode-and-color-schemes/) - text color tokens per color scheme
* [Images & Assets](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/images-and-assets/) - `useFonts` alongside `Asset.loadAsync`
* [Views, Text & Core Components](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/views-text-and-core-components/) - `Text` nesting and truncation
* [Styling Best Practices](https://docs.wahwei/reactnative.codeguides.io/styling-layout/best-practices/) - design tokens and when to adopt a styling library

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

cGJxcnRodnFyZi52YnxwdHZiOTM5fDIwMjYwNw==

Reviewed by Chris St. John·Last updated Jul 19, 2026
