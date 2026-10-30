# Safe Areas & Notches

`react-native-safe-area-context` and edge-to-edge Android in RN 0.86.

Highlights / Safe Areas & Notches

* Use react-native-safe-area-context - not the deprecated core SafeAreaView
* Wrap the app root in SafeAreaProvider once; read insets via hook or SafeAreaView
* edges prop controls which sides get padding - omit bottom above tab bars
* RN 0.86 enables edge-to-edge Android by default - content draws behind system bars
* useSafeAreaInsets for granular padding; SafeAreaView for whole-screen wrappers
* Double safe-area padding is the most common layout bug - one owner per axis

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
 
export function AppRoot({ children }: { children: React.ReactNode }) {
  return <SafeAreaProvider>{children}</SafeAreaProvider>;
}
 
export function Screen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}
 
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: "700" },
  body: { flex: 1, paddingHorizontal: 16 },
});
```

**When to reach for this:** Any full-screen layout on notched iPhones, Dynamic Island devices, or edge-to-edge Android 15+ where system bars overlap your content.

## Working Example

```tsx
import { ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
 
function ArticleScreen() {
  const insets = useSafeAreaInsets();
 
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
 
      {/* Edge-to-edge hero - manual top inset for readable text under status bar */}
      <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.heroTitle}>Safe Areas</Text>
        <Text style={styles.heroSubtitle}>Edge-to-edge with readable insets</Text>
      </View>
 
      {/* Standard content - SafeAreaView handles sides; bottom inset for home indicator */}
      <SafeAreaView style={styles.content} edges={["left", "right", "bottom"]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.paragraph}>
            On RN 0.86, Android draws behind the status and navigation bars. iOS has
            done this for years. react-native-safe-area-context reports the unobstructed
            rectangle so your UI stays tappable.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
 
export default function App() {
  return (
    <SafeAreaProvider>
      <ArticleScreen />
    </SafeAreaProvider>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0f172a" },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    backgroundColor: "#1e293b",
  },
  heroTitle: { fontSize: 32, fontWeight: "800", color: "#f8fafc" },
  heroSubtitle: { fontSize: 16, color: "#94a3b8", marginTop: 4 },
  content: { flex: 1, backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  scroll: { padding: 20 },
  paragraph: { fontSize: 16, lineHeight: 24, color: "#334155" },
});
```

**What this demonstrates:**

* `SafeAreaProvider` at the app root so inset values propagate to all screens.
* `useSafeAreaInsets()` for a hero that extends edge-to-edge with manual top padding.
* `SafeAreaView` with selective `edges` - hero handles top; content handles bottom and sides.
* `StatusBar` set to `translucent` for edge-to-edge Android drawing behind the status bar.
* Split ownership: immersive header vs inset-aware scrollable body.

## Deep Dive

### How It Works

* **Safe area** is the rectangle of the screen not covered by hardware (notch, Dynamic Island), system UI (status bar), or gesture areas (home indicator, Android nav bar).
* **`react-native-safe-area-context`** reads native inset values and exposes them through React context. It is the recommended library - included in Expo templates and RN community templates.
* **`SafeAreaProvider`** must wrap your app (or each modal root) so hooks and `SafeAreaView` can read current insets. Expo Router's root layout typically includes this.
* **`SafeAreaView`** applies `padding` equal to the inset on each selected edge. It is a convenience wrapper - functionally equivalent to `paddingTop: insets.top`, etc.
* **`useSafeAreaInsets()`** returns `{ top, right, bottom, left }` in density-independent pixels. Use it when you need fine control (floating buttons, custom headers, partial padding).
* **`edges` prop** - an array like `["top", "left", "right"]` that omits bottom when a tab bar or keyboard toolbar already handles that inset.

### Edge-to-Edge Android in RN 0.86

React Native 0.86 (Expo SDK 57) draws app content behind the system status and navigation bars on Android by default - matching modern Android 15+ edge-to-edge guidance.

| Concern | Before edge-to-edge | RN 0.86 edge-to-edge |
| --- | --- | --- |
| Status bar overlap | System reserved a solid bar | Content draws behind; add top inset |
| Navigation bar | Opaque nav bar | Gesture/nav bar overlays content; add bottom inset |
| Background color | Set via `StatusBar` only | Extend background full-bleed; pad content |
| Keyboard | Standard behavior | Still use `KeyboardAvoidingView` - separate from safe area |

```tsx
import { Platform, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
 
function EdgeToEdgeShell({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
 
  return (
    <View
      style={{
        flex: 1,
        paddingTop: Platform.OS === "android" ? insets.top : 0, // SafeAreaView often handles iOS
        paddingBottom: insets.bottom,
      }}
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      {children}
    </View>
  );
}
```

For Gradle-level edge-to-edge configuration and `expo-navigation-bar`, see [Edge-to-Edge on Android](https://docs.wahwei/reactnative.codeguides.io/android-platform/edge-to-edge-on-android/).

### SafeAreaView vs useSafeAreaInsets

| API | Best for | Avoid when |
| --- | --- | --- |
| `SafeAreaView` | Whole-screen wrappers, simple screens | You need different padding per sub-region (use hook) |
| `useSafeAreaInsets()` | Custom headers, FABs, bottom sheets, maps | You would copy the same four paddings everywhere (use `SafeAreaView`) |
| `initialWindowMetrics` | Splash-to-app handoff without inset flash | Normal in-app screens (provider handles updates) |

```tsx
import { useSafeAreaInsets } from "react-native-safe-area-context";
 
function FloatingActionButton({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
 
  return (
    <Pressable
      onPress={onPress}
      style={{
        position: "absolute",
        right: 16,
        bottom: insets.bottom + 16, // clears home indicator / nav bar
      }}
    />
  );
}
```

### edges Patterns for Common Chrome

| Screen type | Recommended `edges` | Why |
| --- | --- | --- |
| Stack screen (no tabs) | `["top", "left", "right", "bottom"]` | Full inset on all sides |
| Tab screen content | `["top", "left", "right"]` | Tab bar handles bottom inset |
| Modal / bottom sheet | `["bottom"]` or `["top", "bottom"]` | Depends on presentation style |
| Immersive hero + body | Hook on hero; `SafeAreaView` on body | Split inset ownership |

### TypeScript Notes

```tsx
import type { EdgeInsets } from "react-native-safe-area-context";
import type { Edge } from "react-native-safe-area-context";
 
const TAB_EDGES: Edge[] = ["top", "left", "right"];
 
function useBottomInset(extra = 0): number {
  const { bottom } = useSafeAreaInsets();
  return bottom + extra;
}
 
// Pass insets to a non-React utility
function contentHeight(windowHeight: number, insets: EdgeInsets): number {
  return windowHeight - insets.top - insets.bottom;
}
```

* `Edge` is `"top" | "right" | "bottom" | "left"`.
* Insets update on rotation, fold, and when the status bar shows/hides - do not cache them in module scope.

## Gotchas

* **Using core `SafeAreaView` from `react-native`** - The built-in component is deprecated and only handles iOS notches reliably. **Fix:** Import from `react-native-safe-area-context`.
* **Missing `SafeAreaProvider`** - `useSafeAreaInsets()` returns zeros; content sits under the status bar. **Fix:** Wrap the app root (Expo template does this; verify after ejecting or custom entry).
* **Double bottom padding above tab bars** - `edges={["bottom"]}` on a tab screen adds padding *and* the tab bar adds its own safe area. **Fix:** Omit `"bottom"` from `edges` when the tab navigator owns that inset.
* **Double top padding in nested `SafeAreaView`s** - Nesting two wrappers both with `edges={["top"]}` doubles the inset. **Fix:** One safe-area owner per axis per screen.
* **Edge-to-edge Android without inset padding** - RN 0.86 draws behind system bars; text and buttons become untappable under the nav bar. **Fix:** Apply `useSafeAreaInsets()` or `SafeAreaView` padding on content, not just the status bar color.
* **Ignoring landscape notch insets** - `left` and `right` insets are non-zero on notched iPhones in landscape. **Fix:** Include `"left"` and `"right"` in `edges`, or use the hook for horizontal padding.
* **Safe area vs keyboard** - Bottom inset does not move when the keyboard opens. **Fix:** Combine safe area with `KeyboardAvoidingView` or `react-native-keyboard-controller` for text inputs.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `react-native-safe-area-context` | Default for all production apps | Never - this is the standard solution |
| `useSafeAreaInsets` hook | Custom headers, FABs, maps, partial padding | A plain full-screen wrapper suffices (`SafeAreaView`) |
| Manual `paddingTop: 44` | Never in production | Always - inset values vary by device and orientation |
| `KeyboardAvoidingView` | Text inputs near the bottom of the screen | Replacing safe area - they solve different problems |
| `expo-status-bar` + `expo-navigation-bar` | Controlling bar style/color on Android edge-to-edge | Measuring insets - still need safe-area-context |

## FAQs

Why not use SafeAreaView from react-native?

The core `SafeAreaView` only accounts for iOS safe areas and is deprecated. `react-native-safe-area-context` works on iOS and Android, supports the `edges` prop, and exposes `useSafeAreaInsets` for granular control.

Where do I put SafeAreaProvider?

Once at the app root - typically in `App.tsx`, Expo Router's root `_layout.tsx`, or your navigation container. Every screen and modal that reads insets must be a descendant of the provider.

What does the edges prop do?

It lists which sides receive automatic inset padding. `edges={["top", "left", "right"]}` skips bottom - common on tab screens where the tab bar already clears the home indicator. Default (omitted) applies all four edges.

How does edge-to-edge Android in RN 0.86 affect my layouts?

Content now draws behind the status and navigation bars. You must add top and bottom inset padding (via `SafeAreaView` or `useSafeAreaInsets`) so text and buttons remain visible and tappable. Background colors can extend full-bleed behind the bars.

SafeAreaView vs useSafeAreaInsets - which should I use?

* `SafeAreaView` - quick whole-screen wrapper.
* `useSafeAreaInsets` - custom layouts (edge-to-edge hero, floating action button, map overlays).

They produce the same inset values; choose based on layout complexity.

Gotcha: Why is there extra space at the bottom of my tab screen?

You likely applied `edges={["bottom"]}` on a screen inside a tab navigator that already accounts for the home indicator. Remove `"bottom"` from `edges` on tab-root screens.

How do I handle safe areas in modals?

Wrap modal content in its own `SafeAreaProvider` only if the modal renders outside the main provider tree (rare). Usually, wrap modal content in `SafeAreaView` with `edges` appropriate to the presentation - bottom sheets need bottom inset; full-screen modals need all edges.

Do insets change on rotation?

Yes. Landscape on notched iPhones moves inset from `top` to `left` or `right`. `useSafeAreaInsets` re-renders with updated values automatically - do not cache insets in `useRef` across orientation changes.

How do I make a full-bleed image under the status bar?

Do not wrap the image in `SafeAreaView`. Instead, extend the image to `top: 0` and add `paddingTop: insets.top` on text overlaying the image so labels remain readable.

Does SafeAreaView work with flexbox?

Yes. `SafeAreaView` is a `View` with padding. Use `style={{ flex: 1 }}` as usual. The padding reduces the inner content area - your flex children layout inside the inset-adjusted box.

How do I set the status bar style for edge-to-edge?

```tsx
import { StatusBar } from "expo-status-bar";
 
<StatusBar style="auto" translucent />
```

Match `barStyle` to your background - light text on dark hero, dark text on white body. See [Edge-to-Edge on Android](https://docs.wahwei/reactnative.codeguides.io/android-platform/edge-to-edge-on-android/) for navigation bar theming.

What is initialWindowMetrics?

`SafeAreaProvider` accepts `initialWindowMetrics` to hydrate correct insets on the first frame - reducing a visible layout jump on cold start. Expo templates often configure this; add it if you see a flash of content under the status bar at launch.

How do safe areas relate to window dimensions?

`useWindowDimensions` returns the full window size. Safe area insets describe how much of that window is obstructed. Usable content height ≈ `height - insets.top - insets.bottom`. See [Dimensions & Responsive Layout](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/dimensions-and-responsive-layout/).

Should I add safe area padding inside ScrollView?

Put inset-aware padding on the `ScrollView`'s `contentContainerStyle` or wrap the scroll area in `SafeAreaView`. For a floating header outside the scroll, apply `insets.top` on the header only.

Does the keyboard affect safe area insets?

No - `useSafeAreaInsets().bottom` stays the same when the keyboard opens. Use `KeyboardAvoidingView` or a keyboard controller library to shift input fields above the keyboard separately.

## Related

* [Flexbox Deep Dive](https://docs.wahwei/reactnative.codeguides.io/styling-layout/flexbox-deep-dive/) - `flex: 1` screen shells inside safe-area wrappers
* [Responsive & Adaptive Layout](https://docs.wahwei/reactnative.codeguides.io/styling-layout/responsive-and-adaptive-layout/) - window size vs inset-adjusted usable area
* [Dark Mode & Color Schemes](https://docs.wahwei/reactnative.codeguides.io/styling-layout/dark-mode-and-color-schemes/) - status bar `barStyle` per color scheme
* [Styling Basics](https://docs.wahwei/reactnative.codeguides.io/styling-layout/styling-basics/) - StyleSheet patterns for screen layouts
* [Edge-to-Edge on Android](https://docs.wahwei/reactnative.codeguides.io/android-platform/edge-to-edge-on-android/) - Gradle, nav bar, and `expo-navigation-bar`
* [Dimensions & Responsive Layout](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/dimensions-and-responsive-layout/) - `useWindowDimensions` alongside insets

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4). WTI5a1pXZDFhV1JsY3k1cGIzeGpaMmx2T0RreGZESXdNall3Tnc9PQ==

Reviewed by Chris St. John·Last updated Jul 19, 2026
