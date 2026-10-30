# @shopify/flash-list

Drop-in list performance upgrade checklist. FlashList recycles a small pool of native views - FlatList mounts more off-screen rows. Use this cookbook when profiling shows scroll jank on feeds; for trade-offs and tuning, see [FlashList vs FlatList](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/flashlist-vs-flatlist/).

Highlights / @shopify/flash-list

* estimatedItemSize is required - wrong estimates cause scroll jump and blank gaps
* View recycling demands memoized rows with props-only state
* Migration: install, swap import, add estimate, audit variable heights
* drawDistance tunes pre-render distance ahead of the viewport
* FlatList remains fine for short settings screens - profile before migrating
* Trade-offs and tuning in lists-scrolling/flashlist-vs-flatlist

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install @shopify/flash-list
```

```tsx
import { FlashList } from "@shopify/flash-list";
import { StyleSheet, Text, View } from "react-native";
 
interface Post {
  id: string;
  title: string;
}
 
const ESTIMATED_ROW_HEIGHT = 88;
 
export function PostFeed({ posts }: { posts: Post[] }) {
  return (
    <FlashList
      data={posts}
      estimatedItemSize={ESTIMATED_ROW_HEIGHT}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}
 
const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff", minHeight: ESTIMATED_ROW_HEIGHT },
  title: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  separator: { height: 8 },
});
```

**When to reach for this:**

* Image-heavy feeds, chat timelines, or product catalogs with **50+ rows**.
* Profiler shows **frame drops** during fast scroll on mid-range Android.
* `windowSize` tuning on FlatList did not fix blank flashes.

## Working Example

```tsx
import { memo, useCallback } from "react";
import { FlashList } from "@shopify/flash-list";
import { Image, StyleSheet, Text, View } from "react-native";
 
interface Product {
  id: string;
  name: string;
  price: string;
  imageUrl: string;
}
 
const ESTIMATED_ROW_HEIGHT = 96;
 
const ProductRow = memo(function ProductRow({ item }: { item: Product }) {
  return (
    <View style={styles.row}>
      <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
      <View style={styles.meta}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.price}>{item.price}</Text>
      </View>
    </View>
  );
});
 
export function ProductFeedScreen({ products }: { products: Product[] }) {
  const renderItem = useCallback(
    ({ item }: { item: Product }) => <ProductRow item={item} />,
    [],
  );
 
  return (
    <View style={styles.screen}>
      <FlashList
        data={products}
        estimatedItemSize={ESTIMATED_ROW_HEIGHT}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        drawDistance={250}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  list: { paddingVertical: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    minHeight: ESTIMATED_ROW_HEIGHT,
  },
  thumb: { width: 72, height: 72, borderRadius: 8, backgroundColor: "#e2e8f0" },
  meta: { flex: 1 },
  name: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  price: { fontSize: 14, color: "#2563eb", marginTop: 4 },
});
```

**What this demonstrates:**

* **`estimatedItemSize`** - required; set to typical row height.
* **`minHeight` on row** - aligns rendered size with estimate for stable scroll.
* **`memo` on row** - recycled views must not carry stale closure state.
* **`drawDistance={250}`** - pre-renders ahead of viewport to reduce blank flashes.
* **Stable `renderItem`** - `useCallback` prevents unnecessary list rerenders.

## Deep Dive

### Migration Checklist

Copy this checklist per screen when migrating from `FlatList`:

```markdown
## FlashList migration: ProductFeedScreen
 
- [ ] npx expo install @shopify/flash-list
- [ ] Swap import: FlatList → FlashList from @shopify/flash-list
- [ ] Add estimatedItemSize (measure average row in DevTools or design spec)
- [ ] Set minHeight on row container to match estimate
- [ ] Wrap row component in memo()
- [ ] Stabilize renderItem with useCallback
- [ ] Audit variable row heights - overrideItemLayout if needed
- [ ] Test fast flick scroll on physical Android device
- [ ] Verify ListHeaderComponent / ListFooterComponent / empty state
- [ ] Confirm numColumns grid layout if applicable
- [ ] Profile before/after - React DevTools + FPS overlay
```

### Step-by-Step Migration

```tsx
// Before
import { FlatList } from "react-native";
 
<FlatList
  data={posts}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <PostRow item={item} />}
/>
 
// After
import { FlashList } from "@shopify/flash-list";
 
const ROW_HEIGHT = 88;
 
<FlashList
  data={posts}
  estimatedItemSize={ROW_HEIGHT}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <PostRow item={item} />}
/>
```

### Variable Row Heights

```tsx
<FlashList
  data={messages}
  estimatedItemSize={72}
  overrideItemLayout={(layout, item) => {
    layout.size = item.hasAttachment ? 160 : 72;
  }}
  renderItem={({ item }) => <MessageRow item={item} />}
/>
```

Use `overrideItemLayout` when row height is predictable from data - not arbitrary text wrap.

### TypeScript

```tsx
import type { ListRenderItem } from "@shopify/flash-list";
 
const renderItem: ListRenderItem<Product> = ({ item }) => <ProductRow item={item} />;
```

Import types from `@shopify/flash-list`, not `react-native`.

## Gotchas

* **Missing `estimatedItemSize`** - List renders blank or scroll jumps wildly. **Fix:** Always set; tune against real rows.
* **Row state in `useState` inside renderItem** - Recycled views show stale selection. **Fix:** Props-only rows; lift selection to parent `extraData`.
* **Unstable `renderItem` inline** - New function every parent render defeats memo. **Fix:** `useCallback` with stable deps.
* **Assuming 100% FlatList API parity** - Some edge props differ. **Fix:** Test `numColumns`, nested scroll, and headers on device.
* **Migrating 8-row settings lists** - Estimate tuning cost with no gain. **Fix:** Keep FlatList until profiling proves need.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| FlashList | Long feeds, image rows, chat | Short static lists |
| FlatList | Settings, < 20 simple rows | Fast scroll jank on Android |
| SectionList | Grouped headers required | Single homogeneous feed |
| VirtualizedList directly | Custom virtualization | Standard vertical feed |

## FAQs

How do I install FlashList on Expo SDK 57?

```bash
npx expo install @shopify/flash-list
```

Pins a compatible version for your SDK. Rebuild dev client if autolinking changes.

What should estimatedItemSize be?

Measure 5–10 representative rows - use the median height. Include padding and separators. Wrong estimates cause scroll jump, not crashes.

Does FlashList work with useInfiniteQuery?

Yes - same `onEndReached` / `onEndReachedThreshold` as FlatList. See [Infinite Scroll & Pagination](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/infinite-scroll-and-pagination/).

Where is the full comparison guide?

[FlashList vs FlatList](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/flashlist-vs-flatlist/) - recycling, drawDistance, and when FlatList wins.

Should I memo every row?

Yes for recycled lists - combine `memo` on the row, stable `renderItem`, and props-only state.

## Related

* [FlashList vs FlatList](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/flashlist-vs-flatlist/) - trade-offs before migrating
* [List Performance Tuning](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/list-performance-tuning/) - memo and windowSize concepts
* [Infinite Scroll & Pagination](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/infinite-scroll-and-pagination/) - pagination after migration
* [Virtualization Gotchas](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/virtualization-gotchas/) - blank rows and recycle pitfalls
* [Essential Libraries Basics](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/essential-libraries-basics/) - when to adopt native list deps

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

3730363230327c3038386f6967637c6f692e73656469756765646f63

Reviewed by Chris St. John·Last updated Jul 19, 2026
