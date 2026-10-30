# expo-camera & expo-image-picker

Capture flows, permissions, and memory-safe previews - the camera cookbook for Expo SDK 57 apps that attach photos to forms, profiles, and field reports.

Highlights / expo-camera & expo-image-picker

* expo-camera for live preview; expo-image-picker for library selection
* Request camera permission after explaining why capture is needed
* Downscale images before upload - full-resolution URIs exhaust memory
* Use quality and allowsEditing options to cap payload size
* Revoke object URLs and clear large base64 strings after upload
* Config plugin microphone permission only when recording video with audio

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install expo-camera expo-image-picker
```

```ts
// app.config.ts
export default {
  plugins: [
    [
      "expo-camera",
      {
        cameraPermission:
          "Allow InspectPro to photograph equipment for work orders.",
        microphonePermission:
          "Allow InspectPro to record audio with video inspections.",
        recordAudioAndroid: true,
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "Allow InspectPro to attach existing photos from your library.",
      },
    ],
  ],
};
```

```ts
import * as ImagePicker from "expo-image-picker";
 
export async function pickImageFromLibrary() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") return null;
 
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    quality: 0.7,
    exif: false,
  });
 
  if (result.canceled) return null;
  return result.assets[0];
}
```

**When to reach for this:**

* Profile avatar upload from camera or gallery.
* Barcode scanning with `expo-camera` (BarcodeScanner module).
* Field inspection photos with live camera preview.
* Quick attach-from-library without custom camera UI.

**When to avoid:**

* Heavy video editing - consider native media pipelines.
* Burst capture at full 48MP - use platform camera intents with size limits.
* Reading clipboard images - use appropriate clipboard APIs instead.

## Working Example

Camera preview with permission gate, library fallback, and downscaled preview URI.

```bash
npx expo install expo-camera expo-image-picker expo-image-manipulator
```

```tsx
// src/media/CaptureSheet.tsx
import { useRef, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
 
async function pickImageFromLibrary() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    quality: 0.7,
  });
  if (result.canceled) return null;
  return result.assets[0];
}
 
type Props = {
  onCaptured: (uri: string) => void;
};
 
export function CaptureSheet({ onCaptured }: Props) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [previewUri, setPreviewUri] = useState<string | null>(null);
 
  if (!permission?.granted) {
    return (
      <View style={{ padding: 24, gap: 12 }}>
        <Text>Photograph equipment labels for audit trails.</Text>
        <Pressable onPress={requestPermission}>
          <Text style={{ color: "#2563eb" }}>Allow camera</Text>
        </Pressable>
        <Pressable
          onPress={async () => {
            const asset = await pickImageFromLibrary();
            if (asset) await setDownscaledPreview(asset.uri);
          }}
        >
          <Text>Choose from library instead</Text>
        </Pressable>
      </View>
    );
  }
 
  async function setDownscaledPreview(uri: string) {
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1280 } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
    );
    setPreviewUri(manipulated.uri);
  }
 
  async function takePhoto() {
    const photo = await cameraRef.current?.takePictureAsync({
      quality: 0.8,
      skipProcessing: false,
    });
    if (photo?.uri) await setDownscaledPreview(photo.uri);
  }
 
  return (
    <View style={{ flex: 1 }}>
      {previewUri ? (
        <View style={{ flex: 1, gap: 12, padding: 16 }}>
          <Image
            source={{ uri: previewUri }}
            style={{ flex: 1, borderRadius: 8 }}
            resizeMode="contain"
          />
          <Pressable onPress={() => onCaptured(previewUri)}>
            <Text style={{ fontWeight: "600" }}>Use photo</Text>
          </Pressable>
          <Pressable onPress={() => setPreviewUri(null)}>
            <Text>Retake</Text>
          </Pressable>
        </View>
      ) : (
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
          <Pressable onPress={takePhoto} style={{ margin: 24, padding: 16 }}>
            <Text style={{ color: "#fff" }}>Capture</Text>
          </Pressable>
        </CameraView>
      )}
    </View>
  );
}
```

**What this demonstrates:**

* **`useCameraPermissions`** hook for camera gate with library fallback.
* **`takePictureAsync`** with quality cap before manipulator pass.
* **`expo-image-manipulator`** resize to 1280px width - memory-safe preview.
* **Retake flow** clears URI - avoids holding multiple full-res blobs in state.
* **Plugin strings** aligned with pre-prompt copy.

## Deep Dive

### Camera vs Image Picker

| Module | Best for | Permission |
| --- | --- | --- |
| `expo-camera` | Live preview, barcode scan, video | Camera (+ mic for video) |
| `expo-image-picker` | Gallery / system picker UI | Photos library |
| Both | Avatar flows with "Take photo" + "Choose existing" | Request only what user selects |

### Memory-Safe Previews

```text
Risky:  store full 4032×3024 URI in React state + render <Image />
Safer:  manipulateAsync → max width 1280, JPEG 0.75
Upload: separate full-res file on disk if backend requires - stream via FileSystem
```

* React Native `Image` decodes full bitmap - **downscale before preview**.
* Clear `previewUri` state after upload completes - release file references.
* Prefer **`expo-file-system` `File`** for upload bodies - see [./expo-file-system.md](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-file-system/).

### Video Capture Notes

```tsx
const video = await cameraRef.current?.recordAsync({
  maxDuration: 60,
});
```

* Request **microphone** permission only when recording with audio.
* Large videos belong on disk - upload with progress via `File.createUploadTask`.

### Barcode Scanning (Brief)

```tsx
<CameraView
  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
  onBarcodeScanned={({ data }) => handleScan(data)}
/>
```

* Debounce scans - `onBarcodeScanned` fires rapidly.
* Validate scanned payload with Zod before navigation.

### Key API Surface

| API | Module | Purpose |
| --- | --- | --- |
| `CameraView` | expo-camera | Live preview component |
| `useCameraPermissions` | expo-camera | Permission hook |
| `takePictureAsync` | expo-camera | Still capture |
| `launchImageLibraryAsync` | image-picker | Gallery pick |
| `launchCameraAsync` | image-picker | System camera intent |
| `manipulateAsync` | image-manipulator | Resize/compress |

## Gotchas

* **Full-res preview in FlatList** - OOM on Android mid-tier devices. **Fix:** Resize before any `<Image>` render.
* **Permission on mount** - Users deny without context. **Fix:** Pre-prompt + library fallback.
* **Missing photos permission on iOS 14+** - `launchImageLibraryAsync` fails. **Fix:** `requestMediaLibraryPermissionsAsync`.
* **Keeping base64 in state** - Doubles memory. **Fix:** URI strings only; base64 at upload boundary if required.
* **Microphone plugin without video** - Review questions. **Fix:** Omit mic permission when photos only.
* **Expo Go vs dev client for barcode** - Test on target binary before release.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `expo-camera` | Custom overlay, scanning | Simple one-shot attach |
| `launchCameraAsync` | Native camera UX suffices | Custom viewfinder branding |
| `expo-document-picker` | PDFs and documents | Photos only |
| Native vision-camera | Advanced frame processors | Standard capture flows |

## FAQs

How do I install camera packages on SDK 57?

```bash
npx expo install expo-camera expo-image-picker
```

Add config plugin permission strings, then rebuild if native permissions changed.

What quality setting should I use?

* **0.7–0.8** JPEG for field photos - visually fine, smaller uploads.
* Pair with max width **1280–1920** for preview and upload unless compliance requires RAW.

Can I use both CameraView and image-picker?

* Yes - offer two buttons sharing the same downscale + upload pipeline.
* Request camera permission only when user taps "Take photo".

How do I upload captured files?

* Use `expo-file-system` `File.createUploadTask` or `fetch` with `File` blob body.
* See [../networking-api/fetch-vs-axios/fetch-vs-axios.md](https://docs.wahwei/reactnative.codeguides.io/networking-api/fetch-vs-axios/) for upload progress options.

Does expo-camera work on web?

* Limited support - gate camera features with `Platform.OS` and offer file input on web.

## Related

* [Expo SDK Basics](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-sdk-basics/) - config plugins
* [expo-file-system](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-file-system/) - store and upload captures
* [../media-camera/media-basics/media-basics.md](https://docs.wahwei/reactnative.codeguides.io/media-camera/media-basics/) - module selection
* [../data-offline/expo-sqlite/expo-sqlite.md](https://docs.wahwei/reactnative.codeguides.io/data-offline/expo-sqlite/) - store paths, not blobs
* [Expo SDK Packages Best Practices](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/best-practices/) - permission and memory patterns

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
