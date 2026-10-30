# Product Collaboration Basics

10 examples to get you started translating **designs into feasible mobile interactions** on Expo SDK 57 - what to validate before sprint commitment, how to talk to design and PM in mobile terms, and where web assumptions break on phones.

Highlights / Product Collaboration Basics

* Figma frames are hypotheses - validate on iOS and Android hardware before sprint commitment
* Safe areas, keyboard, and gesture back change layout math - not optional polish
* One feasibility note per screen beats a post-sprint 'we can't build that' surprise
* Motion specs need frame budget and fallback - see Animations & Gestures before pixels lock
* Design tokens from your system beat one-off hex values copied from web mocks
* Demo on device in refinement - stakeholders trust thumbs, not static artboards

## Prerequisites

Product collaboration assumes a standard **Expo SDK 57** app with design tokens and at least one preview build profile.

```bash
npx create-expo-app@latest MyProductApp --template blank-typescript
cd MyProductApp
npx eas init
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**. Pair with [Design Systems Basics](https://docs.wahwei/reactnative.codeguides.io/design-systems/design-systems-basics/) for tokens and [Animations Basics](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/animations-basics/) for motion feasibility.

---

## Basic Examples

### 1. Design Handoff Is a Conversation, Not a File Drop

Treat Figma export as the **start** of refinement - not the end of design.

```markdown
## Handoff checklist (per screen)
- [ ] iOS + Android artboards OR explicit "platform follows HIG/Material"
- [ ] Safe area insets noted (notch, Dynamic Island, nav bar)
- [ ] Keyboard states: default, focused, error inline
- [ ] Loading, empty, error - not only happy path
- [ ] Engineer feasibility comment thread open before sprint planning
```

* PM schedules **15-minute feasibility pass** with engineer + designer before pointing
* "Looks good" on Figma ≠ "ships this sprint" on two platforms
* Record blockers in the ticket - "needs native module spike" is a valid outcome

> **Related:** [Working with Design & Motion](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/working-with-design-and-motion/) - pre-pixel feasibility reviews

---

### 2. Safe Area Changes Every "Fixed" Header

Web mocks with `position: fixed` top bars ignore the notch and status bar.

```tsx
// src/screens/ProfileScreen.tsx
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
 
export function ProfileScreen() {
  const insets = useSafeAreaInsets();
 
  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <Text accessibilityRole="header">Profile</Text>
      {/* Content scrolls under transparent header only if designed that way */}
    </View>
  );
}
```

* Show designers **two device frames**: iPhone with Dynamic Island + Android with punch-hole
* `paddingTop: 44` magic numbers fail on new hardware - use insets
* Sticky footers need `insets.bottom` for home indicator overlap

---

### 3. Bottom Sheets Are Not Web Modals

Centered modal dialogs from web often become **bottom sheets** or **full-screen flows** on mobile.

| Web pattern | Mobile default | When to diverge |
| --- | --- | --- |
| Centered dialog | Bottom sheet (`@gorhom/bottom-sheet`) | Short confirmations |
| Dropdown menu | Action sheet / context menu | Destructive actions need platform sheet |
| Hover tooltip | Long-press or info icon | No hover on touch |
| Multi-column form | Single column + steps | Keyboard reduces visible viewport |

* Flag **gesture dismiss** expectations - swipe-down vs tap-outside differs by platform
* See [Platform Parity Decisions](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/platform-parity-decisions/) when iOS and Android intentionally differ

---

### 4. Keyboard Avoidance Is Part of the Design

A form that looks perfect in Figma may hide the primary CTA when the keyboard opens.

```tsx
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
 
export function SignUpForm() {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        {/* fields + submit - designer reviews with keyboard up */}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

* Design review must include **keyboard-up screenshot** on smallest supported phone
* `android:windowSoftInputMode` may need config plugin - not pure JS
* Floating labels that animate need motion budget - [Reanimated 4](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/react-native-reanimated-4/)

---

### 5. Touch Targets Beat Pixel-Perfect Density

Figma at 100% zoom tempts 32px buttons; Apple HIG and Material recommend **44–48dp minimum**.

```tsx
// design-systems/PrimaryButton.tsx - enforce minimum touch target
import { Pressable, Text, StyleSheet } from "react-native";
 
type Props = { label: string; onPress: () => void };
 
export function PrimaryButton({ label, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.hitSlop}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}
 
const styles = StyleSheet.create({
  hitSlop: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  label: { fontSize: 16, fontWeight: "600" },
});
```

* Designers use **8px grid** from [Design Systems Basics](https://docs.wahwei/reactnative.codeguides.io/design-systems/design-systems-basics/) - engineers enforce `minHeight` in components
* Dense data tables on phone often need **card list** alternative - negotiate in refinement
* WCAG 2.5.5 (44×44) is a product decision, not a post-launch audit surprise

---

### 6. Gestures Need Engineering Early

Swipe-to-delete, drag-to-reorder, and pull-to-refresh compete for the same pan handlers.

```markdown
## Gesture feasibility (ticket template)
**Interaction:** Swipe row left → reveal Delete
**Libraries:** react-native-gesture-handler + Reanimated
**Conflicts:** Parent FlatList vertical scroll
**Spike:** 0.5 day if new pattern
**Fallback:** Long-press → action sheet
```

* If the mock shows **physics-based** drag, link [Gesture Handler](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/react-native-gesture-handler/) in the ticket
* "Same as iOS Mail" is not a spec - record threshold, haptics, and undo pattern
* Android back gesture can cancel incomplete swipes - test on API 35 emulator

---

### 7. States Beyond the Happy Path

Shippable screens need **loading, empty, error, offline, and permission-denied** - not only the marketing frame.

```tsx
type ViewState = "loading" | "empty" | "error" | "ready";
 
export function OrdersList({ state, orders }: { state: ViewState; orders: Order[] }) {
  if (state === "loading") return <OrdersSkeleton />;
  if (state === "empty") return <EmptyState title="No orders yet" cta="Browse catalog" />;
  if (state === "error") return <ErrorState onRetry={refetch} />;
  return <FlatList data={orders} renderItem={renderOrder} />;
}
```

* PM acceptance criteria: "user sees X when network fails" - not implied
* Skeleton vs spinner is a **design system** decision - one pattern per data density
* Permission strings (`NSCameraUsageDescription`) require store build - flag in estimation

---

### 8. Typography and Dynamic Type

Fixed `fontSize: 14` in Figma breaks when users enable **larger text** in system settings.

```tsx
import { Text, StyleSheet } from "react-native";
 
export function BodyText({ children }: { children: string }) {
  return (
    <Text
      style={styles.body}
      maxFontSizeMultiplier={1.3} // product cap - document in a11y ADR if lower than system
    >
      {children}
    </Text>
  );
}
 
const styles = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 24 }, // token: typography.body
});
```

* Designers deliver **type scale tokens**, not one-off sizes - [Theming & Brand Flavors](https://docs.wahwei/reactnative.codeguides.io/design-systems/theming-and-brand-flavors/)
* Review **XL dynamic type** on iOS and **font scale 1.3** on Android before sign-off
* Truncation rules: `numberOfLines` vs expand - business copy decision

---

### 9. Native Pickers vs Custom Dropdowns

"Custom select" from web is often **half a sprint** on mobile; platform pickers ship faster.

| Requirement | Faster path | Slower path |
| --- | --- | --- |
| Date of birth | `@react-native-community/datetimepicker` | Custom calendar wheel |
| Country list | Searchable modal + `FlatList` | Figma custom dropdown with blur |
| Single choice (3–5 options) | Segmented control / radio group | Bottom sheet with illustrations |

* Document **intentional** custom UI in ADR when platform picker is rejected
* Custom pickers need a11y: screen reader order, focus trap, dismiss gesture
* PM trade-off table in refinement beats redesign mid-sprint

---

### 10. Device Demo Closes the Loop

End refinement with a **10-minute device walkthrough** - prototype, preview build, or Storybook on phone.

```bash
# Share preview with design + PM before sprint start
eas build --profile preview --platform all
# QR in refinement notes; same build for QA acceptance
```

```markdown
## Refinement done when
- [ ] Designer saw iOS + Android (sim or device)
- [ ] Engineer logged feasibility risks in ticket
- [ ] PM accepted fallback for any "spike pending" item
- [ ] Motion marked: Animated vs Reanimated vs static
```

* Stakeholders overweight Figma fidelity - **thumb demo** resets expectations
* Record screen recording for async PMs - 30 seconds beats a paragraph
* Ties to [Stakeholder Communication](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/stakeholder-communication/) for release language

---

## FAQs

When should engineering join design reviews?

Before high-fidelity lock on net-new flows - ideally at wireframe. One engineer in weekly design crit catches mobile-specific issues early. Late joiners produce expensive pixel reworks.

How do we say "no" without blocking product?

Offer **ranked alternatives**: platform picker vs custom, bottom sheet vs full screen, phase 1 without animation. "No" with options is collaboration; "no" alone is a wall.

Do we need separate iOS and Android designs?

Not always - shared layout with platform chrome differences is common. Document intentional divergence in [Platform Parity Decisions](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/platform-parity-decisions/); don't let drift happen by accident.

What if design uses web components as reference?

Translate patterns, don't copy DOM. Flexbox translates; hover, `vh`, and multi-column grids do not. Reference [Design Systems Basics](https://docs.wahwei/reactnative.codeguides.io/design-systems/design-systems-basics/) for RN component APIs.

How much buffer should estimates include for design churn?

Stable tokens and components: 10–15%. New gestures, camera, or motion: 25–40% plus spike day. See [Estimation & Risk on Mobile](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/estimation-and-risk-on-mobile/).

Should PMs learn React Native?

They should learn **mobile constraints**: safe areas, store review, OTA vs binary, offline. Code literacy helps read feasibility notes - not a requirement to write JSX.

## Related

* [Platform Parity Decisions](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/platform-parity-decisions/) - when iOS and Android differ on purpose
* [Working with Design & Motion](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/working-with-design-and-motion/) - feasibility before pixels final
* [Stakeholder Communication](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/stakeholder-communication/) - plain-language status updates
* [Design Systems Basics](https://docs.wahwei/reactnative.codeguides.io/design-systems/design-systems-basics/) - tokens and component APIs
* [Animations Basics](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/animations-basics/) - Animated vs Reanimated framing
* [Gesture Handler](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/react-native-gesture-handler/) - pan and scroll conflicts
* [Preview Builds on PRs](https://docs.wahwei/reactnative.codeguides.io/cicd/preview-builds-on-prs/) - QR demos for stakeholders

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
