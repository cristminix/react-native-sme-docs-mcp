# react-native-gesture-handler

Gesture Handler (RNGH) moves touch recognition to the native layer so pans, pinches, and multi-touch compositions stay at **60fps**. On Expo SDK 57, install it alongside Reanimated 4 and drive animated values from gesture callbacks on the UI thread.

Highlights / react-native-gesture-handler

* Gesture Handler runs recognition on the native thread - Pressable cannot match pan frequency
* Gesture.Pan and Gesture.Pinch are the two primitives for draggable and zoomable UI
* Wrap gestures in GestureDetector - one detector per composed gesture object
* Gesture.Simultaneous and Gesture.Race compose multi-gesture interactions
* GestureHandlerRootView at the app root is mandatory - drawers and stacks depend on it
* Pair every high-frequency gesture with Reanimated shared values, not setState

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install react-native-gesture-handler react-native-reanimated
```

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

```tsx
import { StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
 
export function SwipeableTile() {
  const translateX = useSharedValue(0);
 
  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd(() => {
      translateX.value = withSpring(0);
    });
 
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
 
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.tile, style]} />
    </GestureDetector>
  );
}
 
const styles = StyleSheet.create({
  tile: { height: 72, backgroundColor: "#e2e8f0", borderRadius: 12 },
});
```

**When to reach for this:**

* Swipe-to-delete rows, draggable cards, pull handles
* Pinch-to-zoom on images and maps overlays
* Bottom sheets and drawers that compete with scroll views
* Any gesture that must stay smooth while lists scroll

## Working Example

Pinch-to-zoom on an image with simultaneous pan - composed gestures on one detector.

```tsx
// components/zoomable-image.tsx
import { Image, StyleSheet, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
 
type Props = { uri: string };
 
export function ZoomableImage({ uri }: Props) {
  const { width } = useWindowDimensions();
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
 
  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedScale.value = 1;
        savedX.value = 0;
        savedY.value = 0;
      } else {
        savedScale.value = scale.value;
      }
    });
 
  const pan = Gesture.Pan()
    .minPointers(1)
    .maxPointers(2)
    .onUpdate((e) => {
      if (scale.value > 1) {
        translateX.value = savedX.value + e.translationX;
        translateY.value = savedY.value + e.translationY;
      }
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });
 
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedScale.value = 1;
        savedX.value = 0;
        savedY.value = 0;
      } else {
        scale.value = withTiming(2);
        savedScale.value = 2;
      }
    });
 
  const composed = Gesture.Simultaneous(
    pinch,
    pan,
    Gesture.Exclusive(doubleTap, Gesture.Tap())
  );
 
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));
 
  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={{ width, height: width * 0.75 }}>
        <Animated.Image
          source={{ uri }}
          style={[styles.image, style]}
          resizeMode="cover"
        />
      </Animated.View>
    </GestureDetector>
  );
}
 
const styles = StyleSheet.create({
  image: { width: "100%", height: "100%" },
});
```

```tsx
// Swipe threshold with runOnJS - dismiss when pan passes -120px
import { runOnJS } from "react-native-reanimated";
 
const pan = Gesture.Pan()
  .onUpdate((e) => {
    translateX.value = Math.min(0, e.translationX);
  })
  .onEnd((e) => {
    if (e.translationX < -120) {
      runOnJS(onArchive)();
    } else {
      translateX.value = withSpring(0);
    }
  });
```

## Deep Dive

### Gesture.Pan

| Method | Purpose |
| --- | --- |
| `activeOffsetX/Y` | Require movement before activation - prevents stealing taps |
| `failOffsetY` | Fail pan when vertical movement dominates - scroll handoff |
| `minDistance` | Ignore micro-jitter |
| `onUpdate` | Per-frame translation - keep math only |
| `onEnd` | Snap, dismiss, or `runOnJS` side effects |

```tsx
Gesture.Pan()
  .activeOffsetX([-10, 10])
  .failOffsetY([-15, 15])
```

Use `failOffsetY` on horizontal swipe rows inside vertical `ScrollView` - see [Gesture Conflict Resolution](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/gesture-conflict-resolution/).

### Gesture.Pinch

* `event.scale` is relative to gesture start - multiply against a **saved** shared value on `onEnd`.
* Clamp min/max scale to avoid inverted or microscopic images.
* Pair with pan only when `scale > 1` so unzoomed images do not drift.

### GestureDetector

* One `GestureDetector` wraps one gesture object (simple or composed).
* Child must be a native view or Reanimated component - not a fragment with multiple roots.
* For lists, wrap the **row** content, not the entire `FlatList`.

### Composed gestures

| Composer | Behavior |
| --- | --- |
| `Gesture.Simultaneous(a, b)` | Both can recognize together (pinch + pan) |
| `Gesture.Race(a, b)` | First winner takes over |
| `Gesture.Exclusive(a, b)` | Higher-priority wins when both match |

```tsx
const drag = Gesture.Pan();
const longPress = Gesture.LongPress().minDuration(400);
const rowGesture = Gesture.Race(longPress, drag);
```

### RNGH ScrollView and FlatList

Import scrollables from `react-native-gesture-handler` when nested scroll causes native conflicts:

```tsx
import { ScrollView } from "react-native-gesture-handler";
```

Prefer this on the **inner** rail first - not both axes blindly (see [Nested Scrollables](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/nested-scrollables/)).

## Gotchas

* **No GestureHandlerRootView** - Gestures never activate; no compile-time error. **Fix:** Wrap `app/_layout.tsx` root.
* **setState in onUpdate** - Drops frames immediately. **Fix:** Shared values + `useAnimatedStyle`; `runOnJS` only on end.
* **Pan without activeOffset** - Horizontal row pans steal vertical scroll. **Fix:** `activeOffsetX` + `failOffsetY` tuning per layout.
* **Multiple GestureDetectors nested** - Parent may consume touches before child. **Fix:** Compose with `Simultaneous` / `Native` scroll refs instead of stacking detectors.
* **TouchableOpacity inside GestureDetector** - Double feedback or cancelled presses. **Fix:** Use `Gesture.Tap()` or `Pressable` with `pointerEvents` planning.
* **Reanimated plugin missing** - `onUpdate` throws worklet errors. **Fix:** `react-native-reanimated/plugin` last in Babel config.
* **Testing in Expo Go after native upgrade** - Old dev client lacks RNGH native bits. **Fix:** Rebuild dev client or use current Expo Go matching SDK 57.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `Pressable` | Buttons, simple list row taps | Drag, swipe, multi-touch |
| PanResponder (RN core) | Legacy maintenance | New gesture code on SDK 57 |
| `react-native-gesture-handler` | Production pans/pinches | Static non-interactive UI |
| Platform native gestures only | Fully native screens in brownfield | Shared RN component library |
| `@gorhom/bottom-sheet` | Standard sheet physics | Simple modal with no drag |

## FAQs

How do I install Gesture Handler on Expo SDK 57?

```bash
npx expo install react-native-gesture-handler react-native-reanimated
```

Add `GestureHandlerRootView` to root layout. Ensure Reanimated Babel plugin is last.

Why use Gesture.Pan instead of PanResponder?

* RNGH recognizes on the native thread with better scroll handoff.
* API composes cleanly (`Simultaneous`, `Race`) and integrates with Reanimated worklets.

What is activeOffsetX for?

The finger must move horizontally by N pixels before the pan activates. This lets vertical scroll win when the user scrolls a list containing swipeable rows.

Can I attach multiple gestures to one view?

Yes - build one composed gesture and pass it to a single `GestureDetector`. Do not nest multiple detectors on the same view without a composition plan.

Should FlatList come from RNGH or react-native?

Start with RN `FlatList`. Switch the **inner** horizontal list to RNGH `FlatList` when nested scroll gestures fail on Android ([Nested Scrollables](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/nested-scrollables/)).

How do gestures interact with Expo Router stacks?

Stack swipe-back is a native gesture. Custom full-screen pans may need `gestureEnabled: false` on the screen or careful `simultaneousWithExternalGesture` - see [Gesture Conflict Resolution](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/gesture-conflict-resolution/).

Do I need react-native-reanimated for gestures?

Not strictly for recognition, but every high-frequency UI update should use Reanimated shared values. `setState` per pan frame will jank.

## Related

* [Animations Basics](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/animations-basics/) - when to graduate from Pressable to RNGH
* [react-native-reanimated 4](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/react-native-reanimated-4/) - shared values driven by gestures
* [Gesture Conflict Resolution](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/gesture-conflict-resolution/) - ScrollView vs swipe rows vs sheets
* [Layout Animations](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/layout-animations/) - motion when rows mount/unmount after swipe
* [Nested Scrollables](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/nested-scrollables/) - horizontal rails in vertical feeds
* [Animations Best Practices](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/best-practices/) - shipping checklist for gesture-heavy screens

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
