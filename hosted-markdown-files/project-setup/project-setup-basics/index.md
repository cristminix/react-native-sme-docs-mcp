# Project Setup Basics

10 examples to get you started with Project Setup - 7 basic and 3 intermediate.

Highlights / Project Setup Basics

* Pin SDK 57 at scaffold time with default@sdk-57 - bare @latest may still resolve SDK 54
* The default template centers on app/ (Expo Router), app.config.ts, and SDK-pinned package.json
* Scripts delegate to expo start so LAN, tunnel, and dev-client flags stay consistent across the team
* npx expo-doctor compares your graph to the SDK 57 matrix before Metro surfaces obscure errors
* tsconfig.json extends expo/tsconfig.base - add strict without fighting Metro path aliases
* app.config.ts is the manifest single source of truth for bundle IDs, icons, and plugins
* First-run verification: install → expo-doctor → tsc --noEmit → expo start

## Prerequisites

Scaffold a production-shaped Expo app with an explicit SDK 57 pin. The `default@sdk-57` template ships Expo Router, TypeScript, and the recommended CLI scripts.

```bash
npx create-expo-app@latest MyApp --template default@sdk-57
cd MyApp
npm install
```

Confirm the SDK pin before adding features:

```json
{
  "dependencies": {
    "expo": "~57.0.4",
    "react": "19.2.3",
    "react-native": "0.86.0"
  }
}
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**.

---

## Basic Examples

### 1. Standard Expo Layout

A fresh `default@sdk-57` project is a small, predictable tree - learn these paths before adding features or monorepo packages.

```text
MyApp/
├── app/                    # Expo Router screens and layouts
│   ├── _layout.tsx         # Root stack / providers
│   ├── index.tsx           # "/" route
│   └── (tabs)/             # Tab group (template starter)
├── assets/                 # Icons, splash, images referenced in config
├── app.config.ts           # Dynamic manifest (name, bundle ID, plugins)
├── package.json            # SDK-pinned deps and npm scripts
├── tsconfig.json           # Extends expo/tsconfig.base
├── babel.config.js         # Expo preset for Metro
├── metro.config.js         # Metro bundler entry (often default export)
└── node_modules/
```

* **`app/`** replaces a single `App.tsx` - file names map to routes (`app/settings.tsx` → `/settings`)
* **`app/_layout.tsx`** is the root layout: wrap providers, fonts, and navigation chrome here
* **`assets/`** files are referenced by URI in `app.config.ts` (`icon`, `splash`) and imported in components
* No `ios/` or `android/` in pure managed mode - they appear after `npx expo prebuild` or an EAS build

> **Related:** [create-expo-app Templates](https://docs.wahwei/reactnative.codeguides.io/project-setup/create-expo-app-templates/) - blank, tabs, and bare-minimum trade-offs | [Folder Structure for Features](https://docs.wahwei/reactnative.codeguides.io/project-setup/folder-structure-for-features/) - scaling past the starter tree

---

### 2. SDK Pin in package.json

The `expo` package version is the contract every other Expo module must satisfy.

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "private": true,
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "expo": "~57.0.4",
    "react": "19.2.3",
    "react-native": "0.86.0"
  }
}
```

* **`expo` ~57.0.4** locks the project to SDK 57 - mixing SDK 56 native modules with SDK 57 `expo` causes build failures
* **`main: "expo-router/entry"`** wires Metro to Expo Router's bootstrap instead of `expo/AppEntry.js`
* Pin **exact React and React Native peers** shown in the template - `npx expo install` uses them as the compatibility baseline
* After cloning, run `npm install` then `npx expo-doctor` before writing feature code

> **Related:** [create-expo-app Templates](https://docs.wahwei/reactnative.codeguides.io/project-setup/create-expo-app-templates/) - template-specific dependency sets | [../expo-platform/create-expo-app-quickstart.md](https://docs.wahwei/reactnative.codeguides.io/expo-platform/create-expo-app-quickstart/) - scaffold flags and verification checklist

---

### 3. package.json Scripts

Default scripts delegate to the Expo CLI so every teammate uses the same dev-server flags.

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "lint": "expo lint",
    "typecheck": "tsc --noEmit"
  }
}
```

```bash
# Common start variants - pass flags after --
npm run start -- --clear          # bust Metro cache after dependency changes
npm run start -- --tunnel         # share QR across networks (slower)
npm run start -- --dev-client     # open in a custom development build
npm run ios                       # shorthand for simulator
```

* **`expo start`** owns Metro, the dev menu, and QR codes - avoid calling `react-native start` directly in Expo projects
* Platform scripts (`android`, `ios`) are shortcuts; they still launch Metro first, then open the target
* Add **`typecheck`** early so CI can gate merges without a full native compile
* Use **`npx expo install <pkg>`** when adding native modules - it reads the pinned `expo` version and picks compatible semver ranges

> **Related:** [Project Setup Best Practices](https://docs.wahwei/reactnative.codeguides.io/project-setup/best-practices/) - scripts every team should standardize on

---

### 4. tsconfig.json

Extend Expo's base TypeScript config, then tighten checks without breaking Metro's path resolution.

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ]
}
```

* **`extends: "expo/tsconfig.base"`** ships the correct `jsx`, `moduleResolution`, and Expo Router types
* **`strict: true`** catches nullability bugs early - mobile crashes are harder to debug than web console errors
* **`paths`** with `@/*` matches common import aliases; Metro reads the same mapping via `tsconfigPaths` in newer Expo templates
* Include **`.expo/types/**/*.ts`** so typed routes generated by Expo Router are part of `tsc --noEmit`

> **Related:** [../typescript-rn/expo-router-typed-routes/expo-router-typed-routes.md](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/expo-router-typed-routes/) - typed routes generated into `.expo/types`

---

### 5. app.config.ts

`app.config.ts` is the single source of truth for app identity, icons, permissions, and config plugins.

```ts
import { ExpoConfig, ConfigContext } from "expo/config";
 
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "My App",
  slug: "my-app",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "myapp",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.example.myapp",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: "com.example.myapp",
  },
  plugins: ["expo-router"],
  experiments: {
    typedRoutes: true,
  },
});
```

* **`slug`** drives Expo dashboard URLs and update channels - change it deliberately alongside `name` and bundle IDs
* **`scheme`** registers deep-link prefixes consumed by Expo Router and `expo-linking`
* **`plugins`** run at prebuild time - they are ignored by Expo Go when the plugin is not bundled in the client
* Prefer **`app.config.ts` over `app.json`** when you need environment branching without committing secrets

> **Related:** [../expo-platform/expo-platform-basics/expo-platform-basics.md](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-platform-basics/) - managed workflow and config overview

---

### 6. expo-doctor

Run `expo-doctor` after every scaffold, clone, or dependency bump - it compares your graph to the SDK 57 compatibility database.

```bash
npx expo-doctor
```

```bash
# Typical fix path when doctor reports version skew
npx expo install --fix
npx expo-doctor
```

Example output to act on (not ignore):

```text
✖ expo-camera@15.0.0 - expected ~17.0.0 for SDK 57
✖ react-native-reanimated@3.16.0 - expected ~4.0.0 for SDK 57
 
› Run: npx expo install --fix
```

* **Errors block reliable builds** - mismatched native module majors compile in JS but crash at runtime
* **`expo install --fix`** rewrites `package.json` ranges to SDK-compatible versions without guessing semver manually
* Re-run doctor after fixes until the report is clean (warnings deserve a team review, not silent ignores)
* Add doctor to **CI** on pull requests so version skew never merges to `main`

> **Related:** [../expo-platform/upgrading-expo-sdk-versions/upgrading-expo-sdk-versions.md](https://docs.wahwei/reactnative.codeguides.io/expo-platform/upgrading-expo-sdk-versions/) - intentional SDK bumps

---

### 7. Metro and Babel Wiring

Metro and Babel configs are thin in a standard Expo app - keep them minimal unless monorepo resolution requires changes.

```js
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};
```

```js
// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
 
/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
 
module.exports = config;
```

* **`babel-preset-expo`** enables Reanimated, Expo Router, and environment transforms expected by SDK 57
* **`getDefaultConfig`** from `expo/metro-config` sets `resolver`, `transformer`, and asset extensions for the pinned SDK
* Do not copy Metro configs from bare React Native blogs - Expo's defaults already account for `expo` asset hashing
* Touch these files only when adding **monorepo `watchFolders`** or custom resolvers - see the shared-packages guide before editing

> **Related:** [Shared Packages & Metro Resolution](https://docs.wahwei/reactnative.codeguides.io/project-setup/shared-packages-and-metro-resolution/) - `watchFolders` and symlink pitfalls

---

## Intermediate Examples

### 8. First-Run Verification

A short verification script catches SDK drift, TypeScript errors, and config mistakes before anyone writes feature code.

```bash
#!/usr/bin/env bash
# scripts/verify-first-run.sh
set -euo pipefail
 
echo "→ Checking SDK pin…"
node -e "
  const p = require('./package.json').dependencies;
  const expected = { expo: '~57.0.4', react: '19.2.3', 'react-native': '0.86.0' };
  for (const [k, v] of Object.entries(expected)) {
    if (p[k] !== v) throw new Error(\`Expected \${k}=\${v}, got \${p[k]}\`);
  }
  console.log('  SDK pin OK');
"
 
echo "→ Running expo-doctor…"
npx expo-doctor
 
echo "→ Typechecking…"
npx tsc --noEmit
 
echo "→ Resolving public config…"
npx expo config --type public | head -n 20
 
echo "✅ First-run checks passed - run: npm run start"
```

```bash
chmod +x scripts/verify-first-run.sh
./scripts/verify-first-run.sh
```

* Run this **after `npm install`** on every fresh clone - lockfiles can be correct while a teammate's global CLI is stale
* The **SDK pin assertion** fails fast when someone scaffolded without `@sdk-57`
* **`expo config --type public`** confirms plugins and bundle identifiers resolve - catch typos in `app.config.ts` early
* Commit the script so onboarding is one command, not tribal knowledge

> **Related:** [../expo-platform/create-expo-app-quickstart/create-expo-app-quickstart.md](https://docs.wahwei/reactnative.codeguides.io/expo-platform/create-expo-app-quickstart/) - reproducible team scaffold script

---

### 9. Environment-Aware app.config.ts

Branch app identity on `APP_VARIANT` so dev, staging, and production builds coexist without separate repos.

```ts
import { ExpoConfig, ConfigContext } from "expo/config";
 
const APP_VARIANT = process.env.APP_VARIANT ?? "development";
 
const bundleSuffix = APP_VARIANT === "production" ? "" : `.${APP_VARIANT}`;
 
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_VARIANT === "production" ? "My App" : `My App (${APP_VARIANT})`,
  slug: "my-app",
  ios: {
    bundleIdentifier: `com.example.myapp${bundleSuffix}`,
  },
  android: {
    package: `com.example.myapp${bundleSuffix}`,
  },
  extra: {
    appVariant: APP_VARIANT,
  },
});
```

```bash
# Launch with a variant - name and bundle ID change per command
APP_VARIANT=development npx expo start
APP_VARIANT=staging npx expo run:ios
APP_VARIANT=production npx eas build --profile production --platform all
```

* **`APP_VARIANT`** is a team convention - Expo does not define it; consistency matters more than the exact name
* Different **bundle identifiers per variant** let QA install staging beside production on the same device
* Surface the variant in **`extra`** so runtime code can gate logging, API base URLs, or feature flags
* Pair with EAS **build profiles** that set `env.APP_VARIANT` per channel - avoid hard-coding URLs in source

> **Related:** [Multiple Apps in One Repo](https://docs.wahwei/reactnative.codeguides.io/project-setup/multiple-apps-in-one-repo/) - white-label and flavor-specific apps | [../expo-platform/environments-and-eas-environment-variables/environments-and-eas-environment-variables.md](https://docs.wahwei/reactnative.codeguides.io/expo-platform/environments-and-eas-environment-variables/) - per-environment secrets

---

### 10. Git and Lockfile Hygiene

Commit the lockfile and a mobile-aware `.gitignore` on day one - reproducible installs matter for EAS and teammates.

```gitignore
# dependencies
node_modules/
 
# Expo
.expo/
dist/
web-build/
 
# Native (managed workflow - generated at build)
ios/
android/
 
# Secrets
.env
.env.*
!.env.example
```

```bash
git init
git add .
git commit -m "chore: scaffold MyApp (default@sdk-57)"
```

```json
{
  "engines": {
    "node": ">=20.0.0"
  }
}
```

* **Commit exactly one lockfile** (`package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml`) - EAS uses it to reproduce installs
* **Ignore `.expo/`** - local dev state; it should not merge across machines
* Ignore **`ios/` and `android/`** in managed workflow until you intentionally adopt Continuous Native Generation (CNG) or bare workflow
* Pin **`engines.node`** so CI and laptops run the same Node major - SDK 57 tooling expects Node 20+

> **Related:** [Monorepo with Turborepo](https://docs.wahwei/reactnative.codeguides.io/project-setup/monorepo-with-turborepo/) - lockfile strategy when apps share packages | [Project Setup Best Practices](https://docs.wahwei/reactnative.codeguides.io/project-setup/best-practices/) - conventions that scale past the first sprint

---

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
