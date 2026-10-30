# Lists and Virtualization

Virtualized lists for long data sets - FlatList, SectionList, and the knobs that keep scroll smooth.

Highlights / Lists and Virtualization

* FlatList Basic Data
* onEndReached Pagination
* SectionList Grouped
* getItemLayout Fixed Height
* Memoized Row Component

#### FlatList Basic Data

`data`, `renderItem`, and a stable `keyExtractor` are the minimum. Prefer string ids over indexes.

```tsx
import { FlatList, Text } from "react-native";
 
<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <Text>{item.title}</Text>}
/>
```

#### Item Separator Component

Render dividers between items without putting borders on every row.

```tsx
const Separator = () => <View style={{ height: 1, backgroundColor: "#e5e7eb" }} />;
 
<FlatList ItemSeparatorComponent={Separator} data={items} renderItem={...} />
```

#### ListEmptyComponent

Show a dedicated empty state when `data` is empty (and not loading).

```tsx
<FlatList
  data={items}
  ListEmptyComponent={<Text>No results</Text>}
  renderItem={...}
/>
```

#### ListHeader Footer

Headers and footers scroll with the list (or stick with sticky header indices when configured).

```tsx
<FlatList
  ListHeaderComponent={<SearchBar />}
  ListFooterComponent={loadingMore ? <ActivityIndicator /> : null}
  data={items}
  renderItem={...}
/>
```

#### Pull to Refresh FlatList

Same `RefreshControl` pattern as ScrollView, via `refreshing` / `onRefresh` props or `refreshControl`.

```tsx
<FlatList
  data={items}
  refreshing={refreshing}
  onRefresh={onRefresh}
  renderItem={...}
/>
```

#### onEndReached Pagination

Load the next page when the user approaches the end. Guard with a loading flag to avoid duplicate fetches.

```tsx
<FlatList
  data={items}
  onEndReached={() => {
    if (!loadingMore && hasMore) loadMore();
  }}
  onEndReachedThreshold={0.4}
  renderItem={...}
/>
```

#### numColumns Grid

Set `numColumns` for simple grids. Item width should account for columns and gaps.

```tsx
<FlatList
  data={photos}
  numColumns={3}
  keyExtractor={(p) => p.id}
  renderItem={({ item }) => <Thumb photo={item} />}
/>
```

#### SectionList Grouped

Sectioned data needs `sections` with `{ title, data }` entries and section header renderers.

```tsx
import { SectionList, Text } from "react-native";
 
<SectionList
  sections={sections}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <Text>{item.name}</Text>}
  renderSectionHeader={({ section }) => <Text>{section.title}</Text>}
/>
```

#### getItemLayout Fixed Height

When every row has a known height, provide `getItemLayout` so scroll-to-index skips measurement.

```tsx
const H = 56;
getItemLayout={(_, index) => ({ length: H, offset: H * index, index })}
```

#### extraData for Extra Renders

FlatList pure-renders from `data`. Pass `extraData` when selection state outside `data` should re-render rows.

```tsx
<FlatList data={items} extraData={selectedId} renderItem={renderItem} />
```

#### Memoized Row Component

Extract rows and wrap with `React.memo` so unchanged items skip work when the parent re-renders.

```tsx
const Row = memo(function Row({ item }: { item: Item }) {
  return <Text>{item.title}</Text>;
});
```

#### initialNumToRender Tuning

Control how many items render on first paint. Higher values reduce blank space; lower values speed TTI.

```tsx
<FlatList initialNumToRender={12} data={items} renderItem={...} />
```

#### windowSize Tuning

`windowSize` is a multiplier of the viewport for offscreen rendering. Lower values save memory; higher values reduce blank scroll.

```tsx
<FlatList windowSize={7} data={items} renderItem={...} />
```

#### removeClippedSubviews

On Android, clipping offscreen views can improve memory. Test carefully with sticky headers and absolute children.

```tsx
<FlatList removeClippedSubviews data={items} renderItem={...} />
```

#### FlashList Mental Model

For very large lists, Shopify FlashList recycles cells more aggressively than FlatList. Same data/render mental model; different performance characteristics - adopt when FlatList profiling shows jank.

```tsx
// import { FlashList } from "@shopify/flash-list";
// <FlashList data={items} estimatedItemSize={56} renderItem={...} />
```

## Related

* [Core Views and Text](https://docs.wahwei/reactnative.codeguides.io/code-reference/core-views-and-text/) - non-virtualized ScrollView for short content
* [Performance and Lists](https://docs.wahwei/reactnative.codeguides.io/code-reference/performance-and-lists/) - deeper list performance knobs
* [Pressables and Touch](https://docs.wahwei/reactnative.codeguides.io/code-reference/pressables-and-touch/) - row press handling

### External Related Links

* [reactnative.dev/docs](https://reactnative.dev/docs/getting-started) - full RN documentation
* [Callstack ebooks & guides](https://www.callstack.com/ebooks) - in-depth RN guides (performance, optimization, brownfield)
* [reactnative.dev](https://reactnative.dev/) - official React Native site

> **Stack versions:** React 19.2.3 · React Native 0.86.0 · Expo SDK 57

Reviewed by Chris St. John·Last updated Jul 18, 2026
