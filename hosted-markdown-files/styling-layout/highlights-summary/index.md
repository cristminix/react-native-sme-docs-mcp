# Styling & Layout Highlights Summary

Every highlight bullet from the 9 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Styling & Layout Highlights Summary

* React Native styles are JavaScript objects - no CSS cascade, classes, or selectors
* React Native defaults to flexDirection: column - opposite of most web row-first layouts
* Use react-native-safe-area-context - not the deprecated core SafeAreaView
* useColorScheme returns 'light', 'dark', or null - branch styles from a token object
* There are no CSS media queries - use useWindowDimensions and app-defined breakpoints
* StyleSheet.create registers styles once - inline objects allocate on every render

## [Styling Basics](https://docs.wahwei/reactnative.codeguides.io/styling-layout/styling-basics/)

* React Native styles are JavaScript objects - no CSS cascade, classes, or selectors
* StyleSheet.create validates properties and sends cached IDs to the native layer
* Flexbox defaults to column direction - the opposite of most web layouts
* Combine styles with arrays; later entries override earlier ones
* useColorScheme reads the system light/dark preference for dynamic palettes
* SafeAreaView from react-native-safe-area-context clears notches and home indicators
* Platform.select is the idiomatic way to branch iOS shadow vs Android elevation

## [Flexbox Deep Dive](https://docs.wahwei/reactnative.codeguides.io/styling-layout/flexbox-deep-dive/)

* React Native defaults to flexDirection: column - opposite of most web row-first layouts
* flex: 1 means grow to fill remaining space along the main axis
* justifyContent aligns on the main axis; alignItems on the cross axis
* gap replaces margin hacks between flex children (RN 0.71+)
* flexShrink: 0 prevents squashed icons and avatars in crowded rows
* The header–content–footer shell is three nested flex: 1 containers

## [Safe Areas & Notches](https://docs.wahwei/reactnative.codeguides.io/styling-layout/safe-areas-and-notches/)

* Use react-native-safe-area-context - not the deprecated core SafeAreaView
* Wrap the app root in SafeAreaProvider once; read insets via hook or SafeAreaView
* edges prop controls which sides get padding - omit bottom above tab bars
* RN 0.86 enables edge-to-edge Android by default - content draws behind system bars
* useSafeAreaInsets for granular padding; SafeAreaView for whole-screen wrappers
* Double safe-area padding is the most common layout bug - one owner per axis

## [Dark Mode & Color Schemes](https://docs.wahwei/reactnative.codeguides.io/styling-layout/dark-mode-and-color-schemes/)

* useColorScheme returns 'light', 'dark', or null - branch styles from a token object
* Define semantic tokens (background, text, border) - not raw hex per component
* Appearance.setColorScheme overrides system choice for in-app toggle
* Expo userInterfaceStyle in app.json sets the app-level default and splash behavior
* StatusBar and navigation bar styles must follow the active scheme
* Test both schemes - automatic OS sync is the default users expect

## [Responsive & Adaptive Layout](https://docs.wahwei/reactnative.codeguides.io/styling-layout/responsive-and-adaptive-layout/)

* There are no CSS media queries - use useWindowDimensions and app-defined breakpoints
* 768 dp is the common tablet threshold; 600 dp matches Material compact-to-medium
* Adaptive layout changes structure (split view), not just spacing
* Foldables and split-screen shrink window width - test narrow states
* Combine breakpoints with flexbox - dimensions pick the tree, flex distributes space
* Safe area insets are orthogonal to breakpoints - handle both

## [Style Performance](https://docs.wahwei/reactnative.codeguides.io/styling-layout/style-performance/)

* StyleSheet.create registers styles once - inline objects allocate on every render
* A new style reference crosses the JS/native boundary even when values are unchanged
* Static style arrays are cheap; dynamic entries inside renderItem are not
* Layout thrash happens when width, flex, or position flip every frame - batch updates
* Pressable style callbacks should return StyleSheet IDs, not fresh object literals
* Profile with React DevTools and Hermes sampling before sprinkling useMemo on styles

## [Shadows, Elevation & Borders](https://docs.wahwei/reactnative.codeguides.io/styling-layout/shadows-elevation-and-borders/)

* iOS uses shadowColor, shadowOffset, shadowOpacity, and shadowRadius - Android ignores them
* Android elevation draws a material shadow from the view background - set backgroundColor
* overflow: hidden on iOS clips shadow spread - apply shadow to a wrapper View
* StyleSheet.hairlineWidth gives a crisp 1-device-pixel border on both platforms
* borderRadius with overflow hidden is the standard recipe for rounded image masks
* Platform.select inside StyleSheet.create keeps one file for cross-platform cards

## [Typography Scale & Font Loading](https://docs.wahwei/reactnative.codeguides.io/styling-layout/typography-scale-and-font-loading/)

* Load custom fonts with expo-font useFonts before rendering branded text
* Gate the splash screen until fonts resolve - avoid FOUT with SplashScreen.preventAutoHideAsync
* Define a typography scale as tokens (display, title, body, caption) not ad-hoc font sizes
* fontFamily must match the key passed to useFonts exactly - including weight variants
* allowFontScaling respects system accessibility settings - cap with maxFontSizeMultiplier on dense UI
* lineHeight is in dp; pair with fontSize for readable multi-line body copy

## [Styling Best Practices](https://docs.wahwei/reactnative.codeguides.io/styling-layout/best-practices/)

* Cache static styles with StyleSheet.create; reserve inline for dynamic values
* Default flex direction is column - set row explicitly for horizontal layouts
* Apply safe area once at the screen root with react-native-safe-area-context
* Pair iOS shadow props with Android elevation via Platform.select
* Gate first paint until expo-font loads or hide splash on error
* Use semantic color tokens keyed off useColorScheme, not hardcoded hex in screens

Reviewed by Chris St. John·Last updated Jul 18, 2026
