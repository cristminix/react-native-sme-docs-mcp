# Design Systems Highlights Summary

Every highlight bullet from the 8 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Design Systems Highlights Summary

* Design tokens are named constants - colors, spacing, type - not raw values in screens
* NativeWind v4 maps Tailwind classes to RN style objects at build time via Metro
* Tamagui compiles style props to flat RN objects - fewer allocations in hot paths
* Paper ships Material Design 3 components - Button, TextInput, FAB, Snackbar
* @expo/ui Host is the required root for universal layouts - Column, Row, Text, Button
* Treat the UI package like any npm library - explicit peerDependencies on react and react-native

## [Design Systems Basics](https://docs.wahwei/reactnative.codeguides.io/design-systems/design-systems-basics/)

* Design tokens are named constants - colors, spacing, type - not raw values in screens
* Semantic tokens (surface, textPrimary) survive palette overhauls better than gray-500
* A spacing scale on a 4px grid keeps padding and gaps consistent across components
* Component APIs expose variant, size, and disabled - not one-off style props per screen
* ThemeProvider centralizes active palette; screens call useTheme() instead of hard-coded hex
* Type token objects with as const and derive union types for variant props

## [NativeWind (Tailwind for RN)](https://docs.wahwei/reactnative.codeguides.io/design-systems/nativewind-tailwind-for-rn/)

* NativeWind v4 maps Tailwind classes to RN style objects at build time via Metro
* global.css + tailwind.config content paths must include app/ and components/
* dark: variants follow useColorScheme when darkMode is set to class
* Prefer semantic tokens in tailwind.config theme.extend - not arbitrary values in screens
* className composes like style arrays - later classes override earlier ones
* Profile bundle size before adopting on small apps - config cost has a floor

## [Tamagui](https://docs.wahwei/reactnative.codeguides.io/design-systems/tamagui/)

* Tamagui compiles style props to flat RN objects - fewer allocations in hot paths
* Define tokens once in tamagui.config.ts - colors, space, size, radius
* Styled components accept variant props mapped to token keys, not raw numbers
* TamaguiProvider wraps the app - theme and media queries flow through context
* @tamagui/config provides a sensible default theme to fork, not adopt blindly
* Expo requires react-native-reanimated and a Metro resolver tweak for optional deps

## [React Native Paper](https://docs.wahwei/reactnative.codeguides.io/design-systems/react-native-paper/)

* Paper ships Material Design 3 components - Button, TextInput, FAB, Snackbar
* PaperProvider must wrap the app - theme, icons, and ripple settings flow from context
* MD3Theme maps color roles: primary, onPrimary, surface, onSurface, elevation
* adaptNavigationTheme bridges React Navigation colors with Paper's MD3 palette
* Custom fonts and roundness extend MD3LightTheme / MD3DarkTheme - do not fork per screen
* Paper excels on Android-first apps; iOS still works but reads Material, not Cupertino

## [Expo UI Drop-Ins](https://docs.wahwei/reactnative.codeguides.io/design-systems/expo-ui-drop-ins/)

* @expo/ui Host is the required root for universal layouts - Column, Row, Text, Button
* Universal components render native UI on iOS and Android from one import path
* SwiftUI-specific APIs live under @expo/ui/swift-ui - modifiers, not RN style props
* Jetpack Compose APIs live under @expo/ui/jetpack-compose for Android-only surfaces
* RNHostView embeds standard RN subtrees inside native @expo/ui chrome
* Expo Go supports @expo/ui for prototyping - widgets and extensions need dev builds

## [Building an Internal Component Library](https://docs.wahwei/reactnative.codeguides.io/design-systems/building-an-internal-component-library/)

* Treat the UI package like any npm library - explicit peerDependencies on react and react-native
* Semver major bumps when removing or renaming public component props
* On-device Storybook is the RN catalog - web Storybook misses native fonts and safe areas
* STORYBOOK\_ENABLED entry swap keeps Storybook out of production bundles
* Publish from packages/ui with changesets or semver tags - apps pin exact versions
* Visual regression pairs Storybook with Maestro screenshots - Jest alone misses layout drift

## [Theming & Brand Flavors](https://docs.wahwei/reactnative.codeguides.io/design-systems/theming-and-brand-flavors/)

* Brand flavor is config data - primary hex, logo asset, app name - not a git fork
* EAS build profiles map FLAVOR env to the active brand at compile time
* expo-constants extra.brandFlavor reads the selected flavor in runtime code
* One ThemeProvider accepts flavor + scheme - components never branch on app id
* Shared JS bundle + per-flavor native icons/splash via app.config dynamic config
* Semver token keys across flavors - flavors swap values, not prop names

## [Design Systems Best Practices](https://docs.wahwei/reactnative.codeguides.io/design-systems/best-practices/)

* Tokens before libraries - semantic roles beat raw hex in feature screens
* Component APIs stay small: variant, size, disabled - not style soup per screen
* Pick one styling strategy per app - NativeWind, Tamagui, Paper, or tokens + StyleSheet
* Bake accessibilityRole and accessibilityLabel into primitives, not per-screen patches
* On-device Storybook is the RN catalog - semver the package that screens import
* White-label flavors swap config - never fork repos for logo and primary color

383k393a3c3q3e393a3o1r3e3k3x383c3e3k221z1y3x1v1t1v1z1t20

Reviewed by Chris St. John·Last updated Jul 19, 2026
