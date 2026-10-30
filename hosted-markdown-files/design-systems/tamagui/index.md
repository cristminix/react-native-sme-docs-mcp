# Tamagui

Cross-platform design system with optimized style compilation.

Highlights / Tamagui

* Tamagui compiles style props to flat RN objects - fewer allocations in hot paths
* Define tokens once in tamagui.config.ts - colors, space, size, radius
* Styled components accept variant props mapped to token keys, not raw numbers
* TamaguiProvider wraps the app - theme and media queries flow through context
* @tamagui/config provides a sensible default theme to fork, not adopt blindly
* Expo requires react-native-reanimated and a Metro resolver tweak for optional deps

Tamagui is a **universal design system** for React Native (and web): typed tokens, styled primitives (`Stack`, `Text`, `Button`), and a compiler that flattens style props into optimized objects. On **Expo SDK 57**, it fits teams that want **component + token discipline** beyond utility classes - with performance tuned for list-heavy apps.

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx create-expo-app@latest MyTamaguiApp --template blank-typescript
cd MyTamaguiApp
npx expo install tamagui @tamagui/config @tamagui/core react-native-reanimated react-native-safe-area-context
```

```ts
// tamagui.config.ts
import { config as defaultConfig } from "@tamagui/config";
import { createTamagui } from "tamagui";
 
export const config = createTamagui({
  ...defaultConfig,
  tokens: {
    ...defaultConfig.tokens,
    color: {
      ...defaultConfig.tokens.color,
      brand: "#2563eb",
      brandMuted: "#93c5fd",
    },
  },
  themes: {
    ...defaultConfig.themes,
    light: {
      ...defaultConfig.themes.light,
      brand: "#2563eb",
    },
    dark: {
      ...defaultConfig.themes.dark,
      brand: "#60a5fa",
    },
  },
});
 
export type AppConfig = typeof config;
declare module "tamagui" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends AppConfig {}
}
```

```tsx
// App.tsx
import { TamaguiProvider, Theme, YStack, Text, Button } from "tamagui";
import { useColorScheme } from "react-native";
import { config } from "./tamagui.config";
 
export default function App() {
  const scheme = useColorScheme() ?? "light";
 
  return (
    <TamaguiProvider config={config} defaultTheme={scheme}>
      <Theme name={scheme}>
        <YStack flex={1} padding="$4" backgroundColor="$background" gap="$3">
          <Text fontSize="$6" fontWeight="700" color="$color">
            Tamagui on Expo
          </Text>
          <Button theme="active" backgroundColor="$brand" color="white">
            Continue
          </Button>
        </YStack>
      </Theme>
    </TamaguiProvider>
  );
}
```

```json
{
  "expo": {
    "plugins": ["react-native-reanimated/plugin"]
  }
}
```

**When to reach for this:**

* You need **typed variants** (`size="$4"`, `color="$brand"`) with compile-time validation.
* Lists and feeds are performance-sensitive - Tamagui's **style flattening** reduces per-render work.
* Design system spans **mobile and web** from one token file.
* You want **styled primitives** (`Button`, `Card`) rather than only utility classes.

## Working Example

Product card with variants, dark theme, and a memoized list row built on Tamagui tokens.

```tsx
// components/ProductCard.tsx
import { Card, H4, Paragraph, XStack, YStack, styled } from "tamagui";
 
const Badge = styled(Paragraph, {
  name: "Badge",
  fontSize: "$1",
  fontWeight: "700",
  paddingHorizontal: "$2",
  paddingVertical: "$1",
  borderRadius: "$10",
  variants: {
    tone: {
      sale: { backgroundColor: "$red4", color: "$red11" },
      new: { backgroundColor: "$green4", color: "$green11" },
    },
  } as const,
  defaultVariants: { tone: "new" },
});
 
type Props = {
  title: string;
  price: string;
  badge?: "sale" | "new";
};
 
export function ProductCard({ title, price, badge = "new" }: Props) {
  return (
    <Card elevate bordered padding="$4" backgroundColor="$background">
      <YStack gap="$2">
        <XStack justifyContent="space-between" alignItems="center">
          <H4 color="$color" numberOfLines={1}>
            {title}
          </H4>
          {badge && <Badge tone={badge}>{badge === "sale" ? "SALE" : "NEW"}</Badge>}
        </XStack>
        <Paragraph color="$color11" fontSize="$5" fontWeight="600">
          {price}
        </Paragraph>
      </YStack>
    </Card>
  );
}
```

```tsx
// screens/CatalogScreen.tsx
import { FlatList } from "react-native";
import { YStack, Text } from "tamagui";
import { ProductCard } from "../components/ProductCard";
 
const PRODUCTS = [
  { id: "1", title: "Trail Runner Pro", price: "$129", badge: "new" as const },
  { id: "2", title: "Merino Base Layer", price: "$79", badge: "sale" as const },
  { id: "3", title: "Softshell Jacket", price: "$199", badge: "new" as const },
];
 
export function CatalogScreen() {
  return (
    <YStack flex={1} padding="$4" backgroundColor="$background" gap="$3">
      <Text fontSize="$8" fontWeight="800" color="$color">
        Catalog
      </Text>
      <FlatList
        data={PRODUCTS}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <YStack height="$3" />}
        renderItem={({ item }) => (
          <ProductCard title={item.title} price={item.price} badge={item.badge} />
        )}
      />
    </YStack>
  );
}
```

```tsx
// app/_layout.tsx
import { TamaguiProvider, Theme } from "tamagui";
import { Slot } from "expo-router";
import { useColorScheme } from "react-native";
import { config } from "../tamagui.config";
 
export default function RootLayout() {
  const scheme = useColorScheme() ?? "light";
  return (
    <TamaguiProvider config={config} defaultTheme={scheme}>
      <Theme name={scheme}>
        <Slot />
      </Theme>
    </TamaguiProvider>
  );
}
```

**What this demonstrates:**

* **`$` token shorthand** - `$4` resolves to spacing token `4` from config.
* **`styled()` with `variants`** - `tone="sale"` maps to theme-aware colors, not inline hex.
* **`Theme name={scheme}`** swaps light/dark theme objects from `tamagui.config.ts`.
* **`Card elevate bordered`** - Tamagui shorthand props compile to platform-appropriate elevation.
* **FlatList + Tamagui** - row component uses stable variant props; separator uses token height.

## Deep Dive

### How It Works

* **`createTamagui`** merges your tokens, themes, fonts, and media into one config object.
* **`TamaguiProvider`** supplies config and active theme to the React tree.
* **Styled components** resolve props like `padding="$4"` to numeric values at compile/runtime and flatten to RN style objects.
* **Themes** are maps of token name → value per appearance (`light`, `dark`). Components reference `$color`, `$background`, not hard-coded hex.
* **Optional compiler** (`@tamagui/compiler` or Babel plugin) can further optimize static trees - evaluate when bundle size matters.

### Token Layers

| Layer | Example | Purpose |
| --- | --- | --- |
| `tokens.color.brand` | `#2563eb` | Raw palette |
| `themes.light.brand` | `#2563eb` | Theme-specific role |
| Component prop | `backgroundColor="$brand"` | Consumption in JSX |

### TypeScript Notes

```ts
declare module "tamagui" {
  interface TamaguiCustomConfig extends AppConfig {}
}
```

* The module augmentation enables **autocomplete** on `$` tokens and variant names.
* Use `as const` on `variants` objects so `tone` is `"sale" | "new"`, not `string`.
* Export `AppConfig` from `tamagui.config.ts` for Storybook decorators that need typed themes.

### Metro on Expo

Some Tamagui optional packages need explicit resolution. If Metro fails on `@tamagui/*` subpaths:

```js
// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
config.resolver.unstable_enablePackageExports = true;
module.exports = config;
```

Run `npx expo start --clear` after adding Tamagui to an existing project.

## Gotchas

* **Missing `TamaguiProvider`** - `$` tokens resolve to undefined styles. **Fix:** Wrap root layout, same placement as other theme providers.
* **Theme name mismatch** - `Theme name="dark"` without a `dark` key in `themes`. **Fix:** Fork `@tamagui/config` themes or define both `light` and `dark`.
* **Mixing Tamagui and raw `View`** - Spacing rhythm breaks. **Fix:** Use `YStack`/`XStack` for layout islands; migrate incrementally.
* **Inline hex on Tamagui components** - Defeats theming. **Fix:** Add token + theme entry, reference `$brand`.
* **Reanimated plugin order** - Reanimated Babel plugin must be **last** in `babel.config.js`. **Fix:** Follow Expo Reanimated docs when enabling animations alongside Tamagui.
* **Web-only props on native** - Some shorthand props target web CSS. **Fix:** Test on both platforms; use `Platform.select` in custom styled components when needed.

Y29kZWd1aWRlcy5pb3xjZ2lvOTcyfDIwMjYwNw==

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| **Tamagui** | Token-typed components + web sharing | Team wants only Tailwind strings |
| **NativeWind** | Utility-class ergonomics | You need first-class variant APIs on primitives |
| **React Native Paper** | Material Design out of the box | Heavily custom brand language |
| **StyleSheet + tokens** | Minimal dependencies | Large DS with many variant matrices |
| **@expo/ui** | Native SwiftUI/Compose chrome | Custom design language unrelated to platform widgets |

## FAQs

Does Tamagui work with Expo SDK 57?

Yes. Install `tamagui`, `@tamagui/config`, and `react-native-reanimated` via `npx expo install`. Wrap the app in `TamaguiProvider` and load `tamagui.config.ts` at the root layout.

What does the $ prefix mean?

`$4` references the `space` token `4`. `$color` references the active theme's `color` role. It is Tamagui's shorthand for token lookup - not a string literal.

How do I customize the default theme?

Spread `defaultConfig` from `@tamagui/config`, override `tokens` and `themes`, and keep `createTamagui` types via module augmentation. Do not copy the entire default theme blindly - trim unused tokens to reduce bundle size.

Tamagui vs NativeWind?

NativeWind maps **Tailwind classes** to styles. Tamagui provides **styled components + tokens** with a variant system. Teams allergic to `className` often prefer Tamagui; teams from web Tailwind often prefer NativeWind.

How does dark mode work?

Define `light` and `dark` in `themes`, wrap with `<Theme name={scheme}>`, and drive `scheme` from `useColorScheme`. See [Dark Mode & Color Schemes](https://docs.wahwei/reactnative.codeguides.io/styling-layout/dark-mode-and-color-schemes/).

Can I use Tamagui with FlatList?

Yes. Keep `renderItem` lean; extract `ProductCard` as a separate component. Avoid creating new style objects inline in the render callback.

Does Tamagui help accessibility?

Tamagui components forward props to RN primitives - set `accessibilityRole`, `accessibilityLabel`, and test with VoiceOver/TalkBack. See [Accessibility Basics](https://docs.wahwei/reactnative.codeguides.io/accessibility/accessibility-basics/).

## Related

* [Design Systems Basics](https://docs.wahwei/reactnative.codeguides.io/design-systems/design-systems-basics/) - token and variant patterns Tamagui formalizes
* [NativeWind (Tailwind for RN)](https://docs.wahwei/reactnative.codeguides.io/design-systems/nativewind-tailwind-for-rn/) - utility-class alternative
* [Style Performance](https://docs.wahwei/reactnative.codeguides.io/styling-layout/style-performance/) - why flattened styles matter in lists
* [Dark Mode & Color Schemes](https://docs.wahwei/reactnative.codeguides.io/styling-layout/dark-mode-and-color-schemes/) - system scheme sync
* [Typography Scale & Font Loading](https://docs.wahwei/reactnative.codeguides.io/styling-layout/typography-scale-and-font-loading/) - custom fonts in Tamagui config
* [Building an Internal Component Library](https://docs.wahwei/reactnative.codeguides.io/design-systems/building-an-internal-component-library/) - publishing styled primitives

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 19, 2026
