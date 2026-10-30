# Accessibility Basics

10 examples to get you started with mobile accessibility - 7 basic and 3 intermediate. Every production screen should pass these VoiceOver and TalkBack checks before it ships.

Highlights / Accessibility Basics

* Every interactive control needs a name - visible text, accessibilityLabel, or labelledBy
* Test on a physical device with VoiceOver (iOS) and TalkBack (Android) before store submission
* Pressable and TextInput expose semantics through accessibilityRole and accessibilityState
* Decorative images set accessible={false} - meaningful images need a short label
* Touch targets need 44×44 pt effective size via padding or hitSlop, not tiny icons alone
* eslint-plugin-react-native-a11y catches missing labels in CI - it does not replace device testing

## Prerequisites

Accessibility is built into React Native core components. No extra install is required for labels, roles, and announcements on Expo SDK 57:

```bash
npx create-expo-app@latest MyA11yApp --template blank-typescript
cd MyA11yApp
```

Enable screen readers on a **physical device** - simulators work for smoke tests, but TalkBack timing and VoiceOver rotor behavior differ on real hardware.

| Platform | How to enable | Quick test gesture |
| --- | --- | --- |
| iOS | Settings → Accessibility → VoiceOver | Triple-click side button (if configured) |
| Android | Settings → Accessibility → TalkBack | Volume keys shortcut (device-dependent) |

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**. Semantics props apply to core `View`, `Text`, `Pressable`, `TextInput`, `Image`, and `Switch`.

---

## Basic Examples

### 1. Name Every Interactive Element

Screen readers announce the **accessible name** of a focused element. If a `Pressable` has no visible text and no label, users hear "button" with no context.

```tsx
import { Pressable, Text, StyleSheet } from "react-native";
 
export function SaveButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Save changes"
      onPress={onPress}
      style={styles.button}
    >
      <Text style={styles.label}>Save</Text>
    </Pressable>
  );
}
 
const styles = StyleSheet.create({
  button: { backgroundColor: "#2563eb", padding: 14, borderRadius: 8 },
  label: { color: "#fff", fontWeight: "600", textAlign: "center" },
});
```

* Visible text inside a `Text` child often becomes the default name - **explicit `accessibilityLabel` is still recommended** for icon-only controls
* Keep labels **stable** across locales - do not embed dynamic counts unless they change meaning ("3 unread messages" is fine; "Button" is not)
* Pair with [accessibilityLabel & accessibilityRole](https://docs.wahwei/reactnative.codeguides.io/accessibility/accessibilitylabel-and-accessibilityrole/) when building custom components

---

### 2. Icon-Only Buttons Need Labels

Glyphs are meaningless to assistive tech unless you describe them.

```tsx
import { Pressable, Text, StyleSheet } from "react-native";
 
export function IconButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={12}
      onPress={onPress}
      style={styles.hit}
    >
      <Text style={styles.icon} accessibilityElementsHidden>
        ⋮
      </Text>
    </Pressable>
  );
}
 
const styles = StyleSheet.create({
  hit: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  icon: { fontSize: 22 },
});
```

* **`accessibilityElementsHidden`** on decorative glyph `Text` prevents double announcements ("more, more options")
* **`hitSlop`** or `minWidth` / `minHeight` of **44** achieves minimum touch target without bloating layout
* Add **`accessibilityHint`** only when the action is non-obvious - "Opens account settings" for a gear icon

---

### 3. accessibilityRole Tells Users What to Expect

Roles map to platform traits - button, link, header, switch, and more.

```tsx
import { Pressable, Text, View, StyleSheet } from "react-native";
 
export function ArticleCard({ title, onOpen }: { title: string; onOpen: () => void }) {
  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Pressable accessibilityRole="link" accessibilityLabel={`Read ${title}`} onPress={onOpen}>
        <Text style={styles.link}>Read article</Text>
      </Pressable>
    </View>
  );
}
 
const styles = StyleSheet.create({
  card: { padding: 16, gap: 8 },
  title: { fontSize: 20, fontWeight: "700" },
  link: { color: "#2563eb" },
});
```

| Role | User expectation | Common mistake |
| --- | --- | --- |
| `button` | Activates an action | Using on static `Text` |
| `link` | Navigates to related content | Using on destructive delete |
| `header` | Section title, quick navigation | Skipping headings in long screens |
| `image` | Descriptive graphic | Leaving default on decorative icons |
| `switch` | Toggles on/off state | Using on `Pressable` instead of `Switch` |

---

### 4. accessibilityState for Toggles and Selection

Communicate `disabled`, `selected`, `checked`, and `expanded` explicitly - do not rely on color alone.

```tsx
import { Pressable, Text, StyleSheet } from "react-native";
 
type FilterChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};
 
export function FilterChip({ label, selected, onPress }: FilterChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}
 
const styles = StyleSheet.create({
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: "#e2e8f0" },
  chipSelected: { backgroundColor: "#2563eb" },
  chipText: { fontWeight: "600" },
});
```

* VoiceOver announces **"selected"** when `accessibilityState={{ selected: true }}`
* For native `Switch`, prefer the component itself - it wires `checked` state automatically
* Destructive actions: add **`accessibilityState={{ disabled: isLoading }}`** while async work runs

---

### 5. Hide Decorative Content from the Tree

Background ornaments, redundant icons, and visual dividers should not steal focus.

```tsx
import { Image, Text, View, StyleSheet } from "react-native";
 
export function PromoBanner() {
  return (
    <View style={styles.banner}>
      <Image
        source={require("./assets/sparkle.png")}
        style={styles.sparkle}
        accessible={false}
        importantForAccessibility="no"
      />
      <Text accessibilityRole="header">Summer sale - 20% off</Text>
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={styles.rule}
      />
    </View>
  );
}
 
const styles = StyleSheet.create({
  banner: { padding: 16, gap: 8 },
  sparkle: { width: 24, height: 24, position: "absolute", right: 8, top: 8 },
  rule: { height: 1, backgroundColor: "#cbd5e1" },
});
```

| Prop | Platform | Effect |
| --- | --- | --- |
| `accessible={false}` | iOS + Android | Removes element from accessibility focus |
| `importantForAccessibility="no"` | Android | Hides single view |
| `importantForAccessibility="no-hide-descendants"` | Android | Hides view and all children |
| `accessibilityElementsHidden` | iOS | Hides subtree from VoiceOver |

---

### 6. Meaningful Images Get Short Labels

Avatars, charts, and product photos need context; purely decorative assets do not.

```tsx
import { Image, StyleSheet } from "react-native";
 
export function UserAvatar({ uri, name }: { uri: string; name: string }) {
  return (
    <Image
      source={{ uri }}
      style={styles.avatar}
      accessibilityRole="image"
      accessibilityLabel={`${name} profile photo`}
    />
  );
}
 
export function DecorativeDivider() {
  return (
    <Image
      source={require("./assets/wave.png")}
      style={styles.wave}
      accessible={false}
      importantForAccessibility="no"
    />
  );
}
 
const styles = StyleSheet.create({
  avatar: { width: 48, height: 48, borderRadius: 24 },
  wave: { width: "100%", height: 8 },
});
```

* **One sentence max** for `accessibilityLabel` on images - "Bar chart showing revenue up 12% in Q3"
* Do not repeat information already in adjacent headings
* See [Images & Assets](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/images-and-assets/) for `expo-image` performance patterns

---

### 7. Announce Dynamic Updates

When status changes without moving focus, tell screen reader users explicitly.

```tsx
import { useEffect, useState } from "react";
import { AccessibilityInfo, Pressable, Text, View, StyleSheet } from "react-native";
 
export function CartBadge({ count }: { count: number }) {
  const [lastAnnounced, setLastAnnounced] = useState(count);
 
  useEffect(() => {
    if (count !== lastAnnounced) {
      AccessibilityInfo.announceForAccessibility(
        count === 0 ? "Cart is empty" : `${count} items in cart`,
      );
      setLastAnnounced(count);
    }
  }, [count, lastAnnounced]);
 
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Cart, ${count} items`}
      accessibilityLiveRegion="polite"
      style={styles.badge}
    >
      <Text>{count}</Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  badge: { minWidth: 28, minHeight: 28, borderRadius: 14, backgroundColor: "#dc2626", alignItems: "center", justifyContent: "center" },
});
```

* **`AccessibilityInfo.announceForAccessibility`** pushes a one-shot message to VoiceOver/TalkBack
* **`accessibilityLiveRegion="polite"`** (Android) batches non-urgent text changes
* Use **`assertive`** for errors and time-sensitive alerts - see [Accessibility in Forms](https://docs.wahwei/reactnative.codeguides.io/forms-input/accessibility-in-forms/)

---

## Intermediate Examples

### 8. Group Related Content with accessible Containers

A card with title, price, and rating should be one logical unit - or deliberately split for scanning.

```tsx
import { Pressable, Text, View, StyleSheet } from "react-native";
 
export function ProductRow({
  name,
  price,
  rating,
  onPress,
}: {
  name: string;
  price: string;
  rating: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${price}, rated ${rating} out of five`}
      onPress={onPress}
      style={styles.row}
    >
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.price}>{price}</Text>
        <Text style={styles.rating}>{rating} ★</Text>
      </View>
    </Pressable>
  );
}
 
const styles = StyleSheet.create({
  row: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#e2e8f0" },
  name: { fontSize: 16, fontWeight: "600" },
  price: { color: "#64748b" },
  rating: { color: "#f59e0b" },
});
```

* **Single focus stop** for tappable list rows - users swipe once per item, not three times
* Alternative pattern: leave children exposed when users should hear each field separately (data tables)
* Test both patterns with TalkBack **reading controls** vs **reading lines**

---

### 9. Detect Screen Reader and Adapt (Sparingly)

Query `AccessibilityInfo` for reader and reduce-motion settings - bake accessibility into default UI, do not ship a separate "accessible mode."

```tsx
import { useEffect, useState } from "react";
import { AccessibilityInfo, Text, View } from "react-native";
 
export function useA11yPreferences() {
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
 
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setScreenReaderEnabled);
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotionEnabled);
 
    const screenReaderSub = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      setScreenReaderEnabled,
    );
    const motionSub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotionEnabled,
    );
 
    return () => {
      screenReaderSub.remove();
      motionSub.remove();
    };
  }, []);
 
  return { screenReaderEnabled, reduceMotionEnabled };
}
 
export function MotionAwareHint() {
  const { screenReaderEnabled } = useA11yPreferences();
 
  return (
    <View>
      <Text accessibilityRole="header">Orders</Text>
      {screenReaderEnabled ? (
        <Text>Swipe right through the list to hear each order.</Text>
      ) : null}
    </View>
  );
}
```

* Use detection to **skip decorative motion** or **simplify coaching UI** - not to hide features
* See [Reduced Motion](https://docs.wahwei/reactnative.codeguides.io/accessibility/reduced-motion/) and [Animations reduced motion](https://docs.wahwei/reactnative.codeguides.io/accessibility/reduced-motion/)

---

### 10. Smoke-Test a Screen with the Accessibility Inspector

Walk every screen with VoiceOver and TalkBack using a repeatable script.

```text
Per-screen checklist (5 minutes):
1. Turn on VoiceOver / TalkBack
2. Swipe through every focusable element - no unlabeled "button"
3. Activate primary action - hear confirmation or focus move
4. Rotate to landscape (tablet) - order still logical
5. Increase font scale to maximum - no clipped primary actions
6. Turn on Reduce Motion - no required animation to complete task
```

```tsx
// Dev-only helper - log the tree in __DEV__
import { AccessibilityInfo, Pressable, Text } from "react-native";
 
export function DevA11yLog({ label }: { label: string }) {
  if (!__DEV__) return null;
 
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Log accessibility tree for ${label}`}
      onPress={() => AccessibilityInfo.isScreenReaderEnabled().then(console.log)}
    >
      <Text>Log a11y state ({label})</Text>
    </Pressable>
  );
}
```

* **Document failures** as P0/P1 in [Accessibility Audit Checklist](https://docs.wahwei/reactnative.codeguides.io/accessibility/accessibility-audit-checklist/)
* Add **Maestro** or **Detox** flows that query by `accessibilityLabel` - same selectors assistive tech relies on
* Design-system primitives should centralize roles - see [Design Systems Basics](https://docs.wahwei/reactnative.codeguides.io/design-systems/design-systems-basics/)

---

## Deep Dive

### How the Accessibility Tree Works

* React Native maps your component tree to **platform accessibility APIs** (UIAccessibility on iOS, AccessibilityNodeInfo on Android).
* Only views marked **`accessible={true}`** (default for `Text` and touchables) or containing accessible children become focus stops.
* **Reading order** follows the native view hierarchy - sibling order and nesting matter more than visual CSS-like layout.
* **`testID`** is for automation only - it does **not** replace labels for screen readers unless your tests mock it incorrectly.

### VoiceOver vs TalkBack Differences

| Behavior | VoiceOver (iOS) | TalkBack (Android) |
| --- | --- | --- |
| Explore gesture | Swipe right / left | Swipe right / left |
| Activate | Double-tap | Double-tap |
| Reading modes | Rotor (headings, links) | Reading controls/granularity |
| Hints | `accessibilityHint` spoken after label | Hint less consistently used |
| Live regions | Limited vs web | `accessibilityLiveRegion` supported |

Test **both** platforms - passing iOS alone is not sufficient for Play Store accessibility expectations.

### Minimum Touch Targets

Apple HIG and Material recommend **44×44 pt / 48×48 dp** effective targets:

```tsx
<Pressable hitSlop={10} style={{ minHeight: 44, justifyContent: "center" }} />
```

Small visual icons are fine when the **hit region** is enlarged.

## Gotchas

* **Placeholder is not a label** - `TextInput` needs `accessibilityLabel` or `accessibilityLabelledBy`.
* **Duplicate announcements** - nested `accessible` views with overlapping text cause stutter.
* **Opacity-only disabled state** - still focusable unless `disabled` or `accessibilityState={{ disabled: true }}`.
* **Modal traps** - set `accessibilityViewIsModal` on overlay roots so background content is skipped.
* **Lint-only confidence** - `eslint-plugin-react-native-a11y` misses broken focus order and misleading hints.

## FAQs

Does Expo Go support full accessibility testing?

* Yes for core semantics, screen reader navigation, and font scaling.
* Custom native modules and some Reanimated edge cases need a dev build - test release candidates on device.

Should I use testID or accessibilityLabel for Detox?

* Prefer querying by **role + label** - matches real user and assistive-tech behavior.
* `testID` is fine for elements without a user-facing name, but do not let it replace missing labels.

Are web aria-\* props available?

* React Native 0.76+ maps some `aria-*` props to accessibility equivalents.
* Prefer documented RN props (`accessibilityLabel`, `accessibilityRole`) for cross-platform consistency on SDK 57.

## Related

* [accessibilityLabel & accessibilityRole](https://docs.wahwei/reactnative.codeguides.io/accessibility/accessibilitylabel-and-accessibilityrole/) - semantics cookbook for custom components
* [Focus Order & Keyboard Navigation](https://docs.wahwei/reactnative.codeguides.io/accessibility/focus-order-and-keyboard-navigation/) - hardware keyboard and switch control
* [Dynamic Type & Font Scaling](https://docs.wahwei/reactnative.codeguides.io/accessibility/dynamic-type-and-font-scaling/) - `allowFontScaling` and layout survival
* [Accessibility in Forms](https://docs.wahwei/reactnative.codeguides.io/forms-input/accessibility-in-forms/) - labels, errors, and focus on submit
* [Design Systems Basics](https://docs.wahwei/reactnative.codeguides.io/design-systems/design-systems-basics/) - bake a11y into shared primitives
* [Accessibility Best Practices](https://docs.wahwei/reactnative.codeguides.io/accessibility/best-practices/) - 25-rule summary for this section

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
