# Infinite Scroll & Pagination

Cursor pages, pull-to-refresh, and loading skeletons - the standard feed loading pattern on mobile.

Highlights / Infinite Scroll & Pagination

* onEndReached fires when the user nears the list end - guard with a loading ref
* Cursor pagination appends pages without offset math drifting on live feeds
* refreshing + onRefresh is pull-to-refresh - separate from infinite load
* ListFooterComponent shows inline load-more - not ListEmptyComponent
* TanStack Query useInfiniteQuery pairs cleanly with FlatList append

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
 
interface PageResult<T> {
  items: T[];
  nextCursor: string | null;
}
 
async function fetchPage(cursor?: string): Promise<PageResult<{ id: string; title: string }>> {
  const res = await fetch(`https://api.example.com/posts?cursor=${cursor ?? ""}`);
  return res.json();
}
 
export function InfinitePostList() {
  const [items, setItems] = useState<{ id: string; title: string }[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingRef = useRef(false);
 
  const load = useCallback(async (mode: "refresh" | "more") => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    mode === "refresh" ? setRefreshing(true) : setLoadingMore(true);
 
    try {
      const page = await fetchPage(mode === "refresh" ? undefined : cursor ?? undefined);
      setItems((prev) => (mode === "refresh" ? page.items : [...prev, ...page.items]));
      setCursor(page.nextCursor);
    } finally {
      loadingRef.current = false;
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [cursor]);
 
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text>{item.title}</Text>
        </View>
      )}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} />}
      onEndReached={() => cursor && load("more")}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        loadingMore ? <ActivityIndicator style={styles.footer} /> : null
      }
    />
  );
}
 
const styles = StyleSheet.create({
  row: { padding: 16, backgroundColor: "#fff" },
  footer: { paddingVertical: 24 },
});
```

**When to reach for this:** Social feeds, search results, notification history - any list backed by paginated server data.

## Working Example

```tsx
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
 
interface Notification {
  id: string;
  body: string;
  read: boolean;
}
 
interface Page {
  items: Notification[];
  nextCursor: string | null;
}
 
// Simulated cursor API
const MOCK_DB: Notification[] = Array.from({ length: 48 }, (_, i) => ({
  id: `n-${i}`,
  body: `Notification ${i + 1}`,
  read: i % 3 === 0,
}));
 
async function fetchNotifications(cursor: string | null, pageSize = 12): Promise<Page> {
  await new Promise((r) => setTimeout(r, 600));
  const start = cursor ? Number(cursor) : 0;
  const slice = MOCK_DB.slice(start, start + pageSize);
  const next = start + pageSize < MOCK_DB.length ? String(start + pageSize) : null;
  return { items: slice, nextCursor: next };
}
 
function SkeletonRow() {
  return (
    <View style={styles.skeletonRow}>
      <View style={styles.skeletonDot} />
      <View style={styles.skeletonLines}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
      </View>
    </View>
  );
}
 
function NotificationRow({ item }: { item: Notification }) {
  return (
    <View style={[styles.row, !item.read && styles.rowUnread]}>
      <Text style={styles.body}>{item.body}</Text>
    </View>
  );
}
 
export default function NotificationFeedScreen() {
  const [items, setItems] = useState<Notification[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
 
  const loadPage = useCallback(
    async (mode: "initial" | "refresh" | "more") => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setError(null);
 
      if (mode === "initial") setInitialLoading(true);
      if (mode === "refresh") setRefreshing(true);
      if (mode === "more") setLoadingMore(true);
 
      try {
        const page = await fetchNotifications(mode === "more" ? cursor : null);
        setItems((prev) => (mode === "more" ? [...prev, ...page.items] : page.items));
        setCursor(page.nextCursor);
      } catch {
        setError("Could not load notifications.");
      } finally {
        loadingRef.current = false;
        setInitialLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [cursor],
  );
 
  // Initial fetch
  if (initialLoading) {
    return (
      <View style={styles.screen}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </View>
    );
  }
 
  return (
    <View style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationRow item={item} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadPage("refresh")} />
        }
        onEndReached={() => {
          if (cursor) loadPage("more");
        }}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          error ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{error}</Text>
              <Pressable onPress={() => loadPage("refresh")} style={styles.retry}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>All caught up</Text>
              <Text style={styles.emptyBody}>No notifications right now.</Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={styles.footerSpinner} color="#2563eb" />
          ) : cursor ? (
            <Text style={styles.footerHint}>Scroll for more</Text>
          ) : (
            <Text style={styles.footerHint}>End of list</Text>
          )
        }
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  rowUnread: { backgroundColor: "#eff6ff" },
  body: { fontSize: 15, color: "#0f172a" },
  skeletonRow: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    alignItems: "center",
  },
  skeletonDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#e2e8f0",
  },
  skeletonLines: { flex: 1, gap: 8 },
  skeletonLine: { height: 10, borderRadius: 4, backgroundColor: "#e2e8f0" },
  skeletonLineShort: { width: "60%" },
  emptyContainer: { flexGrow: 1, justifyContent: "center" },
  empty: { alignItems: "center", padding: 32, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#0f172a" },
  emptyBody: { fontSize: 14, color: "#64748b" },
  retry: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#2563eb",
  },
  retryText: { color: "#fff", fontWeight: "600" },
  footerSpinner: { paddingVertical: 20 },
  footerHint: {
    textAlign: "center",
    fontSize: 12,
    color: "#94a3b8",
    paddingVertical: 16,
  },
});
```

**What this demonstrates:**

* **Three loading modes:** skeleton screen (initial), `RefreshControl` (pull-to-refresh), `ListFooterComponent` spinner (load more).
* **`loadingRef` guard** prevents duplicate `onEndReached` fetches when the user bounces at the bottom.
* **Cursor pagination** - `nextCursor` is `null` when exhausted; `onEndReached` only fires when `cursor` is truthy.
* **`onEndReachedThreshold={0.3}`** triggers the next page when the user is 30% from the end.
* **Empty vs error** - `ListEmptyComponent` handles settled zero-results and retry; skeleton handles first paint.

## Deep Dive

### How It Works

* `onEndReached` fires when the scroll position crosses a threshold from the list bottom - controlled by `onEndReachedThreshold` (0 = bottom, 1 = top of visible area; commonly 0.2–0.5).
* `onEndReached` can fire **multiple times** per approach (layout changes, bounce, new items) - always guard with a ref or query `isFetching` flag.
* Pull-to-refresh uses `refreshing` + `onRefresh` on `FlatList`, or an explicit `refreshControl` prop for custom colors.
* **Cursor pagination** returns `nextCursor` with each page - append items, pass cursor on the next request. Avoids offset drift when items are inserted/deleted server-side.
* **Offset pagination** (`?page=3`) is simpler but breaks when the feed mutates between requests.
* Initial load should **not** use `ListEmptyComponent` - render a skeleton or full-screen loader until the first page settles.

### Pagination Strategies

| Strategy | Request | Append pattern | Risk |
| --- | --- | --- | --- |
| Cursor | `?cursor=abc` | `setItems(prev => [...prev, ...page])` | Server must issue stable cursors |
| Offset/limit | `?offset=40&limit=20` | Same append | Duplicates/skips if feed mutates |
| Page number | `?page=3` | Same append | Same as offset |
| Keyset | `?after_id=xyz` | Same append | Needs sort-stable id column |

```tsx
// Cursor append - preferred for live feeds
setItems((prev) => (isRefresh ? page.items : [...prev, ...page.items]));
setCursor(page.nextCursor);
 
// Deduplicate if API may overlap
setItems((prev) => {
  const map = new Map(prev.map((i) => [i.id, i]));
  for (const item of page.items) map.set(item.id, item);
  return Array.from(map.values());
});
```

### onEndReached Tuning

```tsx
<FlatList
  onEndReached={fetchNextPage}
  onEndReachedThreshold={0.3}  // 30% from bottom of content length
  // Optional: only when list is scrollable
  onMomentumScrollEnd={(e) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const distanceFromEnd =
      contentSize.height - layoutMeasurement.height - contentOffset.y;
    if (distanceFromEnd < 200 && hasNextPage) fetchNextPage();
  }}
/>
```

* Lower threshold (0.1) - fetch later, closer to the bottom.
* Higher threshold (0.5) - prefetch earlier, smoother for slow networks.
* `onEndReached` on **short lists** that do not fill the screen may fire immediately - check `hasNextPage` and content height.

### TanStack Query Pattern

```tsx
import { useInfiniteQuery } from "@tanstack/react-query";
import { FlatList, RefreshControl } from "react-native";
 
const query = useInfiniteQuery({
  queryKey: ["posts"],
  queryFn: ({ pageParam }) => fetchPosts(pageParam),
  initialPageParam: null as string | null,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});
 
const items = query.data?.pages.flatMap((p) => p.items) ?? [];
 
<FlatList
  data={items}
  onEndReached={() => query.hasNextPage && query.fetchNextPage()}
  refreshControl={
    <RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} />
  }
  ListFooterComponent={query.isFetchingNextPage ? <Spinner /> : null}
/>
```

* `isFetchingNextPage` for footer spinner; `isRefetching` for pull-to-refresh (not `isLoading` on refetch).
* `flatMap` pages into one array for `FlatList` `data`.

### Loading UI Matrix

| Phase | UI | Component |
| --- | --- | --- |
| First load | Skeleton rows or shimmer | Full-screen above list |
| Pull-to-refresh | Native spinner in header | `RefreshControl` |
| Load more | Small spinner at bottom | `ListFooterComponent` |
| Exhausted | "End of list" copy | `ListFooterComponent` |
| Error (no data) | Message + retry | `ListEmptyComponent` |
| Error (has data) | Toast or inline banner | Outside list |

### TypeScript Notes

```tsx
interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
}
 
type LoadMode = "initial" | "refresh" | "more";
 
interface PaginationState<T> {
  items: T[];
  cursor: string | null;
  load: (mode: LoadMode) => Promise<void>;
  refreshing: boolean;
  loadingMore: boolean;
}
```

* Type the cursor as `string | null` - `null` means no more pages.
* Discriminate load modes so refresh replaces items and "more" appends.

### Parameters & Return Values

| Parameter | Type | Description |
| --- | --- | --- |
| `onEndReached` | `() => void` | Called near list end - append next page |
| `onEndReachedThreshold` | `number` | Fraction of visible length from end (0–1) |
| `refreshing` | `boolean` | Controls pull-to-refresh spinner visibility |
| `onRefresh` | `() => void` | Pull-to-refresh handler (replaces first page) |
| `ListFooterComponent` | `ComponentType | ReactElement` | Load-more spinner or end-of-list label |
| `refreshControl` | `ReactElement` | Custom `RefreshControl` (tint, colors) |

## Gotchas

* **Double fetch on `onEndReached`** - Fires twice when layout shifts after append. **Fix:** `loadingRef` or `if (isFetching) return` before every fetch.
* **`onEndReached` on mount with short data** - List is not scrollable but threshold triggers immediately. **Fix:** Only fetch more when `hasNextPage && items.length > 0`; optionally compare `contentSize` to `layoutMeasurement`.
* **Using `ListEmptyComponent` for loading** - Flashes "No results" before first response. **Fix:** Branch on `initialLoading` before rendering the list.
* **Replacing items on load-more** - `setItems(page.items)` wipes earlier pages. **Fix:** Append: `setItems(prev => [...prev, ...page.items])` except on refresh.
* **Offset pagination on live feeds** - New items at the top shift indices; page 3 returns duplicates. **Fix:** Cursor or keyset pagination from the API.
* **No end-of-list guard** - `onEndReached` keeps firing after the last page. **Fix:** Stop when `nextCursor === null` or `!hasNextPage`.
* **Spinner in `ListEmptyComponent` for load-more** - Empty component hides when items exist. **Fix:** `ListFooterComponent` for pagination spinner only.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Infinite scroll (`onEndReached`) | Feeds, timelines, exploration | Finite forms or wizards with a known end |
| "Load more" button | User-controlled fetch, accessibility | Instagram-style continuous feeds |
| Paginated tabs (page 1, 2, 3) | Admin tables, search with jump | Mobile social feeds - poor UX |
| `FlashList` + same pagination | Performance-critical infinite feeds | You have not validated FlatList perf yet |
| Prefetch next page at 50% scroll | Slow networks, large images | Strict API rate limits |

## FAQs

What is onEndReachedThreshold?

A value from 0 to 1 representing how far from the end of the content (as a fraction of the visible list length) triggers `onEndReached`. `0.5` fires when you are halfway through the remaining scrollable content from the bottom. Start with `0.3` and tune.

Why does onEndReached fire multiple times?

Layout changes after appending rows move the scroll threshold. Bounce scrolling on iOS re-triggers it. Guard with a `useRef` loading flag or your data library's `isFetchingNextPage`.

How is pull-to-refresh different from load more?

* **Refresh** replaces the list with a fresh first page (user pulls down).
* **Load more** appends the next page when scrolling near the bottom.

Use separate state: `refreshing` + `loadingMore`.

Cursor vs offset pagination?

**Cursor** - server sends an opaque `nextCursor`; stable when items are added/removed. **Offset** - `?offset=40`; simple but can duplicate or skip rows on mutating feeds. Prefer cursors for social and notification feeds.

Where does the loading spinner go for load more?

`ListFooterComponent` - it stays visible at the bottom while items exist. `ListEmptyComponent` only shows when `data` is empty.

How do I show skeletons on first load?

Render 5–8 placeholder rows in a `View` (or a static `FlatList` with `data={SKELETON}`) until the first fetch completes. Do not use `ListEmptyComponent` for skeletons.

Can I use FlatList refreshing without RefreshControl?

Yes - pass `refreshing` and `onRefresh` directly to `FlatList`. For custom tint colors on iOS, pass an explicit `refreshControl={<RefreshControl ... />}`.

How do I integrate TanStack Query?

Use `useInfiniteQuery`, `getNextPageParam` for the cursor, `fetchNextPage` in `onEndReached`, and `flatMap` pages into `data`. See [TanStack React Query](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/tanstack-react-query/).

What if the list is too short to scroll?

`onEndReached` may still fire. Check `hasNextPage` and consider fetching the next page until the list fills the viewport (loop with care and a max attempts cap) or show a "Load more" button.

How do I reset pagination on filter change?

On new filter: reset `items` to `[]`, `cursor` to `null`, and call `load("refresh")` with the new query key. With TanStack Query, change `queryKey` so the cache invalidates.

Should I deduplicate appended items?

If the API can return overlaps (retry, race), merge by `id` with a `Map`. Otherwise simple append is enough.

Does FlashList support the same pagination props?

Yes - `onEndReached`, `onEndReachedThreshold`, and `refreshControl` work the same. See [FlashList vs FlatList](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/flashlist-vs-flatlist/).

How do I show errors without clearing existing items?

Keep `data` intact and show a toast or a banner above the list. Use `ListEmptyComponent` with retry only when `items.length === 0`.

What about bidirectional infinite scroll (chat)?

Use `inverted` on the list (or scroll-to-bottom patterns), load older messages on `onEndReached` at the visual top, and preserve scroll position with `maintainVisibleContentPosition` when prepending.

Where do I learn empty states and separators?

See [FlatList Recipes](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/flatlist-recipes/) for `ListEmptyComponent`, `keyExtractor`, and `contentContainerStyle` patterns.

## Related

* [FlatList Recipes](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/flatlist-recipes/) - `ListEmptyComponent`, `ListFooterComponent`, and `keyExtractor`
* [FlashList vs FlatList](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/flashlist-vs-flatlist/) - upgrading pagination-heavy feeds to FlashList
* [List Performance Tuning](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/list-performance-tuning/) - keeping append renders cheap with `memo`
* [SectionList & Grouped Data](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/sectionlist-and-grouped-data/) - paginating into grouped sections
* [TanStack React Query](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/tanstack-react-query/) - `useInfiniteQuery` integration
* [Custom Hooks for UI Logic](https://docs.wahwei/reactnative.codeguides.io/component-patterns/custom-hooks-for-ui-logic/) - extract `usePaginatedList` from screen components

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
