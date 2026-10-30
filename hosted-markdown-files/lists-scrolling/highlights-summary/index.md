# Lists & Virtualization Highlights Summary

Every highlight bullet from the 9 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Lists & Virtualization Highlights Summary

* ScrollView renders every child up front - fine for short, static lists
* keyExtractor must return a stable string - never use array index for mutable lists
* sections is an array of { title, data } - not a flat list with manual breaks
* FlashList recycles a small pool of views - FlatList mounts more off-screen rows
* onEndReached fires when the user nears the list end - guard with a loading ref
* Anonymous renderItem closures re-create every parent render and defeat row memoization

## [Lists Basics](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/lists-basics/)

* ScrollView renders every child up front - fine for short, static lists
* FlatList virtualizes rows and only mounts what is on screen
* keyExtractor must return a stable, unique string per row
* ListEmptyComponent shows a placeholder when data is an empty array
* Pull-to-refresh wires RefreshControl to onRefresh and refreshing state
* SectionList groups rows under section headers for contacts-style UIs
* extraData tells FlatList to re-render rows when props outside data change

## [FlatList Recipes](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/flatlist-recipes/)

* keyExtractor must return a stable string - never use array index for mutable lists
* getItemLayout unlocks instant scroll-to-index when every row height is known
* ItemSeparatorComponent keeps spacing out of row styles
* ListEmptyComponent renders when data is [] - not while loading
* extraData tells FlatList to re-render rows when selection state changes

## [SectionList & Grouped Data](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/sectionlist-and-grouped-data/)

* sections is an array of { title, data } - not a flat list with manual breaks
* renderSectionHeader receives { section } - keep headers lightweight
* stickySectionHeadersEnabled pins headers while scrolling (iOS-style)
* keyExtractor applies to items inside each section's data array
* Transform flat API data to sections once in useMemo - not on every render

## [FlashList vs FlatList](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/flashlist-vs-flatlist/)

* FlashList recycles a small pool of views - FlatList mounts more off-screen rows
* estimatedItemSize is required - wrong estimates cause scroll jump and blank gaps
* Drop-in migration: swap import, add estimatedItemSize, audit variable row heights
* FlashList shines on image-heavy feeds and fast scroll - overkill for short settings lists
* drawDistance tunes how far ahead rows are pre-rendered

## [Infinite Scroll & Pagination](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/infinite-scroll-and-pagination/)

* onEndReached fires when the user nears the list end - guard with a loading ref
* Cursor pagination appends pages without offset math drifting on live feeds
* refreshing + onRefresh is pull-to-refresh - separate from infinite load
* ListFooterComponent shows inline load-more - not ListEmptyComponent
* TanStack Query useInfiniteQuery pairs cleanly with FlatList append

## [List Performance Tuning](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/list-performance-tuning/)

* Anonymous renderItem closures re-create every parent render and defeat row memoization
* windowSize multiplies viewport height - lower is faster, higher reduces blank flashes
* getItemLayout unlocks scroll-to-index only when every row shares a fixed height
* extraData must list every external value that changes row appearance
* Stable keyExtractor + useCallback renderItem are prerequisites before tuning windowSize
* Profile scroll jank with Hermes sampling before chasing micro-optimizations

## [Nested Scrollables](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/nested-scrollables/)

* A horizontal list inside a vertical feed is the default product pattern - not an anti-pattern
* nestedScrollEnabled on Android lets the inner list claim horizontal pans
* Extract each carousel row to memo so vertical scroll does not remount every carousel
* Prefer nested FlatLists over ScrollView-in-ScrollView - virtualization survives on both axes
* RNGH FlatList helps when native scroll handoff still steals gestures
* One-shot header carousels belong in ListHeaderComponent, not repeated per row

## [Virtualization Gotchas](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/virtualization-gotchas/)

* Blank flashes during fast scroll are usually windowSize too low or wrong height hints
* getItemLayout with wrong offsets breaks scrollToIndex silently
* Index-based keys make virtualization reuse the wrong row after reorder
* ScrollView inside FlatList disables outer virtualization entirely
* extraData omissions look like stale UI, not virtualization bugs
* FlashList estimatedItemSize must match typical row height, not the smallest cell

## [Lists Best Practices](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/best-practices/)

* Use ScrollView only for short static content; virtualize feeds with FlatList or FlashList
* Stable string keys from server ids - never index keys on sorted or filtered lists
* Memoize row components and stabilize renderItem with useCallback
* Provide getItemLayout when row height is fixed - skips measurement jank
* Guard onEndReached with loading flags and cursor exhaustion
* Set estimatedItemSize when adopting FlashList on SDK 57

Reviewed by Chris St. John·Last updated Jul 18, 2026
