# App State and Hooks

Screen lifecycle, app foreground/background, system theme, and hook patterns that matter on mobile.

Highlights / App State and Hooks

* AppState Foreground
* useFocusEffect Expo Router
* useColorScheme Theme
* BackHandler Android
* InteractionManager After Interactions

#### useState Local UI

Local component state works the same as web React - ideal for form fields and ephemeral UI flags.

```tsx
const [open, setOpen] = useState(false);
```

#### useEffect Mount Cleanup

Subscribe on mount and always clean up. Mobile apps background frequently - avoid leaked timers and listeners.

```tsx
useEffect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}, []);
```

#### AppState Foreground

`AppState` tells you active vs background. Pause video, sockets, or polling when inactive.

```tsx
import { AppState } from "react-native";
 
useEffect(() => {
  const sub = AppState.addEventListener("change", (next) => {
    if (next === "active") refresh();
  });
  return () => sub.remove();
}, []);
```

#### useFocusEffect Expo Router

Run an effect when a screen gains focus in the navigation tree (not only on mount).

```tsx
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
 
useFocusEffect(
  useCallback(() => {
    refresh();
    return () => abort();
  }, []),
);
```

#### useWindowDimensions Hook

React to orientation and split-view size changes without manual event wiring.

```tsx
import { useWindowDimensions } from "react-native";
 
const { width, height } = useWindowDimensions();
```

#### useColorScheme Theme

Read the system light/dark preference for theming.

```tsx
import { useColorScheme } from "react-native";
 
const scheme = useColorScheme(); // "light" | "dark" | null
const bg = scheme === "dark" ? "#0f172a" : "#ffffff";
```

#### Appearance Listener

Listen for theme changes if you need side effects beyond re-render.

```tsx
import { Appearance } from "react-native";
 
useEffect(() => {
  const sub = Appearance.addChangeListener(({ colorScheme }) => {
    analytics.theme(colorScheme);
  });
  return () => sub.remove();
}, []);
```

#### InteractionManager After Interactions

Defer expensive work until animations and gestures finish for smoother navigation transitions.

```tsx
import { InteractionManager } from "react-native";
 
useEffect(() => {
  const task = InteractionManager.runAfterInteractions(() => {
    warmCache();
  });
  return () => task.cancel();
}, []);
```

#### useRef for Timers

Store interval/timeout ids in refs so handlers always clear the latest timer.

```tsx
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
function schedule(fn: () => void) {
  if (timerRef.current) clearTimeout(timerRef.current);
  timerRef.current = setTimeout(fn, 300);
}
```

#### BackHandler Android

Intercept the hardware back button (and some gesture backs depending on setup).

```tsx
import { BackHandler } from "react-native";
 
useEffect(() => {
  const sub = BackHandler.addEventListener("hardwareBackPress", () => {
    if (dirty) {
      confirmDiscard();
      return true; // handled
    }
    return false;
  });
  return () => sub.remove();
}, [dirty]);
```

#### Dimensions Change Event

Prefer `useWindowDimensions` for UI; use the event API for imperative work on size change.

```tsx
import { Dimensions } from "react-native";
 
useEffect(() => {
  const sub = Dimensions.addEventListener("change", ({ window }) => {
    layoutEngine.relayout(window);
  });
  return () => sub.remove();
}, []);
```

#### Custom useToggle

Small shared hooks reduce boilerplate for boolean UI state.

```tsx
function useToggle(init = false) {
  const [on, setOn] = useState(init);
  const toggle = useCallback(() => setOn((v) => !v), []);
  return [on, toggle, setOn] as const;
}
```

#### Abort Fetch on Unmount

Cancel in-flight requests when leaving a screen so setState does not run after unmount.

```tsx
useEffect(() => {
  const ac = new AbortController();
  fetch(url, { signal: ac.signal })
    .then((r) => r.json())
    .then(setData)
    .catch((e) => {
      if (e.name !== "AbortError") setError(e);
    });
  return () => ac.abort();
}, [url]);
```

#### useCallback Stable Handlers

Stabilize callbacks passed into memoized list rows or navigation options.

```tsx
const onPressItem = useCallback((id: string) => {
  router.push(`/items/${id}`);
}, []);
```

#### useMemo Derived Lists

Memoize filtered/sorted lists when the derivation is non-trivial and inputs change often.

```tsx
const visible = useMemo(
  () => items.filter((i) => i.title.includes(query)),
  [items, query],
);
```

## Related

* [Expo Router Navigation](https://docs.wahwei/reactnative.codeguides.io/code-reference/expo-router-navigation/) - focus and params with routing
* [Networking Images Media](https://docs.wahwei/reactnative.codeguides.io/code-reference/networking-images-media/) - fetch patterns with abort
* [Performance and Lists](https://docs.wahwei/reactnative.codeguides.io/code-reference/performance-and-lists/) - deferral and memo strategy

### External Related Links

* [reactnative.dev/docs](https://reactnative.dev/docs/getting-started) - full RN documentation
* [react.dev](https://react.dev/) - core React concepts RN builds on
* [reactnative.dev](https://reactnative.dev/) - official React Native site

> **Stack versions:** React 19.2.3 · React Native 0.86.0 · Expo SDK 57 · Expo Router

Reviewed by Chris St. John·Last updated Jul 18, 2026
