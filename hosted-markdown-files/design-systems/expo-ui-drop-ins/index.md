# Expo UI Drop-Ins

Universal components vs SwiftUI/Compose-specific surfaces.

Highlights / Expo UI Drop-Ins

* @expo/ui Host is the required root for universal layouts - Column, Row, Text, Button
* Universal components render native UI on iOS and Android from one import path
* SwiftUI-specific APIs live under @expo/ui/swift-ui - modifiers, not RN style props
* Jetpack Compose APIs live under @expo/ui/jetpack-compose for Android-only surfaces
* RNHostView embeds standard RN subtrees inside native @expo/ui chrome
* Expo Go supports @expo/ui for prototyping - widgets and extensions need dev builds

**`@expo/ui`** lets Expo apps render **native UI** - SwiftUI on iOS, Jetpack Compose on Android - from React components. Use **universal** imports (`Host`, `Column`, `Button`) when one API should work on both platforms; reach for **`@expo/ui/swift-ui`** or **`@expo/ui/jetpack-compose`** when you need platform-specific modifiers, materials, or controls that have no cross-platform equivalent.

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx create-expo-app@latest MyExpoUIApp --template blank-typescript
cd MyExpoUIApp
npx expo install @expo/ui
```

```tsx
// screens/SettingsNativeScreen.tsx
import { Host, Column, Row, Text, Switch, Button, Spacer } from "@expo/ui";
 
export default function SettingsNativeScreen() {
  return (
    <Host style={{ flex: 1 }}>
      <Column spacing={16} padding={16}>
        <Text style={{ fontSize: 28, fontWeight: "700" }}>Notifications</Text>
 
        <Row spacing={12} alignment="center">
          <Column style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: "600" }}>Push alerts</Text>
            <Text style={{ fontSize: 14, opacity: 0.7 }}>Order updates and promos</Text>
          </Column>
          <Switch defaultValue={true} label="Push alerts" />
        </Row>
 
        <Spacer />
 
        <Button label="Save preferences" variant="borderedProminent" onPress={() => {}} />
      </Column>
    </Host>
  );
}
```

```tsx
// Platform-specific enhancement (iOS only file pattern)
// components/GlassHeader.ios.tsx
import { Host, Text, VStack } from "@expo/ui/swift-ui";
import { background, glassEffect, padding } from "@expo/ui/swift-ui/modifiers";
 
export function GlassHeader({ title }: { title: string }) {
  return (
    <Host matchContents>
      <VStack modifiers={[padding({ all: 16 }), glassEffect({ glass: { variant: "regular" } })]}>
        <Text modifiers={[background("transparent")]}>{title}</Text>
      </VStack>
    </Host>
  );
}
```

```tsx
// components/GlassHeader.tsx - Android fallback
import { Text, View } from "react-native";
 
export function GlassHeader({ title }: { title: string }) {
  return (
    <View style={{ padding: 16, backgroundColor: "#f1f5f9" }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>{title}</Text>
    </View>
  );
}
```

**When to reach for this:**

* Product wants **platform-native feel** - iOS switches, materials, Compose ripples - without maintaining two native codebases.
* You are building **hybrid screens**: native toolbar + RN body via `RNHostView`.
* **Widgets or Live Activities** need SwiftUI layouts - see [App Extensions & Widgets](https://docs.wahwei/reactnative.codeguides.io/ios-platform/app-extensions-and-widgets/).
* Designers reference **Apple HIG** or **Material 3 native** patterns, not custom flat RN chrome.

## Working Example

Hybrid settings screen: universal layout, `RNHostView` for a React Native chart island, and iOS-only glass header.

```tsx
// screens/HybridDashboardScreen.tsx
import { Host, Column, Row, Text, Button, RNHostView } from "@expo/ui";
import { useColorScheme } from "react-native";
import { GlassHeader } from "../components/GlassHeader";
import { SpendingChart } from "../components/SpendingChart"; // standard RN component
 
export default function HybridDashboardScreen() {
  const scheme = useColorScheme() ?? "light";
 
  return (
    <Host style={{ flex: 1, backgroundColor: scheme === "dark" ? "#0f172a" : "#f8fafc" }}>
      <Column spacing={0} style={{ flex: 1 }}>
        <GlassHeader title="Spending" />
 
        <Column spacing={16} padding={16} style={{ flex: 1 }}>
          <Row spacing={8} alignment="center">
            <Text style={{ fontSize: 15, opacity: 0.75 }}>This month</Text>
            <Text style={{ fontSize: 28, fontWeight: "700" }}>$1,284.00</Text>
          </Row>
 
          {/* RN island inside native layout */}
          <Host style={{ flex: 1, minHeight: 220, borderRadius: 12, overflow: "hidden" }}>
            <RNHostView style={{ flex: 1 }}>
              <SpendingChart />
            </RNHostView>
          </Host>
 
          <Button
            label="View transactions"
            variant="bordered"
            onPress={() => {}}
            accessibilityLabel="View transactions"
          />
        </Column>
      </Column>
    </Host>
  );
}
```

```tsx
// components/SpendingChart.tsx - ordinary React Native
import { View, Text, StyleSheet } from "react-native";
 
const BARS = [40, 65, 30, 80, 55];
 
export function SpendingChart() {
  return (
    <View style={styles.chart}>
      {BARS.map((h, i) => (
        <View key={i} style={[styles.bar, { height: h }]} />
      ))}
      <Text style={styles.caption}>RN chart inside RNHostView</Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  chart: { flex: 1, flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 16, backgroundColor: "#fff" },
  bar: { flex: 1, backgroundColor: "#2563eb", borderRadius: 4 },
  caption: { position: "absolute", bottom: 8, left: 16, fontSize: 12, color: "#64748b" },
});
```

**What this demonstrates:**

* **`Host`** roots every `@expo/ui` tree - universal layouts do not work without it.
* **`Column` / `Row`** use native stack layouts with `spacing` and `alignment` props instead of flexbox style objects.
* **`Button` / `Switch`** from `@expo/ui` are **native controls**, not `Pressable` wrappers.
* **`RNHostView`** embeds existing RN components inside native chrome - migration path for hybrid design systems.
* **`.ios.tsx` fallback pattern** for SwiftUI-only APIs (`glassEffect`) with RN fallback on Android.

## Deep Dive

### How It Works

* **`@expo/ui`** bridges React props to SwiftUI / Compose views via Expo Modules - rendering happens on the native UI thread where supported.
* **Universal imports** (`@expo/ui`) pick the platform implementation at build time - one component tree, two native backends.
* **Platform-specific imports** expose modifiers and views with no cross-platform mirror - use `*.ios.tsx` / `*.android.tsx` fallbacks.
* **`RNHostView`** creates a nested RN root inside a native layout - distinct from brownfield full-screen embed; see [RNHostView & Native UI Embedding](https://docs.wahwei/reactnative.codeguides.io/brownfield/rnhostview-and-native-ui-embedding/).
* **Styling model** - universal components accept limited `style` objects; SwiftUI surfaces prefer **modifiers** from `@expo/ui/swift-ui/modifiers`.

### Universal vs Platform-Specific

| Import | Renders | Use for |
| --- | --- | --- |
| `@expo/ui` (`Host`, `Column`, `Button`) | SwiftUI + Compose | Cross-platform native chrome |
| `@expo/ui/swift-ui` | SwiftUI only | Glass, materials, widget layouts |
| `@expo/ui/jetpack-compose` | Compose only | Android Material widgets |
| `react-native` (`View`, `Pressable`) | RN layout | Custom DS, lists, Skia, legacy screens |

### Modifier Pattern (SwiftUI)

```tsx
import { Text, VStack } from "@expo/ui/swift-ui";
import { font, foregroundStyle, padding } from "@expo/ui/swift-ui/modifiers";
 
<Text
  modifiers={[
    font({ weight: "semibold", size: 17 }),
    foregroundStyle("#111111"),
    padding({ horizontal: 16 }),
  ]}
>
  Hello
</Text>
```

Modifiers are **not** RN `style` - they map to SwiftUI modifier chains. Widget extensions use the same vocabulary - see [App Extensions & Widgets](https://docs.wahwei/reactnative.codeguides.io/ios-platform/app-extensions-and-widgets/).

### When to Mix with a Design System Library

| Layer | Tool |
| --- | --- |
| Native chrome (toolbar, toggles) | `@expo/ui` |
| Dense lists and forms | RN + Paper / Tamagui / NativeWind |
| Brand tokens | Your token module - see [Design Systems Basics](https://docs.wahwei/reactnative.codeguides.io/design-systems/design-systems-basics/) |
| White-label flavors | Theme config - see [Theming & Brand Flavors](https://docs.wahwei/reactnative.codeguides.io/design-systems/theming-and-brand-flavors/) |

## Gotchas

* **Missing `Host` wrapper** - Layout children fail to mount. **Fix:** Every `@expo/ui` screen starts with `<Host>`.
* **Using `<View>` inside SwiftUI widget files** - Widget targets reject RN primitives. **Fix:** `@expo/ui/swift-ui` only in extension bundles.
* **Expecting identical pixels on iOS and Android** - Universal components map to platform idioms; spacing may differ. **Fix:** Design for roles, not pixel parity.
* **RNHostView without bounded height** - Chart island collapses to zero. **Fix:** Set `minHeight` or `flex: 1` on the `Host` wrapper.
* **Importing SwiftUI modifiers on Android** - Build failure. **Fix:** Platform-specific files or universal components only.
* **Replacing entire app with @expo/ui** - Lists, navigation, and third-party RN libs still need RN layout. **Fix:** Drop-in native chrome selectively, not wholesale replacement.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| **@expo/ui universal** | Native switches, buttons, hybrid screens | Every screen is a complex virtualized list |
| **@expo/ui/swift-ui** | iOS materials, widgets, Live Activities | Android-only app |
| **React Native Paper** | Material Design in RN views | You need true Compose widgets |
| **Tamagui / NativeWind** | Custom branded DS across RN tree | Platform-native toggle and glass effects |
| **Custom TurboModule views** | Bespoke native control not in @expo/ui | @expo/ui already ships the primitive |

## FAQs

Does @expo/ui work in Expo Go on SDK 57?

Yes for universal components and `RNHostView` prototyping. Widget extensions and some platform-only targets require `expo prebuild` and dev builds.

What is Host?

The root container that bridges React children to native SwiftUI/Compose hierarchies. Wrap every `@expo/ui` layout tree with `<Host>`.

When should I use RNHostView?

When native chrome (toolbar, segmented control) should wrap **existing RN screens** without rewriting them. See [RNHostView & Native UI Embedding](https://docs.wahwei/reactnative.codeguides.io/brownfield/rnhostview-and-native-ui-embedding/).

Can I use StyleSheet with @expo/ui?

Universal components accept limited style props. Prefer layout props (`spacing`, `padding`, `alignment`). Keep `StyleSheet` for `RNHostView` children.

SwiftUI modifiers vs RN style?

Modifiers compile to SwiftUI chains (`font`, `padding`, `glassEffect`). They do not cascade like CSS. Use platform files when modifiers have no Android equivalent.

How does @expo/ui relate to React Native Paper?

Paper renders **Material in RN views**. `@expo/ui` renders **native Compose/SwiftUI**. You can combine them - Paper forms below a native `@expo/ui` header.

Accessibility with native components?

Set `label` / `accessibilityLabel` props where exposed. Test with VoiceOver and TalkBack - native controls behave differently from `Pressable`. See [Accessibility Basics](https://docs.wahwei/reactnative.codeguides.io/accessibility/accessibility-basics/).

## Related

* [Design Systems Basics](https://docs.wahwei/reactnative.codeguides.io/design-systems/design-systems-basics/) - tokens for RN islands inside native chrome
* [RNHostView & Native UI Embedding](https://docs.wahwei/reactnative.codeguides.io/brownfield/rnhostview-and-native-ui-embedding/) - hybrid layout patterns
* [App Extensions & Widgets](https://docs.wahwei/reactnative.codeguides.io/ios-platform/app-extensions-and-widgets/) - SwiftUI widget layouts
* [React Native Paper](https://docs.wahwei/reactnative.codeguides.io/design-systems/react-native-paper/) - Material components in RN views
* [Styling Basics](https://docs.wahwei/reactnative.codeguides.io/styling-layout/styling-basics/) - RN layout for RNHostView children
* [Accessibility Basics](https://docs.wahwei/reactnative.codeguides.io/accessibility/accessibility-basics/) - testing native vs RN controls

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4). 636f64656775696465732e696f7c6367696f3933327c323032363037

Reviewed by Chris St. John·Last updated Jul 19, 2026
