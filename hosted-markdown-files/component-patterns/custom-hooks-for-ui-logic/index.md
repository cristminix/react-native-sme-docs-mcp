# Custom Hooks for UI Logic

Custom hooks let you extract stateful UI behavior - keyboard offsets, sheet open state, debounced search, scroll-driven headers - into reusable functions that any screen or presentational component can call. You keep JSX in components and move the "how it works" into hooks, which cuts prop drilling without hiding business rules in visual trees.

Highlights / Custom Hooks for UI Logic

* Custom hooks bundle state + effects + handlers into one reusable unit
* Return a small object or tuple - consumers pick only what they need
* UI hooks differ from data hooks: no fetch/cache, only presentation behavior
* Keyboard, sheet, and scroll hooks are the highest-ROI extractions on mobile
* Prefix with use and keep hooks pure - no JSX inside the hook body
* Colocate hooks next to the feature until a second screen needs the same logic

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import { useCallback, useEffect, useState } from "react";
import { Keyboard, TextInput, View, type KeyboardEvent } from "react-native";
 
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
 
  useEffect(() => {
    const show = (e: KeyboardEvent) => setHeight(e.endCoordinates.height);
    const hide = () => setHeight(0);
 
    const showSub = Keyboard.addListener("keyboardDidShow", show);
    const hideSub = Keyboard.addListener("keyboardDidHide", hide);
 
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
 
  return height;
}
 
// Consumer - no prop drilling from a parent
export function CommentComposer() {
  const keyboardHeight = useKeyboardHeight();
 
  return (
    <View style={{ paddingBottom: keyboardHeight }}>
      <TextInput placeholder="Add a comment" />
    </View>
  );
}
```

**When to reach for this:**

* The same `useState` + `useEffect` + handler trio appears in two or more screens
* A parent only exists to pass `isOpen`, `onOpen`, `onClose` through three layers
* Mobile-specific listeners (keyboard, app state, dimensions) clutter a screen component
* You want to unit-test UI behavior without mounting full component trees
* A presentational component should stay dumb while behavior lives beside it

## Working Example

```tsx
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
 
type Filter = "all" | "open" | "done";
 
interface Todo {
  id: string;
  title: string;
  done: boolean;
}
 
const SEED: Todo[] = [
  { id: "1", title: "Extract keyboard hook", done: true },
  { id: "2", title: "Wire filter chips", done: false },
  { id: "3", title: "Ship presentational list", done: false },
];
 
function useTodoFilters(initial: Todo[]) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
 
  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return initial.filter((todo) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "open" && !todo.done) ||
        (filter === "done" && todo.done);
      const matchesQuery =
        normalized.length === 0 ||
        todo.title.toLowerCase().includes(normalized);
      return matchesFilter && matchesQuery;
    });
  }, [initial, query, filter]);
 
  const counts = useMemo(
    () => ({
      all: initial.length,
      open: initial.filter((t) => !t.done).length,
      done: initial.filter((t) => t.done).length,
    }),
    [initial]
  );
 
  return {
    query,
    setQuery,
    filter,
    setFilter,
    visible,
    counts,
  };
}
 
function useDisclosure(initial = false) {
  const [isOpen, setIsOpen] = useState(initial);
 
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);
 
  return { isOpen, open, close, toggle };
}
 
interface TodoListProps {
  data: Todo[];
  onToggle: (id: string) => void;
}
 
function TodoList({ data, onToggle }: TodoListProps) {
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => onToggle(item.id)}
          style={[styles.row, item.done && styles.rowDone]}
        >
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.badge}>{item.done ? "Done" : "Open"}</Text>
        </Pressable>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
    />
  );
}
 
export default function TodoScreen() {
  const insets = useSafeAreaInsets();
  const [todos, setTodos] = useState(SEED);
  const filters = useTodoFilters(todos);
  const search = useDisclosure(false);
 
  const handleToggle = useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  }, []);
 
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.heading}>Todos</Text>
        <Pressable onPress={search.toggle} style={styles.iconButton}>
          <Text style={styles.iconButtonText}>{search.isOpen ? "✕" : "⌕"}</Text>
        </Pressable>
      </View>
 
      {search.isOpen ? (
        <TextInput
          autoFocus
          value={filters.query}
          onChangeText={filters.setQuery}
          placeholder="Search todos"
          style={styles.search}
        />
      ) : null}
 
      <View style={styles.chips}>
        {(["all", "open", "done"] as const).map((key) => (
          <Pressable
            key={key}
            onPress={() => filters.setFilter(key)}
            style={[styles.chip, filters.filter === key && styles.chipActive]}
          >
            <Text
              style={[
                styles.chipText,
                filters.filter === key && styles.chipTextActive,
              ]}
            >
              {key} ({filters.counts[key]})
            </Text>
          </Pressable>
        ))}
      </View>
 
      <TodoList data={filters.visible} onToggle={handleToggle} />
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heading: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonText: { fontSize: 16, fontWeight: "700", color: "#334155" },
  search: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  chips: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
  },
  chipActive: { backgroundColor: "#2563eb" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#334155" },
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
  badge: { fontSize: 12, fontWeight: "600", color: "#2563eb" },
  separator: { height: 8 },
});
```

**What this demonstrates:**

* `useTodoFilters` owns search + chip filter state and derived `visible` data - the screen stays readable
* `useDisclosure` replaces three props (`isOpen`, `onOpen`, `onClose`) with one hook call
* `TodoList` is presentational: it receives data and a stable callback, no filter logic inside
* `useMemo` inside the hook keeps derived lists cheap without pushing computation into JSX
* Hooks compose at the screen level; no intermediate wrapper passes behavior down

## Deep Dive

### How It Works

* A custom hook is a **function whose name starts with `use`** and that may call other hooks (`useState`, `useEffect`, `useCallback`, …).
* React associates hook state with the **component instance** that called the hook - not with the hook function globally.
* Each call site gets its own isolated state; two screens calling `useDisclosure()` do not share `isOpen`.
* Hooks run during render on the JS thread; effects registered inside run after paint (or on cleanup).
* Return values are plain objects, tuples, or primitives - consumers destructure what they need.
* Custom hooks are **not** a new React feature - they are the composition pattern for the Rules of Hooks.

### UI Hooks vs Data Hooks

| Kind | Owns | Examples | Usually lives in |
| --- | --- | --- | --- |
| UI hook | Presentation behavior | `useDisclosure`, `useKeyboardHeight`, `useCollapsibleHeader` | `hooks/use-*.ts` next to the feature |
| Data hook | Remote/cache state | TanStack Query `useQuery`, `useMutation` | `api/` or `queries/` module |
| Domain hook | Business rules | `useCartTotals`, `useCanCheckout` | `features/checkout/hooks/` |
| Platform hook | RN / Expo APIs | `useAppState`, `useNetInfo` wrappers | `lib/platform/` |

* Keep fetch and cache in TanStack Query - wrap it in a thin `useTodosQuery()` if needed, but do not mix keyboard listeners into query hooks.
* UI hooks should be **synchronous from the consumer's perspective** except where they intentionally mirror async platform events.

### Return Shape Conventions

| Pattern | Shape | Good for |
| --- | --- | --- |
| Object return | `{ isOpen, open, close }` | Named fields; easy to extend without breaking call sites |
| Tuple return | `[value, setValue]` | Mirrors `useState`; familiar for simple state |
| Split actions | `{ state, actions }` | Large hooks where UI and handlers should not interleave |
| Ref + setter | `{ ref, scrollToTop }` | Scroll views, flat lists, imperative handles |

```tsx
// Prefer stable action references inside the hook
export function useCounter(initial = 0) {
  const [count, setCount] = useState(initial);
 
  const increment = useCallback(() => setCount((c) => c + 1), []);
  const reset = useCallback(() => setCount(initial), [initial]);
 
  return { count, increment, reset };
}
```

### TypeScript Notes

```tsx
import type { Dispatch, SetStateAction } from "react";
 
interface UseTodoFiltersResult {
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  filter: "all" | "open" | "done";
  setFilter: Dispatch<SetStateAction<"all" | "open" | "done">>;
  visible: Todo[];
  counts: Record<"all" | "open" | "done", number>;
}
 
// Generic hook - preserves item type through the pipeline
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
 
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
 
  return debounced;
}
```

* Export the return type when multiple screens share the hook - see [Typing Components & Props](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-components-and-props/).
* Type listener events with React Native's exported event types (`KeyboardEvent`, `AppStateStatus`).
* Avoid `any` on hook parameters; generics preserve item types for list filters and selectors.

## Gotchas

* **Calling hooks conditionally** - `if (show) useFoo()` violates the Rules of Hooks and crashes in dev. **Fix:** Call the hook unconditionally; gate behavior inside it or in the consumer.
* **Returning unstable objects every render** - `return { open, close, state: { isOpen } }` where the inner object is recreated causes needless child re-renders. **Fix:** Memoize nested objects or flatten the return shape; stabilize callbacks with `useCallback`.
* **Mixing data fetching into UI hooks** - `useProductSheet` that fetches and manages keyboard height is hard to test and reuse. **Fix:** Split into `useProductQuery` + `useBottomSheet`; compose at the screen.
* **Forgetting native listener cleanup** - Keyboard and `Dimensions` listeners leak if `remove()` is skipped. **Fix:** Return a cleanup function from `useEffect` and call `.remove()` on subscriptions.
* **Sharing mutable refs across instances** - Module-level `let lastOffset = 0` bleeds state between screens. **Fix:** Keep mutable values in `useRef` inside the hook body.
* **Hooks that return JSX** - A hook returning `<Modal />` is a component, not a hook. **Fix:** Return state + handlers; let the caller render JSX (headless pattern - see [Headless Components](https://docs.wahwei/reactnative.codeguides.io/component-patterns/headless-components/)).
* **Over-abstracting one-off logic** - A hook used exactly once adds indirection without reuse. **Fix:** Inline until the second consumer appears; then extract with a name that describes behavior, not the screen.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Custom UI hook | Reused behavior across screens or fat screens needing clarity | One-off toggle used in a single 20-line component |
| Colocated `useState` in screen | Simple, local state with no reuse | Same listener/effect block copied to three files |
| React Context | Many descendants need the same UI state (theme, wizard step) | Only one child needs `isOpen` |
| Compound components | Related UI pieces share implicit state (tabs, accordion) | Behavior is flat - a single hook return is enough |
| Zustand slice | Cross-tab UI flags (global toast queue, mini-player) | Screen-scoped sheet open state |
| Container component | Behavior tightly coupled to one tree's lifecycle | Multiple presenters need the same logic |

## FAQs

What is the difference between a custom hook and a utility function?

* Custom hooks **may call other hooks**; plain functions may not.
* Hooks participate in React's render cycle - state, effects, and memoization are tied to a component instance.
* Utility functions (`formatCurrency`, `clamp`) belong in `lib/` with no `use` prefix.

Can I call the same custom hook twice in one component?

* Yes - each call creates **independent state**.
* `const a = useDisclosure(); const b = useDisclosure();` gives two unrelated `isOpen` values.
* Name them distinctly: `const header = useDisclosure(); const menu = useDisclosure();`.

Where should I put custom hooks in an Expo Router project?

* Start colocated: `features/inbox/hooks/use-thread-filters.ts`.
* Promote to `hooks/use-keyboard-height.ts` when two unrelated features need it.
* Avoid a single `hooks/` junk drawer until patterns stabilize.

How do custom hooks reduce prop drilling?

* Instead of a parent owning `isOpen` and passing `onClose` through intermediaries, the leaf calls `useDisclosure()` directly.
* Shared behavior moves to the hook; components keep only the props their **layout** needs.
* Context is the alternative when many deep descendants need the same value.

Gotcha: Why does my keyboard hook report zero on Android?

* Some Android keyboards fire `keyboardDidShow` with different timing than iOS.
* Use `keyboardDidShow` / `keyboardDidHide` for layout adjustments; avoid `Will` events unless animating.
* Test on a physical device - emulators often misreport keyboard height.

Should UI hooks accept configuration objects or positional args?

* Prefer a single options object when there are three or more optional parameters.
* Positional args are fine for `(initialValue, delayMs)`-style hooks.
* Default sensibly so call sites stay one line for the common case.

How do I test a custom UI hook?

```tsx
import { renderHook, act } from "@testing-library/react-native";
import { useDisclosure } from "./use-disclosure";
 
test("toggle flips isOpen", () => {
  const { result } = renderHook(() => useDisclosure());
  act(() => result.current.open());
  expect(result.current.isOpen).toBe(true);
});
```

* Use `@testing-library/react-native`'s `renderHook` - no full screen mount required.
* Mock native modules (`Keyboard`, `Dimensions`) at the test boundary.

Can custom hooks replace TanStack Query?

* No - query hooks solve **server state**: caching, stale times, retries.
* UI hooks solve **client presentation**: sheets, filters, animation progress.
* Compose them: `const { data } = useTodosQuery(); const filters = useTodoFilters(data ?? []);`.

What naming convention should I follow?

* Prefix with `use` - `useSearchFilters`, not `searchFilters`.
* Name after **behavior**, not implementation: `useCollapsibleHeader` beats `useScrollYState`.
* File name kebab-case: `use-collapsible-header.ts`.

Gotcha: Why does eslint complain about missing dependencies?

* Effects must list every value from the component scope that they read.
* Stabilize callbacks with `useCallback` or move logic inside the effect.
* Do not disable `exhaustive-deps` to silence real stale-closure bugs.

How do custom hooks interact with React 19 batching?

* Multiple `setState` calls inside a hook's event handler batch into one re-render - same as inline state.
* Hooks do not change batching semantics; they only relocate where updates originate.
* See [Props, State & Re-renders on Mobile](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/props-state-and-re-renders-on-mobile/) for the full update path.

When should I return a tuple vs an object?

* Tuple mirrors `useState` - good for `[value, setValue]` ergonomics.
* Object scales better when you add a third or fourth field later.
* Document the return shape in a named exported type for shared hooks.

Can I use custom hooks inside FlatList renderItem?

* **No** - `renderItem` is a nested function, not a component; hooks cannot be called there.
* Extract a `TodoRow` component and call hooks at the top of that component instead.
* List rows that need hooks must be proper function components.

How is this different from headless components?

* Hooks return **data and functions**; headless components return **no UI** but may use context to wire children.
* Start with a hook when one consumer needs behavior; graduate to headless when multiple sub-parts share implicit state.
* See [Headless Components](https://docs.wahwei/reactnative.codeguides.io/component-patterns/headless-components/) for the compound-style variant.

## Related

* [Component Patterns Basics](https://docs.wahwei/reactnative.codeguides.io/component-patterns/component-patterns-basics/) - screen vs presentational split and folder layout
* [Container/Presenter on Mobile](https://docs.wahwei/reactnative.codeguides.io/component-patterns/container-presenter-on-mobile/) - where hooks often live in the container layer
* [Compound Components](https://docs.wahwei/reactnative.codeguides.io/component-patterns/compound-components/) - implicit state sharing without prop lists
* [Headless Components](https://docs.wahwei/reactnative.codeguides.io/component-patterns/headless-components/) - when behavior needs child composition, not just a hook return
* [Typing Components & Props](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-components-and-props/) - typing hook return shapes
* [Props, State & Re-renders on Mobile](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/props-state-and-re-renders-on-mobile/) - how hook-driven updates reach native views

### External Related Links

* [react.dev](https://react.dev/) - core React concepts RN builds on
* [reactnative.dev](https://reactnative.dev/) - official React Native site
* [galaxies.dev](https://galaxies.dev/) - structured RN/Expo courses (Simon Grimm)

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
