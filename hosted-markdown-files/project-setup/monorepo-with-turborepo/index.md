# Monorepo with Turborepo

A Turborepo monorepo lets multiple Expo apps share TypeScript config, ESLint rules, and a UI package while Turbo caches lint and typecheck tasks across CI. Expo SDK 57 detects workspaces automatically - you focus on package boundaries, not Metro wiring.

Highlights / Monorepo with Turborepo

* Expo SDK 52+ auto-configures Metro for monorepos - delete manual watchFolders if you migrated from older guides
* workspace:\* links apps/mobile to packages/ui via symlinks - edits are visible without publishing
* Duplicate react-native versions in one monorepo cause build and runtime failures - run pnpm why react-native
* turbo.json dev tasks should set cache: false and persistent: true for expo start
* Keep product features in the app - packages/ui holds primitives, not feature screens

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
mkdir mobile-monorepo && cd mobile-monorepo
pnpm init
 
# Workspace roots (create pnpm-workspace.yaml - see Working Example)
npx create-expo-app@latest apps/mobile --template default@sdk-57 --yes
 
mkdir -p packages/ui/src
pnpm add turbo -Dw
 
# Link UI package into the app (from apps/mobile/package.json)
# "@repo/ui": "workspace:*"
 
pnpm install
pnpm turbo run typecheck
pnpm turbo run dev --filter=mobile
```

**When to reach for this:**

* Two or more Expo apps (consumer + admin, white-label flavors) sharing components and utilities.
* A design-system package consumed by mobile and a future web admin.
* CI that runs lint/typecheck across apps and packages with remote caching.
* Colocating native modules or shared business logic without publishing to npm.

## Working Example

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

```json
// package.json (root)
{
  "name": "mobile-monorepo",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "doctor": "turbo run doctor"
  },
  "devDependencies": {
    "turbo": "^2.5.0",
    "typescript": "^5.8.0"
  },
  "packageManager": "pnpm@10.0.0",
  "engines": {
    "node": ">=20"
  }
}
```

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "doctor": {
      "cache": false
    }
  }
}
```

```json
// apps/mobile/package.json
{
  "name": "mobile",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "dev": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "lint": "expo lint",
    "typecheck": "tsc --noEmit",
    "doctor": "expo-doctor"
  },
  "dependencies": {
    "@repo/ui": "workspace:*",
    "expo": "~57.0.4",
    "expo-router": "~6.0.8",
    "react": "19.2.3",
    "react-native": "0.86.0"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "typescript": "^5.8.0"
  }
}
```

```json
// packages/ui/package.json
{
  "name": "@repo/ui",
  "version": "0.0.0",
  "private": true,
  "exports": {
    "./button": "./src/button.tsx",
    "./screen": "./src/screen.tsx"
  },
  "scripts": {
    "lint": "eslint . --max-warnings 0",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": "^19.2.3",
    "react-native": "0.86.0"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@types/react": "^19.0.0",
    "react": "19.2.3",
    "react-native": "0.86.0",
    "typescript": "^5.8.0"
  }
}
```

```tsx
// packages/ui/src/button.tsx
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";
 
type ButtonProps = PressableProps & {
  children: ReactNode;
  variant?: "primary" | "secondary";
};
 
export function Button({ children, variant = "primary", style, ...rest }: ButtonProps) {
  return (
    <Pressable style={[styles.base, variant === "primary" ? styles.primary : styles.secondary, style]} {...rest}>
      <Text style={styles.label}>{children}</Text>
    </Pressable>
  );
}
 
const styles = StyleSheet.create({
  base: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, alignItems: "center" },
  primary: { backgroundColor: "#2563eb" },
  secondary: { backgroundColor: "#e2e8f0" },
  label: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
});
```

```tsx
// apps/mobile/app/(tabs)/index.tsx
import { Button } from "@repo/ui/button";
import { StyleSheet, Text, View } from "react-native";
 
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shared UI from @repo/ui</Text>
      <Button variant="primary" onPress={() => {}}>
        Continue
      </Button>
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  title: { fontSize: 20, fontWeight: "700" },
});
```

```js
// apps/mobile/metro.config.js - SDK 52+ default is usually enough
const { getDefaultConfig } = require("expo/metro-config");
 
module.exports = getDefaultConfig(__dirname);
```

**What this demonstrates:**

* **`pnpm-workspace.yaml`** declares `apps/*` and `packages/*` - Expo detects the monorepo and configures Metro automatically on SDK 57.
* **`workspace:*`** symlinks `@repo/ui` into `apps/mobile/node_modules` - Metro bundles source `.tsx` from the package without a separate build step.
* **`turbo.json`** runs `typecheck` and `lint` with `^` dependency ordering - shared packages check before apps.
* **`peerDependencies`** on `react` and `react-native` in `@repo/ui` prevent duplicate renderer copies inside the package.
* **Minimal `metro.config.js`** - no manual `watchFolders` when using `expo/metro-config` on SDK 52+.

## Deep Dive

### How It Works

* **Workspaces** let `apps/mobile` depend on local packages via symlinks instead of npm publishes.
* **Turborepo** builds a task graph from each workspace's `package.json` scripts and caches task outputs by input hash.
* **Expo Metro (SDK 52+)** auto-detects monorepos and watches workspace packages - manual `watchFolders` / `extraNodeModules` are only needed for legacy setups or non-standard layouts.
* **Metro bundles workspace TSX** directly - unlike Next.js, there is no `transpilePackages` equivalent; Babel processes linked source through the app's config.
* **EAS Build** runs from the app directory (`apps/mobile`) but installs dependencies from the monorepo root when configured with the correct working directory.

### Recommended Layout

```text
mobile-monorepo/
├── apps/
│   ├── mobile/              # Expo SDK 57 consumer app (default@sdk-57)
│   └── admin/               # optional second app
├── packages/
│   ├── ui/                  # shared primitives (Button, Screen)
│   ├── typescript-config/   # shared tsconfig bases
│   └── eslint-config/       # shared lint rules
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

| Directory | Owns | Does not own |
| --- | --- | --- |
| `apps/mobile` | Routes (`app/`), feature folders, app config | Generic buttons usable by every app |
| `packages/ui` | Design-system primitives, shared styles | Feature screens, navigation, API clients |
| `packages/typescript-config` | `base.json`, `expo.json` extends | App-specific path aliases |

### turbo.json Tasks for Expo

| Task | `cache` | `persistent` | Notes |
| --- | --- | --- | --- |
| `dev` (`expo start`) | `false` | `true` | Long-running dev server |
| `typecheck` | default | - | Fast CI gate; cacheable |
| `lint` | default | - | Cacheable per package |
| `doctor` (`expo-doctor`) | `false` | - | Validates SDK 57 dependency graph |

```bash
# Run only the mobile app dev server
pnpm turbo run dev --filter=mobile
 
# Typecheck mobile and everything it depends on
pnpm turbo run typecheck --filter=mobile...
 
# Typecheck only packages changed since main
pnpm turbo run typecheck --filter="...[origin/main]"
```

### Duplicate Dependency Prevention

Expo monorepos fail when multiple copies of `react`, `react-native`, or native modules resolve:

```bash
pnpm why --depth=10 react-native
pnpm why --depth=10 react
```

| Problem | Fix |
| --- | --- |
| Two `react-native` versions | Align versions in root `package.json` `pnpm.overrides` or `resolutions` |
| Package missing `react` peer | Add `peerDependencies` in workspace packages; install peers in the app |
| Duplicate native modules | Enable `experiments.autolinkingModuleResolution` in `app.json` (SDK 54+; automatic in SDK 55+ monorepos) |

```json
// Root package.json - force single React 19 across workspaces (pnpm)
{
  "pnpm": {
    "overrides": {
      "react": "19.2.3",
      "react-native": "0.86.0"
    }
  }
}
```

### TypeScript Notes

```json
// packages/typescript-config/expo.json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "noEmit": true,
    "strict": true
  }
}
```

```json
// apps/mobile/tsconfig.json
{
  "extends": "@repo/typescript-config/expo.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

Workspace packages need their own `tsconfig.json` with `"noEmit": true` for `turbo run typecheck`. Path aliases like `@/*` belong in each app - not in the shared base.

## Gotchas

* **Manual Metro monorepo config on SDK 57** - Copying pre-SDK-52 `watchFolders` recipes can conflict with Expo's automatic detection. **Fix:** Start with `getDefaultConfig(__dirname)` only; delete legacy resolver overrides and run `npx expo start --clear`.
* **Duplicate `react-native` versions** - Two versions in one monorepo cause native build and runtime errors. **Fix:** `pnpm why react-native`; add root overrides; never let packages pin different RN majors.
* **`workspace:*` with npm** - npm does not support the workspace protocol. **Fix:** Use pnpm (Turborepo's default recommendation), Yarn 4+, or Bun; or replace with `*` and accept weaker linking guarantees.
* **Feature screens in `packages/ui`** - Shared package imports `expo-router` and feature hooks; every app inherits unwanted navigation coupling. **Fix:** Keep features in `apps/mobile/src/features/`; packages hold primitives only.
* **Missing `exports` entries** - Adding `./card.tsx` without listing it in `package.json` `exports` breaks Metro resolution. **Fix:** Declare every subpath explicitly once `exports` is present.
* **pnpm isolated installs** - Strict isolation can break some React Native libraries. **Fix:** Use `nodeLinker: hoisted` in `pnpm-workspace.yaml` if resolution errors appear (Expo supports isolated installs from SDK 54+, but hoisted is safer during setup).
* **EAS Build from wrong directory** - Build profile points at repo root without monorepo install config. **Fix:** Set EAS `workingDirectory` to `apps/mobile` and install from root per [Expo monorepo guide](https://docs.expo.dev/guides/monorepos/).

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Turborepo + pnpm workspaces | Multiple Expo apps, shared packages, CI caching | Single standalone app - monorepo overhead not worth it |
| Yarn/npm workspaces only | Simple linking without task orchestration | You need Turbo cache and `turbo run --filter` on CI |
| Nx monorepo | Generators, affected graph, polyglot repos with RN plugin | You want the lightest possible Expo + packages setup |
| Polyrepo + published npm packages | Teams are independent; semver boundaries matter | Rapid iteration on shared UI - publish cycles slow you down |
| Single app with `src/components/` | One product, one store listing | Two apps sharing 60%+ UI code |

## FAQs

Why use Turborepo with Expo?

Workspaces alone link packages. Turborepo adds a task graph, local caching, and remote caching so `lint` and `typecheck` skip unchanged packages on CI. Filtering (`--filter=mobile`) targets one app and its dependencies.

Do I need custom Metro config for monorepos on SDK 57?

Usually no. Expo auto-configures Metro when it detects workspace roots and you use `expo/metro-config`. If you migrated from a pre-SDK-52 guide, remove manual `watchFolders` and `extraNodeModules`, then run `npx expo start --clear`.

What does workspace:\* mean?

It tells pnpm to symlink the local `packages/ui` workspace into `apps/mobile/node_modules` instead of downloading from npm. The `*` means "whatever version exists in the workspace."

Do shared packages need a build step?

For Metro bundling, no - apps import raw `.tsx` from `@repo/ui`. For publishing to npm outside the monorepo, add a `build` task that emits `dist/`. Inside the monorepo, source imports are standard.

How do I scaffold the Expo app inside apps/?

```bash
npx create-expo-app@latest apps/mobile --template default@sdk-57 --yes
```

Run `pnpm install` from the monorepo root afterward so workspace links resolve.

Can I add a second Expo app?

Yes. Scaffold `apps/admin` with the same template, add `"@repo/ui": "workspace:*"`, and run `pnpm turbo run dev --filter=admin`. Share `packages/ui` and `packages/typescript-config` across both.

How do I run only one app?

```bash
pnpm turbo run dev --filter=mobile
pnpm turbo run typecheck --filter=mobile...
```

The trailing `...` includes workspace dependencies of `mobile`.

Gotcha: why does Metro fail to resolve @repo/ui?

Common causes: missing `exports` entry for the subpath, package not listed in `pnpm-workspace.yaml`, or `pnpm install` not run from root. Verify `node_modules/@repo/ui` is a symlink to `packages/ui`.

How do I prevent duplicate react-native?

```bash
pnpm why --depth=10 react-native
```

Align all workspaces to `0.86.0`. Add root `pnpm.overrides` if a transitive dependency pulls a different major.

Should packages/ui use peerDependencies?

Yes. Declare `react` and `react-native` as peers so the app supplies a single copy. Install matching versions in the app's `dependencies`, not only in the package's `devDependencies`.

Where do feature folders live in a monorepo?

Inside each app: `apps/mobile/src/features/`. Shared packages hold primitives and utilities - not product feature screens. See [Folder Structure for Features](https://docs.wahwei/reactnative.codeguides.io/project-setup/folder-structure-for-features/).

How does EAS Build work with monorepos?

Point the build at the app subdirectory and install from the monorepo root. EAS detects `pnpm-lock.yaml` at the root. Set the app's `eas.json` and working directory per Expo's monorepo documentation.

What turbo.json settings does expo start need?

```json
"dev": { "cache": false, "persistent": true }
```

Dev servers are long-running and should not be cached as completed tasks.

Turborepo vs Nx for React Native?

Turborepo is lighter - task caching and filtering with minimal config. Nx adds generators, affected commands, and RN-specific plugins at more setup cost. See [Monorepo with Nx](https://docs.wahwei/reactnative.codeguides.io/project-setup/monorepo-with-nx/).

When is a monorepo the wrong choice?

Single app, single team, no shared packages. Monorepos add install complexity, duplicate-dependency risk, and tooling config. Start standalone; extract a monorepo when a second app or shared package is real - not speculative.

## Related

* [Shared Packages & Metro Resolution](https://docs.wahwei/reactnative.codeguides.io/project-setup/shared-packages-and-metro-resolution/) - `watchFolders`, legacy Metro overrides, and symlink pitfalls
* [Multiple Apps in One Repo](https://docs.wahwei/reactnative.codeguides.io/project-setup/multiple-apps-in-one-repo/) - white-label flavors sharing a core package
* [Monorepo with Nx](https://docs.wahwei/reactnative.codeguides.io/project-setup/monorepo-with-nx/) - generators and affected builds as an alternative orchestrator
* [Folder Structure for Features](https://docs.wahwei/reactnative.codeguides.io/project-setup/folder-structure-for-features/) - keep features in apps, primitives in packages
* [create-expo-app Templates](https://docs.wahwei/reactnative.codeguides.io/project-setup/create-expo-app-templates/) - scaffold `apps/mobile` with `default@sdk-57`
* [create-expo-app Quickstart](https://docs.wahwei/reactnative.codeguides.io/expo-platform/create-expo-app-quickstart/) - SDK pin verification after scaffold

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
