# Android App Links

Intent filters, `assetlinks.json`, and verified links - the Android cookbook for opening `https://` URLs directly in your Expo SDK 57 app without the "Open with" disambiguation sheet.

Highlights / Android App Links

* App Links verify https:// URLs at install time via Digital Asset Links
* intentFilters with autoVerify: true trigger Android domain verification
* assetlinks.json must list your signing certificate SHA-256 fingerprint
* Play App Signing uses Google's cert - register Play Console fingerprint, not only upload key
* Verification failures fall back to a disambiguation chooser - users pick browser or app
* Rebuild after intent filter changes - manifest updates require a new native binary

## Recipe

> Quick-reference recipe card - copy-paste ready.

```ts
// app.config.ts
export default {
  expo: {
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
```

```json
// https://shop.example.com/.well-known/assetlinks.json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.example.shopapp",
      "sha256_cert_fingerprints": [
        "14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:10:D4:4A:8F:D8:00:6F:8F:95:34:E7:6B:58"
      ]
    }
  }
]
```

**When to reach for this:**

* Android marketing links should skip the app/browser chooser.
* You already host iOS AASA on the same domain - add `assetlinks.json` beside it.
* Push notifications and email use `https://shop.example.com/...` paths.
* You need parity with iOS Universal Links on Android.

## Working Example

Full verification setup for `https://shop.example.com/orders/*`.

**Step 1 - Intent filters in app.config.ts**

```ts
// app.config.ts
import type { ExpoConfig } from "expo/config";
 
const config: ExpoConfig = {
  name: "ShopApp",
  slug: "shop-app",
  scheme: "shopapp",
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
          {
            scheme: "https",
            host: "shop.example.com",
            pathPrefix: "/product",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  ios: {
    bundleIdentifier: "com.example.shopapp",
    associatedDomains: ["applinks:shop.example.com"],
  },
};
 
export default config;
```

**Step 2 - Host assetlinks.json**

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.example.shopapp",
      "sha256_cert_fingerprints": [
        "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99"
      ]
    }
  }
]
```

Serve at: `https://shop.example.com/.well-known/assetlinks.json`

**Step 3 - Obtain SHA-256 fingerprint**

```bash
# Play Console → App integrity → App signing key certificate → SHA-256
# Local debug keystore (development builds only):
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

* **Production** verification uses the **Play App Signing** certificate - not your upload key.
* Add **both** debug and release fingerprints during development so internal builds verify.

**Step 4 - Build and test**

```bash
npx expo prebuild --platform android
npx expo run:android
adb shell am start -a android.intent.action.VIEW -d "https://shop.example.com/orders/42" com.example.shopapp
```

**Step 5 - Check verification status**

```bash
adb shell pm get-app-links com.example.shopapp
```

Look for `shop.example.com: verified` - `none` or `legacy_failure` means fix hosting or fingerprint.

**What this demonstrates:**

* **`autoVerify: true`** triggers install-time domain verification.
* **`pathPrefix`** scopes which URLs the app claims.
* **assetlinks.json** ties package name to signing cert.
* **adb** commands for emulator smoke tests.
* **pm get-app-links** for verification diagnostics.

## Deep Dive

### How It Works

* On install/update, Android fetches `assetlinks.json` for each host in intent filters with `autoVerify`.
* The OS compares your app's signing cert SHA-256 to the JSON entry.
* Verified links open your app directly; failed verification shows a chooser or browser.
* Multiple apps can declare the same host - verified app wins; otherwise user picks.
* Custom schemes (`shopapp://`) bypass verification - still useful for dev and OAuth.

### intentFilters Fields

| Field | Purpose |
| --- | --- |
| `action: "VIEW"` | Standard open-URL intent |
| `category: ["BROWSABLE", "DEFAULT"]` | Required for link handling |
| `autoVerify: true` | Enable Digital Asset Links |
| `data.scheme` | `https` for App Links |
| `data.host` | Domain without path |
| `data.pathPrefix` | URL path prefix match |
| `data.pathPattern` | Regex path (escape carefully) |

### Verification Status Values

| Status | Meaning | Action |
| --- | --- | --- |
| `verified` | Success | Ship |
| `none` | No attempt / missing filter | Check manifest |
| `legacy_failure` | Fingerprint or JSON mismatch | Fix assetlinks.json |
| `no_response` | Server unreachable | Fix CDN / TLS |

### Android Notes

```bash
# Re-run verification after fixing assetlinks.json (Android 12+)
adb shell pm verify-app-links --re-verify com.example.shopapp
```

* **HTTP redirects** on `assetlinks.json` break verification - serve 200 on exact URL.
* **Content-Type** should be `application/json`.
* **`android:launchMode`** on main activity affects back-stack - `singleTask` is common for deep-link apps.

## Gotchas

* **Wrong SHA-256 fingerprint** - most common failure; Play App Signing cert differs from local upload key. **Fix:** copy fingerprint from Play Console → App integrity.
* **Debug build on production assetlinks** - debug cert not listed. **Fix:** add debug fingerprint to JSON array during development.
* **Missing `autoVerify: true`** - filter works but shows chooser. **Fix:** set `autoVerify` and reinstall app.
* **`pathPrefix` too broad** - `/` claims entire site including blog. **Fix:** narrow to `/orders`, `/product`.
* **Expo config not applied** - edited `app.config.ts` but ran old APK. **Fix:** `npx expo prebuild --clean` then rebuild.
* **Testing with `shopapp://` only** - App Links are HTTPS-only. **Fix:** test `https://` URLs with adb intent command.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Custom scheme intent filter | OAuth, quick internal tests | Public marketing HTTPS links |
| `expo-linking` scheme only | Prototype before CDN setup | Production Android campaigns |
| Branch / Firebase Dynamic Links | Deferred attribution | You control the domain and want zero SDK |
| User-trusted chooser (no autoVerify) | Competing apps share domain | You want one-tap open |

## FAQs

Do I need separate assetlinks.json per flavor?

* One file can list multiple `target` objects with different `package_name` values (e.g. `.dev` suffix).
* Or use different subdomains per flavor with separate JSON files.

How do pathPrefix and pathPattern differ?

* `pathPrefix: "/orders"` matches `/orders`, `/orders/42`, `/orders/42/items`.
* `pathPattern` uses regex - powerful but easy to mis-escape; prefer prefix when possible.

Why does adb open the browser?

* Verification failed - run `pm get-app-links`.
* Typo in package name in adb command.
* Link host/path does not match intent filter `data` entries.

Can I use www and apex domains?

* Register both hosts in intent filters and include both in assetlinks if they serve the same JSON.
* Avoid redirects on the JSON URL itself.

Does Expo Router need extra Android config?

* Router reads the incoming URL once the activity receives the intent - no extra JS config beyond routes.
* Ensure dynamic segments exist for each `pathPrefix`.

What about Android 13+ restricted settings?

* Verification is unchanged - restricted settings affect sideloaded apps, not Play-distributed builds.

How do I support http:// links?

* App Links require `https` - `http` will not auto-verify. Use HTTPS everywhere.

Multiple signing keys?

* List every SHA-256 you ship with - upload key, Play signing key, and debug key during dev.

How long until verification updates?

* Reinstall or `pm verify-app-links --re-verify` after fixing JSON - no hour-long Apple-style cache, but CDN TTL applies.

How does this pair with iOS?

* Host `assetlinks.json` and `apple-app-site-association` on the same domain - see [iOS Universal Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/ios-universal-links/).

## Related

* [Deep Linking Basics](https://docs.wahwei/reactnative.codeguides.io/deep-linking/deep-linking-basics/) - schemes and hosts overview
* [iOS Universal Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/ios-universal-links/) - AASA on the same domain
* [expo-linking API](https://docs.wahwei/reactnative.codeguides.io/deep-linking/expo-linking-api/) - URL parsing after intent delivery
* [Deep Link Testing Matrix](https://docs.wahwei/reactnative.codeguides.io/deep-linking/deep-link-testing-matrix/) - Android emulator and device matrix
* [../expo-router/expo-router-basics/expo-router-basics.md](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/) - route mapping
* [../expo-rules/navigation-and-routing-rules/navigation-and-routing-rules.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/navigation-and-routing-rules/) - routing review checklist

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
