# Animations Best Practices

A condensed summary of the 25 most important best practices drawn from every page in this section.

Highlights / Animations Best Practices

* Install Reanimated and Gesture Handler with npx expo install - never hand-pin versions on SDK 57
* react-native-reanimated/plugin must be the last babel.config.js plugin
* Finger-driven motion belongs on the UI thread via shared values - not setState per frame
* Profile on mid-tier Android before shipping gesture-heavy feeds
* Tune activeOffset and failOffset before rewriting scroll structures for swipe rows
* Respect reduced motion - provide instant state fallbacks when accessibility settings demand it

1. **Install with `npx expo install`:** `react-native-reanimated` and `react-native-gesture-handler` versions must match the SDK 57 matrix - manual npm pins cause native build failures.
2. **Babel plugin last:** `react-native-reanimated/plugin` is always the final entry in `babel.config.js` - other plugins after it break worklet transforms.
3. **Clear Metro after plugin changes:** Run `npx expo start --clear` whenever Babel or Reanimated versions change - stale caches produce "failed to create a worklet" errors.
4. **Wrap root with GestureHandlerRootView:** Required in `app/_layout.tsx` for pans, drawers, and stack-adjacent gestures - no compile-time warning when missing.
5. **Import Animated from Reanimated for worklets:** `react-native-reanimated`'s `Animated` supports `useAnimatedStyle`, entering/exiting, and shared transitions - not `react-native`'s `Animated`.
6. **Use shared values for interactive motion:** `useSharedValue` updates do not re-render React - the foundation of 60fps drags, springs, and scroll-linked styles.
7. **Never setState every animation frame:** `onPanResponderMove` or gesture `onUpdate` calling `setState` competes with React reconciliation - dropped frames on any mid-tier device.
8. **Prefer Reanimated for gesture-linked UI:** If motion follows a finger or runs during list scroll, graduate from the legacy `Animated` API to Reanimated 4.
9. **Keep Animated for simple one-shot fades:** Short opacity timing on static mount with `useNativeDriver: true` is acceptable - do not over-engineer toast fades.
10. **Know the native driver boundary:** `opacity` and `transform` support `useNativeDriver: true`; `width`, `height`, and `flex` need Reanimated layout animations or `useAnimatedStyle`.
11. **Pair RNGH with Reanimated:** Gesture recognition on the native thread plus shared-value updates on the UI thread - Pressable alone cannot match pan frequency.
12. **Tune pans before rewriting scroll trees:** `activeOffsetX` and `failOffsetY` fix most swipe-row vs `ScrollView` conflicts - see [Gesture Conflict Resolution](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/gesture-conflict-resolution/).
13. **Use simultaneousWithExternalGesture for swipe rows:** Wire the parent `ScrollView` / `FlatList` ref so horizontal row pans coexist with vertical scroll after offset qualification.
14. **Import inner scrollables from RNGH when nested scroll fails:** Switch the **inner** horizontal `FlatList` first - not both axes blindly ([Nested Scrollables](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/nested-scrollables/)).
15. **Stable keys for animated lists:** `keyExtractor` must return server ids - index keys make layout animations and shared transition tags jump between wrong rows.
16. **One entering/exiting wrapper per row:** Apply `FadeIn` / `SlideInRight` and `layout={Layout}` on a single `Animated.View` per `renderItem` - not on every nested `Text`.
17. **Shorten exiting duration:** Exiting at 150–220ms feels snappier than symmetric 400ms enter/exit - users perceive delete feedback faster.
18. **Cap stagger delays on long lists:** `FadeInDown.delay(index * 40)` beyond ~12–20 items adds noticeable mount latency - stagger only the first viewport.
19. **Unique sharedTransitionTag per entity:** Include stable ids in tag strings - duplicate tags across list rows break hero transitions ([Shared Element Transitions](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/shared-element-transitions/)).
20. **Match tags exactly across stack screens:** List cell and Expo Router detail route must use the same tag builder - pair with nested stacks ([Stack Navigation](https://docs.wahwei/reactnative.codeguides.io/expo-router/stack-navigation/)).
21. **runOnJS sparingly:** Bridge to navigation, `setState`, and analytics on gesture **end** - not inside `onUpdate` every frame.
22. **Extract shared worklet helpers:** Clamp, rubber-band, and interpolate functions belong in `'worklet'` modules - reduces Hermes duplication and eases testing ([Worklets & Bundle Mode](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/worklets-and-bundle-mode/)).
23. **Profile release on mid-tier Android:** iPhone Pro simulators and Expo Go on Mac hide JS-thread contention - Flashlight or RN DevTools on a low-RAM device before ship.
24. **Respect reduced motion:** Check `AccessibilityInfo.isReduceMotionEnabled()` and skip or shorten entering/layout animations - provide instant state transitions as fallback.
25. **Run the gesture checklist before release:** Walk swipe-in-scroll, nested rails, sheet-over-feed, shared hero pop, and fast-list delete on Android - simulators miss scroll-vs-swipe races.

## FAQs

Animated API or Reanimated 4 for a new SDK 57 app?

* Default to Reanimated 4 for any interactive or list-adjacent motion.
* `Animated` remains fine for rare static fades with `useNativeDriver: true`.

What is the single most common animation bug?

* Updating React state every pan frame instead of shared values - visible as stutter during network or list work on the JS thread.

Do I need Gesture Handler without pans?

* Layout-only Reanimated (`FadeIn`, `Layout`) does not require RNGH.
* Add Gesture Handler the moment users swipe, pinch, or drag - and wrap the app root when you do.

When should I enable Reanimated bundle mode?

* After release profiling shows Hermes RAM climbing across many animated screens and shared worklet extraction is insufficient.

How do animations interact with list performance?

* Virtualized lists plus per-frame JS work is the worst combination - keep animation math on UI thread and avoid entering animations on every pagination page without profiling.

## Related

* [Animations Basics](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/animations-basics/) - 10-example tour of Animated vs Reanimated
* [react-native-reanimated 4](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/react-native-reanimated-4/) - shared values and springs cookbook
* [react-native-gesture-handler](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/react-native-gesture-handler/) - Pan, Pinch, composed gestures
* [Layout Animations](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/layout-animations/) - entering, exiting, and reorder
* [Gesture Conflict Resolution](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/gesture-conflict-resolution/) - scroll vs swipe vs sheets
* [Performance Best Practices](https://docs.wahwei/reactnative.codeguides.io/performance/best-practices/) - device matrix and profiling habits

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
