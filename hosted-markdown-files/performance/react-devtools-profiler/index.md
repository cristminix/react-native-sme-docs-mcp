# React DevTools Profiler

Finding avoidable re-renders on navigation transitions - the cookbook workflow for Expo SDK 57 apps before you rewrite screens or add `memo` everywhere.

Highlights / React DevTools Profiler

* Record a navigation transition - not idle home - to catch provider and tab re-renders
* Ranked chart shows which components committed; flame chart shows why parents dragged children
* Why did this render? highlights changed props, state, and context in React 19
* Fix unstable context values and inline props before sprinkling memo on leaf rows
* Pair Profiler with list hygiene - navigation often re-renders every visible FlatList row
* Profile release-like builds on device - Fast Refresh hides real commit costs

## Recipe

> Quick-reference recipe card - copy-paste ready.

**Setup (once per session)**

```bash
# Start app with dev client or debug build
npx expo start
# Press j in terminal → open React Native DevTools in browser
# Open Profiler tab → gear → enable "Record why each component rendered"
```

**Repro script - navigation transition**

1. Reload app (cold or warm).
2. Click **Record** in Profiler.
3. Navigate: Home tab → open stack screen → go back → switch tab → return.
4. Stop recording.
5. In **Ranked** view, sort by render duration - note top 5 components.
6. Click a hot row component → **Why did this render?** → check props/context changes.
7. Fix the **nearest stable owner** (layout provider, tab shell, list parent) before memoizing leaves.

**Stable navigation shell pattern**

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { useMemo } from "react";
 
export default function TabLayout() {
  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      tabBarActiveTintColor: "#2563eb",
    }),
    [],
  );
 
  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="search" options={{ title: "Search" }} />
    </Tabs>
  );
}
```

```tsx
// src/ui/FeedRow.tsx - memo only after parent props are stable
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
 
export type FeedItem = { id: string; title: string };
 
export const FeedRow = memo(function FeedRow({
  item,
  onPress,
}: {
  item: FeedItem;
  onPress: (id: string) => void;
}) {
  return (
    <Pressable onPress={() => onPress(item.id)} style={styles.row}>
      <Text style={styles.title}>{item.title}</Text>
    </Pressable>
  );
});
 
const styles = StyleSheet.create({
  row: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#e2e8f0" },
  title: { fontSize: 16, fontWeight: "600" },
});
```

**When to reach for this:**

* Tab switch causes the home feed to stutter though data did not change.
* Opening a modal re-renders hundreds of list rows in Profiler.
* A context provider at root updates on every navigation action.
* You are about to add `React.memo` to 40 components without evidence.

## Working Example

A minimal repro: unstable `screenOptions` and a new `renderItem` each render force the entire feed to commit on every tab blur/focus.

```tsx
import { memo, useCallback, useMemo, useState } from "react";
import {
  FlatList,
  ListRenderItem,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
 
type Post = { id: string; title: string };
 
const POSTS: Post[] = Array.from({ length: 120 }, (_, i) => ({
  id: String(i),
  title: `Post ${i + 1}`,
}));
 
const PostRow = memo(function PostRow({
  post,
  onOpen,
}: {
  post: Post;
  onOpen: (id: string) => void;
}) {
  return (
    <Pressable onPress={() => onOpen(post.id)} style={styles.row}>
      <Text style={styles.title}>{post.title}</Text>
    </Pressable>
  );
});
 
function Feed({ posts }: { posts: Post[] }) {
  const [opened, setOpened] = useState<string | null>(null);
 
  const onOpen = useCallback((id: string) => setOpened(id), []);
 
  const renderItem: ListRenderItem<Post> = useCallback(
    ({ item }) => <PostRow post={item} onOpen={onOpen} />,
    [onOpen],
  );
 
  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Feed {opened ? `(opened ${opened})` : ""}</Text>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        extraData={opened}
        style={styles.list}
      />
    </View>
  );
}
 
/** Simulates tab shell remounting with fresh object literals - Profiler will light up. */
function UnstableShell({ children }: { children: React.ReactNode }) {
  const [tab, setTab] = useState<"home" | "search">("home");
  // BAD: new object every render - triggers navigation subtree commits
  const headerStyle = { backgroundColor: tab === "home" ? "#eff6ff" : "#f8fafc" };
 
  return (
    <View style={styles.shell}>
      <View style={[styles.header, headerStyle]}>
        <Pressable onPress={() => setTab("home")}>
          <Text>Home</Text>
        </Pressable>
        <Pressable onPress={() => setTab("search")}>
          <Text>Search</Text>
        </Pressable>
      </View>
      {tab === "home" ? children : <Text style={styles.placeholder}>Search placeholder</Text>}
    </View>
  );
}
 
export default function ProfilerNavigationDemo() {
  const posts = useMemo(() => POSTS, []);
  return (
    <UnstableShell>
      <Feed posts={posts} />
    </UnstableShell>
  );
}
 
const styles = StyleSheet.create({
  shell: { flex: 1 },
  header: { flexDirection: "row", gap: 16, padding: 16 },
  panel: { flex: 1 },
  heading: { paddingHorizontal: 16, fontWeight: "700" },
  list: { flex: 1 },
  row: { padding: 16 },
  title: { fontSize: 15 },
  placeholder: { padding: 16, color: "#64748b" },
});
```

**Profiler checklist for this screen**

| Symptom in recording | Likely cause | Fix |
| --- | --- | --- |
| Every `PostRow` commits on tab tap | Parent `Feed` re-rendered; unstable `renderItem` or missing `memo` | `useCallback` renderItem + `memo` row |
| `UnstableShell` commits all children | Inline `headerStyle` object | `useMemo` or `StyleSheet` |
| Rows commit when only `opened` changes | Expected - pass `extraData` | Ensure only affected rows need full tree work |
| Provider at root commits on navigation | Context value recreated | Split context; memoize `value` object |

## Navigation-Specific Hotspots

### Context providers at the root

```tsx
// BAD - new value every render
<AppContext.Provider value={{ theme, setTheme, cart, setCart }}>
 
// BETTER - split read/write or memoize value slices
const value = useMemo(() => ({ theme, cart }), [theme, cart]);
<AppContext.Provider value={value}>
```

Navigation often reads context in tab bars and headers. If the value object is fresh each render, **every screen under the provider commits**.

### Expo Router layouts

`_layout.tsx` files re-render when route segments change. Hoist heavy providers **below** the segment that changes, or split layouts so stack modals do not wrap the entire tab tree.

```tsx
// app/(tabs)/_layout.tsx - keep providers that do not need stack state here
// app/(tabs)/feed/_layout.tsx - stack-specific state stays in feed subtree
```

### List parents on stack push/pop

When a stack screen opens over a tab, the tab may stay mounted. If the feed parent subscribes to navigation focus events and calls `setState` on every blur, Profiler shows a spike on **all visible rows**. Debounce focus handlers and avoid storing navigation objects in React state.

## Reading Profiler Views

| View | Use for |
| --- | --- |
| **Flame graph** | Finding which parent dragged children into a commit |
| **Ranked** | Total time per component - start here for "who is slow" |
| **Timeline** | Correlating commits with gestures (scroll, tab switch) |

**React 19 "Why did this render?"** categories:

* **Props changed** - inline objects/functions from parent; fix parent stability.
* **State changed** - expected; narrow state ownership.
* **Context changed** - provider value identity; split or memoize.
* **Parent re-rendered** - child had no hook changes but parent forced reconciliation - add `memo` after parent is stable.

## Gotchas

* **Profiling in dev exaggerates render cost** - use Profiler for *relative* comparisons (before/after fix), not absolute ms budgets.
* **Strict Mode double render** - development may show duplicate commits; compare the same environment before and after.
* **Memo without stable props is useless** - Profiler will still show child commits if `renderItem` is a new function reference.
* **Do not profile only idle screens** - navigation transitions are where avoidable commits hide.

## FAQs

React Native DevTools vs standalone react-devtools?

Expo SDK 57 routes through **React Native DevTools** (press `j` in CLI). Use the embedded Profiler tab - the workflow matches React web DevTools for commits and ranked views.

How do I profile a release build?

DevTools attaches to debuggable builds. For release-like timing, use **Hermes sampling** and **Flashlight** alongside Profiler - see [Hermes Sampling Profiler](https://docs.wahwei/reactnative.codeguides.io/performance/hermes-sampling-profiler/) and [Flashlight Benchmarking](https://docs.wahwei/reactnative.codeguides.io/performance/flashlight-benchmarking/).

Should I memo every list row?

Only after `renderItem`, handlers, and parent context are stable. Otherwise Profiler shows rows committing anyway - see [List Performance Tuning](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/list-performance-tuning/).

Profiler shows Tabs layout re-rendering - is that normal?

Some re-render on focus is expected. Spikes that include the entire feed are not - stabilize `screenOptions`, `tabBarStyle`, and providers in `app/(tabs)/_layout.tsx`.

How does React 19 batching affect Profiler?

More automatic batching reduces duplicate commits from rapid `setState` - good. It does not fix unstable props from parents; referential equality rules are unchanged.

What commit time is "too slow"?

No universal ms threshold in Profiler - look for **unexpected commits** (all rows on modal open) and **ranked outliers** you can eliminate. Pair with FPS measurement on device for user-visible impact.

## Related

* [Performance Basics](https://docs.wahwei/reactnative.codeguides.io/performance/performance-basics/) - TTI, FPS, and memory vocabulary
* [List Performance Tuning](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/list-performance-tuning/) - `memo`, `extraData`, stable `renderItem`
* [Props, State & Re-renders on Mobile](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/props-state-and-re-renders-on-mobile/) - what triggers commits
* [Style Performance](https://docs.wahwei/reactnative.codeguides.io/styling-layout/style-performance/) - inline styles breaking memo equality
* [Tabs & Drawers](https://docs.wahwei/reactnative.codeguides.io/expo-router/tabs-and-drawers/) - `lazy` tabs and mount behavior
* [Performance Budget Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/performance-budget-rules/) - when regressions block release

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
