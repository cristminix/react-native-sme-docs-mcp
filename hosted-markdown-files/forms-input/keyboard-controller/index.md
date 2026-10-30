# Keyboard Controller

`react-native-keyboard-controller` replaces the guesswork in `KeyboardAvoidingView` with keyboard height synced to the native animation. On form screens, that means the active `TextInput` stays visible, the scroll feels like a system sheet, and Android behaves the same as iOS - without per-platform `behavior` props.

Highlights / Keyboard Controller

* KeyboardProvider at the app root enables consistent keyboard events on iOS and Android
* KeyboardAwareScrollView scrolls the focused TextInput above the keyboard with native timing
* bottomOffset accounts for fixed footers, toolbars, and safe-area padding
* KeyboardToolbar adds Previous / Next / Done without custom focus bookkeeping
* Prefer keyboard-controller over KeyboardAvoidingView for multi-field forms
* Pair with react-hook-form setFocus for return-key and toolbar navigation

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
// app/_layout.tsx - provider once at the root
import { Stack } from "expo-router";
import { KeyboardProvider } from "react-native-keyboard-controller";
 
export default function RootLayout() {
  return (
    <KeyboardProvider>
      <Stack />
    </KeyboardProvider>
  );
}
```

```tsx
// app/contact.tsx - scroll + toolbar for a short form
import { StyleSheet, TextInput, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardToolbar } from "react-native-keyboard-controller";
 
export default function ContactScreen() {
  return (
    <>
      <KeyboardAwareScrollView
        bottomOffset={48}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput placeholder="Name" style={styles.input} />
        <TextInput placeholder="Email" keyboardType="email-address" style={styles.input} />
        <TextInput placeholder="Message" multiline style={styles.multiline} />
      </KeyboardAwareScrollView>
      <KeyboardToolbar />
    </>
  );
}
 
const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  multiline: { minHeight: 120, textAlignVertical: "top" },
});
```

**When to reach for this:**

* Any screen with more than two text fields stacked vertically.
* Forms with a fixed footer button or tab bar that the keyboard would otherwise cover.
* Chat-style inputs where content must rise in sync with keyboard animation.
* Android builds where `KeyboardAvoidingView` padding feels jumpy or inconsistent.
* Flows that need Previous / Next / Done traversal across inputs.

## Working Example

```tsx
// app/(auth)/sign-up.tsx - keyboard-aware form wired to react-hook-form
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardToolbar,
} from "react-native-keyboard-controller";
import { z } from "zod";
import { TextField } from "../../components/form/TextField";
 
const SignUpSchema = z
  .object({
    fullName: z.string().trim().min(1, "Name is required"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "At least 8 characters"),
  });
 
type SignUpValues = z.infer<typeof SignUpSchema>;
 
export default function SignUpScreen() {
  const {
    control,
    handleSubmit,
    setFocus,
    formState: { isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: { fullName: "", email: "", password: "" },
    mode: "onTouched",
  });
 
  async function onSubmit(values: SignUpValues) {
    await fetch("https://api.example.com/v1/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
  }
 
  return (
    <>
      <KeyboardAwareScrollView
        bottomOffset={72}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Create account</Text>
 
        <TextField
          control={control}
          name="fullName"
          label="Full name"
          autoComplete="name"
          returnKeyType="next"
          onSubmitEditing={() => setFocus("email")}
        />
 
        <TextField
          control={control}
          name="email"
          label="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          returnKeyType="next"
          onSubmitEditing={() => setFocus("password")}
        />
 
        <TextField
          control={control}
          name="password"
          label="Password"
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleSubmit(onSubmit)}
        />
 
        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{isSubmitting ? "Creating…" : "Sign up"}</Text>
        </Pressable>
      </KeyboardAwareScrollView>
 
      <KeyboardToolbar />
    </>
  );
}
 
const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 16, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: "700" },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});
```

```tsx
// app/chat.tsx - frame-synced lift for a composer above FlatList
import { FlatList, StyleSheet, TextInput, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useKeyboardHandler } from "react-native-keyboard-controller";
import { MessageBubble } from "../../components/MessageBubble";
 
const messages = [{ id: "1", text: "Hello" }];
 
function useKeyboardSpacer() {
  const height = useSharedValue(0);
 
  useKeyboardHandler(
    {
      onMove: (event) => {
        "worklet";
        height.value = Math.max(event.height, 0);
      },
    },
    []
  );
 
  return height;
}
 
export default function ChatScreen() {
  const keyboardHeight = useKeyboardSpacer();
 
  const spacerStyle = useAnimatedStyle(() => ({
    height: keyboardHeight.value,
  }));
 
  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={styles.list}
        keyboardDismissMode="interactive"
      />
      <TextInput placeholder="Message" style={styles.composer} />
      <Animated.View style={spacerStyle} />
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, gap: 8 },
  composer: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
```

**What this demonstrates:**

* `KeyboardProvider` in the root layout unlocks all keyboard-controller hooks and components.
* `KeyboardAwareScrollView` auto-scrolls to the focused field with `bottomOffset` clearing the toolbar.
* `KeyboardToolbar` ships Previous / Next / Done without manual ref arrays.
* `keyboardShouldPersistTaps="handled"` lets submit `Pressable`s work while the keyboard is open.
* `useKeyboardHandler` + Reanimated lifts chat content frame-by-frame for composer UIs.
* `setFocus` from react-hook-form aligns Return-key navigation with toolbar behavior.

## Deep Dive

### How It Works

* The native module reports keyboard height and animation progress on every frame.
* `KeyboardAwareScrollView` measures the focused input and adjusts scroll offset to keep it visible.
* `KeyboardProvider` supplies context so hooks and toolbars share the same keyboard state.
* Unlike `KeyboardAvoidingView`, the scroll view approach handles **many** inputs without shrinking the whole screen.
* Reanimated worklets in `useKeyboardHandler` read keyboard height off the JS thread for smooth chat lifts.

### Setup Checklist

| Step | Action |
| --- | --- |
| 1 | `npx expo install react-native-keyboard-controller` |
| 2 | Ensure `react-native-reanimated` is installed (Expo SDK 57 template includes it) |
| 3 | Wrap the app in `<KeyboardProvider>` at the root layout |
| 4 | Replace `KeyboardAvoidingView` + `ScrollView` with `KeyboardAwareScrollView` on form screens |
| 5 | Tune `bottomOffset` for toolbars, sticky CTAs, and safe-area padding |

```bash
npx expo install react-native-keyboard-controller react-native-reanimated
```

### Components at a Glance

| Component / Hook | Role |
| --- | --- |
| `KeyboardProvider` | Required root wrapper - enables keyboard events |
| `KeyboardAwareScrollView` | Scrolls focused `TextInput` into view |
| `KeyboardToolbar` | Previous / Next / Done bar above the keyboard |
| `KeyboardStickyView` | Pins a footer (e.g. submit bar) to the keyboard top edge |
| `useKeyboardHandler` | Frame-synced keyboard height for custom animations |
| `Keyboard.dismiss()` | Same RN API - still works alongside the library |

### bottomOffset and Safe Area

```tsx
import { useSafeAreaInsets } from "react-native-safe-area-context";
 
const insets = useSafeAreaInsets();
const TOOLBAR_HEIGHT = 44;
 
<KeyboardAwareScrollView
  bottomOffset={insets.bottom + TOOLBAR_HEIGHT}
  ...
/>
```

* `bottomOffset` is extra space **below** the focused input when scrolled into view.
* Include fixed footer height, `KeyboardToolbar` height, and bottom safe inset.
* Safe area alone does not move when the keyboard opens - keyboard and inset are separate concerns (see [Safe Areas & Notches](https://docs.wahwei/reactnative.codeguides.io/styling-layout/safe-areas-and-notches/)).

### Android Tab Bar and `softwareKeyboardLayoutMode`

When bottom tabs jump above the keyboard on Android, add to `app.config.ts`:

```ts
export default {
  expo: {
    android: {
      softwareKeyboardLayoutMode: "pan",
    },
  },
};
```

* `pan` resizes the window instead of pushing tab chrome unpredictably.
* Alternatively set `tabBarHideOnKeyboard: true` on Expo Router `Tabs` to hide tabs while typing.

### TypeScript Notes

```tsx
import type { KeyboardAwareScrollViewProps } from "react-native-keyboard-controller";
 
type FormScrollProps = Pick<
  KeyboardAwareScrollViewProps,
  "bottomOffset" | "keyboardShouldPersistTaps"
>;
 
const formScrollDefaults: FormScrollProps = {
  bottomOffset: 48,
  keyboardShouldPersistTaps: "handled",
};
```

* The library exports props types for scroll views and toolbar customization.
* Wrap shared form screens with a `FormScreen` component that applies consistent `bottomOffset` and toolbar slots.

## Gotchas

* **Missing `KeyboardProvider`** - `KeyboardAwareScrollView` falls back to inconsistent behavior or zero keyboard height. **Fix:** Wrap the root layout, not individual screens.
* **`bottomOffset` left at 0 with a toolbar** - The focused field hides under `KeyboardToolbar`. **Fix:** Set `bottomOffset` to toolbar height + safe area (often 44–62 px before inset).
* **`keyboardShouldPersistTaps` omitted** - Taps on submit buttons dismiss the keyboard without firing `onPress`. **Fix:** `keyboardShouldPersistTaps="handled"` on the scroll view.
* **Nesting `KeyboardAvoidingView` inside `KeyboardAwareScrollView`** - Double adjustment overshoots and causes bounce. **Fix:** Pick one strategy - keyboard-controller OR avoiding view, not both.
* **FlatList inside KeyboardAwareScrollView** - Virtualized lists inside scroll views break measurement and performance. **Fix:** Put inputs in `ListHeaderComponent` / `ListFooterComponent`, or use `useKeyboardHandler` for chat layouts.
* **Android tab bar resize** - Bottom tabs slide up with the keyboard and squash the form. **Fix:** `softwareKeyboardLayoutMode: "pan"` or `tabBarHideOnKeyboard: true`.
* **Reanimated not configured** - `useKeyboardHandler` worklets fail silently or throw on Android. **Fix:** Verify `react-native-reanimated` babel plugin per [Expo Reanimated docs](https://docs.expo.dev/versions/latest/sdk/reanimated/).

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `react-native-keyboard-controller` | Multi-field forms, chat composers, cross-platform parity | A single full-screen search input with no overlap risk |
| `KeyboardAvoidingView` | Quick prototype, one or two inputs | Long forms - platform-specific `behavior` tuning exhausts quickly |
| `KeyboardAvoidingView` + `ScrollView` | Medium forms without adding a dependency | You need toolbar navigation or frame-synced animation |
| `android:windowSoftInputMode` only | Legacy native Android tuning | iOS parity - still need an iOS strategy |
| Nothing (let keyboard cover) | Full-screen modal search a la spotlight | Data entry where users cannot see what they type |

## FAQs

How do I install react-native-keyboard-controller in Expo SDK 57?

```bash
npx expo install react-native-keyboard-controller
```

* Also ensure `react-native-reanimated` is present - the Expo template ships it by default.
* Wrap your root layout with `KeyboardProvider` after install.

Where does KeyboardProvider go?

```tsx
// app/_layout.tsx
<KeyboardProvider>
  <Stack />
</KeyboardProvider>
```

* Place it above navigators so every screen can use keyboard hooks.
* One provider per app - do not nest providers per screen.

What should bottomOffset be set to?

* Start with `48`–`62` when using `KeyboardToolbar`.
* Add `useSafeAreaInsets().bottom` on devices with home indicators.
* If a sticky submit bar sits above the keyboard, include its height too.
* Tune on a real device - simulators are close but not exact.

KeyboardAwareScrollView vs KeyboardAvoidingView?

* **KeyboardAwareScrollView** scrolls to the focused input - best for forms with many fields.
* **KeyboardAvoidingView** shrinks or pads the whole container - OK for one or two inputs.
* Keyboard Controller tracks native keyboard animation timing on both platforms.

Why are my submit buttons not firing while the keyboard is open?

* Default scroll views swallow taps to dismiss the keyboard.
* Set `keyboardShouldPersistTaps="handled"` on `KeyboardAwareScrollView`.
* Use `Pressable` - not `TouchableWithoutFeedback` wrapping the whole screen.

How do I add Previous and Next buttons above the keyboard?

```tsx
<>
  <KeyboardAwareScrollView ... />
  <KeyboardToolbar />
</>
```

* `KeyboardToolbar` discovers registered text inputs and wires navigation automatically.
* Works alongside `returnKeyType="next"` and react-hook-form `setFocus`.

Can I use keyboard-controller with react-hook-form?

* Yes - wrap RHF fields in `KeyboardAwareScrollView`.
* Use `setFocus("fieldName")` in `onSubmitEditing` to chain Return-key navigation.
* See [react-hook-form on Mobile](https://docs.wahwei/reactnative.codeguides.io/forms-input/react-hook-form-on-mobile/) for the field wiring pattern.

How do I handle chat-style keyboard lift?

* Use `useKeyboardHandler` with Reanimated `useSharedValue` for per-frame height.
* Add an `Animated.View` spacer below the composer that matches keyboard height.
* Keep the message list in `FlatList` - do not wrap it in `KeyboardAwareScrollView`.

Does safe area padding replace keyboard handling?

* No - safe area insets are static per device orientation; keyboard height is dynamic.
* Apply both: safe area for notches, keyboard-controller for text input visibility.

My Android bottom tabs move when the keyboard opens - what do I do?

```ts
// app.config.ts
android: { softwareKeyboardLayoutMode: "pan" }
```

* Or hide tabs while typing: `tabBarHideOnKeyboard: true` on `Tabs` `screenOptions`.
* Restart the dev server after changing `app.config.ts`.

Do I need a development build?

* Expo documents keyboard-controller as installable via `npx expo install` on SDK 57.
* Production apps should use development builds for native modules you ship to stores.
* Run `npx expo prebuild` and EAS Build when moving beyond quick Expo Go spikes.

Can I dismiss the keyboard programmatically?

```ts
import { Keyboard } from "react-native";
 
Keyboard.dismiss();
```

* Works alongside keyboard-controller - no API conflict.
* Call after successful form submit or when closing a modal sheet.

How do I pin a footer button to the top of the keyboard?

* Use `KeyboardStickyView` from the library for footers that track keyboard height.
* Alternatively place the CTA inside the scroll content and rely on `bottomOffset`.
* Sticky views suit single primary actions; scroll content suits long forms with inline submit.

## Related

* [Forms Basics](https://docs.wahwei/reactnative.codeguides.io/forms-input/forms-basics/) - `TextInput` focus, `returnKeyType`, and keyboard types
* [react-hook-form on Mobile](https://docs.wahwei/reactnative.codeguides.io/forms-input/react-hook-form-on-mobile/) - `setFocus` chains that match toolbar navigation
* [Validation with Zod](https://docs.wahwei/reactnative.codeguides.io/forms-input/validation-with-zod/) - inline errors on fields scrolled into view
* [Safe Areas & Notches](https://docs.wahwei/reactnative.codeguides.io/styling-layout/safe-areas-and-notches/) - combine insets with keyboard offset, not instead of it
* [Accessibility in Forms](https://docs.wahwei/reactnative.codeguides.io/forms-input/accessibility-in-forms/) - focus order when keyboard toolbar moves between fields
* [Forms Best Practices](https://docs.wahwei/reactnative.codeguides.io/forms-input/best-practices/) - reduce taps and prevent layout jump on submit

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
