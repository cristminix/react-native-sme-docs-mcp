# Event Handling & Touchables

Pressable, gestures at the primitive layer, and hitSlop patterns.

Highlights / Event Handling & Touchables

* Pressable is the modern primitive - style as a function of pressed/hovered/focused state
* hitSlop expands the touch target without changing layout bounds
* Native responder system decides which view wins overlapping touches
* Android ripple uses android\_ripple; iOS relies on opacity and highlight styles
* disabled blocks onPress and should pair with accessible disabled state
* Gesture Handler adds pan/pinch when Pressable is not enough

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import { Pressable, StyleSheet, Text, View } from "react-native";
 
interface IconButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}
 
export function IconButton({ label, onPress, disabled = false }: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
      android_ripple={{ color: "rgba(255,255,255,0.25)", borderless: false }}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}
 
const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
  label: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
```

**When to reach for this:** Any tappable control - buttons, list rows, chips - where you need reliable presses, accessible targets, and platform-appropriate feedback.

## Working Example

```tsx
import { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
 
type Action = "save" | "share" | "delete";
 
const ACTIONS: { key: Action; label: string; destructive?: boolean }[] = [
  { key: "save", label: "Save draft" },
  { key: "share", label: "Share link" },
  { key: "delete", label: "Delete", destructive: true },
];
 
export default function ActionSheetDemo() {
  const [lastEvent, setLastEvent] = useState("Tap an action");
  const [pressedKey, setPressedKey] = useState<Action | null>(null);
 
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Touch targets</Text>
      <Text style={styles.subtitle}>{lastEvent}</Text>
 
      <View style={styles.sheet}>
        {ACTIONS.map((action) => (
          <Pressable
            key={action.key}
            onPress={() => setLastEvent(`onPress: ${action.label}`)}
            onPressIn={() => setPressedKey(action.key)}
            onPressOut={() => setPressedKey(null)}
            onLongPress={() => setLastEvent(`onLongPress: ${action.label}`)}
            delayLongPress={400}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            accessibilityRole="button"
            accessibilityHint={
              action.destructive ? "Permanently removes the item" : undefined
            }
            style={({ pressed }) => [
              styles.row,
              pressed && styles.rowPressed,
              action.destructive && styles.rowDestructive,
            ]}
            android_ripple={{
              color: action.destructive ? "rgba(239,68,68,0.2)" : "rgba(37,99,235,0.15)",
            }}
          >
            <Text
              style={[
                styles.rowLabel,
                action.destructive && styles.destructiveText,
                pressedKey === action.key && styles.rowLabelPressed,
              ]}
            >
              {action.label}
            </Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>
 
      <View style={styles.toolbar}>
        <Pressable
          onPress={() => setLastEvent("Toolbar icon tapped")}
          hitSlop={16}
          style={({ pressed }) => [styles.iconHit, pressed && styles.iconHitPressed]}
        >
          <View style={styles.iconGlyph} />
        </Pressable>
        <Text style={styles.toolbarHint}>
          Icon is 24×24 with 16pt hitSlop → 56×56 effective target
        </Text>
      </View>
 
      {Platform.OS === "ios" && (
        <Text style={styles.note}>
          iOS: opacity feedback; Android: ripple via android_ripple
        </Text>
      )}
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 20, backgroundColor: "#f8fafc", gap: 16 },
  title: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
  subtitle: { fontSize: 15, color: "#475569" },
  sheet: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#cbd5e1",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
  },
  rowPressed: { backgroundColor: "#f1f5f9" },
  rowDestructive: {},
  rowLabel: { flex: 1, fontSize: 16, color: "#0f172a" },
  rowLabelPressed: { color: "#2563eb" },
  destructiveText: { color: "#dc2626" },
  chevron: { fontSize: 20, color: "#94a3b8" },
  toolbar: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconHit: { padding: 4 },
  iconHitPressed: { opacity: 0.6 },
  iconGlyph: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#2563eb",
  },
  toolbarHint: { flex: 1, fontSize: 13, color: "#64748b" },
  note: { fontSize: 12, color: "#94a3b8" },
});
```

**What this demonstrates:**

* `Pressable` style function reacting to `pressed` state for cross-platform feedback
* `onPressIn` / `onPressOut` for tracking active presses without firing the full press
* `onLongPress` with `delayLongPress` for secondary actions
* `hitSlop` enlarging small icon targets without changing layout metrics
* `android_ripple` for Material-style touch ripples on Android
* `accessibilityRole`, `accessibilityHint`, and `accessibilityState` on interactive elements

## Deep Dive

### How It Works

* Touch events originate on the **native UI thread** and are delivered to the **JS thread** as React synthetic events.
* React Native uses a **responder negotiation** system: the deepest eligible view typically becomes the responder.
* `Pressable` tracks press lifecycle states (`pressed`, `hovered`, `focused`) and maps them to styles or children functions.
* `onPress` fires on touch release **inside** the view bounds when the gesture is not cancelled.
* `disabled` removes the view from the responder chain for press activation.
* High-frequency gestures (pan, pinch) should use `react-native-gesture-handler` instead of raw responder APIs.

### Pressable Event Lifecycle

| Event | Fires when | Typical use |
| --- | --- | --- |
| `onPressIn` | Finger down inside view | Highlight, haptic prep |
| `onPressOut` | Finger up or gesture cancelled | Clear highlight |
| `onPress` | Completed tap (down + up inside) | Primary action |
| `onLongPress` | Held past `delayLongPress` (default 500ms) | Context menu, delete confirm |
| `onPress` not called | Scroll steals gesture, finger slides outside, parent scrolls | Expected - do not fight scroll |

### hitSlop Patterns

```tsx
// Uniform expansion (number = all sides)
<Pressable hitSlop={12} />
 
// Per-edge control - useful above tab bars or under notches
<Pressable hitSlop={{ top: 8, bottom: 16, left: 12, right: 12 }} />
 
// Negative hitSlop shrinks the target (rare - overlapping rows)
<Pressable hitSlop={-4} />
```

| Target size | Recommended minimum | Technique |
| --- | --- | --- |
| Text link | 44×44 pt effective | `hitSlop` + `minHeight` |
| Toolbar icon 24×24 | 44×44 pt effective | `hitSlop={10}` or padding wrapper |
| Full-width list row | 48dp height | `paddingVertical` on `Pressable` |
| Destructive action | 44×44 + confirmation | `onLongPress` or second step |

### Touchable Legacy Components

| Component | Feedback | Status |
| --- | --- | --- |
| `Pressable` | Custom opacity, ripple, children fn | **Preferred** |
| `TouchableOpacity` | Fades opacity on press | Legacy, still common |
| `TouchableHighlight` | Darkens underlay | Legacy |
| `TouchableWithoutFeedback` | None | Avoid for buttons - a11y gaps |

### Responder vs Gesture Handler

```tsx
// Primitive layer - sufficient for buttons and list rows
<Pressable onPress={save} />
 
// Gesture Handler - pan, pinch, simultaneous handlers (install in Expo)
import { Gesture, GestureDetector } from "react-native-gesture-handler";
 
const pan = Gesture.Pan().onEnd((e) => {
  if (e.translationX < -80) archiveItem();
});
```

* Stay on `Pressable` until scroll conflicts or multi-touch requirements appear.
* `react-native-gesture-handler` integrates with native drivers for 60fps pans.

### TypeScript Notes

```tsx
import type { PressableProps, StyleProp, ViewStyle } from "react-native";
import type { GestureResponderEvent } from "react-native";
 
type ButtonStyle = PressableProps["style"]; // StyleProp<ViewStyle> | fn
 
interface RowProps {
  onPress: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
}
 
// Style function form
const styleFn: Extract<ButtonStyle, Function> = ({ pressed, hovered }) => [
  styles.base,
  pressed && styles.pressed,
];
```

* `PressableProps["style"]` covers both static styles and the `pressed` callback form.
* `GestureResponderEvent` types native touch metadata (`nativeEvent.locationX`).
* Prefer explicit `() => void` callbacks in props when you do not need the event object.

## Gotchas

* **Tiny touch targets** - A 20×20 icon without `hitSlop` fails HIG/Material minimums and frustrates users. **Fix:** Add `hitSlop` or wrap with padding to reach ~44×44 pt.
* **ScrollView steals presses** - Horizontal swipes on a `Pressable` inside `ScrollView` may cancel `onPress`. **Fix:** Tune `keyboardShouldPersistTaps`, use `delayPressIn`, or move gesture to Gesture Handler.
* **TouchableOpacity wrapping large trees** - Fading opacity on a huge subtree flashes all children. **Fix:** Apply feedback on the `Pressable` row only, not the whole screen wrapper.
* **Missing disabled feedback** - `disabled` silences `onPress` but visuals may look active. **Fix:** Combine `disabled` style, `accessibilityState={{ disabled: true }}`, and `pointerEvents` where needed.
* **Overlapping pressables fight** - Absolute overlays intercept touches unintentionally. **Fix:** Set `pointerEvents="box-none"` on decorative parents or `pointerEvents="none"` on overlays.
* **Relying on `onPress` for drag detection** - Press fires after release; drag gestures need pan handlers. **Fix:** Use `react-native-gesture-handler` `Pan` for swipe-to-delete.
* **Android ripple without overflow hidden** - Ripples bleed outside rounded cards. **Fix:** Set `overflow: "hidden"` on the card and match `borderRadius` on `android_ripple`.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `Pressable` | Default buttons, list rows, chips | Complex multi-finger gestures |
| `TouchableOpacity` | Maintaining legacy code quickly | Greenfield - prefer `Pressable` |
| `Text` `onPress` | Inline links inside copy | Primary CTAs needing 44pt targets |
| `react-native-gesture-handler` | Swipe rows, drawers, pinch zoom | Simple static buttons |
| Native `Button` | System-styled trivial actions | Custom brand styles |
| `expo-haptics` + `Pressable` | Tactile confirmation on success | Every tap - causes haptic fatigue |

## FAQs

Why is Pressable preferred over TouchableOpacity?

* `Pressable` exposes `pressed`, `hovered`, and `focused` states in a style function.
* Built-in `android_ripple`, `hitSlop`, and accessibility props are first-class.
* `TouchableOpacity` always animates opacity - less control and wider re-render surface on big trees.

What does hitSlop actually change?

* It expands the **touch recognition rect** beyond the view's layout bounds.
* Visual layout and sibling spacing stay the same - only the tappable area grows.
* Measured in density-independent pixels (dp/pt), not physical millimeters.

When does onPress not fire?

* User scrolls parent `ScrollView` before release.
* Finger moves outside the view bounds on release.
* Another view wins the responder during negotiation.
* `disabled={true}` is set on the `Pressable`.

How do I add Android ripple and iOS opacity together?

```tsx
<Pressable
  android_ripple={{ color: "rgba(0,0,0,0.12)" }}
  style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
/>
```

* `android_ripple` is ignored on iOS - safe to ship in cross-platform files.
* iOS uses `pressed` style (typically lower opacity or background change).

Gotcha: Why does my button feel delayed?

* `delayPressIn` (default 0) can be raised by parents or `ScrollView` press retention.
* Heavy JS work on `onPressIn` blocks the next frame.
* Defer expensive work to `onPress` or `requestAnimationFrame`; show highlight immediately.

What is delayLongPress?

* Milliseconds the finger must stay down before `onLongPress` fires (default 500).
* Lower values (250–400) feel snappier for power users; higher values reduce accidental triggers.
* `onPress` still fires on quick taps unless long-press handler consumes the gesture.

How do pointerEvents values work?

* `auto` (default) - view and children receive touches.
* `none` - view and children are transparent to touches.
* `box-none` - view ignores touches; children still receive them.
* `box-only` - view receives touches; children do not.

Should list rows use Pressable or TouchableHighlight?

* Use `Pressable` for new code - clearer state and ripple control.
* `TouchableHighlight` underlay can flash incorrectly in virtualized lists during fast scroll.
* Memoize row components; avoid creating new `onPress` closures per item.

How do I prevent double-tap submitting twice?

```tsx
const [submitting, setSubmitting] = useState(false);
 
const onSubmit = async () => {
  if (submitting) return;
  setSubmitting(true);
  try {
    await save();
  } finally {
    setSubmitting(false);
  }
};
 
<Pressable onPress={onSubmit} disabled={submitting} />
```

* Disable while async work runs; do not rely on debounce alone for network calls.

Gotcha: Can I nest Pressables?

* Nesting is allowed but inner and outer both compete for the responder.
* Prefer a single `Pressable` row with child `Text` nodes.
* For buttons inside cards, stop propagation is not like web - restructure layout instead.

What accessibility props should buttons have?

* `accessibilityRole="button"` marks the element for screen readers.
* `accessibilityLabel` when visible text is insufficient (icon-only).
* `accessibilityState={{ disabled, selected, busy }}` mirrors visual state.
* `accessibilityHint` for destructive or non-obvious outcomes.

When do I need react-native-gesture-handler?

* Pan/swipe gestures that must run on the UI thread alongside scroll views.
* Pinch-to-zoom, draggable sheets, and simultaneous multi-touch handlers.
* Expo templates often include it prewired - import `GestureDetector` for advanced cases.

Does onPressIn run on the JS thread?

* Yes - all `Pressable` callbacks execute on the JavaScript thread (Hermes).
* Keep handlers light; defer heavy work until after press confirmation.
* Animations driven by `react-native-reanimated` can stay on the UI thread separately.

How do keyboardShouldPersistTaps relate to touches?

* On screens with `TextInput`, `keyboardShouldPersistTaps="handled"` lets taps on `Pressable` fire without dismissing the keyboard first.
* Use on form screens so submit buttons work on first tap.
* Does not replace `hitSlop` - both solve different problems.

What is pressRetentionOffset?

* Allows the finger to move slightly outside the view before cancelling the press.
* Useful for chunky fingers on small targets - pairs well with modest `hitSlop`.
* Documented on `Pressable` props; tune when users report "slip off" cancellations.

## Related

* [Views, Text & Core Components](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/views-text-and-core-components/) - layout wrappers around touch targets
* [Props, State & Re-renders on Mobile](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/props-state-and-re-renders-on-mobile/) - what runs inside `onPress` handlers
* [Platform-Specific Code](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/platform-specific-code/) - ripple vs opacity split by platform
* [Dimensions & Responsive Layout](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/dimensions-and-responsive-layout/) - sizing toolbars and adaptive hit areas
* [React Native Basics](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/react-native-basics/) - app shell and navigation context
* [Best Practices](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/best-practices/) - accessibility and interaction checklist

### External Related Links

* [reactnative.dev](https://reactnative.dev/) - official React Native site
* [reactnative.dev/docs](https://reactnative.dev/docs/getting-started) - full RN documentation
* [react.dev](https://react.dev/) - core React concepts RN builds on

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
