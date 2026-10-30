# Animations & Gestures Highlights Summary

Every highlight bullet from the 8 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Animations & Gestures Highlights Summary

* Install with npx expo install - Reanimated 4 and gesture-handler versions must match SDK 57
* Shared values live on the UI thread - updating .value does not trigger React re-renders
* Gesture Handler runs recognition on the native thread - Pressable cannot match pan frequency
* Entering and exiting props animate mount/unmount without manual opacity tweens
* Worklets are JavaScript functions compiled to run on the UI thread via the Reanimated Babel plugin
* sharedTransitionTag pairs the same logical element across two screens for hero motion

## [Animations Basics](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/animations-basics/)

* Install with npx expo install - Reanimated 4 and gesture-handler versions must match SDK 57
* react-native-reanimated/plugin must be the last entry in babel.config.js plugins
* Animated + useNativeDriver handles simple fades and springs on the native driver
* Reanimated 4 runs gesture-driven frames on the UI thread - the path to reliable 60fps
* Never animate layout properties with useNativeDriver: true - width, height, and flex need Reanimated or Layout animations
* Profile on a mid-tier Android device - simulators hide JS-thread jank during scroll + animation

## [react-native-reanimated 4](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/react-native-reanimated-4/)

* Shared values live on the UI thread - updating .value does not trigger React re-renders
* useAnimatedStyle recomputes styles inside worklets every frame at 60fps
* withTiming and withSpring are the two primitives for almost all motion curves
* Import Animated from react-native-reanimated, not react-native, for worklet components
* react-native-reanimated/plugin must remain the last babel.config.js plugin
* runOnJS bridges back to React only when you must call setState or navigation

## [react-native-gesture-handler](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/react-native-gesture-handler/)

* Gesture Handler runs recognition on the native thread - Pressable cannot match pan frequency
* Gesture.Pan and Gesture.Pinch are the two primitives for draggable and zoomable UI
* Wrap gestures in GestureDetector - one detector per composed gesture object
* Gesture.Simultaneous and Gesture.Race compose multi-gesture interactions
* GestureHandlerRootView at the app root is mandatory - drawers and stacks depend on it
* Pair every high-frequency gesture with Reanimated shared values, not setState

## [Layout Animations](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/layout-animations/)

* Entering and exiting props animate mount/unmount without manual opacity tweens
* FadeIn, SlideInRight, and FadeOut are the most common presets in production lists
* Layout prop animates position and size when siblings reorder or flex changes
* Customize presets with .duration(), .springify(), and .delay()
* Wrap list rows in Animated.View from reanimated - not react-native Animated
* Disable layout animations on huge lists if profiling shows mount pressure

## [Worklets & Bundle Mode](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/worklets-and-bundle-mode/)

* Worklets are JavaScript functions compiled to run on the UI thread via the Reanimated Babel plugin
* The 'worklet' directive marks custom functions safe for UI-thread execution
* Bundle mode pre-packages worklets to reduce Hermes memory duplication in large apps
* Never call setState, fetch, or navigation directly inside a worklet
* runOnJS is the controlled bridge back to the React JS thread
* Misconfigured plugins produce 'failed to create a worklet' at runtime - always clear Metro cache after fixes

## [Shared Element Transitions](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/shared-element-transitions/)

* sharedTransitionTag pairs the same logical element across two screens for hero motion
* Works with Expo Router stacks - both screens must mount Animated views with matching tags
* Use unique tags per list item - include stable id in the tag string
* Native stack performs better than JS stack for shared transitions
* Navigate after press - detail screen reuses the tag on the enlarged hero
* Fall back to fade or scale when tags mismatch or lists recycle unpredictably

## [Gesture Conflict Resolution](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/gesture-conflict-resolution/)

* Vertical ScrollView and horizontal Pan compete - tune activeOffsetX and failOffsetY first
* simultaneousWithExternalGesture lets row pans cooperate with parent scroll native handlers
* Bottom sheets need exclusive vertical pans - fail horizontal child gestures when sheet is mid-drag
* Use RNGH ScrollView on the inner rail before rewriting the whole tree
* Native scroll gestures beat JS PanResponder - always prefer RNGH composition APIs
* Test on Android mid-tier hardware - iOS simulators hide scroll vs swipe races

## [Animations Best Practices](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/best-practices/)

* Install Reanimated and Gesture Handler with npx expo install - never hand-pin versions on SDK 57
* react-native-reanimated/plugin must be the last babel.config.js plugin
* Finger-driven motion belongs on the UI thread via shared values - not setState per frame
* Profile on mid-tier Android before shipping gesture-heavy feeds
* Tune activeOffset and failOffset before rewriting scroll structures for swipe rows
* Respect reduced motion - provide instant state fallbacks when accessibility settings demand it

Reviewed by Chris St. John·Last updated Jul 18, 2026
