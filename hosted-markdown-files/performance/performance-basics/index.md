# Performance Basics

TTI, FPS, and memory budgets defined per app tier - the vocabulary every React Native team needs before profiling tools, CI gates, or release sign-off.

Highlights / Performance Basics

* TTI is cold start until the primary screen is interactive - not splash dismissal alone
* 60 fps is the target; sustained 55 fps on lists is the audit floor on mid-tier Android
* JS FPS and UI FPS are separate - JS at 0 means taps queue until the thread clears
* Memory budgets are session ceilings - measure after 10 minutes on a reference device
* Measure on mid-tier Android - iPhone Pro hides jank and memory pressure
* Publish written budgets with owners before feature freeze - see Performance Budget Rules

## Prerequisites

Every example below uses built-in React Native APIs and patterns that work on **Expo SDK 57** release builds. Scaffold a standard TypeScript app to try the instrumentation snippets.

```bash
npx create-expo-app@latest MyPerfApp --template blank-typescript
cd MyPerfApp
npx expo start
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**.

---

## Basic Examples

### 1. Define TTI for Your App

**Time to Interactive (TTI)** is the moment users can complete the primary action on your main screen - not when the splash hides, not when the first pixel paints.

```tsx
// src/perf/tti.ts - team-defined contract
export type TtiMilestone =
  | "app_launch" // process start / JS entry
  | "root_layout_mounted"
  | "primary_tab_layout"
  | "primary_data_ready"
  | "primary_interactive";
 
/**
 * Consumer feed app: cold start → home feed scrollable + pull-to-refresh works.
 * B2B form app: cold start → first input focused and keyboard-ready.
 * Document YOUR primary tab and gate in docs/performance-budgets.md.
 */
export const TTI_CONTRACT = {
  start: "app_launch" as const,
  end: "primary_interactive" as const,
  referenceDevice: "Pixel 6a class Android",
  budgetMs: 2500,
};
```

* TTI must be **defined per app** - "fast" without a definition is not measurable
* Exclude **dev client** and **Fast Refresh** timings from production budgets
* Pair TTI with a **reference device** - simulators and flagship phones lie
* See [Performance Budget Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/performance-budget-rules/) for owner tables and CI gates

> **Related:** [Startup Time Optimization](https://docs.wahwei/reactnative.codeguides.io/performance/startup-time-optimization/) - deferring work that blocks TTI

---

### 2. Mark TTI with performance.now()

Instrument launch in root layout and mark interactive when the primary screen passes its data gate.

```tsx
// app/_layout.tsx
import { useEffect, useRef } from "react";
import { Slot } from "expo-router";
 
const t0 = globalThis.performance?.now?.() ?? Date.now();
 
export default function RootLayout() {
  const reported = useRef(false);
 
  useEffect(() => {
    if (reported.current) return;
    reported.current = true;
    const rootMounted = globalThis.performance?.now?.() ?? Date.now();
    console.info("[perf] root_layout_mounted_ms", Math.round(rootMounted - t0));
  }, []);
 
  return <Slot />;
}
```

```tsx
// app/(tabs)/index.tsx - primary tab marks interactive
import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
 
export default function HomeScreen() {
  const interactive = useRef(false);
 
  useEffect(() => {
    if (interactive.current) return;
    interactive.current = true;
    // In production: analytics.track("tti_primary_interactive", { ms: ... })
    console.info("[perf] primary_interactive");
  }, []);
 
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Home</Text>
      <Pressable style={styles.cta}>
        <Text style={styles.ctaText}>Primary action</Text>
      </Pressable>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  cta: { backgroundColor: "#2563eb", padding: 14, borderRadius: 10, alignItems: "center" },
  ctaText: { color: "#fff", fontWeight: "600" },
});
```

* Start the clock at **JS entry** or first root `useEffect` - be consistent across releases
* End when **primary CTA is enabled** and list data (if any) is rendered - not skeleton-only
* Log to analytics in production; `console.info` is for local verification only

---

### 3. Understand JS FPS vs UI FPS

React Native runs two animation/render pipelines. Confusing them sends you optimizing the wrong thread.

| Metric | Thread | What it measures |
| --- | --- | --- |
| **JS FPS** | JavaScript (Hermes) | React render, business logic, fetch parsing |
| **UI FPS** | Native (main) | Layout, compositing, gestures, native animations |

```tsx
// Dev only - shake device → "Show Perf Monitor" in dev menu
// Watch both counters while scrolling a heavy FlatList
import { FlatList, StyleSheet, Text, View } from "react-native";
 
const ROWS = Array.from({ length: 500 }, (_, i) => ({ id: String(i), title: `Row ${i}` }));
 
export default function FpsDemo() {
  return (
    <FlatList
      data={ROWS}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text>{item.title}</Text>
        </View>
      )}
    />
  );
}
 
const styles = StyleSheet.create({
  row: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#e2e8f0" },
});
```

* **JS FPS at 0** - taps and navigation queue; the app feels frozen even if UI FPS looks fine
* **UI FPS drops** - layout thrash, heavy shadows, or native animation cost
* Scroll jank on feeds is often **both** - fix list hygiene first, then native visuals

> **Related:** [Lists & Scrolling basics](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/lists-basics/) - virtualization before FPS tuning

---

### 4. Set a Frame-Rate Budget

Target **60 fps** (16.7 ms per frame). For release audits on mid-tier Android, **≥ 55 fps sustained** on the primary list is a practical floor.

```tsx
// scripts/perf/frame-budget.ts - documentation constant for the team
export const FRAME_BUDGET = {
  targetFps: 60,
  frameBudgetMs: 1000 / 60, // ~16.7
  auditFloorFps: 55,
  primaryScenarios: [
    "home_feed_fast_fling",
    "tab_switch_animation",
    "modal_open_close",
    "pull_to_refresh",
  ],
} as const;
```

* Measure **sustained** scroll, not a two-second demo - momentum flings expose blank rows and JS spikes
* Tab transitions and modal open/close belong in the audit - navigation re-renders are a common regression
* FPS audits stay **manual or RUM** - CI rarely measures frames reliably

---

### 5. Define Memory Budgets by App Tier

Memory is a **session ceiling**, not a launch snapshot. Measure after realistic usage - 10 minutes browsing feeds, opening settings, returning from background.

| App tier | Example | Starter RAM ceiling (reference Android) |
| --- | --- | --- |
| **Light** | Settings, simple forms | ≤ 200 MB |
| **Standard** | Social feed, e-commerce | ≤ 350 MB |
| **Heavy** | Maps, media, offline packs | ≤ 500 MB with ADR |

```tsx
// src/perf/memory-budget.ts
export const MEMORY_BUDGET = {
  tier: "standard" as const,
  ceilingMb: 350,
  soakMinutes: 10,
  scenarios: ["scroll_home", "open_profile", "background_2min", "return_and_scroll"],
};
```

* **Leaks show up late** - a 120 MB launch can climb to 400 MB after list churn and uncleared listeners
* iOS and Android report memory differently - pick one **reference Android** for regression tracking
* Heavy tiers need an **ADR exception** linked from [Performance Budget Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/performance-budget-rules/)

> **Related:** [Memory Leaks & List Churn](https://docs.wahwei/reactnative.codeguides.io/performance/memory-leaks-and-list-churn/) - patterns that blow session ceilings

---

### 6. Bundle Size as a Performance Metric

Larger Hermes bundles increase **parse/bytecode load time** and **heap pressure**. Treat main-bundle MB as part of TTI, not a separate concern.

```bash
# Export production bundle for size check (adjust entry for your app)
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file node_modules/expo-router/entry.js \
  --bundle-output /tmp/index.android.bundle \
  --assets-dest /tmp/assets
 
ls -lh /tmp/index.android.bundle
```

* Starter consumer target: **≤ 4 MB gzipped** main bundle at TTI - adjust per category
* Count **lazy chunks loaded before interactive** toward first-open budget
* See [Bundle Size Analysis](https://docs.wahwei/reactnative.codeguides.io/performance/bundle-size-analysis/) for Metro visualizer workflow

---

### 7. The Two-Thread Mental Model

Every tap crosses threads. Knowing the path prevents "we memoized everything but it's still slow."

```
User tap
  → Native gesture (UI thread)
  → Bridge / JSI event to JS thread
  → React render + your handlers (Hermes)
  → Reconciliation commit to native (Fabric)
  → Layout + paint (UI thread)
```

```tsx
import { Pressable, StyleSheet, Text } from "react-native";
 
export function SlowButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      style={styles.btn}
      onPress={() => {
        // Runs on JS thread - blocks other JS work until finished
        let sum = 0;
        for (let i = 0; i < 2_000_000; i++) sum += i;
        onPress();
      }}
    >
      <Text style={styles.label}>Tap me</Text>
    </Pressable>
  );
}
 
const styles = StyleSheet.create({
  btn: { padding: 14, backgroundColor: "#2563eb", borderRadius: 8 },
  label: { color: "#fff", fontWeight: "600" },
});
```

* Long synchronous JS on press **drops JS FPS to 0** - defer with `InteractionManager` or native modules
* Reanimated worklets move per-frame work off the JS thread - see Animations section
* Fabric reduces bridge overhead but **does not** remove JS render cost

---

## Intermediate Examples

### 8. Defer Non-Critical Work After TTI

`InteractionManager` queues tasks until animations and transitions finish - the first lever for startup without rewriting features.

```tsx
import { useEffect, useState } from "react";
import { InteractionManager, StyleSheet, Text, View } from "react-native";
 
export default function HomeWithDeferredInit() {
  const [ready, setReady] = useState(false);
 
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      // Analytics init, feature flags, non-critical prefetch
      setReady(true);
    });
    return () => task.cancel();
  }, []);
 
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.meta}>{ready ? "Telemetry on" : "Core UI only"}</Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: "700" },
  meta: { marginTop: 8, color: "#64748b" },
});
```

* Run **fonts, analytics, remote config, and heavy migrations** after first interactive frame when possible
* Cancel the task on unmount - navigation away during startup should not fire deferred work
* Pair with [Startup Time Optimization](https://docs.wahwei/reactnative.codeguides.io/performance/startup-time-optimization/) for splash and bytecode strategy

---

### 9. Measure a Simple Scroll Scenario

Before advanced tools, reproduce a **fixed audit script** on a reference device every release.

```markdown
## Weekly scroll audit (5 minutes)
 
1. Cold start app on Pixel 6a (or team reference device).
2. Open primary feed tab.
3. Fast fling scroll for 15 seconds.
4. Record: UI FPS min, JS FPS min, any blank rows.
5. Open/close modal on feed - note parent re-render spikes in DevTools.
6. Compare to last RC - regressions > 10% trigger investigation.
```

* Same device, same build type (**release**), same network - variance destroys trust
* Blank rows during fling are **list height bugs**, not mysterious "React slowness"
* Escalate to [Flashlight Benchmarking](https://docs.wahwei/reactnative.codeguides.io/performance/flashlight-benchmarking/) when you need scored comparisons across devices

---

### 10. Publish Budgets with Named Owners

Anonymous budgets are ignored in crunch week. Copy the starter table into `docs/performance-budgets.md` and assign humans.

| Metric | Threshold (starter) | Owner role |
| --- | --- | --- |
| Main JS bundle (Hermes) | ≤ 4 MB gzipped | Mobile platform lead |
| Cold start TTI (primary tab) | ≤ 2.5 s on reference Android | Feature squad lead |
| Scroll FPS (primary list) | ≥ 55 fps sustained | UI performance champ |
| Memory after 10 min session | ≤ 350 MB on reference Android | Mobile on-call |

```tsx
// src/perf/budgets.ts - import constants in CI scripts and docs
export const PERF_BUDGETS = {
  bundleGzipMb: 4,
  ttiMs: 2500,
  scrollFpsFloor: 55,
  memoryCeilingMb: 350,
} as const;
```

* **Tier 1** at kickoff, **Tier 2** in CI for bundle size, **Tier 3** manual device audit before store submit
* Link regressions to rollback policy in [Performance Budget Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/performance-budget-rules/)
* [Performance Best Practices](https://docs.wahwei/reactnative.codeguides.io/performance/best-practices/) condenses the full section into 25 rules

---

## FAQs

What is a reasonable TTI budget for Expo SDK 57?

Many consumer apps target **≤ 2.5 s** cold start to primary-tab interactive on mid-tier Android. Heavy apps (maps, offline media) need higher ceilings with ADR justification - measure your baseline first.

Why measure on mid-tier Android instead of my iPhone?

Low-end and mid-tier Android exposes jank, slow storage, and memory pressure that flagship iPhones hide. If it passes on reference Android, iOS is usually fine; the reverse is false.

Does Expo Go reflect production performance?

No - Expo Go ships a generic native shell and different module graph. Profile **release builds** (EAS `preview` or `production`) for TTI, bundle size, and memory.

Is 60 fps always required?

60 fps is the ideal. For audits, **55 fps sustained** on the primary list is a practical release floor. Brief dips during image decode are acceptable; sustained JS FPS at 0 is not.

How does Hermes affect these metrics?

Hermes improves startup via **bytecode** and reduces parse cost versus JSC. It does not remove React render work or list churn - you still defer heavy JS and virtualize feeds.

Where do I start if the app feels slow?

1. Define TTI and reproduce on reference Android (release build).
2. Fix list virtualization and re-render hygiene on the primary feed.
3. Profile with [React DevTools Profiler](https://docs.wahwei/reactnative.codeguides.io/performance/react-devtools-profiler/) before random `memo`.

## Related

* [React DevTools Profiler](https://docs.wahwei/reactnative.codeguides.io/performance/react-devtools-profiler/) - finding avoidable re-renders on navigation
* [Bundle Size Analysis](https://docs.wahwei/reactnative.codeguides.io/performance/bundle-size-analysis/) - Metro visualizer and lazy routes
* [Startup Time Optimization](https://docs.wahwei/reactnative.codeguides.io/performance/startup-time-optimization/) - splash, deferral, and Hermes bytecode
* [Performance Budget Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/performance-budget-rules/) - CI gates and owner tables
* [Lists Basics](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/lists-basics/) - ScrollView vs FlatList decision threshold
* [Hermes & the JS Runtime](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/hermes-and-the-js-runtime/) - bytecode and TTI on Hermes

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4). pbqrthvqrf.vb|ptvb928|202607

Reviewed by Chris St. John·Last updated Jul 19, 2026
