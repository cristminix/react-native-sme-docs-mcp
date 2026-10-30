# Coding Standards & Style Guides

A cookbook for **RN/Expo style guide enforcement** - ESLint, Prettier, TypeScript, PR review, and CODEOWNERS wired so standards survive turnover without a style sheriff in every thread.

Highlights / Coding Standards & Style Guides

* One command surface: format:check, lint, typecheck, test - local, hooks, and CI call the same scripts
* eslint-config-expo/flat + Prettier + tsc --noEmit - three gates, three failure classes
* PR template checkboxes beat Slack reminders - standards without enforcement decay in month two
* Custom ESLint rules encode RN-specific bans: deep feature imports, inline styles on hot paths
* CODEOWNERS on app.config.ts, plugins/, eas.json - style guide extends to config files
* Zero-warning ESLint policy requires CI --max-warnings 0 - warnings become errors on main

## Recipe

> Quick-reference recipe card - copy-paste ready.

```json
// package.json - the four scripts every gate calls
{
  "scripts": {
    "lint": "expo lint",
    "lint:ci": "expo lint -- --max-warnings 0",
    "typecheck": "tsc --noEmit",
    "format:check": "prettier --check .",
    "test": "jest"
  }
}
```

```bash
# Local pre-push (identical sequence to CI)
npm run format:check && npm run lint:ci && npm run typecheck && npm run test
```

```text
Enforcement stack
  Prettier     → formatting (quotes, commas, import order)
  ESLint       → RN/React patterns, hooks, restricted imports
  TypeScript   → types strict - no implicit any in src/
  PR template  → human gates ESLint cannot cover
  CODEOWNERS   → native-touch and release config paths
```

**When to reach for this:**

* Team size crossed two engineers and PRs debate formatting weekly.
* Onboarding hires from web React who import `div` habits into RN.
* You have [Standards Basics](https://docs.wahwei/reactnative.codeguides.io/governance/standards-basics/) written but nobody reads them.
* CI green but production still ships `any`, inline styles on lists, and deep feature imports.
* Monorepo needs the same gates on `apps/mobile` and `packages/ui`.

**When to avoid:**

* Solo prototype with no CI - run `npx expo lint` and ship; formalize when a second contributor joins.
* Replacing architecture review with lint rules - ESLint cannot enforce feature boundaries without custom rules.

## Working Example

End-to-end enforcement for an Expo SDK 57 app from scaffold through merged PR.

**Step 1 - Scaffold lint and format**

```bash
npx create-expo-app@latest StyleApp --template default@sdk-57
cd StyleApp
npx expo lint
npm install --save-dev prettier @ianvs/prettier-plugin-sort-imports eslint-config-prettier
```

```js
// eslint.config.js - extend expo flat config
import expo from "eslint-config-expo/flat";
import prettier from "eslint-config-prettier";
 
export default [
  { ignores: [".expo/", "dist/", "ios/", "android/"] },
  ...expo,
  prettier,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
```

* Full ESLint setup: [Linting Basics](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/linting-basics/)
* Import order: [Prettier & Import Sorting](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/prettier-and-import-sorting/)

**Step 2 - TypeScript strict baseline**

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

```bash
npm run typecheck   # must pass before every PR merge
```

* Stricter options: [TypeScript Strict Mode](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/typescript-strict-mode/)
* `tsc` and ESLint catch different bugs - run both in CI

**Step 3 - Husky pre-commit (optional accelerator)**

```bash
npm install --save-dev husky
npx husky init
```

```bash
# .husky/pre-commit
npm run format:check && npm run lint && npm run typecheck
```

* Hooks **mirror CI** - never run different commands locally vs GitHub Actions
* Hooks are not a substitute for branch protection - developers can `--no-verify`
* CI gate: [CI Quality Gates](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/ci-quality-gates/)

**Step 4 - Custom RN rules for architecture**

```js
// eslint.config.js - add restricted imports (see full recipes in custom rules page)
{
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@/features/*/*"],
            message: "Import from @/features/<name> barrel only - see CONTRIBUTING.md",
          },
        ],
      },
    ],
  },
}
```

* Ban `StyleSheet.create` in list `renderItem` hot paths via custom rule or review checklist
* Ban `console.log` in `src/` - use structured logging adapter
* Full rule pack: [Custom ESLint Rules for RN](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/custom-eslint-rules-for-rn/)

**Step 5 - GitHub Actions quality workflow**

```yaml
# .github/workflows/quality.yml
name: Quality Gates
on:
  pull_request:
    branches: [main]
 
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run format:check
      - run: npm run lint:ci
      - run: npm run typecheck
      - run: npm run test -- --ci
```

* Branch protection requires `quality` check - red lint cannot merge
* Monorepo: `turbo run lint typecheck test` fans out across packages

**Step 6 - PR template human gates**

```markdown
## Style & standards
- [ ] Imports use feature barrels only (`@/features/<name>`)
- [ ] No new `any` without `// eslint-disable-next-line` + ticket comment
- [ ] Lists use FlashList/FlatList - no ScrollView for dynamic feeds
- [ ] Native-touch files: prebuild diff attached (if applicable)
 
## Evidence
- [ ] iOS tested - build_id or screenshot
- [ ] Android tested - build_id or screenshot
```

* Template items reference [Expo Project Rules Checklist](https://docs.wahwei/reactnative.codeguides.io/expo-rules/expo-project-rules-checklist/)
* Reviewers reject "I'll fix in follow-up" on standards violations - follow-up PRs rarely land

**Step 7 - CODEOWNERS for config and native touch**

```text
# .github/CODEOWNERS
app.config.ts           @mobile-platform
eas.json                @mobile-release
plugins/                @mobile-platform
ios/                    @mobile-platform
android/                @mobile-platform
.github/workflows/      @mobile-infra
```

* CODEOWNERS auto-requests reviewers - complements ESLint for files lint does not parse
* Release config changes need [Release and OTA Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/) reviewer

---

## Style Guide Essentials

Publish these bullets in `docs/STYLE.md` - link from PR template.

### TypeScript

| Rule | Do | Don't |
| --- | --- | --- |
| Props | `type ButtonProps = { label: string }` | `any` props |
| Components | Named export or default export per file - pick one per folder | Mixed patterns |
| Nullability | `order?.id` with strict null checks | `as` casts to silence errors |
| Enums | `as const` objects | TypeScript `enum` (tree-shaking) |

### React / RN components

```tsx
// ✅ Pressable + accessibility
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Submit order"
  onPress={onSubmit}
>
  <Text>Submit</Text>
</Pressable>
 
// ❌ TouchableOpacity without a11y props on interactive controls
```

* **Prefer `Pressable`** over legacy touchables for new code
* **`StyleSheet.create`** at module scope - not inline objects in list rows
* **Hooks rules:** [React Hooks Lint Rules](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/react-hooks-lint-rules/)

### Imports order (Prettier plugin)

```tsx
import { useState } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
 
import { Button } from "@/shared/ui";
import { useOrders } from "@/features/orders";
 
import { styles } from "./styles";
```

### File size and complexity

* **Screen files** target < 200 lines - extract hooks and subcomponents
* **One component per file** unless small colocated helpers (< 20 lines)
* Cyclomatic complexity: flag functions with > 10 branches in review - optional ESLint `complexity` rule

---

## Review Enforcement Rubric

| Severity | Example | Action |
| --- | --- | --- |
| **Block** | Secret in `EXPO_PUBLIC_*`, deep feature import, missing `expo-doctor` on SDK PR | Request changes |
| **Block** | `ScrollView` + `.map()` for unbounded list | Request changes |
| **Discuss** | `exhaustive-deps` warning with documented exception | Comment + ticket |
| **Nit** | Variable rename outside PR scope | Approve or optional follow-up |

* **Blockers reference a doc link** - not reviewer preference
* **ADR exceptions** override blockers when linked - [Architecture Decision Records](https://docs.wahwei/reactnative.codeguides.io/expo-rules/architecture-decision-records/)
* **Escalation:** repeated violations → pair programming session, not public call-out

---

## Monorepo Extension

```json
// turbo.json
{
  "pipeline": {
    "lint": { "dependsOn": ["^lint"] },
    "typecheck": { "dependsOn": ["^typecheck"] },
    "test": { "dependsOn": ["^test"] }
  }
}
```

```bash
# Root package.json
turbo run format:check lint typecheck test
```

* **Shared `packages/eslint-config`** exports flat config consumed by all apps
* **One Prettier config** at root - `.prettierignore` skips `ios/`, `android/`, `.expo/`
* Dead code scan monthly: [Dead Code & Dependency Analysis](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/dead-code-and-dependency-analysis/)

---

## FAQs

Prettier or ESLint for import sorting?

**Pick one.** This cookbook uses Prettier + `@ianvs/prettier-plugin-sort-imports`. Do not also enable `eslint-plugin-import` order rules - they fight on every save.

Warnings in CI - fail or allow?

**Fail on `main` and `release/*`** with `--max-warnings 0`. Feature branches may tolerate warnings during migration sprints - but merge gate is zero warnings.

How do style guides relate to expo-rules?

**expo-rules** are product/architecture non-negotiables (secrets, OTA, navigation). **Style guides** are code hygiene. Both appear in PR template; expo-rules violations are always blockers.

## Related

* [Standards Basics](https://docs.wahwei/reactnative.codeguides.io/governance/standards-basics/) - naming, folders, native touch
* [Linting Basics](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/linting-basics/) - ESLint 9 flat config
* [CI Quality Gates](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/ci-quality-gates/) - GitHub Actions wiring
* [Custom ESLint Rules for RN](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/custom-eslint-rules-for-rn/) - restricted imports
* [Expo Project Rules Checklist](https://docs.wahwei/reactnative.codeguides.io/expo-rules/expo-project-rules-checklist/) - merge blockers
* [Linting & Formatting Best Practices](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/best-practices/) - 25-point summary
* [Governance Best Practices](https://docs.wahwei/reactnative.codeguides.io/governance/best-practices/) - team-wide governance summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
