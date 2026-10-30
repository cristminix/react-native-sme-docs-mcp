# Animations Basics

10 examples to get you started with React Native animations - 7 basic and 3 intermediate. You will learn when the built-in `Animated` API is enough, when **Reanimated 4** is the right tool, and how to keep motion at **60fps** on the UI thread.

Highlights / Animations Basics

* Install with npx expo install - Reanimated 4 and gesture-handler versions must match SDK 57
* react-native-reanimated/plugin must be the last entry in babel.config.js plugins
* Animated + useNativeDriver handles simple fades and springs on the native driver
* Reanimated 4 runs gesture-driven frames on the UI thread - the path to reliable 60fps
* Never animate layout properties with useNativeDriver: true - width, height, and flex need Reanimated or Layout animations
* Profile on a mid-tier Android device - simulators hide JS-thread jank during scroll + animation

## Prerequisites

Install Reanimated and Gesture Handler with Expo's version resolver - do not pin versions manually.

```bash
npx expo install react-native-reanimated react-native-gesture-handler
```

Confirm the SDK 57 pin before adding animation code:

```json
{
  "dependencies": {
    "expo": "~57.0.4",
    "react": "19.2.3",
    "react-native": "0.86.0",
    "react-native-reanimated": "~4.0.0",
    "react-native-gesture-handler": "~2.28.0"
  }
}
```

Wrap your root layout with `GestureHandlerRootView` (required for gestures; harmless for animation-only apps):

```tsx
// app/_layout.tsx
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
 
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack />
    </GestureHandlerRootView>
  );
}
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, **React 19.2.3**, and **Reanimated 4**.

---

## Basic Examples

### 1. Babel Plugin Must Be Last

Reanimated's Babel plugin rewrites worklets at build time. It **must** be the final plugin in the array.

```js
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // other plugins first …
      "react-native-reanimated/plugin", // ← always last
    ],
  };
};
```

* If the plugin is missing or not last, worklets throw at runtime and animations silently fall back to the JS thread.
* After changing `babel.config.js`, restart Metro with cache cleared: `npx expo start --clear`.
* The `default@sdk-57` template ships this configuration - verify before copying snippets from older tutorials.

> **Related:** [react-native-reanimated 4](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/react-native-reanimated-4/) - shared values and UI-thread animations | [Worklets & Bundle Mode](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/worklets-and-bundle-mode/) - what the plugin actually does

---

### 2. Animated API - Opacity Fade

The built-in `Animated` API is fine for one-off fades that do not interact with gestures.

```tsx
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
 
export function FadeInBanner() {
  const opacity = useRef(new Animated.Value(0)).current;
 
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [opacity]);
 
  return (
    <Animated.View style={[styles.banner, { opacity }]}>
      <View />
    </Animated.View>
  );
}
 
const styles = StyleSheet.create({
  banner: { padding: 16, backgroundColor: "#e8f4ff" },
});
```

* **`useNativeDriver: true`** offloads opacity and transform to the native driver - frames do not wait on React re-renders.
* `Animated.Value` lives in a ref - recreating it every render resets the animation.
* Good for toasts, skeleton reveals, and simple mount/unmount fades with no gesture coupling.

> **Related:** [Layout Animations](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/layout-animations/) - entering/exiting presets when items mount and unmount in lists

---

### 3. Animated.timing - Slide and Scale

Combine translate and scale for lightweight emphasis - still on the native driver.

```tsx
import { useEffect, useRef } from "react";
import { Animated, Pressable, Text } from "react-native";
 
export function PopInButton({ onPress }: { onPress: () => void }) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const translateY = useRef(new Animated.Value(12)).current;
 
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, translateY]);
 
  return (
    <Pressable onPress={onPress}>
      <Animated.View
        style={{
          transform: [{ scale }, { translateY }],
        }}
      >
        <Text>Continue</Text>
      </Animated.View>
    </Pressable>
  );
}
```

* **`Animated.parallel`** runs both tracks at once - order does not imply sequencing.
* `transform` (translate, scale, rotate) supports `useNativeDriver: true`; layout props do not.
* `Animated.spring` gives organic motion without hand-tuning easing curves for simple CTAs.

> **Related:** [react-native-reanimated 4](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/react-native-reanimated-4/) - `withSpring` on the UI thread for gesture-linked springs

---

### 4. Animated.loop and Sequence

Chain and repeat animations for loading indicators and pulsing badges.

```tsx
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
 
export function PulsingDot() {
  const opacity = useRef(new Animated.Value(0.4)).current;
 
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);
 
  return <Animated.View style={[styles.dot, { opacity }]} />;
}
 
const styles = StyleSheet.create({
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#3b82f6" },
});
```

* **Always stop loops in the effect cleanup** - leaked loops keep firing after unmount and waste battery.
* `Animated.sequence` runs steps one after another; `Animated.stagger` offsets parallel children.
* For complex loading skeletons tied to list layout, prefer Reanimated layout animations instead.

> **Related:** [Animations Best Practices](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/best-practices/) - when pulsing indicators hurt list scroll performance

---

### 5. Animated.event - Scroll-Linked Opacity

Bind scroll position directly to animated values without per-frame `setState`.

```tsx
import { useRef } from "react";
import { Animated, ScrollView, StyleSheet, View } from "react-native";
 
const HEADER_HEIGHT = 56;
 
export function CollapsingHeaderScroll() {
  const scrollY = useRef(new Animated.Value(0)).current;
 
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
 
  return (
    <View style={styles.screen}>
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <View />
      </Animated.View>
      <Animated.ScrollView
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* long content */}
      </Animated.ScrollView>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { height: HEADER_HEIGHT, backgroundColor: "#111" },
});
```

* **`scrollEventThrottle={16}`** targets ~60fps scroll events - the default 400ms throttle feels laggy for parallax.
* `interpolate` maps scroll range to opacity - no React render per frame.
* For parallax tied to gestures beyond scroll (pull-to-refresh, bottom sheets), graduate to Reanimated + Gesture Handler.

> **Related:** [react-native-gesture-handler](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/react-native-gesture-handler/) - pan gestures that share values with Reanimated

---

### 6. What useNativeDriver Cannot Animate

Layout-affecting properties stay on the JS thread with the classic `Animated` API.

| Property family | `useNativeDriver: true` | Better approach |
| --- | --- | --- |
| `opacity`, `transform` | ✅ Supported | `Animated` or Reanimated |
| `width`, `height`, `top`, `left` | ❌ Not supported | Reanimated layout animations or `Layout` |
| `backgroundColor` | ❌ Not supported | Reanimated `useAnimatedStyle` + `interpolateColor` |
| Flex changes | ❌ Not supported | Reanimated `Layout` or conditional structure |

```tsx
// ❌ This warns and runs on the JS thread - jank during scroll
Animated.timing(width, { toValue: 200, useNativeDriver: true });
 
// ✅ Reanimated 4 - layout-aware animation on the UI thread
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
 
const progress = useSharedValue(0);
const style = useAnimatedStyle(() => ({
  width: withTiming(progress.value * 200),
}));
```

* The native driver boundary is the main reason teams adopt Reanimated for production motion.
* Animating layout on the JS thread during list scroll is a common source of dropped frames.

> **Related:** [Layout Animations](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/layout-animations/) - `Layout`, `FadeIn`, and list reorder without manual width tweens

---

### 7. When to Keep Animated vs Switch to Reanimated

| Scenario | `Animated` API | Reanimated 4 |
| --- | --- | --- |
| One-shot fade on mount | ✅ | Overkill |
| Button press scale | ✅ | Either works |
| Finger-following drag | ❌ | ✅ `Gesture.Pan` + shared values |
| Swipe-to-delete row | ❌ | ✅ |
| Shared element hero | ❌ | ✅ `sharedTransitionTag` |
| List insert/delete motion | ❌ | ✅ entering/exiting + `Layout` |
| 60fps during fast scroll | Risky on JS thread | ✅ UI-thread worklets |

**Rule of thumb:** If the animation follows a finger or runs while a `FlatList` scrolls, use Reanimated 4. If it is a short, fire-and-forget transition on a static screen, `Animated` is acceptable.

> **Related:** [react-native-reanimated 4](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/react-native-reanimated-4/) - full cookbook for shared values | [Gesture Conflict Resolution](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/gesture-conflict-resolution/) - scroll vs swipe rows

---

## Intermediate Examples

### 8. Reanimated Shared Value - UI-Thread Fade

Shared values mutate off the React render path - the foundation of Reanimated 4.

```tsx
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
 
export function ReanimatedFadeIn({ children }: { children: React.ReactNode }) {
  const opacity = useSharedValue(0);
 
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
  }, [opacity]);
 
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));
 
  return <Animated.View style={[styles.card, style]}>{children}</Animated.View>;
}
 
const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 12, backgroundColor: "#fff" },
});
```

* **`useSharedValue`** holds animation state on the UI thread - updating `.value` does not re-render React.
* **`useAnimatedStyle`** returns a style object recomputed every frame inside a worklet.
* Import `Animated` from `react-native-reanimated`, not `react-native`, when using worklet-driven styles.

> **Related:** [Worklets & Bundle Mode](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/worklets-and-bundle-mode/) - how worklets are compiled and debugged

---

### 9. withSpring - Gesture-Ready Motion

Springs feel responsive when linked to release velocity - Reanimated's default for interactive UI.

```tsx
import { Pressable, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
 
export function SpringChip({ label }: { label: string }) {
  const scale = useSharedValue(1);
 
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
 
  return (
    <Pressable
      onPressIn={() => {
        scale.value = withSpring(0.94, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
      }}
    >
      <Animated.View style={[{ padding: 12, borderRadius: 999, backgroundColor: "#dbeafe" }, style]}>
        <Text>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}
```

* **`withSpring`** accepts `damping`, `stiffness`, and `mass` - tune once per design system, reuse via constants.
* Press handlers update shared values directly - still fine for simple chips; pans use Gesture Handler instead.
* Springs on the UI thread stay smooth even when JS is busy parsing a large API response.

> **Related:** [react-native-gesture-handler](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/react-native-gesture-handler/) - `Gesture.Pan().onUpdate` driving the same shared value

---

### 10. JS Thread vs UI Thread - Mental Model

Understanding where frames execute prevents "mysterious jank" in production.

```text
JS thread (React)                    UI thread (native)
─────────────────                    ───────────────────
React render → commit                Gesture recognition
setState every frame ❌              Shared value updates ✅
Animated without native driver ❌    useAnimatedStyle ✅
Business logic, networking         withTiming / withSpring
```

```tsx
// ❌ Runs on JS thread - competes with React reconciliation
const [offset, setOffset] = useState(0);
onPanResponderMove: (_, g) => setOffset(g.dx);
 
// ✅ Runs on UI thread - 60fps even during heavy JS work
const translateX = useSharedValue(0);
Gesture.Pan().onUpdate((e) => {
  translateX.value = e.translationX;
});
```

* **60fps means 16.7ms per frame** - one expensive JS render during a pan drops a frame visibly.
* Use React DevTools and the JS thread monitor; use Reanimated's debug logging for worklet issues.
* Profile on a **mid-tier Android device** - iPhone Pro simulators mask JS-thread contention.

> **Related:** [Animations Best Practices](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/best-practices/) - profiling checklist before shipping motion | [../performance/best-practices/best-practices.md](https://docs.wahwei/reactnative.codeguides.io/performance/best-practices/) - device matrix for performance review

---

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
