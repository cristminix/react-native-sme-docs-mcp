# Flexbox Deep Dive

The mobile layout workhorse - direction, flex, align, and common recipes.

Highlights / Flexbox Deep Dive

* React Native defaults to flexDirection: column - opposite of most web row-first layouts
* flex: 1 means grow to fill remaining space along the main axis
* justifyContent aligns on the main axis; alignItems on the cross axis
* gap replaces margin hacks between flex children (RN 0.71+)
* flexShrink: 0 prevents squashed icons and avatars in crowded rows
* The header–content–footer shell is three nested flex: 1 containers

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import { StyleSheet, Text, View } from "react-native";
 
export function ScreenShell() {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Inbox</Text>
      </View>
 
      <View style={styles.content}>
        <Text>Scrollable or list content goes here.</Text>
      </View>
 
      <View style={styles.footer}>
        <Text style={styles.footerText}>3 unread</Text>
      </View>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e2e8f0",
  },
  title: { fontSize: 20, fontWeight: "700" },
  content: { flex: 1, padding: 16 }, // grows - pushes footer down
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f0",
  },
  footerText: { textAlign: "center", color: "#64748b" },
});
```

**When to reach for this:** Any screen layout in React Native - rows, columns, toolbars, cards, and the classic header/content/footer shell all run through Yoga flexbox.

## Working Example

```tsx
import { ScrollView, StyleSheet, Text, View } from "react-native";
 
interface Task {
  id: string;
  title: string;
  done: boolean;
}
 
const TASKS: Task[] = [
  { id: "1", title: "Review flexbox PR", done: false },
  { id: "2", title: "Ship dark mode tokens", done: true },
  { id: "3", title: "Test foldable layout", done: false },
];
 
export default function TaskBoard() {
  return (
    <View style={styles.screen}>
      {/* Toolbar row */}
      <View style={styles.toolbar}>
        <Text style={styles.heading}>Tasks</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{TASKS.filter((t) => !t.done).length}</Text>
        </View>
      </View>
 
      {/* Scrollable flex child */}
      <ScrollView contentContainerStyle={styles.list}>
        {TASKS.map((task) => (
          <View key={task.id} style={styles.row}>
            <View style={[styles.dot, task.done && styles.dotDone]} />
            <Text
              style={[styles.rowTitle, task.done && styles.rowTitleDone]}
              numberOfLines={1}
            >
              {task.title}
            </Text>
            <Text style={styles.rowMeta}>{task.done ? "Done" : "Open"}</Text>
          </View>
        ))}
      </ScrollView>
 
      {/* Bottom action bar */}
      <View style={styles.actionBar}>
        <View style={styles.actionPrimary}>
          <Text style={styles.actionPrimaryText}>Add task</Text>
        </View>
      </View>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  heading: { fontSize: 28, fontWeight: "700", color: "#0f172a" },
  badge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  badgeText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  list: { padding: 16, gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#94a3b8",
    flexShrink: 0,
  },
  dotDone: { backgroundColor: "#22c55e" },
  rowTitle: { flex: 1, fontSize: 16, fontWeight: "600", color: "#0f172a" },
  rowTitleDone: { color: "#94a3b8", textDecorationLine: "line-through" },
  rowMeta: { fontSize: 13, color: "#64748b", flexShrink: 0 },
  actionBar: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#cbd5e1",
    backgroundColor: "#fff",
  },
  actionPrimary: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionPrimaryText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
```

**What this demonstrates:**

* `flex: 1` on the screen root so the layout fills the device viewport.
* `flexDirection: "row"` for toolbar and list rows - explicit, never assumed.
* `justifyContent: "space-between"` to pin title left and badge right.
* `flex: 1` on the title `Text` so it truncates while meta stays visible.
* `flexShrink: 0` on the dot and meta so icons do not get squashed.
* `gap` for consistent spacing between row children without margin math.
* `ScrollView` as a flex child that scrolls while the action bar stays pinned.

## Deep Dive

### How It Works

* React Native layout runs through **Yoga**, a flexbox implementation shared across iOS and Android.
* Every `View` is a flex container. The default `display` is flex; there is no block/inline split like the web.
* Default **`flexDirection` is `column`** - children stack vertically unless you set `row`.
* Default **`alignItems` is `stretch`** - children expand to the container's cross-axis width (in a column, that means full width).
* Default **`flexShrink` is 0** on children (differs from many browser defaults) - items keep their intrinsic size unless you allow shrinking.
* **`flex: 1`** is shorthand for `flexGrow: 1`, `flexShrink: 1`, `flexBasis: 0` - the child claims all remaining space along the main axis.
* Styles cross the JS/native boundary on update; deep flex trees with frequent style object recreation can add layout cost (see [Style Performance](https://docs.wahwei/reactnative.codeguides.io/styling-layout/style-performance/)).

### Main-Axis vs Cross-Axis

| `flexDirection` | Main axis (justifyContent) | Cross axis (alignItems) |
| --- | --- | --- |
| `column` (default) | Vertical ↕ | Horizontal ↔ |
| `row` | Horizontal ↔ | Vertical ↕ |
| `column-reverse` | Vertical (reversed) | Horizontal |
| `row-reverse` | Horizontal (reversed) | Vertical |

```tsx
// Column (default): justifyContent = vertical, alignItems = horizontal
<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
  <Text>Centered</Text>
</View>
 
// Row: justifyContent = horizontal, alignItems = vertical
<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
  <Icon />
  <Text style={{ flex: 1 }}>Label fills middle space</Text>
  <Chevron />
</View>
```

### Flex Properties at a Glance

| Property | Effect |
| --- | --- |
| `flex: 1` | Grow to fill remaining space; shrink if needed |
| `flexGrow: 1` | Take extra space when siblings do not |
| `flexShrink: 1` | Allow shrinking below intrinsic size when crowded |
| `flexShrink: 0` | Never shrink - protect icons, badges, avatars |
| `flexBasis: "auto"` | Start from content size, then grow/shrink |
| `flexBasis: 0` | Ignore content size when distributing space |
| `alignSelf` | Override parent's `alignItems` for one child |

### Common Layout Recipes

**1. Header / scrollable content / footer**

```tsx
<View style={{ flex: 1 }}>
  <Header />
  <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} />
  <Footer />
</View>
```

**2. Horizontally spaced toolbar actions**

```tsx
<View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
  <BackButton />
  <Title />
  <MenuButton />
</View>
```

**3. Equal-width segments (tabs)**

```tsx
<View style={{ flexDirection: "row" }}>
  {tabs.map((tab) => (
    <Pressable key={tab} style={{ flex: 1, alignItems: "center" }}>
      <Text>{tab}</Text>
    </Pressable>
  ))}
</View>
```

**4. Bottom-aligned card actions**

```tsx
<View style={{ flex: 1, justifyContent: "flex-end", padding: 16 }}>
  <PrimaryButton />
</View>
```

**5. Wrapping chip row**

```tsx
<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
  {tags.map((tag) => (
    <Chip key={tag} label={tag} />
  ))}
</View>
```

### TypeScript Notes

```tsx
import type { FlexStyle, ViewStyle } from "react-native";
 
type Justify = FlexStyle["justifyContent"]; // "flex-start" | "center" | "space-between" | ...
 
interface RowProps {
  children: React.ReactNode;
  justify?: Justify;
  style?: ViewStyle;
}
 
function Row({ children, justify = "flex-start", style }: RowProps) {
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", justifyContent: justify, gap: 8 }, style]}>
      {children}
    </View>
  );
}
```

* `FlexStyle` covers flex-specific keys; `ViewStyle` is the full view style type.
* Style arrays merge left-to-right: `[styles.base, isActive && styles.active]`.
* Falsy entries in style arrays (`false`, `null`, `undefined`) are ignored safely.

## Gotchas

* **Assuming row direction** - Pasting web snippets without `flexDirection: "row"` stacks items vertically. **Fix:** Set `flexDirection: "row"` explicitly for horizontal layouts.
* **Missing `flex: 1` on the screen root** - Content does not fill the viewport; footers float mid-screen. **Fix:** Apply `flex: 1` to the outermost `View` (inside your safe-area wrapper).
* **Using `height: "100%"` instead of `flex: 1`** - Percentage height requires a parent with explicit height; fails unpredictably in nested trees. **Fix:** Prefer `flex: 1` for fill-remaining-space layouts.
* **Truncated text in rows without `flex: 1`** - Long titles push siblings off-screen instead of ellipsizing. **Fix:** Give the `Text` `flex: 1` (and `numberOfLines`) inside a row; set `flexShrink: 0` on trailing icons.
* **`justifyContent: "center"` without `flex: 1`** - Centering only works within the container's content height, not the full screen. **Fix:** Give the container `flex: 1` so it spans available space.
* **`alignItems: "center"` shrinking row children** - Children shrink to content width; a `width: "100%"` child may not stretch. **Fix:** Use `alignSelf: "stretch"` on the child that must be full width, or use `alignItems: "stretch"` on the parent.
* **Padding on `ScrollView` instead of `contentContainerStyle`** - Scroll indicators and bounce behave oddly on iOS. **Fix:** Put padding and `gap` on `contentContainerStyle`; keep `style={{ flex: 1 }}` on the `ScrollView` itself.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Yoga flexbox (`View`) | Default for all RN layout - rows, columns, fill space | You need absolute positioning overlays (use `position: "absolute"`) |
| `FlatList` / `SectionList` | Long virtualized lists with homogeneous rows | Short static content - `ScrollView` + `map` is simpler |
| `react-native-reanimated` layout animations | Animated flex changes, entering/exiting layouts | Static screens with no motion requirements |
| Percentage widths (`width: "50%"`) | Simple two-column splits | Precise multi-column grids - calculate dp from `useWindowDimensions` |
| CSS Grid (web-only targets) | Expo web with responsive grid | iOS/Android production layouts - flex is the portable choice |

## FAQs

What is the default flex direction in React Native?

`column` - children stack top to bottom. This is the opposite of many web nav bars that implicitly flow in a row. Always set `flexDirection: "row"` when you want horizontal layout.

What does flex: 1 actually mean?

It is shorthand for `flexGrow: 1`, `flexShrink: 1`, `flexBasis: 0`. The child grows to consume all remaining space along the parent's main axis and can shrink if space is tight. Put `flex: 1` on the screen root and on content areas between fixed headers/footers.

When should I use justifyContent vs alignItems?

* `justifyContent` - alignment along the **main** axis (vertical in a column, horizontal in a row).
* `alignItems` - alignment along the **cross** axis (horizontal in a column, vertical in a row).

Center a single child in a full screen: `flex: 1`, `justifyContent: "center"`, `alignItems: "center"`.

How do I keep a footer pinned to the bottom?

```tsx
<View style={{ flex: 1 }}>
  <ScrollView style={{ flex: 1 }} />
  <Footer />
</View>
```

The `ScrollView` with `flex: 1` takes all space above the footer. The footer renders at its natural height below.

Why does my row text not truncate with ellipsis?

`numberOfLines` needs a bounded width. In a row, give the `Text` `flex: 1` so it competes for space, and `flexShrink: 0` on trailing icons so they keep their size.

What is flexShrink: 0 for?

It prevents a child from shrinking below its intrinsic size when the row is crowded. Use it on avatars, icons, badges, and fixed-width buttons so they do not get squashed.

Does gap work in React Native flex layouts?

Yes - `gap`, `rowGap`, and `columnGap` are supported in React Native 0.71+. They add space between flex children without margin on first/last items. Works in `View` and `ScrollView` `contentContainerStyle`.

How do I space items evenly across a row?

* `justifyContent: "space-between"` - first at start, last at end, equal space between.
* `justifyContent: "space-around"` - equal space around each item.
* `justifyContent: "space-evenly"` - perfectly even gaps including edges.

For toolbar back/title/menu, `space-between` is the most common.

Can I nest flex containers?

Yes - flex is recursive. A column screen can contain row toolbars, row list items, and column cards. Each `View` establishes its own flex context with independent main/cross axes.

Gotcha: Why does centering only work sometimes?

`justifyContent: "center"` centers within the container's own height. If the container wraps its content (no `flex: 1`), centering has no extra space to work with. Add `flex: 1` to the container.

How does flexWrap work?

`flexWrap: "wrap"` lets row children flow to the next line when they exceed the container width. Combine with `gap` for chip grids and tag clouds. Set explicit widths on children or use percentage basis for even columns.

What is alignSelf?

It overrides the parent's `alignItems` for a single child. Example: parent has `alignItems: "center"` but one child needs full width - set `alignSelf: "stretch"` on that child.

Should I use margin or gap between flex children?

Prefer `gap` for uniform spacing between siblings. Use margin when one item needs asymmetric spacing (e.g., push a button to the right with `marginLeft: "auto"` in a row - though `justifyContent: "space-between"` is cleaner).

How does flex interact with ScrollView?

Give the `ScrollView` `style={{ flex: 1 }}` so it fills space between siblings. Put padding and `gap` on `contentContainerStyle`. Add `contentContainerStyle={{ flexGrow: 1 }}` when you need the scroll content to fill the viewport (e.g., center empty-state text).

Where do I learn responsive breakpoints and tablet layouts?

Flex distributes space within a container; breakpoints decide *which* flex tree to render. See [Responsive & Adaptive Layout](https://docs.wahwei/reactnative.codeguides.io/styling-layout/responsive-and-adaptive-layout/) and [Dimensions & Responsive Layout](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/dimensions-and-responsive-layout/).

## Related

* [Styling Basics](https://docs.wahwei/reactnative.codeguides.io/styling-layout/styling-basics/) - `StyleSheet.create`, inline styles, and the RN styling mental model
* [Safe Areas & Notches](https://docs.wahwei/reactnative.codeguides.io/styling-layout/safe-areas-and-notches/) - insets around your flex screen shell
* [Responsive & Adaptive Layout](https://docs.wahwei/reactnative.codeguides.io/styling-layout/responsive-and-adaptive-layout/) - breakpoints that change flex trees on tablet
* [Style Performance](https://docs.wahwei/reactnative.codeguides.io/styling-layout/style-performance/) - avoiding layout thrash in deep flex trees
* [Views, Text & Core Components](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/views-text-and-core-components/) - `View` defaults and text nesting rules
* [Dimensions & Responsive Layout](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/dimensions-and-responsive-layout/) - `useWindowDimensions` for column width math

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
