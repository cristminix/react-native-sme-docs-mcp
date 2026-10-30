# expo-linking API

Parsing URLs, listeners, and cold-start vs warm-start handling - the `expo-linking` cookbook for Expo SDK 57 apps that receive links from email, SMS, QR codes, and other apps.

Highlights / expo-linking API

* Linking.parse breaks any inbound URL into path, hostname, and queryParams
* getInitialURL handles cold start - addEventListener handles warm start
* createURL builds outbound links that respect your configured scheme
* Gate navigation until Router and auth state are ready - or initial links are dropped
* Call canOpenURL before opening third-party schemes - returns false when app is missing
* Expo Router subsumes most parsing when using file-based routes - use Linking for side effects

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import * as Linking from "expo-linking";
import { useEffect } from "react";
import { router } from "expo-router";
 
function routeFromUrl(url: string) {
  const { path, queryParams } = Linking.parse(url);
  const cleanPath = `/${(path ?? "").replace(/^\/+/, "")}`;
  router.push({ pathname: cleanPath as never, params: queryParams ?? {} });
}
 
export function useDeepLinkBootstrap() {
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) routeFromUrl(url);
    });
 
    const sub = Linking.addEventListener("url", ({ url }) => routeFromUrl(url));
    return () => sub.remove();
  }, []);
}
```

**When to reach for this:**

* Custom analytics or attribution before Expo Router navigates.
* Non–file-based routes (password reset tokens, magic links).
* OAuth return URLs handled outside Router - see auth-session.
* Opening external apps (`maps://`, `mailto:`) with `openURL`.
* Building share sheets and referral links with `createURL`.

## Working Example

```tsx
// src/linking/useAppLinking.ts
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { z } from "zod";
 
const orderParams = z.object({
  id: z.string().min(1),
  ref: z.string().optional(),
});
 
function navigateFromUrl(url: string) {
  const parsed = Linking.parse(url);
  const segments = (parsed.path ?? "").split("/").filter(Boolean);
 
  if (segments[0] === "orders" && segments[1]) {
    const result = orderParams.safeParse({
      id: segments[1],
      ref: parsed.queryParams?.ref,
    });
 
    if (!result.success) {
      router.replace("/");
      return;
    }
 
    router.push({
      pathname: "/orders/[id]",
      params: { id: result.data.id, ref: result.data.ref ?? "" },
    });
    return;
  }
 
  router.replace("/");
}
 
type Options = {
  enabled: boolean;
};
 
export function useAppLinking({ enabled }: Options) {
  const handledInitial = useRef(false);
 
  useEffect(() => {
    if (!enabled) return;
 
    Linking.getInitialURL().then((url) => {
      if (!url || handledInitial.current) return;
      handledInitial.current = true;
      navigateFromUrl(url);
    });
 
    const subscription = Linking.addEventListener("url", ({ url }) => {
      navigateFromUrl(url);
    });
 
    return () => subscription.remove();
  }, [enabled]);
}
```

```tsx
// app/_layout.tsx
import { Stack } from "expo-router";
import { useAppLinking } from "../src/linking/useAppLinking";
import { useAuthReady } from "../src/auth/useAuthReady";
 
export default function RootLayout() {
  const authReady = useAuthReady();
 
  useAppLinking({ enabled: authReady });
 
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="orders/[id]" options={{ title: "Order" }} />
    </Stack>
  );
}
```

**What this demonstrates:**

* **Cold start** via `getInitialURL` with a ref guard against double handling.
* **Warm start** via `addEventListener` with cleanup on unmount.
* **Auth gating** - links wait until `authReady` so protected routes do not flash.
* **Zod validation** at the linking boundary - malformed URLs fall back to home.
* **Expo Router** `router.push` with dynamic pathname and params.

## Deep Dive

### How It Works

* The OS delivers URLs to your app through **custom scheme handlers** or **verified HTTPS intent filters**.
* On launch, the native layer queues the URL; `getInitialURL` reads it once JavaScript starts.
* While running, new URLs arrive as events on the `url` channel - same shape `{ url: string }`.
* Expo Router registers its own linking config from `app/` - your listener runs in parallel for side effects.
* `Linking.parse` uses the WHATWG URL parser - invalid URLs return `{ path: null, queryParams: null }`.

### Cold Start vs Warm Start

| Scenario | App state | API | Pitfall |
| --- | --- | --- | --- |
| Cold start | Process killed | `getInitialURL()` | Navigating before auth/Router ready drops the URL |
| Warm start (background) | JS running | `addEventListener("url")` | Duplicate handler if layout remounts without cleanup |
| Warm start (foreground) | JS running | `addEventListener("url")` | Same URL may fire twice on some Android OEMs |
| User opened from icon | No link | `getInitialURL()` → `null` | Do not treat `null` as an error |

### Key API Surface

| Method / Event | Returns | Use |
| --- | --- | --- |
| `Linking.parse(url)` | `{ scheme, hostname, path, queryParams }` | Inspect inbound URLs |
| `Linking.createURL(path, opts?)` | `string` | Build share/referral links |
| `Linking.getInitialURL()` | `Promise<string | null>` | Cold-start bootstrap |
| `Linking.addEventListener("url", fn)` | `Subscription` | Warm-start listener |
| `Linking.openURL(url)` | `Promise<true>` | Open external apps |
| `Linking.canOpenURL(url)` | `Promise<boolean>` | Check if target app exists |
| `Linking.getLinkingURL()` | `string | null` | Dev-only Expo Go URL (avoid in prod) |

### TypeScript Notes

```ts
import * as Linking from "expo-linking";
 
type ParsedLink = ReturnType<typeof Linking.parse>;
 
function queryParam(
  parsed: ParsedLink,
  key: string
): string | undefined {
  const value = parsed.queryParams?.[key];
  return Array.isArray(value) ? value[0] : value;
}
```

* `queryParams` values may be `string | string[]` - normalize before Zod parsing.
* `path` omits leading slash for custom schemes - normalize before concatenation.
* Use `router.push` typed routes when `experiments.typedRoutes` is enabled - invalid paths fail at compile time.

## Gotchas

* **Handling initial URL before auth resolves** - protected screens mount, then redirect, losing deep-link context. **Fix:** gate `useAppLinking({ enabled: authReady })` as shown above.
* **Double navigation on cold start** - both Expo Router and your hook push the same route. **Fix:** disable custom navigation when Router linking suffices, or set `initialRouteName` explicitly.
* **Forgetting listener cleanup** - Fast Refresh stacks listeners; one link triggers five navigations. **Fix:** `return () => subscription.remove()` in `useEffect`.
* **Hardcoding `myapp://` strings** - breaks across flavors and Expo Go. **Fix:** always `Linking.createURL("orders/42")`.
* **Trusting query params for auth** - `?token=` in URLs lands in analytics and logs. **Fix:** exchange tokens server-side; use short-lived one-time codes in links.
* **`canOpenURL` blocked on iOS without LSApplicationQueriesSchemes** - always returns false for unlisted schemes. **Fix:** declare queried schemes in `app.config.ts` `ios.infoPlist`.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Expo Router linking only | File-based routes cover all paths | You need pre-navigation analytics or token exchange |
| React Navigation `linking` config | Brownfield React Navigation app | Greenfield Expo Router project |
| Branch / AppsFlyer SDK | Deferred deep links + attribution | Simple custom-scheme-only app |
| Manual `Linking.parse` in every screen | Legacy codebase | New code - centralize in one hook |

## FAQs

Does Expo Router replace expo-linking?

* Router uses linking under the hood for path mapping.
* Keep `expo-linking` for `createURL`, `openURL`, `canOpenURL`, and custom pre-navigation logic.

When should I call getInitialURL?

* Once at app startup - typically in root `_layout.tsx` or an auth provider.
* Do not poll it - the value does not change until the next cold start.

Why is getInitialURL null but the app opened from a link?

* Listener-only setup with no cold-start handler.
* Navigation ran before the effect - gate on splash until linking hook completes.
* Expo Go vs dev client scheme mismatch - link targeted wrong binary.

How do I open WhatsApp or Maps from my app?

```ts
const url = "maps://?q=Coffee+Shop";
if (await Linking.canOpenURL(url)) {
  await Linking.openURL(url);
}
```

* Add target schemes to `LSApplicationQueriesSchemes` on iOS.

Can I use expo-linking on web?

* `parse` and `createURL` work on web with `http`/`https` origins.
* `getInitialURL` returns the page URL on first load - guard with `Platform.OS !== "web"` if sharing code.

How do query params with duplicate keys parse?

* `?tag=a&tag=b` yields `queryParams.tag` as `string[]`.
* Normalize to a single string before validation.

Should warm-start links use replace or push?

* **Push** when the user should back-navigate to the previous screen.
* **Replace** for magic links and password resets - prevent back into unauthenticated stacks.

How do I log links without leaking PII?

* Log `path` only - strip `token`, `email`, and `code` query keys before analytics.
* Hash order IDs if your policy treats them as sensitive.

Does addEventListener fire for universal links?

* Yes - verified `https://` links trigger the same event once the app opens.
* Failed verification opens Safari instead - your JS never runs.

How do I test getInitialURL in Jest?

```ts
jest.spyOn(Linking, "getInitialURL").mockResolvedValue("shopapp://orders/1");
```

* Mock `addEventListener` to invoke the callback manually in integration tests.

## Related

* [Deep Linking Basics](https://docs.wahwei/reactnative.codeguides.io/deep-linking/deep-linking-basics/) - schemes, hosts, and Expo config
* [iOS Universal Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/ios-universal-links/) - HTTPS links on iOS
* [Android App Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/android-app-links/) - verified Android intents
* [Push Notification Deep Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/push-notification-deep-links/) - tap → navigate
* [../expo-router/expo-router-basics/expo-router-basics.md](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/) - file-based route mapping
* [../expo-rules/navigation-and-routing-rules/navigation-and-routing-rules.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/navigation-and-routing-rules/) - param validation rules

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
