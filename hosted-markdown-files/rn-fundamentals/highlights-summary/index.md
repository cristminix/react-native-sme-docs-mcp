# Fundamentals Highlights Summary

Every highlight bullet from the 10 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Fundamentals Highlights Summary

* View is the layout primitive; all visible UI must live inside View or Text
* Every screen is a tree of native views - View is the universal layout box
* A re-render re-executes your function component on the JS thread - native views update after diffing
* Pressable is the modern primitive - style as a function of pressed/hovered/focused state
* Platform.OS returns ios, android, macos, windows, or web in Expo multi-target apps
* Local images use `require()` at build time - Metro resolves `@2x`/`@3x` density buckets automatically

## [React Native Basics](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/react-native-basics/)

* View is the layout primitive; all visible UI must live inside View or Text
* StyleSheet.create caches styles on the native side for better performance
* Flexbox defaults to column direction - opposite of web CSS
* Pressable replaces TouchableOpacity for touch targets with style callbacks
* useState triggers a re-render; state updates are async and batched
* Platform.select and useWindowDimensions handle OS and screen-size differences
* SafeAreaView from react-native-safe-area-context respects notches and home indicators

## [Views, Text & Core Components](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/views-text-and-core-components/)

* Every screen is a tree of native views - View is the universal layout box
* Raw strings must live inside Text; nesting Text inherits styles on both platforms
* Flexbox defaults to column direction, unlike web CSS
* SafeAreaView and edges prop handle notches without manual padding math
* Platform.select keeps one file when differences are small; split files when logic diverges
* StyleSheet.create validates keys once and improves debuggability in Hermes

## [Props, State & Re-renders on Mobile](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/props-state-and-re-renders-on-mobile/)

* A re-render re-executes your function component on the JS thread - native views update after diffing
* setState batches in event handlers and many async paths in React 19 - fewer redundant commits
* Props flow down; lifting state up coordinates siblings without a global store
* Expensive list renders dominate frame time - memoize row components and stabilize callbacks
* Fabric reduces serialization overhead but does not make unnecessary re-renders free
* useRef holds mutable values that skip re-renders - ideal for timers and latest callbacks

## [Event Handling & Touchables](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/event-handling-and-touchables/)

* Pressable is the modern primitive - style as a function of pressed/hovered/focused state
* hitSlop expands the touch target without changing layout bounds
* Native responder system decides which view wins overlapping touches
* Android ripple uses android\_ripple; iOS relies on opacity and highlight styles
* disabled blocks onPress and should pair with accessible disabled state
* Gesture Handler adds pan/pinch when Pressable is not enough

## [Platform-Specific Code](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/platform-specific-code/)

* Platform.OS returns ios, android, macos, windows, or web in Expo multi-target apps
* Platform.select picks values or functions per OS without splitting files
* .ios.tsx and .android.tsx let Metro bundle completely different implementations
* Prefer shared files until platform branches clutter readability
* Platform.Version gives numeric OS level for capability checks
* Expo Constants exposes device and runtime facts beyond Platform alone

## [Images & Assets](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/images-and-assets/)

* Local images use `require()` at build time - Metro resolves `@2x`/`@3x` density buckets automatically
* Remote images need explicit `width` and `height` (or `aspectRatio`) or layout collapses to zero
* `expo-asset` preloads fonts and images before first paint to avoid flash-of-missing-content
* `expo-image` offers caching, blurhash placeholders, and better performance than core `Image` for most apps
* SVGs are not bundled like PNGs - use `react-native-svg` or convert to PNG/WebP
* Asset paths in `require()` must be static literals; dynamic strings are not supported

## [Dimensions & Responsive Layout](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/dimensions-and-responsive-layout/)

* `useWindowDimensions` re-renders on rotation and fold - prefer it over one-shot `Dimensions.get()`
* React Native uses density-independent pixels (dp); `PixelRatio` converts to physical pixels
* Breakpoints are app-defined constants - there is no built-in `isTablet` API in core RN
* Tablet layouts often use side-by-side master-detail; phones use stacked navigation
* Safe area insets are separate from window dimensions - use `react-native-safe-area-context`
* Avoid hard-coded pixel widths; derive spacing and columns from current window width

## [The Bridge, JSI & New Architecture](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/the-bridge-jsi-and-new-architecture/)

* The legacy bridge serializes every JS↔native call as async JSON - high throughput causes queueing
* JSI exposes native C++ objects directly to Hermes - synchronous calls with no JSON copy
* Fabric is the New Architecture renderer; TurboModules are the New Architecture native module system
* React Native 0.86 enables New Architecture by default; Expo SDK 57 builds on this stack
* Codegen generates type-safe C++/Java/ObjC bindings from TypeScript spec files
* Most app code is unchanged - performance gains come from native modules and Fabric-enabled libraries

## [Hermes & the JS Runtime](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/hermes-and-the-js-runtime/)

* Hermes is the default JS engine for React Native and Expo - tuned for mobile startup and memory
* Bytecode is compiled at build time (not JIT on device), shrinking bundle parse cost at launch
* No `eval` or `new Function` in production Hermes - some dynamic code patterns fail
* Debugging uses the Hermes debugger protocol via React Native DevTools, not Chrome V8 directly
* `global.HermesInternal` exposes engine introspection helpers in development builds
* Switching to JavaScriptCore (JSC) is possible but uncommon and loses Hermes-specific optimizations

## [React Native Fundamentals Best Practices](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/best-practices/)

* Wrap every visible string in Text; View is layout-only
* Default flex direction is column - set row explicitly for horizontal layout
* Use Pressable with hitSlop for 44pt touch targets, not bare icon taps
* Derive list data with useMemo; never mutate state objects in place
* Prefer useWindowDimensions over Dimensions.get for rotation-safe layouts
* Hermes is the default engine - profile on device, not in Chrome

Reviewed by Chris St. John·Last updated Jul 18, 2026
