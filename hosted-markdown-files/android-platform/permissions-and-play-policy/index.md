# Permissions & Play Policy

Runtime permissions, the system photo picker, and Google Play **Data safety** - the Android compliance cookbook for Expo SDK 57 apps. Manifest entries tell the OS what you *might* request; runtime prompts and Play Console forms must reflect what you *actually* do.

Highlights / Permissions & Play Policy

* Dangerous permissions require runtime prompts - manifest declaration alone is not enough
* Android 13+ photo picker avoids broad storage READ permissions for one-off image selection
* POST\_NOTIFICATIONS is runtime on Android 13+ - request before sending FCM marketing pushes
* Play Console Data safety form must match actual SDK and API behavior - mismatches trigger rejection
* Declare only permissions you use - Play policy flags READ\_MEDIA\_IMAGES and location as high scrutiny

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install expo-image-picker expo-camera
```

```tsx
// features/media/pickAvatar.ts - photo picker without broad storage access
import * as ImagePicker from "expo-image-picker";
import { Alert, Linking, Platform } from "react-native";
 
export async function pickAvatar(): Promise<ImagePicker.ImagePickerAsset | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Photos access needed",
      "Enable photo access in Settings to choose a profile picture.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => Linking.openSettings() },
      ],
    );
    return null;
  }
 
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
    // Android 13+ uses system photo picker when available - no READ_MEDIA_IMAGES for one-off pick
  });
 
  if (result.canceled) return null;
  return result.assets[0] ?? null;
}
```

```ts
// app.config.ts - declare only what modules need; block accidental permissions
export default {
  expo: {
    android: {
      package: "com.example.shopapp",
      permissions: [
        "CAMERA", // expo-camera
        // Avoid legacy WRITE_EXTERNAL_STORAGE - not needed for picker flows
      ],
      blockedPermissions: [
        "READ_MEDIA_VIDEO", // example: app never reads video library
      ],
    },
    plugins: [
      [
        "expo-image-picker",
        {
          photosPermission:
            "Allow ShopApp to access your photos for profile and receipt uploads.",
          cameraPermission: "Allow ShopApp to take photos for support tickets.",
        },
      ],
    ],
  },
};
```

**When to reach for this:**

* Play Console rejects the build for undeclared or overbroad permissions.
* Users see permission prompts at launch instead of in context.
* You are filling the **Data safety** questionnaire and need to map SDKs to collected data types.
* Android 14+ devices deny `READ_MEDIA_IMAGES` - picker-first flows still work.

## Working Example

**Step 1 - Contextual camera permission**

```tsx
import { CameraView, useCameraPermissions } from "expo-camera";
import { Button, Text, View } from "react-native";
 
export function ScanReceiptScreen() {
  const [permission, requestPermission] = useCameraPermissions();
 
  if (!permission) return <View />; // hook loading
 
  if (!permission.granted) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
        <Text>We need camera access to scan your receipt.</Text>
        <Button title="Continue" onPress={requestPermission} />
      </View>
    );
  }
 
  return <CameraView style={{ flex: 1 }} facing="back" />;
}
```

**Step 2 - Notifications (Android 13+)**

```tsx
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
 
export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== "android" || Platform.Version < 33) return true;
 
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
 
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}
```

**Step 3 - Audit merged manifest after prebuild**

```bash
npx expo prebuild --platform android
rg "uses-permission" android/app/src/main/AndroidManifest.xml
```

**Step 4 - Data safety alignment checklist**

| App behavior | Data safety declaration |
| --- | --- |
| `expo-image-picker` one-off photo | Photos/videos - **ephemeral** or **not collected** if never uploaded |
| Upload avatar to your API | Photos - **collected**, purpose Account management |
| `expo-location` foreground | Location - **approximate/precise**, purpose App functionality |
| Firebase Analytics | Device IDs, app interactions - declare per Firebase docs |
| Crash reporting (Sentry) | Diagnostics - crash logs |

**What this demonstrates:**

* **Just-in-time prompts** - explain *why* before `requestPermission`.
* **Plugin permission strings** - user-facing rationale on the system dialog.
* **`blockedPermissions`** - strip transitive permissions from dependencies.
* **Data safety** - map each Expo module to Play Console categories.

## Deep Dive

### How It Works

* **Install-time permissions** (`INTERNET`, `VIBRATE`) are granted at install - no runtime dialog.
* **Dangerous permissions** (`CAMERA`, `ACCESS_FINE_LOCATION`, `RECORD_AUDIO`, `POST_NOTIFICATIONS`) require runtime request on Android 6+.
* **Manifest merge** - Expo modules and config plugins add `<uses-permission>` entries; `npx expo prebuild` produces the merged manifest.
* **Photo picker (Android 13+)** - `ACTION_PICK_IMAGES` / system picker returns URIs without persistent broad storage access - preferred for profile photo, attachment flows.
* **Play policy** - Google reviews permission use against declared features; "feature not core to app purpose" is a common rejection for location and SMS.

### Permission Classes RN Apps Hit

| Permission | When needed | Expo module | Play scrutiny |
| --- | --- | --- | --- |
| `CAMERA` | QR scan, capture | `expo-camera` | Medium - justify in UI |
| `ACCESS_FINE_LOCATION` | Maps, delivery | `expo-location` | **High** - must be core feature |
| `POST_NOTIFICATIONS` | Push (API 33+) | `expo-notifications` | Medium |
| `READ_MEDIA_IMAGES` | Legacy gallery crawl | Avoid - use picker | **High** on Play |
| `RECORD_AUDIO` | Video, voice | `expo-av`, camera | Medium |
| `READ_CONTACTS` | Invite friends | Rare - avoid | **High** |

### Photo Picker vs Storage Permissions

| Approach | UX | Policy risk | Expo API |
| --- | --- | --- | --- |
| System photo picker | User selects specific items | Low | `launchImageLibraryAsync` |
| `READ_MEDIA_IMAGES` | App reads entire library | High - needs strong justification | Only if continuous gallery sync |
| `READ_EXTERNAL_STORAGE` (≤ API 32) | Legacy | Deprecated path | Migrate on SDK bump |

```tsx
// Prefer picker - do not request broad storage for a single upload
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ["images"],
  selectionLimit: 1,
});
```

### Data Safety Form Mental Model

1. **Data types** - location, photos, contacts, financial info, etc.
2. **Collected vs shared** - your servers vs third-party SDKs.
3. **Purpose** - app functionality, analytics, advertising (advertising triggers extra review).
4. **Security practices** - encryption in transit (HTTPS) at minimum.
5. **Deletion** - account settings or support email for erasure requests.

Cross-check against:

* Your privacy policy URL (required in Play Console).
* SDK privacy manifests / data collection docs (Sentry, Firebase, Stripe, etc.).
* Actual network traffic - undeclared analytics is a policy violation.

### Android 14+ Partial Grants

* Users can grant **selected photos** instead of full library access.
* Handle `permission.granted === false` and `canAskAgain === false` - route to Settings.
* Re-request only after user taps an action that needs access - not on cold start.

```tsx
import { Linking } from "react-native";
 
if (!permission.canAskAgain) {
  await Linking.openSettings();
}
```

## Gotchas

* **Requesting all permissions at splash** - Play policy and UX both punish this. **Fix:** Just-in-time, with rationale UI before the system dialog.
* **Transitive permissions from unused SDKs** - Analytics SDK adds location. **Fix:** `blockedPermissions` + remove unused deps; verify merged manifest.
* **Data safety says "no data collected" but Sentry ships** - Automatic rejection risk. **Fix:** Declare diagnostics; link SDK docs in internal compliance sheet.
* **Missing `POST_NOTIFICATIONS` on API 33+** - Push silently fails. **Fix:** Request before `getExpoPushTokenAsync`.
* **Legacy `WRITE_EXTERNAL_STORAGE`** - Unnecessary for picker uploads on modern APIs. **Fix:** Remove from `app.config` permissions; use content URIs.
* **iOS parity assumptions** - iOS photo library wording differs; Android has picker + partial grants. **Fix:** Platform-specific copy in pre-permission screens.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| System photo picker | One-off image selection | Background sync of entire camera roll |
| `expo-document-picker` | PDFs, files | Camera capture |
| In-app browser for uploads | Zero storage permission | Native crop/edit UX required |
| Coarse location only | Weather, regional content | Turn-by-turn navigation |

## FAQs

Where do I declare Android permissions in Expo?

* `app.config.ts` → `expo.android.permissions` adds declarations.
* Config plugins (e.g. `expo-image-picker`) add permissions and rationale strings.
* Run prebuild and inspect merged manifest - source of truth for what ships.

Do I need READ\_MEDIA\_IMAGES for expo-image-picker?

* On Android 13+, the system picker path often avoids broad storage permission for single selection.
* If Play flags the permission, verify merged manifest and update to latest `expo-image-picker` - remove unused declarations.

How does Play verify permission usage?

* Automated scans of manifest + manual review for sensitive permissions.
* Declaration in **App content → Sensitive app permissions** must match feature videos and in-app flows.

What is the Data safety form?

* Mandatory Play Console questionnaire describing what user data the app collects and shares.
* Must align with privacy policy and actual SDK behavior - updated when you add analytics or auth.

Can I remove a permission added by a dependency?

* Yes - `expo.android.blockedPermissions` strips entries at merge time.
* Also remove the SDK if unused - blocked permissions do not stop JS from calling dead APIs.

How do I test permission denial paths?

* `adb shell pm clear com.example.shopapp` resets grants.
* Emulator **Settings → Apps → Your app → Permissions** toggles individual grants.

Does foreground location need a background permission?

* Only if you track location while app is backgrounded - requires separate `ACCESS_BACKGROUND_LOCATION` and heavy Play scrutiny.
* Maps on screen → foreground `ACCESS_FINE_LOCATION` only.

What about App Links and permissions?

* App Links ([Android App Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/android-app-links/)) do not require extra dangerous permissions - only intent filters and verification.

How often must Data safety be updated?

* On every release that adds SDKs, login, payments, or analytics.
* Treat it as part of the release checklist alongside version code bump.

Are permission strings localized?

* Plugin `photosPermission` strings are static in config - use `app.config.ts` with locale env for multi-language builds or per-flavor config.

## Related

* [Android Basics for RN Devs](https://docs.wahwei/reactnative.codeguides.io/android-platform/android-basics-for-rn-devs/) - merged manifest inspection
* [Signing & Play App Signing](https://docs.wahwei/reactnative.codeguides.io/android-platform/signing-and-play-app-signing/) - release identity (separate from permissions)
* [Internal Testing Tracks](https://docs.wahwei/reactnative.codeguides.io/android-platform/internal-testing-tracks/) - policy fixes ship to internal track first
* [../deep-linking/android-app-links/android-app-links.md](https://docs.wahwei/reactnative.codeguides.io/deep-linking/android-app-links/) - verified links without extra permissions
* [../store-operations/google-play-console-workflow/google-play-console-workflow.md](https://docs.wahwei/reactnative.codeguides.io/store-operations/google-play-console-workflow/) - full Play Console checklist
* [../native-modules/config-plugins/config-plugins.md](https://docs.wahwei/reactnative.codeguides.io/native-modules/config-plugins/) - custom manifest permissions via plugins

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
