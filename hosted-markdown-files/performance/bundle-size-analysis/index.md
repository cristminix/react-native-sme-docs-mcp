# Bundle Size Analysis

Metro bundle visualizer and lazy route splitting - find what ships in the Hermes main bundle and defer heavy screens until after cold start.

Highlights / Bundle Size Analysis

* npx react-native-bundle-visualizer treemap shows which packages dominate Hermes bundle
* Measure production bundles - dev:false strips differently than Expo Go
* Expo Router lazy routes split heavy screens from the main TTI path
* Replace default imports with per-icon or per-function paths when treemap shows bloat
* Gate bundle size in CI - pair with Performance Budget Rules thresholds
* Lazy chunks still count toward TTI if loaded before primary interactive

## Recipe

> Quick-reference recipe card - copy-paste ready.

**1. Generate production bundle + source map**

```bash
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file node_modules/expo-router/entry.js \
  --bundle-output ./.perf/index.android.bundle \
  --sourcemap-output ./.perf/index.android.bundle.map \
  --assets-dest ./.perf/assets
```

**2. Open treemap**

```bash
npx react-native-bundle-visualizer \
  --bundle ./.perf/index.android.bundle \
  --sourcemap ./.perf/index.android.bundle.map
```

**3. Triage top offenders**

| Treemap block | Common fix |
| --- | --- |
| `moment` / `date-fns/locale/*` | `dayjs` or narrow imports |
| `lodash` full | `lodash/es/map` or native helpers |
| `@expo/vector-icons` entire set | Per-family import or subset font |
| `charting` / `maps` / `editor` SDKs | Lazy route + dynamic `import()` |
| Duplicate `react` / nested copies | Align monorepo `metro.config.js` |

**4. Lazy-load heavy Expo Router screens**

```tsx
// app/(tabs)/analytics.tsx - lazy tab screen
import { Suspense, lazy } from "react";
import { ActivityIndicator, View } from "react-native";
 
const AnalyticsScreen = lazy(() => import("../../src/screens/AnalyticsScreen"));
 
export default function AnalyticsRoute() {
  return (
    <Suspense
      fallback={
        <View style={{ flex: 1, justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      }
    >
      <AnalyticsScreen />
    </Suspense>
  );
}
```

**5. CI size gate (sketch)**

```bash
#!/usr/bin/env bash
# scripts/check-bundle-size.sh
BUNDLE="./.perf/index.android.bundle"
MAX_BYTES=4500000  # ~4.3 MB raw - adjust to your gzip budget
 
SIZE=$(wc -c < "$BUNDLE")
if [ "$SIZE" -gt "$MAX_BYTES" ]; then
  echo "Bundle $SIZE exceeds $MAX_BYTES"
  exit 1
fi
```

**When to reach for this:**

* TTI regressed after adding a dependency.
* OTA update download size spiked.
* PR adds `import` from a heavy SDK on the root layout path.
* You need evidence for an ADR exception to [Performance Budget Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/performance-budget-rules/).

## Working Example

Audit a bloated root import, split a heavy screen, and verify the treemap block moves out of the main path.

```tsx
// app/_layout.tsx - keep root lean
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../src/lib/queryClient";
 
export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
```

```tsx
// app/settings/reports.tsx - heavy screen NOT on TTI path
import { Suspense, lazy } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
 
const ReportsScreen = lazy(() =>
  import("../../src/screens/ReportsScreen").then((m) => ({ default: m.ReportsScreen })),
);
 
export default function ReportsRoute() {
  return (
    <Suspense fallback={<View style={styles.fallback}><ActivityIndicator /></View>}>
      <ReportsScreen />
    </Suspense>
  );
}
 
const styles = StyleSheet.create({
  fallback: { flex: 1, alignItems: "center", justifyContent: "center" },
});
```

```tsx
// src/screens/ReportsScreen.tsx - heavy deps isolated to lazy chunk
import { StyleSheet, Text, View } from "react-native";
// Example heavy dep - only loads when user opens Reports
import { VictoryPie } from "victory-native";
 
export function ReportsScreen() {
  const data = [
    { x: "A", y: 35 },
    { x: "B", y: 25 },
    { x: "C", y: 40 },
  ];
 
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Reports</Text>
      <VictoryPie data={data} width={280} height={280} />
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, alignItems: "center" },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
});
```

**Verification checklist**

1. Run visualizer **before** lazy split - note `victory-native` (or your SDK) area in main bundle.
2. Move screen behind `lazy()` - re-bundle; heavy block shrinks in main treemap.
3. Confirm **home tab TTI path** does not `import` the heavy module transitively through barrels.
4. Record main bundle bytes in release ticket - link to budget owner table.

## Import Hygiene

### Prefer narrow entry points

```tsx
// BAD - pulls entire library
import _ from "lodash";
import * as Icons from "@expo/vector-icons";
 
// BETTER
import debounce from "lodash/debounce";
import Ionicons from "@expo/vector-icons/Ionicons";
```

### Audit barrels

```tsx
// packages/ui/src/index.ts - re-exports everything
export * from "./charts"; // ← drags charts into any `from "@acme/ui"` import
 
// BETTER - explicit subpaths in package.json exports
// import { Button } from "@acme/ui/button";
```

### Metro monorepo resolution

Shared packages in monorepos duplicate dependencies easily - align `watchFolders` and `resolver` in `metro.config.js`. See [Shared Packages & Metro Resolution](https://docs.wahwei/reactnative.codeguides.io/project-setup/shared-packages-and-metro-resolution/).

## Expo Router Lazy Loading Notes

| Pattern | TTI impact |
| --- | --- |
| `lazy()` screen module | Chunk loads on first navigation - good for settings/reports |
| Tab `lazy: true` (default) | Defers first mount until tab focus - good for cold start |
| `Link prefetch` | Loads chunk early - use only for likely next screen |
| Root `_layout` imports | **Always** on critical path - keep minimal |

```tsx
// Prefetch heavy detail route when user hovers card - optional trade-off
import { Link } from "expo-router";
 
<Link href="/reports" prefetch>
  Open reports
</Link>
```

## Scope: What Counts Toward Budget

Per [Performance Budget Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/performance-budget-rules/):

* **Main Hermes bundle** at first open
* **Lazy chunks** loaded before primary interactive (accidental eager prefetch)
* **OTA artifact size** - separate gate, same analysis tooling

Assets (images, fonts) are separate but affect download - `expo-asset` bundled media appears in export output.

## Gotchas

* **Analyzing dev bundles** - `dev: true` includes dev tooling; always use `--dev false`.
* **Expo Go** - not your bundle graph; export from your app's entry.
* **Lazy without Suspense** - React 19 still needs a boundary for `lazy()` routes.
* **Transitive imports through hooks** - a hook imported in root layout pulls its dependency tree into main.

## FAQs

react-native-bundle-visualizer vs source-map-explorer?

Both map bytes to modules. `react-native-bundle-visualizer` is tuned for RN Metro output - start there. Use `source-map-explorer` if you already have web tooling in CI.

Does Hermes gzip match raw bundle bytes?

CI often gates **raw** or **gzip** - pick one and document it. Gzip ≈ 30–40% of raw for typical RN bundles; align with your 4 MB budget definition.

Can dynamic import() split any dependency?

Metro supports `import()` for async chunks. Native modules still **autolink** at build time - removing JS import does not remove native code unless you uninstall the package.

Do devDependencies affect bundle size?

No - only imports reachable from production entry count. They still affect install and CI time - see [Dead Code & Dependency Analysis](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/dead-code-and-dependency-analysis/).

How do fonts affect size?

Bundled `.ttf` files land in assets. Subset icon fonts and load display fonts after splash when possible - [Startup Time Optimization](https://docs.wahwei/reactnative.codeguides.io/performance/startup-time-optimization/).

Bundle shrank but TTI unchanged - why?

TTI includes native startup, bytecode load, and first-screen work - not JS bytes alone. Profile holistically with [Performance Basics](https://docs.wahwei/reactnative.codeguides.io/performance/performance-basics/).

## Related

* [Startup Time Optimization](https://docs.wahwei/reactnative.codeguides.io/performance/startup-time-optimization/) - bytecode load and deferral after split
* [Performance Basics](https://docs.wahwei/reactnative.codeguides.io/performance/performance-basics/) - bundle size as a TTI input
* [Performance Budget Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/performance-budget-rules/) - CI thresholds and owners
* [Route Groups & Organizing app](https://docs.wahwei/reactnative.codeguides.io/expo-router/route-groups-and-organizing-app/) - structure lazy boundaries
* [Tabs & Drawers](https://docs.wahwei/reactnative.codeguides.io/expo-router/tabs-and-drawers/) - `lazy` tab mounting
* [Dead Code & Dependency Analysis](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/dead-code-and-dependency-analysis/) - unused packages vs bundle bloat

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
