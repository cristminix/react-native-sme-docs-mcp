# TypeScript in RN Basics

10 examples to get you started with TypeScript in RN - 7 basic and 3 intermediate.

Highlights / TypeScript in RN Basics

* Extend `expo/tsconfig.base` and keep `strict: true` - Expo scaffolds already ship this layout
* Name prop interfaces `ComponentNameProps`; avoid `React.FC` because it adds implicit `children`
* Use `StyleProp<ViewStyle>` when a component accepts style overrides or style arrays
* Type route params at the screen boundary - untyped `useLocalSearchParams()` hides missing keys
* Treat API JSON as `unknown` until Zod validates it; `z.infer` keeps runtime and compile-time in sync
* `Pick`, `Omit`, and `ComponentProps` derive shapes from one source instead of duplicate interfaces

## Prerequisites

Expo projects scaffold with TypeScript by default. Start from the blank TypeScript template so `tsconfig.json`, Metro, and the SDK pin are already aligned.

```bash
npx create-expo-app@latest MyTypedApp --template blank-typescript
cd MyTypedApp
```

Confirm the SDK and React pins in `package.json`:

```json
{
  "dependencies": {
    "expo": "~57.0.4",
    "react": "19.2.3",
    "react-native": "0.86.0"
  }
}
```

Conventions used throughout:

1. Every React Native screen file is `.tsx`. Plain `.ts` is for schemas, API clients, and shared types.
2. `strict: true` in `tsconfig.json` - the default when you extend Expo's base config.
3. Import types from `react-native` (`StyleProp`, `ViewStyle`, `GestureResponderEvent`) instead of redeclaring them.

> **Tooling:** Run `npx tsc --noEmit` in CI to catch type errors before a native build. Pair it with ESLint's `@typescript-eslint` rules for unused variables and unsafe `any`.

---

## Basic Examples

### 1. Strict tsconfig for Expo

Extend Expo's published base config instead of hand-rolling compiler options that drift from the SDK.

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

* `expo/tsconfig.base` ships with Expo SDK 57 and already sets `jsx`, `moduleResolution`, and paths Metro expects
* `strict: true` enables `strictNullChecks`, `noImplicitAny`, and related flags - catch `undefined` route params and untyped API payloads early
* The `.expo/types/**/*.ts` include picks up **generated route types** when typed routes are enabled
* Do not disable `strict` to silence errors - fix the boundary (props, params, fetch) or add a narrow escape hatch with a comment

> **Related:** [Gradual Typing in Brownfield Apps](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/gradual-typing-in-brownfield-apps/) - tightening strictness without blocking feature work | [Expo Router Typed Routes](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/expo-router-typed-routes/) - generated types land in `.expo/types`

---

### 2. Typing Component Props

Define the shape of a component's props as a TypeScript interface and destructure in the parameter list.

```tsx
import { View, Text, StyleSheet } from "react-native";
 
interface ProfileHeaderProps {
  name: string;
  subtitle: string;
}
 
function ProfileHeader({ name, subtitle }: ProfileHeaderProps) {
  return (
    <View style={styles.header}>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  header: { padding: 16, alignItems: "center" },
  name: { fontSize: 20, fontWeight: "600" },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: 4 },
});
```

* Name the interface `<ComponentName>Props` - easy to find with search and safe to extend later
* Prefer **`interface`** for component props; declaration merging makes extending straightforward
* Never use `React.FC` - it adds an implicit `children` prop you often do not want and is falling out of favor in 2026
* Export the props interface when the component lives in a design system - consumers can `extends` or `Pick` from it

> **Related:** [Typing Components & Props](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-components-and-props/) - generics, discriminated unions, and reusable prop contracts

---

### 3. Optional Props and Union Literals

Mark props optional with `?`, then supply defaults in the destructure so callers can omit them safely.

```tsx
import { Pressable, Text, StyleSheet } from "react-native";
 
interface ActionButtonProps {
  label: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  onPress: () => void;
}
 
function ActionButton({
  label,
  variant = "primary",
  disabled = false,
  onPress,
}: ActionButtonProps) {
  return (
    <Pressable
      style={[styles.base, variant === "primary" ? styles.primary : styles.secondary]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}
 
const styles = StyleSheet.create({
  base: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  primary: { backgroundColor: "#2563eb" },
  secondary: { backgroundColor: "#e5e7eb" },
  label: { fontWeight: "600", color: "#fff" },
});
```

* `variant?: ...` makes the prop optional; TypeScript adds `undefined` to its type
* Default values in the destructure (`variant = "primary"`) fill in when the caller omits the prop
* A **union literal type** (`"primary" | "secondary"`) restricts callers to valid options - autocomplete works in the editor
* Do not use `defaultProps` - it is deprecated for function components in React 19

> **Related:** [Typing Components & Props](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-components-and-props/) - variant props and discriminated unions for mode-specific fields

---

### 4. StyleProp for Reusable Style Props

When a component accepts a `style` override, type it with `StyleProp` so callers can pass a single object or an array.

```tsx
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
 
interface CardProps {
  title: string;
  style?: StyleProp<ViewStyle>;
}
 
function Card({ title, style }: CardProps) {
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  card: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  title: { fontSize: 18, fontWeight: "600" },
});
 
// Usage - single object or array both type-check
// <Card title="Hello" style={{ marginTop: 24 }} />
// <Card title="Hello" style={[styles.card, isActive && styles.active]} />
```

* `StyleProp<ViewStyle>` accepts a style object, an array of styles, `false`, or `undefined` - matching how RN merges style arrays
* Use `TextStyle` and `ImageStyle` for text and image wrappers respectively; do not reuse `ViewStyle` on `Text`
* Merge with `[styles.card, style]` so the caller's override wins without replacing your base layout
* For `Pressable`, type `style` as `StyleProp<ViewStyle> | ((state) => StyleProp<ViewStyle>)` when you need pressed-state styling

> **Related:** [Utility Types for RN](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/utility-types-for-rn/) - `StyleProp`, `ComponentProps`, and style-safe helpers | [Styling Basics](https://docs.wahwei/reactnative.codeguides.io/styling-layout/styling-basics/) - `StyleSheet.create` and the RN styling model

---

### 5. Typing useState

Let inference do the work, and add an explicit generic when the initial value does not carry the full type.

```tsx
import { useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
 
interface User {
  id: string;
  name: string;
}
 
export default function UserPanel() {
  const [count, setCount] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
 
  if (loading) {
    return <ActivityIndicator style={styles.centered} />;
  }
 
  return (
    <View style={styles.centered}>
      <Text>Count: {count}</Text>
      <Text>{user?.name ?? "No user loaded"}</Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
});
```

* Skip the generic when `useState(initial)` has enough info - `useState(0)` is already `number`
* Supply `useState<User | null>(null)` when the value could later be richer - otherwise TypeScript pins it to `null`
* Unions like `User | null` make the "not loaded yet" state explicit - consumers must narrow before using fields
* Do **not** store derived values in state; compute during render from simpler state

> **Related:** [Props, State & Re-renders on Mobile](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/props-state-and-re-renders-on-mobile/) - when state updates trigger native re-renders

---

### 6. Typing Pressable Handlers

Use React Native's exported event types so handler parameters stay typed without `any`.

```tsx
import { useState } from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  type GestureResponderEvent,
} from "react-native";
 
export default function LikeButton() {
  const [liked, setLiked] = useState(false);
 
  const handlePress = (event: GestureResponderEvent) => {
    setLiked((prev) => !prev);
    console.log("pressed at", event.nativeEvent.pageX, event.nativeEvent.pageY);
  };
 
  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      onPress={handlePress}
    >
      <Text style={styles.label}>{liked ? "Liked" : "Like"}</Text>
    </Pressable>
  );
}
 
const styles = StyleSheet.create({
  button: { padding: 12, borderRadius: 8, backgroundColor: "#2563eb" },
  pressed: { opacity: 0.85 },
  label: { color: "#fff", fontWeight: "600" },
});
```

* `GestureResponderEvent` is the standard type for `onPress`, `onPressIn`, and `onPressOut` on `Pressable` and `TouchableOpacity`
* Read touch coordinates from `event.nativeEvent` - the shape is stable across iOS and Android
* If you keep the handler inline, you can skip the annotation - TypeScript infers it from `onPress`'s signature
* For long-press menus, type `onLongPress` the same way; for `TextInput`, use `NativeSyntheticEvent<TextInputChangeEventData>`

> **Related:** [Typing Components & Props](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-components-and-props/) - callback props and event handler contracts

---

### 7. Utility Types (Pick, Omit, Partial)

Derive new types from existing ones instead of writing duplicate interfaces that drift.

```ts
interface Device {
  id: string;
  name: string;
  platform: "ios" | "android";
  lastSeenAt: string;
}
 
type DeviceSummary = Pick<Device, "id" | "name">;
type NewDevice = Omit<Device, "id" | "lastSeenAt">;
type DevicePatch = Partial<Omit<Device, "id">>;
```

* `Pick<T, K>` keeps only the listed keys; `Omit<T, K>` removes them - compose both to express API shapes
* `Partial<T>` makes every property optional; handy for PATCH endpoints and form drafts
* `Required<T>` and `Readonly<T>` round out the most-used utilities for immutable config objects
* Changing the source interface automatically flows through - no hand-synced duplicates across screens

> **Related:** [Utility Types for RN](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/utility-types-for-rn/) - `ComponentProps`, `StyleProp`, and RN-specific helpers

---

## Intermediate Examples

### 8. Typed Route Params with Expo Router

Type search params at the screen boundary so missing or mistyped keys fail at compile time.

```tsx
import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
 
type ProductParams = {
  id: string;
  preview?: string;
};
 
export default function ProductScreen() {
  const { id, preview } = useLocalSearchParams<ProductParams>();
 
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Product {id}</Text>
      {preview ? <Text style={styles.badge}>Preview mode</Text> : null}
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24 },
  title: { fontSize: 22, fontWeight: "600" },
  badge: { marginTop: 8, color: "#2563eb" },
});
```

* `useLocalSearchParams<Params>()` types the return value - optional keys use `?` in the params type
* Params arrive as **strings** from the URL; parse numbers with `Number(id)` or validate with Zod before use
* For dynamic segments like `app/product/[id].tsx`, keep param names aligned with the file name (`id` matches `[id]`)
* Prefer **generated typed routes** (`experiments.typedRoutes` in `app.json`) for links that stay in sync with the file tree

> **Related:** [Typing Navigation & Route Params](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-navigation-and-route-params/) - React Navigation stacks and param validation | [Expo Router Typed Routes](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/expo-router-typed-routes/) - generated `Href` types and keeping them current

---

### 9. Typed fetch with Zod

Guarantee at runtime that API responses match the TypeScript type you ship to screens.

```ts
import { z } from "zod";
 
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});
 
type User = z.infer<typeof UserSchema>;
 
async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`https://api.example.com/users/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json: unknown = await res.json();
  return UserSchema.parse(json);
}
```

* Typing a response as `Promise<User>` is a **lie** if you never validate - mobile APIs change without warning
* A Zod schema validates at runtime **and** infers the TypeScript type, so there is only one thing to maintain
* Treat the raw response as `unknown` until it passes the schema - no accidental `any` leaking into UI components
* On slow networks, pair validated fetch helpers with TanStack Query so every screen shares the same typed `queryFn`

> **Related:** [Typing API Responses & Zod](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-api-responses-and-zod/) - error shapes, schema composition, and offline caches

---

### 10. ComponentProps for Extending RN Primitives

Reuse a built-in component's prop surface when wrapping `Pressable`, `Text`, or `TextInput`.

```tsx
import {
  Pressable,
  Text,
  StyleSheet,
  type ComponentProps,
} from "react-native";
 
type PressableProps = ComponentProps<typeof Pressable>;
 
interface LinkButtonProps extends Omit<PressableProps, "children"> {
  label: string;
}
 
function LinkButton({ label, style, ...pressableProps }: LinkButtonProps) {
  return (
    <Pressable style={[styles.link, style]} {...pressableProps}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}
 
const styles = StyleSheet.create({
  link: { paddingVertical: 8 },
  label: { color: "#2563eb", fontWeight: "600" },
});
```

* `ComponentProps<typeof Pressable>` captures every prop `Pressable` accepts - `onPress`, `disabled`, `accessibilityRole`, and more
* `Omit<..., "children">` removes props you replace with your own API (`label` instead of free-form `children`)
* Spread `...pressableProps` last so callers can override defaults without re-listing every RN prop
* The same pattern works for `TextInput`, `ScrollView`, and third-party components that forward refs

> **Related:** [Utility Types for RN](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/utility-types-for-rn/) - `ComponentProps`, `StyleProp`, and composition patterns | [Typing Native Module APIs](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-native-module-apis/) - bridging untyped native returns into safe TS boundaries

---

### External Related Links

* [react.dev](https://react.dev/) - core React concepts RN builds on
* [reactnative.dev/docs](https://reactnative.dev/docs/getting-started) - full RN documentation
* [MDN Web Docs](https://developer.mozilla.org/) - JavaScript fundamentals

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4). Y29kZWd1aWRlcy5pb3xjZ2lvODcyfDIwMjYwNw

Reviewed by Chris St. John·Last updated Jul 19, 2026
