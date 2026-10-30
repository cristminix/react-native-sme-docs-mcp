# Typing Components & Props

Generics, discriminated unions, and reusable prop contracts turn React Native components into self-documenting APIs. Strong prop types catch invalid combinations at compile time - before they surface as layout bugs on iOS and Android.

Highlights / Typing Components & Props

* Props interfaces document the public contract - keep them narrow and explicit
* Discriminated unions model variant components without optional-prop soup
* Generic components preserve item types through lists and render props
* Extend ViewProps or PressableProps instead of re-declaring layout props
* Omit and Pick build reusable base contracts shared across a design system
* React 19 function components infer children from props - type them when you restrict layout

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import { Pressable, StyleSheet, Text, View, type ViewProps } from "react-native";
 
// Reusable base contract - shared layout + testID
type BoxProps = ViewProps & {
  testID?: string;
};
 
// Discriminated union - only valid prop combos compile
type StatusBadgeProps =
  | { variant: "success"; message: string }
  | { variant: "error"; message: string; onRetry: () => void }
  | { variant: "loading" };
 
export function StatusBadge(props: StatusBadgeProps) {
  if (props.variant === "loading") {
    return <Text style={styles.muted}>Loading…</Text>;
  }
  if (props.variant === "error") {
    return (
      <View style={styles.row}>
        <Text style={styles.error}>{props.message}</Text>
        <Pressable onPress={props.onRetry}>
          <Text style={styles.link}>Retry</Text>
        </Pressable>
      </View>
    );
  }
  return <Text style={styles.success}>{props.message}</Text>;
}
 
// Generic list row - T flows from caller to renderItem
type ListProps<T> = BoxProps & {
  data: readonly T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
};
 
export function SimpleList<T>({ data, keyExtractor, renderItem, ...viewProps }: ListProps<T>) {
  return (
    <View {...viewProps}>
      {data.map((item) => (
        <View key={keyExtractor(item)}>{renderItem(item)}</View>
      ))}
    </View>
  );
}
```

**When to reach for this:** You are building shared UI primitives, list rows, or variant-driven components and want TypeScript to reject impossible prop combinations before runtime.

## Working Example

```tsx
import { memo } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
 
// ---- Shared contracts ----
 
type WithTestID = { testID?: string };
 
type RowBaseProps = WithTestID & {
  title: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
};
 
// Discriminated media slot - icon XOR avatar, never both
type MediaProps =
  | { media: "icon"; iconName: "star" | "pin" }
  | { media: "avatar"; uri: string }
  | { media?: "none" };
 
type ListRowProps = RowBaseProps & MediaProps & {
  onPress?: PressableProps["onPress"];
  selected?: boolean;
};
 
function ListRow(props: ListRowProps) {
  const { title, subtitle, onPress, selected, testID, style } = props;
 
  const media =
    props.media === "icon" ? (
      <Text style={styles.icon}>{props.iconName === "star" ? "★" : "📍"}</Text>
    ) : props.media === "avatar" ? (
      <View style={styles.avatar}>
        <Text style={styles.avatarLabel}>{props.uri.slice(0, 1).toUpperCase()}</Text>
      </View>
    ) : null;
 
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[styles.row, selected && styles.rowSelected, style]}
    >
      {media}
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </Pressable>
  );
}
 
// ---- Generic section list ----
 
interface Section<T> {
  title: string;
  data: readonly T[];
}
 
type SectionListProps<T> = WithTestID & {
  sections: readonly Section<T>[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
  ListEmptyComponent?: React.ReactNode;
};
 
function SectionList<T>({
  sections,
  keyExtractor,
  renderItem,
  ListEmptyComponent,
  testID,
}: SectionListProps<T>) {
  const isEmpty = sections.every((s) => s.data.length === 0);
  if (isEmpty) return <>{ListEmptyComponent ?? null}</>;
 
  return (
    <View testID={testID}>
      {sections.map((section) => (
        <View key={section.title}>
          <Text style={styles.sectionHeader}>{section.title}</Text>
          {section.data.map((item) => (
            <View key={keyExtractor(item)}>{renderItem(item)}</View>
          ))}
        </View>
      ))}
    </View>
  );
}
 
// ---- Screen wiring ----
 
interface Place {
  id: string;
  name: string;
  city: string;
  pinned: boolean;
}
 
const PLACES: Place[] = [
  { id: "1", name: "Mission Dolores Park", city: "San Francisco", pinned: true },
  { id: "2", name: "Golden Gate", city: "San Francisco", pinned: false },
];
 
const MemoRow = memo(function MemoRow({
  place,
  onTogglePin,
}: {
  place: Place;
  onTogglePin: (id: string) => void;
}) {
  return (
    <ListRow
      testID={`place-${place.id}`}
      title={place.name}
      subtitle={place.city}
      selected={place.pinned}
      media={place.pinned ? { media: "icon", iconName: "pin" } : { media: "none" }}
      onPress={() => onTogglePin(place.id)}
    />
  );
});
 
export default function PlacesScreen({
  places,
  onTogglePin,
}: {
  places: Place[];
  onTogglePin: (id: string) => void;
}) {
  const sections: Section<Place>[] = [
    { title: "Saved", data: places.filter((p) => p.pinned) },
    { title: "All", data: places },
  ];
 
  return (
    <FlatList
      data={places}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={
        <SectionList
          testID="places-sections"
          sections={sections}
          keyExtractor={(p) => p.id}
          renderItem={(place) => <MemoRow place={place} onTogglePin={onTogglePin} />}
          ListEmptyComponent={<Text style={styles.muted}>No places yet.</Text>}
        />
      }
      renderItem={({ item }) => (
        <ListRow
          title={item.name}
          subtitle={item.city}
          media={{ media: "avatar", uri: item.name }}
        />
      )}
    />
  );
}
 
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: "#fff",
  },
  rowSelected: { backgroundColor: "#eff6ff" },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: "600" },
  subtitle: { fontSize: 14, color: "#64748b" },
  icon: { fontSize: 18, width: 28, textAlign: "center" },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLabel: { fontWeight: "700", color: "#334155" },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
    paddingHorizontal: 14,
    paddingTop: 16,
    textTransform: "uppercase",
  },
  muted: { padding: 16, color: "#94a3b8" },
  success: { color: "#16a34a" },
  error: { color: "#dc2626" },
  link: { color: "#2563eb", fontWeight: "600" },
});
```

**What this demonstrates:**

* `RowBaseProps` centralizes shared fields; `MediaProps` adds variant-specific keys via a discriminant.
* `SectionList<T>` preserves the item type from `sections` through `renderItem`.
* `PressableProps["onPress"]` reuses the platform handler type instead of duplicating it.
* `memo` row components pair with stable prop contracts for list performance.

## Deep Dive

### How It Works

* Function components are typed by annotating the props parameter (`function Row(props: RowProps)`).
* TypeScript narrows discriminated unions inside `if`/`switch` on the discriminant field (`variant`, `media`).
* Generic components (`<T>`) let callers pass domain types (`Place`) without casts at the call site.
* `React.ComponentProps<typeof Pressable>` and `ViewProps` inherit RN primitive props (`style`, `accessibilityLabel`, `testID`).
* `StyleProp<ViewStyle>` is the correct type for `style` - it accepts a single style, arrays, and falsy entries.
* React 19 keeps `children` out of `React.FC` defaults; add `children?: React.ReactNode` only when your API accepts slots.

### Prop Contract Patterns

| Pattern | Type shape | Use when |
| --- | --- | --- |
| Base + extension | `BaseProps & { extra: string }` | Several components share `testID`, `style` |
| Discriminated union | `{ kind: "a"; a: string } | { kind: "b"; b: number }` | Mutually exclusive prop sets |
| Generic data props | `<T> { data: T[]; renderItem: (t: T) => … }` | Lists, pickers, autocomplete |
| `Omit` / `Pick` | `Omit<PressableProps, "children">` | Wrapper components that own children |
| Render prop | `{ children: (state: S) => ReactNode }` | Headless primitives |

### TypeScript Notes

```tsx
import type { ComponentProps, ReactElement, ReactNode } from "react";
import { Pressable, Text, type TextProps, type ViewProps } from "react-native";
 
// Inherit primitive props, override only what you own
type CardProps = ViewProps & {
  title: string;
  footer?: ReactNode;
};
 
// Extract onPress from Pressable without importing the value type manually
type IconButtonProps = Pick<ComponentProps<typeof Pressable>, "onPress" | "disabled"> & {
  label: string;
  icon: ReactElement;
};
 
// Strict children - only Text nodes allowed inside a typography wrapper
type TypographyProps = TextProps & {
  children: string | ReactElement<typeof Text>;
};
```

### Parameters & Return Values

| Parameter | Type | Description |
| --- | --- | --- |
| `props` | Named interface or inline type | Public API of the component |
| `style` | `StyleProp<ViewStyle | TextStyle | ImageStyle>` | Platform style object(s) |
| `children` | `ReactNode` (explicit) | Slot content when the component renders children |
| Generic `T` | Caller-provided domain type | Item type for lists and selectors |
| Return | `ReactElement | null` (inferred) | RN components return elements; `null` renders nothing |

## Gotchas

* **Optional everything on variant props** - `{ variant?: "a" \| "b"; a?: string; b?: number }` lets callers pass `{ variant: "a", b: 1 }` without error. **Fix:** Use a discriminated union with required fields per branch.
* **Duplicating `onPress` types** - Hand-writing `(event: GestureResponderEvent) => void` drifts from RN updates. **Fix:** Use `PressableProps["onPress"]` or `ComponentProps<typeof Pressable>["onPress"]`.
* **Casting generic list data** - `data as Place[]` inside a shared list hides caller mistakes. **Fix:** Push the generic to the list component: `FlatList<Place>`, `SectionList<Place>`.
* **Spreading unknown props onto `View`** - `{...rest}` from a wide type can pass invalid keys to native views. **Fix:** `Omit` known keys and type `rest` as `ViewProps` or a narrow pick.
* **Inline object types on every component** - `({ name }: { name: string })` is fine once; repeated shapes belong in a named type. **Fix:** Export `ProfileCardProps` from the same file as the component.
* **Forgetting `readonly` on arrays** - Props typed as `T[]` allow callers to `.push()` into passed arrays. **Fix:** Prefer `readonly T[]` for display-only data props.
* **Using `React.FC` for new code** - Implicit `children` and legacy quirks add noise in React 19. **Fix:** Type the props parameter directly on a named function.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Discriminated unions | Mutually exclusive prop sets (media type, alert severity) | Every prop is independent and optional |
| Generics (`<T>`) | Lists, tables, selectors over unknown item types | Single-use screens with one domain type |
| `ComponentProps<typeof X>` | Wrapping RN primitives | You need a substantially different API surface |
| Zod + inferred types | Props originate from JSON or deep links | Pure in-app UI with static props |
| `satisfies` on style objects | Design-token objects that must stay narrow | One-off `StyleSheet.create` entries |

## FAQs

Should I use interface or type for component props?

Either works. Use `interface` when you expect declaration merging or extension across files; use `type` for unions, mapped types, and `Omit`/`Pick` compositions. Consistency within a design system matters more than the keyword.

How do I type children in React 19 function components?

Add `children?: React.ReactNode` to your props type when the component renders a slot. Do not rely on `React.FC` - it is no longer the recommended default. For stricter APIs, narrow to `ReactElement` or a specific component type.

What is the correct type for style props?

Use `StyleProp<ViewStyle>` on `View`, `StyleProp<TextStyle>` on `Text`, and `StyleProp<ImageStyle>` on `Image`. These accept a style object, arrays, and conditional falsy entries (`condition && styles.x`).

How do discriminated unions narrow inside JSX?

Narrow in the function body with `if (props.variant === "error")` before returning JSX. TypeScript carries the narrowed type into that branch, so `props.onRetry` is only required when `variant` is `"error"`.

How do I share props between two similar components?

Extract a base type (`RowBaseProps`) and intersect with variant-specific types. Use `Pick` and `Omit` to reuse slices from primitives: `Pick<PressableProps, "onPress" | "disabled">`.

How do I type a generic FlatList renderItem?

Pass the item generic to `FlatList<T>`:

```tsx
<FlatList<Place>
  data={places}
  keyExtractor={(p) => p.id}
  renderItem={({ item }) => <PlaceRow place={item} />}
/>
```

`item` is inferred as `Place` without manual casts.

Should I export prop types from component files?

Export when other modules wrap or extend the component - navigation screens, Storybook stories, and test helpers benefit from `export type ListRowProps`. Keep internal helper props unexported.

How do I type optional callback props?

Use optional fields: `onPress?: () => void`. When the callback is required only for one union branch, put it inside that branch of a discriminated union instead of marking it optional globally.

Gotcha: Why does spreading props break autocomplete?

`{...rest}` where `rest` is typed too widely (e.g. `Record<string, unknown>`) loses key checking. Type `rest` as `Omit<CardProps, "title">` or `ViewProps` so only valid native keys spread through.

How do I type icon name unions?

Use string literal unions (`"star" | "pin"`) or `as const` maps:

```tsx
const ICONS = { star: "★", pin: "📍" } as const;
type IconName = keyof typeof ICONS;
```

Literal unions catch typos at compile time and drive `switch` exhaustiveness.

Can I use default parameter values with typed props?

Yes - `function Counter({ initial = 0 }: { initial?: number })` is idiomatic. Defaults apply at runtime; TypeScript still treats the prop as optional on the caller side.

How do I type render-prop children?

```tsx
type MeasureProps = {
  children: (size: { width: number; height: number }) => React.ReactNode;
};
```

The callback return must be `ReactNode`; use `ReactElement` only when you require a single element.

How does strict null checking affect props?

With `strict: true`, optional props are `T | undefined`. Use `prop ?? fallback` or explicit guards. Avoid `prop!` non-null assertions in components - callers may omit the field.

Should list row components use memo with typed props?

Yes, when rows are expensive and receive stable props. Pair `memo` with a named props type so comparators and tests stay clear. Unstable inline `onPress={() => …}` lambdas defeat memoization.

How do I extend third-party component props?

Use `ComponentProps<typeof ThirdPartyButton>` or the package's exported props type. Re-export a narrowed version with `Omit` if you hide some upstream props from your design system.

## Related

* [TypeScript in RN Basics](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typescript-in-rn-basics/) - strict `tsconfig` defaults before tightening component APIs
* [Utility Types for RN](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/utility-types-for-rn/) - `ComponentProps`, `StyleProp`, and style-safe helpers
* [Props, State & Re-renders on Mobile](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/props-state-and-re-renders-on-mobile/) - how typed props flow when parents re-render
* [Typing Navigation & Route Params](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-navigation-and-route-params/) - screen components receiving route params
* [Typing API Responses & Zod](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-api-responses-and-zod/) - infer prop types from validated API shapes
* [TypeScript in RN Best Practices](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/best-practices/) - team conventions for where types pay off

### External Related Links

* [react.dev](https://react.dev/) - core React concepts RN builds on
* [reactnative.dev/docs](https://reactnative.dev/docs/getting-started) - full RN documentation
* [MDN Web Docs](https://developer.mozilla.org/) - JavaScript fundamentals

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
