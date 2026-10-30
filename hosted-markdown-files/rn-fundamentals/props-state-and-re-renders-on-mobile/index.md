# Props, State & Re-renders on Mobile

How updates propagate on native threads vs the JS runtime.

Highlights / Props, State & Re-renders on Mobile

* A re-render re-executes your function component on the JS thread - native views update after diffing
* setState batches in event handlers and many async paths in React 19 - fewer redundant commits
* Props flow down; lifting state up coordinates siblings without a global store
* Expensive list renders dominate frame time - memoize row components and stabilize callbacks
* Fabric reduces serialization overhead but does not make unnecessary re-renders free
* useRef holds mutable values that skip re-renders - ideal for timers and latest callbacks

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
 
interface CounterProps {
  label: string;
  initialCount?: number;
}
 
export function Counter({ label, initialCount = 0 }: CounterProps) {
  const [count, setCount] = useState(initialCount);
 
  const increment = useCallback(() => {
    setCount((prev) => prev + 1);
  }, []);
 
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{count}</Text>
      <Pressable onPress={increment} style={styles.button}>
        <Text style={styles.buttonText}>+1</Text>
      </Pressable>
    </View>
  );
}
 
const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  label: { flex: 1, fontSize: 16 },
  value: { fontSize: 18, fontWeight: "700", minWidth: 32, textAlign: "right" },
  button: { backgroundColor: "#2563eb", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  buttonText: { color: "#fff", fontWeight: "600" },
});
```

**When to reach for this:** Any interactive screen where parent props configure children and local `useState` drives UI that must stay in sync with native views.

## Working Example

```tsx
import { memo, useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
 
interface Todo {
  id: string;
  title: string;
  done: boolean;
}
 
interface TodoRowProps {
  item: Todo;
  onToggle: (id: string) => void;
}
 
const TodoRow = memo(function TodoRow({ item, onToggle }: TodoRowProps) {
  return (
    <Pressable
      onPress={() => onToggle(item.id)}
      style={[styles.row, item.done && styles.rowDone]}
    >
      <Text style={[styles.title, item.done && styles.titleDone]}>{item.title}</Text>
      <Text style={styles.badge}>{item.done ? "Done" : "Open"}</Text>
    </Pressable>
  );
});
 
const SEED: Todo[] = [
  { id: "1", title: "Profile layout with View + Text", done: true },
  { id: "2", title: "Wire Pressable handlers", done: false },
  { id: "3", title: "Measure list scroll perf", done: false },
];
 
export default function TodoScreen() {
  const [todos, setTodos] = useState<Todo[]>(SEED);
  const [filter, setFilter] = useState<"all" | "open">("all");
  const [loading, setLoading] = useState(false);
 
  const visible = useMemo(
    () => (filter === "open" ? todos.filter((t) => !t.done) : todos),
    [todos, filter]
  );
 
  const openCount = useMemo(() => todos.filter((t) => !t.done).length, [todos]);
 
  const handleToggle = useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  }, []);
 
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));
    setTodos(SEED);
    setLoading(false);
  }, []);
 
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.heading}>Todos ({openCount} open)</Text>
        <View style={styles.filters}>
          {(["all", "open"] as const).map((key) => (
            <Pressable
              key={key}
              onPress={() => setFilter(key)}
              style={[styles.chip, filter === key && styles.chipActive]}
            >
              <Text style={[styles.chipText, filter === key && styles.chipTextActive]}>
                {key === "all" ? "All" : "Open"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
 
      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TodoRow item={item} onToggle={handleToggle} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.list}
        />
      )}
 
      <Pressable onPress={handleRefresh} style={styles.refresh}>
        <Text style={styles.refreshText}>Reset list</Text>
      </Pressable>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  header: { padding: 16, gap: 12 },
  heading: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
  filters: { flexDirection: "row", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: "#e2e8f0" },
  chipActive: { backgroundColor: "#2563eb" },
  chipText: { fontSize: 14, fontWeight: "600", color: "#334155" },
  chipTextActive: { color: "#fff" },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  rowDone: { opacity: 0.7 },
  title: { flex: 1, fontSize: 16, color: "#0f172a" },
  titleDone: { textDecorationLine: "line-through", color: "#64748b" },
  badge: { fontSize: 12, fontWeight: "600", color: "#2563eb" },
  separator: { height: 8 },
  loader: { marginTop: 32 },
  refresh: { margin: 16, padding: 14, borderRadius: 10, backgroundColor: "#0f172a" },
  refreshText: { color: "#fff", textAlign: "center", fontWeight: "600" },
});
```

**What this demonstrates:**

* Props (`item`, `onToggle`) flow into a memoized row while state (`todos`, `filter`) lives in the screen
* Functional `setState` updates avoid stale closures when toggling items
* `useMemo` derives filtered data and open count without extra re-renders from recomputation alone
* `useCallback` keeps `handleToggle` stable so `memo` on `TodoRow` can skip unchanged rows
* `FlatList` re-renders only visible rows - parent state still triggers reconciliation for those rows

## Deep Dive

### How It Works

* React function components are **functions** - a re-render calls the function again on the **JavaScript thread** (Hermes in Expo).
* React diffs the new element tree against the previous fiber tree and schedules updates.
* React Native's renderer applies prop and layout changes to **native views** on the UI thread (via Fabric in the New Architecture).
* `useState` and `useReducer` schedule a re-render when the updater runs; the return value is the current render snapshot.
* React 19 **automatically batches** multiple `setState` calls in event handlers, promises, and timeouts into one render.
* Props are read-only inputs from parent to child - children request changes via callbacks.

### Update Path: JS to Native

```
User tap (UI thread)
  → event sent to JS thread
  → onPress / handler runs
  → setState schedules render
  → component function re-runs (JS)
  → React diffs virtual tree (JS)
  → Fabric commits changed shadow nodes
  → native layout + paint (UI thread)
```

* The JS thread can become a bottleneck if each frame runs heavy logic or renders huge trees.
* The UI thread drops frames if layout is expensive or too many views mutate per frame.
* Reducing **unnecessary re-renders** lowers JS work and shrinks the native diff.

### State Patterns on Mobile

| Pattern | API | Mobile note |
| --- | --- | --- |
| Local UI state | `useState` | Form fields, toggles, sheet open state |
| Derived data | `useMemo` | Filtered lists - cheaper than storing duplicate state |
| Stable handlers | `useCallback` | Required for `memo`/`FlatList` row optimization |
| Mutable refs | `useRef` | Timers, animation handles - no re-render on `.current` change |
| Shared screen state | Context / store | Prefer colocated state until multiple tabs need it |
| Server data | TanStack Query / `use` | Keep fetching out of render; show skeletons while pending |

### Props vs State Decision Table

| Situation | Use props | Use state |
| --- | --- | --- |
| Value owned by parent | ✓ |  |
| Value changes only inside component |  | ✓ |
| Sibling components need same value | Lift to parent ✓ |  |
| Value from navigation params | Route prop ✓ | Copy to state if editable |
| Remote API payload | Pass down after fetch | Store in query cache |

### TypeScript Notes

```tsx
import type { Dispatch, SetStateAction } from "react";
 
interface ScreenProps {
  userId: string;
  onSignOut: () => void;
}
 
// Explicit setter type for callbacks that forward setState
type SetTodos = Dispatch<SetStateAction<Todo[]>>;
 
// Discriminated unions for async UI - avoids impossible loading+error states
type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: Todo[] };
```

* Type props with `interface` or `type`; export row props when using `memo`.
* `SetStateAction<T>` covers both value and updater function forms.
* Narrow render branches with discriminated unions instead of multiple unrelated booleans.

## Gotchas

* **Unstable inline callbacks in lists** - `onPress={() => toggle(item.id)}` inside `renderItem` breaks `memo` every render. **Fix:** Pass `id` to a memoized row that calls a stable `useCallback` handler.
* **Storing derived data in state** - Keeping `openTodos` in state alongside `todos` doubles updates and risks drift. **Fix:** Derive with `useMemo` from the source of truth.
* **Mutating state objects** - `todo.done = true` then `setTodos(todos)` may skip re-render because the reference is unchanged. **Fix:** Return new objects/arrays from updaters.
* **Assuming immediate native paint after setState** - JS finishes the render pass before native commits; rapid bursts still queue work. **Fix:** Batch related updates; avoid synchronous layout reads after every tick.
* **Context value recreated each render** - `value={{ user, theme }}` re-renders all consumers. **Fix:** Memoize the context value object or split contexts.
* **Over-memoizing everything** - `useMemo`/`useCallback` have their own cost and noise. **Fix:** Profile first; optimize list rows and heavy pure computations.
* **Reading state right after setState** - `setCount(1); console.log(count)` still logs the old snapshot. **Fix:** Use the updater form or `useEffect` keyed on the value.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Local `useState` | Screen-scoped UI that does not cross routes | Many distant cousins need the same data |
| React Context | Theme, auth session, feature flags read widely | High-frequency updates (scroll position, keystrokes) |
| Zustand / Jotai | Medium app state with minimal boilerplate | One parent-child callback is enough |
| TanStack Query | Server lists, caching, background refresh | Purely local toggle with no network |
| `useRef` for mutable values | Animation frames, intervals, imperative handles | Values that must appear on screen |
| Uncontrolled inputs + ref | Simple forms with few fields | Complex validation across steps |

## FAQs

What actually happens when setState is called in React Native?

* React schedules a re-render of the component and its descendants (unless bailed out by `memo`).
* The component function runs again on the JS thread with the new state snapshot.
* React Native's renderer diffs props and children, then commits changes to native views.
* Native layout and drawing occur on the UI thread after the commit phase.

Does React 19 batch setState calls on mobile?

* Yes - updates from event handlers, `setTimeout`, `fetch` resolutions, and native events batch by default.
* Multiple `setState` calls in the same tick produce one re-render.
* Use `flushSync` only when you intentionally need a synchronous paint (rare on mobile).

Why do my FlatList rows re-render when parent state changes?

* Parent re-render recreates `renderItem` unless memoized; new function identity can defeat row memoization.
* Context or unstabilized props flowing into rows trigger child updates.
* Fix with `memo` on the row, stable `useCallback` handlers, and `extraData` only when needed.

What is the difference between props and state?

* **Props** are inputs from a parent - read-only from the child's perspective.
* **State** is owned by the component and updated via `setState` / `useReducer`.
* Changing props re-renders the child; changing state re-renders the owner and typically descendants.

Gotcha: Why does memo not skip re-renders?

* Shallow compare sees a new object or function prop each parent render.
* Inline `style={{ flex: 1 }}` creates a new object every time.
* Stabilize callbacks with `useCallback` and hoist styles to `StyleSheet.create`.

Should I lift state up or use a global store?

* Lift state to the nearest parent that needs to coordinate siblings - fewer moving parts.
* Reach for Context or Zustand when props drill through five+ layers or many tabs consume the same data.
* Server cache state belongs in TanStack Query, not duplicated in global stores.

How does Fabric change the cost of re-renders?

* Fabric uses the JavaScript Interface (JSI) to call native methods directly - less serialization than the old bridge.
* You still pay for JS render work and native diffing; fewer copies, not fewer tree nodes.
* Profile JS frame time and UI thread FPS separately.

When should I use useRef instead of useState?

* `useRef` stores mutable values that should **not** trigger re-renders when updated.
* Timers, subscription handles, and "latest callback" patterns are common mobile cases.
* If the UI must reflect the value, use `useState`.

What is extraData on FlatList?

* `FlatList` is a `PureComponent` - it may skip `renderItem` if `data` reference is unchanged.
* Pass `extraData={selectedId}` when row appearance depends on state outside `data`.
* Do not pass entire state objects - pass the minimal primitive or flag.

Gotcha: Why is my count wrong inside a loop of setState calls?

```tsx
// Wrong - each call uses the same snapshot
setCount(count + 1);
setCount(count + 1);
 
// Right - functional updater chains on latest value
setCount((c) => c + 1);
setCount((c) => c + 1);
```

* State updates are queued; the `count` variable in the closure is stale within the same handler.

Do children re-render when parent state changes?

* By default, yes - a parent re-render re-executes children unless `memo` bails out with same props.
* `children` prop identity changes if the parent inline-defines JSX that captures new closures.
* Structure heavy subtrees as separate memoized components.

How do navigation params relate to props?

* `expo-router` and React Navigation pass route params as props or hook values (`useLocalSearchParams`).
* Treat params as external input - copy to state if the user can edit them locally.
* Param changes trigger screen re-renders like any prop change.

What is React Strict Mode double-rendering in dev?

* React 19 Strict Mode in dev may invoke render twice to surface side effects in render.
* Hermes + RN dev builds show this only when Strict Mode is enabled in the root.
* Side effects belong in `useEffect`, not in the render body.

How do I avoid stale closures in Pressable handlers?

* Prefer functional updates: `setTodos((prev) => ...)` so you do not close over `todos`.
* Store latest callbacks in a ref updated each render for subscription-style APIs.
* List handlers should accept `id` arguments rather than capturing loop variables when possible.

Does useMemo prevent re-renders?

* No - `useMemo` only caches a computed **value** between renders of the same component.
* It avoids expensive recomputation and stabilizes referential equality for child props.
* Pair with `memo` on children when passing memoized objects or arrays down.

## Related

* [React Native Basics](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/react-native-basics/) - component model and project tour
* [Views, Text & Core Components](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/views-text-and-core-components/) - what actually updates on screen
* [Event Handling & Touchables](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/event-handling-and-touchables/) - where state updates usually start
* [The Bridge, JSI & New Architecture](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/the-bridge-jsi-and-new-architecture/) - Fabric commit path in depth
* [Hermes & the JS Runtime](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/hermes-and-the-js-runtime/) - where your render function executes
* [Best Practices](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/best-practices/) - performance habits for production apps

### External Related Links

* [react.dev](https://react.dev/) - core React concepts RN builds on
* [reactnative.dev](https://reactnative.dev/) - official React Native site
* [reactnative.dev/docs](https://reactnative.dev/docs/getting-started) - full RN documentation

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
