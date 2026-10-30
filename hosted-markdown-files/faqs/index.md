# FAQs

251 pages across 49 sections. 1910 questions total.

Sections

## Fundamentals(7 pages)

---

### [Fundamentals - Views, Text & Core Components](https://docs.wahwei/reactnative.codeguides.io/docs/rn-fundamentals/views-text-and-core-components)

Why must text strings be wrapped in a Text component?

* React Native has no DOM text nodes - strings map to native `UILabel` / `TextView` instances.
* `View` is a layout container only; it cannot render glyphs.
* The redbox enforces this at development time so you catch layout mistakes early.

What is the default flex direction in React Native?

* `column` - children stack vertically top-to-bottom.
* This differs from most web layouts where row is common for nav bars.
* Set `flexDirection: "row"` explicitly for horizontal toolbars and chip rows.

How do I nest styled inline text inside a paragraph?

```tsx
<Text style={styles.body}>
  Already have an account?{" "}
  <Text style={styles.link} onPress={goToLogin}>
    Sign in
  </Text>
</Text>
```

* Nested `Text` inherits parent font size and color unless overridden.
* Works on both iOS and Android without extra wrappers.

Should I use ScrollView or FlatList?

* `ScrollView` renders **all** children at once - fine for short content.
* `FlatList` virtualizes rows - required for long feeds to avoid memory and layout cost.
* For mixed content under ~20 items, `ScrollView` is simpler and predictable.

Gotcha: Why does my iOS shadow not appear on Android?

* iOS uses `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`.
* Android uses `elevation` on the view background.
* Apply both via `Platform.select` inside `StyleSheet.create`.

What is the difference between style and contentContainerStyle on ScrollView?

* `style` applies to the scroll viewport (the visible window).
* `contentContainerStyle` applies to the inner wrapper that moves when scrolling.
* Put padding, `gap`, and `flexGrow: 1` on `contentContainerStyle`, not `style`.

How do I handle notches and home indicators?

* Import `SafeAreaView` from `react-native-safe-area-context` (included in Expo templates).
* Pass `edges={["top", "left", "right"]}` to avoid double bottom padding above tab bars.
* For modals, wrap content independently - insets differ per presentation style.

Does Text support onPress?

* Yes - `Text` accepts `onPress`, `onLongPress`, and `pressRetentionOffset`.
* For buttons, prefer `Pressable` with a `Text` child for clearer roles and larger hit targets.
* Inline links inside copy are the main `Text` press use case.

How does gap work in React Native flex layouts?

* `gap`, `rowGap`, and `columnGap` are supported in React Native 0.71+.
* They add space between flex children without margin hacks on first/last items.
* Requires Yoga layout; works in `View` and `ScrollView` `contentContainerStyle`.

Gotcha: Why is my truncated text not showing an ellipsis?

* `numberOfLines` needs a bounded width to measure overflow.
* Unconstrained text grows to fit content and never truncates.
* Add `flex: 1`, a fixed `width`, or `flexShrink: 1` on the `Text` or parent row.

Should I use inline styles or StyleSheet.create?

* `StyleSheet.create` validates keys, enables reuse, and reads cleaner in diffs.
* Inline styles are fine for one-off dynamic values (`{ opacity: pressed ? 0.6 : 1 }`).
* Combine both: `style={[styles.base, { backgroundColor: color }]}`.

What changed with Fabric for View and Text updates?

* Fabric commits shadow nodes synchronously where configured, reducing layout thrash.
* Props still originate in JS - fewer bridge copies, not zero work on update.
* Component rules (`Text` nesting, style shapes) are unchanged from the developer perspective.

How do I center content vertically and horizontally?

```tsx
<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
  <Text>Centered</Text>
</View>
```

* `justifyContent` aligns on the main axis (column = vertical).
* `alignItems` aligns on the cross axis (column = horizontal).

Can I use percentage widths in React Native?

* Yes - `width: "100%"` and `height: "50%"` resolve against the parent.
* Percent flex basis works in many layouts; test on both platforms.
* For screen-width math, see `useWindowDimensions` in the dimensions article.

What is pointerEvents and when should I set it on View?

* `pointerEvents="none"` lets touches pass through to views below - useful for decorative overlays.
* `box-none` ignores touches on the container but allows children to receive them.
* Default is `auto`; change only when debugging overlapping touch targets.

### [Fundamentals - Props, State & Re-renders on Mobile](https://docs.wahwei/reactnative.codeguides.io/docs/rn-fundamentals/props-state-and-re-renders-on-mobile)

What actually happens when setState is called in React Native?

* React schedules a re-render of the component and its descendants (unless bailed out by `memo`).
* The component function runs again on the JS thread with the new state snapshot.
* React Native's renderer diffs props and children, then commits changes to native views.
* Native layout and drawing occur on the UI thread after the commit phase.

Does React 19 batch setState calls on mobile?

* Yes - updates from event handlers, `setTimeout`, `fetch` resolutions, and native events batch by default.
* Multiple `setState` calls in the same tick produce one re-render.
* Use `flushSync` only when you intentionally need a synchronous paint (rare on mobile).

Why do my FlatList rows re-render when parent state changes?

* Parent re-render recreates `renderItem` unless memoized; new function identity can defeat row memoization.
* Context or unstabilized props flowing into rows trigger child updates.
* Fix with `memo` on the row, stable `useCallback` handlers, and `extraData` only when needed.

What is the difference between props and state?

* **Props** are inputs from a parent - read-only from the child's perspective.
* **State** is owned by the component and updated via `setState` / `useReducer`.
* Changing props re-renders the child; changing state re-renders the owner and typically descendants.

Gotcha: Why does memo not skip re-renders?

* Shallow compare sees a new object or function prop each parent render.
* Inline `style={{ flex: 1 }}` creates a new object every time.
* Stabilize callbacks with `useCallback` and hoist styles to `StyleSheet.create`.

Should I lift state up or use a global store?

* Lift state to the nearest parent that needs to coordinate siblings - fewer moving parts.
* Reach for Context or Zustand when props drill through five+ layers or many tabs consume the same data.
* Server cache state belongs in TanStack Query, not duplicated in global stores.

How does Fabric change the cost of re-renders?

* Fabric uses the JavaScript Interface (JSI) to call native methods directly - less serialization than the old bridge.
* You still pay for JS render work and native diffing; fewer copies, not fewer tree nodes.
* Profile JS frame time and UI thread FPS separately.

When should I use useRef instead of useState?

* `useRef` stores mutable values that should **not** trigger re-renders when updated.
* Timers, subscription handles, and "latest callback" patterns are common mobile cases.
* If the UI must reflect the value, use `useState`.

What is extraData on FlatList?

* `FlatList` is a `PureComponent` - it may skip `renderItem` if `data` reference is unchanged.
* Pass `extraData={selectedId}` when row appearance depends on state outside `data`.
* Do not pass entire state objects - pass the minimal primitive or flag.

Gotcha: Why is my count wrong inside a loop of setState calls?

```tsx
// Wrong - each call uses the same snapshot
setCount(count + 1);
setCount(count + 1);
 
// Right - functional updater chains on latest value
setCount((c) => c + 1);
setCount((c) => c + 1);
```

* State updates are queued; the `count` variable in the closure is stale within the same handler.

Do children re-render when parent state changes?

* By default, yes - a parent re-render re-executes children unless `memo` bails out with same props.
* `children` prop identity changes if the parent inline-defines JSX that captures new closures.
* Structure heavy subtrees as separate memoized components.

How do navigation params relate to props?

* `expo-router` and React Navigation pass route params as props or hook values (`useLocalSearchParams`).
* Treat params as external input - copy to state if the user can edit them locally.
* Param changes trigger screen re-renders like any prop change.

What is React Strict Mode double-rendering in dev?

* React 19 Strict Mode in dev may invoke render twice to surface side effects in render.
* Hermes + RN dev builds show this only when Strict Mode is enabled in the root.
* Side effects belong in `useEffect`, not in the render body.

How do I avoid stale closures in Pressable handlers?

* Prefer functional updates: `setTodos((prev) => ...)` so you do not close over `todos`.
* Store latest callbacks in a ref updated each render for subscription-style APIs.
* List handlers should accept `id` arguments rather than capturing loop variables when possible.

Does useMemo prevent re-renders?

* No - `useMemo` only caches a computed **value** between renders of the same component.
* It avoids expensive recomputation and stabilizes referential equality for child props.
* Pair with `memo` on children when passing memoized objects or arrays down.

### [Fundamentals - Event Handling & Touchables](https://docs.wahwei/reactnative.codeguides.io/docs/rn-fundamentals/event-handling-and-touchables)

Why is Pressable preferred over TouchableOpacity?

* `Pressable` exposes `pressed`, `hovered`, and `focused` states in a style function.
* Built-in `android_ripple`, `hitSlop`, and accessibility props are first-class.
* `TouchableOpacity` always animates opacity - less control and wider re-render surface on big trees.

What does hitSlop actually change?

* It expands the **touch recognition rect** beyond the view's layout bounds.
* Visual layout and sibling spacing stay the same - only the tappable area grows.
* Measured in density-independent pixels (dp/pt), not physical millimeters.

When does onPress not fire?

* User scrolls parent `ScrollView` before release.
* Finger moves outside the view bounds on release.
* Another view wins the responder during negotiation.
* `disabled={true}` is set on the `Pressable`.

How do I add Android ripple and iOS opacity together?

```tsx
<Pressable
  android_ripple={{ color: "rgba(0,0,0,0.12)" }}
  style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
/>
```

* `android_ripple` is ignored on iOS - safe to ship in cross-platform files.
* iOS uses `pressed` style (typically lower opacity or background change).

Gotcha: Why does my button feel delayed?

* `delayPressIn` (default 0) can be raised by parents or `ScrollView` press retention.
* Heavy JS work on `onPressIn` blocks the next frame.
* Defer expensive work to `onPress` or `requestAnimationFrame`; show highlight immediately.

What is delayLongPress?

* Milliseconds the finger must stay down before `onLongPress` fires (default 500).
* Lower values (250–400) feel snappier for power users; higher values reduce accidental triggers.
* `onPress` still fires on quick taps unless long-press handler consumes the gesture.

How do pointerEvents values work?

* `auto` (default) - view and children receive touches.
* `none` - view and children are transparent to touches.
* `box-none` - view ignores touches; children still receive them.
* `box-only` - view receives touches; children do not.

Should list rows use Pressable or TouchableHighlight?

* Use `Pressable` for new code - clearer state and ripple control.
* `TouchableHighlight` underlay can flash incorrectly in virtualized lists during fast scroll.
* Memoize row components; avoid creating new `onPress` closures per item.

How do I prevent double-tap submitting twice?

```tsx
const [submitting, setSubmitting] = useState(false);
 
const onSubmit = async () => {
  if (submitting) return;
  setSubmitting(true);
  try {
    await save();
  } finally {
    setSubmitting(false);
  }
};
 
<Pressable onPress={onSubmit} disabled={submitting} />
```

* Disable while async work runs; do not rely on debounce alone for network calls.

Gotcha: Can I nest Pressables?

* Nesting is allowed but inner and outer both compete for the responder.
* Prefer a single `Pressable` row with child `Text` nodes.
* For buttons inside cards, stop propagation is not like web - restructure layout instead.

What accessibility props should buttons have?

* `accessibilityRole="button"` marks the element for screen readers.
* `accessibilityLabel` when visible text is insufficient (icon-only).
* `accessibilityState={{ disabled, selected, busy }}` mirrors visual state.
* `accessibilityHint` for destructive or non-obvious outcomes.

When do I need react-native-gesture-handler?

* Pan/swipe gestures that must run on the UI thread alongside scroll views.
* Pinch-to-zoom, draggable sheets, and simultaneous multi-touch handlers.
* Expo templates often include it prewired - import `GestureDetector` for advanced cases.

Does onPressIn run on the JS thread?

* Yes - all `Pressable` callbacks execute on the JavaScript thread (Hermes).
* Keep handlers light; defer heavy work until after press confirmation.
* Animations driven by `react-native-reanimated` can stay on the UI thread separately.

How do keyboardShouldPersistTaps relate to touches?

* On screens with `TextInput`, `keyboardShouldPersistTaps="handled"` lets taps on `Pressable` fire without dismissing the keyboard first.
* Use on form screens so submit buttons work on first tap.
* Does not replace `hitSlop` - both solve different problems.

What is pressRetentionOffset?

* Allows the finger to move slightly outside the view before cancelling the press.
* Useful for chunky fingers on small targets - pairs well with modest `hitSlop`.
* Documented on `Pressable` props; tune when users report "slip off" cancellations.

### [Fundamentals - Platform-Specific Code](https://docs.wahwei/reactnative.codeguides.io/docs/rn-fundamentals/platform-specific-code)

What values can Platform.OS return?

* Common mobile values: `"ios"` and `"android"`.
* Expo also targets `"web"`, and RN supports `"macos"` and `"windows"` in some templates.
* Narrow with `Platform.OS === "ios"` rather than assuming only two platforms.

How does Metro choose between Foo.ios.tsx and Foo.tsx?

* On an iOS build, Metro tries `Foo.ios.tsx` first, then `Foo.native.tsx`, then `Foo.tsx`.
* On Android, `Foo.android.tsx` replaces the `.ios` step.
* Only one file is bundled - others are excluded from that binary.

When should I use Platform.select instead of splitting files?

* Use `Platform.select` for style values, numeric constants, and small config objects.
* Split files when JSX structure, hooks, or native imports diverge significantly.
* If you squint and see two 80-line components in one file, split.

What is the .native.tsx extension for?

* Shared mobile implementation used by both iOS and Android.
* Helpful when web gets a completely different `*.web.tsx` implementation.
* Resolution: platform-specific (`.ios`) beats `.native` beats generic `.tsx`.

Gotcha: Why is Platform.select returning undefined on web?

* Without a `default` key, unmatched platforms receive `undefined`.
* Expo web hits the same code - add `default` or an explicit `web` key.
* Use nullish coalescing: `Platform.select({...}) ?? fallback`.

Can I use platform-specific code in Expo Router apps?

* Yes - file extensions work the same; routes live under `app/` but components can split normally.
* Do not suffix route files with `.ios` unless you intend OS-specific screens.
* Keep routes shared; split presentational components instead.

How do I type Platform.select results in TypeScript?

```tsx
const spacing = Platform.select({
  ios: 8,
  android: 12,
  default: 10,
}); // number | undefined without default - use default key
```

* Explicitly annotate when returning incompatible object shapes per platform.
* Prefer separate typed helpers per platform if return types diverge wildly.

What is Platform.Version on iOS vs Android?

* iOS: string OS version (`"18.0"`) - parse to integer major version for comparisons.
* Android: integer API level (`34`) - compare numerically.
* Do not compare iOS version strings lexicographically.

Should I branch on Platform.OS in render?

* Small branches (`{Platform.OS === "ios" && <BlurView />}`) are fine.
* Large alternate trees belong in separate files for testability and bundle size.
* Heavy work should not run on both paths - split modules instead.

How does Expo web interact with .android and .ios files?

* Web builds prefer `*.web.tsx` when present.
* Without `.web`, web may fall back to `.tsx` or `.native.tsx` depending on resolver config.
* Add explicit `*.web.tsx` when mobile code imports native-only modules.

Gotcha: I imported ./Button.ios and Android build crashed

* Explicit platform imports bypass Metro's resolver and pull iOS code into wrong bundles.
* Import `./Button` always - let the bundler pick the right file.

How do I share types across platform files?

* Create `Component.types.ts` with props interfaces.
* Each `Component.ios.tsx` / `Component.android.tsx` imports the same types.
* Export a single `Component.tsx` barrel that re-exports the resolved implementation.

Is Platform.OS available during SSR or tests?

* In Jest, mock `Platform.OS` via `jest.spyOn(Platform, "OS", "get")`.
* Expo web runs in a browser - `Platform.OS` is `"web"`.
* Default test renderer often simulates `ios` - set explicitly per suite.

When should I use expo-constants instead of Platform?

* `expo-constants` exposes `executionEnvironment`, `sessionId`, `platform` subtleties, and EAS metadata.
* Use for device class, OTA runtime version, and manifest values.
* Use `Platform` for quick OS branches in UI components.

How do native modules relate to platform files?

* TurboModules and legacy native modules are often registered only on one OS.
* Wrap native imports in `.ios.ts` / `.android.ts` stubs with matching TypeScript signatures.
* Export a unified function from `index.ts` so app code stays platform-agnostic.

### [Fundamentals - Images & Assets](https://docs.wahwei/reactnative.codeguides.io/docs/rn-fundamentals/images-and-assets)

Why must `require()` paths be static strings?

Metro's bundler scans your source at build time and includes only assets it can resolve statically. Dynamic path construction cannot be analyzed, so the bundler throws an error. Use a constant map:

```tsx
const icons = {
  home: require("./assets/home.png"),
  settings: require("./assets/settings.png"),
} as const;
```

How do `@2x` and `@3x` density buckets work?

Name files with `@2x` and `@3x` suffixes alongside the base file. Metro selects the best match for the device's `PixelRatio` at runtime. You always `require()` the base filename - never the suffixed variant directly.

Do I need to set width and height for local `require()` images?

Yes. React Native does not infer layout size from image metadata for either local or remote sources. Set `width`/`height` in `StyleSheet` or use `aspectRatio` with one dimension.

What is the difference between `defaultSource` and a loading placeholder?

`defaultSource` (iOS-focused; limited Android support) shows a bundled image while the remote `{ uri }` loads. For cross-platform placeholder UX, prefer `expo-image` with `placeholder` / `blurhash` props or render a skeleton `View` until `onLoad` fires.

How do I preload images before navigating to a screen?

```tsx
import { Image } from "react-native";
import { Asset } from "expo-asset";
 
// Core Image prefetch (remote only)
await Image.prefetch("https://cdn.example.com/hero.jpg");
 
// expo-asset (local require IDs and remote URLs)
await Asset.loadAsync([require("./assets/card-bg.png")]);
```

Can I use WebP images in Expo SDK 57?

Yes. iOS and Android in current Expo SDK builds decode WebP. WebP often yields smaller bundles than PNG for photos and illustrations. Keep PNG for images requiring lossless transparency at small sizes.

Gotcha: Why does my remote image flicker on every re-render?

Unstable `source={{ uri }}` object references can trigger re-fetches. Memoize the source object or pass a stable URI string via `expo-image`'s `source` prop. Avoid cache-busting query params unless intentional.

How are fonts loaded alongside images?

Use `expo-font`'s `useFonts` or `Font.loadAsync` in the same bootstrap routine as `Asset.loadAsync`. Both should complete before you hide the splash screen and render text-heavy UI.

What does `resizeMode="cover"` vs `"contain"` mean for list thumbnails?

`cover` fills the frame and crops - good for uniform avatar circles. `contain` fits the entire image inside the frame - good for logos with varied aspect ratios where cropping is unacceptable.

How do I handle image load errors gracefully?

```tsx
const [error, setError] = useState(false);
 
<Image
  source={error ? require("./assets/fallback.png") : { uri }}
  onError={() => setError(true)}
  style={{ width: 48, height: 48 }}
/>
```

Should I put assets in `assets/` at the project root?

Expo projects conventionally use a top-level `assets/` folder for app icons and splash images (referenced in `app.json`), and co-located `./assets/` folders next to screens for feature-specific images. Both work - consistency within a feature matters more than the exact folder name.

What is `expo-asset` doing under the hood?

It registers assets in Expo's asset system, downloads remote URLs to a cache directory when needed, and ensures native resources are available before your JS references them. For bundled `require()` assets, it primarily guarantees preload completion via promises.

How does `accessibilityLabel` work on images?

Decorative images should set `accessible={false}` so screen readers skip them. Meaningful images (avatars, charts) need `accessibilityLabel` describing the content. Purely decorative bundled icons usually need no label.

Can I reference images from `expo-router` public assets?

React Native does not serve a `public/` folder like the web. All bundled images must be imported with `require()` (or preloaded via `expo-asset`). Remote images use HTTPS URLs.

### [Fundamentals - Dimensions & Responsive Layout](https://docs.wahwei/reactnative.codeguides.io/docs/rn-fundamentals/dimensions-and-responsive-layout)

Why prefer `useWindowDimensions` over `Dimensions.get('window')`?

`Dimensions.get()` returns a snapshot at call time. It does not re-render your component when the user rotates the device or resizes split-screen. `useWindowDimensions` is a hook that subscribes to dimension changes and triggers a re-render automatically.

What is the difference between `window` and `screen` dimensions?

* `window` - the usable app viewport (what most layouts need).
* `screen` - the full physical display, including areas under status/navigation bars on some Android devices.

Default to `window` unless you have a specific fullscreen use case.

What logical width should I use for a tablet breakpoint?

`768` is the most common convention (iPad portrait is 768 dp). Some teams use `600` (Material "tablet" threshold) or `1024` for desktop-class layouts. Pick one, document it, and use it consistently.

How do density-independent pixels relate to physical pixels?

```tsx
import { PixelRatio } from "react-native";
 
const physicalPixels = layoutDp * PixelRatio.get();
```

A 100×100 dp box is 200×200 physical pixels on a 2x device and 300×300 on a 3x device.

How do I build a master-detail layout for phone and tablet?

On tablet (`width >= 768`), render list and detail in a `flexDirection: 'row'` container. On phone, use Expo Router / React Navigation stack - list screen pushes detail screen. Pass the same data layer to both layouts.

Does `useWindowDimensions` work with Expo Router?

Yes. It is a standard React Native hook. Use it inside any client component screen or layout. It updates when the router-mounted screen rotates or resizes.

Gotcha: Why does my layout break in Android split-screen?

Split-screen shrinks `window.width` dramatically. A tablet-width breakpoint may not fire even on a large device. Test narrow widths and prefer `flex`-based layouts that degrade gracefully.

How do I handle orientation lock?

Use `expo-screen-orientation` to lock or unlock orientation per screen. Even with a lock, always write layouts defensively - OS policies and foldables can still change effective viewport size.

Should I use `Platform.isPad` for iOS tablet detection?

`Platform.isPad` is reliable on iOS but has no Android equivalent. For cross-platform tablet layouts, width breakpoints are the portable choice. `Platform.isPad` is fine for iOS-only branching (e.g., popover vs sheet).

How does `fontScale` affect layout?

Users can enlarge system text in accessibility settings. `fontScale` on `useWindowDimensions` reflects this multiplier. Avoid fixed-height rows that clip enlarged text; prefer wrapping and `flexShrink`.

Can I use CSS-like media queries in React Native?

Not natively. Simulate them with `useWindowDimensions` + breakpoint constants, or use libraries like `react-native-media-query` on web targets. For iOS/Android, hook-based breakpoints are the standard pattern.

How do I limit modal width on tablet?

```tsx
const { width } = useWindowDimensions();
const modalWidth = Math.min(width - 48, 560);
 
<View style={{ width: modalWidth, alignSelf: "center" }} />
```

What is `scale` in `useWindowDimensions`?

`scale` is the pixel ratio (same as `PixelRatio.get()`). `fontScale` is the user accessibility text scaling factor. Both are included in the hook return value.

How do images interact with responsive layout?

Set image dimensions relative to column width (calculated from `useWindowDimensions`) rather than fixed global pixels. See [Images & Assets](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/images-and-assets) for asset sizing guidance.

### [Fundamentals - React Native Fundamentals Best Practices](https://docs.wahwei/reactnative.codeguides.io/docs/rn-fundamentals/best-practices)

Should I read this page before or after the individual topic pages?

* Read **React Native Basics** first for a hands-on tour of primitives.
* Work through the topic pages as you encounter each concept in a real project.
* Return to this page as a review checklist before code review or onboarding a teammate.

Why exactly 25 items?

* The list is capped at 25 so it stays scannable in one sitting.
* Each item maps to gotchas and deep-dive guidance from a specific fundamentals page.
* If you need full recipes and runnable examples, follow the Related links below.

Do these practices apply to Expo and bare React Native?

* Yes - every item here targets APIs in `react-native` core or Expo modules that ship with the default template.
* Platform-specific file resolution and `expo-asset` assume an Expo or prebuild workflow, but the underlying rules hold in bare RN too.

Which practice causes the most beginner redboxes?

* **Strings outside Text** - it is the first layout mistake most web developers hit.
* The fix is simple: wrap every visible string in `<Text>`, even single words inside a `View`.

Which practice has the biggest performance impact on lists?

* **Unstable inline callbacks in virtualized lists** - they defeat `memo` and force every visible row to re-render on each parent tick.
* Stabilize handlers with `useCallback` and keep row components memoized.

When should I split platform-specific files instead of using Platform.select?

* When JSX structure diverges materially - different component trees, native module imports, or OS-specific navigation chrome.
* For one or two style constants, `Platform.select` inside a shared file is cleaner.

Is Hermes optional in modern Expo projects?

* Hermes is the default engine in Expo SDK 57 and React Native 0.86.
* Disabling it is rarely justified - profile on device first if you suspect an engine-specific issue.

How do I verify my app uses the New Architecture?

* Check `newArchEnabled` in `app.json` / `app.config.js` (enabled by default in recent templates).
* Run `npx expo-doctor` and inspect native build logs for Fabric/TurboModule initialization.

What is the single best responsive-layout habit?

* Replace every `Dimensions.get('window')` call in component render with `useWindowDimensions()`.
* Rotation, split-screen, and foldable resize events then trigger re-renders automatically.

Which image mistake wastes the most memory?

* Shipping a `@3x` asset at thousands of pixels wide and displaying it in a 48×48 avatar.
* Export at display size × pixel ratio, or use `expo-image` with appropriate resize modes.
