# Modular Monolith vs Multi-App

A **modular monolith** ships one installable binary with feature modules enabled by flags and config. **Multi-app** repos build separate store listings - different bundle IDs, icons, and often independent release trains. Pick based on release independence, not team preference.

Highlights / Modular Monolith vs Multi-App

* Modular monolith: one bundle ID, feature modules toggled by flags and build-time config
* Multi-app: separate slugs, bundle IDs, and EAS projects per product surface
* APP\_VARIANT and app.config.ts branch identity without forking the repo
* Feature flags gate runtime behavior - they do not replace architectural module boundaries
* White-label is modular monolith with per-tenant config - not N separate codebases
* Split into multi-app when release cadence, compliance, or store listings truly diverge

## Recipe

> Quick-reference recipe card - copy-paste ready.

```ts
// app.config.ts - one codebase, variant-driven identity
import { ExpoConfig, ConfigContext } from "expo/config";
 
const variant = process.env.APP_VARIANT ?? "consumer";
 
const variants: Record<string, { name: string; bundleId: string; enableB2B: boolean }> = {
  consumer: { name: "Shop", bundleId: "com.example.shop", enableB2B: false },
  business: { name: "Shop Business", bundleId: "com.example.shop.business", enableB2B: true },
};
 
const active = variants[variant] ?? variants.consumer;
 
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: active.name,
  slug: "shop",
  ios: { bundleIdentifier: active.bundleId },
  android: { package: active.bundleId },
  extra: {
    appVariant: variant,
    featureFlags: {
      b2bPortal: active.enableB2B,
      newCheckout: process.env.EXPO_PUBLIC_FF_NEW_CHECKOUT === "true",
    },
  },
});
```

```bash
# Same repo - different installable apps via EAS profiles
APP_VARIANT=consumer eas build --profile production-consumer --platform ios
APP_VARIANT=business eas build --profile production-business --platform ios
```

**When to reach for this:**

* Product asks for a "business app" alongside consumer - decide if it is a flag or a store listing.
* White-label tenants need custom bundle IDs but share 90% of code.
* Compliance requires isolating admin tooling from consumer-facing binaries.
* Release managers want one vs two App Store Connect records.

## Working Example

```tsx
// src/shared/config/featureFlags.ts
import Constants from "expo-constants";
 
type FeatureFlags = {
  b2bPortal: boolean;
  newCheckout: boolean;
};
 
export function getFeatureFlags(): FeatureFlags {
  const extra = Constants.expoConfig?.extra as { featureFlags?: FeatureFlags } | undefined;
  return {
    b2bPortal: extra?.featureFlags?.b2bPortal ?? false,
    newCheckout: extra?.featureFlags?.newCheckout ?? false,
  };
}
```

```tsx
// src/app/navigation/useAppRoutes.ts - modular monolith gates tabs at runtime
import { useMemo } from "react";
import { getFeatureFlags } from "@/shared/config/featureFlags";
 
export function useAppRoutes() {
  const flags = getFeatureFlags();
 
  return useMemo(() => {
    const tabs = [
      { name: "index", title: "Home" },
      { name: "orders", title: "Orders" },
    ];
    if (flags.b2bPortal) {
      tabs.push({ name: "b2b", title: "B2B Portal" });
    }
    return tabs;
  }, [flags.b2bPortal]);
}
```

```tsx
// app/(tabs)/_layout.tsx - render only enabled tabs
import { Tabs } from "expo-router";
import { useAppRoutes } from "@/app/navigation/useAppRoutes";
 
export default function TabLayout() {
  const routes = useAppRoutes();
 
  return (
    <Tabs>
      {routes.map((route) => (
        <Tabs.Screen key={route.name} name={route.name} options={{ title: route.title }} />
      ))}
    </Tabs>
  );
}
```

```json
// eas.json - multi-app: separate profiles per store listing
{
  "build": {
    "production-consumer": {
      "env": { "APP_VARIANT": "consumer" },
      "channel": "production-consumer"
    },
    "production-business": {
      "env": { "APP_VARIANT": "business" },
      "channel": "production-business"
    }
  }
}
```

```text
# Multi-app repo layout (when listings fully diverge)
apps/
├── consumer-mobile/     # slug: shop-consumer
└── business-mobile/     # slug: shop-business
packages/
├── features/            # shared feature modules
└── ui/
```

**What this demonstrates:**

* **Modular monolith** toggles `b2bPortal` tab via `extra.featureFlags` - one codebase, two EAS profiles.
* **`APP_VARIANT`** changes bundle ID and display name - users install two apps from one repo.
* **Multi-app** layout separates `apps/consumer-mobile` and `apps/business-mobile` when CI, icons, and native config diverge heavily.
* Feature flags **hide UI** - they do not remove dead code from the binary unless paired with build-time stripping.

## Deep Dive

### How It Works

#### Comparison matrix

| Dimension | Modular monolith | Multi-app repo |
| --- | --- | --- |
| Store listings | One or variants via bundle ID | Separate per `apps/*` |
| Code sharing | In-repo modules / flags | Workspace packages |
| Release cadence | Single train (flags gate risk) | Independent per app |
| Binary size | All modules compiled in\* | Each app ships only its graph |
| OTA updates | One channel per variant | Channel per app slug |
| Team ownership | Feature flags + module boundaries | Package boundaries + CODEOWNERS |

\*Use lazy routes and dead-code elimination; flags alone do not shrink native size.

#### Modular monolith patterns

| Pattern | Mechanism | Example |
| --- | --- | --- |
| Runtime flag | `extra.featureFlags` | Show B2B tab |
| Build-time variant | `APP_VARIANT` in `app.config.ts` | Different bundle ID |
| Lazy route | Expo Router dynamic import | Load `b2b` screens only when enabled |
| Module boundary | `features/b2b/` isolated public API | Disable imports when flag off |

#### When multi-app wins

* **Different Apple/Google developer accounts** per product.
* **Regulatory isolation** - HIPAA admin app cannot ship consumer analytics SDKs.
* **Radically different native config** - dissimilar plugins, entitlements, or minimum OS.
* **Independent versioning** - business app on 3.2 while consumer is 8.0.

#### White-label

White-label is usually **modular monolith + per-tenant build profile**:

```ts
// app.config.ts (excerpt) - tenant from env at build time
const tenant = process.env.TENANT ?? "acme";
 
export default {
  name: process.env.APP_NAME ?? "Acme Shop",
  slug: `shop-${tenant}`,
  ios: { bundleIdentifier: `com.${tenant}.shop` },
  extra: { tenant, primaryColor: process.env.PRIMARY_COLOR },
};
```

Each tenant gets an EAS profile - not a forked Git branch.

### TypeScript Notes

```tsx
// Fail closed when required module is disabled
import { getFeatureFlags } from "@/shared/config/featureFlags";
 
export function B2BPortalScreen() {
  if (!getFeatureFlags().b2bPortal) {
    return null; // or redirect - route should also be unregistered
  }
  // ...
}
```

Prefer **excluding routes** from the navigator over rendering empty screens.

## Gotchas

* **Feature flags without module boundaries** - Disabled B2B still links if `features/b2b` imports leak. **Fix:** Isolate `features/b2b`; lint-import consumer-only apps away from it.
* **One slug, two bundle IDs** - Expo dashboard and OTA channels conflate. **Fix:** Separate EAS Update channels per `APP_VARIANT`.
* **Runtime flags for compliance** - Admin code still in the JS bundle. **Fix:** Multi-app or build-time exclusion for regulated SKUs.
* **Premature multi-app split** - Two apps, 99% shared code, double CI cost. **Fix:** Start monolith + variants; extract `apps/` when native config diverges.
* **Hard-coded API URLs per app** - Duplicated env logic. **Fix:** Central `getAppConfig()` keyed by `appVariant`.
* **Expo Go cannot test variants realistically** - Bundle IDs and icons need dev builds. **Fix:** EAS development profile per variant.
* **God `if (flags.x)` in every screen** - Unmaintainable branching. **Fix:** Register routes and navigators from a single `useAppRoutes()` / module manifest.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Modular monolith + flags | Same core product, optional modules | Compliance requires code separation |
| Multi-app monorepo | Independent releases, different native config | Only icon/name differs |
| Single app, server-driven flags | Remote experiments (LaunchDarkly, etc.) | Store listing must split |
| Flavors (Android) / schemes (iOS) bare | Brownfield native already flavorized | Greenfield managed Expo - use `app.config.ts` |
| Separate repos | Acquired products with no shared roadmap | Teams sharing features weekly |

## FAQs

What is a modular monolith on mobile?

One installable app binary containing multiple feature modules. Modules are bounded in code (`features/b2b`) and enabled via config or flags - not separate microservices.

When is one binary with flags enough?

When products share navigation, native plugins, and release cadence - only some tabs or flows differ (B2B portal, beta features, tenant branding).

When do I need separate apps in the repo?

When bundle IDs, store accounts, native entitlements, or release schedules are genuinely independent - not merely different themes.

Do feature flags remove code from the bundle?

Runtime flags hide UI; they do not tree-shake native modules. Use build-time variants or separate apps to exclude regulated SDKs.

How does Expo Updates work with variants?

Assign **one channel per variant** (`production-consumer`, `production-business`). Publishing to the wrong channel updates the wrong listing.

Can modular monolith support white-label?

Yes - `TENANT` env in `app.config.ts` per EAS profile. Shared `packages/features` hold code; tenant assets live in profile-specific env or `assets/tenants/<name>/`.

APP\_VARIANT vs EXPO\_PUBLIC feature flags?

`APP_VARIANT` typically drives **identity** (name, bundle ID) at build time. `EXPO_PUBLIC_*` flags suit **runtime experiments** embedded in JS - both can coexist.

How do I hide Expo Router routes when a flag is off?

Conditionally register `Tabs.Screen` / `Stack.Screen` entries from a route manifest - do not rely on users never deep-linking to disabled paths.

Is multi-app the same as monorepo?

No. Monorepo is repo layout. Multi-app means **multiple Expo apps** (`apps/a`, `apps/b`). A monorepo can host one app (modular monolith) or many.

What about Android applicationId vs iOS bundleIdentifier?

Both branch from `app.config.ts` per variant. Keep them in sync with `APP_VARIANT` - mismatched IDs break deep links and push credentials.

Can I merge consumer and business apps later?

Easier than splitting. Migrate business-only modules behind flags, unify bundle ID strategy deliberately - store listings may require user reinstall.

How does this relate to EAS build profiles?

Each profile sets `env` (`APP_VARIANT`, `TENANT`, flags). Profiles are the delivery mechanism for both monolith variants and multi-app targets.

Should B2B and consumer share analytics?

Architecturally separate event namespaces per `appVariant`. Multi-app may use different analytics projects - plan before merging dashboards.

Modular monolith vs feature flags service?

Local flags gate **compile-time modules and navigation**. Remote flag services gate **experiments** - use both: module boundaries locally, remote for A/B.

## Related

* [Mobile Architecture Basics](https://docs.wahwei/reactnative.codeguides.io/architecture-design/mobile-architecture-basics/) - config boundaries and `getAppConfig()`
* [../project-setup/multiple-apps-in-one-repo/multiple-apps-in-one-repo.md](https://docs.wahwei/reactnative.codeguides.io/project-setup/multiple-apps-in-one-repo/) - workspace layout for several Expo apps
* [../project-setup/monorepo-with-turborepo/monorepo-with-turborepo.md](https://docs.wahwei/reactnative.codeguides.io/project-setup/monorepo-with-turborepo/) - CI for multi-app repos
* [Feature-Sliced Design for RN](https://docs.wahwei/reactnative.codeguides.io/architecture-design/feature-sliced-design-for-rn/) - module boundaries behind flags
* [../expo-platform/environments-and-eas-environment-variables/environments-and-eas-environment-variables.md](https://docs.wahwei/reactnative.codeguides.io/expo-platform/environments-and-eas-environment-variables/) - per-profile secrets

### External Related Links

* [reactnative.dev](https://reactnative.dev/) - official React Native site
* [Callstack ebooks & guides](https://www.callstack.com/ebooks) - in-depth RN guides (performance, optimization, brownfield)
* [react.dev](https://react.dev/) - core React concepts RN builds on

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
