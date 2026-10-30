# Media & Camera Highlights Summary

Every highlight bullet from the 7 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Media & Camera Highlights Summary

* Capture: expo-camera for live preview; expo-image-picker for library picks
* Default to expo-image for remote URLs - disk and memory caching are built in
* Only one CameraView preview may be active - unmount on blur
* useVideoPlayer owns lifecycle - prefer it over createVideoPlayer unless you manually release
* Skia draws on the GPU - prefer Canvas over hundreds of animated Views
* Development build required - react-native-maps is not in Expo Go

## [Media Basics](https://docs.wahwei/reactnative.codeguides.io/media-camera/media-basics/)

* Capture: expo-camera for live preview; expo-image-picker for library picks
* Display: expo-image for feeds and avatars - not React Native Image for remote URLs
* Playback: expo-video with useVideoPlayer - retire expo-av for new screens
* Edit: expo-image-manipulator for resize/compress; native pipelines for heavy video
* Maps and GPU drawing are separate native stacks - dev client required
* Downscale before preview - full-resolution URIs in state cause OOM on Android
* Request permissions in context - never camera on mount without explaining why

## [expo-image](https://docs.wahwei/reactnative.codeguides.io/media-camera/expo-image/)

* Default to expo-image for remote URLs - disk and memory caching are built in
* BlurHash and ThumbHash placeholders remove layout shift in feeds
* recyclingKey prevents wrong thumbnails flashing in FlashList rows
* prefetch high-priority URLs before navigation
* writeToCacheAsync seeds disk cache from picker or FileSystem downloads
* onProgress enables progressive loading indicators without blocking JS

## [expo-camera](https://docs.wahwei/reactnative.codeguides.io/media-camera/expo-camera/)

* Only one CameraView preview may be active - unmount on blur
* Debounce onBarcodeScanned - callbacks fire many times per second
* enableTorch for low-light scan lanes; turn off on unmount
* Wait for onCameraReady before takePictureAsync
* Pause preview when sheet closes - preview GPU cost is continuous
* Pair capture with expo-image-manipulator before preview in lists

## [expo-video](https://docs.wahwei/reactnative.codeguides.io/media-camera/expo-video/)

* useVideoPlayer owns lifecycle - prefer it over createVideoPlayer unless you manually release
* Player state is not React state - subscribe with useEvent or useEventListener
* Background audio and PiP require expo-video config plugin + rebuild
* Preload with a second useVideoPlayer before attaching VideoView
* On Android, one VideoView per player - duplicate views fail
* Pause and replaceAsync when leaving screens - audio leaks are store-review risks

## [react-native-skia](https://docs.wahwei/reactnative.codeguides.io/media-camera/react-native-skia/)

* Skia draws on the GPU - prefer Canvas over hundreds of animated Views
* useFont and useImage load assets once; pass to draw calls
* Path and RoundedRect excel at sparklines and ring gauges
* Reanimated + Skia run animations on the UI thread when wired correctly
* Development build required - not available in Expo Go
* Cap path complexity on low-end Android - profile frame time

## [react-native-maps](https://docs.wahwei/reactnative.codeguides.io/media-camera/react-native-maps/)

* Development build required - react-native-maps is not in Expo Go
* Config plugin injects Google Maps API keys at prebuild
* tracksViewChanges={false} on markers after custom views settle
* Cluster with supercluster - do not render 2k raw Marker children
* UrlTile serves offline MBTiles or cached raster tiles
* Never embed full MapView inside every FlatList row

## [Media Best Practices](https://docs.wahwei/reactnative.codeguides.io/media-camera/best-practices/)

* Downscale captures before preview or upload - full-res URIs OOM Android mid-tier devices
* expo-image for remote feeds; recyclingKey in virtualized lists
* One CameraView session; unmount preview on navigation blur
* expo-video players need useEvent - pause on screen exit
* Maps and Skia require dev builds - profile on low-end hardware
* Permission copy must explain value - request in context not on cold start

pbqrthvqrf.vb|ptvb957|202607

Reviewed by Chris St. John·Last updated Jul 19, 2026
