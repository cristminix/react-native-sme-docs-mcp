# Media Best Practices

A condensed summary of the 25 most important best practices drawn from every page in this section.

Highlights / Media Best Practices

* Downscale captures before preview or upload - full-res URIs OOM Android mid-tier devices
* expo-image for remote feeds; recyclingKey in virtualized lists
* One CameraView session; unmount preview on navigation blur
* expo-video players need useEvent - pause on screen exit
* Maps and Skia require dev builds - profile on low-end hardware
* Permission copy must explain value - request in context not on cold start

1. **Classify the job first:** Capture, display, playback, and editing use different modules - do not default to one package for every screen.
2. **Install with `npx expo install`:** Pin `expo-image`, `expo-camera`, and `expo-video` to SDK 57–tested native binaries - avoid `npm install @latest` on native media packages.
3. **Use expo-image for remote URLs:** Disk and memory caching, BlurHash placeholders, and transitions beat raw React Native `Image` in feeds.
4. **Compress before upload:** Run `expo-image-manipulator` (max width 1280–1920, JPEG ~0.75) before preview and multipart upload - store URIs, not base64, in state.
5. **Seed disk cache after capture:** `Image.writeToCacheAsync(localUri, cacheKey)` pairs with the same `cacheKey` in `source` for instant list thumbnails after picker or camera output.
6. **Set `recyclingKey` in virtualized lists:** FlashList and FlatList rows must reset image cells when IDs change - prevents avatar flash from recycled views.
7. **Prefetch the next screen's URLs:** `Image.prefetch(urls, { cachePolicy: "memory-disk" })` during idle time after page-one load - cap concurrency.
8. **Request camera permission in context:** Explain why capture is needed, then call `requestPermission` - cold-start permission prompts increase denials.
9. **Offer library fallback:** Pair `expo-camera` with `expo-image-picker` so deny paths still attach photos - see [expo-camera & expo-image-picker](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-camera-and-expo-image-picker/).
10. **Only one active CameraView:** Unmount or gate with `useIsFocused` when tabs or modals hide the preview - two sessions cause black preview or crashes.
11. **Debounce barcode scans:** `onBarcodeScanned` fires continuously - 1–2 second debounce and unset handler after success before navigating.
12. **Wait for `onCameraReady`:** `takePictureAsync` before ready throws or returns blank frames on Android - gate the shutter button.
13. **Turn torch off on unmount:** `enableTorch` drains battery and blinds warehouse cameras left enabled in background tabs.
14. **Pause camera preview under sheets:** `pausePreview()` while overlays cover the viewfinder - preview GPU cost is continuous.
15. **Adopt expo-video for new playback:** `useVideoPlayer` + `VideoView` with automatic disposal - retire `expo-av` on touched screens.
16. **Subscribe to player events:** `player.playing` does not re-render React - use `useEvent` or `useEventListener` from `expo` for controls and status UI.
17. **Pause video on navigation blur:** `useFocusEffect` cleanup calling `player.pause()` prevents audio bleed and background review complaints.
18. **Mute feed autoplay by default:** Grid clips should set `player.muted = true` until explicit user unmute - unexpected audio is a top rejection theme.
19. **Configure background audio and PiP at build time:** `expo-video` config plugin `supportsBackgroundPlayback` and `supportsPictureInPicture` require rebuild - runtime props alone are insufficient.
20. **Preload adjacent video sources:** Second `useVideoPlayer(nextUri)` fills buffers before `replaceAsync` - one `VideoView` per player on Android.
21. **Cap Skia path complexity:** Memoize `Skia.Path` builds; downsample chart series - GPU drawing still costs JS preparation time.
22. **Use Skia for charts, not list thumbnails:** `expo-image` owns raster caching; Skia excels at ring gauges, sparklines, and composited overlays.
23. **Cluster map markers:** Do not mount thousands of `<Marker>` nodes - `supercluster` or server aggregation with `tracksViewChanges={false}` on settled custom pins.
24. **Never embed MapView in every list row:** Open a full-screen map route or show static snapshots - embedded maps choke scroll and GPU.
25. **Profile on mid-tier Android:** iPhone Pro cameras and simulators hide preview jank, decoder stalls, and OOM - run the media checklist on a Pixel A-series before release.

## FAQs

What is the fastest win for media OOM crashes?

* Stop storing full-resolution capture URIs in React state.
* Downscale with `expo-image-manipulator` before any `expo-image` or upload pipeline.

Expo Go or dev client for media QA?

* **Expo Go** covers `expo-image`, `expo-camera`, and basic `expo-video`.
* **Dev client** is required for `react-native-maps`, Skia, PiP, and background audio verification.

Where is the capture permission cookbook?

* [expo-camera & expo-image-picker](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-camera-and-expo-image-picker/) - plugin strings, library fallback, manipulator resize.

Should signed CDN URLs be cached?

* Use `cachePolicy="none"` or rotate `cacheKey` when the signature expires - stale disk entries cause 403 loops.

How do I clear image cache on logout?

```ts
await Image.clearMemoryCache();
await Image.clearDiskCache();
```

Run from settings or session teardown - not on every screen focus.

## Related

* [Media Basics](https://docs.wahwei/reactnative.codeguides.io/media-camera/media-basics/) - 10 module-selection examples
* [expo-image](https://docs.wahwei/reactnative.codeguides.io/media-camera/expo-image/) - caching and `writeToCacheAsync`
* [expo-camera](https://docs.wahwei/reactnative.codeguides.io/media-camera/expo-camera/) - barcode, torch, preview limits
* [expo-video](https://docs.wahwei/reactnative.codeguides.io/media-camera/expo-video/) - lifecycle, background audio, PiP
* [react-native-skia](https://docs.wahwei/reactnative.codeguides.io/media-camera/react-native-skia/) - GPU charts and drawing
* [react-native-maps](https://docs.wahwei/reactnative.codeguides.io/media-camera/react-native-maps/) - markers, clustering, offline tiles
* [expo-camera & expo-image-picker](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-camera-and-expo-image-picker/) - capture flows and memory safety

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
