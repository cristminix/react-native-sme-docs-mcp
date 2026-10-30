# Styling Best Practices

A condensed summary of the 25 most important best practices drawn from every page in this section.

Highlights / Styling Best Practices

* Cache static styles with StyleSheet.create; reserve inline for dynamic values
* Default flex direction is column - set row explicitly for horizontal layouts
* Apply safe area once at the screen root with react-native-safe-area-context
* Pair iOS shadow props with Android elevation via Platform.select
* Gate first paint until expo-font loads or hide splash on error
* Use semantic color tokens keyed off useColorScheme, not hardcoded hex in screens

1. **Cache static styles with `StyleSheet.create`:** Move layout, spacing, and color rules that do not change per render into a stylesheet - inline object literals allocate on every render and defeat native caching.
2. **Compose with style arrays:** Layer base, state, and overrides as `[styles.card, pressed && styles.cardPressed, props.style]` - order matters; document whether caller or component wins.
3. **Remember the column default:** React Native flex defaults to `column` - set `flexDirection: "row"` explicitly whenever you expect horizontal layout.
4. **Fill screens with `flex: 1`, not `height: "100%"`:** Percentage height needs a parent with defined height; `flex: 1` on the root view (inside safe area) is the reliable viewport fill pattern.
5. **Use `gap` for sibling spacing:** Prefer `gap` on flex containers over margin hacks on first/last child - fewer edge-case bugs when items mount and unmount.
6. **Wrap the app in `SafeAreaProvider` once:** Read insets via `useSafeAreaInsets` or `SafeAreaView` at the screen root - do not nest safe-area padding on every child.
7. **Pick safe-area edges deliberately:** Full-bleed hero images need `edges={['bottom']}` or manual bottom inset only - applying all edges on nested wrappers doubles padding.
8. **Plan for edge-to-edge Android (RN 0.86):** Status bar and navigation bar insets change on modern Android - test on API 35+ devices, not only classic inset models.
9. **Theme with semantic tokens:** Name colors `surface`, `textPrimary`, `borderSubtle` - map tokens to light/dark palettes instead of sprinkling `#111` and `#fff` through feature code.
10. **Sync chrome with `useColorScheme`:** Drive `StatusBar`, tab bars, and navigation headers from the active scheme - hardcoded light status bar icons vanish on dark backgrounds.
11. **Breakpoint on window width, not device class:** `useWindowDimensions().width >= 768` works for Android tablets and foldables - `Platform.isPad` alone is insufficient.
12. **Avoid web-only layout assumptions:** No media queries or `vh` - use hooks, percentage widths, and `flexWrap` for responsive phone/tablet layouts.
13. **Stabilize list wrapper styles:** `contentContainerStyle={{ padding: 16 }}` on `FlatList` recreates every parent render - hoist to `StyleSheet.create` or `useMemo`.
14. **Memoize row components, not just styles:** `memo(Row)` fails when parents pass fresh inline `style` objects - pass `styles.row` references from the stylesheet.
15. **Animate transform and opacity, not layout:** Driving `height` from `setState` every frame triggers Yoga layout each tick - use Reanimated for motion; reserve `LayoutAnimation` for discrete toggles.
16. **Shadow on a wrapper, clip on the inner view:** `overflow: "hidden"` on the same view that carries iOS `shadow*` props clips the shadow - split outer shadow wrapper and inner content.
17. **Always set `backgroundColor` on elevated surfaces:** iOS shadows and Android `elevation` need an opaque surface color - transparent cards produce invisible depth.
18. **Pair iOS shadow with Android elevation:** `shadowColor` is ignored on Android - use `Platform.select` in `StyleSheet.create` for cross-platform cards.
19. **Use `StyleSheet.hairlineWidth` for dividers:** `borderWidth: 1` looks heavy on retina screens - hairline width tracks pixel density.
20. **Load fonts before first meaningful paint:** `useFonts` + `SplashScreen.preventAutoHideAsync` - return `null` at the root until fonts load or error; never flash system font on brand screens.
21. **Register each font weight explicitly:** `fontWeight: "700"` with a single custom family often fails - load `Inter-Bold.ttf` and set `fontFamily: "Inter-Bold"` directly.
22. **Cap scaling on dense UI:** Apply `maxFontSizeMultiplier` on toolbars and chips; allow full dynamic type on body copy - accessibility without breaking layout.
23. **Define a typography scale in tokens:** Map `display`, `title`, `body`, and `label` to `fontSize` + `lineHeight` pairs - screens reference roles, not raw numbers.
24. **Profile before adopting a styling library:** NativeWind, Tamagui, and Unistyles solve scale problems - a handful of `StyleSheet` screens do not need the bundle and config cost.
25. **Audit public styles in code review:** New inline styles in list hot paths and one-off hex colors are regressions - enforce tokens and stylesheet usage in CI lint rules where possible.

## FAQs

When is inline style acceptable?

* Truly dynamic values: progress bar width, animated opacity, pressed-state toggles tied to gesture state.
* Everything else belongs in `StyleSheet.create` or a token module.

Should I use NativeWind for a new Expo SDK 57 app?

* Reach for it when you have a design system with many screens and utility-class ergonomics help velocity.
* Skip it for small apps where `StyleSheet` + tokens stay readable.

Why does my Android shadow not show?

* You likely set iOS-only `shadow*` props - add `elevation` and a solid `backgroundColor`.

How many safe-area wrappers should a screen have?

* One - typically the outermost layout view for that screen.
* Tab layouts may own top inset; child screens should not re-apply top padding.

What is the first responsive layout hook to learn?

* `useWindowDimensions()` - it re-renders on rotation and split-screen, unlike a one-shot `Dimensions.get()`.

Do dark mode tokens belong in StyleSheet?

* Define two token objects (`light`, `dark`) and select at runtime - or use a small `useTheme()` hook that returns the active palette.
* Avoid maintaining duplicate `StyleSheet.create` blocks per scheme unless profiling proves it necessary.

## Related

* [Styling Basics](https://docs.wahwei/reactnative.codeguides.io/styling-layout/styling-basics/) - StyleSheet mental model and intro examples
* [Flexbox Deep Dive](https://docs.wahwei/reactnative.codeguides.io/styling-layout/flexbox-deep-dive/) - direction, flex, align, and layout recipes
* [Safe Areas & Notches](https://docs.wahwei/reactnative.codeguides.io/styling-layout/safe-areas-and-notches/) - insets and edge-to-edge Android
* [Dark Mode & Color Schemes](https://docs.wahwei/reactnative.codeguides.io/styling-layout/dark-mode-and-color-schemes/) - system sync and semantic palettes
* [Style Performance](https://docs.wahwei/reactnative.codeguides.io/styling-layout/style-performance/) - list hot paths and layout thrash
* [Typography Scale & Font Loading](https://docs.wahwei/reactnative.codeguides.io/styling-layout/typography-scale-and-font-loading/) - expo-font and accessible text

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
