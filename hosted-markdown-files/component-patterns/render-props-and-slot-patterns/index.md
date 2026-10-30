# Render Props & Slot Patterns

Render props and slot patterns let parents own behavior while children own markup - so you compose deep navigation trees without stacking wrapper components around every screen. Render props pass state through a function; slot patterns (as in Expo Router layouts) reserve a hole where the active child route renders.

Highlights / Render Props & Slot Patterns

* Render props pass state to a function - the caller owns all markup
* Slot patterns (Expo Router Slot) swap child routes without nested wrappers
* Prefer children-as-function only when the parent owns non-trivial state
* Flatten navigation layouts - logic components should not wrap every screen
* Typed render props preserve item types through lists and async data
* Combine with memoized row components to keep list render props fast

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
 
interface ToggleRenderProps {
  isOn: boolean;
  toggle: () => void;
}
 
interface ToggleProps {
  initial?: boolean;
  children: (state: ToggleRenderProps) => ReactNode;
}
 
export function Toggle({ initial = false, children }: ToggleProps) {
  const [isOn, setIsOn] = useState(initial);
  const toggle = useCallback(() => setIsOn((v) => !v), []);
  return <>{children({ isOn, toggle })}</>;
}
 
// Caller paints the UI - no Toggle.Button export required
export function NotificationRow() {
  return (
    <Toggle initial={true}>
      {({ isOn, toggle }) => (
        <Pressable onPress={toggle} style={{ flexDirection: "row", gap: 8 }}>
          <Text>Push alerts</Text>
          <Text>{isOn ? "On" : "Off"}</Text>
        </Pressable>
      )}
    </Toggle>
  );
}
```

**When to reach for this:**

* A parent owns state or subscriptions but product teams must control layout (lists, settings rows)
* Expo Router / React Navigation layouts need a single outlet for nested routes (`<Slot />`)
* You want to avoid exporting five styled sub-components for one small behavior
* Third-party libraries expose `children` as a function (`KeyboardAvoidingView`-style APIs)
* Deep navigator trees suffer "wrapper hell" - five HOCs before the actual screen

## Working Example

```tsx
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, Slot } from "expo-router";
 
interface AsyncState<T> {
  status: "idle" | "loading" | "success" | "error";
  data: T | null;
  error: string | null;
}
 
interface AsyncListProps<T> {
  load: () => Promise<T[]>;
  keyExtractor: (item: T) => string;
  children: (ctx: {
    items: T[];
    status: AsyncState<T[]>["status"];
    error: string | null;
    reload: () => void;
  }) => ReactNode;
}
 
function AsyncList<T>({ load, keyExtractor, children }: AsyncListProps<T>) {
  const [state, setState] = useState<AsyncState<T[]>>({
    status: "idle",
    data: null,
    error: null,
  });
 
  const reload = useCallback(async () => {
    setState((prev) => ({ status: "loading", data: prev.data, error: null }));
    try {
      const data = await load();
      setState({ status: "success", data, error: null });
    } catch (e) {
      setState({
        status: "error",
        data: null,
        error: e instanceof Error ? e.message : "Request failed",
      });
    }
  }, [load]);
 
  useEffect(() => {
    void reload();
  }, [reload]);
 
  const items = state.data ?? [];
 
  return (
    <View style={{ flex: 1 }}>
      {children({
        items,
        status: state.status,
        error: state.error,
        reload,
      })}
    </View>
  );
}
 
interface InboxItem {
  id: string;
  subject: string;
  unread: boolean;
}
 
const MOCK: InboxItem[] = [
  { id: "1", subject: "Release train Friday", unread: true },
  { id: "2", subject: "Design review notes", unread: false },
  { id: "3", subject: "Crash-free rate 99.2%", unread: true },
];
 
function InboxListUI({
  items,
  status,
  error,
  reload,
}: {
  items: InboxItem[];
  status: AsyncState<InboxItem[]>["status"];
  error: string | null;
  reload: () => void;
}) {
  if (status === "loading" && items.length === 0) {
    return <ActivityIndicator style={{ marginTop: 32 }} />;
  }
 
  if (status === "error") {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Pressable onPress={reload} style={styles.retry}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }
 
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={[styles.row, item.unread && styles.unread]}>
          <Text style={styles.subject}>{item.subject}</Text>
          {item.unread ? <Text style={styles.dot}>•</Text> : null}
        </View>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      contentContainerStyle={styles.list}
    />
  );
}
 
export function InboxScreen() {
  const loadInbox = useCallback(
    () => new Promise<InboxItem[]>((r) => setTimeout(() => r(MOCK), 500)),
    []
  );
 
  return (
    <AsyncList load={loadInbox} keyExtractor={(item) => item.id}>
      {(ctx) => <InboxListUI {...ctx} />}
    </AsyncList>
  );
}
 
// Expo Router layout - slot avoids wrapping every child screen manually
export function InboxLayout() {
  return (
    <View style={styles.layout}>
      <Stack.Screen options={{ title: "Inbox" }} />
      <View style={styles.banner}>
        <Text style={styles.bannerText}>Team mobile updates</Text>
      </View>
      <View style={styles.slot}>
        <Slot />
      </View>
    </View>
  );
}
 
const styles = StyleSheet.create({
  layout: { flex: 1, backgroundColor: "#f8fafc" },
  banner: {
    backgroundColor: "#0f172a",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bannerText: { color: "#fff", fontWeight: "600" },
  slot: { flex: 1 },
  list: { padding: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
  },
  unread: { borderLeftWidth: 3, borderLeftColor: "#2563eb" },
  subject: { flex: 1, fontSize: 16, color: "#0f172a" },
  dot: { color: "#2563eb", fontSize: 20, lineHeight: 20 },
  separator: { height: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  error: { color: "#dc2626", fontSize: 15 },
  retry: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: "#fff", fontWeight: "600" },
});
```

**What this demonstrates:**

* `AsyncList` owns fetch status; the render prop paints loading, error, and `FlatList` UI
* Generics preserve `InboxItem` type through the render callback - no `any` in `renderItem`
* `InboxLayout` uses Expo Router's `<Slot />` so child routes render without per-screen wrappers
* Behavior component (`AsyncList`) stays free of brand styles; UI component (`InboxListUI`) stays free of fetch logic
* One layout file adds banner chrome around every inbox child route

## Deep Dive

### How It Works

* **Render prop** - `children` (or a named prop like `renderItem`) is a **function** the parent calls with state: `children({ isOn, toggle })`.
* The parent renders `<> {children(state)} </>` - it does not choose which `Pressable` or `Text` to show.
* **Slot pattern** - a layout renders shared chrome and inserts `<Slot />` where the matched child route's component should appear.
* Expo Router resolves the active child from the URL; the layout does not import screen files directly.
* Both patterns **invert control**: library owns logic; app owns structure and styling.
* Deep navigation benefits because layouts replace stacks of HOC wrappers (`withAuth(withTheme(Screen))`).

### Render Prop vs Compound vs Hook

| Pattern | Caller provides | Parent provides | Best on mobile when |
| --- | --- | --- | --- |
| Render prop | Function that returns JSX | State + callbacks | One-off layouts, list row customization |
| Compound | Named JSX children | Context + sub-parts | Design-system tabs, accordion, fields |
| Custom hook | Component body calls `useX()` | Returned state/actions | Same logic, totally different trees |
| Slot (`<Slot />`) | Child route files | Layout chrome | Expo Router / file-based nesting |

### Expo Router Slot Layout

```tsx
// app/(app)/settings/_layout.tsx
import { Stack, Slot } from "expo-router";
import { View, Text } from "react-native";
 
export default function SettingsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={{ padding: 16, fontWeight: "700" }}>Settings</Text>
      <Slot />
    </View>
  );
}
```

* `Slot` renders the active child route - analogous to `children` in a layout component.
* Use nested `_layout.tsx` files instead of manually composing navigators in every screen.
* Pair with typed routes - see [Expo Router Typed Routes](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/expo-router-typed-routes/).

### List Render Props and Performance

```tsx
<FlatList
  data={items}
  renderItem={({ item }) => (
    <UserRow item={item} onPress={handlePress} />
  )}
/>
```

* `renderItem` is a render prop built into React Native lists.
* Extract `UserRow` as a `memo`ized component - do not call hooks inside `renderItem`.
* Stabilize `handlePress` with `useCallback` so row memoization works.

### TypeScript Notes

```tsx
import type { ReactNode } from "react";
 
type RenderProp<T> = (value: T) => ReactNode;
 
interface DataRendererProps<T> {
  data: T;
  children: RenderProp<T>;
}
 
// Named render prop when children is already used for composition
interface ListProps<T> {
  items: T[];
  renderRow: RenderProp<{ item: T; index: number }>;
  keyExtractor: (item: T) => string;
}
```

* Prefer explicit names (`renderHeader`, `renderEmpty`) when `children` is also a valid React node.
* Generic parents (`AsyncList<T>`) keep item types flowing to the callback parameter.
* Type the render argument as an interface so screens get autocomplete on `reload`, `status`, etc.

## Gotchas

* **Inline render functions in lists** - `children={(ctx) => <Row {...ctx} />}` defined inside a parent re-creates the function every render and can defeat `memo`. **Fix:** Hoist a stable child component or pass `renderRow` from `useCallback`.
* **Wrapper hell in navigators** - Nesting five providers in every `_layout.tsx` obscures the actual screen. **Fix:** Push cross-cutting providers to the root layout; use slots for route-level chrome only.
* **Using render props when a hook suffices** - `Toggle` with only `isOn`/`toggle` does not need a function child if every caller renders the same row. **Fix:** Export `useToggle` and a dumb row - see [Custom Hooks for UI Logic](https://docs.wahwei/reactnative.codeguides.io/component-patterns/custom-hooks-for-ui-logic/).
* **Calling hooks inside render props** - `children={() => { const x = useFoo(); ... }}` violates the Rules of Hooks. **Fix:** Move hook calls into a child component rendered by the function.
* **Slot without flex** - Forgetting `flex: 1` on the slot container yields blank or clipped child screens. **Fix:** Give the slot wrapper `flex: 1` in full-screen layouts.
* **Async render prop reload loops** - `useEffect(() => reload(), [items])` when `reload` sets `items` causes infinite fetch. **Fix:** Depend on stable keys; load once on mount or on explicit user action.
* **Untyped `children` as Function** - `children: Function` loses type safety. **Fix:** `children: (state: ToggleRenderProps) => ReactNode`.

49454e4f4d5f434e4f5904434556494d4345121d1956181a181c1a1d

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Render props | Caller must own all markup; few structural conventions | Team prefers consistent compound sub-parts |
| Compound components | Repeated multi-part UI (tabs, fields) | Only one layout ever consumes the behavior |
| Custom hooks | Identical state, arbitrary JSX trees | You need a single component boundary for error boundaries |
| Expo Router `<Slot />` | File-based child routes under shared chrome | Modal overlays that are not routes |
| HOCs (`withTheme`) | Legacy codebase already standardized on them | Greenfield - layouts + hooks are clearer |
| Inline JSX children | Static composition, no shared state function | Parent must inject dynamic state into the child |

## FAQs

What is a render prop?

* A prop (often `children`) whose value is a **function** that returns React elements.
* The parent component calls the function with its internal state.
* The caller decides which native primitives to render.

How is Slot different from children in a layout?

* `children` in classic React are elements passed by the direct parent.
* `<Slot />` renders the **matched child route** from the router - not manually passed JSX.
* Expo Router wires the slot to the file system under the layout's directory.

Why does wrapper hell happen in navigation?

* Each concern (auth, theme, analytics, safe area) adds a layout or HOC layer.
* Without slots, every screen import path grows and shared chrome duplicates.
* Root + group layouts should own providers; leaf layouts own only local chrome.

Gotcha: Can I use hooks inside a render prop callback?

* **No** - the callback is not a component body.
* Return `<MyRow />` from the callback and call hooks inside `MyRow`.
* Same rule as `FlatList` `renderItem`.

Render props vs compound components - which wins for tabs?

* **Compound** when your design system ships `Tabs.List` / `Tabs.Tab` and teams reuse that structure.
* **Render props** when every product screen lays out tabs differently (bottom vs segmented control).
* Hybrid: compound parts internally, optional `renderTab` override for advanced cases.

How do I avoid recreating render functions?

```tsx
function InboxBody(props: InboxRenderProps) {
  return <InboxListUI {...props} />;
}
 
<AsyncList load={loadInbox} keyExtractor={(i) => i.id}>
  {InboxBody}
</AsyncList>
```

* Pass a stable function reference instead of an inline arrow in JSX.
* Or wrap with `useCallback` when the function closes over props.

Does FlatList use a render prop?

* Yes - `renderItem`, `ListHeaderComponent`, and `ListEmptyComponent` are all render-style APIs.
* `ListEmptyComponent` can be a component type or a function returning JSX.
* Treat list rows as first-class components for hooks and memoization.

How do slots interact with Stack navigators?

* A `_layout.tsx` can render `<Stack />` for headers and still use `<Slot />` in tab-style nested layouts.
* `Stack.Screen options` in layouts set shared header config for child routes.
* Deep links target child routes; the layout slot updates automatically.

Gotcha: Blank screen below my layout banner?

* The slot container likely has no height - add `flex: 1`.
* Child screens should also use `flex: 1` on their root `View`.
* Check that the matched route file has a default export.

Are render props deprecated?

* React docs favor hooks for many cases, but render props remain valid - especially in libraries.
* React Native list APIs still center on `renderItem`.
* Choose readability: if a hook + component is clearer, use that instead.

How do I type children as a function in TypeScript?

* `children: (state: State) => ReactNode` - not `Function` or `any`.
* Export the state interface so consumers annotate extracted render components.
* See [Typing Components & Props](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-components-and-props/).

Can render props help with platform-specific UI?

* A `MediaQuery` or `Platform.select` wrapper can expose `{ isTablet }` to its render child.
* Caller returns different trees for phone vs tablet without forking the data layer.
* Pair with [Platform-Specific Code](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/platform-specific-code/) for file splits when trees diverge heavily.

How many layout layers should an Expo Router app have?

* Root: providers, fonts, splash, analytics.
* Group `(app)` / `(auth)`: session gates.
* Feature `_layout`: local banner, segment tabs, `<Slot />`.
* Avoid duplicating the same provider at every level.

How does this relate to container/presenter?

* Containers often use render props to hand async state to presenters.
* `AsyncList` is container-like; `InboxListUI` is presenter-like.
* See [Container/Presenter on Mobile](https://docs.wahwei/reactnative.codeguides.io/component-patterns/container-presenter-on-mobile/).

## Related

* [Component Patterns Basics](https://docs.wahwei/reactnative.codeguides.io/component-patterns/component-patterns-basics/) - folder conventions that keep layouts thin
* [Compound Components](https://docs.wahwei/reactnative.codeguides.io/component-patterns/compound-components/) - named parts instead of function children
* [Custom Hooks for UI Logic](https://docs.wahwei/reactnative.codeguides.io/component-patterns/custom-hooks-for-ui-logic/) - hook alternative to render props
* [Container/Presenter on Mobile](https://docs.wahwei/reactnative.codeguides.io/component-patterns/container-presenter-on-mobile/) - split data logic from slot-friendly UI
* [Expo Router Typed Routes](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/expo-router-typed-routes/) - type-safe params with slot layouts
* [Platform-Specific Code](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/platform-specific-code/) - when render trees diverge by OS

### External Related Links

* [react.dev](https://react.dev/) - core React concepts RN builds on
* [reactnative.dev](https://reactnative.dev/) - official React Native site
* [galaxies.dev](https://galaxies.dev/) - structured RN/Expo courses (Simon Grimm)

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 19, 2026
