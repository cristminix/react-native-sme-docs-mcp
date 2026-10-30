# iOS Universal Links

Associated domains, `apple-app-site-association`, and CDN hosting - the iOS cookbook for opening `https://` marketing URLs directly in your Expo SDK 57 app without a custom scheme disambiguation sheet.

Highlights / iOS Universal Links

* Universal Links open https:// URLs directly in your app when AASA verification passes
* associatedDomains in app.config.ts must use the applinks: prefix
* apple-app-site-association must be served over HTTPS with no redirects and application/json
* CDN caching mistakes are the top production failure - stale AASA blocks new paths
* Users can force Safari with long-press - design web fallbacks for the same URLs
* Rebuild and reinstall after entitlement changes - OTA cannot add associated domains

## Recipe

> Quick-reference recipe card - copy-paste ready.

```ts
// app.config.ts
export default {
  expo: {
    scheme: "shopapp",
    ios: {
      bundleIdentifier: "com.example.shopapp",
      associatedDomains: ["applinks:shop.example.com"],
    },
  },
};
```

```json
// https://shop.example.com/.well-known/apple-app-site-association
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.example.shopapp",
        "paths": ["/orders/*", "/product/*", "/invite/*"]
      }
    ]
  }
}
```

**When to reach for this:**

* Email and SMS campaigns use `https://` links that should open the app when installed.
* You want seamless handoff from your marketing site without `myapp://` prompts.
* App Store listings and smart banners reference the same canonical URLs as the app.
* You need iOS to verify domain ownership before opening links in-app.

## Working Example

End-to-end setup for `https://shop.example.com/orders/*` on an Expo prebuild app.

**Step 1 - Entitlements via app.config.ts**

```ts
// app.config.ts
import type { ExpoConfig } from "expo/config";
 
const config: ExpoConfig = {
  name: "ShopApp",
  slug: "shop-app",
  scheme: "shopapp",
  ios: {
    bundleIdentifier: "com.example.shopapp",
    associatedDomains: ["applinks:shop.example.com"],
  },
  android: {
    package: "com.example.shopapp",
  },
};
 
export default config;
```

**Step 2 - Host AASA on your CDN**

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "ABCDE12345.com.example.shopapp",
        "paths": [
          "/orders/*",
          "/product/*",
          "NOT /admin/*",
          "NOT /api/*"
        ]
      }
    ]
  },
  "webcredentials": {
    "apps": ["ABCDE12345.com.example.shopapp"]
  }
}
```

Serve at **both** paths (Apple checks either):

* `https://shop.example.com/apple-app-site-association`
* `https://shop.example.com/.well-known/apple-app-site-association`

**Step 3 - CDN response headers**

```http
Content-Type: application/json
Cache-Control: max-age=3600
```

* No **301/302 redirects** on the AASA URL - Apple rejects redirected association files.
* File must be **unsigned** - no `.json` extension required; raw JSON body.
* Replace `ABCDE12345` with your Apple Team ID from the Developer portal.

**Step 4 - Expo Router screen**

```tsx
// app/orders/[id].tsx
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
 
export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={{ padding: 16 }}>
      <Text>Order {id}</Text>
    </View>
  );
}
```

**Step 5 - Build and verify**

```bash
npx expo prebuild --platform ios
npx expo run:ios
# Simulator: open universal link
xcrun simctl openurl booted "https://shop.example.com/orders/42"
```

**What this demonstrates:**

* **associatedDomains** entitlement generated at prebuild.
* **AASA** path rules limiting which URLs open the app.
* **CDN headers** required for Apple's crawler.
* **Expo Router** dynamic route matching `/orders/42`.
* **Simulator testing** before TestFlight.

## Deep Dive

### How It Works

* At install, iOS fetches AASA from each `applinks:` domain in your entitlements.
* Apple caches association data on device - updates propagate slowly (hours, sometimes days).
* When the user taps a matching `https://` link, iOS opens your app and passes the URL to React Native.
* If verification fails or the path is excluded, Safari handles the URL normally.
* Custom schemes still work in parallel - universal links are preferred for marketing.

### AASA Path Rules

| Pattern | Matches |
| --- | --- |
| `/orders/*` | `/orders/42`, `/orders/42/receipt` |
| `/product/*` | `/product/widget` |
| `NOT /admin/*` | Excludes admin URLs even if parent would match |
| `*` | Everything on the domain - avoid unless app owns entire host |

### CDN Checklist

| Check | Pass criteria |
| --- | --- |
| TLS | Valid certificate; no mixed `http://` |
| Redirects | AASA URL returns 200 directly |
| Content-Type | `application/json` or `application/pkcs7-mime` (signed) |
| Size | Under 128 KB |
| Accessibility | Public internet - no VPN or IP allowlist |

### iOS Notes

```bash
# Validate AASA with Apple's CDN (device will eventually see same data)
curl -s "https://app-site-association.cdn-apple.com/a/v1/shop.example.com" | jq .
```

* After changing AASA, bump CDN cache or purge edge nodes - stale files cause "works in staging, broken in prod."
* **TestFlight** builds use the production bundle ID - match `appID` exactly.
* Users who chose "Open in Safari" disable universal links per site until reset in Settings.

## Gotchas

* **Wrong Team ID in appID** - link opens Safari silently. **Fix:** `TEAMID.bundleIdentifier` from Apple Developer → Membership.
* **AASA behind redirect** - `www` → apex redirect breaks fetch. **Fix:** serve AASA on the exact host in `associatedDomains`.
* **Forgetting to rebuild after adding associatedDomains** - entitlement missing in IPA. **Fix:** `eas build --platform ios` after config change.
* **Including `/api/*` in paths** - API JSON responses should not open the app. **Fix:** explicit `NOT` rules or narrow prefixes.
* **Expecting instant AASA updates** - iOS caches aggressively. **Fix:** change paths only with versioned marketing campaigns; keep old paths during transition.
* **Universal link from same domain in WKWebView** - in-app browser may not hand off. **Fix:** use `SFSafariViewController` or `<a target="_blank">` for external open.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Custom scheme only | Internal tools, OAuth redirects | Consumer email campaigns |
| Firebase Dynamic Links (deprecated) | Legacy projects already integrated | Greenfield - Google shut down Aug 2025 |
| Branch.io / AppsFlyer OneLink | Deferred deep links + attribution | Simple verified links suffice |
| Smart App Banner only | Web-to-app nudge without full universal links | You need tap-to-open without Safari |

## FAQs

Where do I find my Apple Team ID?

* Apple Developer → Account → Membership details → **Team ID**.
* Format in AASA: `TEAMID.com.example.shopapp` - no spaces.

Do I need a separate AASA per build flavor?

* One file can list multiple `details` entries with different `appID` values for dev and prod bundle IDs.
* Domains can differ per flavor - `applinks:staging.example.com` vs `applinks:shop.example.com`.

Why does long-press show "Open in ShopApp" but tap opens Safari?

* AASA verification failed or path not listed - long-press uses heuristics; tap requires verification.
* Check CDN with `curl -I` for redirects and content type.

Can I use wildcard subdomains?

* Use `applinks:*.example.com` in entitlements and separate `details` per subdomain in AASA.
* `*.example.com` in paths is not valid - list each subdomain explicitly.

Does Expo Go support universal links for my bundle ID?

* No - universal links require your signed bundle ID and entitlements in a dev client or store build.

What is webcredentials in AASA?

* Enables Password AutoFill association between your app and website - optional but recommended for login flows.

How do I debug on a physical device?

* Install build → tap link in Notes app (not Messages preview).
* Settings → Developer → diagnose associated domains (iOS 17+).

Should marketing use query strings?

* Yes - `/orders/42?ref=email` works if `/orders/*` matches; query does not affect path rules.
* Strip tracking params before routing if they are not in your Zod schema.

Can one domain point to multiple apps?

* AASA supports multiple `details` entries - iOS picks the installed app matching `appID`.
* Watch for conflicts when sister apps share a domain.

How does this interact with Expo Router?

* Router maps `https://shop.example.com/orders/42` to `app/orders/[id].tsx` automatically when scheme/host are configured.
* See [../expo-router/link-and-href/link-and-href.md](https://docs.wahwei/reactnative.codeguides.io/expo-router/link-and-href/).

## Related

* [Deep Linking Basics](https://docs.wahwei/reactnative.codeguides.io/deep-linking/deep-linking-basics/) - scheme vs HTTPS overview
* [expo-linking API](https://docs.wahwei/reactnative.codeguides.io/deep-linking/expo-linking-api/) - parse and listener patterns
* [Android App Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/android-app-links/) - parallel Android verification
* [Deep Link Testing Matrix](https://docs.wahwei/reactnative.codeguides.io/deep-linking/deep-link-testing-matrix/) - iOS simulator and device matrix
* [../expo-router/expo-router-basics/expo-router-basics.md](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/) - route file layout
* [../expo-rules/navigation-and-routing-rules/navigation-and-routing-rules.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/navigation-and-routing-rules/) - deep-link review rules

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Y29kZWd1aWRlcy5pb3xjZ2lvOTE2fDIwMjYwNw

Reviewed by Chris St. John·Last updated Jul 19, 2026
