# Prettier & Import Sorting

Prettier removes formatting debates across your Expo app and any shared packages in a monorepo. Import sorting keeps `react-native` above local feature imports so diffs stay readable when screens grow past a dozen dependencies.

Highlights / Prettier & Import Sorting

* One root .prettierrc covers apps/mobile and packages/ui - Metro does not care about import order, but humans do
* Use prettier --check in CI and --write locally; never format in CI without committing
* @ianvs/prettier-plugin-sort-imports groups react, react-native, expo, then relative paths
* eslint-config-prettier disables ESLint formatting rules so lint and format stay separate
* .prettierignore must skip .expo/, ios/, android/, and lock files
* Import sorting via Prettier plugin or ESLint import/order - pick one, not both fighting

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npm install --save-dev prettier @ianvs/prettier-plugin-sort-imports eslint-config-prettier
 
# Check formatting (CI)
npx prettier --check .
 
# Fix formatting locally
npx prettier --write .
```

```json
// package.json scripts
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

**When to reach for this:**

* Two or more contributors touching the same `.tsx` screens and shared UI packages.
* A Turborepo or Nx monorepo where `apps/mobile` and `packages/ui` must share one style.
* PRs that currently mix quote style, trailing commas, and import reordering in every review.
* CI that should fail when someone forgets to run format before pushing.
* Teams that want import groups (`react` → `expo` → `@repo/*` → relative) without manual cleanup.

## Working Example

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 80,
  "endOfLine": "lf",
  "plugins": ["@ianvs/prettier-plugin-sort-imports"],
  "importOrder": [
    "<BUILTIN_MODULES>",
    "",
    "^react$",
    "^react-native$",
    "^expo",
    "^@react-navigation",
    "<THIRD_PARTY_MODULES>",
    "",
    "^@repo/(.*)$",
    "",
    "^@/(.*)$",
    "",
    "^[./]"
  ],
  "importOrderType": "mixed"
}
```

```gitignore
# .prettierignore
node_modules/
.expo/
dist/
coverage/
ios/
android/
*.lock
package-lock.json
pnpm-lock.yaml
```

```javascript
// eslint.config.js - disable ESLint formatting; keep import/order optional
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const eslintConfigPrettier = require("eslint-config-prettier");
 
module.exports = defineConfig([
  expoConfig,
  eslintConfigPrettier,
  {
    ignores: [".expo/**", "ios/**", "android/**"],
  },
]);
```

```tsx
// apps/mobile/app/(tabs)/index.tsx - after Prettier + import plugin
import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
 
import { useRouter } from "expo-router";
 
import { Button } from "@repo/ui/button";
 
import { useSession } from "@/hooks/useSession";
 
import { HomeHero } from "../../components/HomeHero";
 
export default function HomeScreen() {
  const router = useRouter();
  const { user } = useSession();
 
  const onContinue = useCallback(() => {
    router.push("/settings");
  }, [router]);
 
  return (
    <View style={styles.container}>
      <HomeHero name={user?.displayName ?? "Guest"} />
      <Button variant="primary" onPress={onContinue}>
        Continue
      </Button>
      <Pressable onPress={() => router.push("/help")}>
        <Text style={styles.link}>Help</Text>
      </Pressable>
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  link: { color: "#2563eb", textAlign: "center" },
});
```

```json
// Root package.json in a monorepo - one format command for every workspace
{
  "scripts": {
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md}\""
  },
  "devDependencies": {
    "@ianvs/prettier-plugin-sort-imports": "^4.4.0",
    "eslint-config-prettier": "^10.0.0",
    "prettier": "^3.5.0"
  }
}
```

**What this demonstrates:**

* A single `.prettierrc` at the repo root formats both the Expo app and shared packages.
* `@ianvs/prettier-plugin-sort-imports` enforces stable import groups tuned for RN (`expo`, `@repo/*`, `@/*`).
* `.prettierignore` skips generated native folders and Expo cache so CI stays fast.
* `eslint-config-prettier` turns off ESLint rules that duplicate Prettier - run `lint` and `format:check` as separate scripts.
* Monorepo scripts use explicit globs so Prettier does not walk `node_modules` in every package.

## Deep Dive

### How It Works

* Prettier parses each file into an AST and reprints it with fixed rules - it does not "suggest" style, it enforces it.
* Import-sort plugins run **after** Prettier's printer pass, reordering `import` statements to match `importOrder` regex groups.
* Metro bundles whatever import order you ship; sorting is a **maintainability** win, not a runtime optimization.
* `eslint-config-prettier` is a one-way gate: ESLint handles correctness (`react-hooks/exhaustive-deps`), Prettier handles whitespace and quotes.
* In monorepos, put config at the root and run Prettier from the root so `packages/ui` and `apps/mobile` never drift.

### Config at a Glance

| File | Purpose |
| --- | --- |
| `.prettierrc` | Quote style, trailing commas, import-order plugin |
| `.prettierignore` | Skip `.expo/`, `ios/`, `android/`, lock files |
| `eslint.config.js` | `eslint-config-expo` + `eslint-config-prettier` last |
| `package.json` scripts | `format` (local) vs `format:check` (CI) |

### Import Sorting Strategies

| Approach | Pros | Cons |
| --- | --- | --- |
| `@ianvs/prettier-plugin-sort-imports` | One command formats + sorts; works in editors | Competes with ESLint `import/order` if both enabled |
| `prettier-plugin-organize-imports` | Uses TypeScript's organize-imports | Can remove "unused" imports you meant to keep for side effects |
| ESLint `import/order` only | Sort on `eslint --fix` without Prettier plugin | Two tools to configure; import order not applied by format-on-save alone |

**Recommendation:** Pick Prettier plugin **or** ESLint `import/order`, not both with conflicting group rules.

### Monorepo Notes

```yaml
# turbo.json - cache format check like lint
{
  "tasks": {
    "format:check": {
      "outputs": []
    }
  }
}
```

```json
// apps/mobile/package.json
{
  "scripts": {
    "format:check": "prettier --check ."
  }
}
```

* Share one `.prettierrc` via the repo root; avoid per-package copies that diverge on `printWidth`.
* When `packages/ui` publishes through `exports` maps, sorted imports make public entry points obvious in reviews.
* Run `prettier --check` from CI at the root with a glob - faster than spawning per-package jobs for small teams.

### TypeScript Notes

```tsx
// Prettier preserves type-only imports when importOrderType is "mixed"
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
 
// importOrderType: "inline" merges type and value from the same module
// importOrderType: "mixed" keeps type imports grouped with their module
```

## Gotchas

* **Prettier vs ESLint formatting fight** - Both try to control quotes and semicolons, producing an infinite fix loop in the editor. **Fix:** Add `eslint-config-prettier` after `eslint-config-expo` in flat config; never use `eslint-plugin-prettier` as a rule runner.
* **Formatting `.expo/types` or `ios/`** - Generated route types and prebuild folders create huge noisy diffs. **Fix:** Add `.expo/`, `ios/`, and `android/` to `.prettierignore` unless you intentionally format committed native projects.
* **Two import sorters** - Prettier plugin and ESLint `import/order` with different group rules reshuffle imports on every save. **Fix:** Disable `import/order` in ESLint when the Prettier plugin owns sorting.
* **`--write` in CI** - CI formats files on the runner but does not commit them, so the job passes while `main` stays unformatted. **Fix:** Use `prettier --check` in CI; reserve `--write` for local runs and lint-staged hooks.
* **Lock files formatted by mistake** - Without `.prettierignore`, Prettier touches `package-lock.json` and creates merge conflicts. **Fix:** Ignore `*lock*` files explicitly.
* **Editor uses wrong formatter** - VS Code may default to the built-in TypeScript formatter for `.tsx`. **Fix:** Set `"editor.defaultFormatter": "esbenp.prettier-vscode"` for `[typescriptreact]` and install the Prettier extension.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| ESLint `import/order` only | You refuse Prettier plugins and already run `eslint --fix` on commit | You want format-on-save to also sort imports |
| `prettier-plugin-organize-imports` | You trust TS to drop unused imports | Imports exist only for side effects (polyfills, gesture handler setup) |
| [Biome](https://biomejs.dev/) | Greenfield repo wants one linter + formatter | You rely on Expo's `eslint-config-expo` presets and RN-specific plugins |
| Editor-only Prettier | Solo developer, no CI | Team needs enforceable gates on every PR |

## FAQs

Does Prettier work with Expo Router file-based routes?

* Yes. Prettier formats `.tsx` screens under `app/` like any other React file.
* Ignore `.expo/types/**/*.ts` in `.prettierignore` - those files are generated, not hand-edited.
* Import sorting still applies; keep `expo-router` in your `importOrder` group for consistency.

What is the difference between --check and --write?

* `--check` exits with code 1 when any file differs - use in CI and `npm run format:check`.
* `--write` mutates files in place - use locally before committing.
* Never run `--write` in CI unless a bot commits the result.

How do I share Prettier config across apps/mobile and packages/ui?

* Place `.prettierrc` and `.prettierignore` at the monorepo root.
* Run `prettier --check .` from the root with globs, or add `format:check` to each package's `package.json` pointing at the same config.
* See [Monorepo with Turborepo](https://docs.wahwei/reactnative.codeguides.io/project-setup/monorepo-with-turborepo/) for workspace layout.

Should I sort imports with Prettier or ESLint?

* **Prettier plugin:** one `format` command, works with format-on-save.
* **ESLint `import/order`:** sorts on lint fix; better if you skip Prettier entirely for imports.
* Pick one authority; disabling the other avoids ping-pong diffs.

Gotcha: Why does format-on-save not run Prettier in VS Code?

* Another formatter is set as default for `typescriptreact`.
* The Prettier extension is not installed or is disabled in workspace settings.
* **Fix:** Add `.vscode/settings.json` with `editor.defaultFormatter` set to `esbenp.prettier-vscode`.

Does printWidth force every line under 80 characters?

* No. `printWidth` is a target; long strings, URLs, and import paths may exceed it.
* Prettier prefers readable breaks over strict column limits.

How do I add a blank line between import groups?

```json
"importOrder": ["^react$", "", "^expo", "", "^@repo/(.*)$", "", "^[./]"]
```

* Empty strings in the `importOrder` array insert blank lines between groups.

Do I need prettier for JSON and Markdown in an RN repo?

* Optional but common for `app.config.ts` companions (`eas.json`, `package.json` formatting on save).
* Limit CI globs to `*.{ts,tsx,js,jsx,json,md}` so you do not format assets or native project files.

How does eslint-config-prettier fit with eslint-config-expo?

* `eslint-config-expo` ships RN-aware lint rules including stylistic defaults.
* `eslint-config-prettier` disables any rule that overlaps with Prettier.
* Load Prettier's config **last** in flat config so overrides win.

Will import sorting break Metro barrel files?

* Sorting only reorders import lines at the top of a file.
* It does not change re-export graphs or `packages/ui` `exports` maps.
* Side-effect imports (`import "react-native-gesture-handler"`) stay in place when listed in `importOrder`.

Can I run format:check in Turborepo?

```json
// turbo.json
{
  "tasks": {
    "format:check": {
      "cache": true,
      "outputs": []
    }
  }
}
```

* Add `format:check` scripts to each package or run once at the root in CI.

What RN paths belong in importOrder regexes?

* `^react-native$` - core primitives before feature code.
* `^expo` - SDK modules (`expo-router`, `expo-font`, …).
* `^@react-navigation` - when using React Navigation outside Expo Router.
* `^@repo/` or `^@/` - monorepo aliases before relative `./` imports.

## Related

* [Linting Basics](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/linting-basics/) - `eslint-config-expo` flat config and first-pass rules
* [TypeScript Strict Mode](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/typescript-strict-mode/) - `tsc --noEmit` pairs with format checks in CI
* [CI Quality Gates](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/ci-quality-gates/) - wire `format:check` into GitHub Actions and EAS Workflows
* [Monorepo with Turborepo](https://docs.wahwei/reactnative.codeguides.io/project-setup/monorepo-with-turborepo/) - shared packages that need one Prettier config
* [Project Setup Basics](https://docs.wahwei/reactnative.codeguides.io/project-setup/project-setup-basics/) - default `expo lint` and `typecheck` scripts

> **Stack versions:** This page was written for **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**.

Reviewed by Chris St. John·Last updated Jul 16, 2026
