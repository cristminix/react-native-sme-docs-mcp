# React Native Testing Library

`@testing-library/react-native` (RNTL) tests components the way users interact with them - by visible text, accessibility roles, and labels - not by implementation details like internal state or private methods.

Highlights / React Native Testing Library

* Query like a user: role and label before `testID`
* `screen` keeps queries scoped to the last `render` call
* Use `findBy\*` and `waitFor` for async state - never bare `setTimeout`
* `userEvent` is async - always `await` press and type
* Importing from `@testing-library/react-native` registers Jest matchers automatically

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import { useState } from "react";
import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { Pressable, Text, TextInput, View } from "react-native";
 
function LoginForm({ onSubmit }: { onSubmit: (email: string) => void }) {
  const [email, setEmail] = useState("");
  return (
    <View>
      <TextInput
        accessibilityLabel="Email"
        value={email}
        onChangeText={setEmail}
      />
      <Pressable accessibilityRole="button" onPress={() => onSubmit(email)}>
        <Text>Sign in</Text>
      </Pressable>
    </View>
  );
}
 
test("submits email on press", async () => {
  const onSubmit = jest.fn();
  const user = userEvent.setup();
 
  render(<LoginForm onSubmit={onSubmit} />);
 
  await user.type(screen.getByLabelText("Email"), "alex@example.com");
  await user.press(screen.getByRole("button", { name: "Sign in" }));
 
  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith("alex@example.com");
  });
});
```

**When to reach for this:**

* Presentational components that receive props (see [Container/Presenter on Mobile](https://docs.wahwei/reactnative.codeguides.io/component-patterns/container-presenter-on-mobile/)).
* Custom hooks via `renderHook` from `@testing-library/react-native`.
* Forms, lists, and modals where user-visible text drives behavior.
* Expo Router integration tests with `renderRouter` from `expo-router/testing-library`.

## Working Example

```tsx
// src/features/tasks/task-list.tsx
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
  type ListRenderItem,
} from "react-native";
 
export interface Task {
  id: string;
  title: string;
  done: boolean;
}
 
interface TaskListProps {
  tasks: Task[];
  loading: boolean;
  onToggle: (id: string) => void;
}
 
export function TaskList({ tasks, loading, onToggle }: TaskListProps) {
  const [error, setError] = useState<string | null>(null);
 
  const renderItem: ListRenderItem<Task> = useCallback(
    ({ item }) => (
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.done }}
        onPress={() => onToggle(item.id)}
      >
        <Text>{item.title}</Text>
      </Pressable>
    ),
    [onToggle]
  );
 
  if (loading) {
    return (
      <View accessibilityLabel="Loading tasks">
        <ActivityIndicator />
      </View>
    );
  }
 
  if (error) {
    return <Text role="alert">{error}</Text>;
  }
 
  if (tasks.length === 0) {
    return <Text>No tasks yet</Text>;
  }
 
  return (
    <FlatList
      data={tasks}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
    />
  );
}
```

```tsx
// __tests__/task-list-test.tsx
import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { TaskList, type Task } from "../src/features/tasks/task-list";
 
const TASKS: Task[] = [
  { id: "1", title: "Ship release", done: false },
  { id: "2", title: "Write tests", done: true },
];
 
describe("<TaskList />", () => {
  test("shows loading state", () => {
    render(<TaskList tasks={[]} loading onToggle={jest.fn()} />);
    expect(screen.getByLabelText("Loading tasks")).toBeOnTheScreen();
  });
 
  test("shows empty state", () => {
    render(<TaskList tasks={[]} loading={false} onToggle={jest.fn()} />);
    expect(screen.getByText("No tasks yet")).toBeOnTheScreen();
  });
 
  test("toggles a task via checkbox role", async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();
 
    render(<TaskList tasks={TASKS} loading={false} onToggle={onToggle} />);
 
    const shipRelease = screen.getByRole("checkbox", { name: "Ship release" });
    expect(shipRelease).toHaveAccessibilityState({ checked: false });
 
    await user.press(shipRelease);
 
    await waitFor(() => {
      expect(onToggle).toHaveBeenCalledWith("1");
    });
  });
 
  test("lists all task titles", () => {
    render(<TaskList tasks={TASKS} loading={false} onToggle={jest.fn()} />);
    expect(screen.getByText("Ship release")).toBeOnTheScreen();
    expect(screen.getByText("Write tests")).toBeOnTheScreen();
  });
});
```

**What this demonstrates:**

* **Query priority** - `getByLabelText` for loading, `getByRole("checkbox")` for toggles, `getByText` for copy.
* **`userEvent.setup()`** - async press simulates real interaction; always `await`.
* **`waitFor`** - asserts callbacks after React flushes updates instead of arbitrary delays.
* **`toBeOnTheScreen` / `toHaveAccessibilityState`** - RNTL matchers registered via import (see [Jest Setup for Expo](https://docs.wahwei/reactnative.codeguides.io/testing/jest-setup-for-expo/)).
* **Props-only component** - no router, no fetch, no global store in the unit under test.

## Deep Dive

### How It Works

* RNTL renders components with **Test Renderer** - a JS-side tree that mirrors React Native host components (`View`, `Text`, `Pressable`).
* Queries walk the rendered tree looking for nodes that match **accessibility** and **text** - the same signals assistive tech and users rely on.
* `screen` is a namespace bound to the most recent `render()` - re-query after state updates instead of caching element references from before rerenders.
* `userEvent` schedules interactions like a real user (press, type, scroll) and returns promises - synchronous `fireEvent` still exists but `userEvent` is preferred for new tests.
* Async utilities (`waitFor`, `findBy*`) poll until assertions pass or timeout - they replace manual `setTimeout` + `act` gymnastics.

### Query Priority on React Native

| Priority | Query | Example |
| --- | --- | --- |
| 1 | `getByRole` | `getByRole("button", { name: "Sign in" })` |
| 2 | `getByLabelText` | `getByLabelText("Email")` |
| 3 | `getByPlaceholderText` | `getByPlaceholderText("Search tasks")` |
| 4 | `getByText` | `getByText("No tasks yet")` |
| 5 | `getByTestId` | `getByTestId("task-list")` - last resort |

`getBy*` throws if zero or many matches. `queryBy*` returns `null` when absent (good for negative assertions). `findBy*` wraps `waitFor` + `getBy*` for elements that appear after async work.

### Async Patterns

```tsx
// Element appears after fetch - prefer findBy*
expect(await screen.findByText("Welcome back")).toBeOnTheScreen();
 
// Callback or mock invoked after state flush
await waitFor(() => {
  expect(onSubmit).toHaveBeenCalled();
});
 
// Multiple assertions after one interaction
await user.press(screen.getByRole("button", { name: "Refresh" }));
await waitFor(() => {
  expect(screen.getByText("Updated")).toBeOnTheScreen();
});
```

Default `waitFor` timeout is 1000 ms - pass `{ timeout: 3000 }` for slow mocked networks, not for production timing.

### Expo Router: `renderRouter`

```tsx
import { renderRouter, screen } from "expo-router/testing-library";
import { Text, View } from "react-native";
 
test("lands on settings route", async () => {
  const Settings = () => (
    <View>
      <Text>Settings</Text>
    </View>
  );
 
  renderRouter(
    { index: () => <Text>Home</Text>, settings: Settings },
    { initialUrl: "/settings" }
  );
 
  expect(screen).toHavePathname("/settings");
  expect(screen.getByText("Settings")).toBeOnTheScreen();
});
```

* Test files must live **outside** `app/` - only routes and layouts belong there.
* `renderRouter` accepts inline route maps, string path arrays, or fixture directories.
* Custom matchers: `toHavePathname`, `toHaveSegments`, `useLocalSearchParams` - see [Expo Router testing docs](https://docs.expo.dev/router/reference/testing/).

### TypeScript Notes

```tsx
import { renderHook, act } from "@testing-library/react-native";
import { useCounter } from "../src/hooks/use-counter";
 
test("increments", () => {
  const { result } = renderHook(() => useCounter());
 
  act(() => {
    result.current.increment();
  });
 
  expect(result.current.count).toBe(1);
});
```

* `renderHook` types `result.current` from the hook return type - no manual casts.
* `ListRenderItem<T>` on components keeps `renderItem` callbacks typed in both app and tests.
* Enable `eslint-plugin-testing-library` on test files to catch `getByTestId` overuse and missing `await` on `userEvent`.

## Gotchas

* **Cached element references after rerender** - Stale nodes from before a state update cause "element not found" flakes. **Fix:** Re-query with `screen.getBy*` inside `waitFor`, or scope queries to the latest render.
* **Missing `await` on `userEvent`** - Press and type are async; forgetting `await` races assertions. **Fix:** `await user.press(...)` and `await user.type(...)` in every test.
* **`getByTestId` as the default** - `testID` is invisible to users and drifts from copy changes. **Fix:** Add `accessibilityLabel` / `accessibilityRole` in components; reserve `testID` for list items or native-driver edge cases.
* **`fireEvent` for complex flows** - `fireEvent.press` bypasses the event pipeline `userEvent` exercises. **Fix:** Prefer `userEvent.setup()` for interactions; keep `fireEvent` for rare low-level cases.
* **Testing implementation details** - Asserting `component.state.count` or enzyme-style shallow renders breaks on refactors. **Fix:** Assert visible outcomes: text, roles, callbacks, accessibility state.
* **FlatList items not found** - Virtualized lists may not mount off-screen rows. **Fix:** Pass small `data` arrays in tests, set `initialNumToRender` high in a test wrapper, or test row components in isolation.
* **Not importing RNTL in Jest setup** - Matchers like `toBeOnTheScreen` throw "matcher not found". **Fix:** `import "@testing-library/react-native"` in `jest.setup.ts` (see [Jest Setup for Expo](https://docs.wahwei/reactnative.codeguides.io/testing/jest-setup-for-expo/)).

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| RNTL + Jest | Component and hook tests in CI | You need real native gestures or OS dialogs |
| `renderRouter` (Expo Router) | Route matching, deep links, layout guards | Testing a leaf component with no navigation |
| Maestro E2E | Full flows on simulator/device | A pure formatter with no UI |
| Detox | Gray-box sync with native idle | Quick unit feedback on every file save |
| Snapshot-only tests | Tiny stable markup | Behavior-heavy screens - snapshots miss regressions |

## FAQs

How is RNTL different from React Testing Library?

Same philosophy - query by what users see. APIs align (`render`, `screen`, `userEvent`), but RN uses `accessibilityRole`, `accessibilityLabel`, and `Pressable` instead of DOM roles and `click`.

Do I need @testing-library/jest-native?

No for new projects. RNTL registers matchers (`toBeOnTheScreen`, `toHaveAccessibilityState`) when you import from `@testing-library/react-native`. `@testing-library/jest-native` is legacy.

getByText vs getByRole for buttons?

Prefer `getByRole("button", { name: "Sign in" })` - it verifies the control is exposed as a button to assistive tech. `getByText("Sign in")` alone does not confirm pressability.

When should I use findBy\*?

When the element appears after async work - fetched data, `useEffect`, navigation transition. `findBy*` combines `waitFor` + `getBy*` and returns a promise you `await`.

How do I assert something is NOT on screen?

```tsx
expect(screen.queryByText("Error")).toBeNull();
// or
expect(screen.queryByText("Error")).not.toBeOnTheScreen();
```

Use `queryBy*` - `getBy*` throws when the element is missing.

Can I test custom hooks without rendering a screen?

Yes - `renderHook` from `@testing-library/react-native` wraps the hook in a test harness. Use `act()` when the hook updates state synchronously.

How do I test TextInput changes?

```tsx
const user = userEvent.setup();
await user.type(screen.getByLabelText("Email"), "alex@example.com");
```

Or `fireEvent.changeText` for direct control when not simulating keystrokes. Prefer `userEvent` for user-centric tests.

Why does my FlatList test not find a row?

* Virtualization may not mount off-screen items - keep `data` small in tests.
* Extract the row component and test it with props directly.
* Ensure `keyExtractor` returns stable keys so cells reconcile predictably.

How do I test modals and conditional UI?

Open the modal via `userEvent.press` on the trigger, then `await waitFor` or `findBy*` for modal content. Query inside the modal by role/text - not by portal name (RN has no DOM portal).

Should I use screen or destructuring from render?

`screen` is preferred - queries always target the latest render without passing `getByText` around. Destructuring from `render()` is fine for single-query tests.

How do I test Expo Router deep links?

```tsx
renderRouter(routes, { initialUrl: "/profile/42" });
expect(screen).toHavePathname("/profile/42");
```

Use inline route maps or fixture directories; see Expo's `renderRouter` docs for override patterns.

What about MSW or fetch mocking?

Mock at the boundary your component uses - `jest.mock` on the API module, or MSW in Node for integration-style tests. Presenters should receive data via props so fetch mocks stay in container tests.

fireEvent vs userEvent - which wins?

`userEvent` for new tests - it models sequential user input. `fireEvent` is lower-level and can hide missing `await` bugs when mixed with async state updates.

How do I debug the rendered tree?

```tsx
import { render, screen, debug } from "@testing-library/react-native";
 
render(<MyComponent />);
screen.debug(); // prints host tree to console
```

Use sparingly - prefer explicit `queryBy*` failures that tell you what is on screen.

Does RNTL work with jest-expo?

Yes - that is the standard Expo stack. Configure Jest first ([Jest Setup for Expo](https://docs.wahwei/reactnative.codeguides.io/testing/jest-setup-for-expo/)), then write component tests with RNTL. Mock native modules as needed ([Mocking Native Modules](https://docs.wahwei/reactnative.codeguides.io/testing/mocking-native-modules/)).

## Related

* [Jest Setup for Expo](https://docs.wahwei/reactnative.codeguides.io/testing/jest-setup-for-expo/) - `jest-expo` preset and `jest.setup.ts`
* [Mocking Native Modules](https://docs.wahwei/reactnative.codeguides.io/testing/mocking-native-modules/) - when RNTL tests need controlled native behavior
* [Mobile Testing Basics](https://docs.wahwei/reactnative.codeguides.io/testing/mobile-testing-basics/) - where component tests sit in the pyramid
* [Container/Presenter on Mobile](https://docs.wahwei/reactnative.codeguides.io/component-patterns/container-presenter-on-mobile/) - presenters optimized for RNTL
* [Custom Hooks for UI Logic](https://docs.wahwei/reactnative.codeguides.io/component-patterns/custom-hooks-for-ui-logic/) - `renderHook` patterns
* [Maestro E2E](https://docs.wahwei/reactnative.codeguides.io/testing/maestro-e2e/) - when queries in Jest are not enough

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

383k393a3c3q3e393a3o1r3e3k3x383c3e3k221w203x1v1t1v1z1t20

Reviewed by Chris St. John·Last updated Jul 19, 2026
