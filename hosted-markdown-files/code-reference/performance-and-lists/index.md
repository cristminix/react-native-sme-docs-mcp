# Performance and Lists

Practical ways to keep JS and UI threads responsive - especially around long lists and navigation transitions.

Highlights / Performance and Lists

* React.memo Row
* getItemLayout Revisited
* Why Not ScrollView map
* Image Size Explicit
* Reanimated UI Thread Note

#### React.memo Row

Memoize pure row components so parent re-renders do not rebuild every cell.

```tsx
const Row = memo(function Row({ item }: { item: Item }) {
  return <Text>{item.title}</Text>;
});
```

#### useCallback onPress Item

Pass a stable handler into memoized rows (or close over id inside a memoized child).

```tsx
const onPressItem = useCallback((id: string) => {
  router.push(`/items/${id}`);
}, []);
```

#### Avoid Inline Style Objects in Rows

Create styles once with `StyleSheet.create`. Inline objects allocate every render and defeat shallow compares.

```tsx
// Prefer styles.row over style={{ padding: 12 }} inside renderItem
renderItem={({ item }) => <Row item={item} style={styles.row} />}
```

#### getItemLayout Revisited

Fixed-height rows unlock faster scroll-to-index and less measurement work.

```tsx
const H = 64;
const getItemLayout = (_: unknown, index: number) => ({
  length: H,
  offset: H * index,
  index,
});
```

#### InteractionManager Heavy Work

Schedule parsing or secondary fetches after the transition finishes.

```tsx
useEffect(() => {
  const task = InteractionManager.runAfterInteractions(() => hydrate());
  return () => task.cancel();
}, [id]);
```

#### startTransition Non Urgent

Mark non-urgent React updates (large filtered lists) so typing stays responsive when using concurrent features.

```tsx
import { startTransition, useState } from "react";
 
function onChangeText(text: string) {
  setQuery(text);
  startTransition(() => setFilter(text));
}
```

#### Hermes Engine Assumption

Modern RN/Expo defaults to Hermes. Write idiomatic modern JS; avoid assuming JSC-only quirks in new apps.

```tsx
// Prefer standard ES features supported by Hermes in your RN version
const id = crypto.randomUUID?.() ?? String(Date.now());
```

#### Why Not ScrollView map

Mapping hundreds of items into a `ScrollView` mounts every row at once. Use `FlatList` / FlashList for long data.

```tsx
// Avoid for large arrays:
// <ScrollView>{items.map(...)}</ScrollView>
// Prefer:
// <FlatList data={items} renderItem={...} />
```

#### Image Size Explicit

Always give images width/height or flex constraints so the list does not reflow as bits arrive.

```tsx
<Image source={{ uri }} style={{ width: 48, height: 48 }} contentFit="cover" />
```

#### console.log in Render Cost

Verbose logs in `renderItem` jank scroll on device. Strip or gate debug logging.

```tsx
if (__DEV__ && DEBUG_ROWS) console.log("row", item.id);
```

#### Profile with Perf Monitor

Use the dev menu perf monitor / React DevTools / native profilers before micro-optimizing.

```tsx
// Dev Menu -> Show Perf Monitor (FPS / JS frame time)
// Fix the measured bottleneck, not guessed ones
```

#### Reanimated UI Thread Note

Drive high-frequency animations with Reanimated shared values on the UI thread instead of `setState` per frame.

```tsx
// Conceptual: const x = useSharedValue(0);
// style useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }))
```

#### Batch setState Updates

Multiple updates inside one event handler batch automatically - avoid awaiting between related setters when you need a single paint.

```tsx
function onSuccess(data: Data) {
  setData(data);
  setError(null);
  setLoading(false);
}
```

#### Key Stability Across Filters

Keep stable ids when filtering so row state and images are not remounted incorrectly.

```tsx
keyExtractor={(item) => item.id}
```

#### Deferred Mount Screens

Do not mount every heavy tab eagerly. Lazy-load expensive screens so first paint stays light.

```tsx
// Expo Router: keep heavy routes as separate files; avoid importing huge modules in root layout
const Editor = React.lazy(() => import("../features/Editor"));
```

## Related

* [Lists and Virtualization](https://docs.wahwei/reactnative.codeguides.io/code-reference/lists-and-virtualization/) - FlatList API surface
* [App State and Hooks](https://docs.wahwei/reactnative.codeguides.io/code-reference/app-state-and-hooks/) - InteractionManager and memo hooks
* [Networking Images Media](https://docs.wahwei/reactnative.codeguides.io/code-reference/networking-images-media/) - image caching and sizing

### External Related Links

* [reactnative.dev/docs](https://reactnative.dev/docs/getting-started) - full RN documentation
* [Callstack ebooks & guides](https://www.callstack.com/ebooks) - in-depth RN guides (performance, optimization, brownfield)
* [reactnative.dev](https://reactnative.dev/) - official React Native site

> **Stack versions:** React 19.2.3 · React Native 0.86.0 · Expo SDK 57 · Hermes

Reviewed by Chris St. John·Last updated Jul 18, 2026
