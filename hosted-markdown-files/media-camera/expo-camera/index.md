# expo-camera

Barcode scanning, torch, and preview performance limits - the `expo-camera` cookbook for Expo SDK 57 scan, audit, and field-capture screens.

Highlights / expo-camera

* Only one CameraView preview may be active - unmount on blur
* Debounce onBarcodeScanned - callbacks fire many times per second
* enableTorch for low-light scan lanes; turn off on unmount
* Wait for onCameraReady before takePictureAsync
* Pause preview when sheet closes - preview GPU cost is continuous
* Pair capture with expo-image-manipulator before preview in lists

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install expo-camera
```

```ts
// app.config.ts
export default {
  plugins: [
    [
      "expo-camera",
      {
        cameraPermission:
          "Allow FieldPro to photograph equipment labels for work orders.",
        microphonePermission:
          "Allow FieldPro to record audio with inspection videos.",
        recordAudioAndroid: true,
        barcodeScannerEnabled: true,
      },
    ],
  ],
};
```

```tsx
import { CameraView, useCameraPermissions } from "expo-camera";
import { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
 
export function QrScanner({ onScan }: { onScan: (data: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const last = useRef(0);
 
  const handleBarcode = useCallback(
    ({ data }: { data: string }) => {
      const now = Date.now();
      if (now - last.current < 1200) return;
      last.current = now;
      onScan(data);
    },
    [onScan]
  );
 
  if (!permission?.granted) {
    return (
      <View style={styles.gate}>
        <Text>Scan asset tags to open the correct work order.</Text>
        <Pressable onPress={requestPermission}>
          <Text style={styles.link}>Allow camera</Text>
        </Pressable>
      </View>
    );
  }
 
  return (
    <View style={styles.root}>
      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ["qr", "code128"] }}
        onBarcodeScanned={handleBarcode}
      />
      <Pressable style={styles.torch} onPress={() => setTorch((t) => !t)}>
        <Text style={styles.torchText}>{torch ? "Torch on" : "Torch off"}</Text>
      </Pressable>
    </View>
  );
}
 
const styles = StyleSheet.create({
  root: { flex: 1 },
  camera: { flex: 1 },
  gate: { flex: 1, padding: 24, gap: 12, justifyContent: "center" },
  link: { color: "#2563eb" },
  torch: { position: "absolute", top: 56, right: 16, padding: 10, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 8 },
  torchText: { color: "#fff", fontWeight: "600" },
});
```

**When to reach for this:**

* QR or barcode check-in with custom framing UI.
* Field inspection with live viewfinder and torch in warehouses.
* Video or still capture with overlay branding.
* Scan-to-navigate flows where you validate payload before routing.

**When to avoid:**

* Simple one-shot photo attach - `expo-image-picker` `launchCameraAsync` is less code.
* Gallery picks - use `expo-image-picker` instead.
* Heavy burst RAW capture - platform intents with explicit size caps.

> **Capture flows:** For library fallback, permission gates, and memory-safe previews, see [expo-camera & expo-image-picker](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-camera-and-expo-image-picker/).

## Working Example

Scan screen with debounced barcode handling, torch toggle, focus-aware mount, and downscaled still capture.

```bash
npx expo install expo-camera expo-image-manipulator
```

```tsx
// src/scan/InspectionCapture.tsx
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import { useIsFocused } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
 
type Props = {
  onScan: (payload: string) => void;
  onPhoto: (uri: string) => void;
};
 
export function InspectionCapture({ onScan, onPhoto }: Props) {
  const isFocused = useIsFocused();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [torch, setTorch] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const lastScan = useRef(0);
 
  const onBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (!isFocused) return;
      const now = Date.now();
      if (now - lastScan.current < 1500) return;
      lastScan.current = now;
      onScan(data);
    },
    [isFocused, onScan]
  );
 
  async function captureLabel() {
    if (!ready) return;
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8 });
    if (!photo?.uri) return;
    const resized = await ImageManipulator.manipulateAsync(
      photo.uri,
      [{ resize: { width: 1600 } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
    );
    setPreview(resized.uri);
    onPhoto(resized.uri);
  }
 
  if (!permission?.granted) {
    return (
      <View style={styles.gate}>
        <Text>Photograph serial plates and scan QR codes on equipment.</Text>
        <Pressable onPress={requestPermission}>
          <Text style={styles.link}>Continue</Text>
        </Pressable>
      </View>
    );
  }
 
  if (preview) {
    return (
      <View style={styles.preview}>
        <Image source={{ uri: preview }} contentFit="contain" style={styles.previewImage} />
        <Pressable onPress={() => setPreview(null)}>
          <Text>Retake</Text>
        </Pressable>
      </View>
    );
  }
 
  if (!isFocused) {
    return <View style={styles.placeholder} />;
  }
 
  return (
    <View style={styles.root}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        enableTorch={torch}
        onCameraReady={() => setReady(true)}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={onBarcodeScanned}
      />
      <View style={styles.toolbar}>
        <Pressable onPress={() => setTorch((t) => !t)}>
          <Text style={styles.tool}>{torch ? "Torch on" : "Torch"}</Text>
        </Pressable>
        <Pressable onPress={captureLabel} disabled={!ready}>
          <Text style={styles.tool}>Capture label</Text>
        </Pressable>
      </View>
    </View>
  );
}
 
const styles = StyleSheet.create({
  root: { flex: 1 },
  camera: { flex: 1 },
  gate: { flex: 1, padding: 24, gap: 12, justifyContent: "center" },
  link: { color: "#2563eb", fontWeight: "600" },
  placeholder: { flex: 1, backgroundColor: "#111" },
  preview: { flex: 1, padding: 16, gap: 12 },
  previewImage: { flex: 1, borderRadius: 8 },
  toolbar: {
    position: "absolute",
    bottom: 40,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tool: { color: "#fff", fontWeight: "600", padding: 12, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 8 },
});
```

**What this demonstrates:**

* **`useIsFocused`** releases the camera when the tab or modal is hidden.
* **`onCameraReady`** gates `takePictureAsync` - calling early produces errors or blank frames.
* **`enableTorch`** toggles the light for barcode contrast in dim aisles.
* **Debounced `onBarcodeScanned`** prevents duplicate navigations.
* **Manipulator pass** before `expo-image` preview keeps memory bounded.

## Deep Dive

### Barcode scanning modes

| Mode | API | Best for |
| --- | --- | --- |
| Inline preview | `CameraView` + `onBarcodeScanned` | Custom overlay, torch, same-screen UX |
| System scanner | `CameraView.launchScanner()` | iOS 16+ / Android ML Kit sheet |
| Modern listener | `CameraView.onModernBarcodeScanned` | Native scanner events without inline preview |

```tsx
import { CameraView } from "expo-camera";
 
async function openSystemScanner() {
  await CameraView.launchScanner({ barcodeTypes: ["qr"] });
}
```

* Validate **`data`** with Zod before `router.push` - never trust scanned URLs blindly.
* Disable scanning after success: `onBarcodeScanned={scanned ? undefined : handler}`.
* Set **`barcodeScannerEnabled: false`** in the config plugin when you ship photo-only apps - smaller binary.

### Torch and exposure

```tsx
<CameraView enableTorch={torchOn} facing="back" />
```

* Torch applies to the **back** camera on most devices - hide the toggle on front-facing selfie flows.
* Turn torch **off in `useEffect` cleanup** - leaving it on drains battery and annoys users.
* For still capture in low light, prefer **torch + moderate `quality`** over full-res without light.

### Preview performance limits

```text
Preview cost drivers:
1. Resolution and aspect ratio (ratio prop on Android changes scale type)
2. Multiple mounted CameraView instances (forbidden - only one active session)
3. Background tabs still mounted (use focus gating)
4. Barcode scanning + 60fps navigation animations on low-end Android
```

| Technique | Effect |
| --- | --- |
| Unmount on blur | Frees camera hardware for other apps |
| `pausePreview()` when sheet covers camera | Reduces GPU while modal open |
| Lower `pictureSize` when supported | Smaller analysis buffers for stills |
| Scan-only screen without 4K `pictureSize` | Faster lock and lower heat |

```tsx
// Pause when a bottom sheet covers the preview
useEffect(() => {
  if (!sheetOpen) return;
  cameraRef.current?.pausePreview();
  return () => {
    cameraRef.current?.resumePreview();
  };
}, [sheetOpen]);
```

* Do not call **`takePictureAsync` while preview is paused** on Android - it throws.
* Profile on a **mid-tier Android** device - iPhone Pro cameras mask preview jank.

### Still and video capture notes

```tsx
const photo = await cameraRef.current?.takePictureAsync({
  quality: 0.8,
  skipProcessing: false,
});
 
const video = await cameraRef.current?.recordAsync({ maxDuration: 60 });
```

* Video with audio needs **microphone** permission in the config plugin.
* **`recordAsync`** writes to cache - upload via `expo-file-system`, not base64.
* Flip camera during recording **stops** the session - design UX accordingly.

## Gotchas

* **Permission on mount** - high deny rate. **Fix:** explain value, offer library fallback per [expo-camera & image-picker](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-camera-and-expo-image-picker/).
* **Duplicate scans** - stack push loop. **Fix:** debounce 1–2s; set `scanned` flag.
* **Two CameraView instances** - black preview or crash. **Fix:** one session per app; unmount hidden tabs.
* **Full-res preview in state** - OOM. **Fix:** manipulator resize before `<Image>`.
* **Torch left on** - battery drain. **Fix:** reset on unmount.
* **Web camera** - URIs are base64 strings. **Fix:** gate with `Platform.OS` and size limits.

## Alternatives

| Alternative | Use when | Don't use when |
| --- | --- | --- |
| `CameraView` | Custom scan UI, torch, video | One-tap system camera |
| `launchCameraAsync` | Native camera UX enough | Branded viewfinder |
| `launchScanner()` | Quick QR without custom UI | Need torch overlay on same screen |
| react-native-vision-camera | Frame processors, FPS counters | Standard Expo capture |

## FAQs

How do I install expo-camera on SDK 57?

```bash
npx expo install expo-camera
```

Add permission strings via the config plugin, then rebuild if native permissions changed.

Why does onBarcodeScanned fire repeatedly?

* The detector runs continuously while the code is in frame.
* Debounce by timestamp or unset the handler after the first valid read.

Can I run the preview in a tab navigator?

* Yes - unmount or pause when `useIsFocused()` is false.
* Hidden tabs that keep `CameraView` mounted steal the single camera session.

Does expo-camera work in Expo Go?

* Yes on physical devices for preview, capture, and barcode.
* Simulators lack real camera hardware - use a device matrix.

Where is the full capture + picker recipe?

* [expo-camera & expo-image-picker](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-camera-and-expo-image-picker/) - permissions, library fallback, upload hygiene.

## Related

* [expo-camera & expo-image-picker](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-camera-and-expo-image-picker/) - capture flows and memory-safe previews
* [Media Basics](https://docs.wahwei/reactnative.codeguides.io/media-camera/media-basics/) - module selection tour
* [expo-image](https://docs.wahwei/reactnative.codeguides.io/media-camera/expo-image/) - display captures with caching
* [Android Permissions & Play Policy](https://docs.wahwei/reactnative.codeguides.io/android-platform/permissions-and-play-policy/) - camera and media declarations
* [Media Best Practices](https://docs.wahwei/reactnative.codeguides.io/media-camera/best-practices/) - shipping checklist

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
