# Core Views and Text

Core host components every React Native screen is built from - layout boxes, text, images, and scroll containers.

Highlights / Core Views and Text

* Basic View Container
* Text Nesting and Nested Styles
* Image from URI
* ScrollView Vertical
* KeyboardAvoidingView

#### Basic View Container

`View` is the primary layout container (like a `div`). Nest views to build structure; style with Flexbox.

```tsx
import { View, Text } from "react-native";
 
export function Card({ title }: { title: string }) {
  return (
    <View style={{ padding: 16 }}>
      <Text>{title}</Text>
    </View>
  );
}
```

#### Text Nesting and Nested Styles

Only `Text` can nest text. Nested `Text` inherits and can override styles for spans of copy.

```tsx
<Text style={{ fontSize: 16 }}>
  Hello, <Text style={{ fontWeight: "700" }}>{name}</Text>
</Text>
```

#### Image from URI

Remote images need explicit width/height (or flex) or they collapse. Prefer `expo-image` for caching in production apps.

```tsx
import { Image } from "react-native";
 
<Image
  source={{ uri: "https://example.com/avatar.png" }}
  style={{ width: 48, height: 48, borderRadius: 24 }}
/>
```

#### Image from Require

Local assets are bundled via `require`. Metro resolves the path at build time.

```tsx
<Image source={require("../../assets/logo.png")} style={{ width: 120, height: 40 }} />
```

#### ScrollView Vertical

Use `ScrollView` for short, fixed trees. Prefer virtualized lists when item count is large or unknown.

```tsx
import { ScrollView, Text } from "react-native";
 
<ScrollView contentContainerStyle={{ padding: 16 }}>
  <Text>{longContent}</Text>
</ScrollView>
```

#### ScrollView Horizontal

Set `horizontal` for carousels and chip rows. Pair with `showsHorizontalScrollIndicator={false}` when the UI is self-explanatory.

```tsx
<ScrollView horizontal showsHorizontalScrollIndicator={false}>
  {chips.map((c) => (
    <Chip key={c.id} label={c.label} />
  ))}
</ScrollView>
```

#### SafeAreaView Edges

`SafeAreaView` from `react-native-safe-area-context` (Expo default) pads notches and home indicators. Prefer it over the legacy RN export for edge control.

```tsx
import { SafeAreaView } from "react-native-safe-area-context";
 
<SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
  {children}
</SafeAreaView>
```

#### ActivityIndicator Loading

Built-in indeterminate spinner for loading states. Size and color are platform-aware.

```tsx
import { ActivityIndicator, View } from "react-native";
 
<View style={{ padding: 24 }}>
  <ActivityIndicator size="large" color="#2563eb" />
</View>
```

#### Modal Presentation

`Modal` covers the window. Control visibility with state; handle Android back via `onRequestClose`.

```tsx
import { Modal, View, Text, Pressable } from "react-native";
 
<Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
  <View style={{ flex: 1, padding: 16 }}>
    <Text>Details</Text>
    <Pressable onPress={() => setOpen(false)}><Text>Close</Text></Pressable>
  </View>
</Modal>
```

#### StatusBar Style

Style the system status bar per screen. With Expo, `expo-status-bar` is the usual import.

```tsx
import { StatusBar } from "expo-status-bar";
 
<StatusBar style="dark" />
```

#### KeyboardAvoidingView

Lift focused inputs above the keyboard. Behavior differs by platform - `padding` on iOS is a common default.

```tsx
import { KeyboardAvoidingView, Platform, TextInput } from "react-native";
 
<KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === "ios" ? "padding" : undefined}
>
  <TextInput placeholder="Message" />
</KeyboardAvoidingView>
```

#### RefreshControl on ScrollView

Pull-to-refresh attaches via `refreshControl` on scrollable containers.

```tsx
import { ScrollView, RefreshControl } from "react-native";
 
<ScrollView
  refreshControl={
    <RefreshControl refreshing={loading} onRefresh={onRefresh} />
  }
>
  {children}
</ScrollView>
```

#### View Style Arrays

Later styles win on conflicts. Arrays are the idiomatic way to compose base + conditional styles.

```tsx
<View style={[styles.card, selected && styles.cardSelected, style]} />
```

#### pointerEvents Control

`pointerEvents` controls whether a view (and descendants) receive touches - useful for loading overlays.

```tsx
<View pointerEvents={blocking ? "none" : "auto"} style={styles.content}>
  {children}
</View>
```

#### testID for E2E

`testID` (and Android `accessibilityLabel` strategies) give Detox, Maestro, and Appium stable selectors.

```tsx
<Pressable testID="login-submit" onPress={onSubmit}>
  <Text>Sign in</Text>
</Pressable>
```

## Related

* [StyleSheet and Flexbox](https://docs.wahwei/reactnative.codeguides.io/code-reference/stylesheet-and-flexbox/) - how those views are laid out
* [Lists and Virtualization](https://docs.wahwei/reactnative.codeguides.io/code-reference/lists-and-virtualization/) - when ScrollView is not enough
* [TextInput and Forms](https://docs.wahwei/reactnative.codeguides.io/code-reference/textinput-and-forms/) - inputs that live inside these containers

### External Related Links

* [reactnative.dev/docs](https://reactnative.dev/docs/getting-started) - full RN documentation
* [reactnative.dev](https://reactnative.dev/) - official React Native site
* [react.dev](https://react.dev/) - core React concepts RN builds on

> **Stack versions:** React 19.2.3 · React Native 0.86.0 · Expo SDK 57

Reviewed by Chris St. John·Last updated Jul 18, 2026
