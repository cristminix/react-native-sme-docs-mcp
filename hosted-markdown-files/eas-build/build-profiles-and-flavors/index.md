# Build Profiles & Flavors

Dev, preview, production, and **white-label variants** - the cookbook for structuring `eas.json` profiles and dynamic `app.config.ts` on Expo SDK 57.

Highlights / Build Profiles & Flavors

* eas.json profiles are named build recipes - not the same as Android product flavors
* Map development, preview, and production to EAS environments for env var parity
* White-label apps use app.config.ts variants with distinct bundle IDs per brand
* channel on a profile ties store binaries to eas update promotion paths
* APP\_VARIANT env vars drive dynamic app.config.ts for staging vs production
* Each flavor needs separate credentials - one keystore per package name

## Recipe

> Quick-reference recipe card - copy-paste ready.

```json
// eas.json - three-environment baseline
{
  "cli": { "version": ">= 16.0.0", "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "environment": "development",
      "channel": "development"
    },
    "preview": {
      "distribution": "internal",
      "environment": "preview",
      "channel": "preview"
    },
    "production": {
      "distribution": "store",
      "environment": "production",
      "channel": "production",
      "autoIncrement": true
    }
  }
}
```

```ts
// app.config.ts - APP_VARIANT from eas.json env
import type { ExpoConfig } from "expo/config";
 
const variant = process.env.APP_VARIANT ?? "production";
 
const bundleIds: Record<string, string> = {
  development: "com.example.shopapp.dev",
  preview: "com.example.shopapp.staging",
  production: "com.example.shopapp",
};
 
const config: ExpoConfig = {
  name: variant === "production" ? "Shop" : `Shop (${variant})`,
  slug: "shop-app",
  ios: { bundleIdentifier: bundleIds[variant] },
  android: { package: bundleIds[variant] },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    eas: { projectId: "00000000-0000-0000-0000-000000000000" },
  },
};
 
export default config;
```

```json
// eas.json - pass variant into prebuild
{
  "build": {
    "preview": {
      "env": { "APP_VARIANT": "preview" },
      "environment": "preview"
    }
  }
}
```

**When to reach for this:**

* Staging and production must install side-by-side on the same device.
* White-label brands share one codebase with different icons and bundle IDs.
* QA needs preview API URLs without risking production data.
* EAS Update channels must not cross-pollinate environments.

## Working Example

**Step 1 - Define profile responsibilities**

| Profile | Audience | Distribution | Typical binary |
| --- | --- | --- | --- |
| **development** | Engineers | internal | Dev client + simulator/APK |
| **preview** | QA / stakeholders | internal | Release-shaped IPA/APK |
| **production** | End users | store | AAB + App Store IPA |

```bash
eas build --profile development --platform all
eas build --profile preview --platform ios
eas build --profile production --platform android
```

**Step 2 - Bind EAS environments**

Create variables in Expo dashboard → **Project** → **Environment variables**:

```text
development   EXPO_PUBLIC_API_URL=https://api.dev.example.com
preview       EXPO_PUBLIC_API_URL=https://api.staging.example.com
production    EXPO_PUBLIC_API_URL=https://api.example.com
```

```json
{
  "build": {
    "preview": { "environment": "preview" }
  }
}
```

* **`environment`** pulls vars from EAS - not laptop `.env.local`
* `eas update --environment production` must match production profile - [Release & OTA Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/)

**Step 3 - White-label with app.config.ts**

```ts
// app.config.ts - multi-brand from BRAND env
type Brand = "acme" | "contoso";
 
const brand = (process.env.BRAND ?? "acme") as Brand;
 
const brands: Record<Brand, { name: string; bundleId: string; icon: string }> = {
  acme: {
    name: "Acme Shop",
    bundleId: "com.acme.shop",
    icon: "./brands/acme/icon.png",
  },
  contoso: {
    name: "Contoso Market",
    bundleId: "com.contoso.market",
    icon: "./brands/contoso/icon.png",
  },
};
 
const config: ExpoConfig = {
  name: brands[brand].name,
  slug: `shop-${brand}`,
  icon: brands[brand].icon,
  ios: { bundleIdentifier: brands[brand].bundleId },
  android: {
    package: brands[brand].bundleId,
    adaptiveIcon: { foregroundImage: brands[brand].icon, backgroundColor: "#fff" },
  },
};
 
export default config;
```

```json
// eas.json - one profile per brand for production
{
  "build": {
    "production-acme": {
      "extends": "production",
      "env": { "BRAND": "acme" },
      "environment": "production-acme"
    },
    "production-contoso": {
      "extends": "production",
      "env": { "BRAND": "contoso" },
      "environment": "production-contoso"
    }
  }
}
```

```bash
eas build --profile production-acme --platform all
eas build --profile production-contoso --platform all
```

* Each brand needs **separate** `projectId` or careful channel isolation per bundle ID
* Separate **iOS certs** and **Android keystores** per `bundleIdentifier` / `package`

---

## Profile Inheritance with extends

DRY shared settings across profiles:

```json
{
  "build": {
    "base": {
      "node": "22.11.0",
      "resourceClass": "medium"
    },
    "development": {
      "extends": "base",
      "developmentClient": true,
      "distribution": "internal"
    },
    "production": {
      "extends": "base",
      "distribution": "store",
      "autoIncrement": true
    },
    "production-ios-simulator": {
      "extends": "production",
      "ios": { "simulator": true },
      "distribution": "internal"
    }
  }
}
```

* **`extends`** merges parent keys - child overrides win
* Use for Detox simulator builds, Maestro CI, and shared Node version pins

---

## Profiles vs Android Product Flavors

Expo CNG typically uses **one Gradle applicationId** per prebuild driven by `app.config.ts`:

```text
eas.json profile  →  APP_VARIANT env  →  app.config.ts  →  applicationId
```

Native Android **product flavors** in `build.gradle` are possible in brownfield projects but fight CNG regeneration. Prefer:

1. Dynamic `app.config.ts` for bundle ID, name, and icons
2. Separate EAS profiles per variant
3. Config plugins for flavor-specific native resources if unavoidable

See [Prebuild Basics](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/prebuild-basics/) - hand-edited `android/app/build.gradle` product flavors are lost on clean prebuild.

---

## Channel and Runtime Alignment

```ts
// app.config.ts
runtimeVersion: {
  policy: "fingerprint",
},
updates: {
  url: "https://u.expo.dev/<project-id>",
},
```

```json
{
  "build": {
    "preview": { "channel": "preview" },
    "production": { "channel": "production" }
  }
}
```

```bash
eas update --channel preview --environment preview --message "QA fix"
eas update --channel production --environment production --message "Hotfix"
```

* Channel on the **binary** must match channel on **`eas update`**
* Different flavors with different native fingerprints need different runtime versions

---

## FAQs

Can development and production install on the same phone?

* **Yes** if `bundleIdentifier` / `package` differ - use `APP_VARIANT` suffixes like `.dev` and `.staging`.
* **No** if they share the same ID - the new install replaces the old app.

How many profiles should we have?

* Start with **three**: development, preview, production.
* Add brand-specific or platform-specific profiles with `extends` when needed.
* Avoid engineer-named profiles (`"jane-debug"`) - use environments and channels instead.

Should preview use store or internal distribution?

* **internal** for APK/ad hoc and fast iteration.
* **store** + TestFlight internal when QA needs production-identical signing - [TestFlight Distribution](https://docs.wahwei/reactnative.codeguides.io/ios-platform/testflight-distribution/).

How do white-label apps share one repo?

* Single codebase + `BRAND` env + separate credentials per package name.
* Separate EAS projects or strict channel isolation per brand.
* Document which profile maps to which Play Console / App Store Connect app.

## Related

* [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - profile fundamentals
* [iOS Credentials & Provisioning](https://docs.wahwei/reactnative.codeguides.io/eas-build/ios-credentials-and-provisioning/) - per-bundle-ID signing
* [Android Keystores & Signing](https://docs.wahwei/reactnative.codeguides.io/eas-build/android-keystores-and-signing/) - per-package keystores
* [Internal Distribution](https://docs.wahwei/reactnative.codeguides.io/eas-build/internal-distribution/) - preview install mechanics
* [../cng-prebuild/prebuild-basics/prebuild-basics.md](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/prebuild-basics/) - app.config drives native IDs
* [../cng-prebuild/config-plugins-in-cng/config-plugins-in-cng.md](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/config-plugins-in-cng/) - flavor-specific native mutations
* [../ios-platform/ios-basics-for-rn-devs/ios-basics-for-rn-devs.md](https://docs.wahwei/reactnative.codeguides.io/ios-platform/ios-basics-for-rn-devs/) - bundle identifier rules
* [../android-platform/android-basics-for-rn-devs/android-basics-for-rn-devs.md](https://docs.wahwei/reactnative.codeguides.io/android-platform/android-basics-for-rn-devs/) - applicationId vs namespace
* [../expo-rules/release-and-ota-rules/release-and-ota-rules.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/) - channel and runtime policy

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4). NzA2MjAyfDY2OW9pZ2N8b2kuc2VkaXVnZWRvYw==

Reviewed by Chris St. John·Last updated Jul 19, 2026
