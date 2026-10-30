# Layout Animations

Reanimated layout animations declaratively handle **entering**, **exiting**, and **layout** changes. Items fade or slide in when added, collapse out when removed, and glide when lists reorder - without `setState` every frame.

Highlights / Layout Animations

* Entering and exiting props animate mount/unmount without manual opacity tweens
* FadeIn, SlideInRight, and FadeOut are the most common presets in production lists
* Layout prop animates position and size when siblings reorder or flex changes
* Customize presets with .duration(), .springify(), and .delay()
* Wrap list rows in Animated.View from reanimated - not react-native Animated
* Disable layout animations on huge lists if profiling shows mount pressure

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install react-native-reanimated
```

```tsx
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";
 
export function AnimatedListItem({ children }: { children: React.ReactNode }) {
  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(180)}
      layout={Layout.springify()}
    >
      {children}
    </Animated.View>
  );
}
```

```tsx
// Slide from trailing edge - common for inbox rows
import { SlideInRight, SlideOutLeft } from "react-native-reanimated";
 
<Animated.View entering={SlideInRight.springify()} exiting={SlideOutLeft.duration(200)} />
```

**When to reach for this:**

* Todo lists, chat bubbles, and notification feeds with insert/delete
* Filter chips appearing/disappearing when toggling categories
* Grid reorder after drag-and-drop (with `Layout` on siblings)
* Accordion sections expanding/collapsing with sibling reflow

## Working Example

Filterable task list - items animate in on add, out on delete, and reposition on filter.

```tsx
// components/task-list.tsx
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeInDown,
  FadeOutUp,
  Layout,
  SlideInRight,
  SlideOutLeft,
} from "react-native-reanimated";
 
type Task = { id: string; title: string; done: boolean };
 
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
 
export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: "1", title: "Ship animations", done: false },
    { id: "2", title: "Profile on Android", done: false },
  ]);
  const [showDone, setShowDone] = useState(true);
 
  const visible = tasks.filter((t) => showDone || !t.done);
 
  const toggleDone = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };
 
  const remove = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };
 
  return (
    <View style={styles.screen}>
      <Pressable onPress={() => setShowDone((v) => !v)} style={styles.filter}>
        <Text>{showDone ? "Hide completed" : "Show all"}</Text>
      </Pressable>
 
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AnimatedPressable
            entering={SlideInRight.duration(250)}
            exiting={SlideOutLeft.duration(200)}
            layout={Layout.springify().damping(18)}
            onPress={() => toggleDone(item.id)}
            onLongPress={() => remove(item.id)}
            style={[styles.row, item.done && styles.rowDone]}
          >
            <Text>{item.title}</Text>
          </AnimatedPressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  filter: { marginBottom: 12 },
  row: { padding: 16, backgroundColor: "#f8fafc", borderRadius: 10 },
  rowDone: { opacity: 0.6 },
  separator: { height: 8 },
});
```

```tsx
// Staggered grid entrance - delay per index
import { FadeInDown } from "react-native-reanimated";
 
function GridCell({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
      {children}
    </Animated.View>
  );
}
```

```tsx
// Accordion section - layout animates siblings when height changes
import { FadeIn, FadeOut, Layout } from "react-native-reanimated";
 
function AccordionPanel({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <Animated.View layout={Layout.springify()}>
      {open ? (
        <Animated.View entering={FadeIn} exiting={FadeOut}>
          {children}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}
```

## Deep Dive

### Entering animations

Import presets from `react-native-reanimated`:

| Preset | Motion |
| --- | --- |
| `FadeIn` / `FadeOut` | Opacity |
| `SlideInRight` / `SlideOutLeft` | Horizontal slide |
| `SlideInDown` / `SlideOutUp` | Vertical slide |
| `ZoomIn` / `ZoomOut` | Scale |
| `FadeInDown` | Combined fade + slide (popular for feeds) |

Chain modifiers:

```tsx
FadeIn.duration(300).delay(50).springify().damping(14)
```

* **Entering** runs when the view mounts with the animation prop present.
* Custom builders exist (`Entering` / `Exiting` factories) for design-system tokens.

### Exiting animations

* **Exiting** requires the view to unmount from React tree - conditional render or list filter removal.
* `FlatList` recycles rows - exiting animations fire only when the item leaves `data`, not on scroll off-screen.
* Keep exiting duration shorter than entering - 150–220ms feels snappy.

### Layout animations

`layout={Layout}` animates position and bounds when:

* Siblings reorder in flex layout
* Item height changes (accordion, multiline text wrap)
* Filter removes items and remaining rows reflow

```tsx
layout={Layout.springify().damping(15).stiffness(120)}
// or
layout={Layout.duration(250)}
```

* Apply `layout` on the **moving** container, not only inner text.
* For `FlatList`, put `layout` on the row wrapper returned from `renderItem`.

### List reorder

When drag-and-drop changes `data` order:

1. Update array order in state (or server-confirmed order).
2. Ensure **stable `keyExtractor`** - index keys break layout animation.
3. Add `layout={Layout.springify()}` on row `Animated.View`.

For drag gestures paired with reorder, combine RNGH pan + `runOnJS` reorder callback - see [react-native-gesture-handler](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/react-native-gesture-handler/).

### Performance notes

* Layout animations run on the UI thread but still cost GPU/CPU on large lists.
* Cap stagger `delay` on long lists - `index * 40` beyond ~20 items adds noticeable lag.
* Consider disabling entering on pagination append (page 2+) if mount jank appears.

## Gotchas

* **Using react-native Animated.View** - Entering/exiting props are ignored. **Fix:** Import `Animated` from `react-native-reanimated`.
* **No exiting on ScrollView map without key change** - React reconciler reuses nodes. **Fix:** Remove item from state array so React unmounts the row.
* **Index keys in lists** - Wrong row animates on delete. **Fix:** Stable string ids in `keyExtractor`.
* **layout on every nested Text** - Over-animates inner typography. **Fix:** One `Animated.View` wrapper per row.
* **Huge entering stagger** - List of 200 items each delays 50ms - UI feels frozen. **Fix:** Stagger only first screen (`index < 12`).
* **Combining Layout with flex wrap grids** - Unexpected jumps when line breaks change. **Fix:** Fixed cell widths or measure with `onLayout` before animating.
* **Modal unmount cuts exiting short** - Parent disappears before exit completes. **Fix:** Delay navigation pop until `exiting` duration elapses (`runOnJS` + timeout).

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Layout animations (Reanimated) | List insert/delete/reorder in RN | Web-only CSS transitions suffice |
| `Animated` timing on opacity | Single static fade | Sibling reflow or list removal |
| `LayoutAnimation` (RN core) | Legacy Android-only quick wins | Cross-platform consistency required |
| No animation | Very long virtualized feeds | User expects feedback on destructive delete |
| Lottie | Branded empty-state illustrations | Per-row list insert motion |

## FAQs

How do I install layout animations on Expo SDK 57?

```bash
npx expo install react-native-reanimated
```

Layout animations ship with Reanimated 4 - no extra package. Confirm Babel plugin is last in `babel.config.js`.

Why does exiting not run in my FlatList?

* Item still exists in `data` - you only scrolled away.
* Row unmounted without `exiting` prop on an Reanimated component.
* Parent list remounted (key change on `FlatList`) - exit cancelled.

FadeIn or SlideInRight for feed rows?

* `FadeIn` / `FadeInDown` for dense feeds (less visual noise).
* `SlideInRight` for inbox/action lists where directional metaphor helps.

What does layout={Layout.springify()} do?

When sibling views change position or size, the view animates to its new layout box with a spring physics curve instead of jumping instantly.

Can I use custom durations per design system?

Yes - centralize tokens:

```tsx
export const enterRow = FadeInDown.duration(220).springify().damping(16);
export const exitRow = FadeOutUp.duration(180);
```

Do layout animations work with FlashList?

Often yes with an `Animated.View` wrapper, but heavy entering on fast scroll can jank - profile on Android. Disable entering for off-screen prefetch if needed.

How do layout animations interact with swipe-to-delete?

Trigger remove from state on swipe end; `exiting` handles collapse. Coordinate with [Gesture Conflict Resolution](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/gesture-conflict-resolution/) so scroll and swipe do not fight.

## Related

* [react-native-reanimated 4](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/react-native-reanimated-4/) - shared values and `withSpring`
* [Animations Basics](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/animations-basics/) - why layout props need Reanimated
* [react-native-gesture-handler](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/react-native-gesture-handler/) - drag-to-reorder pans
* [FlatList Recipes](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/flatlist-recipes/) - stable keys and row structure
* [Gesture Conflict Resolution](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/gesture-conflict-resolution/) - swipe delete inside scroll
* [Animations Best Practices](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/best-practices/) - when to disable motion on huge lists

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
