# expo-notifications

Permissions, channels, foreground handling, and push token registration - the `expo-notifications` cookbook for Expo SDK 57 apps that need local alerts and remote push.

Highlights / expo-notifications

* Request notification permission after an in-app rationale - not on first mount
* Android 13+ requires POST\_NOTIFICATIONS - create channels before posting
* setNotificationHandler controls foreground banners on iOS
* Push tokens require a development build and EAS projectId - Expo Go is limited
* Register token server-side per device - rotate on reinstall and logout
* Import notification handlers at app entry before the first push arrives

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install expo-notifications expo-device expo-constants
```

```ts
// src/notifications/setup.ts - import at app entry
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
 
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
 
export async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
 
  await Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}
 
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
 
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}
```

```ts
// src/notifications/pushToken.ts
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
 
export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
 
  const granted = await requestNotificationPermission();
  if (!granted) return null;
 
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
 
  if (!projectId) {
    throw new Error("EAS projectId missing - run npx eas init");
  }
 
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}
```

**When to reach for this:**

* Order status, chat messages, or appointment reminders via push.
* Local scheduled reminders (medication, shift start) without a server.
* Foreground notification banners while the user is in-app.
* Badge counts on iOS home screen icons.

**When to avoid:**

* Real-time chat delivery alone - pair push with foreground refetch or WebSockets.
* Critical financial confirmations without in-app confirmation UI.
* High-frequency analytics - notification permission is scarce; do not waste it.

## Working Example

Permission gate, Android channel, token registration, and tap-to-navigate listener.

```bash
npx expo install expo-notifications expo-device expo-constants
```

```tsx
// app/(tabs)/settings/notifications.tsx
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  ensureAndroidChannel,
  requestNotificationPermission,
} from "@/notifications/setup";
import { registerPushToken } from "@/notifications/registerPushToken";
 
export default function NotificationSettingsScreen() {
  const [status, setStatus] = useState<"idle" | "granted" | "denied">("idle");
 
  async function enableNotifications() {
    await ensureAndroidChannel();
    const granted = await requestNotificationPermission();
    if (!granted) {
      setStatus("denied");
      return;
    }
    await registerPushToken();
    setStatus("granted");
  }
 
  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text>Get alerts when drivers arrive on site.</Text>
      <Pressable onPress={enableNotifications}>
        <Text style={{ color: "#2563eb", fontWeight: "600" }}>
          Enable notifications
        </Text>
      </Pressable>
      {status === "denied" && (
        <Text>Open Settings to allow notifications for this app.</Text>
      )}
    </View>
  );
}
```

```ts
// src/notifications/registerPushToken.ts
import { getExpoPushToken } from "./pushToken";
 
export async function registerPushToken() {
  const token = await getExpoPushToken();
  if (!token) return;
 
  await fetch(`${process.env.EXPO_PUBLIC_API_URL}/devices/push-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, platform: "expo" }),
  });
}
```

```tsx
// app/_layout.tsx
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import "@/notifications/setup";
 
export default function RootLayout() {
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const orderId = response.notification.request.content.data?.orderId;
        if (typeof orderId === "string") {
          router.push(`/orders/${orderId}`);
        }
      }
    );
    return () => sub.remove();
  }, []);
 
  return <Stack />;
}
```

**What this demonstrates:**

* **Pre-prompt UX** - user taps "Enable" before the OS dialog.
* **Android channel** created before any notification posts.
* **EAS projectId** wired for `getExpoPushTokenAsync`.
* **Server registration** - token stored per device, not only in React state.
* **Tap handling** - deep link payload in `data.orderId`.

## Deep Dive

### Permission Flow

| Step | API | Notes |
| --- | --- | --- |
| Check current | `getPermissionsAsync()` | `undetermined` on first launch |
| Explain value | In-app screen | Required for App Review narrative |
| Request | `requestPermissionsAsync()` | iOS shows system sheet once per install |
| Android 13+ | Same + channel | `POST_NOTIFICATIONS` runtime permission |

### Android Notification Channels

* Channels are **immutable** in importance after creation - pick `HIGH` only for urgent alerts.
* Create channels **before** `scheduleNotificationAsync` or remote display.
* Use separate channels for marketing vs transactional messages - users can mute marketing only.

### Foreground vs Background

| State | Behavior | Configuration |
| --- | --- | --- |
| Foreground | Banner controlled by `setNotificationHandler` | `shouldShowBanner: true` |
| Background | OS displays per channel settings | Default handler still applies to data-only on Android |
| Killed | Tap opens app; use `getLastNotificationResponseAsync` | Cold-start navigation |

### Push Token Lifecycle

```text
Install → getExpoPushTokenAsync → POST /devices
Reinstall → new token → upsert server row
Logout → DELETE server token + optional unregister
Account switch → register new token under new userId
```

* Tokens change on reinstall - upsert by `deviceId`, not only `userId`.
* Expo push service accepts tokens from `getExpoPushTokenAsync` - production apps often bridge to FCM/APNs directly via EAS credentials.

### Key API Surface

| API | Purpose |
| --- | --- |
| `setNotificationHandler` | Foreground presentation |
| `setNotificationChannelAsync` | Android channel setup |
| `getExpoPushTokenAsync` | Expo push token |
| `scheduleNotificationAsync` | Local scheduled alerts |
| `addNotificationReceivedListener` | Foreground receive |
| `addNotificationResponseReceivedListener` | User tapped notification |
| `getLastNotificationResponseAsync` | Cold-start tap handling |

## Gotchas

* **Requesting permission on mount** - Users tap "Don't Allow" permanently. **Fix:** Pre-prompt screen with value proposition.
* **Missing EAS projectId** - `getExpoPushTokenAsync` throws. **Fix:** `npx eas init` and commit `extra.eas.projectId`.
* **Testing push only in Expo Go** - Limited credentials and icons. **Fix:** Development build with push credentials in EAS.
* **No Android channel** - Notifications silently fail on Android 8+. **Fix:** `setNotificationChannelAsync` before first post.
* **Handler defined in a component** - Misses early notifications. **Fix:** Side-effect import at `index.ts` or `_layout.tsx` top.
* **Trusting notification payload for auth** - `data.token` in push is interceptable. **Fix:** Exchange opaque IDs server-side.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `expo-notifications` local | Scheduled reminders, offline alerts | Server-driven marketing at scale without backend |
| Expo push + EAS | Greenfield Expo apps | You already own FCM/APNs direct integration |
| FCM/APNs direct | Custom payload control | You want fastest Expo setup |
| In-app only (no push) | User is always in-app during task | Field workers who background the app |

## FAQs

How do I install expo-notifications on SDK 57?

```bash
npx expo install expo-notifications expo-device expo-constants
```

Add the config plugin in `app.config.ts` for custom icons and sounds. Rebuild native binary after plugin changes.

Why is getExpoPushTokenAsync null on simulator?

* Push requires a physical device - `Device.isDevice` is false on simulators.
* iOS Simulator supports push only on recent Xcode versions - still prefer hardware for QA.

How do I handle cold-start notification taps?

```ts
const last = await Notifications.getLastNotificationResponseAsync();
if (last) navigateFromNotification(last);
```

* Run once after auth bootstrap - same gating as deep links.

Can I send push without a backend?

* Expo push API accepts HTTPS POST with Expo access token - fine for prototypes.
* Production apps should authenticate senders and rate-limit per user.

How do channels map to categories?

* One channel per notification category (orders, chat, promos).
* Pass `channelId` in `scheduleNotificationAsync` content for local; remote payloads set `channelId` on Android.

## Related

* [Expo SDK Basics](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-sdk-basics/) - install and lifecycle
* [../deep-linking/push-notification-deep-links/push-notification-deep-links.md](https://docs.wahwei/reactnative.codeguides.io/deep-linking/push-notification-deep-links/) - tap → navigate
* [../ota-updates/ota-updates-basics/ota-updates-basics.md](https://docs.wahwei/reactnative.codeguides.io/ota-updates/ota-updates-basics/) - OTA vs native changes for push icons
* [../expo-rules/security-rules-for-mobile/security-rules-for-mobile.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/security-rules-for-mobile/) - never auth via push payload
* [Expo SDK Packages Best Practices](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/best-practices/) - permission UX summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
