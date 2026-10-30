# expo-image

Caching, placeholders, `writeToCacheAsync`, and progressive loading - the `expo-image` cookbook for Expo SDK 57 feeds, galleries, and offline-first thumbnails.

Highlights / expo-image

* Default to expo-image for remote URLs - disk and memory caching are built in
* BlurHash and ThumbHash placeholders remove layout shift in feeds
* recyclingKey prevents wrong thumbnails flashing in FlashList rows
* prefetch high-priority URLs before navigation
* writeToCacheAsync seeds disk cache from picker or FileSystem downloads
* onProgress enables progressive loading indicators without blocking JS

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install expo-image
```

```tsx
import { Image } from "expo-image";
 
const BLURHASH =
  "L6PZfSi_.AyE_3t7t7R**0o#DgR4";
 
export function FeedThumb({ uri }: { uri: string }) {
  return (
    <Image
      source={{ uri }}
      placeholder={{ blurhash: BLURHASH }}
      placeholderContentFit="cover"
      contentFit="cover"
      transition={300}
      cachePolicy="memory-disk"
      style={{ width: "100%", aspectRatio: 1, borderRadius: 8 }}
    />
  );
}
```

```ts
// Seed cache after expo-image-picker returns a local URI
import { Image } from "expo-image";
 
export async function cachePickedPhoto(localUri: string, assetId: string) {
  const cacheKey = `upload:${assetId}`;
  await Image.writeToCacheAsync(localUri, cacheKey);
  return cacheKey;
}
```

**When to reach for this:**

* Avatar grids, product catalogs, and social feeds with remote URLs.
* Screens that need **BlurHash** or **ThumbHash** placeholders from your API.
* FlashList or FlatList rows where the previous row's image flashes during recycle.
* Offline or spotty networks where **disk cache** should survive app restarts.

**When to avoid:**

* Tiny static `require()` icons only - RN `Image` is fine.
* PDF pages or document previews - use `expo-document-picker` and a document viewer.
* Full-screen pinch-zoom galleries with complex gestures - consider a dedicated gallery library on top of `expo-image`.

## Working Example

Feed row with progressive bytes, cache seeding from capture, and list-safe recycling.

```bash
npx expo install expo-image expo-image-picker
```

```tsx
// src/media/FeedImageRow.tsx
import { useState } from "react";
import { Image, ImageLoadEventData } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
 
type Props = {
  id: string;
  uri: string;
  blurhash: string;
  width: number;
};
 
export function FeedImageRow({ id, uri, blurhash, width }: Props) {
  const [progress, setProgress] = useState(0);
 
  return (
    <View style={[styles.card, { width }]}>
      <Image
        source={{ uri, cacheKey: `feed:${id}` }}
        recyclingKey={id}
        placeholder={{ blurhash }}
        placeholderContentFit="cover"
        contentFit="cover"
        cachePolicy="memory-disk"
        priority="normal"
        transition={250}
        onProgress={({ loaded, total }) => {
          if (total > 0) setProgress(loaded / total);
        }}
        onLoad={() => setProgress(1)}
        style={styles.image}
      />
      {progress > 0 && progress < 1 ? (
        <Text style={styles.progress}>{Math.round(progress * 100)}%</Text>
      ) : null}
    </View>
  );
}
 
const styles = StyleSheet.create({
  card: { aspectRatio: 4 / 3, borderRadius: 10, overflow: "hidden", backgroundColor: "#e5e7eb" },
  image: { flex: 1 },
  progress: {
    position: "absolute",
    bottom: 8,
    right: 8,
    fontSize: 11,
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
```

```ts
// src/media/prefetchFeed.ts
import { Image } from "expo-image";
 
export async function prefetchNextPage(urls: string[]) {
  return Image.prefetch(urls, { cachePolicy: "memory-disk" });
}
```

**What this demonstrates:**

* **`recyclingKey={id}`** blanks the cell before the new source loads - critical in virtualized lists.
* **`onProgress`** drives a lightweight percent label without custom download code.
* **`cacheKey` in source** pairs with `writeToCacheAsync` for captures you already own.
* **`Image.prefetch`** warms disk + memory before the user opens a detail screen.

## Deep Dive

### Cache policies

| `cachePolicy` | Behavior | Use when |
| --- | --- | --- |
| `disk` (default) | Download once, read from disk later | Most remote thumbnails |
| `memory-disk` | Hot in RAM, falls back to disk | Avatars shown on many screens |
| `memory` | RAM only, evicted aggressively | Hero image on one screen visit |
| `none` | Always refetch | Signed URLs that expire quickly |

```tsx
<Image source={{ uri: signedUrl }} cachePolicy="none" />
```

Signed URLs with short TTL should use **`none`** or a cache key that rotates when the signature rotates.

### Placeholders: BlurHash, ThumbHash, and local

```tsx
<Image
  source="https://cdn.example.com/hero.webp"
  placeholder={{ blurhash: post.blurhash }}
  placeholderContentFit="cover"
  contentFit="cover"
  transition={400}
/>
```

* Match **`placeholderContentFit`** to **`contentFit`** - default `scale-down` on placeholders causes flicker.
* **ThumbHash** is smaller than BlurHash for some assets - backend can emit either.
* For local low-res previews, pass a **`number`** from `require()` as placeholder while the HD URL loads.

### writeToCacheAsync workflow

```ts
import { Image } from "expo-image";
import * as FileSystem from "expo-file-system";
 
export async function cacheDownloadedFile(remoteUrl: string, stableId: string) {
  const tempUri = `${FileSystem.cacheDirectory}dl-${stableId}.jpg`;
  await FileSystem.downloadAsync(remoteUrl, tempUri);
  const cacheKey = `asset:${stableId}`;
  await Image.writeToCacheAsync(tempUri, cacheKey);
  return { cacheKey, displayUri: tempUri };
}
```

```tsx
<Image source={{ uri: displayUri, cacheKey }} contentFit="cover" style={{ flex: 1 }} />
```

* Pass a **local file URI** or **`ImageRef`** from `takePictureAsync({ pictureRef: true })`.
* Animated GIF/WebP from `ImageRef` **flattens to one frame** - pass the file URI for lossless animation.
* Later renders with the same **`cacheKey`** skip network entirely.

### Progressive loading in product UX

```tsx
function onProgress(event: { loaded: number; total: number }) {
  const ratio = event.total > 0 ? event.loaded / event.total : 0;
  // Drive a determinate bar or skeleton width - keep work O(1)
}
```

* **`onLoadStart` / `onLoad` / `onDisplay`** mark skeleton → loaded → painted transitions.
* Do not store **every** progress event in global state - update local row state only.
* Combine with **`priority="high"`** for above-the-fold hero images.

### List hygiene

```tsx
<Image
  recyclingKey={item.id}
  source={{ uri: item.thumbUrl, cacheKey: `thumb:${item.id}` }}
  allowDownscaling
  style={{ width: 72, height: 72 }}
/>
```

* **`allowDownscaling`** (default `true`) decodes near view size - leave on unless you need max quality in a tiny box.
* **`enforceEarlyResizing`** on iOS reduces peak memory for oversized CDN assets.
* Pair with [List Performance Tuning](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/list-performance-tuning/) memo rules.

### Cache maintenance

```ts
await Image.clearMemoryCache();
await Image.clearDiskCache();
```

Call from a **Settings → Clear cache** action or when the user logs out. Disk clear is async and should not run on every screen focus.

## Gotchas

* **Missing `recyclingKey` in FlashList** - previous user's avatar flashes. **Fix:** `recyclingKey={item.id}`.
* **Placeholder fit mismatch** - shimmer jumps when HD loads. **Fix:** `placeholderContentFit="cover"` matching `contentFit`.
* **Caching expiring signed URLs** - stale image or 403 loops. **Fix:** `cachePolicy="none"` or rotate `cacheKey` with signature.
* **RN `Image` migration** - `resizeMode` maps to `contentFit`, not 1:1 for all values. **Fix:** read the prop table when porting.
* **`writeToCacheAsync` on remote URL** - API expects local file. **Fix:** download to cache dir first.
* **Huge animated WebP in avatar list** - decodes every frame. **Fix:** serve static thumb URL; load animation only on detail.

## Alternatives

| Alternative | Use when | Don't use when |
| --- | --- | --- |
| `expo-image` | Remote feeds, caching, placeholders | You only render bundled PNGs |
| RN `Image` | Legacy screens, `require()` icons | New feed development |
| `react-native-fast-image` | Brownfield app already standardized on it | Greenfield Expo SDK 57 |
| Skia `useImage` | GPU canvas drawing | Simple `<Image>` thumbnails |

## FAQs

How do I install expo-image on SDK 57?

```bash
npx expo install expo-image
```

Works in Expo Go - no config plugin required for basic usage.

BlurHash - who generates it?

* Backend at upload time (common) or an edge worker.
* Store the hash string on the post model; never compute BlurHash on the client for every row.

When should I prefetch?

* Before navigating to a gallery or detail screen with known URLs.
* After page-one feed load, prefetch page-two thumbs during idle time - cap concurrent URLs.

Does expo-image work with expo-image-picker output?

* Yes - call `writeToCacheAsync(pickerUri, cacheKey)` then render with the same `cacheKey`.
* See [expo-camera & expo-image-picker](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-camera-and-expo-image-picker/) for capture hygiene.

How is this different from expo-video caching?

* `expo-image` caches **still** assets via SDWebImage/Glide.
* `expo-video` has a separate **video** cache API - see [expo-video](https://docs.wahwei/reactnative.codeguides.io/media-camera/expo-video/).

## Related

* [Media Basics](https://docs.wahwei/reactnative.codeguides.io/media-camera/media-basics/) - capture vs display module choice
* [expo-camera & expo-image-picker](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-camera-and-expo-image-picker/) - capture and library flows
* [List Performance Tuning](https://docs.wahwei/reactnative.codeguides.io/lists-scrolling/list-performance-tuning/) - memo and recycling
* [expo-video](https://docs.wahwei/reactnative.codeguides.io/media-camera/expo-video/) - video playback cache
* [Media Best Practices](https://docs.wahwei/reactnative.codeguides.io/media-camera/best-practices/) - compress and memory checklist

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

NzA2MjAyfDUxOW9pZ2N8b2kuc2VkaXVnZWRvYw==

Reviewed by Chris St. John·Last updated Jul 19, 2026
