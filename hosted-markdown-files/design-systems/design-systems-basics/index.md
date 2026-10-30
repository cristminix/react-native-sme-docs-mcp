# Design Systems Basics

10 examples to get you started with Design Systems - 7 basic and 3 intermediate.

Highlights / Design Systems Basics

* Design tokens are named constants - colors, spacing, type - not raw values in screens
* Semantic tokens (surface, textPrimary) survive palette overhauls better than gray-500
* A spacing scale on a 4px grid keeps padding and gaps consistent across components
* Component APIs expose variant, size, and disabled - not one-off style props per screen
* ThemeProvider centralizes active palette; screens call useTheme() instead of hard-coded hex
* Type token objects with as const and derive union types for variant props

## Prerequisites

Every example below uses built-in React Native primitives and a small token module - no third-party design library required. Scaffold a standard **Expo SDK 57** TypeScript app and replace `App.tsx` to run each snippet.

```bash
npx create-expo-app@latest MyDesignApp --template blank-typescript
cd MyDesignApp
npx expo start
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**. Tokens pair naturally with [Styling Basics](https://docs.wahwei/reactnative.codeguides.io/styling-layout/styling-basics/) and [Dark Mode & Color Schemes](https://docs.wahwei/reactnative.codeguides.io/styling-layout/dark-mode-and-color-schemes/).

---

## Basic Examples

### 1. Color Tokens as Named Constants

Replace scattered hex values with a single palette object. Components reference **roles**, not literals.

```tsx
// theme/colors.ts
export const colors = {
  brand: {
    primary: "#2563eb",
    primaryMuted: "#93c5fd",
    onPrimary: "#ffffff",
  },
  neutral: {
    50: "#f8fafc",
    100: "#f1f5f9",
    700: "#334155",
    900: "#0f172a",
  },
  feedback: {
    success: "#16a34a",
    danger: "#dc2626",
  },
} as const;
```

```tsx
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "./theme/colors";
 
export default function App() {
  return (
    <View style={styles.screen}>
      <Pressable style={styles.cta}>
        <Text style={styles.ctaLabel}>Continue</Text>
      </Pressable>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: colors.neutral[50] },
  cta: { backgroundColor: colors.brand.primary, padding: 16, borderRadius: 10, alignItems: "center" },
  ctaLabel: { color: colors.brand.onPrimary, fontWeight: "700", fontSize: 16 },
});
```

* **`as const`** narrows types so typos fail at compile time
* Name tokens by **intent** (`onPrimary`) not by value (`white`)
* Keep palette in one module - screens import tokens, never `#2563eb` directly
* When you adopt NativeWind or Tamagui later, this object becomes your `tailwind.config` or theme source

> **Related:** [Styling Basics](https://docs.wahwei/reactnative.codeguides.io/styling-layout/styling-basics/) - StyleSheet vs inline and token promotion

---

### 2. Spacing Scale on a 4px Grid

A spacing scale removes magic numbers. Most mobile design systems use multiples of **4**.

```tsx
// theme/spacing.ts
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;
```

```tsx
import { StyleSheet, Text, View } from "react-native";
import { spacing } from "./theme/spacing";
 
export default function App() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Order summary</Text>
      <Text style={styles.body}>3 items · arrives tomorrow</Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  card: {
    margin: spacing.md,
    padding: spacing.lg,
    gap: spacing.sm,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  title: { fontSize: 18, fontWeight: "600" },
  body: { fontSize: 15, lineHeight: 22 },
});
```

* **`gap`** on flex containers uses the same scale as `padding` and `margin`
* Document the grid in your design handoff - engineers and designers share `md = 16`
* Avoid odd values (`13`, `17`) unless correcting optical alignment on a specific component
* Spacing tokens compose with [Safe Areas & Notches](https://docs.wahwei/reactnative.codeguides.io/styling-layout/safe-areas-and-notches/) - safe area is additive, not a replacement for the scale

> **Related:** [Flexbox Deep Dive](https://docs.wahwei/reactnative.codeguides.io/styling-layout/flexbox-deep-dive/) - `gap` vs margin on first/last child

---

### 3. Typography Scale

Map **roles** (`title`, `body`, `label`) to `fontSize` + `lineHeight` pairs. Screens reference roles, not raw numbers.

```tsx
// theme/typography.ts
export const typography = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: "700" as const },
  title: { fontSize: 20, lineHeight: 28, fontWeight: "600" as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "400" as const },
  label: { fontSize: 13, lineHeight: 18, fontWeight: "500" as const },
} as const;
```

```tsx
import { StyleSheet, Text, View } from "react-native";
import { typography } from "./theme/typography";
 
export default function App() {
  return (
    <View style={styles.screen}>
      <Text style={styles.display}>Welcome back</Text>
      <Text style={styles.body}>Your saved items are ready to checkout.</Text>
      <Text style={styles.label}>LAST UPDATED · 2 MIN AGO</Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, gap: 8 },
  display: typography.display,
  body: typography.body,
  label: { ...typography.label, letterSpacing: 0.6, color: "#64748b" },
});
```

* Pair every `fontSize` with an explicit **`lineHeight`** - default line heights clip descenders on Android
* Load custom font families in one place - see [Typography Scale & Font Loading](https://docs.wahwei/reactnative.codeguides.io/styling-layout/typography-scale-and-font-loading/)
* Respect dynamic type: primitives should accept `maxFontSizeMultiplier` - see [Dynamic Type & Font Scaling](https://docs.wahwei/reactnative.codeguides.io/accessibility/dynamic-type-and-font-scaling/)

> **Related:** [Typography Scale & Font Loading](https://docs.wahwei/reactnative.codeguides.io/styling-layout/typography-scale-and-font-loading/) - expo-font and accessible text

---

### 4. Semantic Color Roles

Semantic tokens decouple components from palette values. `surface` means "card background" in both light and dark schemes.

```tsx
// theme/semantic.ts
export const light = {
  background: "#f8fafc",
  surface: "#ffffff",
  textPrimary: "#0f172a",
  textSecondary: "#64748b",
  border: "#e2e8f0",
  accent: "#2563eb",
} as const;
 
export const dark = {
  background: "#020617",
  surface: "#0f172a",
  textPrimary: "#f8fafc",
  textSecondary: "#94a3b8",
  border: "#334155",
  accent: "#60a5fa",
} as const;
```

```tsx
import { StyleSheet, Text, useColorScheme, View } from "react-native";
import { dark, light } from "./theme/semantic";
 
export default function App() {
  const scheme = useColorScheme() ?? "light";
  const theme = scheme === "dark" ? dark : light;
 
  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={{ color: theme.textPrimary, fontSize: 17, fontWeight: "600" }}>Inbox</Text>
        <Text style={{ color: theme.textSecondary, fontSize: 15 }}>12 unread messages</Text>
      </View>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 4 },
});
```

* Components reference **`theme.textPrimary`**, not `dark.textPrimary` - selection happens once at the screen or provider
* Static layout keys stay in `StyleSheet.create`; **colors apply at render** when they follow the scheme
* Semantic naming is the bridge to [Dark Mode & Color Schemes](https://docs.wahwei/reactnative.codeguides.io/styling-layout/dark-mode-and-color-schemes/) and white-label flavors

> **Related:** [Dark Mode & Color Schemes](https://docs.wahwei/reactnative.codeguides.io/styling-layout/dark-mode-and-color-schemes/) - `useColorScheme` and `Appearance.setColorScheme`

---

### 5. Radius and Elevation Tokens

Corner radius and shadow/elevation belong in the token layer - cards, chips, and sheets share the same values.

```tsx
// theme/shape.ts
import { Platform } from "react-native";
 
export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  full: 999,
} as const;
 
export const elevation = {
  card: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: { elevation: 3 },
    default: {},
  }),
  modal: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
    },
    android: { elevation: 8 },
    default: {},
  }),
} as const;
```

```tsx
import { StyleSheet, Text, View } from "react-native";
import { elevation, radius } from "./theme/shape";
 
export default function App() {
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Delivery ETA</Text>
        <Text style={styles.body}>Arrives by 6:30 PM</Text>
      </View>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#f1f5f9" },
  card: {
    backgroundColor: "#fff",
    borderRadius: radius.md,
    padding: 20,
    gap: 6,
    ...elevation.card,
  },
  title: { fontSize: 17, fontWeight: "600" },
  body: { fontSize: 15, color: "#475569" },
});
```

* iOS uses **shadow props**; Android uses **`elevation`** - `Platform.select` in tokens keeps components clean
* Elevated surfaces need an **opaque `backgroundColor`** - transparent cards produce invisible depth
* See [Shadows, Elevation & Borders](https://docs.wahwei/reactnative.codeguides.io/styling-layout/shadows-elevation-and-borders/) for wrapper vs clip patterns

> **Related:** [Shadows, Elevation & Borders](https://docs.wahwei/reactnative.codeguides.io/styling-layout/shadows-elevation-and-borders/) - cross-platform depth

---

### 6. ThemeProvider and useTheme

Centralize theme selection in a React context so nested components avoid prop drilling.

```tsx
// theme/ThemeProvider.tsx
import { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { dark, light } from "./semantic";
 
type Theme = typeof light;
const ThemeContext = createContext<Theme>(light);
 
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme() ?? "light";
  const theme = useMemo(() => (scheme === "dark" ? dark : light), [scheme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
 
export function useTheme() {
  return useContext(ThemeContext);
}
```

```tsx
// App.tsx
import { StyleSheet, Text, View } from "react-native";
import { ThemeProvider, useTheme } from "./theme/ThemeProvider";
 
function ProfileCard() {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={{ color: theme.textPrimary, fontWeight: "600" }}>Alex Kim</Text>
      <Text style={{ color: theme.textSecondary }}>Pro member</Text>
    </View>
  );
}
 
export default function App() {
  return (
    <ThemeProvider>
      <View style={styles.screen}>
        <ProfileCard />
      </View>
    </ThemeProvider>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 4 },
});
```

* Wrap the app root (inside `SafeAreaProvider`) - one provider for the whole tree
* `useMemo` on the palette object avoids re-rendering consumers when the reference is stable across schemes
* Extend with **brand flavor** keys later - see [Theming & Brand Flavors](https://docs.wahwei/reactnative.codeguides.io/design-systems/theming-and-brand-flavors/)

> **Related:** [Theming & Brand Flavors](https://docs.wahwei/reactnative.codeguides.io/design-systems/theming-and-brand-flavors/) - multi-brand without forks

---

### 7. Button Variant and Size API

Design-system components expose a **small, typed API** - `variant`, `size`, `disabled` - instead of per-screen style overrides.

```tsx
// components/Button.tsx
import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";
import { spacing } from "../theme/spacing";
 
type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";
 
type Props = PressableProps & {
  label: string;
  variant?: Variant;
  size?: Size;
};
 
const variantStyles: Record<Variant, { container: object; label: object }> = {
  primary: { container: { backgroundColor: "#2563eb" }, label: { color: "#fff" } },
  secondary: { container: { backgroundColor: "#e2e8f0" }, label: { color: "#0f172a" } },
  ghost: { container: { backgroundColor: "transparent" }, label: { color: "#2563eb" } },
};
 
const sizeStyles: Record<Size, { container: object; label: object }> = {
  sm: { container: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm }, label: { fontSize: 14 } },
  md: { container: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md }, label: { fontSize: 16 } },
  lg: { container: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg }, label: { fontSize: 17 } },
};
 
export function Button({ label, variant = "primary", size = "md", disabled, style, ...rest }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={[
        styles.base,
        variantStyles[variant].container,
        sizeStyles[size].container,
        disabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      <Text style={[styles.label, variantStyles[variant].label, sizeStyles[size].label]}>{label}</Text>
    </Pressable>
  );
}
 
const styles = StyleSheet.create({
  base: { borderRadius: 10, alignItems: "center" },
  label: { fontWeight: "600" },
  disabled: { opacity: 0.45 },
});
```

```tsx
import { View } from "react-native";
import { Button } from "./components/Button";
 
export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: "center", gap: 12, padding: 24 }}>
      <Button label="Continue" variant="primary" size="lg" />
      <Button label="Back" variant="ghost" size="md" />
      <Button label="Delete" variant="secondary" size="sm" disabled />
    </View>
  );
}
```

* **`accessibilityRole="button"`** is mandatory on custom pressables - see [accessibilityLabel & accessibilityRole](https://docs.wahwei/reactnative.codeguides.io/accessibility/accessibilitylabel-and-accessibilityrole/)
* Accept `style` last in the array so callers can override - document whether overrides are supported
* Map variants to tokens, not inline hex, before the component library grows

> **Related:** [accessibilityLabel & accessibilityRole](https://docs.wahwei/reactnative.codeguides.io/accessibility/accessibilitylabel-and-accessibilityrole/) - semantics on custom controls

---

## Intermediate Examples

### 8. Box Primitive with Token Props

A low-level **Box** (or `Stack`) primitive maps token props to style arrays - higher components compose it instead of raw `View`.

```tsx
// components/Box.tsx
import { View, type ViewProps } from "react-native";
import { spacing, type spacing as SpacingScale } from "../theme/spacing";
 
type SpacingKey = keyof typeof SpacingScale;
 
type Props = ViewProps & {
  p?: SpacingKey;
  px?: SpacingKey;
  gap?: SpacingKey;
  bg?: string;
};
 
export function Box({ p, px, gap, bg, style, ...rest }: Props) {
  return (
    <View
      style={[
        p != null && { padding: spacing[p] },
        px != null && { paddingHorizontal: spacing[px] },
        gap != null && { gap: spacing[gap] },
        bg != null && { backgroundColor: bg },
        style,
      ]}
      {...rest}
    />
  );
}
```

```tsx
import { Text } from "react-native";
import { Box } from "./components/Box";
 
export default function App() {
  return (
    <Box p="lg" gap="sm" bg="#f8fafc" style={{ flex: 1 }}>
      <Text style={{ fontSize: 20, fontWeight: "600" }}>Notifications</Text>
      <Box px="md" p="md" bg="#fff" style={{ borderRadius: 12 }}>
        <Text>Your order shipped.</Text>
      </Box>
    </Box>
  );
}
```

* Primitives stay **thin** - no business logic, only layout and surface tokens
* Prop names (`p`, `px`, `gap`) mirror design-tool shorthand designers already use
* Libraries like Tamagui formalize this pattern with compiled styles - see [Tamagui](https://docs.wahwei/reactnative.codeguides.io/design-systems/tamagui/)

> **Related:** [Tamagui](https://docs.wahwei/reactnative.codeguides.io/design-systems/tamagui/) - optimized token props at scale

---

### 9. Text Primitive with Tone and Role

Centralize text styling so screens pass **`tone="muted"`** instead of duplicating `fontSize` and `color`.

```tsx
// components/Text.tsx
import { Text as RNText, type TextProps } from "react-native";
import { typography } from "../theme/typography";
import { useTheme } from "../theme/ThemeProvider";
 
type Role = "display" | "title" | "body" | "label";
type Tone = "default" | "muted" | "accent" | "danger";
 
type Props = TextProps & { role?: Role; tone?: Tone };
 
export function Text({ role = "body", tone = "default", style, ...rest }: Props) {
  const theme = useTheme();
  const toneColor = {
    default: theme.textPrimary,
    muted: theme.textSecondary,
    accent: theme.accent,
    danger: "#dc2626",
  }[tone];
 
  return <RNText style={[typography[role], { color: toneColor }, style]} {...rest} />;
}
```

```tsx
import { ThemeProvider } from "./theme/ThemeProvider";
import { Text } from "./components/Text";
import { View } from "react-native";
 
export default function App() {
  return (
    <ThemeProvider>
      <View style={{ flex: 1, padding: 24, gap: 8 }}>
        <Text role="title">Payment method</Text>
        <Text tone="muted">Visa ending in 4242</Text>
        <Text role="label" tone="accent">
          CHANGE
        </Text>
      </View>
    </ThemeProvider>
  );
}
```

* Forward `...rest` so **`accessibilityLabel`** and **`maxFontSizeMultiplier`** pass through to the native `Text`
* `tone="danger"` should eventually map to `theme.feedback.danger` - keep feedback colors in tokens
* Pair with [Dynamic Type & Font Scaling](https://docs.wahwei/reactnative.codeguides.io/accessibility/dynamic-type-and-font-scaling/) on dense UI roles

> **Related:** [Dynamic Type & Font Scaling](https://docs.wahwei/reactnative.codeguides.io/accessibility/dynamic-type-and-font-scaling/) - `maxFontSizeMultiplier` on labels

---

### 10. Extending Tokens Without Breaking Callers

When design adds a new brand color, **extend** the token object and keep old keys - semver for tokens mirrors semver for npm packages.

```tsx
// theme/colors.v2.ts - additive change
import { colors as v1 } from "./colors";
 
export const colors = {
  ...v1,
  brand: {
    ...v1.brand,
    secondary: "#7c3aed", // new token - old screens unaffected
  },
} as const;
 
/** @deprecated Use colors.brand.primary - removed in v2.0 */
export const legacyPrimary = v1.brand.primary;
```

```tsx
// components/Badge.tsx - optional new variant, default unchanged
type Variant = "neutral" | "brand" | "brandSecondary";
 
const bg: Record<Variant, string> = {
  neutral: "#e2e8f0",
  brand: "#2563eb",
  brandSecondary: "#7c3aed",
};
 
export function Badge({ label, variant = "neutral" }: { label: string; variant?: Variant }) {
  return (
    <View style={{ backgroundColor: bg[variant], paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
      <Text style={{ color: variant === "neutral" ? "#0f172a" : "#fff", fontSize: 12, fontWeight: "600" }}>
        {label}
      </Text>
    </View>
  );
}
```

* **Additive** token keys are safe; **renaming** keys is a breaking change for every screen
* Deprecate with JSDoc and lint rules before removal - internal libraries use semver; see [Building an Internal Component Library](https://docs.wahwei/reactnative.codeguides.io/design-systems/building-an-internal-component-library/)
* Document token changes in Storybook stories so designers see new variants in isolation

> **Related:** [Building an Internal Component Library](https://docs.wahwei/reactnative.codeguides.io/design-systems/building-an-internal-component-library/) - semver and Storybook for UI packages

---

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
