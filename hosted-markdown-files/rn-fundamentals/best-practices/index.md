# React Native Fundamentals Best Practices

A condensed summary of the 25 most important best practices drawn from every page in this section.

Highlights / React Native Fundamentals Best Practices

* Wrap every visible string in Text; View is layout-only
* Default flex direction is column - set row explicitly for horizontal layout
* Use Pressable with hitSlop for 44pt touch targets, not bare icon taps
* Derive list data with useMemo; never mutate state objects in place
* Prefer useWindowDimensions over Dimensions.get for rotation-safe layouts
* Hermes is the default engine - profile on device, not in Chrome

1. **Wrap strings in Text:** React Native has no DOM text nodes - placing a bare string inside `View` throws a redbox. Every user-visible character must live inside `<Text>`.
2. **Know the flex default:** React Native flex defaults to `column`, opposite of web CSS. Set `flexDirection: "row"` explicitly whenever you want horizontal layout.
3. **Cache styles with StyleSheet.create:** Defining style objects inline creates new references every render. `StyleSheet.create` registers styles once and lets the native side cache them for better performance.
4. **Apply safe area once at the screen root:** Nesting `SafeAreaView` components or combining them with manual `paddingTop: insets.top` doubles the inset. Pick one owner per axis - usually the outermost screen wrapper.
5. **Use contentContainerStyle for ScrollView padding:** Padding on `ScrollView` itself clips scroll indicators oddly on iOS. Put inner spacing on `contentContainerStyle`, not the scroll container.
6. **Pair iOS shadows with Android elevation:** `shadowColor` and `shadowOffset` are ignored on Android. Use `Platform.select` to apply iOS shadow props alongside `elevation`.
7. **Nest Text inside Text for inline spans:** Wrapping individual words in `View` breaks inline text flow and hurts accessibility. Use nested `<Text>` nodes for bold, colored, or linked inline spans.
8. **Treat props as read-only:** Mutating a prop or state object in place (`todo.done = true; setTodos(todos)`) may skip re-renders because the reference is unchanged. Always return new objects and arrays from updaters.
9. **Derive computable values during render:** Storing filtered or sorted lists in separate `useState` doubles updates and risks drift. Use `useMemo` to derive from the single source of truth.
10. **Stabilize callbacks in virtualized lists:** Inline `onPress={() => toggle(id)}` inside `renderItem` breaks `memo` every render. Pass stable `useCallback` handlers or let memoized row components own the handler.
11. **Memoize context value objects:** `value={{ user, theme }}` recreated each render re-renders every consumer. Memoize the value object or split contexts by update frequency.
12. **Profile before over-memoizing:** `useMemo` and `useCallback` carry their own cost. Optimize list rows and genuinely expensive pure computations - not every inline object.
13. **Prefer Pressable over TouchableOpacity:** `Pressable` exposes `pressed`, `hovered`, and `focused` states, ships `android_ripple` and `hitSlop` first-class, and avoids fading opacity across an entire subtree.
14. **Hit 44pt minimum touch targets:** A 20×20 icon without padding fails HIG and Material minimums. Add `hitSlop` or wrap with padding so the interactive area reaches roughly 44×44 points.
15. **Show disabled state visually and semantically:** `disabled` silences `onPress` but the control may still look active. Combine disabled styles, `accessibilityState={{ disabled: true }}`, and `pointerEvents` where overlays compete.
16. **Use Platform.select for small deltas:** Splitting `.ios` and `.android` files for a one-line color difference adds maintenance overhead. Reserve platform-specific files for materially different UI or native imports.
17. **Import the base filename, not .ios:** `import X from "./Foo.ios"` breaks Android bundles. Import `./Foo` and let Metro resolve the correct platform file.
18. **Always include a default in Platform.select:** Web and other Expo targets get `undefined` without a `default` key. Every `Platform.select` call in a multi-platform app needs a fallback.
19. **Set explicit dimensions on remote images:** `{ uri }` images without `width`, `height`, or `aspectRatio` render at 0×0 and appear invisible. Always constrain layout for network sources.
20. **Keep require() paths static:** Metro analyzes asset imports at build time - `require('./assets/' + name + '.png')` fails. Use a constant lookup map of static requires instead.
21. **Preload assets before hiding the splash:** Hiding the splash immediately while images decode shows a blank flash. `await Asset.loadAsync(...)` then call `SplashScreen.hideAsync()`.
22. **Subscribe to dimension changes with a hook:** `Dimensions.get('window')` is a snapshot - UI stays in portrait layout after rotation. Use `useWindowDimensions()` or `Dimensions.addEventListener`.
23. **Use width breakpoints for tablets cross-platform:** `Platform.isPad` only covers iOS. A logical width breakpoint (e.g., `>= 768`) works on Android tablets and foldables too.
24. **Assume New Architecture by default on RN 0.86:** Expo SDK 57 ships with Fabric and TurboModules enabled. Check library New Architecture compatibility before upgrading - build success does not guarantee runtime stability.
25. **Debug Hermes with React Native DevTools:** Remote Chrome debugging does not attach faithfully to Hermes bytecode. Press `j` in Metro or use the dev menu to open React Native DevTools for breakpoints and profiling on device.

## FAQs

Should I read this page before or after the individual topic pages?

* Read **React Native Basics** first for a hands-on tour of primitives.
* Work through the topic pages as you encounter each concept in a real project.
* Return to this page as a review checklist before code review or onboarding a teammate.

Why exactly 25 items?

* The list is capped at 25 so it stays scannable in one sitting.
* Each item maps to gotchas and deep-dive guidance from a specific fundamentals page.
* If you need full recipes and runnable examples, follow the Related links below.

Do these practices apply to Expo and bare React Native?

* Yes - every item here targets APIs in `react-native` core or Expo modules that ship with the default template.
* Platform-specific file resolution and `expo-asset` assume an Expo or prebuild workflow, but the underlying rules hold in bare RN too.

Which practice causes the most beginner redboxes?

* **Strings outside Text** - it is the first layout mistake most web developers hit.
* The fix is simple: wrap every visible string in `<Text>`, even single words inside a `View`.

Which practice has the biggest performance impact on lists?

* **Unstable inline callbacks in virtualized lists** - they defeat `memo` and force every visible row to re-render on each parent tick.
* Stabilize handlers with `useCallback` and keep row components memoized.

When should I split platform-specific files instead of using Platform.select?

* When JSX structure diverges materially - different component trees, native module imports, or OS-specific navigation chrome.
* For one or two style constants, `Platform.select` inside a shared file is cleaner.

Is Hermes optional in modern Expo projects?

* Hermes is the default engine in Expo SDK 57 and React Native 0.86.
* Disabling it is rarely justified - profile on device first if you suspect an engine-specific issue.

How do I verify my app uses the New Architecture?

* Check `newArchEnabled` in `app.json` / `app.config.js` (enabled by default in recent templates).
* Run `npx expo-doctor` and inspect native build logs for Fabric/TurboModule initialization.

What is the single best responsive-layout habit?

* Replace every `Dimensions.get('window')` call in component render with `useWindowDimensions()`.
* Rotation, split-screen, and foldable resize events then trigger re-renders automatically.

Which image mistake wastes the most memory?

* Shipping a `@3x` asset at thousands of pixels wide and displaying it in a 48×48 avatar.
* Export at display size × pixel ratio, or use `expo-image` with appropriate resize modes.

## Related

* [React Native Basics](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/react-native-basics/) - hands-on intro tour of core primitives
* [Views, Text & Core Components](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/views-text-and-core-components/) - layout primitives and text nesting rules
* [Props, State & Re-renders on Mobile](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/props-state-and-re-renders-on-mobile/) - how updates propagate to native views
* [Event Handling & Touchables](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/event-handling-and-touchables/) - Pressable patterns and hitSlop
* [Dimensions & Responsive Layout](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/dimensions-and-responsive-layout/) - breakpoints and tablet layouts
* [The Bridge, JSI & New Architecture](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/the-bridge-jsi-and-new-architecture/) - legacy bridge vs Fabric/TurboModules

### External Related Links

* [reactnative.dev/docs](https://reactnative.dev/docs/getting-started) - full RN documentation
* [Callstack ebooks & guides](https://www.callstack.com/ebooks) - in-depth RN guides (performance, optimization, brownfield)
* [reactnative.dev](https://reactnative.dev/) - official React Native site

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 9, 2026
