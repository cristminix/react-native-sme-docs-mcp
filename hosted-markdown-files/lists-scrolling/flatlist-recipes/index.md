# FlatList Recipes

`keyExtractor`, `getItemLayout`, separators, and empty states - the props you reach for on every feed screen.

Highlights / FlatList Recipes

* keyExtractor must return a stable string - never use array index for mutable lists
* getItemLayout unlocks instant scroll-to-index when every row height is known
* ItemSeparatorComponent keeps spacing out of row styles
* ListEmptyComponent renders when data is [] - not while loading
* extraData tells FlatList to re-render rows when selection state changes

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import { FlatList, StyleSheet, Text, View } from "react-native";
 
interface Message {
  id: string;
  body: string;
}
 
const ROW_HEIGHT = 72;
 
export function MessageList({ messages }: { messages: Message[] }) {
  return (
    <FlatList
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text numberOfLines={2}>{item.body}</Text>
        </View>
      )}
      getItemLayout={(_, index) => ({
        length: ROW_HEIGHT,
        offset: ROW_HEIGHT * index,
        index,
      })}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptyBody}>Pull to refresh or start a conversation.</Text>
        </View>
      }
      contentContainerStyle={messages.length === 0 ? styles.emptyContainer : styles.list}
    />
  );
}
 
const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: { height: ROW_HEIGHT, justifyContent: "center" },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: "#e2e8f0" },
  emptyContainer: { flexGrow: 1, justifyContent: "center", padding: 32 },
  empty: { alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  emptyBody: { fontSize: 14, color: "#64748b", textAlign: "center" },
});
```

**When to reach for this:** Any homogeneous, vertically scrolling list - inbox rows, settings items, product cards with uniform height.

## Working Example

```tsx
import { memo, useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from "react-native";
 
interface Contact {
  id: string;
  name: string;
  role: string;
}
 
const CONTACTS: Contact[] = [
  { id: "c1", name: "Alex Rivera", role: "Engineering" },
  { id: "c2", name: "Jordan Lee", role: "Design" },
  { id: "c3", name: "Sam Patel", role: "Product" },
  { id: "c4", name: "Casey Kim", role: "Support" },
];
 
const ROW_HEIGHT = 64;
 
const ContactRow = memo(function ContactRow({
  contact,
  selected,
  onPress,
}: {
  contact: Contact;
  selected: boolean;
  onPress: (id: string) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(contact.id)}
      style={[styles.row, selected && styles.rowSelected]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{contact.name[0]}</Text>
      </View>
      <View style={styles.meta}>
        <Text style={styles.name} numberOfLines={1}>
          {contact.name}
        </Text>
        <Text style={styles.role} numberOfLines={1}>
          {contact.role}
        </Text>
      </View>
    </Pressable>
  );
});
 
function Separator() {
  return <View style={styles.separator} />;
}
 
function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>No contacts</Text>
      <Text style={styles.emptyBody}>Try a different search or invite teammates.</Text>
    </View>
  );
}
 
export default function ContactPickerScreen() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
 
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CONTACTS;
    return CONTACTS.filter(
      (c) => c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q),
    );
  }, [query]);
 
  const handlePress = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);
 
  const renderItem: ListRenderItem<Contact> = useCallback(
    ({ item }) => (
      <ContactRow contact={item} selected={item.id === selectedId} onPress={handlePress} />
    ),
    [handlePress, selectedId],
  );
 
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.heading}>Contacts</Text>
        <Pressable
          onPress={() => setQuery((q) => (q ? "" : "design"))}
          style={styles.filterChip}
        >
          <Text style={styles.filterChipText}>{query ? "Clear filter" : "Filter: Design"}</Text>
        </Pressable>
      </View>
 
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        extraData={selectedId}
        getItemLayout={(_, index) => ({
          length: ROW_HEIGHT,
          offset: ROW_HEIGHT * index,
          index,
        })}
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={EmptyState}
        contentContainerStyle={
          filtered.length === 0 ? styles.emptyContainer : styles.list
        }
      />
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
    gap: 12,
  },
  heading: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
  },
  filterChipText: { fontSize: 13, fontWeight: "600", color: "#334155" },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: {
    height: ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  rowSelected: { backgroundColor: "#dbeafe" },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700" },
  meta: { flex: 1 },
  name: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  role: { fontSize: 13, color: "#64748b" },
  separator: { height: 8 },
  emptyContainer: { flexGrow: 1, justifyContent: "center" },
  empty: { alignItems: "center", padding: 32, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  emptyBody: { fontSize: 14, color: "#64748b", textAlign: "center" },
});
```

**What this demonstrates:**

* `keyExtractor` returns stable `id` strings - safe when the list is filtered or reordered.
* `getItemLayout` with a fixed `ROW_HEIGHT` enables `scrollToIndex` without measuring.
* `ItemSeparatorComponent` as a named function avoids re-creating the component each render.
* `ListEmptyComponent` shows when `data` is empty after filtering - distinct from a loading spinner.
* `extraData={selectedId}` forces row updates when selection changes but `data` reference is unchanged.
* `contentContainerStyle` with `flexGrow: 1` centers the empty state vertically.

## Deep Dive

### How It Works

* `FlatList` is a **virtualized** `ScrollView` - it mounts only rows near the viewport plus a configurable window.
* `data` is the source array; `renderItem` receives `{ item, index, separators }` for each visible row.
* `keyExtractor` supplies React keys for recycled row views - critical when items are inserted, deleted, or reordered.
* `getItemLayout` precomputes `(length, offset, index)` so the list can jump to any index without layout measurement.
* `ListEmptyComponent`, `ListHeaderComponent`, and `ListFooterComponent` render outside the virtualized row loop.
* `FlatList` extends `VirtualizedList`, which batches layout and defers off-screen work to keep scroll at 60 fps.

### Props at a Glance

| Prop | Purpose | When required |
| --- | --- | --- |
| `data` | Source array | Always |
| `renderItem` | Row renderer | Always |
| `keyExtractor` | Stable string key per item | Strongly recommended |
| `getItemLayout` | Fixed row size + offset | Uniform row height; `scrollToIndex` |
| `ItemSeparatorComponent` | Between-row divider | Visual spacing without row margin |
| `ListEmptyComponent` | Zero-item UI | Any list that can be empty |
| `ListHeaderComponent` / `ListFooterComponent` | Non-row chrome | Search bars, load-more footers |
| `extraData` | External state that affects rows | Selection, expanded IDs, theme |
| `contentContainerStyle` | Inner scroll padding / flex | Empty-state centering, bottom inset |
| `initialNumToRender` | First paint batch size | Tune first-frame cost vs blank flash |

### Separator Patterns

```tsx
// Hairline divider - full width
function HairlineSeparator() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: "#e2e8f0" }} />;
}
 
// Inset divider - starts after avatar column
function InsetSeparator() {
  return <View style={{ paddingLeft: 64 }}>
    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: "#e2e8f0" }} />
  </View>;
}
 
// Spacing only - no visible line
function GapSeparator() {
  return <View style={{ height: 8 }} />;
}
```

* Prefer `ItemSeparatorComponent` over `marginBottom` on rows - separators are not recycled with row views and stay visually consistent.
* For the last row, separators still render unless you branch inside `ItemSeparatorComponent` using `leadingItem` / `trailingItem` from `renderItem`'s `separators` helpers.

### Empty vs Loading vs Error

| State | `data` | What to render |
| --- | --- | --- |
| Loading (first fetch) | `[]` or omit list | Full-screen `ActivityIndicator` **above** the list |
| Empty (success, zero rows) | `[]` | `ListEmptyComponent` |
| Error | `[]` | `ListEmptyComponent` with retry action, or a dedicated error view |
| Loaded | `[...items]` | Normal rows |

* Do **not** use `ListEmptyComponent` for the initial loading spinner - it flashes for a frame when `data` starts empty.
* Branch before the list: `if (isLoading) return <Loader />;` then render `FlatList` with `ListEmptyComponent` for the settled empty case.

### getItemLayout Rules

```tsx
// Fixed height - multiply index by constant
getItemLayout={(_, index) => ({
  length: ROW_HEIGHT,
  offset: ROW_HEIGHT * index,
  index,
})}
 
// Fixed height + fixed separator
const SEPARATOR = 8;
getItemLayout={(_, index) => ({
  length: ROW_HEIGHT + SEPARATOR,
  offset: (ROW_HEIGHT + SEPARATOR) * index,
  index,
})}
```

* Off-by-one in `offset` causes scroll jank and wrong `scrollToIndex` targets.
* If row height varies, omit `getItemLayout` - wrong values are worse than no values.
* Changing `ROW_HEIGHT` without updating `getItemLayout` breaks scroll position math.

### TypeScript Notes

```tsx
import type { FlatListProps, ListRenderItem } from "react-native";
 
interface Place {
  id: string;
  name: string;
}
 
type PlaceListProps = Omit<FlatListProps<Place>, "data" | "renderItem" | "keyExtractor"> & {
  places: Place[];
  onSelect: (place: Place) => void;
};
 
function PlaceList({ places, onSelect, ...rest }: PlaceListProps) {
  const renderItem: ListRenderItem<Place> = useCallback(
    ({ item }) => <PlaceRow place={item} onPress={() => onSelect(item)} />,
    [onSelect],
  );
 
  return (
    <FlatList
      data={places}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      {...rest}
    />
  );
}
```

* Pass the item generic: `FlatList<Place>` so `renderItem` and `keyExtractor` infer `item` type.
* Extract `ListRenderItem<T>` for stable `useCallback` typing.
* `ListEmptyComponent` accepts `React.ComponentType` or `React.ReactElement` - prefer a component reference over `() => <View />` inline.

### Parameters & Return Values

| Parameter | Type | Description |
| --- | --- | --- |
| `data` | `readonly T[] | null | undefined` | Items to virtualize; `null`/`undefined` treated as empty |
| `renderItem` | `ListRenderItem<T>` | Returns the row element for one item |
| `keyExtractor` | `(item: T, index: number) => string` | Unique stable key; avoid index for mutable lists |
| `getItemLayout` | `(data, index) => { length, offset, index }` | Precomputed layout for fixed-size rows |
| `extraData` | `any` | Triggers row refresh when external state changes |
| `ItemSeparatorComponent` | `ComponentType` | Rendered between items, not after the last |
| `ListEmptyComponent` | `ComponentType | ReactElement` | Shown when `data` length is 0 |

## Gotchas

* **Using array index in `keyExtractor`** - Inserting or deleting rows re-keys siblings, causing state bleed in recycled views (wrong avatar, stale checkbox). **Fix:** Use a server- or client-assigned stable `id`.
* **Inline `renderItem` arrow on every render** - A new function identity defeats `memo` on row components. **Fix:** `useCallback` the renderer or extract a `ListRenderItem` with stable deps.
* **Forgetting `extraData` for selection state** - `FlatList` is a `PureComponent`; unchanged `data` skips `renderItem` even when `selectedId` changes. **Fix:** Pass `extraData={selectedId}` (or an array/hash of row-affecting state).
* **Wrong `getItemLayout` math with separators** - Separator height must be included in `length` and `offset` or `scrollToIndex` lands between rows. **Fix:** Add separator height to the formula or drop `getItemLayout` for variable layouts.
* **`ListEmptyComponent` during initial load** - Users see "No results" for a frame before data arrives. **Fix:** Show a loading branch outside the list; reserve `ListEmptyComponent` for settled empty results.
* **`contentContainerStyle` without `flexGrow: 1` for centered empty states** - Empty UI hugs the top of the scroll area. **Fix:** `contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}` when `data.length === 0`.
* **Anonymous `ItemSeparatorComponent={() => ...}`** - Creates a new component type each render, forcing unnecessary separator remounts. **Fix:** Hoist to a named function or `memo` wrapper.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `FlatList` | Long homogeneous lists, standard RN APIs | Highest-throughput feeds - consider FlashList |
| `SectionList` | Data grouped into titled sections | Flat list with no section headers |
| `ScrollView` + `map` | < ~20 static rows, mixed content | Hundreds of rows - no virtualization |
| `FlashList` | Performance-critical feeds, variable row heights with estimates | Tiny settings screens where FlatList is enough |
| `FlashList` `estimatedItemSize` | Migrating from FlatList for perf | You need zero new dependencies |

## FAQs

Do I always need keyExtractor?

Not strictly - `FlatList` falls back to `key={index}`. For any list that mutates (add, remove, reorder, filter), stable keys are mandatory. Always provide `keyExtractor={(item) => item.id}` when items have ids.

When does getItemLayout matter?

When every row (plus separator) has a **known fixed height** and you need `scrollToIndex`, `scrollToItem`, or `initialScrollIndex` without layout measurement delays. Skip it when rows wrap text or have dynamic media heights.

What is extraData for?

`FlatList` shallow-compares `data`. If row appearance depends on state outside `data` - selection, expanded rows, dark mode - pass that state as `extraData` so visible rows re-render when it changes.

How do I add a header above the list?

Use `ListHeaderComponent` for content that scrolls with the list (search field, section title). Pin a header outside the `FlatList` when it must stay fixed while rows scroll.

ItemSeparatorComponent vs margin on rows?

Separators are not tied to recycled row views and keep spacing consistent when virtualization remounts cells. Margin on the last row often needs `:last-child` hacks - separators handle between-row gaps cleanly.

How do I center ListEmptyComponent vertically?

```tsx
contentContainerStyle={
  data.length === 0
    ? { flexGrow: 1, justifyContent: "center", padding: 32 }
    : { padding: 16 }
}
```

`flexGrow: 1` lets the content container fill the scroll viewport.

Can ListEmptyComponent include a button?

Yes - return a `Pressable` with `onPress` that triggers refetch or navigation. Keep empty-state actions in `ListEmptyComponent`; keep loading spinners outside the list.

Why does scrollToIndex fail or warn?

Common causes: missing `getItemLayout` on variable-height rows, index out of range, or list not yet laid out. Call `scrollToIndex` in `onLayout` or `requestAnimationFrame` after data is set; provide correct `getItemLayout` for fixed heights.

Should renderItem be inline or extracted?

Extract to `useCallback` or a `ListRenderItem` constant when rows use `memo`. Inline `({ item }) => <Row item={item} />` is fine for prototypes; production feeds should stabilize the reference.

How do I type keyExtractor and renderItem?

Use `FlatList<MyItem>` and `ListRenderItem<MyItem>`. TypeScript infers `item` in both callbacks. Avoid casting `item as MyItem` inside the list.

Does FlatList work inside a flex: 1 parent?

Yes - the list must have bounded height. Put `FlatList` in a `View` with `flex: 1` (or `style={{ flex: 1 }}` on the list). Unbounded height parents break virtualization.

What is initialNumToRender?

Count of rows rendered on first mount (default ~10). Lower it for heavy rows to improve time-to-interactive; raise it to reduce blank area on tall screens. Tune with `maxToRenderPerBatch` and `windowSize` for scroll feel.

How do I add pull-to-refresh?

Pass `refreshing` and `onRefresh` to `FlatList` (or a `refreshControl` prop). See [Infinite Scroll & Pagination](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/infinite-scroll-and-pagination/) for pagination and refresh patterns together.

FlatList vs mapping inside ScrollView?

Under ~20 simple static rows, `ScrollView` + `map` is fine. Beyond that, or when rows are expensive, `FlatList` virtualizes and keeps memory flat. See [Lists Basics](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/lists-basics/) for the decision threshold.

Where do I optimize row re-renders?

After mastering these props, move to [List Performance Tuning](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/list-performance-tuning/) for `memo`, `windowSize`, and `removeClippedSubviews` tuning.

## Related

* [Lists Basics](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/lists-basics/) - when `ScrollView` is enough and when virtualization is mandatory
* [SectionList & Grouped Data](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/sectionlist-and-grouped-data/) - sticky headers and grouped sections
* [Infinite Scroll & Pagination](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/infinite-scroll-and-pagination/) - `onEndReached`, pull-to-refresh, and loading footers
* [List Performance Tuning](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/list-performance-tuning/) - `memo`, `windowSize`, and stable `renderItem`
* [FlashList vs FlatList](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/flashlist-vs-flatlist/) - when to upgrade list virtualization
* [Props, State & Re-renders on Mobile](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/props-state-and-re-renders-on-mobile/) - `extraData` and `useCallback` for row stability

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
