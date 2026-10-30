# Modal & Presentation Routes

Sheet modals, form sheets, and Android back handling. In Expo Router, modals are regular routes declared in `app/` with `presentation` set on `Stack.Screen`. They participate in deep linking, back stacks, and typed hrefs - unlike React Native's `<Modal>` component, which sits outside the router.

Highlights / Modal & Presentation Routes

* Modal routes are files in app/ - set presentation on Stack.Screen, not a separate navigator
* presentation: 'modal' slides up on iOS; Android back dismisses the modal stack
* formSheet supports detents - sheetAllowedDetents, sheetInitialDetentIndex, grabber on iOS
* Anchor deep-linked modals with unstable\_settings.anchor so background routes survive
* Prefer router.back() or href='../' on web - Android hardware back is automatic
* React Native Modal is for ephemeral UI; Expo Router modals belong in navigation history

## Recipe

> Quick-reference recipe card - copy-paste ready.

```text
app/
├── _layout.tsx
├── index.tsx
└── (app)/
    ├── _layout.tsx
    └── compose.tsx          # /compose - modal route
```

```tsx
// app/(app)/_layout.tsx
export const unstable_settings = {
  anchor: "(tabs)",
};
 
import { Stack } from "expo-router";
 
export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="compose"
        options={{
          presentation: "modal",
          title: "New message",
        }}
      />
    </Stack>
  );
}
```

```tsx
// app/(app)/compose.tsx
import { router } from "expo-router";
import { Button, TextInput, View } from "react-native";
 
export default function ComposeModal() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <TextInput placeholder="Write something…" style={{ flex: 1 }} />
      <Button title="Close" onPress={() => router.back()} />
    </View>
  );
}
```

```tsx
// Open from any screen
import { Link, router } from "expo-router";
 
<Link href="/compose" asChild>
  <Button title="Compose" />
</Link>
 
router.push("/compose");
```

**When to reach for this:**

* **Multi-step flows** that must be linkable (`/compose`, `/checkout`)
* **Form sheets** with draggable detents (filters, quick actions)
* **Auth sign-in overlay** while preserving deep link context behind the modal
* **Transparent overlays** (`transparentModal`) for lightweight pickers

## Working Example

Full-screen modal, form sheet with detents, and Android-aware dismiss.

```tsx
// app/_layout.tsx
import { Stack } from "expo-router";
import { SessionProvider } from "@/features/auth";
 
export default function RootLayout() {
  return (
    <SessionProvider>
      <Stack>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen
          name="sign-in"
          options={{
            presentation: "modal",
            title: "Sign in",
          }}
        />
      </Stack>
    </SessionProvider>
  );
}
```

```tsx
// app/(app)/_layout.tsx
export const unstable_settings = {
  anchor: "(tabs)",
};
 
import { Stack } from "expo-router";
 
export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="filters"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.35, 0.6, 1],
          sheetInitialDetentIndex: 1,
          sheetGrabberVisible: true,
          sheetCornerRadius: 20,
          sheetLargestUndimmedDetentIndex: 0,
        }}
      />
      <Stack.Screen
        name="share"
        options={{
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
```

```tsx
// app/(app)/filters.tsx - form sheet content
import { router } from "expo-router";
import { Button, ScrollView, Text, View } from "react-native";
 
export default function FiltersSheet() {
  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      {/* Render title/actions in content - native headers unsupported in Android form sheets */}
      <Text style={{ fontSize: 18, fontWeight: "600", padding: 16 }}>Filters</Text>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text>Status: Open</Text>
        <Text>Sort: Newest</Text>
      </ScrollView>
      <Button title="Apply" onPress={() => router.back()} />
    </View>
  );
}
```

```tsx
// app/sign-in.tsx - dismiss respects platform
import { Link, router } from "expo-router";
import { Platform, Pressable, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
 
export default function SignInModal() {
  const canDismiss = router.canGoBack();
 
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
      <Text>Sign in to continue</Text>
      {canDismiss && (
        <Link href="../" asChild>
          <Pressable style={{ marginTop: 24 }}>
            <Text>Dismiss</Text>
          </Pressable>
        </Link>
      )}
    </View>
  );
}
```

```tsx
// Android: hardware back calls router.back() automatically on modal routes.
// Optional explicit handler when intercepting back for dirty forms:
import { useEffect } from "react";
import { BackHandler } from "react-native";
import { router } from "expo-router";
 
export function useConfirmBackOnDirty(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      // Show discard dialog; return true to block default back
      router.back();
      return true;
    });
    return () => sub.remove();
  }, [isDirty]);
}
```

## Deep Dive

### Presentation modes

| `presentation` | iOS | Android |
| --- | --- | --- |
| `card` | Push from side (default) | Platform default push |
| `modal` | Slide from bottom | Slide over; **back dismisses** |
| `formSheet` | Detented bottom sheet | Bottom sheet (max 3 detents) |
| `transparentModal` | Previous screen visible | Falls back to `transparentModal` |
| `fullScreenModal` | Full screen cover | Falls back to `modal` |

Set options on `Stack.Screen` in the owning `_layout.tsx` - leaf files should stay thin.

### Form sheet detents

```tsx
options={{
  presentation: "formSheet",
  sheetAllowedDetents: [0.25, 0.5, 1],       // fractions of screen height
  sheetInitialDetentIndex: 0,                 // or 'last'
  sheetGrabberVisible: true,                  // iOS grabber
  sheetCornerRadius: 24,
  sheetLargestUndimmedDetentIndex: 1,         // dimming below this detent
}}
```

* **`fitToContents`** - auto height; content cannot use `flex: 1` (must size explicitly).
* **Numeric detents (SDK 55+)** - `flex: 1` works on iOS inside the sheet.
* **Android** - native stack headers and nested stacks inside form sheets are **not** supported; render chrome in sheet content.

### Android sheet footer (experimental)

```tsx
options={{
  presentation: "formSheet",
  sheetAllowedDetents: [0.5, 1],
  unstable_sheetFooter: () => (
    <View style={{ padding: 16 }}>
      <Button title="Confirm" onPress={() => router.back()} />
    </View>
  ),
}}
```

### Modal vs React Native `<Modal>`

|  | Expo Router modal route | RN `<Modal>` |
| --- | --- | --- |
| URL / deep link | Yes | No |
| Back stack | Yes | No |
| Android back | Automatic dismiss | Manual `onRequestClose` |
| Best for | Flows users may link to | Alerts, blocking loaders |

## Gotchas

* **Deep link to modal without anchor** - Background route is wiped. **Fix:** `export const unstable_settings = { anchor: 'index' }` on the stack layout.
* **Expecting stack headers inside Android form sheets** - They do not render. **Fix:** Custom header row in the sheet body.
* **More than three detents on Android** - Only first three apply. **Fix:** Cap `sheetAllowedDetents` at three for cross-platform parity.
* **Using `push` after modal dismiss for auth** - User can swipe back to login. **Fix:** `router.replace('/(tabs)')` after successful sign-in.
* **Nested modal stacks without planning** - Modal presenting another modal confuses back order. **Fix:** Single modal stack at one layout level; use steps inside one route or `fullScreenModal` for sub-steps.
* **Web modal with no dismiss UI** - No swipe-down on web. **Fix:** Check `router.canGoBack()` and render `<Link href="../">`.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `presentation: 'modal'` | Standard overlay flow | You need partial-height sheet |
| `presentation: 'formSheet'` | Filters, pickers, quick forms | Full-screen wizard with stack headers on Android |
| `transparentModal` | Toast-style panels over content | Opaque full workflows |
| React Native `<Modal>` | Confirm dialogs, blocking spinners | Route must appear in history / deep links |
| Bottom sheet library (Gorhom) | Highly custom gestures outside router | You want file-based `/sheet` URLs |

## FAQs

How does Android hardware back interact with modals?

* On a modal route, back pops the modal (same as `router.back()`).
* When the modal is dismissed, focus returns to the anchored route underneath.
* Intercept with `BackHandler` only when you need unsaved-change prompts.

Can I present a modal from inside a tab stack?

* Yes - define the modal on the **parent** stack that wraps the tabs.
* Modals declared inside a tab stack only cover that tab (valid for tab-scoped flows).

How do I style the iOS modal status bar?

```tsx
import { Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
 
<StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
```

iOS modals default to dark backgrounds behind the status bar.

What is sheetLargestUndimmedDetentIndex?

* Detents at or below this index keep the background **undimmed**.
* Use when users should interact with content behind a partial sheet (maps, media).
* Set to `'none'` to always dim, `'last'` to never dim at largest detent.

Should sign-in be a modal or a separate auth stack?

* **Modal** - preserve deep link destination; dismiss after login.
* **Separate `(auth)` group** - cleaner back stack; use `router.replace` into app.
* See [Protected Routes & Middleware](https://docs.wahwei/reactnative.codeguides.io/expo-router-advanced/protected-routes-and-middleware/).

How do I test modal presentation?

Use `renderRouter` and assert navigation state after `router.push('/compose')`. Snapshot tests rarely capture native presentation - prefer integration tests on device/simulator.

## Related

* [Nested Navigators](https://docs.wahwei/reactnative.codeguides.io/expo-router-advanced/nested-navigators/) - modals above tab stacks
* [Protected Routes & Middleware](https://docs.wahwei/reactnative.codeguides.io/expo-router-advanced/protected-routes-and-middleware/) - sign-in modal pattern
* [Split View & Tablet Layouts](https://docs.wahwei/reactnative.codeguides.io/expo-router-advanced/split-view-and-tablet-layouts/) - side panels vs bottom sheets on tablet
* [../expo-router/stack-navigation/stack-navigation.md](https://docs.wahwei/reactnative.codeguides.io/expo-router/stack-navigation/) - stack screen options
* [../expo-router/link-and-href/link-and-href.md](https://docs.wahwei/reactnative.codeguides.io/expo-router/link-and-href/) - `href="../"` dismiss pattern
* [../deep-linking/expo-linking-api/expo-linking-api.md](https://docs.wahwei/reactnative.codeguides.io/deep-linking/expo-linking-api/) - anchoring deep-linked modals

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
