# Utility Types for RN

React Native ships rich prop surfaces on built-in components. TypeScript utility types - especially `StyleProp` and `ComponentProps` - let you extend `Pressable`, `Text`, and `View` without duplicating dozens of optional props or breaking style arrays.

Highlights / Utility Types for RN

* `StyleProp<ViewStyle>` accepts a single style, an array, or falsy entries - match what RN components already accept
* `ComponentProps<typeof Pressable>` forwards every native prop without maintaining a hand-written list
* Use `Omit` to replace `children` or `style` when your wrapper exposes a narrower API
* `PressableProps['style']` captures the function-style callback Pressable allows - do not narrow to `ViewStyle` alone
* Derive event types from handler props (`ComponentProps<typeof TextInput>['onChangeText']`) instead of guessing signatures

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import {
  Pressable,
  Text,
  StyleSheet,
  type ComponentProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
 
type PressableProps = ComponentProps<typeof Pressable>;
 
interface LinkButtonProps extends Omit<PressableProps, "children"> {
  label: string;
  style?: StyleProp<ViewStyle>;
}
 
function LinkButton({ label, style, ...pressableProps }: LinkButtonProps) {
  return (
    <Pressable style={[styles.link, style]} {...pressableProps}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}
```

**When to reach for this:**

* Wrapping `Pressable`, `TextInput`, or `ScrollView` with a design-system API.
* Accepting optional `style` overrides that callers pass as arrays (`[base, condition && active]`).
* Forwarding accessibility and test props (`accessibilityLabel`, `testID`) without re-listing them.
* Building compound components that spread remaining props to a primitive.
* Replacing `React.FC` wrappers where you need precise control over `children`.

## Working Example

```tsx
// components/Card.tsx - View wrapper with typed style slots
import { View, Text, StyleSheet, type StyleProp, type ViewStyle, type TextStyle } from "react-native";
 
interface CardProps {
  title: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  elevated?: boolean;
}
 
export function Card({ title, children, style, titleStyle, elevated }: CardProps) {
  return (
    <View style={[styles.card, elevated && styles.elevated, style]}>
      <Text style={[styles.title, titleStyle]}>{title}</Text>
      {children}
    </View>
  );
}
 
const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#fff",
  },
  elevated: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 8,
  },
});
```

```tsx
// components/PrimaryButton.tsx - Pressable with forwarded props
import {
  ActivityIndicator,
  Pressable,
  Text,
  StyleSheet,
  type ComponentProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
 
type PressableProps = ComponentProps<typeof Pressable>;
type PressableStyle = PressableProps["style"];
 
interface PrimaryButtonProps extends Omit<PressableProps, "children" | "style"> {
  label: string;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  pressedStyle?: PressableStyle;
}
 
export function PrimaryButton({
  label,
  loading = false,
  disabled,
  style,
  pressedStyle,
  ...pressableProps
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
 
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        isDisabled && styles.disabled,
        pressed && !isDisabled ? styles.pressed : null,
        pressed && pressedStyle,
        style,
      ]}
      {...pressableProps}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}
 
const styles = StyleSheet.create({
  base: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  pressed: { opacity: 0.9 },
  disabled: { opacity: 0.5 },
  label: { color: "#fff", fontWeight: "600" },
});
```

```tsx
// components/LabeledInput.tsx - TextInput with typed change handler
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  type ComponentProps,
  type StyleProp,
  type TextStyle,
} from "react-native";
 
type TextInputProps = ComponentProps<typeof TextInput>;
type OnChangeText = TextInputProps["onChangeText"];
 
interface LabeledInputProps extends Omit<TextInputProps, "style"> {
  label: string;
  inputStyle?: StyleProp<TextStyle>;
  onChangeText: OnChangeText;
}
 
export function LabeledInput({ label, inputStyle, onChangeText, ...inputProps }: LabeledInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, inputStyle]}
        onChangeText={onChangeText}
        placeholderTextColor="#94a3b8"
        {...inputProps}
      />
    </View>
  );
}
 
const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: "500", color: "#334155" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
});
```

**What this demonstrates:**

* `StyleProp<ViewStyle>` on `Card` accepts caller arrays and falsy entries the same way `View` does.
* `ComponentProps<typeof Pressable>` captures `onPress`, `disabled`, `hitSlop`, and accessibility props for forwarding.
* `PressableProps["style"]` preserves the function-style callback type - not just `ViewStyle`.
* `Omit<TextInputProps, "style">` splits container vs input styling without losing keyboard or auto-capitalize props.
* `TextInputProps["onChangeText"]` extracts the exact handler signature from the primitive.

## Deep Dive

### How It Works

* **`StyleProp<T>`** is a union: `T | RecursiveArray<T | Falsy> | RegisteredStyle<T>` - it mirrors what RN style props accept.
* **`ComponentProps<C>`** (from `react-native` re-exports) resolves props for a component type or intrinsic element.
* **`Omit<T, K>`** removes keys you replace with a narrower API (`children` → `label`).
* **`Pick<T, K>`** selects a subset - handy for "summary" prop bags on list rows.
* **`Partial<T>`** makes every key optional - common for theme overrides and PATCH-style config updates.

### RN Style Types at a Glance

| Type | Use on |
| --- | --- |
| `StyleProp<ViewStyle>` | `View`, `Pressable`, `SafeAreaView` wrappers |
| `StyleProp<TextStyle>` | `Text`, `TextInput` text styling |
| `StyleProp<ImageStyle>` | `Image`, `ImageBackground` |
| `ViewStyle` / `TextStyle` / `ImageStyle` | Single style objects inside `StyleSheet.create` |
| `RegisteredStyle<T>` | Return type of `StyleSheet.create` keys - still assignable to `StyleProp<T>` |

```tsx
import { StyleSheet, type ViewStyle, type StyleProp } from "react-native";
 
const styles = StyleSheet.create({
  row: { flexDirection: "row" },
});
 
// All valid StyleProp usages:
const a: StyleProp<ViewStyle> = styles.row;
const b: StyleProp<ViewStyle> = [styles.row, { padding: 8 }];
const c: StyleProp<ViewStyle> = [styles.row, false && { opacity: 0 }];
```

### ComponentProps Patterns

| Pattern | Code | Why |
| --- | --- | --- |
| Full forward | `ComponentProps<typeof Pressable>` | Drop-in wrapper |
| Remove replaced props | `Omit<Props, "children" | "style">` | Custom `label` API |
| Extract one handler | `ComponentProps<typeof TextInput>["onChangeText"]` | Exact callback arity |
| Ref forwarding | `ComponentPropsWithRef<typeof TextInput>` | When using `forwardRef` (React 19 ref-as-prop also works) |

### TypeScript Notes

```tsx
import type { GestureResponderEvent, LayoutChangeEvent } from "react-native";
 
// Event types for custom touchables - do not invent synthetic event shapes
type OnPress = (event: GestureResponderEvent) => void;
 
function logLayout(e: LayoutChangeEvent) {
  const { width, height } = e.nativeEvent.layout;
  console.log({ width, height });
}
 
// Prefer keyof typeof styles for style keys tied to StyleSheet.create
const styles = StyleSheet.create({ card: {}, title: {} });
type CardStyleKey = keyof typeof styles; // "card" | "title"
```

* Import types with `import type { ... }` - keeps Metro bundles clean and satisfies `verbatimModuleSyntax` if enabled.
* Do not use `React.FC` for wrappers - it adds implicit `children` and obscures generics.
* For third-party components, `ComponentProps<typeof SomeLib.Button>` works the same way as RN primitives.

## Gotchas

* **Typing `style` as `ViewStyle` only** - Callers cannot pass `[styles.base, props.style]` or falsy guards. **Fix:** Use `StyleProp<ViewStyle>`.
* **Narrowing Pressable `style` to `ViewStyle`** - Pressable accepts a function `({ pressed }) => style`. **Fix:** Use `PressableProps["style"]` for overrides that must support the callback form.
* **Spreading props before explicit ones** - `{...pressableProps} onPress={mine}` gets overwritten by the spread if order is wrong. **Fix:** Spread `...pressableProps` **last** only when callers should override defaults; otherwise destructure `onPress` explicitly.
* **Duplicating `interface ButtonProps` by hand** - Missing `accessibilityState` or `android_ripple` when RN adds props. **Fix:** Start from `ComponentProps<typeof Pressable>` and `Omit` what you replace.
* **`TextStyle` on `TextInput`** - `TextInput` style prop includes font props but also box model; conflating with `ViewStyle` causes errors. **Fix:** Use `StyleProp<TextStyle>` for input text styling; wrap in `View` for layout.
* **`Partial` on required branding props** - `Partial<CardProps>` makes `title` optional when it should always be present. **Fix:** `Partial<Pick<CardProps, "style" | "titleStyle">>` for optional slots only.
* **Importing `ComponentProps` from `react`** - Works for DOM projects; RN primitives need `react-native` types for `StyleProp` and platform-specific props. **Fix:** Import both from `react-native` where available.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `ComponentProps<typeof X>` | Wrapping RN primitives | The component's props are not exported and are not a plain function component |
| Hand-written `interface` | Two or three custom props on a leaf component | Wrapping `Pressable` / `TextInput` with 30+ optional native props |
| `React.ComponentPropsWithoutRef` | Web DOM elements in `react-native-web` shared code | Pure native modules with no JSX |
| Theme libraries (Tamagui, Restyle) | Token-based `styled()` with inferred variants | One-off wrappers - utility types are lighter |
| `satisfies` on style objects | Inline object literals without `StyleSheet.create` | Published component libraries that must expose `StyleProp` overrides |

## FAQs

What is StyleProp and why not use ViewStyle directly?

* `StyleProp<T>` matches React Native's actual style prop typing.
* It allows arrays, registered styles, and falsy entries for conditional styling.
* `ViewStyle` alone rejects `[styles.a, styles.b]` and `condition && styles.c`.

How do I extend Pressable without listing every prop?

```tsx
type PressableProps = ComponentProps<typeof Pressable>;
interface IconButtonProps extends Omit<PressableProps, "children"> {
  icon: React.ReactNode;
}
```

* `ComponentProps<typeof Pressable>` includes `onPress`, `disabled`, `hitSlop`, and accessibility props.
* `Omit` removes only what your API replaces.

How do I type a Pressable style function callback?

* Use `PressableProps["style"]` - it is `StyleProp<ViewStyle> | ((state) => StyleProp<ViewStyle>)`.
* Do not assign the callback result to `ViewStyle` alone.

When should I use Pick vs Omit?

* `Omit<Big, "a" | "b">` when most props forward and you remove a few.
* `Pick<Big, "a" | "b">` when exposing a small public surface (list row summary).
* Compose: `Pick<Device, "id" | "name">` for cards, full `Device` for detail screens.

Does ComponentProps work with forwardRef components?

* For RN `TextInput` and libraries still using `forwardRef`, `ComponentPropsWithRef<typeof TextInput>` includes `ref`.
* React 19 allows `ref` as a regular prop on function components - `ComponentProps` often suffices.

How do I type onChangeText without copying the signature?

```tsx
type TextInputProps = ComponentProps<typeof TextInput>;
type OnChangeText = TextInputProps["onChangeText"];
```

* Indexed access pulls the exact handler type from the primitive.
* Stays correct if React Native updates the signature.

What is RegisteredStyle?

* The opaque type returned by `StyleSheet.create` keys.
* Assignable to `StyleProp<T>` - callers can pass `styles.card` directly.
* Prefer `StyleSheet.create` so keys are exhaustively checked.

Can I use Partial for theme overrides?

```ts
type Theme = { colors: { primary: string; background: string }; spacing: { md: number } };
type ThemeOverrides = Partial<Theme>;
```

* Yes for nested config merges.
* Do not `Partial` required component props like `title` unless the component truly allows omission.

How do I type layout callbacks?

```tsx
import type { LayoutChangeEvent } from "react-native";
 
function onLayout(e: LayoutChangeEvent) {
  const { x, y, width, height } = e.nativeEvent.layout;
}
```

* Use RN's exported event types - do not invent custom event shapes.

Should I import utility types from react or react-native?

* `StyleProp`, `ViewStyle`, `GestureResponderEvent` - from `react-native`.
* `ComponentProps` is available from both; prefer `react-native` in RN-only files for one import site.

How do I type Image source props?

```tsx
import type { ImageProps, ImageSourcePropType } from "react-native";
 
type AvatarProps = Pick<ImageProps, "source" | "accessibilityLabel"> & {
  size: number;
};
```

* `ImageSourcePropType` covers `require()` and `{ uri }` shapes.
* `Pick<ImageProps, ...>` forwards `resizeMode` and accessibility when needed.

What about Readonly and Required utilities?

* `Readonly<T>` for config objects that must not mutate after creation.
* `Required<Pick<T, "id">>` forces specific keys while leaving others optional via intersection.
* Less common than `Pick`/`Omit` but useful for immutable app settings.

## Related

* [TypeScript in RN Basics](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typescript-in-rn-basics/) - intro `ComponentProps` and `Pick` examples
* [Typing Components & Props](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-components-and-props/) - discriminated unions and generic prop contracts
* [Views, Text & Core Components](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/views-text-and-core-components/) - `StyleProp` on layout primitives
* [Event Handling & Touchables](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/event-handling-and-touchables/) - `Pressable` patterns and hitSlop
* [Typing API Responses & Zod](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-api-responses-and-zod/) - `Pick`/`Omit` on inferred schema types
* [TypeScript in RN Best Practices](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/best-practices/) - team conventions for wrappers

### External Related Links

* [react.dev](https://react.dev/) - core React concepts RN builds on
* [reactnative.dev/docs](https://reactnative.dev/docs/getting-started) - full RN documentation
* [MDN Web Docs](https://developer.mozilla.org/) - JavaScript fundamentals

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4). pbqrthvqrf.vb|ptvb929|202607

Reviewed by Chris St. John·Last updated Jul 19, 2026
