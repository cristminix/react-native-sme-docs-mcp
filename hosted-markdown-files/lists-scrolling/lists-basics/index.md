# Lists Basics

10 examples to get you started with Lists & Scrolling - 7 basic and 3 intermediate.

Highlights / Lists Basics

* ScrollView renders every child up front - fine for short, static lists
* FlatList virtualizes rows and only mounts what is on screen
* keyExtractor must return a stable, unique string per row
* ListEmptyComponent shows a placeholder when data is an empty array
* Pull-to-refresh wires RefreshControl to onRefresh and refreshing state
* SectionList groups rows under section headers for contacts-style UIs
* extraData tells FlatList to re-render rows when props outside data change

## Prerequisites

Every example below uses built-in React Native list primitives - no extra packages. Scaffold a standard **Expo SDK 57** TypeScript app and replace `App.tsx` to run each snippet.

```bash
npx create-expo-app@latest MyListsApp --template blank-typescript
cd MyListsApp
npx expo start
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**.

---

## Basic Examples

### 1. ScrollView for Short, Static Lists

`ScrollView` mounts **every child immediately**. That is acceptable when the item count is small and fixed - settings screens, legal copy, onboarding steps.

```tsx
import { ScrollView, StyleSheet, Text, View } from "react-native";
 
const SETTINGS = [
  { id: "profile", label: "Edit profile" },
  { id: "notifications", label: "Notifications" },
  { id: "privacy", label: "Privacy" },
  { id: "help", label: "Help center" },
] as const;
 
export default function App() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Settings</Text>
      {SETTINGS.map((item) => (
        <View key={item.id} style={styles.row}>
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
 
const styles = StyleSheet.create({
  content: { padding: 16, gap: 8 },
  heading: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  row: {
    padding: 16,
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
  },
  label: { fontSize: 16 },
});
```

* Use `ScrollView` when you have **roughly fewer than 20 simple rows** and the list rarely grows at runtime
* `contentContainerStyle` pads the scrollable content; the scroll view itself still needs a bounded height (`flex: 1` on a parent `View` if needed)
* Each mapped child needs a **`key`** - here `item.id` is stable
* Once the list can grow without bound (feeds, search results, chat history), switch to `FlatList` - mounting hundreds of rows in a `ScrollView` stalls the JS thread and blows up memory

> **Related:** [Virtualization Gotchas](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/virtualization-gotchas/) - why unbounded `ScrollView` lists freeze low-end devices

---

### 2. FlatList for Long or Growing Lists

`FlatList` **virtualizes** rows: it renders only what is visible plus a small buffer. Pass `data` and `renderItem` - that is the minimum viable list.

```tsx
import { FlatList, StyleSheet, Text, View } from "react-native";
 
type Post = { id: string; title: string };
 
const POSTS: Post[] = Array.from({ length: 200 }, (_, index) => ({
  id: String(index + 1),
  title: `Post #${index + 1}`,
}));
 
export default function App() {
  return (
    <FlatList
      data={POSTS}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.title}>{item.title}</Text>
        </View>
      )}
      contentContainerStyle={styles.content}
    />
  );
}
 
const styles = StyleSheet.create({
  content: { padding: 16 },
  row: {
    padding: 16,
    marginBottom: 8,
    backgroundColor: "#eef2ff",
    borderRadius: 10,
  },
  title: { fontSize: 16, fontWeight: "600" },
});
```

* `data` is a plain array - when it changes, `FlatList` diffs by `keyExtractor` and recycles native views
* `renderItem` receives `{ item, index, separators }` - keep it **pure and fast**; heavy work belongs in memoized child components
* Default scroll direction is **vertical**; the list fills its parent - wrap in `View style={{ flex: 1 }}` inside a screen with a header
* Rule of thumb: if users can scroll for more than a screen or two, **`FlatList` is mandatory**

> **Related:** [FlatList Recipes](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/flatlist-recipes/) - separators, `getItemLayout`, and empty-state polish

---

### 3. keyExtractor and Stable Row Identity

`keyExtractor` tells React Native how to match rows across updates. Unstable keys cause flicker, lost scroll position, and broken selection state.

```tsx
import { FlatList, StyleSheet, Text, View } from "react-native";
 
type Task = { id: string; label: string; done: boolean };
 
const TASKS: Task[] = [
  { id: "t1", label: "Ship list empty state", done: false },
  { id: "t2", label: "Add pull-to-refresh", done: true },
  { id: "t3", label: "Profile SectionList", done: false },
];
 
export default function App() {
  return (
    <FlatList
      data={TASKS}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.bullet}>{item.done ? "✓" : "○"}</Text>
          <Text style={[styles.label, item.done && styles.done]}>{item.label}</Text>
        </View>
      )}
      contentContainerStyle={styles.content}
    />
  );
}
 
const styles = StyleSheet.create({
  content: { padding: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  bullet: { fontSize: 18, width: 24, textAlign: "center" },
  label: { fontSize: 16, flex: 1 },
  done: { textDecorationLine: "line-through", color: "#9ca3af" },
});
```

* Prefer a **server-issued `id`** over array index - reordering, filtering, or prepending rows breaks index-based keys
* Never use `Math.random()` or `Date.now()` per render - keys must be **stable for the lifetime of the row**
* If your API returns numeric ids, coerce to string: `keyExtractor={(item) => String(item.id)}`
* Duplicate keys log a warning and produce unpredictable recycling behavior

> **Related:** [FlatList Recipes](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/flatlist-recipes/) - `getItemLayout` pairs well with stable ids for scroll-to-index

---

### 4. ListEmptyComponent

When `data` is `[]`, `FlatList` renders nothing unless you provide `ListEmptyComponent` - the standard hook for loading, error, and zero-result states.

```tsx
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
 
type Bookmark = { id: string; title: string };
 
export default function App() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    const timer = setTimeout(() => {
      setBookmarks([]);
      setLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);
 
  return (
    <FlatList
      data={bookmarks}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text>{item.title}</Text>
        </View>
      )}
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator style={styles.empty} />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No bookmarks yet</Text>
            <Text style={styles.emptyBody}>
              Save articles from the feed and they will show up here.
            </Text>
          </View>
        )
      }
      contentContainerStyle={bookmarks.length === 0 ? styles.emptyContainer : styles.content}
    />
  );
}
 
const styles = StyleSheet.create({
  content: { padding: 16 },
  emptyContainer: { flexGrow: 1, justifyContent: "center" },
  empty: { alignItems: "center", padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  emptyBody: { fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 20 },
  row: { padding: 16, backgroundColor: "#f9fafb", borderRadius: 8, marginBottom: 8 },
});
```

* `ListEmptyComponent` renders **instead of** `renderItem` when `data.length === 0` - one component can branch on loading vs empty
* Add `flexGrow: 1` to `contentContainerStyle` when the empty state should **vertically center** inside the screen
* Keep empty UI in a **small dedicated component** once copy, icons, and CTA buttons grow
* Do not put the loading spinner only in `ListHeaderComponent` - users still see an empty list body underneath

> **Related:** [FlatList Recipes](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/flatlist-recipes/) - empty-state layout patterns and skeleton rows

---

### 5. Pull-to-Refresh

Mobile users expect overscroll refresh. Wire `refreshing` state to `onRefresh` and pass a `RefreshControl` - or use the `FlatList` shorthand props.

```tsx
import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
 
type Message = { id: string; body: string };
 
const INITIAL: Message[] = [
  { id: "1", body: "Welcome to the inbox." },
  { id: "2", body: "Pull down to fetch newer messages." },
];
 
export default function App() {
  const [messages, setMessages] = useState(INITIAL);
  const [refreshing, setRefreshing] = useState(false);
 
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setMessages((prev) => [
      { id: String(Date.now()), body: "New message just arrived." },
      ...prev,
    ]);
    setRefreshing(false);
  }, []);
 
  return (
    <FlatList
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.body}>{item.body}</Text>
        </View>
      )}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={styles.content}
    />
  );
}
 
const styles = StyleSheet.create({
  content: { padding: 16 },
  row: {
    padding: 16,
    marginBottom: 8,
    backgroundColor: "#ecfdf5",
    borderRadius: 10,
  },
  body: { fontSize: 15, lineHeight: 22 },
});
```

* `refreshing` must become `true` when work starts and **`false` when finished** - leaving it stuck shows a perpetual spinner
* Debounce or guard `onRefresh` if users rubber-band repeatedly; ignore overlapping calls with a ref or early return
* On Android, tint colors differ - pass `colors` (Android) and `tintColor` (iOS) on `RefreshControl` to match brand
* Pagination at the bottom uses `onEndReached`, not pull-to-refresh - see the infinite-scroll guide for load-more patterns

> **Related:** [Infinite Scroll & Pagination](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/infinite-scroll-and-pagination/) - `onEndReached`, cursors, and duplicate-page guards

---

### 6. ItemSeparatorComponent

Separators belong in list props, not inside every row. `ItemSeparatorComponent` keeps `renderItem` focused on row content.

```tsx
import { FlatList, StyleSheet, Text, View } from "react-native";
 
type City = { id: string; name: string; country: string };
 
const CITIES: City[] = [
  { id: "1", name: "Tokyo", country: "Japan" },
  { id: "2", name: "Berlin", country: "Germany" },
  { id: "3", name: "São Paulo", country: "Brazil" },
  { id: "4", name: "Toronto", country: "Canada" },
];
 
function Separator() {
  return <View style={styles.separator} />;
}
 
export default function App() {
  return (
    <FlatList
      data={CITIES}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.country}>{item.country}</Text>
        </View>
      )}
      ItemSeparatorComponent={Separator}
      contentContainerStyle={styles.content}
    />
  );
}
 
const styles = StyleSheet.create({
  content: { padding: 16, backgroundColor: "#fff", borderRadius: 12 },
  row: { paddingVertical: 14 },
  name: { fontSize: 16, fontWeight: "600" },
  country: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#e5e7eb",
  },
});
```

* Separators render **between** rows, not after the last item - no extra trailing divider logic in `renderItem`
* `FlatList` also exposes `ItemSeparatorComponent` via `renderItem`'s `separators.highlight()` for touch feedback - useful in contact pickers
* For sectioned data, use `SectionList` with `renderSectionHeader` instead of faking dividers in a flat array
* Memoize heavy separators with `React.memo` if they allocate gradients or SVG on each recycle

> **Related:** [FlatList Recipes](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/flatlist-recipes/) - inset separators and last-row border exceptions

---

### 7. SectionList for Grouped Data

When rows belong to named groups - contacts by letter, tasks by status - `SectionList` renders **sections** with optional sticky headers.

```tsx
import { SectionList, StyleSheet, Text, View } from "react-native";
 
type Person = { id: string; name: string };
 
type Section = { title: string; data: Person[] };
 
const SECTIONS: Section[] = [
  {
    title: "Engineering",
    data: [
      { id: "1", name: "Alex Kim" },
      { id: "2", name: "Jordan Lee" },
    ],
  },
  {
    title: "Design",
    data: [
      { id: "3", name: "Sam Rivera" },
      { id: "4", name: "Casey Ng" },
    ],
  },
];
 
export default function App() {
  return (
    <SectionList
      sections={SECTIONS}
      keyExtractor={(item) => item.id}
      renderSectionHeader={({ section }) => (
        <View style={styles.header}>
          <Text style={styles.headerText}>{section.title}</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.name}>{item.name}</Text>
        </View>
      )}
      stickySectionHeadersEnabled
      contentContainerStyle={styles.content}
    />
  );
}
 
const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  header: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerText: { fontSize: 13, fontWeight: "700", color: "#4b5563" },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  name: { fontSize: 16 },
});
```

* Each section is `{ title, data: T[] }` - `data` holds the rows for that group; other metadata (counts, badges) can live on the section object
* `renderSectionHeader` receives `{ section }` - style headers differently from rows for scanability
* `stickySectionHeadersEnabled` keeps the current section label pinned while scrolling - standard for contacts and calendars
* Flattening grouped API responses into one array loses section boundaries - **reshape once** in a selector or hook, then pass `sections`

> **Related:** [SectionList & Grouped Data](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/sectionlist-and-grouped-data/) - footers, multi-column sections, and sticky-header tuning

---

## Intermediate Examples

### 8. ListHeaderComponent and ListFooterComponent

Screen chrome that scrolls with the list - titles, filters, load-more hints - belongs in header/footer slots, not inside every row.

```tsx
import { FlatList, StyleSheet, Text, View } from "react-native";
 
type Item = { id: string; label: string };
 
const DATA: Item[] = [
  { id: "1", label: "Audit list keys" },
  { id: "2", label: "Measure scroll jank" },
  { id: "3", label: "Ship skeleton loader" },
];
 
function ListHeader() {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Sprint backlog</Text>
      <Text style={styles.subtitle}>3 items · swipe down on a feed to refresh</Text>
    </View>
  );
}
 
function ListFooter() {
  return (
    <Text style={styles.footer}>End of backlog - footer scrolls with content.</Text>
  );
}
 
export default function App() {
  return (
    <FlatList
      data={DATA}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text>{item.label}</Text>
        </View>
      )}
      ListHeaderComponent={ListHeader}
      ListFooterComponent={ListFooter}
      contentContainerStyle={styles.content}
    />
  );
}
 
const styles = StyleSheet.create({
  content: { padding: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  row: {
    padding: 14,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    marginBottom: 8,
  },
  footer: {
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 13,
    marginTop: 8,
    marginBottom: 24,
  },
});
```

* Header and footer **scroll away** with content - use a fixed screen header outside the list when navigation chrome must stay put
* `ListFooterComponent` is the idiomatic place for **"loading more"** spinners when paginating (not `ListEmptyComponent`)
* Extract header/footer components so list files stay readable; pass filter state via props or context
* For a pinned filter bar, compose a column: fixed `View` on top, `FlatList` with `flex: 1` below

> **Related:** [Infinite Scroll & Pagination](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/infinite-scroll-and-pagination/) - footer loaders and `onEndReachedThreshold`

---

### 9. Horizontal FlatList

Carousels, tag chips, and thumbnail strips use the same `FlatList` API with `horizontal` - still virtualized along the cross axis.

```tsx
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
 
const TAGS = [
  { id: "all", label: "All" },
  { id: "design", label: "Design" },
  { id: "mobile", label: "Mobile" },
  { id: "perf", label: "Performance" },
  { id: "a11y", label: "Accessibility" },
] as const;
 
export default function App() {
  const [active, setActive] = useState<string>("all");
 
  return (
    <View style={styles.screen}>
      <Text style={styles.heading}>Topics</Text>
      <FlatList
        data={TAGS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const selected = item.id === active;
          return (
            <Pressable
              onPress={() => setActive(item.id)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {item.label}
              </Text>
            </Pressable>
          );
        }}
        contentContainerStyle={styles.strip}
      />
      <Text style={styles.caption}>Selected: {active}</Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 24 },
  heading: { fontSize: 18, fontWeight: "600", paddingHorizontal: 16, marginBottom: 12 },
  strip: { paddingHorizontal: 16, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
  },
  chipSelected: { backgroundColor: "#2563eb" },
  chipText: { fontSize: 14, color: "#374151" },
  chipTextSelected: { color: "#fff", fontWeight: "600" },
  caption: { padding: 16, color: "#6b7280" },
});
```

* `horizontal` flips the scroll axis - **`keyExtractor` and `renderItem` stay the same**
* Set `showsHorizontalScrollIndicator={false}` for chip rails; keep it `true` for image carousels where affordance helps
* Use `gap` in `contentContainerStyle` (RN 0.71+) or margin on items for spacing - avoid padding hacks on the last chip
* Nested horizontal lists inside a vertical `FlatList` need careful gesture setup - see the nested-scrollables guide before shipping feeds with inline carousels

> **Related:** [Nested Scrollables](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/nested-scrollables/) - vertical + horizontal gesture conflicts

---

### 10. extraData for Row Re-renders

`FlatList` memoizes rows against `data`. When row appearance depends on **external state** (selection, theme, expanded id), pass `extraData` so visible rows update.

```tsx
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
 
type File = { id: string; name: string };
 
const FILES: File[] = [
  { id: "a", name: "Quarterly-report.pdf" },
  { id: "b", name: "Launch-checklist.md" },
  { id: "c", name: "App-icons.sketch" },
];
 
export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
 
  return (
    <FlatList
      data={FILES}
      extraData={selectedId}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        const selected = item.id === selectedId;
        return (
          <Pressable
            onPress={() => setSelectedId(item.id)}
            style={[styles.row, selected && styles.rowSelected]}
          >
            <Text style={[styles.name, selected && styles.nameSelected]}>
              {item.name}
            </Text>
          </Pressable>
        );
      }}
      contentContainerStyle={styles.content}
    />
  );
}
 
const styles = StyleSheet.create({
  content: { padding: 16 },
  row: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  rowSelected: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
  name: { fontSize: 15 },
  nameSelected: { fontWeight: "600", color: "#1d4ed8" },
});
```

* Without `extraData`, toggling `selectedId` may **not re-render visible rows** because the `data` array reference is unchanged
* Pass a primitive (`selectedId`), an object, or an array - whatever your `renderItem` reads from outside `item`
* For complex selection, store a `Set` or `Record` in state and pass it as `extraData`, or embed flags directly in `data` when you control the model
* Pair with `React.memo` on extracted row components and a stable `renderItem` callback for larger lists - see performance tuning for `windowSize` and `maxToRenderPerBatch`

> **Related:** [List Performance Tuning](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/list-performance-tuning/) - `windowSize`, memoized rows, and batch sizes | [FlashList vs FlatList](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/flashlist-vs-flatlist/) - when to upgrade virtualization libraries

---

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4). 49454e4f4d5f434e4f5904434556494d4345131e1f56181a181c1a1d

Reviewed by Chris St. John·Last updated Jul 19, 2026
