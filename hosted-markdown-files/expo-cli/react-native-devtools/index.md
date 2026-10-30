# React Native DevTools

React Native DevTools is the **built-in debugger** for Expo SDK 57 / React Native 0.86 - a Chrome DevTools–based desktop app wired to Hermes on your running app. Use it for the element inspector, breakpoints, network traces, performance recordings, and (new in 0.86) **light/dark appearance emulation** without flipping device settings.

Highlights / React Native DevTools

* Press `j` in Metro or choose Open DevTools from the in-app dev menu
* React Components panel is the element inspector - select on device, edit props live
* Performance and Network panels ship in RN 0.83+; Expo apps may still show Expo Network for some requests
* RN 0.86 adds light/dark emulation via the DevTools Command Palette - no device settings change
* Hermes is required - remote Chrome debugging via chrome://inspect is unsupported
* DevTools launches as a bundled desktop app on macOS; browser fallback exists behind corporate firewalls

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
# Start Metro, then attach DevTools to the running app
npx expo start
# Press j in the terminal - or shake device → Open DevTools
```

```tsx
// Drop into App.tsx - gives the Components panel something to inspect
import { useColorScheme, Pressable, StyleSheet, Text, View } from "react-native";
 
export default function App() {
  const scheme = useColorScheme() ?? "light";
  const theme = scheme === "dark" ? styles.dark : styles.light;
 
  return (
    <View style={[styles.screen, theme.screen]}>
      <Text style={[styles.title, theme.text]} accessibilityRole="header">
        DevTools probe
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increment counter"
        style={[styles.button, theme.button]}
        onPress={() => console.log("pressed", Date.now())}
      >
        <Text style={theme.text}>Tap me - watch Console</Text>
      </Pressable>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, padding: 24 },
  title: { fontSize: 22, fontWeight: "700" },
  button: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  light: { screen: { backgroundColor: "#f8fafc" }, text: { color: "#0f172a" }, button: { backgroundColor: "#e2e8f0" } },
  dark: { screen: { backgroundColor: "#0f172a" }, text: { color: "#f8fafc" }, button: { backgroundColor: "#334155" } },
});
```

**When to reach for this:**

* You need to **inspect the React tree**, highlight elements on device, or tweak props at runtime.
* Breakpoints and `console.log` output must reflect **Hermes** execution - not a detached Chrome tab.
* You are profiling **JS commits, network calls, or React render work** during navigation or scroll.
* You want to verify **dark mode** behavior with RN 0.86's DevTools appearance emulation.
* Flipper tutorials no longer match your SDK 57 stack - DevTools is the supported path.

## Working Example

```tsx
// screens/DevToolsLab.tsx - mount from App.tsx to exercise inspector + performance APIs
 
import { useEffect, useState } from "react";
import { useColorScheme, Button, StyleSheet, Text, View } from "react-native";
 
export default function DevToolsLab() {
  const scheme = useColorScheme() ?? "light";
  const [count, setCount] = useState(0);
 
  useEffect(() => {
    performance.mark("devtools-lab-mounted");
    return () => {
      performance.clearMarks("devtools-lab-mounted");
    };
  }, []);
 
  const bump = () => {
    performance.mark("bump-start");
    setCount((c) => c + 1);
    performance.mark("bump-end");
    performance.measure("bump", "bump-start", "bump-end");
    console.log("count", count + 1, "scheme", scheme);
  };
 
  return (
    <View style={[styles.root, scheme === "dark" && styles.rootDark]}>
      <Text style={styles.heading}>DevTools lab</Text>
      <Text style={styles.meta}>Active scheme: {scheme}</Text>
      <Text style={styles.meta}>Counter: {count}</Text>
      <Button title="Increment" onPress={bump} />
      <Text style={styles.hint}>
        Open DevTools (Metro `j`) → Components to select this tree; Performance to record a trace;
        Command Palette (⌘/Ctrl+Shift+P) → emulate light/dark on RN 0.86+.
      </Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, gap: 10, backgroundColor: "#ffffff" },
  rootDark: { backgroundColor: "#0f172a" },
  heading: { fontSize: 20, fontWeight: "700", color: "#0f172a" },
  meta: { fontSize: 15, color: "#475569" },
  hint: { marginTop: 16, fontSize: 13, lineHeight: 20, color: "#64748b" },
});
```

**What this demonstrates:**

* A **function component with `useState`** - Fast Refresh preserves counter state while you edit styles.
* **`useColorScheme`** - re-renders when RN 0.86 DevTools emulates light/dark via `Emulation.setEmulatedMedia`.
* **`performance.mark` / `performance.measure`** - entries appear in the Performance panel (RN 0.83+).
* **`console.log`** - routes to the DevTools Console when attached.

## Deep Dive

### How It Works

* Metro serves your JS bundle; the app opens a **Chrome DevTools Protocol (CDP)** socket to the packager.
* Pressing **`j`** (or **Open DevTools** in the dev menu) launches the **React Native DevTools desktop app**, which attaches over CDP to the Hermes runtime on the selected device/simulator.
* DevTools is **Hermes-only** - it replaced Flipper's JS debugger, the experimental debugger, and remote Chrome debugging (removed in RN 0.79).
* Since RN 0.85, **multiple CDP clients** can connect simultaneously (DevTools + VS Code extensions + other tooling) without kicking each other off.
* DevTools is **disabled in release builds** - same as LogBox and the dev menu.

### Opening DevTools

| Entry point | Action |
| --- | --- |
| Metro terminal | Press **`j`** while `npx expo start` is focused |
| In-app dev menu | Shake device or **Ctrl+Cmd+Z** (iOS sim) / **Cmd+M** (Android emu) → **Open DevTools** |
| Reconnect | If disconnected (rebuild, crash, unplug), use the reconnect dialog instead of guessing |

### Panels at a Glance

| Panel | Purpose | Notes |
| --- | --- | --- |
| **Console** | Logs, `console.table`, live expressions | Prefer over LogBox when DevTools is open |
| **Sources** | Breakpoints, stepping, `debugger;` statements | `debugger;` hits immediately via Fast Refresh |
| **Components** | Element inspector, prop/state editing, highlight updates | React DevTools integrated - select element on device |
| **Profiler** | React commit timings, flame graph | Pair with highlight-updates setting |
| **Network** | `fetch`, XHR, `<Image>` requests (RN 0.83+) | Initiator tab shows call site |
| **Performance** | JS + React tracks + network timeline (RN 0.83+) | Record while reproducing jank |
| **Memory** | Heap snapshots, allocation timelines | Hunt retained navigation state |

### Element Inspector (Components Panel)

1. Open DevTools → **Components**.
2. Click **Select element** (top-left), then tap a view on the device - DevTools focuses the matching fiber.
3. Edit **props** or **hooks state** in the right drawer to probe UI without recompiling.
4. Enable **Highlight updates when components render** (⚙︎) to spot avoidable re-renders.

React Compiler–optimized components show a **Memo ✨** badge in the tree.

### Performance & Network (RN 0.83+)

* **Network** captures automatically while DevTools is open. Response previews buffer up to **100 MB** on device (oldest evicted first).
* **Performance** merges JavaScript execution, **React Performance tracks**, network events, and custom **User Timings** (`performance.mark`).
* **Not yet in core RN Network panel:** WebSocket events, throttling, response mocking.

**Expo caveat:** SDK 57 projects may still surface an **Expo Network** panel for requests outside `fetch` / XHR / `<Image>` (for example some Expo Fetch paths). It lacks initiator integration and Performance-panel linkage - prefer the core Network panel when your calls are covered.

### Light/Dark Emulation (RN 0.86)

RN 0.86 adds **appearance emulation** without changing the device OS theme:

1. Open DevTools Command Palette - **⌘+Shift+P** (macOS) or **Ctrl+Shift+P** (Windows/Linux).
2. Run the **light/dark emulation** command (`Emulation.setEmulatedMedia`).
3. Watch `useColorScheme()` and themed styles update on device.

The override is **temporary** - it resets when DevTools disconnects. For persistent in-app theme testing, use `Appearance.setColorScheme()` in dev builds (see [Dark Mode & Color Schemes](https://docs.wahwei/reactnative.codeguides.io/styling-layout/dark-mode-and-color-schemes/)).

### TypeScript Notes

```tsx
// debugger; is valid in .tsx sources - DevTools breaks on the live Hermes bundle
export function debugBreakpoint(value: unknown) {
  if (__DEV__) {
    // eslint-disable-next-line no-debugger
    debugger;
    console.log("debugBreakpoint", value);
  }
}
```

## Gotchas

* **Using `chrome://inspect` for RN 0.86** - Remote Chrome debugging was removed; the session does not reflect Hermes bytecode. **Fix:** Press `j` or use the dev menu **Open DevTools**.
* **Expecting DevTools in production** - Debug tooling is compiled out of release builds. **Fix:** Reproduce on a development build or `__DEV__` simulator binary.
* **Breakpoints never hit after a native rebuild** - The CDP session dies when you reinstall the app. **Fix:** Use the reconnect dialog or press `j` again.
* **Inspector shows stale props** - You edited state in DevTools but Fast Refresh remounted the tree. **Fix:** Re-select the element; prefer prop edits for quick probes, code edits for lasting changes.
* **Network panel empty for custom clients** - Only `fetch`, `XMLHttpRequest`, and `<Image>` are instrumented today. **Fix:** Check Expo Network for uncovered stacks, or log at the networking layer until library support lands.
* **Light/dark emulation "does nothing"** - The screen ignores `useColorScheme` and hardcodes colors. **Fix:** Branch styles from scheme tokens; emulation drives the same API as the OS toggle.
* **DevTools desktop app blocked by firewall** - Corporate networks may block the notarized binary download. **Fix:** Allow the download or fall back to the browser launch flow RN provides.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| **React Native DevTools** (default) | JS debugging, React tree, Hermes breakpoints | Inspecting native C++/Kotlin/Swift module internals |
| **In-app Perf Monitor** (dev menu) | Quick JS/UI FPS overlay on device | Fine-grained JS flame graphs or network initiators |
| **LogBox + Metro terminal** | Fast printf debugging without opening DevTools | Setting breakpoints or editing props interactively |
| **Xcode / Android Studio** | Native crashes, layout inspectors, platform logs | Everyday React component work |
| **Expo Network panel** | Expo-specific request sources not in core Network | You need initiator stacks or Performance integration |

## FAQs

How do I open React Native DevTools with Expo SDK 57?

Run `npx expo start`, launch your app on a simulator or device, then press **`j`** in the Metro terminal. Alternatively, open the in-app dev menu and choose **Open DevTools**.

Does React Native DevTools work with Hermes?

Yes - Hermes is required. DevTools speaks the Hermes debugger protocol over CDP. It is the supported replacement for Flipper's JS debugger and remote Chrome debugging.

Where is the element inspector?

It lives in the **Components** panel (integrated React DevTools). Use **Select element**, tap a view on the device, and inspect props, hooks, and owners in the right drawer.

How do I test dark mode without changing device settings?

On **RN 0.86+**, open the DevTools Command Palette (**⌘/Ctrl+Shift+P**) and run the light/dark emulation command. Components using `useColorScheme()` re-render accordingly until DevTools disconnects.

Why do I still see an Expo Network panel?

Expo may log additional networking stacks (beyond core `fetch` / XHR / `<Image>`) in its own panel. Use it when requests are missing from the core Network tab; prefer the core panel when coverage overlaps for initiator and Performance integration.

Can I use `debugger;` instead of clicking breakpoints?

Yes. Insert `debugger;` in a `__DEV__` branch, save the file, and Fast Refresh delivers the statement to the device while DevTools is open - execution pauses immediately.

What keyboard shortcut opens the dev menu on simulators?

* **iOS Simulator:** Ctrl+Cmd+Z (or Device → Shake)
* **Android emulator:** Cmd+M (macOS) or Ctrl+M (Windows/Linux)

Does DevTools work with expo-dev-client?

Yes - development builds expose the same dev menu and CDP endpoint as Expo Go. Start with `npx expo start --dev-client` and press `j` once the client connects to Metro.

Why did DevTools disconnect?

Common causes: app closed, native rebuild installed, Metro stopped, physical device unplugged, or a JS crash. Use **Reconnect DevTools** in the dialog rather than leaving a stale session open.

How do I profile navigation jank?

Open the **Performance** panel, start recording, navigate between screens, stop recording. Inspect React Performance tracks, long tasks, and network waterfalls in one timeline.

Are WebSocket messages visible in Network?

Not yet - WebSocket capture is on the unimplemented list for core React Native DevTools. Log at the socket layer or use native proxies until support ships.

Can multiple tools attach at once?

Since RN 0.85, multiple CDP connections are supported. DevTools, some VS Code extensions, and other clients can coexist - earlier versions would drop the previous session.

Gotcha: LogBox disappeared when DevTools opened - is that a bug?

When DevTools is attached, non-fatal LogBox toasts are suppressed so the **Console** panel stays authoritative. Fatal syntax errors still block the app until fixed.

Does the desktop app require Chrome installed?

RN 0.83+ ships a bundled desktop binary (notarized on macOS). If download fails (firewall), RN falls back to launching in an installed Chrome/Edge browser.

## Related

* [Local Development Basics](https://docs.wahwei/reactnative.codeguides.io/expo-cli/local-development-basics/) - Metro shortcuts including `j` and cache clearing
* [Flipper & Alternative Debuggers](https://docs.wahwei/reactnative.codeguides.io/expo-cli/flipper-and-alternative-debuggers/) - when native IDE tools beat JS DevTools
* [Hot Reload vs Fast Refresh](https://docs.wahwei/reactnative.codeguides.io/expo-cli/hot-reload-vs-fast-refresh/) - why `debugger;` and breakpoints interact with Fast Refresh
* [Hermes & the JS Runtime](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/hermes-and-the-js-runtime/) - engine behavior behind the debugger
* [Dark Mode & Color Schemes](https://docs.wahwei/reactnative.codeguides.io/styling-layout/dark-mode-and-color-schemes/) - real theme tokens beyond DevTools emulation

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

3730363230327c3739386f6967637c6f692e73656469756765646f63

Reviewed by Chris St. John·Last updated Jul 19, 2026
