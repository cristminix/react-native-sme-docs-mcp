# Accessibility and Safe Area

Screen reader semantics, safe areas for notches, and inclusive touch/typography defaults.

Highlights / Accessibility and Safe Area

* accessibilityLabel
* accessibilityRole
* useSafeAreaInsets
* Minimum Touch Target
* Reduce Motion Check

#### accessibilityLabel

Provide a spoken name when visible text is missing or incomplete (icon-only controls).

```tsx
<Pressable accessibilityLabel="Close dialog" onPress={onClose}>
  <Icon name="x" />
</Pressable>
```

#### accessibilityRole

Tell assistive tech what the control is: `button`, `link`, `header`, `image`, `checkbox`, and more.

```tsx
<Text accessibilityRole="header" style={styles.h1}>
  Settings
</Text>
```

#### accessibilityState

Expose selected, disabled, busy, checked, and expanded state to the OS.

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityState={{ disabled: loading, busy: loading }}
  onPress={onSave}
>
  <Text>Save</Text>
</Pressable>
```

#### accessibilityHint

Optional extra guidance for what happens after activation - keep it short.

```tsx
<Pressable
  accessibilityLabel="Delete message"
  accessibilityHint="Removes this message from your inbox"
  onPress={onDelete}
>
  <Text>Delete</Text>
</Pressable>
```

#### accessible Grouping

Set `accessible` on a parent to merge children into one focusable unit for card-like rows.

```tsx
<View accessible accessibilityLabel={`${title}, ${subtitle}`}>
  <Text>{title}</Text>
  <Text>{subtitle}</Text>
</View>
```

#### importantForAccessibility

Hide decorative views from the accessibility tree on Android (`no-hide-descendants`).

```tsx
<Image
  source={bg}
  importantForAccessibility="no"
  accessibilityElementsHidden
  style={StyleSheet.absoluteFill}
/>
```

#### SafeAreaProvider

Wrap the app once (Expo Router templates already do) so inset hooks work.

```tsx
import { SafeAreaProvider } from "react-native-safe-area-context";
 
export default function Root() {
  return (
    <SafeAreaProvider>
      <App />
    </SafeAreaProvider>
  );
}
```

#### useSafeAreaInsets

Read pixel insets and apply padding manually when you need full control.

```tsx
import { useSafeAreaInsets } from "react-native-safe-area-context";
 
const insets = useSafeAreaInsets();
return <View style={{ paddingTop: insets.top, flex: 1 }}>{children}</View>;
```

#### edges on SafeAreaView

Only apply safe padding on selected edges so bottom tabs are not double-padded.

```tsx
import { SafeAreaView } from "react-native-safe-area-context";
 
<SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
  {children}
</SafeAreaView>
```

#### Minimum Touch Target

Aim for about 44x44 pt minimum hit areas. Expand with `hitSlop` when visuals are smaller.

```tsx
<Pressable
  hitSlop={8}
  style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
  onPress={onPress}
>
  <Icon name="heart" />
</Pressable>
```

#### Reduce Motion Check

Skip non-essential motion when the user enables reduce motion.

```tsx
import { AccessibilityInfo } from "react-native";
 
const reduce = await AccessibilityInfo.isReduceMotionEnabled();
const duration = reduce ? 0 : 250;
```

#### Bold Text Enabled

React to accessibility bold text preferences when fine-tuning typography (iOS primarily).

```tsx
const bold = await AccessibilityInfo.isBoldTextEnabled();
const weight = bold ? "700" : "400";
```

#### Screen Reader Focus

Move accessibility focus after important UI changes (use sparingly).

```tsx
import { findNodeHandle, AccessibilityInfo } from "react-native";
 
const tag = findNodeHandle(ref.current);
if (tag) AccessibilityInfo.setAccessibilityFocus(tag);
```

#### Contrast Text Colors

Prefer high-contrast pairs for body text - especially on image overlays with scrims.

```tsx
const styles = {
  overlayText: { color: "#fff", textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 4 },
};
```

#### Allow Font Scaling

System font scaling is on by default - prefer keeping it. Cap pathological sizes with `maxFontSizeMultiplier` on critical labels only.

```tsx
<Text maxFontSizeMultiplier={1.4} style={styles.title}>
  Balance
</Text>
```

## Related

* [Pressables and Touch](https://docs.wahwei/reactnative.codeguides.io/code-reference/pressables-and-touch/) - roles and hitSlop on controls
* [Core Views and Text](https://docs.wahwei/reactnative.codeguides.io/code-reference/core-views-and-text/) - SafeAreaView on screens
* [StyleSheet and Flexbox](https://docs.wahwei/reactnative.codeguides.io/code-reference/stylesheet-and-flexbox/) - layout that respects insets

### External Related Links

* [reactnative.dev/docs](https://reactnative.dev/docs/getting-started) - full RN documentation
* [reactnative.dev](https://reactnative.dev/) - official React Native site
* [reactnative.directory](https://reactnative.directory/) - community library directory (compatibility, New Architecture flags)

> **Stack versions:** React 19.2.3 · React Native 0.86.0 · Expo SDK 57 · react-native-safe-area-context

Reviewed by Chris St. John·Last updated Jul 18, 2026
