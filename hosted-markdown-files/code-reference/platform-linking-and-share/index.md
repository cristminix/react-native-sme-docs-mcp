# Platform Linking and Share

Cross-platform branches, deep links out of the app, share sheets, and system dialogs.

Highlights / Platform Linking and Share

* Platform.OS Branch
* Linking openURL
* Share API
* Clipboard Set String
* Alert confirm

#### Platform.OS Branch

Branch on `"ios" | "android" | "web"` when APIs or UX truly differ.

```tsx
import { Platform, Text } from "react-native";
 
const label = Platform.OS === "ios" ? "Hold to reorder" : "Long-press to reorder";
return <Text>{label}</Text>;
```

#### Platform.select Values

Pick values (styles, components, numbers) per platform in one expression.

```tsx
const hit = Platform.select({ ios: 12, android: 16, default: 12 });
```

#### Platform.Version Check

Gate features that need a minimum OS version (Android API level is numeric; iOS is a string version).

```tsx
const supportsFeature =
  Platform.OS === "android" ? Number(Platform.Version) >= 33 : true;
```

#### Linking openURL

Open https, tel, mailto, or custom schemes in another app.

```tsx
import { Linking } from "react-native";
 
await Linking.openURL("https://expo.dev");
```

#### Linking canOpenURL

On iOS, declare schemes in `Info.plist` / app config and check before opening.

```tsx
const url = "twitter://user?screen_name=expo";
if (await Linking.canOpenURL(url)) await Linking.openURL(url);
else await Linking.openURL("https://twitter.com/expo");
```

#### Linking getInitialURL

Read the URL that launched a cold start (pair with Expo Router linking config).

```tsx
const initial = await Linking.getInitialURL();
if (initial) handleUrl(initial);
```

#### Linking addEventListener

Handle links while the app is already running.

```tsx
useEffect(() => {
  const sub = Linking.addEventListener("url", ({ url }) => handleUrl(url));
  return () => sub.remove();
}, []);
```

#### Share API

Present the OS share sheet with text and optional URL.

```tsx
import { Share } from "react-native";
 
await Share.share({ message: "Check this out", url: "https://example.com" });
```

#### Clipboard Set String

Copy text with `expo-clipboard` for a consistent Expo API.

```tsx
import * as Clipboard from "expo-clipboard";
 
await Clipboard.setStringAsync(inviteCode);
```

#### Open Settings App

Send users to system settings when permissions are blocked.

```tsx
import { Linking } from "react-native";
 
await Linking.openSettings();
```

#### Constants expo-constants

Read app config, `extra`, and execution environment from `expo-constants`.

```tsx
import Constants from "expo-constants";
 
const apiUrl = Constants.expoConfig?.extra?.apiUrl as string | undefined;
```

#### Device info expo-device

Query device name/model when useful for support diagnostics (avoid over-collecting PII).

```tsx
import * as Device from "expo-device";
 
const summary = `${Device.osName} ${Device.modelName ?? "unknown"}`;
```

#### Application app version

Surface native app version in settings/about screens.

```tsx
import Constants from "expo-constants";
 
const version = Constants.nativeAppVersion ?? Constants.expoConfig?.version;
```

#### Alert confirm

System alert with buttons - fine for destructive confirms without a custom modal.

```tsx
import { Alert } from "react-native";
 
Alert.alert("Delete item?", "This cannot be undone.", [
  { text: "Cancel", style: "cancel" },
  { text: "Delete", style: "destructive", onPress: onDelete },
]);
```

#### ActionSheetIOS

iOS-only action sheet for lightweight menus; use a cross-platform library on Android.

```tsx
import { ActionSheetIOS, Platform } from "react-native";
 
if (Platform.OS === "ios") {
  ActionSheetIOS.showActionSheetWithOptions(
    { options: ["Cancel", "Edit", "Delete"], cancelButtonIndex: 0, destructiveButtonIndex: 2 },
    (i) => {
      if (i === 1) onEdit();
      if (i === 2) onDelete();
    },
  );
}
```

## Related

* [Expo Router Navigation](https://docs.wahwei/reactnative.codeguides.io/code-reference/expo-router-navigation/) - in-app routes and deep link paths
* [Storage and Secure Data](https://docs.wahwei/reactnative.codeguides.io/code-reference/storage-and-secure-data/) - persist tokens after auth links
* [Networking Images Media](https://docs.wahwei/reactnative.codeguides.io/code-reference/networking-images-media/) - network after outbound links

### External Related Links

* [reactnative.dev/docs](https://reactnative.dev/docs/getting-started) - full RN documentation
* [Android Developers](https://developer.android.com/) - Android platform docs (native details)
* [Apple Developer](https://developer.apple.com/) - Apple platform docs (native details)

> **Stack versions:** React 19.2.3 · React Native 0.86.0 · Expo SDK 57

Reviewed by Chris St. John·Last updated Jul 18, 2026
