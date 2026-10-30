# react-native-reanimated & gesture-handler

Version matrix tied to Expo SDK 57. Reanimated 4 runs animations on the **UI thread**; Gesture Handler moves touch recognition to native so pans stay at **60fps**. Install them as a pair. For shared values, springs, and composed gestures, see [react-native-reanimated 4](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/react-native-reanimated-4/) and [react-native-gesture-handler](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/react-native-gesture-handler/).

Highlights / react-native-reanimated & gesture-handler

* SDK 57 matrix: react-native-reanimated ~4.0.0, gesture-handler ~2.28.0
* Install both together with npx expo install - never hand-pin native versions
* react-native-reanimated/plugin must be the last babel.config.js plugin
* GestureHandlerRootView wraps the root layout - required for pans and sheets
* Import Animated from react-native-reanimated for worklet components
* Deep patterns in animations-gestures section - this page is install + matrix

## Recipe

> Quick-reference recipe card - copy-paste ready.

### SDK 57 Version Matrix

| Package | SDK 57 pin | Notes |
| --- | --- | --- |
| `react-native-reanimated` | `~4.0.0` | Reanimated 4 - New Architecture baseline |
| `react-native-gesture-handler` | `~2.28.0` | Install alongside Reanimated |
| `react` | `19.2.3` | Bundled with Expo SDK 57 |
| `react-native` | `0.86.0` | Fabric + Hermes default |

```bash
npx expo install react-native-reanimated react-native-gesture-handler
npx expo-doctor
```

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
// app/_layout.tsx - GestureHandlerRootView at root
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

```bash
# After install or babel change - clear Metro cache
npx expo start --clear
```

**When to reach for this:**

* Finger-driven pans, pinches, draggable sheets, and swipe actions.
* Animations that must stay smooth during list scroll or heavy JS work.
* Replacing `PanResponder` or JS-thread `Animated` for interactive UI.

## Working Example

Draggable card - shared values on the UI thread, spring on release.

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
    borderRadius: 12,
    backgroundColor: "#f0fdf4",
    margin: 16,
  },
});
```

**What this demonstrates:**

* **`useSharedValue`** - updates on UI thread without React re-renders.
* **`Gesture.Pan()`** - native touch recognition via Gesture Handler.
* **`useAnimatedStyle`** - worklet reads shared values every frame.
* **`withSpring` on end** - physics-based snap-back.
* **`GestureDetector` + Reanimated `Animated.View`** - the standard SDK 57 pairing.

## Deep Dive

### Install Verification Checklist

```markdown
## Reanimated + RNGH install verification
 
- [ ] npx expo install react-native-reanimated react-native-gesture-handler
- [ ] package.json shows ~4.0.0 and ~2.28.0 (via expo install)
- [ ] babel.config.js - reanimated/plugin is LAST plugin
- [ ] GestureHandlerRootView wraps root layout
- [ ] npx expo start --clear after babel change
- [ ] eas build --profile development after native version bump
- [ ] Pan gesture tested on physical device (not just simulator)
- [ ] npx expo-doctor passes
```

### Rebuild Triggers

| Change | Metro restart | Dev client / EAS rebuild |
| --- | --- | --- |
| JS-only animation code | Yes | No |
| Babel plugin added/changed | `--clear` required | No |
| Native version bump | `--clear` | **Yes** |
| SDK upgrade | `--clear` | **Yes** |

### Import Rules

```tsx
// ✅ Worklet components and styles
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
 
// ❌ Do not mix for gesture-driven UI
import { Animated } from "react-native";
```

### Scroll + Gesture Conflicts

When nested scroll steals pans, import scrollables from Gesture Handler for the inner rail:

```tsx
import { ScrollView } from "react-native-gesture-handler";
```

See [Gesture Conflict Resolution](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/gesture-conflict-resolution/).

## Gotchas

* **Babel plugin not last** - Worklets fail; animations stutter on JS thread. **Fix:** Move `react-native-reanimated/plugin` to end of `plugins`; `npx expo start --clear`.
* **Hand-pinning versions** - `npm install react-native-reanimated@latest` breaks native ABI. **Fix:** Always `npx expo install`.
* **Missing GestureHandlerRootView** - Gestures never fire. **Fix:** Wrap `app/_layout.tsx` root.
* **Reading shared values in React render** - `translateX.value` in JSX does not subscribe. **Fix:** Only read inside `useAnimatedStyle`.
* **Testing in stale Expo Go** - Old client lacks native bits after upgrade. **Fix:** Rebuild dev client matching SDK 57.
* **Calling setState inside useAnimatedStyle** - Worklet thread errors. **Fix:** `runOnJS(setState)` from gesture `onEnd` only.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Reanimated 4 + RNGH | Gestures, 60fps interactive UI | One-shot 200ms fade |
| RN `Animated` API | Simple opacity on static screens | Finger-following drags |
| `PanResponder` | Legacy maintenance | New gesture code on SDK 57 |
| Lottie | Designer vector loops | Interactive draggable UI |

## FAQs

What versions does Expo SDK 57 pin?

`react-native-reanimated` **~4.0.0** and `react-native-gesture-handler` **~2.28.0**. Run `npx expo install` - do not copy versions from older blog posts.

Do I need both packages?

Install both together. Gesture Handler is required for `Gesture.Pan` and native scroll conflicts; Reanimated drives UI-thread values from gesture callbacks.

Where does the Babel plugin go?

Last entry in `babel.config.js` `plugins` array - after all other plugins. Restart Metro with `--clear`.

Does Reanimated require New Architecture?

SDK 57 projects increasingly run Fabric + Hermes by default. Reanimated 4 targets that stack.

Where are the full animation guides?

[react-native-reanimated 4](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/react-native-reanimated-4/) and [react-native-gesture-handler](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/react-native-gesture-handler/).

## Related

* [react-native-reanimated 4](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/react-native-reanimated-4/) - shared values and springs
* [react-native-gesture-handler](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/react-native-gesture-handler/) - Pan, Pinch, composed gestures
* [Animations Basics](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/animations-basics/) - Animated vs Reanimated tour
* [Animations Best Practices](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/best-practices/) - profiling checklist
* [Essential Libraries Basics](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/essential-libraries-basics/) - pin native deps correctly

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4). 636f64656775696465732e696f7c6367696f3937397c323032363037

Reviewed by Chris St. John·Last updated Jul 19, 2026
