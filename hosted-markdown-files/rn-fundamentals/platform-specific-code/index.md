# Platform-Specific Code

`Platform.OS`, `Platform.select`, and `.ios`/`.android` file extensions.

Highlights / Platform-Specific Code

* Platform.OS returns ios, android, macos, windows, or web in Expo multi-target apps
* Platform.select picks values or functions per OS without splitting files
* .ios.tsx and .android.tsx let Metro bundle completely different implementations
* Prefer shared files until platform branches clutter readability
* Platform.Version gives numeric OS level for capability checks
* Expo Constants exposes device and runtime facts beyond Platform alone

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import { Platform, StyleSheet, Text, View } from "react-native";
 
const HEADER_HEIGHT = Platform.select({ ios: 44, android: 56, default: 48 });
 
export function ScreenHeader({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  header: {
    height: HEADER_HEIGHT,
    paddingTop: Platform.OS === "ios" ? 4 : 0,
    backgroundColor: Platform.select({ ios: "#f8f8f8", android: "#6200ee" }),
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: Platform.select({ ios: "600", android: "500" }),
    color: Platform.OS === "android" ? "#fff" : "#000",
  },
});
```

**When to reach for this:** Small styling or constant differences between iOS and Android in a single shared component file.

## Working Example

```tsx
// AppButton.tsx - shared entry; Metro resolves platform files automatically
import { AppButton } from "./components/AppButton";
 
export default function CheckoutScreen() {
  return (
    <AppButton
      label="Pay now"
      onPress={() => console.log("checkout")}
    />
  );
}
```

```tsx
// components/AppButton.tsx - shared API, re-exports platform implementation
export { AppButton } from "./AppButton.native";
export type { AppButtonProps } from "./AppButton.types";
```

```tsx
// components/AppButton.types.ts
export interface AppButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}
```

```tsx
// components/AppButton.native.tsx - fallback for non-split platforms
import { Platform } from "react-native";
import { AppButtonIos } from "./AppButton.ios";
import { AppButtonAndroid } from "./AppButton.android";
 
export function AppButton(props: import("./AppButton.types").AppButtonProps) {
  return Platform.OS === "android" ? (
    <AppButtonAndroid {...props} />
  ) : (
    <AppButtonIos {...props} />
  );
}
```

```tsx
// components/AppButton.ios.tsx
import { Pressable, StyleSheet, Text } from "react-native";
import type { AppButtonProps } from "./AppButton.types";
 
export function AppButtonIos({ label, onPress, disabled }: AppButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}
 
const styles = StyleSheet.create({
  button: {
    backgroundColor: "#007aff",
    borderRadius: 10,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  label: { color: "#fff", fontSize: 17, fontWeight: "600" },
});
```

```tsx
// components/AppButton.android.tsx
import { Pressable, StyleSheet, Text } from "react-native";
import type { AppButtonProps } from "./AppButton.types";
 
export function AppButtonAndroid({ label, onPress, disabled }: AppButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      android_ripple={{ color: "rgba(255,255,255,0.3)" }}
      style={[styles.button, disabled && styles.disabled]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}
 
const styles = StyleSheet.create({
  button: {
    backgroundColor: "#6750a4",
    borderRadius: 4,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    elevation: 2,
  },
  disabled: { opacity: 0.4 },
  label: { color: "#fff", fontSize: 15, fontWeight: "500", textTransform: "uppercase" },
});
```

```tsx
// utils/share.ts - shared module with Platform.select for behavior
import { Platform, Share } from "react-native";
 
export async function shareUrl(url: string, message: string) {
  if (Platform.OS === "web") {
    if (navigator.share) {
      await navigator.share({ title: message, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    return;
  }
 
  await Share.share(
    Platform.select({
      ios: { url, message },
      android: { message: `${message}\n${url}` },
      default: { message: `${message} ${url}` },
    })!
  );
}
```

**What this demonstrates:**

* `Platform.select` for constants and `Share.share` payload differences in one file
* `.ios.tsx` / `.android.tsx` files for materially different button chrome
* Shared `AppButton.types.ts` keeping a single public props contract
* Metro resolution order: `.ios.js` / `.android.js` / `.native.js` / `.js`
* `Platform.OS === "web"` branch for Expo web targets without a separate web file

## Deep Dive

### How It Works

* Metro bundler picks **one file per import** at build time using platform extensions.
* Resolution order (simplified): `.ios.tsx` → `.native.tsx` → `.tsx` (on iOS sim/device).
* `Platform.OS` is a **runtime string** read on the JS thread - safe inside render and handlers.
* `Platform.select` returns the matching platform key or `default` - can return objects, numbers, or functions.
* File splitting removes dead code from each binary - Android builds never ship the `.ios.tsx` module.
* For behavior that depends on OS **version**, combine `Platform.Version` with feature detection.

### Metro Resolution Order

| Import | iOS bundle loads | Android bundle loads |
| --- | --- | --- |
| `./Foo` | `Foo.ios.tsx` → `Foo.native.tsx` → `Foo.tsx` | `Foo.android.tsx` → `Foo.native.tsx` → `Foo.tsx` |
| `./Foo.ios` | Explicit iOS file only | N/A unless imported |

* `.native.tsx` runs on iOS **and** Android but not web when a `.web.tsx` sibling exists.
* `.web.tsx` is chosen for Expo web exports.

### Platform.select vs Branching

```tsx
// Object form - pick a value
const font = Platform.select({ ios: "System", android: "Roboto", default: "sans-serif" });
 
// Function form - lazy per platform
const createStyles = Platform.select({
  ios: () => StyleSheet.create({ card: { shadowOpacity: 0.2 } }),
  android: () => StyleSheet.create({ card: { elevation: 4 } }),
});
 
// Inline ternary - fine for one-off props
paddingTop: Platform.OS === "ios" ? 8 : 0,
```

| Approach | Best for | Avoid when |
| --- | --- | --- |
| `Platform.select` in StyleSheet | Colors, heights, font weights | Entire components differ |
| `Platform.OS` if/else | Conditional logic, early returns | Many duplicated JSX blocks |
| `.ios` / `.android` files | Large UI or native module wrappers | One-line color tweak |
| `*.web.tsx` | Expo web-specific DOM APIs | Mobile-only apps with no web target |

### Platform.Version & Capabilities

```tsx
import { Platform } from "react-native";
 
const iosVersion =
  Platform.OS === "ios" ? parseInt(String(Platform.Version), 10) : 0;
 
const androidApi =
  Platform.OS === "android" ? Platform.Version : 0;
 
const supportsBlur = iosVersion >= 13 || androidApi >= 31;
```

* `Platform.Version` on iOS is a string like `"17.0"` - parse before numeric compare.
* On Android it is the **API level** integer (e.g., `34`).
* Prefer capability checks over version gates when possible (feature detection).

### TypeScript Notes

```tsx
import { Platform, type PlatformOSType } from "react-native";
 
type MobileOS = Extract<PlatformOSType, "ios" | "android">;
 
function isMobile(os: PlatformOSType): os is MobileOS {
  return os === "ios" || os === "android";
}
 
// Platform.select return may be undefined - provide default
const height = Platform.select({ ios: 44, android: 56 }) ?? 48;
 
// Share platform-specific modules with identical exports
export type { AppButtonProps } from "./AppButton.types";
```

* `PlatformOSType` includes `"web"` in Expo - narrow before using mobile-only APIs.
* `Platform.select` without `default` can return `undefined` - use `??` fallback.
* Keep shared prop types in a neutral `.types.ts` file imported by all platform variants.

## Gotchas

* **Splitting files too early** - Three one-line color differences do not need `.ios` and `.android` files. **Fix:** Use `Platform.select` until JSX diverges materially.
* **Importing `.ios` files directly** - `import X from "./Foo.ios"` breaks Android bundles or ships the wrong module. **Fix:** Import `./Foo` and let Metro resolve.
* **Forgetting `default` in Platform.select** - Web or `macos` targets get `undefined`. **Fix:** Always add `default` for Expo multi-platform apps.
* **Platform checks in shared styles outside create** - Calling `Platform.select` once at module scope is fine; dynamic per-theme values belong inside hooks.
* **Duplicated business logic across platform files** - Copy-paste drifts over time. **Fix:** Share logic in `utils/*.ts`; split only the view/native boundary.
* **Assuming Android === Material, iOS === Human Interface** - Users expect brand consistency. **Fix:** Unify spacing and semantics; vary chrome only where OS conventions demand it.
* **Comparing Platform.Version as string on iOS** - `"17" < "9"` lexicographically fails. **Fix:** `parseInt(String(Platform.Version), 10)` before numeric compare.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `Platform.select` | Small style/constant deltas | Whole components differ |
| `.ios` / `.android` files | Large UI or native imports per OS | Single color or height tweak |
| `expo-device` / `Constants` | Device model, isTablet, runtimeVersion | Simple OS enum suffices |
| Conditional native modules | Feature requires TurboModule only on one OS | JS-only styling difference |
| Universal design | Brand mandates pixel parity | OS HIG materially affects UX (share sheets) |
| `react-native-unistyles` breakpoints | Theme tokens per platform in design system | One-off header height |

## FAQs

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

## Related

* [Views, Text & Core Components](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/views-text-and-core-components/) - shadow vs elevation styling per OS
* [Event Handling & Touchables](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/event-handling-and-touchables/) - ripple on Android, opacity on iOS
* [Dimensions & Responsive Layout](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/dimensions-and-responsive-layout/) - tablet vs phone beyond OS enum
* [Images & Assets](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/images-and-assets/) - density buckets differ slightly by platform
* [The Bridge, JSI & New Architecture](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/the-bridge-jsi-and-new-architecture/) - native module boundaries per OS
* [React Native Basics](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/react-native-basics/) - Expo project layout for multi-target apps

### External Related Links

* [reactnative.dev](https://reactnative.dev/) - official React Native site
* [reactnative.dev/docs](https://reactnative.dev/docs/getting-started) - full RN documentation
* [Apple Developer](https://developer.apple.com/) - Apple platform docs (native details)

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
