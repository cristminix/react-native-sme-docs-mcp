# app.json & app.config.js

Configure how Expo prebuilds native projects, how your app loads in Expo Go and development builds, and which non-secret values reach JavaScript at runtime - without leaking credentials into the bundle.

Highlights / app.json & app.config.js

* Static app.json for tooling edits; app.config.ts when you need env branches and typed config
* EXPO\_PUBLIC\_ vars inline at bundle time - never put secrets there
* extra passes non-secret runtime config via Constants.expoConfig.extra
* npx expo config --type public shows exactly what ships in the client bundle
* Config plugins in app.config mutate native projects at prebuild/EAS build time

## Recipe

> Quick-reference recipe card - copy-paste ready.

```ts
// app.config.ts
import { ExpoConfig, ConfigContext } from "expo/config";
 
const APP_ENV = process.env.APP_ENV ?? "development";
 
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_ENV === "production" ? "Acme" : "Acme (Dev)",
  slug: "acme-mobile",
  scheme: "acme",
  extra: {
    appEnv: APP_ENV,
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "https://staging.api.acme.test",
  },
  ios: { bundleIdentifier: "com.acme.mobile" },
  android: { package: "com.acme.mobile" },
});
```

```bash
# Inspect the resolved public manifest (what Constants.expoConfig will expose)
APP_ENV=development EXPO_PUBLIC_API_URL=https://staging.api.acme.test npx expo config --type public
```

**When to reach for this:**

* Setting bundle identifiers, icons, splash, deep-link `scheme`, and EAS Update settings.
* Branching app name, API URLs, or feature flags per environment without maintaining three repos.
* Passing **non-secret** runtime config to JS via `extra` and `Constants.expoConfig`.
* Registering **config plugins** that modify `android/` and `ios/` during prebuild.

## Working Example

```ts
// app.config.ts - staging vs production with secrets-safe patterns
import { ExpoConfig, ConfigContext } from "expo/config";
 
type AppEnv = "development" | "staging" | "production";
 
function resolveEnv(): AppEnv {
  const raw = process.env.APP_ENV ?? "development";
  if (raw === "staging" || raw === "production") return raw;
  return "development";
}
 
const env = resolveEnv();
 
const apiUrlByEnv: Record<AppEnv, string> = {
  development: "http://localhost:4000",
  staging: "https://staging.api.acme.test",
  production: "https://api.acme.com",
};
 
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: env === "production" ? "Acme" : `Acme (${env})`,
  slug: "acme-mobile",
  scheme: "acme",
  version: "1.4.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  plugins: ["expo-router"],
  extra: {
    appEnv: env,
    // Non-secret values only - readable in the compiled app
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? apiUrlByEnv[env],
    featureFlags: {
      newCheckout: env !== "production",
    },
  },
  ios: {
    bundleIdentifier:
      env === "production" ? "com.acme.mobile" : `com.acme.mobile.${env}`,
    supportsTablet: true,
  },
  android: {
    package: env === "production" ? "com.acme.mobile" : `com.acme.mobile.${env}`,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
  },
});
```

```tsx
// src/config/runtime.ts - read resolved config at runtime (not raw app.config.ts)
import Constants from "expo-constants";
 
type Extra = {
  appEnv: "development" | "staging" | "production";
  apiUrl: string;
  featureFlags: { newCheckout: boolean };
};
 
const extra = Constants.expoConfig?.extra as Extra;
 
export const appEnv = extra.appEnv;
export const apiUrl = extra.apiUrl;
export const featureFlags = extra.featureFlags;
```

```bash
# Local development (staging API)
APP_ENV=staging EXPO_PUBLIC_API_URL=https://staging.api.acme.test npx expo start
 
# EAS production build - secrets live in EAS, not in app.config
APP_ENV=production eas build --profile production --platform ios
```

**What this demonstrates:**

* `app.config.ts` merges over static `app.json` values using the `({ config })` middleware pattern.
* `APP_ENV` switches native identifiers and display name per environment.
* `EXPO_PUBLIC_*` vars inline into JS at bundle time; `extra` exposes config through `Constants.expoConfig`.
* `npx expo config --type public` previews the client-visible manifest before you ship.

## Deep Dive

### How It Works

1. Expo CLI looks for **static** config (`app.json` or `app.config.json`) and **dynamic** config (`app.config.js` / `app.config.ts`). If both exist, dynamic wins after merging.
2. If dynamic config exports a **function**, Expo passes the normalized static config as `{ config }` and uses the return value as the final manifest.
3. The resolved config is **serialized to JSON** before any tool (Metro, EAS, prebuild) consumes it - no Promises, no async.
4. Fields in the **public** config are embedded in builds and available via `Constants.expoConfig`. Sensitive keys (`hooks`, `ios.config`, `android.config`, update signing fields) are filtered out.
5. **Config plugins** declared in `plugins` run during `npx expo prebuild` and EAS Build to mutate native projects.

### Config Resolution Order

| Step | Source | Notes |
| --- | --- | --- |
| 1 | `app.config.json` or `app.json` | Static baseline; CLI tools may auto-edit `app.json` |
| 2 | `app.config.ts` (preferred) or `app.config.js` | If both TS and JS exist, TypeScript wins |
| 3 | Function merge | `export default ({ config }) => ({ ...config, ... })` |
| 4 | `expo: {}` wrapper | If present at root, only the nested `expo` object is used |

```bash
# Full resolved config (includes native-only fields)
npx expo config
 
# Public subset - matches what JS can read at runtime
npx expo config --type public
```

### Environment Strategies

| Mechanism | Runs when | Safe for secrets | Read in app via |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_*` in `.env` | `expo start`, `expo export`, EAS Metro bundling | **No** - inlined into JS bundle | `process.env.EXPO_PUBLIC_API_URL` |
| `APP_ENV` / custom shell vars | `app.config.ts` evaluation | Yes (build-time only, not auto-inlined) | `extra` → `Constants.expoConfig.extra` |
| EAS environment variables / secrets | EAS Build servers | Secrets yes (server-side) | Inject into `extra` at build time |
| `extra` field | Baked into manifest | **No** - ships in binary | `Constants.expoConfig.extra` |

```ts
// .env.development (committed - no secrets)
EXPO_PUBLIC_API_URL=http://localhost:4000
APP_ENV=development
```

```tsx
// Feature code - EXPO_PUBLIC_ must use dot notation (required for inlining)
const url = process.env.EXPO_PUBLIC_API_URL; // ✓
// const url = process.env["EXPO_PUBLIC_API_URL"]; // ✗ won't inline
```

### Secrets-Safe Rules

* **Never** put API keys, OAuth client secrets, or private signing material in `EXPO_PUBLIC_*`, `extra`, or committed `app.json`.
* **Do** keep server-side secrets in EAS Secrets and pass only derived, scoped tokens to the client when unavoidable.
* **Do** add `.env*.local` to `.gitignore` for machine-specific overrides.
* **Do not** `import app.json` in feature code - use `Constants.expoConfig` so you read the processed manifest.
* **Audit** with `npx expo config --type public` before every release.

### Common Config Surfaces

| Field | Purpose |
| --- | --- |
| `name` / `slug` | Display name and Expo project URL segment |
| `scheme` | Deep link scheme (`acme://`) |
| `ios.bundleIdentifier` / `android.package` | Store identity - must differ per env when installing side-by-side |
| `plugins` | Native mutations (permissions, entitlements, Gradle/Pod changes) |
| `updates.url` / `runtimeVersion` | EAS Update targeting |
| `extra` | Arbitrary JSON for runtime - treat as public |

### TypeScript Notes

```ts
// types/expo-extra.ts - share Extra shape between app.config and runtime
export type AppExtra = {
  appEnv: "development" | "staging" | "production";
  apiUrl: string;
};
 
// app.config.ts
import { ExpoConfig, ConfigContext } from "expo/config";
import type { AppExtra } from "./types/expo-extra";
 
export default ({ config }: ConfigContext): ExpoConfig => {
  const extra: AppExtra = {
    appEnv: "development",
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000",
  };
  return { ...config, extra };
};
```

Use `tsx` so `app.config.ts` can `import` local TypeScript modules and config plugins.

## Gotchas

* **Secrets in `EXPO_PUBLIC_` or `extra`** - Both end up in the client bundle; anyone can extract them. **Fix:** Keep secrets on your server; use short-lived tokens; store build secrets in EAS Secrets only.
* **Destructuring `process.env`** - `const { EXPO_PUBLIC_X } = process.env` is not inlined by Metro. **Fix:** Always use `process.env.EXPO_PUBLIC_X` dot notation in app code.
* **Importing `app.config.ts` from components** - Pulls Node-only logic into Metro and may leak build-time env handling. **Fix:** Read `Constants.expoConfig` or `process.env.EXPO_PUBLIC_*` in app code only.
* **Expecting `app.config` to reload like Fast Refresh** - Config re-evaluates when Metro restarts, not on every hot reload. **Fix:** Restart `expo start` after changing `app.config.ts`; full reload the app for `EXPO_PUBLIC_` changes.
* **Same bundle ID across staging and production** - Installing both builds on one device overwrites the other. **Fix:** Suffix identifiers (`com.acme.mobile.staging`) per environment.
* **Promises in dynamic config** - `export default async () => ({})` is invalid; config must resolve synchronously. **Fix:** Read env vars synchronously; fetch remote config from your API at app runtime instead.
* **Relying on `NODE_ENV` to pick `.env` files** - `expo export` and `eas update` force `NODE_ENV=production`. **Fix:** Use explicit `APP_ENV` or `eas env:pull` for environment switching.

pbqrthvqrf.vb|ptvb936|202607

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `app.json` only | Simple apps; no env branching | Multiple environments or typed dynamic config |
| `app.config.ts` + `extra` | Env-specific names, IDs, feature flags | You only need static icons and slug |
| `EXPO_PUBLIC_` `.env` files | Client-safe API URLs and feature toggles | Private keys or per-user secrets |
| EAS environment variables | CI/CD builds with server-held secrets | Pure local Expo Go prototyping with no EAS |
| Remote config (Firebase, LaunchDarkly) | Change flags without rebuilding | Build-time constants like bundle identifier |
| `react-native-config` (bare) | Legacy bare RN without Expo env support | New Expo SDK 57 projects - use `EXPO_PUBLIC_` |

## FAQs

What is the difference between app.json and app.config.js?

`app.json` is static JSON that tools can auto-update. `app.config.js` / `app.config.ts` is dynamic - it supports variables, environment branching, and TypeScript. Expo merges static into dynamic when you export a function.

Which file should hold my configuration?

Keep a minimal `app.json` if tools expect it, but prefer `app.config.ts` as the source of truth for anything environment-dependent. Run `npx expo config` to see the merged result.

How do I read config values inside my React Native app?

Use `expo-constants`:

```tsx
import Constants from "expo-constants";
const apiUrl = Constants.expoConfig?.extra?.apiUrl;
```

For `EXPO_PUBLIC_` variables, use `process.env.EXPO_PUBLIC_API_URL` directly in source files.

Why should I not import app.json in components?

Direct imports bypass Expo's config processing pipeline and can bundle raw file contents. `Constants.expoConfig` returns the resolved, public-safe manifest used in builds.

What does npx expo config --type public show?

The subset of config embedded in your app and exposed to JavaScript - the same shape available through `Constants.expoConfig`. Use it to audit leaks before release.

How do EXPO\_PUBLIC\_ environment variables work?

Expo CLI loads `.env` files and inlines `process.env.EXPO_PUBLIC_*` references into your JavaScript bundle at build time. They are visible to end users - never store secrets there.

What is the extra field for?

`extra` is an arbitrary JSON object copied into the public manifest. Pass feature flags, environment labels, or non-sensitive endpoints. Read it via `Constants.expoConfig.extra`.

How do I configure different bundle IDs per environment?

Branch in `app.config.ts` on `APP_ENV`:

```ts
ios: {
  bundleIdentifier:
    env === "production" ? "com.acme.app" : "com.acme.app.staging",
},
```

Set `APP_ENV` when running `eas build` or locally in your shell.

Can app.config.ts use async/await or fetch?

No. Dynamic config must return a plain object synchronously - no Promises. Fetch remote settings after app launch in JavaScript instead.

Gotcha: Why did my EXPO\_PUBLIC variable show up as undefined?

Common causes: missing `EXPO_PUBLIC_` prefix, using bracket notation (`process.env['EXPO_PUBLIC_X']`), or forgetting to restart Metro after changing `.env`. Fix the prefix, use dot notation, and run `npx expo start --clear`.

How do config plugins relate to app.config?

List plugin names or paths in the `plugins` array. They execute during prebuild/EAS Build to modify native projects (permissions, entitlements, Gradle). They do not run in Expo Go for native code not already bundled there.

Should I commit .env files?

Commit `.env` with non-secret defaults if helpful. Never commit `.env.local` or files with credentials. Add `.env*.local` to `.gitignore`.

How does APP\_ENV differ from NODE\_ENV?

`NODE_ENV` is owned by Node and bundlers - `expo export` forces `production`. `APP_ENV` is a custom variable you control for staging/production switching in `app.config.ts` without fighting tooling.

What fields are filtered from the public config?

`hooks`, `ios.config`, `android.config`, and EAS Update code-signing fields are stripped from `Constants.expoConfig`. Do not rely on reading them from JS.

How do I type expoConfig.extra in TypeScript?

Define a shared `AppExtra` type and cast:

```ts
import Constants from "expo-constants";
import type { AppExtra } from "../types/expo-extra";
const extra = Constants.expoConfig?.extra as AppExtra;
```

Keep the type in a file imported by both `app.config.ts` and runtime code.

## Related

* [create-expo-app Quickstart](https://docs.wahwei/reactnative.codeguides.io/expo-platform/create-expo-app-quickstart/) - scaffold before you wire app config
* [Environments & EAS Environment Variables](https://docs.wahwei/reactnative.codeguides.io/expo-platform/environments-and-eas-environment-variables/) - EAS-side secrets and env pull workflows
* [Expo Go vs Development Builds](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-go-vs-development-builds/) - which config fields Expo Go can actually exercise
* [Upgrading Expo SDK Versions](https://docs.wahwei/reactnative.codeguides.io/expo-platform/upgrading-expo-sdk-versions/) - config schema changes across SDK majors
* [Expo Modules Core](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-modules-core/) - how native modules consume config at build time
* [Best Practices](https://docs.wahwei/reactnative.codeguides.io/expo-platform/best-practices/) - release hygiene and config review cadence

### External Related Links

* [docs.expo.dev](https://docs.expo.dev/) - official Expo docs (recommended framework)
* [Expo GitHub & examples](https://github.com/expo/expo) - Expo monorepo + example projects
* [reactnative.dev](https://reactnative.dev/) - official React Native site

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 19, 2026
