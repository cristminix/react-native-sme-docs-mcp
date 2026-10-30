# Images & Assets

Static assets, `require`, density buckets, and `expo-asset` loading.

Highlights / Images & Assets

* Local images use `require()` at build time - Metro resolves `@2x`/`@3x` density buckets automatically
* Remote images need explicit `width` and `height` (or `aspectRatio`) or layout collapses to zero
* `expo-asset` preloads fonts and images before first paint to avoid flash-of-missing-content
* `expo-image` offers caching, blurhash placeholders, and better performance than core `Image` for most apps
* SVGs are not bundled like PNGs - use `react-native-svg` or convert to PNG/WebP
* Asset paths in `require()` must be static literals; dynamic strings are not supported

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import { Image, View, StyleSheet } from "react-native";
import { Asset } from "expo-asset";
 
// Local asset - Metro picks the right density bucket at build time
const logo = require("./assets/logo.png");
 
// Preload before first render (splash / app init)
async function preloadAssets() {
  await Asset.loadAsync([
    require("./assets/logo.png"),
    require("./assets/hero@2x.png"),
  ]);
}
 
function Avatar({ uri }: { uri: string }) {
  return (
    <View style={styles.row}>
      <Image source={logo} style={styles.logo} resizeMode="contain" />
      <Image
        source={{ uri }}
        style={styles.avatar}
        resizeMode="cover"
        accessibilityLabel="User avatar"
      />
    </View>
  );
}
 
const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 120, height: 40 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
});
```

**When to reach for this:** Any screen that shows icons, illustrations, avatars, or splash art - local assets via `require()`, remote URLs via `{ uri }`, and `expo-asset` when you need assets ready before navigation.

## Working Example

```tsx
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { Asset } from "expo-asset";
import * as SplashScreen from "expo-splash-screen";
 
SplashScreen.preventAutoHideAsync();
 
const ASSETS = [
  require("./assets/icon.png"),
  require("./assets/onboarding-hero.png"),
];
 
type Props = { avatarUrl: string };
 
export default function ProfileHeader({ avatarUrl }: Props) {
  const [ready, setReady] = useState(false);
 
  useEffect(() => {
    (async () => {
      await Asset.loadAsync(ASSETS);
      setReady(true);
      await SplashScreen.hideAsync();
    })();
  }, []);
 
  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
 
  return (
    <View style={styles.header}>
      <Image source={ASSETS[0]} style={styles.icon} resizeMode="contain" />
      <Image
        source={{ uri: avatarUrl }}
        defaultSource={require("./assets/avatar-placeholder.png")}
        style={styles.avatar}
        resizeMode="cover"
        onError={() => console.warn("Avatar failed to load")}
      />
      <Text style={styles.title}>Your profile</Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { alignItems: "center", padding: 24, gap: 12 },
  icon: { width: 64, height: 64 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  title: { fontSize: 20, fontWeight: "600" },
});
```

**What this demonstrates:**

* Bundling local PNGs with static `require()` and explicit dimensions.
* Preloading a batch of assets with `Asset.loadAsync()` before hiding the splash screen.
* Remote `{ uri }` images with a local `defaultSource` placeholder.
* `resizeMode` for scaling behavior and `onError` for failed network loads.

## Deep Dive

### How It Works

* **Metro bundler** resolves `require('./assets/logo.png')` at build time and emits a numeric asset ID. At runtime, React Native's `Image` resolves that ID to the correct file for the device's pixel density.
* **Density buckets** follow the `@Nx` suffix convention: `logo.png` (1x), `logo@2x.png`, `logo@3x.png`. Metro picks the closest match; you only `require()` the base filename.
* **Remote images** bypass Metro. The native image loader fetches over the network (or disk cache) and decodes on a background thread, then uploads a GPU texture on the UI thread.
* **`expo-asset`** wraps the same asset registry but adds download/cache helpers for remote URLs and a promise-based preload API used in app bootstrap.
* **Memory**: decoded bitmaps live in native memory. Large full-screen JPEGs at `@3x` can spike RAM - size assets for their display dimensions, not the device's native resolution.

### Asset Naming & Density

| File | Device density | When used |
| --- | --- | --- |
| `icon.png` | ~1x (mdpi) | Low-density Android, fallback |
| `icon@2x.png` | ~2x (xhdpi) | Most iPhones, many Android phones |
| `icon@3x.png` | ~3x (xxhdpi) | iPhone Pro Max, high-end Android |

Place all variants in the same directory. Only reference the base name in code:

```tsx
// Metro resolves icon@2x.png / icon@3x.png automatically
<Image source={require("./assets/icon.png")} style={{ width: 32, height: 32 }} />
```

### `resizeMode` Reference

| Mode | Behavior |
| --- | --- |
| `cover` | Fill the frame; crop overflow (avatars, hero banners) |
| `contain` | Fit inside the frame; letterbox if needed (logos) |
| `stretch` | Distort to fill (rarely desirable) |
| `center` | No scaling; center at natural size |
| `repeat` | Tile (iOS only for `Image`; use `ImageBackground` on Android) |

### Preloading with `expo-asset`

```tsx
import { Asset } from "expo-asset";
import { useFonts } from "expo-font";
 
export async function loadAppResources() {
  const imageAssets = Asset.loadAsync([
    require("./assets/splash-art.png"),
    require("./assets/tab-home.png"),
  ]);
 
  const fontAssets = useFonts({
    Inter: require("./assets/fonts/Inter-Regular.ttf"),
  });
 
  await Promise.all([imageAssets, fontAssets]);
}
```

Call this in your root layout or splash gate before rendering screens that depend on the assets.

### TypeScript Notes

```tsx
import type { ImageSourcePropType, ImageStyle, StyleProp } from "react-native";
 
// require() returns a number (asset module ID) in RN
const localSource: ImageSourcePropType = require("./assets/logo.png");
 
// Remote source is an object
const remoteSource: ImageSourcePropType = {
  uri: "https://cdn.example.com/avatar.jpg",
  width: 200,
  height: 200,
  cache: "force-cache", // optional: 'default' | 'reload' | 'force-cache' | 'only-if-cached'
};
 
type AvatarProps = {
  source: ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
};
```

## Gotchas

* **Missing dimensions on remote images** - Without `width`/`height` (or `aspectRatio`), `Image` renders at 0×0 and appears invisible. **Fix:** Always set explicit layout for `{ uri }` sources.
* **Dynamic `require()` paths** - `require('./assets/' + name + '.png')` fails at build time because Metro must statically analyze imports. **Fix:** Use a lookup map of static requires or fetch remote URLs.
* **Huge `@3x` assets on small UI** - A 3000×3000 PNG shown in a 48×48 avatar wastes decode time and RAM. **Fix:** Export at the display size × pixel ratio, or use WebP with compression.
* **SVG treated as raster** - Dropping an `.svg` into `require()` does not work out of the box. **Fix:** Use `react-native-svg` with `SvgUri` / inline SVG, or export to PNG/WebP.
* **GIF animation on Android** - Core `Image` does not animate GIFs on Android. **Fix:** Use `expo-image` (supports animated formats) or a dedicated animation library.
* **Cache-busting remote URLs** - Appending query strings on every render (`?t=${Date.now()}`) defeats HTTP caching and causes flicker. **Fix:** Stable URIs; call `Image.prefetch(uri)` or `expo-image` cache APIs when you need a refresh.
* **Splash hidden before assets load** - Hiding the splash immediately shows a blank screen while images decode. **Fix:** `await Asset.loadAsync(...)` then `SplashScreen.hideAsync()`.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Core `Image` (react-native) | Simple local/remote images, minimal deps | You need disk caching, blurhash, transitions, or GIF support |
| `expo-image` | Production image-heavy apps, lists with avatars, placeholders | You need zero Expo modules in a bare RN app without prebuild |
| `ImageBackground` | Full-bleed backgrounds with children overlaid | You only need a plain image (use `Image` - lighter) |
| `expo-file-system` + local URI | User-generated photos saved to disk | Static bundled assets (use `require()`) |
| `react-native-fast-image` (community) | Bare RN with aggressive caching needs | Expo managed workflow where `expo-image` already covers caching |

## FAQs

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

## Related

* [Views, Text & Core Components](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/views-text-and-core-components/) - layout primitives that wrap `Image`
* [Dimensions & Responsive Layout](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/dimensions-and-responsive-layout/) - sizing images across phone and tablet breakpoints
* [Platform-Specific Code](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/platform-specific-code/) - iOS/Android image picker and asset differences
* [React Native Basics](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/react-native-basics/) - core component tour before diving into assets
* [Best Practices](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/best-practices/) - team conventions for asset pipelines and bundle size

### External Related Links

* [docs.expo.dev](https://docs.expo.dev/) - official Expo docs (recommended framework)
* [reactnative.dev](https://reactnative.dev/) - official React Native site
* [reactnative.directory](https://reactnative.directory/) - community library directory (compatibility, New Architecture flags)

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
