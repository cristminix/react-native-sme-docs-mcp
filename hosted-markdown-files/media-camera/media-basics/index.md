# Media Basics

10 examples to get you started with media module selection - 7 basic and 3 intermediate. Mobile media is memory-heavy and permission-sensitive; pick the **smallest module** that satisfies the product requirement.

Highlights / Media Basics

* Capture: expo-camera for live preview; expo-image-picker for library picks
* Display: expo-image for feeds and avatars - not React Native Image for remote URLs
* Playback: expo-video with useVideoPlayer - retire expo-av for new screens
* Edit: expo-image-manipulator for resize/compress; native pipelines for heavy video
* Maps and GPU drawing are separate native stacks - dev client required
* Downscale before preview - full-resolution URIs in state cause OOM on Android
* Request permissions in context - never camera on mount without explaining why

## Prerequisites

Scaffold an Expo SDK 57 app and install the core media packages this section builds on:

```bash
npx create-expo-app@latest MediaBasics --template default@sdk-57
cd MediaBasics
npx expo install expo-image expo-camera expo-video
```

```json
{
  "dependencies": {
    "expo": "~57.0.4",
    "react": "19.2.3",
    "react-native": "0.86.0"
  }
}
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**.

---

## Basic Examples

### 1. Three Jobs: Capture, Playback, and Editing

Before importing a package, classify the screen. Capture, playback, and editing have different native stacks and memory profiles.

```text
Capture   → camera hardware, permissions, temporary file URIs
Playback  → decoders, buffering, audio session, background modes
Editing   → CPU/GPU transforms, often blocking unless offloaded
Display   → image views, caching, recycling in lists
```

```ts
// src/media/moduleMap.ts
export const mediaModules = {
  capture: {
    livePreview: "expo-camera",
    libraryPick: "expo-image-picker",
    systemCameraIntent: "expo-image-picker.launchCameraAsync",
  },
  display: {
    remoteAndLocal: "expo-image",
    legacyOnly: "react-native Image", // avoid for new feeds
  },
  playback: {
    video: "expo-video",
    audioOnly: "expo-audio",
  },
  edit: {
    resizeCompress: "expo-image-manipulator",
    heavyVideo: "native pipeline or cloud transcode",
  },
} as const;
```

* **One screen, one primary job** - mixing capture preview and video playback in the same tree doubles GPU and decoder pressure
* **Editing is not display** - resizing a 48MP photo belongs in `expo-image-manipulator`, not in an `<Image>` style prop
* **Maps and Skia are rich content, not capture** - treat them as separate native dependencies

> **Related:** [expo-camera](https://docs.wahwei/reactnative.codeguides.io/media-camera/expo-camera/) - preview performance | [expo-video](https://docs.wahwei/reactnative.codeguides.io/media-camera/expo-video/) - player lifecycle

---

### 2. Still Capture: CameraView vs Image Picker

| Need | Module | Why |
| --- | --- | --- |
| Custom viewfinder, barcode, torch | `expo-camera` | Owns the camera session |
| One-shot attach from gallery | `expo-image-picker` | System picker UI, no preview code |
| Branded overlay on live preview | `expo-camera` | `CameraView` is a full-screen native preview |
| "Take photo" without custom UI | `launchCameraAsync` | Delegates to OS camera app |

```tsx
// src/media/captureChoice.ts
import * as ImagePicker from "expo-image-picker";
 
export async function quickAttachFromGallery() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") return null;
 
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.7,
    allowsEditing: true,
  });
 
  return result.canceled ? null : result.assets[0];
}
```

* **`expo-camera`** when the product owns framing, scanning, or torch UX
* **`expo-image-picker`** when the product only needs a file URI back
* Request **camera permission only when the user taps capture** - not on screen mount

> **Related:** [expo-camera & expo-image-picker](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-camera-and-expo-image-picker/) - permissions and memory-safe capture flows

---

### 3. Display Remote Images with expo-image

Feeds, avatars, and hero banners should use **`expo-image`**, not React Native's `Image`. Disk caching, BlurHash placeholders, and recycling keys are built in.

```bash
npx expo install expo-image
```

```tsx
// src/media/Avatar.tsx
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
 
type Props = {
  uri: string;
  blurhash?: string;
  size?: number;
};
 
export function Avatar({ uri, blurhash, size = 48 }: Props) {
  return (
    <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }]}>
      <Image
        source={{ uri }}
        placeholder={blurhash ? { blurhash } : undefined}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    </View>
  );
}
 
const styles = StyleSheet.create({
  ring: { overflow: "hidden", backgroundColor: "#e5e7eb" },
});
```

* **`cachePolicy="memory-disk"`** suits avatars shown repeatedly across screens
* **`placeholder` + `transition`** removes flicker when URLs resolve after API fetch
* Pair with **`recyclingKey`** in FlashList rows - see [expo-image](https://docs.wahwei/reactnative.codeguides.io/media-camera/expo-image/)

---

### 4. Video Playback: expo-video, Not expo-av

New screens should use **`expo-video`** with `useVideoPlayer` and `VideoView`. The player is a native `SharedObject` with explicit lifecycle.

```bash
npx expo install expo-video
```

```tsx
// src/media/InlineClip.tsx
import { useVideoPlayer, VideoView } from "expo-video";
import { StyleSheet, View } from "react-native";
 
type Props = { uri: string };
 
export function InlineClip({ uri }: Props) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
 
  return (
    <View style={styles.box}>
      <VideoView style={styles.video} player={player} contentFit="cover" />
    </View>
  );
}
 
const styles = StyleSheet.create({
  box: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#000" },
  video: { flex: 1 },
});
```

* **`useVideoPlayer`** creates and disposes the player when the component unmounts
* **Mute autoplaying clips** in feeds - unexpected audio is a top store-review complaint
* Background audio and PiP require **config plugin flags** - see [expo-video](https://docs.wahwei/reactnative.codeguides.io/media-camera/expo-video/)

---

### 5. Lightweight Image Editing Before Upload

Resize and compress on device before preview or upload. Full-resolution camera output should not land in React state.

```bash
npx expo install expo-image-manipulator
```

```ts
// src/media/prepareUpload.ts
import * as ImageManipulator from "expo-image-manipulator";
 
export async function preparePhotoForUpload(localUri: string) {
  const result = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 1920 } }],
    { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}
```

```text
Risky:  setState(fullResUri) → <Image source={{ uri }} /> in FlatList
Safer:  manipulateAsync → max width 1280–1920 → upload temp file
```

* **JPEG 0.7–0.8** is usually fine for field photos and profile shots
* Run manipulator **off the critical tap path** when possible - show a spinner on "Use photo"
* Video trimming, filters, and multi-clip timelines belong in **native or cloud pipelines**, not JS loops

---

### 6. Barcode Scanning Lives in expo-camera

QR and barcode flows need a live preview or the platform scanner - not image-picker.

```tsx
// src/media/ScanGate.tsx
import { CameraView } from "expo-camera";
import { useCallback, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
 
type Props = { onCode: (data: string) => void };
 
export function ScanGate({ onCode }: Props) {
  const lastScan = useRef(0);
 
  const handleScan = useCallback(
    ({ data }: { data: string }) => {
      const now = Date.now();
      if (now - lastScan.current < 1500) return;
      lastScan.current = now;
      onCode(data);
    },
    [onCode]
  );
 
  return (
    <View style={styles.root}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ["qr", "code128"] }}
        onBarcodeScanned={handleScan}
      />
      <Text style={styles.hint}>Align code inside the frame</Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  root: { flex: 1 },
  camera: { flex: 1 },
  hint: { position: "absolute", bottom: 48, alignSelf: "center", color: "#fff" },
});
```

* **Debounce `onBarcodeScanned`** - it fires many times per second
* Validate payload with **Zod** before deep-link navigation
* Torch and preview tuning are cookbook topics in [expo-camera](https://docs.wahwei/reactnative.codeguides.io/media-camera/expo-camera/)

---

### 7. Only One Active Camera Preview

`expo-camera` allows **one** active preview session. Unmount `CameraView` when the screen loses focus.

```tsx
// src/media/FocusedCamera.tsx
import { CameraView, useCameraPermissions } from "expo-camera";
import { useIsFocused } from "@react-navigation/native";
import { StyleSheet, Text, View } from "react-native";
 
export function FocusedCamera() {
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
 
  if (!permission?.granted) {
    return (
      <View style={styles.gate}>
        <Text onPress={requestPermission}>Allow camera</Text>
      </View>
    );
  }
 
  if (!isFocused) {
    return <View style={styles.placeholder} />;
  }
 
  return <CameraView style={styles.camera} facing="back" />;
}
 
const styles = StyleSheet.create({
  gate: { flex: 1, justifyContent: "center", alignItems: "center" },
  placeholder: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
});
```

* Tab navigators keep screens mounted - **`useIsFocused`** prevents a hidden tab from holding the camera
* On iOS, **`active={false}`** can pause the session without unmounting when supported
* Never stack two `CameraView` instances in the same route tree

---

## Intermediate Examples

### 8. Seed expo-image Cache from a Local Capture

After capture, write the file into `expo-image`'s disk cache so list rows load instantly without re-decoding from a temp path.

```ts
// src/media/seedAvatarCache.ts
import { Image } from "expo-image";
 
export async function seedAvatarCache(localUri: string, userId: string) {
  const cacheKey = `avatar:${userId}`;
  await Image.writeToCacheAsync(localUri, cacheKey);
  return { uri: localUri, cacheKey };
}
```

```tsx
<Image
  source={{ uri: localUri, cacheKey: `avatar:${userId}` }}
  contentFit="cover"
  style={{ width: 48, height: 48, borderRadius: 24 }}
/>
```

* **`writeToCacheAsync`** is for files you already have - picker output, downloads, manipulator results
* Reuse the same **`cacheKey`** in `source` when rendering later
* Full caching recipes live in [expo-image](https://docs.wahwei/reactnative.codeguides.io/media-camera/expo-image/)

---

### 9. Preload the Next Video While One Plays

`expo-video` can buffer a second source before it is attached to a `VideoView` - useful for stories and lesson players.

```tsx
// src/media/DualPlayerSwap.tsx
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useVideoPlayer, VideoView, VideoSource } from "expo-video";
 
const clipA: VideoSource =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
const clipB: VideoSource =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4";
 
export function DualPlayerSwap() {
  const playerA = useVideoPlayer(clipA, (p) => p.play());
  const playerB = useVideoPlayer(clipB);
  const [current, setCurrent] = useState(playerA);
 
  const swap = useCallback(() => {
    current.pause();
    if (current === playerA) {
      playerB.play();
      setCurrent(playerB);
    } else {
      playerA.play();
      setCurrent(playerA);
    }
  }, [current, playerA, playerB]);
 
  return (
    <View style={{ flex: 1 }}>
      <VideoView player={current} style={{ flex: 1 }} contentFit="contain" />
      <Pressable onPress={swap} style={{ padding: 16 }}>
        <Text>Next clip</Text>
      </Pressable>
    </View>
  );
}
```

* Create **`useVideoPlayer(secondSource)`** early so buffers fill while the first clip plays
* **Pause the outgoing player** before swapping - avoids two audio sessions
* On Android, **one `VideoView` per player instance** - do not mount two views on the same player

---

### 10. Maps and Skia: Separate Native Stacks

`react-native-maps` and `@shopify/react-native-skia` are **community native libraries**. They require a development build, config plugins, and their own performance budgets.

```bash
npx expo install expo-dev-client react-native-maps @shopify/react-native-skia
```

```text
react-native-maps  → MapView, markers, tiles, clustering
react-native-skia  → Canvas, charts, GPU paths, custom shaders
```

| Concern | Maps | Skia |
| --- | --- | --- |
| Primary cost | Tile fetches, marker count | Draw calls, path complexity |
| Offline | `UrlTile` + bundled or cached tiles | Pre-rendered assets or local data |
| Expo Go | Not supported | Not supported |
| Config plugin | Google Maps API keys | Usually none; verify New Arch |

* Do not embed a **full map** inside every list row - use static map snapshots or a detail screen
* Skia excels at **charts and animated gauges** where hundreds of RN views would choke the bridge
* Deep dives: [react-native-maps](https://docs.wahwei/reactnative.codeguides.io/media-camera/react-native-maps/) | [react-native-skia](https://docs.wahwei/reactnative.codeguides.io/media-camera/react-native-skia/)

---

## Module Selection Cheat Sheet

| Product need | Start here | Avoid |
| --- | --- | --- |
| Avatar from camera or gallery | [expo-camera & image-picker](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-camera-and-expo-image-picker/) | Raw base64 in state |
| Product image grid | `expo-image` + `cachePolicy` | RN `Image` without caching |
| Training video with PiP | `expo-video` + config plugin | WebView `<video>` |
| QR check-in | `expo-camera` barcode | Parsing screenshots |
| Delivery map | `react-native-maps` | Embedding map WebView |
| Live KPI ring chart | `react-native-skia` | 60 animated `View`s |

## FAQs

Should I still use expo-av?

* Prefer **`expo-video`** and **`expo-audio`** for new Expo SDK 57 work.
* Migrate legacy `Video` components when you touch the screen - do not mix players in one route.

When is React Native Image acceptable?

* Tiny bundled assets via `require()` in static screens.
* For remote URLs in lists or profiles, **`expo-image`** is the default on SDK 57.

Do media packages work in Expo Go?

* **`expo-image`**, **`expo-camera`**, and **`expo-video`** run in Expo Go on supported devices.
* **`react-native-maps`** and **Skia** need a **development build**.

What is the single biggest media OOM cause?

* Holding **full-resolution capture URIs** in React state while rendering previews in lists. Downscale first.

How do I install the core trio?

```bash
npx expo install expo-image expo-camera expo-video
```

Use `npx expo install` so versions match SDK 57 native binaries.

## Related

* [expo-image](https://docs.wahwei/reactnative.codeguides.io/media-camera/expo-image/) - caching, placeholders, `writeToCacheAsync`
* [expo-camera](https://docs.wahwei/reactnative.codeguides.io/media-camera/expo-camera/) - barcode, torch, preview limits
* [expo-video](https://docs.wahwei/reactnative.codeguides.io/media-camera/expo-video/) - lifecycle, background audio, PiP
* [expo-camera & expo-image-picker](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-camera-and-expo-image-picker/) - capture cookbook
* [Media Best Practices](https://docs.wahwei/reactnative.codeguides.io/media-camera/best-practices/) - 25-point shipping checklist

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
