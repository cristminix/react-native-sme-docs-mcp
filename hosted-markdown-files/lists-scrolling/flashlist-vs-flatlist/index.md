# FlashList vs FlatList

Shopify FlashList trade-offs, recycling, and migration checklist - when the default list is not fast enough.

Highlights / FlashList vs FlatList

* FlashList recycles a small pool of views - FlatList mounts more off-screen rows
* estimatedItemSize is required - wrong estimates cause scroll jump and blank gaps
* Drop-in migration: swap import, add estimatedItemSize, audit variable row heights
* FlashList shines on image-heavy feeds and fast scroll - overkill for short settings lists
* drawDistance tunes how far ahead rows are pre-rendered

## Recipe

> Quick-reference recipe card - copy-paste ready.

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
  row: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff" },
  title: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  separator: { height: 8 },
});
```

**When to reach for this:** Image-heavy feeds, chat timelines, or any list where profiling shows frame drops during fast scroll on mid-range Android devices.

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
 
const PRODUCTS: Product[] = Array.from({ length: 200 }, (_, i) => ({
  id: `p-${i}`,
  name: `Product ${i + 1}`,
  price: `$${(9.99 + (i % 50)).toFixed(2)}`,
  imageUrl: `https://picsum.photos/seed/${i}/120/120`,
}));
 
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
 
export default function ProductFeedScreen() {
  const renderItem = useCallback(
    ({ item }: { item: Product }) => <ProductRow item={item} />,
    [],
  );
 
  return (
    <View style={styles.screen}>
      <FlashList
        data={PRODUCTS}
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

* `estimatedItemSize` set to the typical row height - required for FlashList layout math.
* `minHeight` on the row aligns rendered size with the estimate for stable scroll.
* `memo` on `ProductRow` pairs with view recycling - rows must tolerate reuse without stale state.
* `drawDistance={250}` pre-renders slightly ahead of the viewport to reduce blank flashes during fast flick scroll.
* Same `keyExtractor` / `renderItem` patterns as `FlatList` - migration is mostly prop additions.

## Deep Dive

### How It Works

* **FlatList** virtualizes by mounting/unmounting row subtrees as they enter and leave the render window. Fast scroll can still allocate many views per second.
* **FlashList** maintains a **recycled pool** of row containers - new data is bound to existing native views instead of creating fresh trees each time.
* FlashList needs `estimatedItemSize` because it lays out content **before** every row is measured - the estimate drives offset calculations until real measurement arrives.
* Wrong estimates cause **scroll jump** (content shifts when true height differs) or brief **blank gaps** during fast scroll.
* FlashList supports the same mental model: `data`, `renderItem`, `keyExtractor`, separators, headers, `onEndReached`.
* Under the hood, FlashList still runs on React Native's scroll infrastructure - it is not a separate native list implementation.

### FlatList vs FlashList

| Aspect | FlatList | FlashList |
| --- | --- | --- |
| Recycling | Mount/unmount rows | Rebinds a fixed pool of views |
| Size hint | Optional `getItemLayout` | Required `estimatedItemSize` |
| Variable height | Works; remeasures as needed | Works; tune estimate + `overrideItemLayout` |
| Bundle | Built into RN | `@shopify/flash-list` dependency |
| API surface | Superset (mature) | Near drop-in; some prop differences |
| Best fit | Short/medium lists, settings | Long feeds, images, chat, marketplace grids |

### Migration Checklist

1. **Install:** `npx expo install @shopify/flash-list`
2. **Swap import:** `FlatList` → `FlashList` from `@shopify/flash-list`
3. **Add `estimatedItemSize`:** Measure a typical row in DevTools or design specs (include padding).
4. **Audit row components:** Remove local state that survives recycling; derive UI from `item` props only.
5. **Match min heights:** Set `minHeight` or fixed height close to the estimate when possible.
6. **Variable heights:** Use `overrideItemLayout` per item type or separate lists per layout variant.
7. **Test fast scroll:** Flick-scroll on a low-end Android device; watch for blanks and jump.
8. **Re-test `onEndReached`:** Threshold behavior is similar but verify pagination guards.
9. **Section lists:** Use `FlashList` with sticky headers or keep `SectionList` until you need the perf win.
10. **Profile before/after:** React Native DevTools performance monitor or `console.time` around scroll sessions.

```tsx
// Before
import { FlatList } from "react-native";
<FlatList data={items} renderItem={...} keyExtractor={...} />
 
// After
import { FlashList } from "@shopify/flash-list";
<FlashList
  data={items}
  estimatedItemSize={72}
  renderItem={...}
  keyExtractor={...}
/>
```

### Tuning Props

| Prop | Purpose |
| --- | --- |
| `estimatedItemSize` | Average row height in dp - required |
| `drawDistance` | Pixels beyond viewport to pre-render (default ~250) |
| `overrideItemLayout` | Per-index size override for heterogeneous rows |
| `estimatedListSize` | `{ height, width }` when list size is known early |
| `getItemType` | Return a type string so recycling pools separate layouts |

```tsx
<FlashList
  data={items}
  estimatedItemSize={120}
  getItemType={(item) => (item.pinned ? "pinned" : "normal")}
  overrideItemLayout={(layout, item) => {
    layout.size = item.pinned ? 160 : 96;
  }}
  renderItem={renderItem}
/>
```

### Recycling Gotchas

* Recycled rows **reuse the same component instance** - `useState` inside a row can show the previous item's state for a frame.
* Side effects in `useEffect` without proper deps fire on the wrong item.
* **Fix:** Keep row state in `item` data or parent maps (`expandedIds`); rows should be pure functions of props.

### TypeScript Notes

```tsx
import type { FlashListProps, ListRenderItem } from "@shopify/flash-list";
 
interface Article {
  id: string;
  headline: string;
}
 
type ArticleListProps = Pick<
  FlashListProps<Article>,
  "data" | "onEndReached" | "refreshing" | "onRefresh"
> & {
  onPress: (article: Article) => void;
};
 
function ArticleList({ data, onPress, ...rest }: ArticleListProps) {
  const renderItem: ListRenderItem<Article> = useCallback(
    ({ item }) => <ArticleRow article={item} onPress={() => onPress(item)} />,
    [onPress],
  );
 
  return (
    <FlashList
      data={data}
      estimatedItemSize={104}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      {...rest}
    />
  );
}
```

* Import types from `@shopify/flash-list`, not `react-native`.
* `FlashListProps<T>` mirrors `FlatListProps<T>` for most list props.

### Parameters & Return Values

| Parameter | Type | Description |
| --- | --- | --- |
| `estimatedItemSize` | `number` | Average item height in density-independent pixels - **required** |
| `data` | `readonly T[]` | Source array (same as FlatList) |
| `renderItem` | `ListRenderItem<T>` | Row renderer - must be stable for recycling |
| `drawDistance` | `number` | Pre-render distance beyond viewport edges |
| `overrideItemLayout` | `(layout, item, index) => void` | Set `layout.size` for known per-item heights |
| `getItemType` | `(item, index) => string` | Separates recycle pools per layout variant |

## Gotchas

* **Missing `estimatedItemSize`** - FlashList warns and falls back to poor layout guesses; scroll feels broken. **Fix:** Always set it; measure real rows in the simulator.
* **Estimate far from reality** - A 200px estimate on 80px rows causes jump when measurement corrects. **Fix:** Measure p50 row height; use `overrideItemLayout` for outliers.
* **Stateful row components** - `useState` for "liked" inside the row shows the previous item's like state after recycle. **Fix:** Store interaction state in parent/`item` or `extraData` maps.
* **Migrating without `memo`** - Recycling magnifies unnecessary re-renders inside rows. **Fix:** `memo` row components; stable `renderItem` with `useCallback`.
* **Using FlashList for 10 settings rows** - Extra dependency and tuning for no measurable gain. **Fix:** Keep `FlatList` or `ScrollView` until profiling proves need.
* **Ignoring image dimensions** - Images loading async change row height after first layout, causing jump on both list types; worse when estimate is wrong. **Fix:** Fixed `width`/`height` on `Image`, placeholder background, or known aspect ratio.
* **Assuming 100% API parity** - Some edge props differ; test `ListHeaderComponent`, `numColumns`, and nested scroll. **Fix:** Read `@shopify/flash-list` docs for your version; run migration checklist on device.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `FlatList` | Default lists, settings, < 100 rows, no perf complaints | Profiling shows scroll jank on target devices |
| `FlashList` | Long feeds, images, chat, marketplace | Trivial lists where bundle size matters more |
| `SectionList` | Grouped data with sticky section headers | Single-type flat feed - FlashList is simpler |
| `Legend List` / other community lists | Evaluating alternatives to FlashList | You want Shopify-maintained Expo compatibility first |
| `ScrollView` + `map` | Very short static content | Any list that scrolls for seconds at 60 fps |

## FAQs

Is FlashList a drop-in replacement for FlatList?

Nearly - swap the import, add `estimatedItemSize`, and audit row components for recycling safety. Most props (`data`, `renderItem`, `keyExtractor`, `onEndReached`, refresh) work the same. Test your specific header/footer and multi-column layouts.

Why is estimatedItemSize required?

FlashList positions rows before all are measured. The estimate drives scroll offset math until each row's true height is known. Without it, the list cannot virtualize efficiently.

How do I pick the right estimatedItemSize?

Measure a typical rendered row in the layout inspector, including padding and separators. Use the median height if rows vary slightly. For mixed types, use `getItemType` + `overrideItemLayout`.

What is view recycling?

Instead of destroying a row view when it scrolls off screen, FlashList rebinds it to a new item's data. The same native view tree is reused - like `UITableView` cell reuse on iOS. Row components must not hold stale local state.

Does FlashList work with Expo?

Yes - `npx expo install @shopify/flash-list` pins a compatible version for your SDK. No custom native code required in standard Expo workflows.

FlatList or FlashList for SectionList-style data?

FlashList supports sticky headers and heterogeneous layouts, but `SectionList` is still the ergonomic choice for `{ title, data }` grouping. Migrate item rendering to FlashList patterns when the flat feed is the bottleneck.

What is drawDistance?

Distance in pixels beyond the visible viewport where FlashList pre-renders items. Higher values reduce blank flashes during fast scroll at the cost of more work per frame. Default is usually fine; raise on image-heavy feeds if you see flicker.

Can I use getItemLayout with FlashList?

FlashList uses `estimatedItemSize` and `overrideItemLayout` instead. `overrideItemLayout` lets you set per-index `layout.size` when heights are known without measuring.

Does FlashList support numColumns?

Yes - grid layouts are supported. Set `numColumns` and ensure `estimatedItemSize` reflects row height (not cell width). Test horizontal spacing and recycle pools for grid cells.

How do I fix scroll jumping?

* Bring `estimatedItemSize` closer to real height.
* Use fixed image dimensions.
* Set `minHeight` on rows.
* Use `overrideItemLayout` for known tall/short variants.

Should row components use memo?

Yes - especially with recycling. Combine `memo` on the row, stable `renderItem`, and props-only state. See [List Performance Tuning](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/list-performance-tuning/).

Does extraData exist on FlashList?

FlashList supports the same pattern - pass external state that affects row rendering so recycled views update when selection or theme changes.

When is FlatList actually faster?

For very short lists, FlatList avoids estimate tuning and the extra package. Measure - do not migrate preemptively.

Where is the full FlashList library reference?

See [@shopify/flash-list](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/shopify-flash-list/) in Essential Libraries for install, config plugins, and advanced props.

How does FlashList interact with infinite scroll?

Same `onEndReached` / `onEndReachedThreshold` pattern as FlatList. Guard fetches with a loading ref. See [Infinite Scroll & Pagination](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/infinite-scroll-and-pagination/).

## Related

* [FlatList Recipes](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/flatlist-recipes/) - baseline props before migrating to FlashList
* [List Performance Tuning](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/list-performance-tuning/) - `memo`, stable handlers, and `windowSize` concepts that apply to both lists
* [Virtualization Gotchas](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/virtualization-gotchas/) - blank rows, clipping, and recycle pitfalls
* [Infinite Scroll & Pagination](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/infinite-scroll-and-pagination/) - pagination props after migration
* [@shopify/flash-list](https://docs.wahwei/reactnative.codeguides.io/essential-libraries/shopify-flash-list/) - install and library-specific configuration
* [Performance Case Study: Feed at Scale](https://docs.wahwei/reactnative.codeguides.io/case-studies/performance-case-study-feed-at-scale/) - real-world FlashList + image tuning

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
