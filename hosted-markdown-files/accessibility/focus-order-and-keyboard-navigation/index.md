# Focus Order & Keyboard Navigation

Hardware keyboard and switch control on tablets. A cookbook for **focus order**, **external keyboards**, and **switch navigation** on iPad, Android tablets, and foldables - where touch-first layouts break for non-touch users.

Highlights / Focus Order & Keyboard Navigation

* Focus order follows the native view hierarchy - DOM-like reordering does not exist
* focusable on Pressable enables hardware keyboard activation on Android and iPad
* Split views must move focus into the detail pane when selection changes
* Switch Control and TalkBack rely on logical grouping - one focus stop per tappable row
* Modals need accessibilityViewIsModal so background content leaves the focus loop
* Test iPad Magic Keyboard and Android Bluetooth keyboard before shipping tablet layouts

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import { useRef } from "react";
import { FlatList, Pressable, Text, TextInput, View, StyleSheet } from "react-native";
 
export function KeyboardFriendlyForm() {
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
 
  return (
    <View style={styles.form}>
      <Text nativeID="emailLabel" style={styles.label}>
        Email
      </Text>
      <TextInput
        ref={emailRef}
        accessibilityLabel="Email"
        accessibilityLabelledBy="emailLabel"
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => passwordRef.current?.focus()}
        style={styles.input}
      />
 
      <Text nativeID="passwordLabel" style={styles.label}>
        Password
      </Text>
      <TextInput
        ref={passwordRef}
        accessibilityLabel="Password"
        accessibilityLabelledBy="passwordLabel"
        secureTextEntry
        returnKeyType="done"
        style={styles.input}
      />
 
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sign in"
        focusable
        style={styles.button}
      >
        <Text style={styles.buttonText}>Sign in</Text>
      </Pressable>
    </View>
  );
}
 
const styles = StyleSheet.create({
  form: { padding: 16, gap: 8 },
  label: { fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, padding: 12 },
  button: { minHeight: 44, backgroundColor: "#2563eb", borderRadius: 8, justifyContent: "center", alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
});
```

**When to reach for this:** Tablet layouts, hardware keyboard accessories, Switch Control users, and any screen where assistive tech must traverse controls in a **predictable sequence** - especially master-detail and modal flows.

## Working Example

Master-detail on a tablet: selecting a list item moves screen reader focus and keyboard focus into the detail header.

```tsx
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  FlatList,
  Pressable,
  Text,
  View,
  StyleSheet,
  findNodeHandle,
} from "react-native";
 
type Item = { id: string; title: string; body: string };
 
const DATA: Item[] = [
  { id: "1", title: "Invoice #1042", body: "Due April 12" },
  { id: "2", title: "Invoice #1043", body: "Paid" },
];
 
export function MasterDetail({ width }: { width: number }) {
  const isSplit = width >= 768;
  const [selectedId, setSelectedId] = useState(DATA[0].id);
  const detailTitleRef = useRef<Text>(null);
  const selected = DATA.find((d) => d.id === selectedId)!;
 
  useEffect(() => {
    if (!isSplit) return;
    const node = findNodeHandle(detailTitleRef.current);
    if (node) {
      AccessibilityInfo.setAccessibilityFocus(node);
    }
  }, [selectedId, isSplit]);
 
  return (
    <View style={styles.split}>
      <FlatList
        style={styles.list}
        data={DATA}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.title}
            accessibilityState={{ selected: item.id === selectedId }}
            focusable
            onPress={() => setSelectedId(item.id)}
            style={[styles.row, item.id === selectedId && styles.rowSelected]}
          >
            <Text>{item.title}</Text>
          </Pressable>
        )}
      />
      {isSplit ? (
        <View style={styles.detail} accessibilityLabel="Invoice details">
          <Text
            ref={detailTitleRef}
            accessibilityRole="header"
            style={styles.detailTitle}
          >
            {selected.title}
          </Text>
          <Text>{selected.body}</Text>
        </View>
      ) : null}
    </View>
  );
}
 
const styles = StyleSheet.create({
  split: { flex: 1, flexDirection: "row" },
  list: { flex: 1, maxWidth: 320 },
  row: { padding: 16, minHeight: 48 },
  rowSelected: { backgroundColor: "#e0f2fe" },
  detail: { flex: 2, padding: 24, gap: 8 },
  detailTitle: { fontSize: 22, fontWeight: "700" },
});
```

**What this demonstrates:**

* **`focusable`** on list rows for hardware keyboard traversal
* **`accessibilityState.selected`** exposes list selection to TalkBack
* **`AccessibilityInfo.setAccessibilityFocus`** moves VoiceOver to the detail header on selection change
* Split layout only on wide screens - phone stack navigation unchanged

## Cookbook Patterns

### Pattern 1: Reading Order Matches Visual Order

React Native does not support CSS `order`-style focus reordering. Structure JSX so the native tree matches the intended sequence.

```tsx
// Preferred - title before actions in JSX
<View>
  <Text accessibilityRole="header">Account</Text>
  <Pressable accessibilityRole="button" accessibilityLabel="Edit profile" />
  <Pressable accessibilityRole="button" accessibilityLabel="Sign out" />
</View>
 
// Avoid - actions visually positioned above title with absolute layout
// Screen readers still read in JSX order unless you hide/restructure
```

| Technique | When to use |
| --- | --- |
| Reorder JSX | Default - cheapest and most reliable |
| `importantForAccessibility="no-hide-descendants"` | Skip decorative columns |
| `setAccessibilityFocus` | After navigation or selection changes |
| Merge with `accessible` on parent | Single stop for complex tappable rows |

### Pattern 2: Hardware Keyboard on Tablets

| Key / action | Expected behavior | RN support |
| --- | --- | --- |
| Tab / Shift+Tab | Move between focusable controls | Android + iPad external keyboard (platform-dependent) |
| Enter / Space | Activate focused button | `Pressable` with `focusable` |
| Arrow keys in lists | Often maps to scroll, not item focus | Supplement with explicit list semantics |
| Escape | Close modal | Wire `BackHandler` + focus restore |

```tsx
<Pressable
  focusable
  accessibilityRole="button"
  accessibilityLabel="Close"
  onPress={onClose}
/>
```

* **`TextInput`** is focusable by default - chain fields with `returnKeyType="next"` and refs
* Test **iPad Magic Keyboard** and **Samsung DeX** if your app targets productivity tablets

### Pattern 3: Switch Control and Sequential Navigation

Switch Control (iOS) and Switch Access (Android) scan focusable elements. Reduce stops:

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel={`${productName}, ${price}, add to cart`}
  onPress={addToCart}
  style={styles.row}
>
  <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
    {/* visual layout */}
  </View>
</Pressable>
```

* Fewer focus stops = faster scanning for switch users
* Provide **`accessibilityActions`** on adjustable controls - see [accessibilityLabel & accessibilityRole](https://docs.wahwei/reactnative.codeguides.io/accessibility/accessibilitylabel-and-accessibilityrole/)
* Avoid **auto-advancing carousels** without pause - switch users cannot intercept fast timers

### Pattern 4: Modal Focus Trap

```tsx
import { Modal, Pressable, Text, View, StyleSheet } from "react-native";
 
export function ConfirmModal({ visible, onConfirm, onCancel }: {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.backdrop}>
        <View
          style={styles.sheet}
          accessibilityViewIsModal
          accessibilityLabel="Confirm delete"
        >
          <Text accessibilityRole="header">Delete item?</Text>
          <Pressable
            focusable
            accessibilityRole="button"
            accessibilityLabel="Confirm delete"
            onPress={onConfirm}
          >
            <Text>Delete</Text>
          </Pressable>
          <Pressable
            focusable
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            onPress={onCancel}
          >
            <Text>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
 
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  sheet: { backgroundColor: "#fff", borderRadius: 12, padding: 20, gap: 12 },
});
```

* **`accessibilityViewIsModal`** prevents VoiceOver from reaching content under the sheet
* On dismiss, **`setAccessibilityFocus`** back to the triggering control
* First focusable in modal should be the **title or primary action** - document in QA scripts

### Pattern 5: Android nextFocusForward (Optional)

For deterministic hardware focus jumps on Android TV or custom keyboards:

```tsx
<Pressable
  nativeID="filterButton"
  focusable
  nextFocusDown="resultsList"
/>
```

* IDs must match `nativeID` on the target view
* Use sparingly - prefer natural tree order when possible

### Pattern 6: Tablet Split View with Expo Router

Cross-link layout patterns:

```tsx
// Wide: list + detail side by side - focus moves to detail on select
// Narrow: stack push to detail route - focus lands on detail header on mount
```

See [Split View & Tablet Layouts](https://docs.wahwei/reactnative.codeguides.io/expo-router-advanced/split-view-and-tablet-layouts/) for routing structure; this page covers **focus behavior** after layout splits.

## Deep Dive

### How Focus Differs from Web

* No `tabIndex` - use `focusable` and native hierarchy.
* **Radix-style roving tabindex** does not exist - simulate with stateful selection and `setAccessibilityFocus`.
* ScrollViews do not automatically move focus to off-screen children - announce route changes instead.

### Testing Matrix

| Setup | What to verify |
| --- | --- |
| VoiceOver + iPad keyboard | Tab through form; Enter activates buttons |
| TalkBack + Bluetooth keyboard | Focus order on master-detail |
| Switch Control (iOS) | Scan hits each actionable row once |
| TalkBack reading controls | Headings navigable via rotor-equivalent |

### Focus Restoration Checklist

1. User opens modal → focus inside modal title
2. User closes modal → focus returns to trigger
3. User deletes list item → focus moves to next row or empty state
4. User submits form with errors → focus on first invalid field - [Accessibility in Forms](https://docs.wahwei/reactnative.codeguides.io/forms-input/accessibility-in-forms/)

## Gotchas

* **FlatList reorder** - dynamic data changes can move nodes; re-test focus after sort/filter.
* **Gesture-handler overlays** - can intercept keys if not paired with accessible `Pressable`.
* **Hidden off-screen tabs** - mount all tabs and hide with `display: 'none'` traps focus; unmount inactive routes or hide descendants.
* **AutoFocus on every screen** - disorients screen reader users; focus first field only on empty forms.
* **WebView embeds** - separate focus loop; provide native escape hatch.

## FAQs

Does React Native support full keyboard navigation like the web?

* Partial - `TextInput` and `focusable` pressables are the core building blocks.
* Complex widgets (grids, trees) need explicit `accessibilityActions` and focus management.

How do I move TalkBack focus programmatically?

* `AccessibilityInfo.setAccessibilityFocus(reactTag)` with `findNodeHandle(ref.current)`.
* Prefer refs on `Text` or `View` with a clear `accessibilityRole="header"`.

Should list items be focusable on phone?

* Yes when the row is the actionable unit - switch and keyboard users benefit even without tablets.
* Ensure each row has a concise combined label.

## Related

* [Accessibility Basics](https://docs.wahwei/reactnative.codeguides.io/accessibility/accessibility-basics/) - VoiceOver/TalkBack fundamentals
* [accessibilityLabel & accessibilityRole](https://docs.wahwei/reactnative.codeguides.io/accessibility/accessibilitylabel-and-accessibilityrole/) - roles and grouping for rows
* [Split View & Tablet Layouts](https://docs.wahwei/reactnative.codeguides.io/expo-router-advanced/split-view-and-tablet-layouts/) - master-detail routing
* [Accessibility in Forms](https://docs.wahwei/reactnative.codeguides.io/forms-input/accessibility-in-forms/) - submit focus and error focus
* [Modal & Presentation Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router-advanced/modal-and-presentation-routes/) - sheet presentation patterns
* [Accessibility Best Practices](https://docs.wahwei/reactnative.codeguides.io/accessibility/best-practices/) - section summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
