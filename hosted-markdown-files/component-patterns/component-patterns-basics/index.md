# Component Patterns Basics

10 examples to get you started with Component Patterns - 7 basic and 3 intermediate.

Highlights / Component Patterns Basics

* Screens wire navigation and data; presentational components own layout and styles only
* Feature folders colocate screens, hooks, and UI so a module can be moved or deleted in one cut
* Custom hooks extract refresh, pagination, and form state without prop drilling through the tree
* Compound components share implicit state via context - ideal for tabs, cards, and field groups
* Container/presenter splits async work from pure UI so presenters are easy to snapshot-test
* Headless hooks return state and handlers; design-system components decide colors, spacing, and motion

## Prerequisites

These patterns apply to any React Native project. The snippets assume a standard **Expo SDK 57** TypeScript app scaffolded with create-expo-app.

```bash
npx create-expo-app@latest MyPatternsApp --template blank-typescript
cd MyPatternsApp
npx expo start
```

Replace `App.tsx` with each example to run it immediately. No extra packages are required beyond the default Expo template - patterns are about **how you structure components**, not which libraries you install.

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**.

---

## Basic Examples

### 1. Screen vs Presentational Split

A **screen** owns routing concerns, data loading, and side effects. A **presentational** component receives props and renders UI - no fetches, no navigation calls.

```tsx
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
 
type User = { id: string; name: string };
 
function ProfileView({ user }: { user: User }) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{user.name}</Text>
      <Text style={styles.meta}>ID: {user.id}</Text>
    </View>
  );
}
 
export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const response = await fetch("https://jsonplaceholder.typicode.com/users/1");
      const data = (await response.json()) as User;
      if (!cancelled) {
        setUser(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
 
  if (loading) return <ActivityIndicator style={styles.loader} />;
  if (!user) return <Text style={styles.error}>User not found</Text>;
 
  return <ProfileView user={user} />;
}
 
const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center" },
  error: { flex: 1, textAlign: "center", marginTop: 48, color: "#b91c1c" },
  card: { flex: 1, padding: 24, gap: 4 },
  name: { fontSize: 22, fontWeight: "700" },
  meta: { fontSize: 14, color: "#6b7280" },
});
```

* **`ProfileScreen`** decides *when* to show loading, error, or content - that orchestration belongs at the screen boundary
* **`ProfileView`** is pure presentation: given a `user`, it always renders the same tree - ideal for Storybook and snapshot tests
* Screens can live in `app/` (Expo Router) or a `screens/` folder; presenters live beside them under `components/`
* If a presentational component starts calling `fetch` or `router.push`, split it again - mixed responsibilities become god screens fast

> **Related:** [Container/Presenter on Mobile](https://docs.wahwei/reactnative.codeguides.io/component-patterns/container-presenter-on-mobile/) - naming, testing, and data boundaries | [Anti-Patterns: God Screens](https://docs.wahwei/reactnative.codeguides.io/component-patterns/anti-patterns-god-screens/) - when the split fails

---

### 2. Feature Folder Layout

Group everything a feature needs in one directory so engineers can onboard to "Orders" without hunting across the repo.

```text
src/features/orders/
├── index.ts                 # public exports for the feature
├── screens/
│   └── OrdersScreen.tsx     # route entry, wires hooks + presenter
├── components/
│   └── OrderList.tsx        # presentational list
├── hooks/
│   └── useOrders.ts         # fetch, refresh, pagination
└── types.ts                 # Order, OrderStatus, etc.
```

```ts
// src/features/orders/index.ts
export { OrdersScreen } from "./screens/OrdersScreen";
export type { Order } from "./types";
```

* **`screens/`** holds route-facing containers; **`components/`** holds reusable UI inside the feature
* **`hooks/`** keeps stateful behavior out of JSX - screens stay thin orchestration layers
* **`index.ts`** is the feature's public API - other features import from here, not deep paths
* Shared design tokens and primitives still live in `src/components/ui/`; feature folders own product-specific composition

> **Related:** [Component Patterns Best Practices](https://docs.wahwei/reactnative.codeguides.io/component-patterns/best-practices/) - consistency without over-abstraction

---

### 3. Typed Presentational Props

Explicit prop types document what UI a component needs and prevent screens from leaking implementation details.

```tsx
import { Pressable, StyleSheet, Text, View } from "react-native";
 
type OrderRowProps = {
  title: string;
  total: string;
  status: "pending" | "shipped" | "delivered";
  onPress: () => void;
};
 
export function OrderRow({ title, total, status, onPress }: OrderRowProps) {
  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.total}>{total}</Text>
      </View>
      <Text style={[styles.badge, styles[`badge_${status}`]]}>{status}</Text>
    </Pressable>
  );
}
 
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  textBlock: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: "600" },
  total: { fontSize: 14, color: "#6b7280" },
  badge: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  badge_pending: { color: "#d97706" },
  badge_shipped: { color: "#2563eb" },
  badge_delivered: { color: "#16a34a" },
});
 
export default function App() {
  return (
    <View style={{ flex: 1, paddingTop: 48 }}>
      <OrderRow
        title="Wireless earbuds"
        total="$129.00"
        status="shipped"
        onPress={() => {}}
      />
    </View>
  );
}
```

* **Discriminated unions** (`status`) make impossible states unrepresentable - the badge style map stays exhaustive
* Presentational props should be **data and callbacks**, not raw `navigation` or `queryClient` objects
* `accessibilityRole="button"` on `Pressable` rows gives VoiceOver/TalkBack a correct role without extra wrappers
* Export prop types (`export type OrderRowProps`) so Storybook stories and tests share the same contract

> **Related:** [Container/Presenter on Mobile](https://docs.wahwei/reactnative.codeguides.io/component-patterns/container-presenter-on-mobile/) - which props cross the container boundary

---

### 4. Custom Hook for UI Logic

Move refresh, pagination, or toggle state into a hook so multiple screens reuse the same behavior without copy-pasting `useState` blocks.

```tsx
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
 
function useRefresh(onRefresh: () => Promise<void>) {
  const [refreshing, setRefreshing] = useState(false);
 
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);
 
  return { refreshing, refresh };
}
 
export default function App() {
  const [lastSynced, setLastSynced] = useState("Never");
 
  const { refreshing, refresh } = useRefresh(async () => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    setLastSynced(new Date().toLocaleTimeString());
  });
 
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Last synced: {lastSynced}</Text>
      <Pressable
        style={[styles.button, refreshing && styles.buttonDisabled]}
        onPress={refresh}
        disabled={refreshing}
      >
        <Text style={styles.buttonText}>
          {refreshing ? "Refreshing…" : "Refresh"}
        </Text>
      </Pressable>
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  label: { fontSize: 16, color: "#374151" },
  button: { backgroundColor: "#2563eb", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "600" },
});
```

* Hooks named **`use*`** can hold UI state (refreshing, expanded, step index) - not only remote data
* Return a **stable `refresh` callback** via `useCallback` so `FlatList` `onRefresh` does not thrash child memoization
* The hook owns the `refreshing` flag; the screen wires it to `RefreshControl` or button `disabled`
* When logic grows (abort, error toast, retry), the hook file expands - the screen component does not

> **Related:** [Custom Hooks for UI Logic](https://docs.wahwei/reactnative.codeguides.io/component-patterns/custom-hooks-for-ui-logic/) - extraction rules and prop-drilling escape hatches

---

### 5. Compound Tabs

Share tab state through context so consumers compose `Tabs`, `TabList`, and `TabPanel` without prop drilling `activeTab` through every child.

```tsx
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
 
type TabsContextValue = {
  active: string;
  setActive: (value: string) => void;
};
 
const TabsContext = createContext<TabsContextValue | null>(null);
 
function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs subcomponents must render inside <Tabs>");
  return ctx;
}
 
function Tabs({
  defaultValue,
  children,
}: {
  defaultValue: string;
  children: ReactNode;
}) {
  const [active, setActive] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <View style={styles.root}>{children}</View>
    </TabsContext.Provider>
  );
}
 
function TabList({ children }: { children: ReactNode }) {
  return <View style={styles.tabList}>{children}</View>;
}
 
function Tab({ value, children }: { value: string; children: ReactNode }) {
  const { active, setActive } = useTabsContext();
  const selected = active === value;
  return (
    <Pressable
      onPress={() => setActive(value)}
      style={[styles.tab, selected && styles.tabSelected]}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.tabText, selected && styles.tabTextSelected]}>
        {children}
      </Text>
    </Pressable>
  );
}
 
function TabPanel({ value, children }: { value: string; children: ReactNode }) {
  const { active } = useTabsContext();
  if (active !== value) return null;
  return <View style={styles.panel}>{children}</View>;
}
 
export default function App() {
  return (
    <Tabs defaultValue="upcoming">
      <TabList>
        <Tab value="upcoming">Upcoming</Tab>
        <Tab value="past">Past</Tab>
      </TabList>
      <TabPanel value="upcoming">
        <Text>No upcoming events.</Text>
      </TabPanel>
      <TabPanel value="past">
        <Text>Three past events.</Text>
      </TabPanel>
    </Tabs>
  );
}
 
const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, gap: 16 },
  tabList: { flexDirection: "row", gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: "#f3f4f6" },
  tabSelected: { backgroundColor: "#dbeafe" },
  tabText: { color: "#4b5563", fontWeight: "600" },
  tabTextSelected: { color: "#1d4ed8" },
  panel: { padding: 12, backgroundColor: "#f9fafb", borderRadius: 12 },
});
```

* The **parent coordinates** (`Tabs` holds `active`); children read/write through context - the hallmark compound-component API
* Throwing when context is missing catches **`Tab` rendered outside `Tabs`** at dev time instead of silently failing
* `TabPanel` returns `null` for inactive panels - swap for lazy mounting if panels are expensive
* Mobile tabs often scroll horizontally; keep `TabList` as a separate subcomponent so teams can swap layout without changing state logic

> **Related:** [Compound Components](https://docs.wahwei/reactnative.codeguides.io/component-patterns/compound-components/) - cards, field groups, and API design

---

### 6. Container and Presenter Names

Make the split obvious in filenames so code review instantly shows which file is allowed to fetch and which is pure UI.

```tsx
// Presenter - no side effects
import { StyleSheet, Text, View } from "react-native";
 
export type WeatherPresenterProps = {
  city: string;
  temperature: number;
  unit: "C" | "F";
};
 
export function WeatherPresenter({ city, temperature, unit }: WeatherPresenterProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.city}>{city}</Text>
      <Text style={styles.temp}>
        {temperature}°{unit}
      </Text>
    </View>
  );
}
 
// Container - loads data, maps to presenter props
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { WeatherPresenter } from "./WeatherPresenter";
 
export function WeatherContainer() {
  const [data, setData] = useState<WeatherPresenterProps | null>(null);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    const timer = setTimeout(() => {
      setData({ city: "Austin", temperature: 72, unit: "F" });
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);
 
  if (loading) return <ActivityIndicator style={styles.loader} />;
  if (!data) return <Text>Weather unavailable</Text>;
 
  return <WeatherPresenter {...data} />;
}
 
const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center" },
  card: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  city: { fontSize: 18, color: "#6b7280" },
  temp: { fontSize: 48, fontWeight: "700" },
});
 
export default function App() {
  return <WeatherContainer />;
}
```

* **`WeatherPresenter`** never imports `fetch`, `useEffect`, or navigation - if it does, rename it; it is a screen now
* **`WeatherContainer`** maps remote shapes to presenter props so API churn does not ripple into styles
* Spread `{...data}` only when field names align; prefer explicit mapping when API names differ from UI vocabulary
* In tests, mount the presenter with fixture props; test the container with mocked data layers

> **Related:** [Container/Presenter on Mobile](https://docs.wahwei/reactnative.codeguides.io/component-patterns/container-presenter-on-mobile/) - async boundaries and test doubles

---

### 7. Composition with Children

Accept `children` for flexible layout shells instead of adding a prop for every possible slot.

```tsx
import { type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
 
function Screen({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.body}>{children}</View>
    </View>
  );
}
 
function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}
 
export default function App() {
  return (
    <Screen title="Inbox">
      <Card>
        <Text style={styles.row}>Shipment delayed - tap for details.</Text>
      </Card>
      <Card>
        <Text style={styles.row}>Your refund was processed.</Text>
      </Card>
    </Screen>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, gap: 16, backgroundColor: "#f9fafb" },
  title: { fontSize: 28, fontWeight: "700" },
  body: { gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
  },
  row: { fontSize: 15, lineHeight: 22 },
});
```

* **`children`** keeps `Screen` and `Card` APIs small - consumers decide what goes inside without new props per layout
* `ReactNode` accepts elements, strings, fragments, and `null` - the widest renderable type for slot props
* When you need fixed regions (header, footer, actions), add **named props** (`footer={<Actions />}`) alongside `children`
* Deep navigation trees benefit from composition: stack headers and tab badges stay declarative without wrapper hell

> **Related:** [Render Props & Slot Patterns](https://docs.wahwei/reactnative.codeguides.io/component-patterns/render-props-and-slot-patterns/) - named slots and list renderers

---

## Intermediate Examples

### 8. Feature Screen Wiring Hook + Presenter

A complete feature slice: the screen is a thin glue layer; the hook owns async work; the presenter renders props.

```tsx
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
 
type Todo = { id: number; title: string; completed: boolean };
 
function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
 
  const load = useCallback(async () => {
    const response = await fetch("https://jsonplaceholder.typicode.com/todos?_limit=8");
    if (!response.ok) throw new Error("Failed to load todos");
    return (await response.json()) as Todo[];
  }, []);
 
  const refresh = useCallback(async () => {
    try {
      setError(null);
      setTodos(await load());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [load]);
 
  useEffect(() => {
    refresh();
  }, [refresh]);
 
  return { todos, loading, error, refresh };
}
 
function TodoListPresenter({
  todos,
  refreshing,
  onRefresh,
}: {
  todos: Todo[];
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <FlatList
      data={todos}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.meta}>{item.completed ? "Done" : "Open"}</Text>
        </View>
      )}
    />
  );
}
 
export default function TodoScreen() {
  const { todos, loading, error, refresh } = useTodos();
  const [refreshing, setRefreshing] = useState(false);
 
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);
 
  if (loading) return <ActivityIndicator style={styles.centered} />;
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
        <Pressable style={styles.button} onPress={refresh}>
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }
 
  return (
    <TodoListPresenter
      todos={todos}
      refreshing={refreshing}
      onRefresh={handleRefresh}
    />
  );
}
 
const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  list: { padding: 16, gap: 8 },
  row: {
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
    gap: 4,
  },
  title: { fontSize: 15, fontWeight: "600" },
  meta: { fontSize: 13, color: "#6b7280" },
  error: { color: "#b91c1c", fontSize: 16 },
  button: { backgroundColor: "#2563eb", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  buttonText: { color: "#fff", fontWeight: "600" },
});
```

* **`useTodos`** is the feature's data hook - screens and tests import the same module
* **`TodoScreen`** handles loading/error branches; **`TodoListPresenter`** assumes happy-path list data
* Pull-to-refresh UI state (`refreshing`) can live in the screen or a dedicated `useRefresh` hook - keep it out of the presenter when possible
* This triad scales: add `types.ts`, move files into `features/todos/`, export `TodoScreen` from `index.ts`

> **Related:** [Custom Hooks for UI Logic](https://docs.wahwei/reactnative.codeguides.io/component-patterns/custom-hooks-for-ui-logic/) - when to merge or split hooks | [Anti-Patterns: God Screens](https://docs.wahwei/reactnative.codeguides.io/component-patterns/anti-patterns-god-screens/) - signs the screen is doing too much

---

### 9. Render Prop for List Empty States

Hand list rendering back to the parent when empty, loading, and error UIs differ per screen but pagination logic stays shared.

```tsx
import { type ReactNode } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
 
type PaginatedListProps<T> = {
  data: T[];
  loading: boolean;
  renderItem: (item: T) => ReactNode;
  renderEmpty: () => ReactNode;
  keyExtractor: (item: T) => string;
};
 
function PaginatedList<T>({
  data,
  loading,
  renderItem,
  renderEmpty,
  keyExtractor,
}: PaginatedListProps<T>) {
  if (loading) {
    return <View style={styles.centered}>{renderEmpty()}</View>;
  }
 
  return (
    <FlatList
      data={data}
      keyExtractor={keyExtractor}
      contentContainerStyle={data.length === 0 ? styles.centered : styles.list}
      ListEmptyComponent={renderEmpty}
      renderItem={({ item }) => <>{renderItem(item)}</>}
    />
  );
}
 
type Message = { id: string; body: string };
 
export default function App() {
  const messages: Message[] = [];
 
  return (
    <PaginatedList
      data={messages}
      loading={false}
      keyExtractor={(item) => item.id}
      renderItem={(item) => (
        <View style={styles.row}>
          <Text>{item.body}</Text>
        </View>
      )}
      renderEmpty={() => (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Inbox zero</Text>
          <Text style={styles.emptyBody}>New messages will appear here.</Text>
        </View>
      )}
    />
  );
}
 
const styles = StyleSheet.create({
  list: { padding: 16, gap: 8 },
  centered: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
  row: { padding: 12, backgroundColor: "#fff", borderRadius: 8 },
  empty: { alignItems: "center", gap: 8, padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyBody: { fontSize: 14, color: "#6b7280", textAlign: "center" },
});
```

* **Render props** (`renderItem`, `renderEmpty`) let each screen customize row and empty UI without forking the list shell
* Generic `<T>` keeps the list reusable across `Message`, `Order`, and `Notification` types
* Custom hooks replaced many render-prop use cases, but **list and slot APIs** still favor render props for flexibility
* `ListEmptyComponent` and an early `loading` branch cover the two empty paths `FlatList` needs on mobile

> **Related:** [Render Props & Slot Patterns](https://docs.wahwei/reactnative.codeguides.io/component-patterns/render-props-and-slot-patterns/) - slot props vs render props on deep trees

---

### 10. Headless Hook + Styled Presenter

Return state and event handlers from a logic-only hook; let design-system components own colors, spacing, and platform feedback.

```tsx
import { useCallback, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
 
function useDisclosure(initial = false) {
  const [open, setOpen] = useState(initial);
  const toggle = useCallback(() => setOpen((value) => !value), []);
  const close = useCallback(() => setOpen(false), []);
  return { open, toggle, close };
}
 
function AccordionRow({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { open, toggle } = useDisclosure();
 
  return (
    <View style={styles.row}>
      <Pressable
        onPress={toggle}
        style={styles.header}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.chevron}>{open ? "−" : "+"}</Text>
      </Pressable>
      {open ? <Text style={styles.body}>{children}</Text> : null}
    </View>
  );
}
 
export default function App() {
  return (
    <View style={styles.screen}>
      <AccordionRow title="Shipping">Arrives in 3–5 business days.</AccordionRow>
      <AccordionRow title="Returns">Free returns within 30 days.</AccordionRow>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, gap: 12 },
  row: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  title: { fontSize: 16, fontWeight: "600" },
  chevron: { fontSize: 20, color: "#6b7280" },
  body: { paddingHorizontal: 16, paddingBottom: 16, color: "#4b5563", lineHeight: 20 },
});
```

* **`useDisclosure`** is headless - no `View` imports required, so the same hook powers modals, menus, and accordions
* Presentational components choose **Pressable feedback, typography, and motion**; swap styles per brand without touching logic
* `accessibilityState={{ expanded: open }}` wires accordion semantics for screen readers
* Export headless hooks from your design system package; keep styled wrappers in the app or a themed layer

> **Related:** [Headless Components](https://docs.wahwei/reactnative.codeguides.io/component-patterns/headless-components/) - logic-only primitives for design systems | [Polymorphic & AsChild Patterns](https://docs.wahwei/reactnative.codeguides.io/component-patterns/polymorphic-and-aschild-patterns/) - flexible host elements for primitives

---

### External Related Links

* [react.dev](https://react.dev/) - core React concepts RN builds on
* [reactnative.dev](https://reactnative.dev/) - official React Native site
* [galaxies.dev](https://galaxies.dev/) - structured RN/Expo courses (Simon Grimm)

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
