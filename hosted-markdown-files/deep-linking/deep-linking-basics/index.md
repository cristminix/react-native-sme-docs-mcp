# Deep Linking Basics

10 examples to wire custom schemes, universal links, and Expo config - the foundation every SDK 57 app needs before routing users from email, SMS, QR codes, or push notifications into the right screen.

Highlights / Deep Linking Basics

* Custom schemes (myapp://) work everywhere but show an 'Open in app?' prompt on the web
* Universal Links (iOS) and App Links (Android) open https:// URLs directly in the installed app
* Declare scheme and associated domains in app.config.ts before shipping deep links
* Expo Router maps file paths to URLs - app/orders/[id].tsx becomes /orders/:id
* expo-linking parses URLs into path, queryParams, and hostname for custom handlers
* Test cold-start links on development builds - Expo Go scheme behavior differs from store binaries

## Prerequisites

Scaffold an Expo app with file-based routing and install the linking primitives:

```bash
npx create-expo-app@latest DeepLinkBasics --template tabs
cd DeepLinkBasics
npx expo install expo-linking expo-router
```

Confirm the SDK pin:

```json
{
  "dependencies": {
    "expo": "~57.0.4",
    "react": "19.2.3",
    "react-native": "0.86.0",
    "expo-router": "~6.0.0"
  }
}
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**.

---

## Basic Examples

### 1. Custom Scheme vs HTTPS Link

Mobile deep links arrive in two shapes. Pick based on whether you need verified HTTPS routing or a quick dev-only path.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Type              │ Example URL                    │ Opens without prompt │
├───────────────────┼────────────────────────────────┼──────────────────────┤
│ Custom scheme     │ myapp://orders/42              │ Yes (if app installed) │
│ Universal/App Link│ https://shop.example.com/o/42  │ Yes (when verified)  │
│ Web fallback      │ https://shop.example.com/o/42  │ Browser (no app)     │
└──────────────────────────────────────────────────────────────────────────┘
```

* **Custom schemes** are fastest to ship - register `scheme` in `app.config.ts` and handle paths in code
* **Universal/App Links** require server-hosted verification files but feel native - no disambiguation sheet on iOS
* Marketing emails and social posts should prefer **HTTPS links** with web fallbacks for users without the app
* OAuth redirects and dev tooling often use **custom schemes** - see [../auth-session/expo-auth-session-and-oauth/expo-auth-session-and-oauth.md](https://docs.wahwei/reactnative.codeguides.io/auth-session/expo-auth-session-and-oauth/)

> **Related:** [iOS Universal Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/ios-universal-links/) - `apple-app-site-association` setup | [Android App Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/android-app-links/) - `assetlinks.json` verification

---

### 2. Register a Custom Scheme in app.config.ts

The `scheme` property tells iOS and Android which URL prefix belongs to your app.

```ts
// app.config.ts
import type { ExpoConfig } from "expo/config";
 
const config: ExpoConfig = {
  name: "ShopApp",
  slug: "shop-app",
  scheme: "shopapp",
  ios: {
    bundleIdentifier: "com.example.shopapp",
  },
  android: {
    package: "com.example.shopapp",
  },
};
 
export default config;
```

* A single lowercase scheme (`shopapp`) produces URLs like `shopapp://orders/42`
* Multiple schemes use an array: `scheme: ["shopapp", "com.example.shopapp"]`
* **Rebuild native binaries** after changing `scheme` - OTA updates cannot add new URL handlers
* Match scheme strings across OAuth consoles, email templates, and QR codes - typos cause silent no-ops

> **Related:** [../expo-rules/navigation-and-routing-rules/navigation-and-routing-rules.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/navigation-and-routing-rules/) - scheme and domain rules for review

---

### 3. Build Outbound Links with createURL

`expo-linking` generates URLs that respect your configured scheme and optional path prefix.

```ts
import * as Linking from "expo-linking";
 
const orderUrl = Linking.createURL("orders/42", {
  queryParams: { ref: "email" },
});
 
// Dev client / production: shopapp://orders/42?ref=email
```

* **`createURL`** prepends the app scheme and normalizes slashes - prefer it over string concatenation
* Pass `isTripleSlashed: true` only when integrating with legacy Android intent filters
* Share links from in-app "Invite friend" flows using `createURL` so dev and prod stay consistent
* Log `orderUrl` in `__DEV__` to copy into Maestro flows and marketing spreadsheets

> **Related:** [expo-linking API](https://docs.wahwei/reactnative.codeguides.io/deep-linking/expo-linking-api/) - parsing inbound URLs and event listeners

---

### 4. Parse an Inbound URL

When a link opens your app, parse it into structured parts before navigating.

```ts
import * as Linking from "expo-linking";
 
function handleDeepLink(url: string) {
  const parsed = Linking.parse(url);
 
  // shopapp://orders/42?ref=email
  // parsed.path        → "orders/42"
  // parsed.queryParams → { ref: "email" }
  // parsed.hostname    → null (custom scheme)
 
  const segments = (parsed.path ?? "").split("/").filter(Boolean);
  const [screen, id] = segments;
 
  if (screen === "orders" && id) {
    // router.push(`/orders/${id}`);
  }
}
```

* **`Linking.parse`** handles both custom schemes and `https://` URLs - hostname is set for universal links
* Strip leading slashes from `path` before splitting - Android and iOS sometimes differ on trailing slashes
* Never trust query params for authorization - validate IDs server-side before showing sensitive data
* With Expo Router, prefer file-based routes over manual parsing - Router maps paths automatically

> **Related:** [../expo-router/expo-router-basics/expo-router-basics.md](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/) - file paths become URL segments

---

### 5. Listen for Links While the App Is Open (Warm Start)

Warm-start links arrive while JavaScript is already running - subscribe in a root layout.

```tsx
import * as Linking from "expo-linking";
import { useEffect } from "react";
 
export function useDeepLinkListener(onUrl: (url: string) => void) {
  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      onUrl(url);
    });
 
    return () => subscription.remove();
  }, [onUrl]);
}
```

* **`addEventListener("url")`** fires when the user taps a link and the app is foregrounded or backgrounded
* Return `subscription.remove()` in the effect cleanup - leaks cause duplicate navigations after fast refresh
* Debounce rapid duplicate events - some OEMs fire the listener twice on Android
* Pair with Expo Router's built-in linking - only add custom listeners for analytics or non-route URLs

> **Related:** [expo-linking API](https://docs.wahwei/reactnative.codeguides.io/deep-linking/expo-linking-api/) - cold-start vs warm-start handling

---

### 6. Handle Cold-Start Links on Launch

Cold-start links open the app from a killed state - read the initial URL once before rendering routes.

```tsx
import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
 
export function useInitialDeepLink() {
  const [initialUrl, setInitialUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
 
  useEffect(() => {
    Linking.getInitialURL()
      .then((url) => setInitialUrl(url))
      .finally(() => setReady(true));
  }, []);
 
  return { initialUrl, ready };
}
```

* **`getInitialURL`** returns the link that launched the app, or `null` if opened from the home screen
* Gate splash screen hide on `ready` - navigating before Router mounts drops the initial URL
* Call `getInitialURL` **once** at startup - subsequent opens use the event listener
* Expo Router reads the initial URL automatically when `scheme` is configured - custom hooks are for side effects

> **Related:** [expo-linking API](https://docs.wahwei/reactnative.codeguides.io/deep-linking/expo-linking-api/) - complete cold + warm bootstrap pattern

---

### 7. Map File Routes to URL Paths (Expo Router)

Expo Router turns your `app/` directory into a URL tree - deep links map to screens without manual wiring.

```text
app/
  (tabs)/
    index.tsx          → /
    orders/
      index.tsx        → /orders
      [id].tsx         → /orders/:id
  product/
    [slug].tsx         → /product/:slug
```

```tsx
// app/orders/[id].tsx
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
 
export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
 
  return (
    <View>
      <Text>Order {id}</Text>
    </View>
  );
}
```

* **Dynamic segments** (`[id].tsx`) become URL params - `shopapp://orders/42` lands on `OrderDetailScreen`
* **Route groups** `(tabs)` do not appear in the URL - keeps tab URLs clean
* Validate `id` with Zod at the screen boundary - malformed deep links should show a fallback, not crash
* Typed routes (`experiments.typedRoutes`) catch invalid `href` at compile time

> **Related:** [../expo-router/link-and-href/link-and-href.md](https://docs.wahwei/reactnative.codeguides.io/expo-router/link-and-href/) - `Link` and `href` objects

---

### 8. Declare a Web Host for Universal Links

HTTPS deep links need a domain association - add `associatedDomains` (iOS) and `intentFilters` (Android) via config plugins or `app.config.ts`.

```ts
// app.config.ts
const config = {
  expo: {
    name: "ShopApp",
    slug: "shop-app",
    scheme: "shopapp",
    ios: {
      bundleIdentifier: "com.example.shopapp",
      associatedDomains: ["applinks:shop.example.com"],
    },
    android: {
      package: "com.example.shopapp",
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "shop.example.com",
              pathPrefix: "/orders",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
  },
};
 
export default config;
```

* **`applinks:`** prefix on iOS tells the system to fetch `apple-app-site-association` from your CDN
* **`autoVerify: true`** on Android triggers Digital Asset Links verification at install time
* Host only the paths your app owns - `/orders`, `/product`, not the entire marketing site root unless intended
* Changes require a **new native build** - verify on TestFlight and internal tracks before wide release

> **Related:** [iOS Universal Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/ios-universal-links/) - AASA file format and CDN headers

---

### 9. Test a Custom Scheme from the Terminal

Use `npx uri-scheme` to fire links into simulators and connected devices without rebuilding marketing pages.

```bash
# iOS Simulator
npx uri-scheme open "shopapp://orders/42?ref=cli" --ios
 
# Android emulator / device
npx uri-scheme open "shopapp://orders/42?ref=cli" --android
```

* Install `uri-scheme` globally or use `npx` - no app code changes required
* Test **cold start** by killing the app first, then running the command
* Test **warm start** with the app backgrounded - confirms the event listener path
* Universal links need Safari/Chrome or `xcrun simctl openurl` with `https://` - see [Deep Link Testing Matrix](https://docs.wahwei/reactnative.codeguides.io/deep-linking/deep-link-testing-matrix/)

> **Related:** [Deep Link Testing Matrix](https://docs.wahwei/reactnative.codeguides.io/deep-linking/deep-link-testing-matrix/) - simulator, device, and CI coverage

---

### 10. Provide a Web Fallback for Users Without the App

Deep links should degrade to your marketing site or app store - never a blank error page.

```html
<!-- Hosted at https://shop.example.com/orders/42 -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Order 42 - ShopApp</title>
    <meta name="apple-itunes-app" content="app-id=123456789, app-argument=https://shop.example.com/orders/42" />
    <script>
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isAndroid = /Android/i.test(navigator.userAgent);
      if (isIOS || isAndroid) {
        window.location = "shopapp://orders/42";
        setTimeout(() => {
          window.location = isIOS
            ? "https://apps.apple.com/app/id123456789"
            : "https://play.google.com/store/apps/details?id=com.example.shopapp";
        }, 1500);
      }
    </script>
  </head>
  <body>
    <p>Opening ShopApp… <a href="https://shop.example.com/orders/42">View in browser</a></p>
  </body>
</html>
```

* **Smart banners** (`apple-itunes-app`) improve iOS web-to-app handoff when universal links are not yet verified
* Timeout fallback prevents users from staring at a blank page when the app is not installed
* Deferred deep links (install → first open) need attribution SDKs or custom install-referrer plumbing - see [Deferred Deep Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/deferred-deep-links/)
* Keep web and app paths aligned - `/orders/42` should mean the same entity on both surfaces

> **Related:** [Deferred Deep Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/deferred-deep-links/) - attribution after fresh install

---

## Intermediate Examples

### 11. Prefix Paths for Staging vs Production

Use `expo-linking` path prefixes when multiple build flavors share one scheme but different route roots.

```ts
import Constants from "expo-constants";
import * as Linking from "expo-linking";
 
const prefix = Constants.expoConfig?.extra?.linkingPrefix ?? "";
 
export function appPath(route: string) {
  return Linking.createURL(`${prefix}${route}`);
}
 
// Staging extra: linkingPrefix = "staging/"
// → shopapp://staging/orders/42
```

* **Flavor-specific prefixes** isolate staging deep links from production analytics
* Document prefix rules in marketing UTM spreadsheets - conflating staging and prod links skews attribution
* Expo Router supports `linking` config with prefixes in `expo-router` advanced setups - keep one source of truth

> **Related:** [Push Notification Deep Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/push-notification-deep-links/) - embedding paths in notification payloads

---

## FAQs

Do I need both a custom scheme and universal links?

* **Scheme only** is fine for OAuth, dev testing, and internal tools.
* **Production consumer apps** should add verified HTTPS links for email and web - schemes show disambiguation UI and break when another app registers the same scheme.
* Keep the scheme as a fallback during universal-link rollout.

Does Expo Go handle my production scheme?

* Expo Go uses the `exp://` scheme - your `shopapp://` links open the dev client or a standalone build, not Expo Go.
* Test deep links on `expo-dev-client` or preview builds with the real bundle ID before release.

Can I change the scheme after App Store submission?

* Yes, but existing marketing links break until you ship a new binary and update every outbound URL.
* Treat scheme changes as a breaking API change - version your links or maintain redirects on the web host.

Who parses the URL - Expo Router or expo-linking?

* **Expo Router** maps paths to screens when using file-based routing - default choice.
* **`Linking.parse`** is for analytics, legacy React Navigation setups, or non-route URLs (e.g. `shopapp://reset-password?token=…`).

Why does my link open the browser instead of the app?

* Universal/App link verification failed - check AASA and `assetlinks.json` hosting.
* User long-pressed and chose "Open in Safari" - iOS remembers per-domain.
* Link uses `http://` instead of `https://` - verification requires TLS.

## Related

* [expo-linking API](https://docs.wahwei/reactnative.codeguides.io/deep-linking/expo-linking-api/) - parse, listen, and bootstrap cold starts
* [iOS Universal Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/ios-universal-links/) - associated domains and AASA
* [Android App Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/android-app-links/) - intent filters and verified links
* [Deep Link Testing Matrix](https://docs.wahwei/reactnative.codeguides.io/deep-linking/deep-link-testing-matrix/) - simulator, device, and CI matrix
* [../expo-router/expo-router-basics/expo-router-basics.md](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/) - file-based routing fundamentals
* [../expo-rules/navigation-and-routing-rules/navigation-and-routing-rules.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/navigation-and-routing-rules/) - team routing conventions

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
