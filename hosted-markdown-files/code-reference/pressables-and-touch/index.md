# Pressables and Touch

Touch targets, press feedback, and patterns that keep taps reliable on phones.

Highlights / Pressables and Touch

* Pressable Basic
* Pressable Style Function
* hitSlop Expand Target
* Long Press Handler
* Android ripple android\_ripple

#### Pressable Basic

`Pressable` is the preferred primitive for custom buttons - more flexible than legacy Touchables.

```tsx
import { Pressable, Text } from "react-native";
 
<Pressable onPress={onSave}>
  <Text>Save</Text>
</Pressable>
```

#### Pressable Style Function

Style can be a function of `{ pressed }` for opacity or color feedback without extra state.

```tsx
<Pressable
  onPress={onPress}
  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }, styles.btn]}
>
  <Text>Continue</Text>
</Pressable>
```

#### hitSlop Expand Target

Expand the touch box without changing visuals - critical for small icons.

```tsx
<Pressable hitSlop={12} onPress={onClose}>
  <Icon name="x" />
</Pressable>
```

#### disabled Pressable

`disabled` blocks press handlers and should pair with muted styles and `accessibilityState`.

```tsx
<Pressable disabled={isPending} onPress={onSubmit} accessibilityState={{ disabled: isPending }}>
  <Text>Submit</Text>
</Pressable>
```

#### TouchableOpacity Legacy

Still common in older codebases. Prefer `Pressable` for new work unless a library requires Touchable.

```tsx
import { TouchableOpacity, Text } from "react-native";
 
<TouchableOpacity activeOpacity={0.7} onPress={onPress}>
  <Text>Legacy button</Text>
</TouchableOpacity>
```

#### Button Primitive

RN `Button` is a thin system control - fine for prototypes, limited for design systems.

```tsx
import { Button } from "react-native";
 
<Button title="OK" onPress={onOk} />
```

#### Long Press Handler

`onLongPress` opens context menus and secondary actions.

```tsx
<Pressable onPress={onOpen} onLongPress={onShowMenu}>
  <Text>{title}</Text>
</Pressable>
```

#### Delay Long Press

Tune how long the finger must stay down before long-press fires.

```tsx
<Pressable delayLongPress={400} onLongPress={onShowMenu}>
  <Row />
</Pressable>
```

#### Nested Pressables

Avoid wrapping pressable rows in another pressable parent. If you must nest, stop propagation patterns carefully - prefer separate hit targets.

```tsx
// Prefer sibling actions over Pressable inside Pressable rows
<View style={{ flexDirection: "row" }}>
  <Pressable onPress={onOpen} style={{ flex: 1 }}><Text>{title}</Text></Pressable>
  <Pressable onPress={onDelete}><Text>Delete</Text></Pressable>
</View>
```

#### Press Retention Offset

Allow the finger to drift slightly while still counting as a press.

```tsx
<Pressable pressRetentionOffset={20} onPress={onPress}>
  <Text>Drag-tolerant</Text>
</Pressable>
```

#### Android ripple android\_ripple

Material ripple on Android via the `android_ripple` prop.

```tsx
<Pressable
  android_ripple={{ color: "#dbeafe" }}
  onPress={onPress}
  style={styles.row}
>
  <Text>Row</Text>
</Pressable>
```

#### Haptic Feedback Expo

Light haptics improve perceived quality on supported devices (`expo-haptics`).

```tsx
import * as Haptics from "expo-haptics";
 
async function onPress() {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  doAction();
}
```

#### Disable Double Submit

Guard async presses so double-taps do not fire two mutations.

```tsx
const busy = useRef(false);
async function onPress() {
  if (busy.current) return;
  busy.current = true;
  try {
    await submit();
  } finally {
    busy.current = false;
  }
}
```

#### Accessible Role Button

Expose the control as a button to VoiceOver/TalkBack and give it a spoken name.

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Save profile"
  onPress={onSave}
>
  <Icon name="check" />
</Pressable>
```

#### Gesture Handler Root

When using React Native Gesture Handler, wrap the app (Expo Router does this in templates) so gestures and native navigators cooperate.

```tsx
// Expo Router templates already wrap with GestureHandlerRootView.
// Bare RN: import { GestureHandlerRootView } from "react-native-gesture-handler";
// return <GestureHandlerRootView style={{ flex: 1 }}><App /></GestureHandlerRootView>;
```

## Related

* [TextInput and Forms](https://docs.wahwei/reactnative.codeguides.io/code-reference/textinput-and-forms/) - form submit paired with buttons
* [Lists and Virtualization](https://docs.wahwei/reactnative.codeguides.io/code-reference/lists-and-virtualization/) - row-level press handlers
* [Accessibility and Safe Area](https://docs.wahwei/reactnative.codeguides.io/code-reference/accessibility-and-safe-area/) - roles, labels, hit targets

### External Related Links

* [reactnative.dev/docs](https://reactnative.dev/docs/getting-started) - full RN documentation
* [reactnative.dev](https://reactnative.dev/) - official React Native site
* [react.dev](https://react.dev/) - core React concepts RN builds on

> **Stack versions:** React 19.2.3 · React Native 0.86.0 · Expo SDK 57

Reviewed by Chris St. John·Last updated Jul 18, 2026
