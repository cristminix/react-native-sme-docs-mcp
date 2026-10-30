# Linting Basics

10 examples to get you started with Linting & Formatting - 7 basic and 3 intermediate.

Highlights / Linting Basics

* SDK 57 scaffolds ESLint 9 flat config via `npx expo lint` - no legacy `.eslintrc`
* `eslint-config-expo/flat` bundles React, hooks, import, and Expo-aware globals out of the box
* The `lint` npm script delegates to `expo lint` so CI and laptops share the same entry point
* Put global `ignores` in their own config object - mixing ignores with rules changes ESLint semantics
* Prefix intentionally unused params with `\_` to satisfy `@typescript-eslint/no-unused-vars`
* Metro and Babel config files need Node globals - `eslint-config-expo` handles most of them automatically
* Pair `npm run lint` with `tsc --noEmit` before EAS builds - types and lint catch different failure classes

## Prerequisites

Start from an Expo SDK 57 project. The `default@sdk-57` template already includes TypeScript and the recommended scripts - you only need to add ESLint once.

```bash
npx create-expo-app@latest MyApp --template default@sdk-57
cd MyApp
npx expo lint
```

`npx expo lint` installs `eslint`, `eslint-config-expo`, and writes `eslint.config.js` at the project root. Confirm the SDK pin before customizing rules:

```json
{
  "dependencies": {
    "expo": "~57.0.4",
    "react": "19.2.3",
    "react-native": "0.86.0"
  },
  "devDependencies": {
    "eslint": "^9.0.0",
    "eslint-config-expo": "~57.0.0"
  }
}
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**. Install the [ESLint VS Code extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) so violations surface while you edit.

---

## Basic Examples

### 1. Scaffold with `npx expo lint`

The Expo CLI is the supported path to a working flat config - it pins compatible `eslint` and `eslint-config-expo` versions for your SDK.

```bash
# First run: installs devDependencies and creates eslint.config.js
npx expo lint
 
# Subsequent runs: lint the whole project
npx expo lint
 
# Auto-fix safe violations
npx expo lint --fix
```

* **`npx expo lint`** reads the `lint` script from `package.json` and forwards flags to ESLint
* First run may take a moment while packages install - commit the generated `eslint.config.js` and lockfile changes together
* Warnings do not fail CI by default - treat warnings as errors locally if your team runs a zero-warning policy
* Delete any leftover `.eslintrc.*` files before adopting flat config - ESLint 9 prefers flat config but falls back to legacy when both exist

> **Related:** [../project-setup/project-setup-basics.md](https://docs.wahwei/reactnative.codeguides.io/project-setup/project-setup-basics/) - SDK pin and first-run verification checklist

---

### 2. Default `eslint-config-expo` Flat Config

SDK 53+ projects use ESLint flat config. The scaffolded file extends Expo's preset - React, hooks, TypeScript, and import rules are already wired.

```js
// eslint.config.js
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
 
module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
]);
```

* **`eslint-config-expo/flat`** exports a `defineConfig` array - spread or reference it as the first block so Expo defaults load before your overrides
* The preset registers **browser and React Native globals** (`__DEV__`, `fetch`, Hermes-friendly APIs) so screen files lint without `/* global */` comments
* **`@typescript-eslint`** rules apply to `.ts` and `.tsx` files when TypeScript is present in the project
* Keep custom rules in a **separate object after** `expoConfig` so you override rather than replace the preset

> **Related:** [Prettier & Import Sorting](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/prettier-and-import-sorting/) - layer Prettier without fighting ESLint formatting rules

---

### 3. `npm run lint` Script

Wire linting into `package.json` so teammates, pre-commit hooks, and CI all invoke the same command.

```json
{
  "scripts": {
    "start": "expo start",
    "lint": "expo lint",
    "lint:fix": "expo lint --fix",
    "typecheck": "tsc --noEmit"
  }
}
```

```bash
npm run lint
npm run lint:fix
```

* **`"lint": "expo lint"`** is what `npx expo lint` executes under the hood - prefer the npm script in docs and CI YAML so the entry point stays obvious
* Add **`lint:fix`** for local cleanup; avoid auto-fix in CI unless your pipeline is idempotent and fast
* Pair **`typecheck`** with lint - ESLint catches patterns TypeScript ignores (hooks deps, import order) and vice versa
* EAS Build does not run lint for you - scripts must be explicit in GitHub Actions or EAS Workflows

> **Related:** [CI Quality Gates](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/ci-quality-gates/) - fail builds on lint and typecheck together

---

### 4. First Custom Rules

Start with a small rules block after the Expo preset. These two adjustments cover most new Expo teams without turning lint into a rewrite project.

```js
// eslint.config.js
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
 
module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "react/react-in-jsx-scope": "off",
    },
  },
  {
    ignores: ["dist/*", ".expo/*"],
  },
]);
```

```tsx
// app/index.tsx - `_event` is intentionally unused; lint passes
import { Pressable, Text } from "react-native";
 
export default function Home() {
  return (
    <Pressable onPress={(_event) => console.warn("pressed")}>
      <Text>Tap me</Text>
    </Pressable>
  );
}
```

* **`argsIgnorePattern: "^_"`** is the standard escape hatch for event handlers you must accept but do not read
* **`react/react-in-jsx-scope: off`** is correct for React 17+ JSX transform - Expo's Babel preset already enables it
* Add rules **one at a time** and fix the resulting violations before piling on stricter settings
* Prefer `"warn"` temporarily when rolling out a rule across a large brownfield codebase

> **Related:** [TypeScript Strict Mode](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/typescript-strict-mode/) - align compiler strictness with lint rules over time

---

### 5. Global Ignores for Expo Artifacts

Generated and vendored paths should never block a merge. In flat config, put ignores in a dedicated object with `ignores` as the only key.

```js
// eslint.config.js
const { defineConfig, globalIgnores } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
 
module.exports = defineConfig([
  globalIgnores([
    "node_modules/**",
    ".expo/**",
    "dist/**",
    "web-build/**",
    "ios/**",
    "android/**",
  ]),
  expoConfig,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
]);
```

* **`globalIgnores`** (or a standalone `{ ignores: [...] }` object) skips files entirely - faster runs and fewer false positives
* Ignore **`.expo/`** - local dev server state, not source
* Ignore **`ios/` and `android/`** in managed workflow until you intentionally commit native projects (CNG / bare)
* Mixing `ignores` with `rules` in the same object creates a **file-scoped filter**, not a global skip - keep ignores isolated

> **Related:** [Dead Code & Dependency Analysis](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/dead-code-and-dependency-analysis/) - find unused files lint never touches

---

### 6. Lint One Path with `--fix`

Target a feature folder while iterating so feedback stays fast on large apps.

```bash
# Lint only the app router tree
npx expo lint app
 
# Lint a shared package in a monorepo
npx expo lint packages/ui/src
 
# Fix auto-fixable issues in one screen
npx expo lint app/(tabs)/index.tsx --fix
```

```tsx
// app/(tabs)/index.tsx - missing hook dep flagged before you open a PR
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
 
export default function TabHome() {
  const [count, setCount] = useState(0);
 
  useEffect(() => {
    const id = setInterval(() => setCount((c) => c + 1), 1000);
    return () => clearInterval(id);
  }, []); // eslint may warn: react-hooks/exhaustive-deps
 
  return (
    <View>
      <Text>Count: {count}</Text>
    </View>
  );
}
```

* Scoping to **`app/`** matches how Expo Router teams organize features - lint the folder you are actively changing
* **`--fix`** rewrites import order and simple style issues; it will not invent hook dependency arrays for you
* `react-hooks/exhaustive-deps` warnings often surface **stale closures** in timers and subscriptions - read the message before silencing it
* Full-project `npm run lint` remains the merge gate even when you lint locally by path

> **Related:** [React Hooks Lint Rules](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/react-hooks-lint-rules/) - exhaustive-deps patterns in async mobile code

---

### 7. Node Globals for Config Files

App screens run in Hermes or the browser; `metro.config.js` and `app.config.ts` run in Node. Expo's preset already relaxes Node globals for common config filenames - extend the list when you add custom tooling files.

```js
// eslint.config.js
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const globals = require("globals");
 
module.exports = defineConfig([
  expoConfig,
  {
    files: ["metro.config.js", "app.config.ts", "babel.config.js"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    ignores: ["dist/*"],
  },
]);
```

```js
// metro.config.js - __dirname is valid under Node globals
const { getDefaultConfig } = require("expo/metro-config");
 
/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
 
module.exports = config;
```

* Without Node globals, ESLint flags **`__dirname`**, `require`, and `module` as undefined in config files
* **`eslint-config-expo`** already special-cases several config paths - add explicit `files` blocks only for custom names (`tailwind.config.js`, `scripts/**`)
* Use **`/* eslint-env node */`** as a last resort in a single legacy file - prefer centralized `languageOptions` in flat config
* Keep config files **plain `.js` or `.ts`** at the repo root so the `files` glob stays simple

> **Related:** [../project-setup/project-setup-basics.md](https://docs.wahwei/reactnative.codeguides.io/project-setup/project-setup-basics/) - `metro.config.js` and `app.config.ts` layout

---

## Intermediate Examples

### 8. RN-Specific Rule Layer

After the baseline passes, add mobile-focused rules: ban raw text outside `<Text>`, discourage `console.log` in shipping code, and require testID on pressables you cover in E2E.

```js
// eslint.config.js
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
 
module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "react-native/no-raw-text": [
        "error",
        { skip: ["Trans", "Animated.Text"] },
      ],
    },
  },
  {
    ignores: ["dist/*", ".expo/*"],
  },
]);
```

```tsx
// Violation: bare string as a child of View - wrap with Text
import { View, Text, Pressable } from "react-native";
 
export function SettingsRow({ label }: { label: string }) {
  return (
    <Pressable accessibilityRole="button" testID="settings-row">
      <View>
        <Text>{label}</Text>
      </View>
    </Pressable>
  );
}
```

* **`react-native/no-raw-text`** catches a common crash class on Android - strings must live inside `<Text>`
* **`no-console`** as `warn` keeps debug logs visible in review without blocking merges on day one
* Install **`eslint-plugin-react-native`** when you enable RN-specific rules: `npx expo install eslint-plugin-react-native --dev`
* Custom team rules (import boundaries, design-system-only colors) belong in a shared config package - see the dedicated checklist page

> **Related:** [Custom ESLint Rules for RN](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/custom-eslint-rules-for-rn/) - ban `console.log`, a11y props, and import boundaries

---

### 9. Monorepo Lint Scope

In a Turborepo or npm-workspaces layout, point ESLint at each app's source roots and share one base config from `packages/eslint-config`.

```json
{
  "name": "mobile",
  "private": true,
  "scripts": {
    "lint": "expo lint app src",
    "lint:all": "turbo run lint"
  }
}
```

```js
// apps/mobile/eslint.config.js
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const baseRules = require("@myorg/eslint-config/expo");
 
module.exports = defineConfig([
  expoConfig,
  baseRules,
  {
    ignores: ["dist/*", ".expo/*", "ios/**", "android/**"],
  },
]);
```

* Pass **explicit directories** to `expo lint` when app code lives outside `app/` (e.g. `src/features/`)
* Extract shared overrides to **`packages/eslint-config`** so mobile and web apps inherit the same unused-var and import rules
* Run **`lint:all` from the repo root** in CI so a shared hook change in `packages/ui` fails before publish
* Each app still owns its **`ignores`** block - native folders and build output differ per target

> **Related:** [../project-setup/monorepo-with-turborepo.md](https://docs.wahwei/reactnative.codeguides.io/project-setup/monorepo-with-turborepo/) - workspace layout and task graph | [CI Quality Gates](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/ci-quality-gates/) - matrix builds per app

---

### 10. Lint + Typecheck Pre-Build Gate

Treat lint and TypeScript as complementary gates before `eas build` or a store submission - they catch different defect classes.

```json
{
  "scripts": {
    "lint": "expo lint",
    "typecheck": "tsc --noEmit",
    "validate": "npm run typecheck && npm run lint"
  }
}
```

```bash
npm run validate
```

```tsx
// TypeScript passes; ESLint flags the hook - validate catches both
import { useCallback, useState } from "react";
import { Button, View } from "react-native";
 
export function Counter() {
  const [n, setN] = useState(0);
  const increment = useCallback(() => setN(n + 1), []); // stale closure risk
 
  return (
    <View>
      <Button title={`${n}`} onPress={increment} />
    </View>
  );
}
```

* **`tsc --noEmit`** validates types without emitting JS - fast enough for every PR
* **`expo lint`** runs the hooks plugin - stale closures like `useCallback(..., [])` reading `n` are lint findings, not type errors
* Name the combo script **`validate`** or **`check`** and call it from CI, pre-push hooks, and local pre-release rituals
* Metro may still bundle code that fails `validate` - never skip the gate because the simulator launched

> **Related:** [TypeScript Strict Mode](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/typescript-strict-mode/) - tighten `strict` incrementally | [Linting Best Practices](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/best-practices/) - zero-warning policy without slowing velocity

---

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
