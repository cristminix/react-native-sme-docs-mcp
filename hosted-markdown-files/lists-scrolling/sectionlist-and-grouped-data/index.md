# SectionList & Grouped Data

Headers, footers, and sticky section headers for alphabetized contacts, categorized settings, and timeline feeds.

Highlights / SectionList & Grouped Data

* sections is an array of { title, data } - not a flat list with manual breaks
* renderSectionHeader receives { section } - keep headers lightweight
* stickySectionHeadersEnabled pins headers while scrolling (iOS-style)
* keyExtractor applies to items inside each section's data array
* Transform flat API data to sections once in useMemo - not on every render

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import { SectionList, StyleSheet, Text, View } from "react-native";
 
interface Contact {
  id: string;
  name: string;
}
 
interface ContactSection {
  title: string;
  data: Contact[];
}
 
const SECTIONS: ContactSection[] = [
  {
    title: "A",
    data: [
      { id: "a1", name: "Alex Rivera" },
      { id: "a2", name: "Avery Chen" },
    ],
  },
  {
    title: "B",
    data: [{ id: "b1", name: "Blake Morgan" }],
  },
];
 
export function ContactSectionList() {
  return (
    <SectionList
      sections={SECTIONS}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.name}>{item.name}</Text>
        </View>
      )}
      renderSectionHeader={({ section }) => (
        <View style={styles.header}>
          <Text style={styles.headerText}>{section.title}</Text>
        </View>
      )}
      stickySectionHeadersEnabled
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      SectionSeparatorComponent={() => <View style={styles.sectionGap} />}
    />
  );
}
 
const styles = StyleSheet.create({
  header: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  headerText: { fontSize: 13, fontWeight: "700", color: "#475569" },
  row: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff" },
  name: { fontSize: 16, color: "#0f172a" },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: "#e2e8f0" },
  sectionGap: { height: 8 },
});
```

**When to reach for this:** Data naturally groups into labeled sections - contacts by letter, settings by category, activity by date.

## Working Example

```tsx
import { useMemo } from "react";
import { SectionList, StyleSheet, Text, View, type SectionListData } from "react-native";
 
interface SettingItem {
  id: string;
  label: string;
  value?: string;
}
 
interface SettingSection extends SectionListData<SettingItem> {
  title: string;
  data: SettingItem[];
}
 
const SETTINGS: SettingItem[] = [
  { id: "profile", label: "Profile", value: "Alex Rivera" },
  { id: "email", label: "Email", value: "alex@example.com" },
  { id: "push", label: "Push notifications", value: "On" },
  { id: "dark", label: "Dark mode", value: "System" },
  { id: "language", label: "Language", value: "English" },
  { id: "privacy", label: "Privacy policy" },
  { id: "terms", label: "Terms of service" },
];
 
function groupSettings(items: SettingItem[]): SettingSection[] {
  const account = items.filter((i) => ["profile", "email"].includes(i.id));
  const preferences = items.filter((i) => ["push", "dark", "language"].includes(i.id));
  const legal = items.filter((i) => ["privacy", "terms"].includes(i.id));
 
  return [
    { title: "Account", data: account },
    { title: "Preferences", data: preferences },
    { title: "Legal", data: legal },
  ].filter((section) => section.data.length > 0);
}
 
function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}
 
function SettingRow({ item }: { item: SettingItem }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{item.label}</Text>
      {item.value ? <Text style={styles.value}>{item.value}</Text> : null}
    </View>
  );
}
 
export default function SettingsScreen() {
  const sections = useMemo(() => groupSettings(SETTINGS), []);
 
  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <SettingRow item={item} />}
      renderSectionHeader={({ section }) => <SectionHeader title={section.title} />}
      renderSectionFooter={({ section }) =>
        section.title === "Legal" ? (
          <Text style={styles.footerNote}>Version 2.4.1</Text>
        ) : null
      }
      stickySectionHeadersEnabled
      ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
      contentContainerStyle={styles.list}
    />
  );
}
 
const styles = StyleSheet.create({
  list: { paddingBottom: 32 },
  sectionHeader: {
    backgroundColor: "#f8fafc",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#64748b",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
  },
  label: { fontSize: 16, color: "#0f172a" },
  value: { fontSize: 15, color: "#64748b" },
  itemSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#e2e8f0",
    marginLeft: 16,
  },
  footerNote: {
    textAlign: "center",
    fontSize: 12,
    color: "#94a3b8",
    paddingVertical: 24,
  },
});
```

**What this demonstrates:**

* Flat settings data is **grouped once** in `useMemo` into `{ title, data }` sections.
* `renderSectionHeader` renders a lightweight header component per section.
* `renderSectionFooter` adds a version note after the last section only.
* `stickySectionHeadersEnabled` keeps section titles visible while scrolling items.
* Inset `ItemSeparatorComponent` (via `marginLeft`) aligns dividers with row content, not the section gutter.

## Deep Dive

### How It Works

* `SectionList` extends the same virtualization engine as `FlatList`, but iterates **sections** then **items within each section**.
* Each section is `{ data: ItemT[], ...customFields }` - commonly `title`, but you can attach `key`, `footer`, or metadata.
* `renderSectionHeader` and `renderSectionFooter` are called for section chrome; they are not virtualized the same way as rows (headers can stick).
* `stickySectionHeadersEnabled` (default `true` on iOS-style lists) pins the current section header to the top until the next section pushes it away.
* `keyExtractor` runs on **items**, not sections - section identity comes from index or a `key` field on the section object.
* Empty sections (`data: []`) still render headers unless you filter them out before passing `sections`.

### Section Shape

```tsx
interface TimelineItem {
  id: string;
  body: string;
  at: string;
}
 
interface TimelineSection {
  title: string;       // displayed in header
  key?: string;        // optional stable section key
  data: TimelineItem[];
}
 
// Group flat items by date label
function groupByDate(items: TimelineItem[]): TimelineSection[] {
  const map = new Map<string, TimelineItem[]>();
  for (const item of items) {
    const day = item.at.slice(0, 10); // "2026-07-08"
    const bucket = map.get(day) ?? [];
    bucket.push(item);
    map.set(day, bucket);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}
```

### Header & Footer Props

| Prop | Renders | Typical content |
| --- | --- | --- |
| `renderSectionHeader` | Top of each section | Letter, date, category label |
| `renderSectionFooter` | Bottom of each section | Section summary, spacing, "Show more" |
| `ListHeaderComponent` | Above all sections | Screen title, search bar |
| `ListFooterComponent` | Below all sections | Load-more spinner, legal text |
| `SectionSeparatorComponent` | Between sections | Extra gap between groups |
| `ItemSeparatorComponent` | Between items in a section | Hairline dividers |

### Sticky Headers

* `stickySectionHeadersEnabled={true}` - iOS Contacts-style behavior; header sticks until replaced.
* Set `stickySectionHeadersEnabled={false}` when headers are tall (images, charts) - sticky large headers obscure rows.
* Sticky headers interact with safe areas - pad `renderSectionHeader` with `paddingTop` from `useSafeAreaInsets()` when the list is full-screen.

### Alphabet Sidebar Pattern

For A–Z jumps, pair `SectionList` with an absolute-positioned index rail that calls `scrollToLocation`:

```tsx
sectionListRef.current?.scrollToLocation({
  sectionIndex: 2,
  itemIndex: 0,
  animated: true,
  viewOffset: 0,
});
```

* `scrollToLocation` needs reliable layout - provide `getItemLayout` when row heights are fixed.
* Pass `onScrollToIndexFailed` to retry after more rows render.

### TypeScript Notes

```tsx
import type { SectionListData, SectionListRenderItem } from "react-native";
 
interface Place {
  id: string;
  name: string;
}
 
interface PlaceSection extends SectionListData<Place> {
  title: string;
  data: Place[];
}
 
const renderItem: SectionListRenderItem<Place, PlaceSection> = ({ item, section }) => (
  <PlaceRow place={item} sectionTitle={section.title} />
);
 
<SectionList<Place, PlaceSection>
  sections={sections}
  renderItem={renderItem}
  renderSectionHeader={({ section }) => <Header title={section.title} />}
/>
```

* Use two generics: `SectionList<ItemT, SectionT>` when sections carry custom fields beyond `data`.
* `SectionListData<T>` is the base type for section objects.
* Filter empty sections in the grouping function so TypeScript and UI stay aligned.

### Parameters & Return Values

| Parameter | Type | Description |
| --- | --- | --- |
| `sections` | `readonly SectionT[]` | Array of sections, each with `data: ItemT[]` |
| `renderItem` | `SectionListRenderItem<ItemT, SectionT>` | Renders one item; receives `section` in info |
| `renderSectionHeader` | `({ section }) => ReactElement` | Header above each section's items |
| `renderSectionFooter` | `({ section }) => ReactElement` | Footer below each section's items |
| `keyExtractor` | `(item: ItemT, index: number) => string` | Stable key per **item** |
| `stickySectionHeadersEnabled` | `boolean` | Pin headers during scroll (default `true`) |
| `getItemLayout` | `(data, index) => { length, offset, index }` | Fixed item height for scroll-to-location |

## Gotchas

* **Manual section breaks inside FlatList** - Fake headers as special row types complicate virtualization, sticky behavior, and separators. **Fix:** Use `SectionList` when data is grouped.
* **Rebuilding sections on every render** - `sections={groupData(items)}` allocates new arrays and forces full list refresh. **Fix:** `useMemo(() => groupData(items), [items])`.
* **Duplicate item keys across sections** - `keyExtractor` must be globally unique across all sections, not just within one. **Fix:** Prefix keys: `` `${section.title}-${item.id}` `` only if ids are not globally unique (prefer global ids).
* **Empty `data` arrays still show headers** - Users see "Today" with no rows underneath. **Fix:** `.filter((s) => s.data.length > 0)` before passing `sections`.
* **Heavy section headers** - Large images or charts in `renderSectionHeader` cause jank when sticky headers stack. **Fix:** Keep headers compact; move rich content into the first row or a `ListHeaderComponent`.
* **`scrollToLocation` without `getItemLayout`** - Variable-height rows make index math wrong and trigger `onScrollToIndexFailed`. **Fix:** Fixed heights + `getItemLayout`, or handle the failure callback with a retry.
* **Forgetting `extraData` for row state** - Same `PureComponent` behavior as `FlatList` - selection state outside `sections` won't update rows. **Fix:** Pass `extraData` when row UI depends on external state.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `SectionList` | Labeled groups, sticky headers, alphabet lists | Single flat sequence with no section chrome |
| `FlatList` + header rows | One or two visual breaks, no sticky headers | Many sections with iOS-style sticky behavior |
| `FlashList` with `stickyHeaderIndices` | Performance-critical grouped feeds | You need first-class `renderSectionHeader` API |
| `ScrollView` + nested maps | Short static settings (< 30 rows total) | Long contact lists - no virtualization |
| `groupBy` in state | Sections rarely change | Regrouping on every keystroke without `useMemo` |

## FAQs

What is the difference between SectionList and FlatList?

`FlatList` virtualizes a single `data` array. `SectionList` virtualizes multiple `data` arrays grouped under section headers (and optional footers). Use `SectionList` when grouping is part of the data model, not a one-off header row.

How do I shape the sections prop?

An array of objects with at least `data: Item[]`. Add `title`, `key`, or custom fields. Example: `[{ title: "A", data: [...] }, { title: "B", data: [...] }]`.

Does keyExtractor apply to sections or items?

Items only. Give each section a `key` property if you need stable section identity: `{ key: "account", title: "Account", data: [...] }`.

How do sticky section headers work?

`stickySectionHeadersEnabled` (default `true`) keeps the current section header pinned to the top of the list until the next section's header scrolls into view. Disable for tall headers that would cover too much content.

How do I group flat API data into sections?

Run a `groupBy` reducer in `useMemo` - bucket by date, category, or first letter. Sort section keys, then map to `{ title, data }`. Do not group inline in JSX.

Can sections have different item types?

Yes - use a discriminated union for items and branch in `renderItem`. Keep `keyExtractor` stable across variants. For widely different row layouts, consider separate section lists or FlashList with heterogeneous types.

What is SectionSeparatorComponent for?

Renders **between** sections (after the last item of section N, before the header of section N+1). Use for extra vertical gap between groups. `ItemSeparatorComponent` renders between items within one section.

How do I add a search bar above all sections?

Use `ListHeaderComponent` - it scrolls with content and sits above the first section. For a fixed search bar, render it outside the `SectionList` in a column layout (`flex: 1` on the list).

How do I scroll to a section by letter?

Find `sectionIndex` for the target letter, then call `ref.scrollToLocation({ sectionIndex, itemIndex: 0 })`. Provide `getItemLayout` for fixed row heights and handle `onScrollToIndexFailed`.

Should I use renderSectionFooter?

Use it for per-section summaries ("3 items"), spacing, or CTAs. For app-wide footer content (version, load-more), prefer `ListFooterComponent`.

Why do I see duplicate keys warnings?

Item ids must be unique across **all** sections. If the API reuses ids per section, prefix: `` keyExtractor={(item, index) => `${item.id}-${index}`} `` - but stable server ids are strongly preferred.

Can I use SectionList with infinite scroll?

Yes - append items to the last section or add new sections in your pagination handler. Pass `onEndReached` and guard with a loading flag. See [Infinite Scroll & Pagination](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/infinite-scroll-and-pagination/).

How do SectionList performance tips differ from FlatList?

Same rules apply: stable `renderItem`, `memo` rows, `extraData`, avoid anonymous separators. Section headers re-render when `sections` reference changes - memoize the grouped structure.

Does stickySectionHeadersEnabled work on Android?

Yes - React Native implements sticky headers on both platforms. Test on Android devices with varying API levels; header background color should be opaque to avoid row bleed-through.

Where do I learn flat list props like getItemLayout?

See [FlatList Recipes](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/flatlist-recipes/) for `keyExtractor`, separators, and empty states that apply equally to `SectionList` items.

## Related

* [FlatList Recipes](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/flatlist-recipes/) - `keyExtractor`, separators, and `ListEmptyComponent` patterns shared by section items
* [Lists Basics](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/lists-basics/) - choosing between `ScrollView`, `FlatList`, and `SectionList`
* [Infinite Scroll & Pagination](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/infinite-scroll-and-pagination/) - loading more items into the last section
* [List Performance Tuning](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/list-performance-tuning/) - memoizing rows and stabilizing `sections` references
* [Nested Scrollables](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/nested-scrollables/) - horizontal lists inside section rows
* [Typing Components & Props](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-components-and-props/) - `SectionList<Item, Section>` generics

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
