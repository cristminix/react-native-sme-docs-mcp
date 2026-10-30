# Networking Images Media

HTTP, cached images, pickers, and connectivity checks for mobile clients.

Highlights / Networking Images Media

* fetch JSON API
* AbortController Timeout
* expo-image Component
* ImagePicker Launch
* NetInfo Connectivity

#### fetch JSON API

`fetch` works in RN. Always check `response.ok` before assuming JSON success payloads.

```tsx
const res = await fetch(`${API}/items`, {
  headers: { Authorization: `Bearer ${token}` },
});
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const data: Item[] = await res.json();
```

#### POST JSON Body

Send JSON with explicit `Content-Type` and stringified body.

```tsx
await fetch(`${API}/items`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ title }),
});
```

#### AbortController Timeout

Cancel slow requests so UIs do not hang forever.

```tsx
const ac = new AbortController();
const t = setTimeout(() => ac.abort(), 12_000);
try {
  const res = await fetch(url, { signal: ac.signal });
  return await res.json();
} finally {
  clearTimeout(t);
}
```

#### expo-image Component

`expo-image` adds caching and better transitions than core `Image` for remote assets.

```tsx
import { Image } from "expo-image";
 
<Image
  source={{ uri }}
  style={{ width: 120, height: 120 }}
  contentFit="cover"
  transition={200}
/>
```

#### Image contentFit

Map CSS-like object-fit via `contentFit`: `cover`, `contain`, `fill`, `none`, `scale-down`.

```tsx
<Image source={{ uri }} style={styles.hero} contentFit="contain" />
```

#### Prefetch Image

Warm the cache before a screen that needs the asset immediately.

```tsx
import { Image } from "expo-image";
 
await Image.prefetch(uri);
```

#### ImagePicker Launch

Pick from the library with `expo-image-picker` after permissions.

```tsx
import * as ImagePicker from "expo-image-picker";
 
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ["images"],
  quality: 0.8,
});
if (!result.canceled) setUri(result.assets[0].uri);
```

#### Camera Permission Flow

Request permissions and branch when denied - send users to settings if needed.

```tsx
const cam = await ImagePicker.requestCameraPermissionsAsync();
if (!cam.granted) {
  // show rationale / open settings
  return;
}
await ImagePicker.launchCameraAsync({ quality: 0.8 });
```

#### DocumentPicker File

Pick arbitrary documents for upload.

```tsx
import * as DocumentPicker from "expo-document-picker";
 
const res = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
if (!res.canceled) setFile(res.assets[0]);
```

#### MediaLibrary Save

Save a file into the user gallery when appropriate (requires permissions).

```tsx
import * as MediaLibrary from "expo-media-library";
 
const { status } = await MediaLibrary.requestPermissionsAsync();
if (status === "granted") await MediaLibrary.saveToLibraryAsync(localUri);
```

#### AV Video Playback

Play video with the Expo video stack you standardize on (e.g. `expo-video` / `expo-av` in your app). Keep players paused in background via AppState.

```tsx
// Conceptual controlled player:
// <VideoView player={player} style={{ width: "100%", height: 220 }} />
```

#### NetInfo Connectivity

Gate fetches and show offline banners with `@react-native-community/netinfo`.

```tsx
import NetInfo from "@react-native-community/netinfo";
 
const state = await NetInfo.fetch();
if (!state.isConnected) setOffline(true);
```

#### Upload multipart

Upload local files with `FormData` and the file URI shape RN expects.

```tsx
const form = new FormData();
form.append("file", {
  uri: localUri,
  name: "photo.jpg",
  type: "image/jpeg",
} as unknown as Blob);
await fetch(`${API}/upload`, { method: "POST", body: form, headers: { Authorization: `Bearer ${token}` } });
```

#### Retry with Backoff

Retry idempotent GETs on transient failures with exponential delay.

```tsx
async function getWithRetry(url: string, attempts = 3) {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.json();
      last = res.status;
    } catch (e) {
      last = e;
    }
    await new Promise((r) => setTimeout(r, 300 * 2 ** i));
  }
  throw last;
}
```

#### Absolute vs Relative Image URI

Remote URIs need `https://...`. Local picker URIs are device paths; do not prefix them as if they were web paths.

```tsx
const source = uri.startsWith("http") ? { uri } : { uri: localFileUri };
```

## Related

* [Storage and Secure Data](https://docs.wahwei/reactnative.codeguides.io/code-reference/storage-and-secure-data/) - tokens for Authorization headers
* [App State and Hooks](https://docs.wahwei/reactnative.codeguides.io/code-reference/app-state-and-hooks/) - pause media when backgrounded
* [Performance and Lists](https://docs.wahwei/reactnative.codeguides.io/code-reference/performance-and-lists/) - image sizing in lists

### External Related Links

* [reactnative.directory](https://reactnative.directory/) - community library directory (compatibility, New Architecture flags)
* [docs.expo.dev](https://docs.expo.dev/) - official Expo docs (recommended framework)
* [reactnative.dev](https://reactnative.dev/) - official React Native site

> **Stack versions:** React 19.2.3 · React Native 0.86.0 · Expo SDK 57

Reviewed by Chris St. John·Last updated Jul 18, 2026
