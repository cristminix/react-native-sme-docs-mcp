# Lists Best Practices

A condensed summary of the 25 most important best practices drawn from every page in this section.

Highlights / Lists Best Practices

* Use ScrollView only for short static content; virtualize feeds with FlatList or FlashList
* Stable string keys from server ids - never index keys on sorted or filtered lists
* Memoize row components and stabilize renderItem with useCallback
* Provide getItemLayout when row height is fixed - skips measurement jank
* Guard onEndReached with loading flags and cursor exhaustion
* Set estimatedItemSize when adopting FlashList on SDK 57

1. **Choose ScrollView for small static content:** Fewer than ~20 non-growing items with mixed layout types - once the list grows or paginates, switch to virtualization.
2. **Default to FlatList for feeds:** `FlatList` recycles rows off-screen - mapping hundreds of items inside `ScrollView` allocates every row in memory and blocks the JS thread.
3. **Evaluate FlashList for heavy feeds:** On SDK 57, Shopify FlashList improves recycling throughput when profiles show frame drops - migrate with `estimatedItemSize` and a measured migration checklist.
4. **Keys must be stable strings:** `keyExtractor` should return server ids - index keys break selection, animation, and state when items sort, filter, or paginate.
5. **Never key on array index for dynamic data:** `key={index}` causes wrong row content to flash during insert/delete - users see likes jump between posts.
6. **Extract `renderItem` to a memoized row:** Inline `renderItem` closures recreate every parent render - `const Row = memo(function Row…)` plus stable `useCallback` handler.
7. **Pass `extraData` when selection drives UI:** Without `extraData`, `FlatList` may skip re-rendering visible rows after `selectedId` changes - pass the minimal state slice that affects row appearance.
8. **Hoist list styles to StyleSheet:** Fresh `contentContainerStyle={{ padding: 16 }}` on every parent render invalidates list optimizations - cache wrapper styles.
9. **Use `getItemLayout` for fixed-height rows:** Inbox and settings rows with uniform height skip async measurement - scrolling to index becomes instant.
10. **Do not lie to `getItemLayout`:** Wrong `length` or `offset` produces blank gaps and jumpy scroll - measure once in design review and keep height in sync with separators.
11. **Separate empty and loading states:** `ListEmptyComponent` should not spin forever - branch `ListEmptyComponent` vs `ListFooterComponent` skeletons while the first page loads.
12. **Pull-to-refresh resets pagination:** `onRefresh` should clear cursor state and refetch page one - appending to a stale cursor after refresh duplicates items.
13. **Guard `onEndReached`:** Fire only when `!isFetching && hasNextPage` - otherwise momentum scroll triggers duplicate page fetches at the bottom.
14. **Show footer skeletons for pagination:** A small loading row at `ListFooterComponent` beats a full-screen spinner for page two - users keep context on the feed.
15. **Precompute SectionList sections in `useMemo`:** Grouping hundreds of items in render allocates every pass - derive `sections` when source data or sort order changes.
16. **Use sticky headers intentionally:** `stickySectionHeadersEnabled` helps alphabet lists - disable when headers overlap complex hero content at the top.
17. **Enable `nestedScrollEnabled` for horizontal rails:** Vertical feed + horizontal shelf needs explicit nested scroll on Android - test gesture handoff on real devices.
18. **Avoid vertical FlatList inside vertical ScrollView:** Double scroll containers fight gestures and break virtualization - one axis should own scrolling; use horizontal inner lists only.
19. **Tune `windowSize` after profiling:** Lower `windowSize` reduces memory; too low causes blank rows during fast flings - start with defaults, adjust with Flashlight or RN DevTools.
20. **Set FlashList `estimatedItemSize` close to reality:** Estimates far from measured height cause layout thrash and blank frames - measure average row height from production content.
21. **Avoid anonymous functions in `renderItem`:** `onPress={() => toggle(item.id)}` inside rows defeats `memo` - pass `id` to rows that call stable handlers.
22. **Validate dynamic row heights:** Variable-height rows without measurement cause virtualization to mount wrong content - use FlashList `overrideItemLayout` or accept non-virtualized sections.
23. **Test rotation and font scaling on lists:** Larger accessibility fonts change row height - fixed `getItemLayout` may need dynamic measurement or updated constants.
24. **Scroll to top on tab re-tap via ref:** Expose `flatListRef.current?.scrollToOffset({ offset: 0 })` from navigation events - feed apps expect this behavior.
25. **Run the virtualization gotchas checklist before release:** Walk keys, heights, empty states, and nested scroll cases on a low-end Android device - simulators hide blank-row bugs.

## FAQs

When is ScrollView still the right choice?

* Settings screens with ~10 heterogeneous rows (toggles, text, links) that never paginate.
* Legal copy or onboarding with mixed blocks, not a homogeneous data array.

FlatList or FlashList for a new Expo SDK 57 app?

* Start with `FlatList` until profiling proves jank on target devices.
* Adopt FlashList when feed scroll FPS drops or team already standardized on Shopify's package.

What is the most common shipping bug in feeds?

* Unstable keys combined with optimistic updates - rows show wrong avatars or counts after mutations.

Should infinite scroll use offset or cursor pagination?

* Prefer opaque cursors from the API - offset pagination breaks when items insert at the top of the feed.

How do I fix blank rows while scrolling fast?

* Check `getItemLayout` accuracy, increase `windowSize` slightly, or improve FlashList `estimatedItemSize` - blanks are almost always height math, not "React being slow."

## Related

* [Lists Basics](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/lists-basics/) - ScrollView vs FlatList decision tour
* [FlatList Recipes](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/flatlist-recipes/) - keyExtractor, separators, empty states
* [FlashList vs FlatList](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/flashlist-vs-flatlist/) - migration and trade-offs
* [Infinite Scroll & Pagination](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/infinite-scroll-and-pagination/) - cursors and pull-to-refresh
* [List Performance Tuning](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/list-performance-tuning/) - memo, windowSize, renderItem hygiene
* [Virtualization Gotchas](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/virtualization-gotchas/) - numbered mistakes and fixes

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
