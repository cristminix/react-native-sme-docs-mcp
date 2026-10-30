# react-native-reanimated 4

Reanimated 4 is the default animation engine on Expo SDK 57. Shared values, `useAnimatedStyle`, and timing/spring helpers run on the **UI thread** so gestures and scroll do not stall when JavaScript is busy.

Highlights / react-native-reanimated 4

* Shared values live on the UI thread - updating .value does not trigger React re-renders
* useAnimatedStyle recomputes styles inside worklets every frame at 60fps
* withTiming and withSpring are the two primitives for almost all motion curves
* Import Animated from react-native-reanimated, not react-native, for worklet components
* react-native-reanimated/plugin must remain the last babel.config.js plugin
* runOnJS bridges back to React only when you must call setState or navigation

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install react-native-reanimated react-native-gesture-handler
```

```js
// babel.config.js - plugin MUST be last
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["react-native-reanimated/plugin"],
  };
};
```

```tsx
import { StyleSheet, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
 
export function ReanimatedCard() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);
 
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
 
  const reveal = () => {
    opacity.value = withTiming(1, { duration: 250 });
    scale.value = withSpring(1, { damping: 14 });
  };
 
  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <Text onPress={reveal}>Tap to reveal</Text>
    </Animated.View>
  );
}
 
const styles = StyleSheet.create({
  card: { padding: 20, borderRadius: 12, backgroundColor: "#f0fdf4" },
});
```

**When to reach for this:**

* Finger-driven pans, pinches, and draggable sheets
* Animations that must stay smooth during list scroll or heavy JS work
* Layout-affecting motion (`width`, `borderRadius`, `backgroundColor`)
* Pairing with Gesture Handler for 60fps interactive UI

## Working Example

A draggable card that snaps back on release - shared value on the UI thread, spring on end.

```bash
npx expo install react-native-reanimated react-native-gesture-handler
```

```tsx
// components/draggable-card.tsx
import { StyleSheet, Text } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
 
const SNAP_BACK = { damping: 18, stiffness: 220 };
 
export function DraggableCard({ title }: { title: string }) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
 
  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd(() => {
      translateX.value = withSpring(0, SNAP_BACK);
      translateY.value = withSpring(0, SNAP_BACK);
    });
 
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));
 
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, style]}>
        <Text>{title}</Text>
      </Animated.View>
    </GestureDetector>
  );
}
 
const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});
```

```tsx
// app/_layout.tsx (excerpt)
import { GestureHandlerRootView } from "react-native-gesture-handler";
 
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Stack / providers */}
    </GestureHandlerRootView>
  );
}
```

```tsx
// Timing helper - progress bar driven by shared value
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
 
export function useProgressBar(progress: number) {
  const width = useSharedValue(0);
 
  width.value = withTiming(progress, {
    duration: 400,
    easing: Easing.out(Easing.cubic),
  });
 
  return useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));
}
```

## Deep Dive

### Shared values

`useSharedValue(initial)` allocates a mutable slot readable and writable from worklets. Assign with `.value`:

```tsx
const offset = useSharedValue(0);
offset.value = 42;           // immediate
offset.value = withTiming(1); // animated transition
```

* Shared values are **not** React state - components do not re-render when they change.
* Read them inside `useAnimatedStyle`, `useDerivedValue`, or gesture callbacks marked as worklets.
* Prefer a small number of shared values per component - derive everything else with `useDerivedValue`.

### useAnimatedStyle

Returns a style object whose getters re-run on the UI thread each frame:

```tsx
const style = useAnimatedStyle(() => ({
  opacity: interpolate(progress.value, [0, 1], [0.4, 1]),
  transform: [{ translateX: offset.value }],
}));
```

* Do not call non-worklet functions inside the callback unless they are imported from Reanimated or marked `'worklet'`.
* Return only style-compatible keys - layout animations use separate `entering` / `exiting` props (see [Layout Animations](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/layout-animations/)).

### withTiming and withSpring

| Helper | Best for | Key options |
| --- | --- | --- |
| `withTiming` | Fades, precise durations, progress bars | `duration`, `easing` |
| `withSpring` | Drags, chips, bottom-sheet snap points | `damping`, `stiffness`, `mass` |

```tsx
opacity.value = withTiming(1, { duration: 200 });
translateY.value = withSpring(0, { damping: 15, stiffness: 120 });
```

* Chain with `withDelay`, `withRepeat`, and `withSequence` for staged motion.
* Cancel in-flight animation by assigning a new animation helper to the same shared value.

### runOnJS - crossing back to React

Worklets cannot call arbitrary JS (navigation, `setState`, analytics). Use `runOnJS`:

```tsx
import { runOnJS } from "react-native-reanimated";
 
const pan = Gesture.Pan().onEnd((e) => {
  if (e.translationX < -120) {
    runOnJS(onDismiss)();
  }
});
```

* Wrap only the minimal callback - keep gesture math on the UI thread.
* `runOnJS` schedules on the JS thread next tick - do not use it per-frame in `onUpdate`.

### Reanimated 4 on SDK 57

* Ships with the New Architecture path in mind - worklets compile via the Babel plugin and execute through JSI.
* Version ~4.x is the SDK 57 matrix entry - install with `npx expo install`, not npm guesses.
* **Bundle mode** (optional) reduces Hermes memory pressure for worklet-heavy apps - see [Worklets & Bundle Mode](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/worklets-and-bundle-mode/).

## Gotchas

* **Babel plugin not last** - Worklets fail to transform; animations stutter on JS thread. **Fix:** Move `react-native-reanimated/plugin` to the end of `plugins` and `npx expo start --clear`.
* **Importing Animated from react-native** - Mixing classic `Animated` with worklet styles causes type and runtime errors. **Fix:** `import Animated from 'react-native-reanimated'` for worklet components.
* **Reading shared values in React render** - `translateX.value` in JSX body does not subscribe to updates. **Fix:** Only read inside `useAnimatedStyle` or `useDerivedValue`; use `useAnimatedProps` for native props.
* **Calling setState inside useAnimatedStyle** - Triggers "Tried to synchronously call a function on a non-worklet thread" errors. **Fix:** `runOnJS(setState)` from gesture end handlers only.
* **Forgetting GestureHandlerRootView** - Gestures never fire; pans appear frozen. **Fix:** Wrap root layout (see [react-native-gesture-handler](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/react-native-gesture-handler/)).
* **Animating width as percentage strings incorrectly** - Some RN versions coerce oddly. **Fix:** Animate numeric width from `onLayout` measurement or use `flex` + `scaleX` for simple bars.
* **Heavy work in onUpdate** - JSON parsing or logging every pan frame drops frames. **Fix:** Keep `onUpdate` to shared-value math; defer work to `onEnd` via `runOnJS`.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `Animated` API | One-shot fades on static screens | Finger-following drags or list scroll coupling |
| Reanimated 4 | Gestures, layout, 60fps interactive UI | trivial 200ms opacity fade with no gesture |
| `react-native-animatable` | Declarative CSS-like class animations | Custom gesture-linked physics |
| Lottie (`lottie-react-native`) | Designer-authored vector loops | Interactive draggable components |
| CSS transitions (Expo web only) | Web-only surfaces | Native iOS/Android shipping targets |

## FAQs

How do I install Reanimated 4 on Expo SDK 57?

```bash
npx expo install react-native-reanimated react-native-gesture-handler
```

Verify `babel.config.js` includes `react-native-reanimated/plugin` as the **last** plugin. Restart Metro with `--clear` after install.

What is the difference between useSharedValue and useState?

* `useSharedValue` - UI-thread slot; no React re-render on change; read in worklets.
* `useState` - JS-thread React state; triggers render; never update per animation frame.

When should I use withTiming vs withSpring?

* `withTiming` when design specifies exact duration (modals, progress, cross-fades).
* `withSpring` when motion should feel physical (drags, snap-back, bouncy toggles).

Can I use Reanimated without Gesture Handler?

Yes for mount animations, layout transitions, and press-driven timing. Any pan/pinch or scroll conflict scenario should add Gesture Handler.

Why does my animation work in dev but not in release?

* Missing Babel plugin is the top cause - production bundles skip worklet transforms.
* Also check Proguard rules on Android bare builds and stale Metro cache after upgrades.

How do I debug worklets?

* Enable Reanimated logger in dev: `configureReanimatedLogger` (see [Worklets & Bundle Mode](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/worklets-and-bundle-mode/)).
* If you see "failed to create a worklet", the Babel plugin is misconfigured.

Does Reanimated 4 require the New Architecture?

SDK 57 projects increasingly run New Architecture by default. Reanimated 4 targets that stack; older architecture may still work but team support focuses on Fabric + Hermes.

How do I animate colors?

Use `interpolateColor` inside `useAnimatedStyle`:

```tsx
backgroundColor: interpolateColor(progress.value, [0, 1], ["#ef4444", "#22c55e"])
```

## Related

* [Animations Basics](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/animations-basics/) - `Animated` vs Reanimated decision tour
* [react-native-gesture-handler](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/react-native-gesture-handler/) - `Gesture.Pan` and composed gestures
* [Layout Animations](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/layout-animations/) - `FadeIn`, `Layout`, list reorder
* [Worklets & Bundle Mode](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/worklets-and-bundle-mode/) - bundle mode and Hermes memory
* [Shared Element Transitions](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/shared-element-transitions/) - hero motion with Expo Router
* [Animations Best Practices](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/best-practices/) - profiling and shipping checklist

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
