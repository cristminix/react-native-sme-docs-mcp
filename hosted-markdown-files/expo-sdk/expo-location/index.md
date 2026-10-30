# expo-location

Foreground/background location, geofencing, and App Store disclosure strings - the `expo-location` cookbook for Expo SDK 57 field and delivery apps.

Highlights / expo-location

* Request When In Use first - upgrade to Always only when background is essential
* Info.plist and Android manifest strings must explain why background access exists
* Background location requires a development build and UIBackgroundModes
* Stop updates on unmount - forgotten watchers drain battery
* Geofencing uses TaskManager.defineTask in global scope
* Never ship vague permission copy - App Review rejects 'This app needs location'

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install expo-location
```

```ts
// app.config.ts - disclosure strings (required for store review)
export default {
  plugins: [
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "FieldTrack shows nearby job sites while you use the app.",
        locationAlwaysAndWhenInUsePermission:
          "FieldTrack records visit coordinates in the background so supervisors see arrival times.",
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
      },
    ],
  ],
};
```

```ts
import * as Location from "expo-location";
 
export async function requestForegroundLocation(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === "granted";
}
 
export async function watchPosition(onUpdate: (loc: Location.LocationObject) => void) {
  const granted = await requestForegroundLocation();
  if (!granted) return null;
 
  return await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 25, // meters - reduce churn vs timeInterval alone
      timeInterval: 10_000,
    },
    onUpdate
  );
}
```

**When to reach for this:**

* Tagging photos and forms with GPS coordinates.
* Showing a map centered on the user's position.
* Background visit verification for field technicians.
* Geofence entry/exit for warehouse or site alerts.

**When to avoid:**

* Coarse "nearby store" hints - consider IP or manual ZIP entry first.
* Continuous high-accuracy tracking when Balanced accuracy suffices.
* Background tracking without a visible in-app indicator and settings opt-out.

## Working Example

Foreground map pin, permission gate, and background upgrade flow with honest disclosure copy.

```bash
npx expo install expo-location
```

```tsx
// src/location/LocationPermissionGate.tsx
import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import * as Location from "expo-location";
 
type Props = {
  onGranted: () => void;
  needsBackground?: boolean;
};
 
export function LocationPermissionGate({ onGranted, needsBackground }: Props) {
  const [denied, setDenied] = useState(false);
 
  async function request() {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== "granted") {
      setDenied(true);
      return;
    }
 
    if (needsBackground) {
      const bg = await Location.requestBackgroundPermissionsAsync();
      if (bg.status !== "granted") {
        setDenied(true);
        return;
      }
    }
 
    onGranted();
  }
 
  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text style={{ fontWeight: "600" }}>Location access</Text>
      <Text>
        We attach GPS to inspection photos so disputes resolve with proof of
        on-site presence.
        {needsBackground
          ? " Background access keeps visit logs accurate when you switch apps."
          : ""}
      </Text>
      <Pressable onPress={request}>
        <Text style={{ color: "#2563eb" }}>Continue</Text>
      </Pressable>
      {denied && (
        <Pressable onPress={() => Linking.openSettings()}>
          <Text>Open Settings</Text>
        </Pressable>
      )}
    </View>
  );
}
```

```tsx
// src/location/useCurrentPosition.ts
import { useEffect, useState } from "react";
import * as Location from "expo-location";
 
export function useCurrentPosition(enabled: boolean) {
  const [coords, setCoords] = useState<Location.LocationObjectCoords | null>(
    null
  );
 
  useEffect(() => {
    if (!enabled) return;
 
    let subscription: Location.LocationSubscription | null = null;
 
    (async () => {
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 20 },
        (loc) => setCoords(loc.coords)
      );
    })();
 
    return () => subscription?.remove();
  }, [enabled]);
 
  return coords;
}
```

```ts
// src/location/getOneShotPosition.ts
import * as Location from "expo-location";
 
export async function getOneShotPosition() {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== "granted") return null;
 
  return Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
}
```

**What this demonstrates:**

* **Disclosure-aligned copy** in UI matches `app.config` plugin strings.
* **Foreground first** - background requested only when `needsBackground` is true.
* **Settings fallback** when user denies - graceful denial UX.
* **Subscription cleanup** on unmount - stops battery drain.
* **One-shot read** for form submit without continuous watch.

## Deep Dive

### Permission Tiers

| Tier | iOS | Android | Use case |
| --- | --- | --- | --- |
| Foreground | When In Use | Fine location | Maps, one-shot tagging |
| Background | Always | Background + foreground | Visit logs while app backgrounded |
| Reduced accuracy | Approximate (iOS 14+) | Coarse optional | City-level features only |

### Accuracy and Battery

```text
Accuracy.Highest     → GPS lock, heaviest battery
Accuracy.Balanced    → Default for field apps
Accuracy.Low         → City-level, cheapest
```

* Prefer **`distanceInterval`** over aggressive `timeInterval` - fewer JS wakeups.
* Call **`stopLocationUpdatesAsync`** or remove watch subscription when screen unmounts.
* On iOS, blue status bar indicates active background location - required by Apple HIG.

### Background and Geofencing

```ts
// src/location/geofenceTask.ts - global scope import at entry
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
 
export const GEOFENCE_TASK = "site-geofence";
 
TaskManager.defineTask(GEOFENCE_TASK, ({ data, error }) => {
  if (error) {
    console.error(error);
    return;
  }
  const { eventType, region } = data as Location.GeofencingEvent;
  if (eventType === Location.GeofencingEventType.Enter) {
    console.log("Entered", region.identifier);
  }
});
```

```ts
await Location.startGeofencingAsync(GEOFENCE_TASK, [
  {
    identifier: "warehouse-a",
    latitude: 37.7749,
    longitude: -122.4194,
    radius: 200,
    notifyOnEnter: true,
    notifyOnExit: false,
  },
]);
```

* Geofencing requires **background permission** and **TaskManager** registration - see [./expo-task-manager-and-background-tasks.md](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-task-manager-and-background-tasks/).
* iOS limits number of monitored regions - batch by active job site only.

### App Store Disclosure Strings

| Key | Platform | Example |
| --- | --- | --- |
| `locationWhenInUsePermission` | iOS plugin | Why foreground access helps |
| `locationAlwaysAndWhenInUsePermission` | iOS plugin | Why background is necessary |
| `ACCESS_BACKGROUND_LOCATION` | Android | Same narrative for reviewers |

* Strings must match **in-app explanation** - reviewers compare plugin text to UI.
* If background is optional, provide a **foreground-only code path** - do not block core features.

### Key API Surface

| API | Purpose |
| --- | --- |
| `requestForegroundPermissionsAsync` | When-in-use permission |
| `requestBackgroundPermissionsAsync` | Always / background |
| `getCurrentPositionAsync` | One-shot coordinate |
| `watchPositionAsync` | Streaming updates |
| `startGeofencingAsync` | Region enter/exit |
| `reverseGeocodeAsync` | Coordinates → address (network) |

## Gotchas

* **Requesting Always on first launch** - Users deny permanently. **Fix:** Foreground first; explain background upgrade separately.
* **Vague plugin strings** - "Needs location" fails review. **Fix:** Feature-specific copy tied to user benefit.
* **No watch cleanup** - Battery drain and ghost updates. **Fix:** `subscription.remove()` in `useEffect` cleanup.
* **Geofence task in component** - Cold start misses events. **Fix:** `TaskManager.defineTask` at module scope.
* **Expo Go for background QA** - Limited background modes. **Fix:** Development build on physical device.
* **Storing raw tracks indefinitely** - Privacy risk. **Fix:** Retention policy; upload aggregates only.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Foreground only | Map and one-shot tagging | Proof of on-site while app backgrounded |
| Manual address entry | Privacy-sensitive users | Real-time fleet tracking |
| Geofencing | Site enter/exit alerts | Sub-meter precision indoors |
| Third-party maps SDK | Turn-by-turn navigation | Simple "where am I" pin |

## FAQs

How do I install expo-location on SDK 57?

```bash
npx expo install expo-location
```

Add the `expo-location` config plugin with disclosure strings, then `npx expo prebuild` or EAS build.

Why is background location denied on iOS?

* User must grant **Always** - "While Using" is insufficient.
* Enable `isIosBackgroundLocationEnabled` in the plugin and `UIBackgroundModes` location.

What accuracy should field apps use?

* Start with **`Accuracy.Balanced`** - upgrade to `Highest` only for sub-10m requirements.
* Log battery impact on older Android devices before shipping Highest globally.

How do I open Settings after denial?

```ts
import { Linking } from "react-native";
await Linking.openSettings();
```

* Pair with copy explaining which toggle to enable (Location → Always).

Does reverse geocoding work offline?

* No - `reverseGeocodeAsync` uses network services. Cache last known label locally for offline display.

## Related

* [Expo SDK Basics](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-sdk-basics/) - permissions in app.config
* [expo-task-manager & Background Tasks](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-task-manager-and-background-tasks/) - geofence workers
* [../media-camera/media-basics/media-basics.md](https://docs.wahwei/reactnative.codeguides.io/media-camera/media-basics/) - attach GPS to captures
* [../expo-rules/security-rules-for-mobile/security-rules-for-mobile.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/security-rules-for-mobile/) - location data retention
* [Expo SDK Packages Best Practices](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/best-practices/) - disclosure copy patterns

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
