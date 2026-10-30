# Edge-to-Edge on Android

React Native 0.86 (Expo SDK 57) enables **edge-to-edge** Android by default - your app draws behind the status and navigation bars, matching Android 15 guidance. This cookbook covers the RN defaults, `expo-status-bar`, `expo-navigation-bar`, and the inset patterns that keep buttons tappable.

Highlights / Edge-to-Edge on Android

* RN 0.86 draws content behind status and navigation bars by default on Android
* Safe area insets - not opaque system bars - keep tappable UI out of the overlap zone
* expo-status-bar controls icon style; expo-navigation-bar controls Android nav bar color and visibility
* Test on API 35 emulators - classic opaque-bar assumptions break on modern devices
* Tab bars and FABs need bottom inset padding; full-bleed heroes can ignore top inset intentionally

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install expo-status-bar expo-navigation-bar react-native-safe-area-context
```

```tsx
// app/_layout.tsx - root shell for edge-to-edge Android
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
 
export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    NavigationBar.setBackgroundColorAsync("#ffffff00"); // transparent
    NavigationBar.setButtonStyleAsync("dark");
  }, []);
 
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" translucent />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
```

```tsx
// Screen with tab bar - omit bottom safe edge; pad FAB manually
import { Platform, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
 
export function OrdersScreen() {
  const insets = useSafeAreaInsets();
 
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <View style={{ flex: 1 }}>{/* content */}</View>
      {/* FAB clears gesture nav bar */}
      <View style={{ position: "absolute", right: 16, bottom: insets.bottom + 16 }} />
    </SafeAreaView>
  );
}
```

**When to reach for this:**

* Bottom buttons sit under the Android gesture navigation pill.
* Status bar icons are invisible on a dark hero image (or vice versa).
* QA reports layout differences between API 33 and API 35 emulators.
* You want immersive full-bleed headers without giving up safe tap targets.

## Working Example

**Step 1 - Install modules and wrap the app**

```tsx
// app/_layout.tsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
 
export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void NavigationBar.setPositionAsync("absolute");
    void NavigationBar.setBackgroundColorAsync("#00000000");
    void NavigationBar.setButtonStyleAsync("light");
  }, []);
 
  return (
    <SafeAreaProvider>
      <StatusBar style="light" translucent />
      <Stack />
    </SafeAreaProvider>
  );
}
```

**Step 2 - Split hero (full bleed) and body (inset)**

```tsx
import { ImageBackground, Text, View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
 
export function ProductScreen() {
  const insets = useSafeAreaInsets();
 
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ImageBackground source={{ uri: "https://pics.example/hero.jpg" }} style={styles.hero}>
        <Text style={[styles.heroTitle, { marginTop: insets.top + 8 }]}>Trail Runner Pro</Text>
      </ImageBackground>
      <View style={[styles.body, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.price}>$129.00</Text>
      </View>
    </View>
  );
}
 
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  hero: { height: 280, justifyContent: "flex-end", padding: 16 },
  heroTitle: { color: "#fff", fontSize: 28, fontWeight: "700" },
  body: { flex: 1, padding: 16 },
  price: { fontSize: 22, fontWeight: "600" },
});
```

**Step 3 - Theme nav bar per screen (optional)**

```tsx
import { useFocusEffect } from "expo-router";
import * as NavigationBar from "expo-navigation-bar";
import { useCallback } from "react";
import { Platform } from "react-native";
 
export function useAndroidNavBar(style: "light" | "dark", background = "#00000000") {
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return;
      void NavigationBar.setBackgroundColorAsync(background);
      void NavigationBar.setButtonStyleAsync(style);
    }, [style, background]),
  );
}
```

**Step 4 - Verify on API 35 emulator**

```bash
npx expo run:android
# Device Manager → Pixel 8 API 35 → gesture navigation enabled
```

**What this demonstrates:**

* **`SafeAreaProvider`** at root - required for inset hooks on edge-to-edge Android.
* **`StatusBar translucent`** - content draws behind; you pad with insets.
* **`expo-navigation-bar`** - transparent nav bar with light/dark button style.
* **Split inset ownership** - hero bleeds; body and FAB respect `insets.bottom`.

## Deep Dive

### How It Works

* **RN 0.86** opts into edge-to-edge at the native activity/window level - the window extends under system bars.
* **Insets** from `react-native-safe-area-context` report how much of the screen is obscured by status bar, display cutout, and navigation bar (gesture or 3-button).
* **`expo-status-bar`** sets icon/text color (`light` | `dark` | `auto`) - it does not replace inset padding.
* **`expo-navigation-bar`** controls Android navigation bar background, button style, visibility, and position (`relative` vs `absolute`).
* **Keyboard** avoidance is separate - `KeyboardAvoidingView` / `react-native-keyboard-controller` still apply; bottom inset and keyboard may stack.

### Before vs After RN 0.86

| Concern | Pre–edge-to-edge | RN 0.86 edge-to-edge |
| --- | --- | --- |
| Status bar | Opaque system-reserved band | Content behind; top inset required |
| Nav bar | Opaque bar | Gesture pill overlays content; bottom inset |
| Background | Solid behind bars | Full-bleed possible |
| Tab navigator | Often "just worked" | May need `edges` without bottom |

### expo-navigation-bar API

| Method | Purpose |
| --- | --- |
| `setBackgroundColorAsync(color)` | Nav bar color - use `#RRGGBBAA` for transparency |
| `setButtonStyleAsync("light" | "dark")` | Contrast for 3-button/gesture icons |
| `setPositionAsync("absolute" | "relative")` | `absolute` overlays content (edge-to-edge) |
| `setVisibilityAsync("visible" | "hidden")` | Immersive readers - restore on blur |
| `getBackgroundColorAsync()` | Debug current color in dev menu scripts |

### Gradle / Window Flags (When Plugins Are Needed)

Most Expo SDK 57 templates enable edge-to-edge via prebuild. If you maintain a bare `android/` fork:

```ts
// app.config.ts - prefer config over hand-editing MainActivity
export default {
  expo: {
    android: {
      // RN 0.86 template sets edge-to-edge; confirm after prebuild
    },
    plugins: [
      [
        "expo-build-properties",
        {
          android: {
            // compileSdk / targetSdk 35 for latest bar behavior
            compileSdkVersion: 35,
            targetSdkVersion: 35,
          },
        },
      ],
    ],
  },
};
```

Inspect `android/app/src/main/res/values/styles.xml` after prebuild - `windowLayoutInDisplayCutoutMode` and transparent status/nav bar colors should be present in the RN 0.86 template.

### Screen Chrome Patterns

| UI element | Inset strategy |
| --- | --- |
| Stack header (custom) | `paddingTop: insets.top` |
| Tab screen content | `edges={["top","left","right"]}` - tab bar owns bottom |
| Modal / bottom sheet | `edges={["bottom"]}` or full inset |
| Map / camera fullscreen | Hide nav bar temporarily; restore on exit |
| `FlatList` footer CTA | `contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}` |

## Gotchas

* **Padding `SafeAreaView` and manual `insets.top` together** - doubles top gap. **Fix:** One owner per axis.
* **White status icons on white header** - `StatusBar style="light"` on light background. **Fix:** Match `style` to background luminance per screen.
* **Tab bar overlaps home indicator** - React Navigation tabs may need `safeAreaInsets` tuning. **Fix:** Pass `tabBarStyle: { height: 56 + insets.bottom }` or use library defaults on SDK 57.
* **Testing only on 3-button nav** - Gesture nav changes bottom inset height. **Fix:** Toggle **Settings → System navigation** on emulator.
* **Opaque nav bar color fighting transparency** - Some OEM skins ignore alpha. **Fix:** `setPositionAsync("absolute")` + reapply on focus.
* **Assuming `expo-status-bar` adds padding** - It only styles icons. **Fix:** Always pair with `react-native-safe-area-context`.

Y29kZWd1aWRlcy5pb3xjZ2lvOTQ4fDIwMjYwNw

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `SafeAreaView` only | Simple screens | FABs, split hero/body layouts |
| `useSafeAreaInsets()` everywhere | Fine-grained control | Repetitive four-edge padding |
| Immersive `setVisibilityAsync("hidden")` | Video, camera, games | Forms - users lose system back affordance |
| `android:fitsSystemWindows` in native XML | Legacy brownfield XML layouts | Greenfield Expo CNG - use JS insets |

## FAQs

Is edge-to-edge mandatory on RN 0.86?

* It is the **default** in the RN 0.86 Android template. Disabling it requires native theme changes and fights platform direction.
* Prefer learning inset patterns over opting out.

Do I need expo-navigation-bar if I only use SafeAreaView?

* **SafeAreaView** handles layout padding; **expo-navigation-bar** handles nav bar color and button contrast.
* Transparent nav bars usually need both.

Why does my content jump when the keyboard opens?

* Keyboard and safe area are independent. Combine `KeyboardAvoidingView` with bottom inset on the same screen carefully - avoid double bottom padding.

Does edge-to-edge affect iOS?

* iOS has always used safe areas for notches. Android now behaves similarly - cross-platform `SafeAreaProvider` helps both.

How do I test status bar icon contrast?

* Toggle light/dark hero backgrounds in Storybook or a dev menu screen.
* Run on physical Samsung/Pixel - OEM tinting differs from AVD.

Can Expo Router tabs handle insets automatically?

* Recent `@react-navigation/bottom-tabs` versions respect safe areas, but custom tab bars need manual `insets.bottom`.

What about Android 15 forced edge-to-edge?

* Targeting API 35 aligns with platform expectations. RN 0.86 template is ahead of the policy curve - still test on API 35.

How do I debug inset values?

* Log `useSafeAreaInsets()` in dev builds.
* Compare emulator vs device - gesture nav insets differ (~24–48dp).

Does navigation bar theming affect gesture pill only?

* `setButtonStyleAsync` affects 3-button and gesture modes; background color affects the bar area behind the pill.

Where is the layout deep dive for safe areas?

* See [Safe Areas & Notches](https://docs.wahwei/reactnative.codeguides.io/styling-layout/safe-areas-and-notches/) for `edges` patterns and iOS parity.

## Related

* [Safe Areas & Notches](https://docs.wahwei/reactnative.codeguides.io/styling-layout/safe-areas-and-notches/) - `edges` prop and inset hooks
* [Android Basics for RN Devs](https://docs.wahwei/reactnative.codeguides.io/android-platform/android-basics-for-rn-devs/) - emulator API levels and Gradle
* [Permissions & Play Policy](https://docs.wahwei/reactnative.codeguides.io/android-platform/permissions-and-play-policy/) - unrelated to bars but often tested on same API 35 matrix
* [../deep-linking/android-app-links/android-app-links.md](https://docs.wahwei/reactnative.codeguides.io/deep-linking/android-app-links/) - deep links open full-screen activities - mind inset on landing screens

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 19, 2026
