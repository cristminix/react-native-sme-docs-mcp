# Design Systems Best Practices

A condensed summary of the 25 most important best practices drawn from every page in this section.

Highlights / Design Systems Best Practices

* Tokens before libraries - semantic roles beat raw hex in feature screens
* Component APIs stay small: variant, size, disabled - not style soup per screen
* Pick one styling strategy per app - NativeWind, Tamagui, Paper, or tokens + StyleSheet
* Bake accessibilityRole and accessibilityLabel into primitives, not per-screen patches
* On-device Storybook is the RN catalog - semver the package that screens import
* White-label flavors swap config - never fork repos for logo and primary color

1. **Start with tokens, not a library:** Define color, spacing, and typography roles in a module before adopting NativeWind, Tamagui, or Paper - libraries consume tokens; they do not replace design decisions.
2. **Name tokens by semantic role:** Use `surface`, `textPrimary`, and `accent` instead of `gray700` - palette overhauls and white-label flavors swap values without renaming every screen.
3. **Keep spacing on a fixed scale:** A 4px grid (`4, 8, 16, 24`) beats ad-hoc `13` and `17` padding - designers and engineers share one rhythm.
4. **Expose small component APIs:** Primitives accept `variant`, `size`, and `disabled` - not open-ended style props that recreate one-off buttons per feature.
5. **One ThemeProvider at the root:** Centralize scheme and brand selection - nested providers cause split-brain colors and double fetches on theme change.
6. **Apply dynamic colors at render:** Module-level `StyleSheet.create` with hard-coded hex does not react to dark mode - pair static layout with `useTheme()` or `dark:` utilities.
7. **Pick one styling strategy per app:** Mixing Tamagui screens, NativeWind screens, and raw `StyleSheet` without boundaries creates bundle bloat and inconsistent motion - choose a spine and wrap legacy incrementally.
8. **Profile before adopting a compiler:** NativeWind and Tamagui solve scale problems - a five-screen MVP does not need Metro transformers or `tamagui.config.ts` maintenance.
9. **NativeWind: static class strings in lists:** Dynamic `` `bg-${x}` `` breaks compile-time extraction - use fixed variant maps on row components.
10. **Tamagui: typed variants over inline hex:** `styled()` variants encode design states - `$brand` tokens keep dark mode and flavors coherent.
11. **React Native Paper: always wrap PaperProvider:** MD3 theme, ripple, and icons flow from context - screens that skip the provider silently fall back to defaults.
12. **Paper + Navigation: use adaptNavigationTheme:** Header and tab colors should match `primary` and `surface` - mismatched chrome reads as two different apps.
13. **@expo/ui for native chrome, RN for density:** Universal `Host`/`Button`/`Switch` excel at platform feel - virtualized lists and custom charts stay in RN (`RNHostView` islands).
14. **SwiftUI modifiers are not RN styles:** Widget and glass layouts use `@expo/ui/swift-ui/modifiers` - do not paste `StyleSheet` into extension targets.
15. **Accessibility belongs in primitives:** Set `accessibilityRole="button"` and labels on library `Button`/`Pressable` once - feature teams forget per-screen patches.
16. **Support dynamic type on text primitives:** Forward `maxFontSizeMultiplier` and test long German strings on `Text` wrappers - dense toolbars cap scaling; body copy should not.
17. **Honor reduced motion in animated primitives:** Loading skeletons and entrance transitions should respect system settings - gate Reanimated entering animations when reduced motion is on.
18. **Contrast-test every brand flavor:** White-label `primary`/`onPrimary` pairs must pass audit per tenant - one passing Acme palette does not certify Globex green.
19. **Storybook documents states, not just happy path:** Empty, loading, error, disabled, and long-text stories catch layout bugs before they reach production auth flows.
20. **Keep Storybook out of production bundles:** Use `STORYBOOK_ENABLED` entry swapping - never import `.rnstorybook` unconditionally in `App.tsx`.
21. **Semver the UI package like any dependency:** Renaming `title` → `label` is a **major** bump - mobile apps pin versions; document breaking visual changes in CHANGELOG.
22. **Export a narrow public API:** Barrel-export only primitives and hooks from `index.ts` - internal helpers prefixed or unexported prevent unsupported coupling.
23. **White-label with flavor config, not git forks:** `BRAND_FLAVOR` in EAS profiles + `brands` registry scales security patches - forks multiply SDK upgrade cost.
24. **Isolate OTA channels per flavor:** Publishing one client's JS bundle to another tenant's channel is a branding and data incident - map channels in `eas.json`.
25. **Cross-review tokens in CI:** Block new raw hex in feature folders and new inline styles in list `renderItem` - design system discipline erodes one PR at a time without lint gates.

## FAQs

When should we adopt NativeWind or Tamagui?

When you have **many screens** sharing tokens and utility or variant ergonomics measurably beats `StyleSheet` maintenance. Stay on tokens + `StyleSheet` until copy-paste drift appears - see [Design Systems Basics](https://docs.wahwei/reactnative.codeguides.io/design-systems/design-systems-basics/).

Paper or custom primitives?

Choose **Paper** for MD3 Android-first products with standard forms and dialogs. Choose **custom + tokens** when brand language is not Material. See [React Native Paper](https://docs.wahwei/reactnative.codeguides.io/design-systems/react-native-paper/).

Where does @expo/ui fit?

Drop-in **native** controls and hybrid layouts - not a full replacement for lists and navigation. See [Expo UI Drop-Ins](https://docs.wahwei/reactnative.codeguides.io/design-systems/expo-ui-drop-ins/).

How do dark mode and brand flavors compose?

**Flavor** picks brand primary and assets; **scheme** picks neutral backgrounds and borders. Merge in one provider - see [Theming & Brand Flavors](https://docs.wahwei/reactnative.codeguides.io/design-systems/theming-and-brand-flavors/).

Do we need an internal npm package?

Extract when **two apps** share primitives or when Storybook and semver matter. Single-app teams can use `components/` until the second consumer appears - see [Building an Internal Component Library](https://docs.wahwei/reactnative.codeguides.io/design-systems/building-an-internal-component-library/).

What is the minimum a11y gate for primitives?

`accessibilityRole`, visible label (or `accessibilityLabel` on icon-only controls), contrast on text, and VoiceOver/TalkBack smoke on each new primitive - see [Accessibility Basics](https://docs.wahwei/reactnative.codeguides.io/accessibility/accessibility-basics/).

## Related

* [Design Systems Basics](https://docs.wahwei/reactnative.codeguides.io/design-systems/design-systems-basics/) - tokens, spacing, and component API examples
* [NativeWind (Tailwind for RN)](https://docs.wahwei/reactnative.codeguides.io/design-systems/nativewind-tailwind-for-rn/) - utility classes and dark mode on Expo
* [Tamagui](https://docs.wahwei/reactnative.codeguides.io/design-systems/tamagui/) - compiled tokens and styled primitives
* [React Native Paper](https://docs.wahwei/reactnative.codeguides.io/design-systems/react-native-paper/) - MD3 theming and PaperProvider
* [Expo UI Drop-Ins](https://docs.wahwei/reactnative.codeguides.io/design-systems/expo-ui-drop-ins/) - universal vs SwiftUI/Compose surfaces
* [Building an Internal Component Library](https://docs.wahwei/reactnative.codeguides.io/design-systems/building-an-internal-component-library/) - Storybook and semver
* [Theming & Brand Flavors](https://docs.wahwei/reactnative.codeguides.io/design-systems/theming-and-brand-flavors/) - white-label without forks
* [Dark Mode & Color Schemes](https://docs.wahwei/reactnative.codeguides.io/styling-layout/dark-mode-and-color-schemes/) - semantic palettes and system sync
* [Accessibility Basics](https://docs.wahwei/reactnative.codeguides.io/accessibility/accessibility-basics/) - assistive tech fundamentals
* [Visual Regression & Storybook](https://docs.wahwei/reactnative.codeguides.io/testing/visual-regression-and-storybook/) - on-device catalog and screenshots

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

cGJxcnRodnFyZi52YnxwdHZiODg0fDIwMjYwNw==

Reviewed by Chris St. John·Last updated Jul 19, 2026
