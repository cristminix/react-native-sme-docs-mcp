# accessibilityLabel & accessibilityRole

Correct semantics for custom components. A cookbook for wiring **names**, **roles**, **states**, and **hints** so VoiceOver and TalkBack understand your design-system primitives - not just raw `Pressable` calls scattered through features.

Highlights / accessibilityLabel & accessibilityRole

* Forward accessibility props from primitives - custom buttons must expose the same contract as Pressable
* Compose labels with accessibilityLabelledBy when visible text is split across elements
* Pick roles that match behavior - link for navigation, button for actions, header for section titles
* accessibilityHint explains how to act, not what the control is - keep hints short
* Hide decorative children so parents announce once - avoid triple-reading list rows
* Centralize semantics in design-system wrappers - features should not reinvent IconButton labels

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import type { PressableProps } from "react-native";
import { Pressable, Text, StyleSheet } from "react-native";
 
type AppButtonProps = PressableProps & {
  label: string;
  hint?: string;
  variant?: "primary" | "ghost";
};
 
export function AppButton({
  label,
  hint,
  variant = "primary",
  accessibilityState,
  ...rest
}: AppButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={accessibilityState}
      style={[styles.base, variant === "primary" ? styles.primary : styles.ghost]}
      {...rest}
    >
      <Text style={styles.text} importantForAccessibility="no">
        {label}
      </Text>
    </Pressable>
  );
}
 
const styles = StyleSheet.create({
  base: { minHeight: 44, paddingHorizontal: 16, borderRadius: 8, justifyContent: "center" },
  primary: { backgroundColor: "#2563eb" },
  ghost: { backgroundColor: "transparent" },
  text: { color: "#fff", fontWeight: "600", textAlign: "center" },
});
```

**When to reach for this:** Any time you wrap `Pressable`, `View`, or gesture handlers into reusable UI - cards, icon buttons, chips, steppers, and bottom-sheet actions all need an explicit semantic contract.

## Working Example

A compound **Settings row** with leading icon, title, subtitle, and chevron - announced once, activated once.

```tsx
import { Pressable, Text, View, StyleSheet } from "react-native";
 
type SettingsRowProps = {
  title: string;
  subtitle?: string;
  onPress: () => void;
};
 
export function SettingsRow({ title, subtitle, onPress }: SettingsRowProps) {
  const label = subtitle ? `${title}, ${subtitle}` : title;
 
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Opens settings"
      onPress={onPress}
      style={styles.row}
    >
      <View
        style={styles.content}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <Text style={styles.chevron} accessible={false}>
          ›
        </Text>
      </View>
    </Pressable>
  );
}
 
const styles = StyleSheet.create({
  row: { paddingVertical: 14, paddingHorizontal: 16, minHeight: 48 },
  content: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, fontSize: 16, fontWeight: "600" },
  subtitle: { fontSize: 14, color: "#64748b" },
  chevron: { fontSize: 20, color: "#94a3b8" },
});
```

**What this demonstrates:**

* Parent `Pressable` owns the **single accessible name**
* Visual children hidden from the tree - no "Notifications, Notifications, chevron"
* `accessibilityHint` adds purpose without repeating the title
* `minHeight: 48` satisfies touch target guidance

## Cookbook Patterns

### Pattern 1: Forward Props on Primitives

Design-system components should accept and forward accessibility props without stripping them.

```tsx
import type { PressableProps, ViewProps } from "react-native";
import { Pressable, View } from "react-native";
 
type CardProps = ViewProps & {
  onPress?: PressableProps["onPress"];
  accessibilityLabel: string;
};
 
export function Card({ onPress, accessibilityLabel, children, ...viewProps }: CardProps) {
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={viewProps.style}
      >
        {children}
      </Pressable>
    );
  }
 
  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={accessibilityLabel}
      {...viewProps}
    >
      {children}
    </View>
  );
}
```

* Use `ComponentProps<typeof Pressable>` in TypeScript - see [Typing Components & Props](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-components-and-props/)
* Default **`accessibilityLabel` required** on interactive wrappers - make forgetting a label a type error

### Pattern 2: accessibilityLabelledBy for Visible Labels

When label text is visible, reference it by `nativeID` instead of duplicating strings.

```tsx
import { Text, TextInput, View, StyleSheet } from "react-native";
 
export function Field({ label, value, onChangeText }: { label: string; value: string; onChangeText: (t: string) => void }) {
  const labelId = `field-${label.replace(/\s/g, "-").toLowerCase()}`;
 
  return (
    <View style={styles.field}>
      <Text nativeID={labelId} style={styles.label}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        accessibilityLabelledBy={labelId}
        accessibilityLabel={label}
      />
    </View>
  );
}
 
const styles = StyleSheet.create({
  field: { gap: 4 },
  label: { fontWeight: "600" },
});
```

* Provide **both** `accessibilityLabelledBy` and `accessibilityLabel` for older OS targets
* `nativeID` must be **unique per screen** - prefix with screen or form id in wizards

### Pattern 3: Role Selection Table

| UI pattern | Role | Label source |
| --- | --- | --- |
| Primary CTA | `button` | Visible text or `accessibilityLabel` |
| Text that navigates | `link` | Destination context - "View order details" |
| Section title | `header` | Heading text |
| Toggle row with `Switch` | `switch` on `Switch` | Row title; state on `Switch` |
| Checkbox custom | `checkbox` | Item name + `accessibilityState.checked` |
| Search field | `search` | "Search products" |
| Static paragraph | `text` or none | Usually auto from `Text` |
| Toolbar icon | `button` | **Required** `accessibilityLabel` |

### Pattern 4: accessibilityState Matrix

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Add to favorites"
  accessibilityState={{
    disabled: isLoading,
    selected: isFavorite,
    busy: isLoading,
  }}
/>
```

| State key | Announced as | Use when |
| --- | --- | --- |
| `disabled` | "dimmed" / unavailable | Async or validation block |
| `selected` | "selected" | Tabs, filters, segmented controls |
| `checked` | "checked" / "unchecked" | Custom toggles |
| `expanded` | "expanded" / "collapsed" | Accordions |
| `busy` | In progress | Submit in flight |

### Pattern 5: Custom Actions (Steppers and Sliders)

```tsx
import { Pressable, Text, View, StyleSheet } from "react-native";
 
export function QuantityStepper({
  value,
  onIncrement,
  onDecrement,
}: {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Quantity"
      accessibilityValue={{ text: String(value) }}
      accessibilityActions={[
        { name: "increment", label: "Increase quantity" },
        { name: "decrement", label: "Decrease quantity" },
      ]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === "increment") onIncrement();
        if (e.nativeEvent.actionName === "decrement") onDecrement();
      }}
      style={styles.row}
    >
      <Pressable accessibilityLabel="Decrease" onPress={onDecrement}>
        <Text>−</Text>
      </Pressable>
      <Text>{value}</Text>
      <Pressable accessibilityLabel="Increase" onPress={onIncrement}>
        <Text>+</Text>
      </Pressable>
    </View>
  );
}
 
const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
});
```

* **`adjustable`** role suits iOS rotor adjustments - pair with `accessibilityActions` for custom steppers
* Physical buttons remain for sighted users - do not remove visible controls

### Pattern 6: Badges and Live Counts

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel={`Messages, ${unread} unread`}
  accessibilityHint="Opens inbox"
/>
```

* Include **dynamic counts in the label** when they convey status
* Do not call `announceForAccessibility` on every poll - reserve for meaningful transitions

## Deep Dive

### accessible={true} vs false

* Setting a container `accessible` merges children into **one** announcement on iOS.
* Leaving children exposed gives **granular** navigation - pick per UX intent.
* **`importantForAccessibility`** on Android overrides child visibility when parents are hidden.

### accessibilityHint Guidelines

* Hints describe **what happens next** - "Opens payment sheet", not "Button"
* Omit hints when the label is self-explanatory - verbosity slows expert screen reader users
* Localize hints with the same priority as labels

### Lint + Design System Integration

Enforce labels in CI with `eslint-plugin-react-native-a11y` - then ban raw `Pressable` in features:

```text
features/** → must import { AppButton, IconButton } from @/shared/ui
```

See [Custom ESLint Rules for RN](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/custom-eslint-rules-for-rn/) and [Building an Internal Component Library](https://docs.wahwei/reactnative.codeguides.io/design-systems/building-an-internal-component-library/).

## Gotchas

* **Gesture-handler buttons** - `GestureDetector` wrappers are not accessible until an inner `Pressable` or `accessible` view exposes semantics.
* **Duplicate roles** - `accessibilityRole="button"` on both parent and child causes nested "button" announcements.
* **Icon fonts** - glyph codepoints are not spoken; always provide a text label.
* **Translated strings in labels** - interpolate values, not sentence order assumptions from English.
* **accessibilityElementsHidden on Android** - pair with `importantForAccessibility` for reliable hiding.

## FAQs

Should custom components set accessibilityLabel by default?

* Yes for interactive primitives - require `label` prop or sensible default from children text.
* Static layout containers usually need no label unless they summarize a complex card.

link or button for navigation?

* Use `link` when the action opens related content or another screen in a browsing context.
* Use `button` for modals, submits, and destructive confirmations - matches user mental model on mobile screen readers.

How do I test semantics without a device?

* React Native Testing Library: `getByRole("button", { name: "Save" })` - see [Mobile Testing Basics](https://docs.wahwei/reactnative.codeguides.io/testing/mobile-testing-basics/).
* Device testing still required for hints, grouping, and TalkBack granularity.

## Related

* [Accessibility Basics](https://docs.wahwei/reactnative.codeguides.io/accessibility/accessibility-basics/) - 10-example VoiceOver/TalkBack tour
* [Focus Order & Keyboard Navigation](https://docs.wahwei/reactnative.codeguides.io/accessibility/focus-order-and-keyboard-navigation/) - focusable wrappers and tablet keyboards
* [Accessibility in Forms](https://docs.wahwei/reactnative.codeguides.io/forms-input/accessibility-in-forms/) - `accessibilityLabelledBy` on inputs
* [Design Systems Basics](https://docs.wahwei/reactnative.codeguides.io/design-systems/design-systems-basics/) - token-backed primitives with semantic APIs
* [Building an Internal Component Library](https://docs.wahwei/reactnative.codeguides.io/design-systems/building-an-internal-component-library/) - publishing accessible wrappers
* [Accessibility Best Practices](https://docs.wahwei/reactnative.codeguides.io/accessibility/best-practices/) - section summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
