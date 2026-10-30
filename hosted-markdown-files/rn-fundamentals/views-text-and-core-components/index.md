# Views, Text & Core Components

Layout primitives, text nesting rules, and platform-specific rendering quirks.

Highlights / Views, Text & Core Components

* Every screen is a tree of native views - View is the universal layout box
* Raw strings must live inside Text; nesting Text inherits styles on both platforms
* Flexbox defaults to column direction, unlike web CSS
* SafeAreaView and edges prop handle notches without manual padding math
* Platform.select keeps one file when differences are small; split files when logic diverges
* StyleSheet.create validates keys once and improves debuggability in Hermes

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import { StyleSheet, Text, View, ScrollView, SafeAreaView } from "react-native";
 
export function ProfileCard({ name, bio }: { name: string; bio: string }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.body}>
            {bio}
            {"\n"}
            <Text style={styles.link}>Read more</Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
 
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f5f5" },
  scroll: { padding: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  title: { fontSize: 20, fontWeight: "600" },
  body: { fontSize: 16, lineHeight: 24, color: "#333" },
  link: { color: "#2563eb", fontWeight: "500" },
});
```

**When to reach for this:** You are building any screen layout - cards, lists, headers - and need the foundational `View`/`Text` primitives with safe scrolling and notch-aware insets.

## Working Example

```tsx
import { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
 
type Tab = "posts" | "about";
 
interface Post {
  id: string;
  title: string;
  excerpt: string;
}
 
const POSTS: Post[] = [
  { id: "1", title: "Hermes on device", excerpt: "Startup wins from a compact bytecode runtime." },
  { id: "2", title: "Fabric layout", excerpt: "Shadow nodes commit straight to the native tree." },
];
 
export default function FeedScreen() {
  const [tab, setTab] = useState<Tab>("posts");
 
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.heading}>RN Fundamentals</Text>
        <View style={styles.tabs}>
          {(["posts", "about"] as const).map((key) => (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              style={[styles.tab, tab === key && styles.tabActive]}
            >
              <Text style={[styles.tabLabel, tab === key && styles.tabLabelActive]}>
                {key === "posts" ? "Posts" : "About"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
 
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {tab === "posts" ? (
          POSTS.map((post) => (
            <View key={post.id} style={styles.card}>
              <Text style={styles.cardTitle}>{post.title}</Text>
              <Text style={styles.cardBody} numberOfLines={2}>
                {post.excerpt}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.cardBody}>
            Built with Expo SDK 57, React Native 0.86, and React 19.2.3.
          </Text>
        )}
      </ScrollView>
 
      <View
        style={[
          styles.footer,
          Platform.select({ ios: styles.footerIos, android: styles.footerAndroid }),
        ]}
      >
        <Text style={styles.footerText}>© 2026 Mobile Cookbook</Text>
      </View>
    </SafeAreaView>
  );
}
 
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  header: { paddingHorizontal: 16, paddingBottom: 8, gap: 12 },
  heading: { fontSize: 28, fontWeight: "700", color: "#0f172a" },
  tabs: { flexDirection: "row", gap: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
  },
  tabActive: { backgroundColor: "#2563eb" },
  tabLabel: { fontSize: 14, fontWeight: "600", color: "#334155" },
  tabLabelActive: { color: "#fff" },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  cardTitle: { fontSize: 17, fontWeight: "600", color: "#0f172a" },
  cardBody: { fontSize: 15, lineHeight: 22, color: "#475569" },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#cbd5e1",
  },
  footerIos: { paddingBottom: 4 },
  footerAndroid: { paddingBottom: 8 },
  footerText: { fontSize: 12, color: "#64748b", textAlign: "center" },
});
```

**What this demonstrates:**

* `View` as the layout container with flexbox (`gap`, `flexDirection`) and platform-specific shadow/elevation
* `Text` nesting for inline styled spans inside a paragraph
* `ScrollView` with `contentContainerStyle` for scrollable content padding
* `SafeAreaView` from `react-native-safe-area-context` with explicit `edges`
* `Platform.select` for small iOS/Android style differences in one file
* `numberOfLines` for text truncation on native text nodes

## Deep Dive

### How It Works

* React Native maps JSX to **native views** - `View` becomes `UIView` on iOS and `android.view.ViewGroup` on Android.
* Layout runs through **Yoga** (flexbox). The default `flexDirection` is `column`, opposite of typical web defaults.
* `Text` maps to `UILabel` / `TextView`. Strings are rendered by the native text engine, not as HTML.
* Styles are applied as a flattened style object and sent across the JS/native boundary on each update.
* With the **New Architecture** (Fabric), shadow nodes commit layout and props directly to the native renderer.
* `StyleSheet.create` registers styles once; at dev time it validates property names against the RN style schema.

### Core Components at a Glance

| Component | Role | Typical use |
| --- | --- | --- |
| `View` | Layout box | Rows, cards, wrappers, touch targets |
| `Text` | Text rendering | Labels, paragraphs, inline spans |
| `ScrollView` | Bounded scroll | Short forms, settings, detail pages |
| `FlatList` | Virtualized scroll | Long lists (see performance section) |
| `Image` | Bitmaps & icons | Avatars, hero images (`require` or URI) |
| `TextInput` | Editable text | Forms, search bars |
| `Pressable` | Touch feedback | Buttons, list rows (see event-handling article) |
| `SafeAreaView` | Inset-aware shell | Screens under notches and home indicators |

### Text Nesting Rules

| Rule | iOS | Android |
| --- | --- | --- |
| Raw strings must be inside `<Text>` | Enforced (redbox) | Enforced (redbox) |
| Nested `<Text>` inherits parent styles | Yes | Yes |
| `numberOfLines` truncates with ellipsis | Yes | Yes |
| `onPress` on nested `Text` | Supported | Supported |
| Block-level HTML semantics | N/A - no `<p>`, `<div>` | N/A |

```tsx
// Valid - inline link inside body copy
<Text style={styles.body}>
  Tap here to {" "}
  <Text style={styles.link} onPress={openDocs}>
    open the docs
  </Text>
  .
</Text>
 
// Invalid - string directly under View
<View>
  Hello {/* redbox: Text strings must be rendered within a <Text> component */}
</View>
```

### Layout Defaults vs Web CSS

```tsx
// RN flex defaults (differs from browser)
// flexDirection: 'column'
// alignItems: 'stretch'
// flexShrink: 0 on children (web often shrinks)
// position: 'relative' only - 'fixed'/'sticky' need libraries
 
<View style={{ flex: 1 }}>        {/* fills parent along main axis */}
  <View style={{ flex: 1 }} />    {/* splits remaining space with siblings */}
</View>
```

### TypeScript Notes

```tsx
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
 
interface CardProps {
  title: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
}
 
// StyleProp<T> accepts a single style, array, or falsy entries
const merged: StyleProp<ViewStyle> = [styles.card, isActive && styles.cardActive, style];
```

* Import `React` types from `react`; component prop types live next to the component.
* Use `StyleProp<ViewStyle>` / `StyleProp<TextStyle>` for optional style overrides.
* Prefer `const styles = StyleSheet.create({...})` so keys are exhaustively checked.
* For cross-platform safe areas in Expo, install `react-native-safe-area-context` and type `edges` as `Edge[]`.

## Gotchas

* **Strings outside `Text`** - Placing `"Hello"` directly inside `View` throws a development redbox. **Fix:** Wrap all user-visible strings in `<Text>`.
* **Assuming row layout** - Copying web flex snippets with implicit row direction stacks children vertically. **Fix:** Set `flexDirection: "row"` explicitly when you want horizontal layout.
* **Padding on `ScrollView` vs content** - Putting `padding` on `ScrollView` itself clips scroll indicators oddly on iOS. **Fix:** Use `contentContainerStyle` for inner padding.
* **Shadow on Android** - `shadowColor` / `shadowOffset` iOS props are ignored on Android. **Fix:** Pair iOS shadow props with `elevation` via `Platform.select`.
* **Safe area double-padding** - Nesting `SafeAreaView` inside another safe wrapper adds excessive top inset. **Fix:** Apply safe area once at the screen root; use `edges` to control which sides get inset.
* **`numberOfLines` without width constraint** - Truncation may not appear if the text node expands freely. **Fix:** Constrain width with `flex: 1`, `width`, or parent `flexShrink`.
* **Deep `View` trees for text styling** - Wrapping each word in `View` breaks inline flow and hurts accessibility. **Fix:** Nest `Text` inside `Text` for inline spans.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `View` + `Text` primitives | Full control, learning fundamentals, custom design systems | You need a complete component kit out of the box |
| `@rneui/themed` / React Native Paper | Consistent Material or themed components ship faster | Bundle size or style override fighting matters |
| `expo-router` `Stack` layouts | Navigation chrome, headers, and screen shells | You only need a static card layout |
| `FlatList` instead of `ScrollView` | 50+ homogeneous rows, virtualization required | Small, mixed content screens (forms, dashboards) |
| CSS via `react-native-unistyles` / Tamagui | Token-based theming across platforms | A single screen with a handful of `StyleSheet` rules |

## FAQs

Why must text strings be wrapped in a Text component?

* React Native has no DOM text nodes - strings map to native `UILabel` / `TextView` instances.
* `View` is a layout container only; it cannot render glyphs.
* The redbox enforces this at development time so you catch layout mistakes early.

What is the default flex direction in React Native?

* `column` - children stack vertically top-to-bottom.
* This differs from most web layouts where row is common for nav bars.
* Set `flexDirection: "row"` explicitly for horizontal toolbars and chip rows.

How do I nest styled inline text inside a paragraph?

```tsx
<Text style={styles.body}>
  Already have an account?{" "}
  <Text style={styles.link} onPress={goToLogin}>
    Sign in
  </Text>
</Text>
```

* Nested `Text` inherits parent font size and color unless overridden.
* Works on both iOS and Android without extra wrappers.

Should I use ScrollView or FlatList?

* `ScrollView` renders **all** children at once - fine for short content.
* `FlatList` virtualizes rows - required for long feeds to avoid memory and layout cost.
* For mixed content under ~20 items, `ScrollView` is simpler and predictable.

Gotcha: Why does my iOS shadow not appear on Android?

* iOS uses `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`.
* Android uses `elevation` on the view background.
* Apply both via `Platform.select` inside `StyleSheet.create`.

What is the difference between style and contentContainerStyle on ScrollView?

* `style` applies to the scroll viewport (the visible window).
* `contentContainerStyle` applies to the inner wrapper that moves when scrolling.
* Put padding, `gap`, and `flexGrow: 1` on `contentContainerStyle`, not `style`.

How do I handle notches and home indicators?

* Import `SafeAreaView` from `react-native-safe-area-context` (included in Expo templates).
* Pass `edges={["top", "left", "right"]}` to avoid double bottom padding above tab bars.
* For modals, wrap content independently - insets differ per presentation style.

Does Text support onPress?

* Yes - `Text` accepts `onPress`, `onLongPress`, and `pressRetentionOffset`.
* For buttons, prefer `Pressable` with a `Text` child for clearer roles and larger hit targets.
* Inline links inside copy are the main `Text` press use case.

How does gap work in React Native flex layouts?

* `gap`, `rowGap`, and `columnGap` are supported in React Native 0.71+.
* They add space between flex children without margin hacks on first/last items.
* Requires Yoga layout; works in `View` and `ScrollView` `contentContainerStyle`.

Gotcha: Why is my truncated text not showing an ellipsis?

* `numberOfLines` needs a bounded width to measure overflow.
* Unconstrained text grows to fit content and never truncates.
* Add `flex: 1`, a fixed `width`, or `flexShrink: 1` on the `Text` or parent row.

Should I use inline styles or StyleSheet.create?

* `StyleSheet.create` validates keys, enables reuse, and reads cleaner in diffs.
* Inline styles are fine for one-off dynamic values (`{ opacity: pressed ? 0.6 : 1 }`).
* Combine both: `style={[styles.base, { backgroundColor: color }]}`.

What changed with Fabric for View and Text updates?

* Fabric commits shadow nodes synchronously where configured, reducing layout thrash.
* Props still originate in JS - fewer bridge copies, not zero work on update.
* Component rules (`Text` nesting, style shapes) are unchanged from the developer perspective.

How do I center content vertically and horizontally?

```tsx
<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
  <Text>Centered</Text>
</View>
```

* `justifyContent` aligns on the main axis (column = vertical).
* `alignItems` aligns on the cross axis (column = horizontal).

Can I use percentage widths in React Native?

* Yes - `width: "100%"` and `height: "50%"` resolve against the parent.
* Percent flex basis works in many layouts; test on both platforms.
* For screen-width math, see `useWindowDimensions` in the dimensions article.

What is pointerEvents and when should I set it on View?

* `pointerEvents="none"` lets touches pass through to views below - useful for decorative overlays.
* `box-none` ignores touches on the container but allows children to receive them.
* Default is `auto`; change only when debugging overlapping touch targets.

## Related

* [React Native Basics](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/react-native-basics/) - mental model before diving into primitives
* [Props, State & Re-renders on Mobile](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/props-state-and-re-renders-on-mobile/) - what happens when these components update
* [Event Handling & Touchables](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/event-handling-and-touchables/) - `Pressable`, gestures, and `hitSlop`
* [Dimensions & Responsive Layout](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/dimensions-and-responsive-layout/) - breakpoints and `useWindowDimensions`
* [Images & Assets](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/images-and-assets/) - `Image`, density buckets, and asset loading
* [Platform-Specific Code](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/platform-specific-code/) - when to split `.ios` / `.android` files

### External Related Links

* [reactnative.dev](https://reactnative.dev/) - official React Native site
* [reactnative.dev/docs](https://reactnative.dev/docs/getting-started) - full RN documentation
* [react.dev](https://react.dev/) - core React concepts RN builds on

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

636f64656775696465732e696f7c6367696f3935307c323032363037

Reviewed by Chris St. John·Last updated Jul 19, 2026
