# CI Quality Gates

CI quality gates run the same `lint`, `typecheck`, `format:check`, and `test` scripts on every pull request - catching hook dependency mistakes and cross-package type breaks before EAS spends minutes on a native build.

Highlights / CI Quality Gates

* Standardize scripts: lint (expo lint), typecheck, format:check, test - CI calls the same npm scripts as local
* npm ci + Node 20 for deterministic GitHub Actions installs
* Run tsc --noEmit before EAS build jobs - native compile is too late to catch TS errors
* EAS Workflows use eas/checkout and eas/install\_node\_modules for cloud quality gates
* Branch protection requires status checks so red lint cannot merge to main
* Monorepos: turbo run lint typecheck test fans out across apps and packages

## Recipe

> Quick-reference recipe card - copy-paste ready.

```json
// package.json - scripts CI will call
{
  "scripts": {
    "lint": "expo lint",
    "typecheck": "tsc --noEmit",
    "format:check": "prettier --check .",
    "test": "jest"
  }
}
```

```bash
# Local pre-push (same sequence as CI)
npm run format:check && npm run lint && npm run typecheck && npm run test
```

**When to reach for this:**

* Every team using pull requests to merge into `main` or `release/*`.
* Expo apps where a type error currently surfaces only during `eas build`.
* Monorepos that need lint and `tsc` across `apps/mobile` and `packages/*`.
* Projects adopting EAS Workflows and wanting quality checks before `type: build` jobs.
* Enforcing a zero-warning ESLint policy without relying on honor-system pre-commit hooks.

## Working Example

```yaml
# .github/workflows/quality.yml
name: Quality Gates
 
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
 
concurrency:
  group: quality-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
 
jobs:
  quality:
    name: Lint, Format, Types, Tests
    runs-on: ubuntu-latest
    timeout-minutes: 15
 
    steps:
      - name: Checkout
        uses: actions/checkout@v4
 
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
 
      - name: Install dependencies
        run: npm ci
 
      - name: Generate Expo types
        run: npx expo customize tsconfig.json
 
      - name: Prettier
        run: npm run format:check
 
      - name: ESLint
        run: npm run lint
 
      - name: TypeScript
        run: npm run typecheck
 
      - name: Unit tests
        run: npm run test -- --ci --passWithNoTests
```

```yaml
# .eas/workflows/quality-gates.yml - same scripts on Expo infrastructure
name: Quality Gates
 
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
 
concurrency:
  cancel_in_progress: true
  group: ${{ workflow.filename }}-${{ github.ref }}
 
jobs:
  quality:
    name: Lint, Format, Types, Tests
    steps:
      - uses: eas/checkout
      - uses: eas/use_npm_token
      - uses: eas/install_node_modules
 
      - name: Generate Expo types
        run: npx expo customize tsconfig.json
 
      - name: Format check
        run: npm run format:check
 
      - name: Lint
        run: npm run lint
 
      - name: Typecheck
        run: npm run typecheck
 
      - name: Unit tests
        run: npm run test -- --ci --passWithNoTests
 
  build_ios:
    name: iOS build (after quality)
    needs: [quality]
    type: build
    params:
      platform: ios
      profile: preview
```

```json
// turbo.json - monorepo fans out the same gates
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "lint": {
      "dependsOn": ["^lint"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "test": {
      "dependsOn": ["^test"]
    },
    "format:check": {
      "outputs": []
    }
  }
}
```

```yaml
# .github/workflows/quality-monorepo.yml
name: Monorepo Quality
 
on:
  pull_request:
 
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
      - run: npx turbo run format:check lint typecheck test
```

**What this demonstrates:**

* One `package.json` script surface - developers and CI run identical commands.
* GitHub Actions uses `npm ci`, Node 20, and concurrency cancellation to save minutes.
* `npx expo customize tsconfig.json` ensures `.expo/types` exists before `tsc --noEmit`.
* EAS Workflows reuse the same scripts, then `needs: [quality]` blocks native builds on failure.
* Turborepo runs lint/typecheck/test across workspaces with dependency-aware ordering.

## Deep Dive

### How It Works

* Each CI step is a shell command that exits non-zero on failure - GitHub and EAS mark the run failed.
* `expo lint` wraps ESLint with `eslint-config-expo` - errors fail the job unless you pass `--max-warnings` intentionally.
* `tsc --noEmit` validates the entire TypeScript graph, including workspace packages imported by the app.
* `prettier --check` fails on formatting drift without mutating the runner filesystem.
* Branch protection rules can require the `quality` check before merge - policy enforcement, not suggestions.

### Scripts CI Should Call

| Script | Command | Catches |
| --- | --- | --- |
| `format:check` | `prettier --check .` | Inconsistent quotes, imports, trailing commas |
| `lint` | `expo lint` | Hooks deps, unused vars, RN a11y gaps |
| `typecheck` | `tsc --noEmit` | Broken exports, bad route params, API types |
| `test` | `jest` / `vitest` | Regressions in hooks, utils, reducers |

### GitHub Actions vs EAS Workflows

| Platform | Best for | Notes |
| --- | --- | --- |
| GitHub Actions | PR checks on every push; open-source; monorepo turbo | Familiar YAML; free tier limits apply |
| EAS Workflows | Quality gate **before** `type: build` on Expo infra | Lives in `.eas/workflows/`; shares secrets with EAS Build |
| Both | Teams that want GH PR status **and** gated cloud builds | Keep scripts identical; duplicate YAML is acceptable |

### Gate Ordering

```text
format:check → lint → typecheck → test → (optional) eas build
```

* **Format first** - fastest signal; fails in seconds on small diffs.
* **Lint second** - catches RN-specific issues ESLint owns.
* **Typecheck third** - slower but finds cross-file breaks.
* **Tests last** - most expensive; still before native compile.
* **EAS build** - only after quality passes; saves queue time and build credits.

### Monorepo Notes

```json
// apps/mobile/package.json
{
  "scripts": {
    "lint": "expo lint",
    "typecheck": "tsc --noEmit",
    "test": "jest"
  }
}
```

* Root `turbo run lint typecheck` respects `dependsOn: ["^lint"]` so `packages/ui` lints before `apps/mobile`.
* Pin one Node version in `engines` and CI - RN tooling assumes Node 20 LTS.
* For pnpm, swap `npm ci` for `pnpm install --frozen-lockfile` and `cache: pnpm` on `setup-node`.

## Gotchas

* **Skipping `expo customize` before `tsc`** - Typed routes fail with missing `.expo/types` on a clean CI checkout. **Fix:** Add an explicit step before `typecheck`, or commit generated types only if your team policy requires it (usually do not).
* **`npm install` instead of `npm ci` in CI** - Lockfile drift produces "works on CI, fails locally" flakiness. **Fix:** Always `npm ci` when `package-lock.json` exists.
* **Running `prettier --write` in CI** - Runner formats files that never get committed; main stays dirty. **Fix:** Use `--check` only in workflows.
* **Lint warnings allowed to merge** - `--max-warnings 0` is not the default everywhere; warnings accumulate. **Fix:** Treat warnings as errors in CI when adopting a zero-warning policy, or fix warnings before enabling the gate.
* **Quality job not required in branch protection** - Developers merge with admin bypass while checks are red. **Fix:** GitHub → Settings → Branches → require the `quality` status check.
* **EAS build without `needs: [quality]`** - Native builds start while lint is still failing. **Fix:** Chain `needs` so `type: build` jobs wait for the custom quality job.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Husky + lint-staged only | Solo dev prototyping | You need enforceable gates reviewers can trust |
| `turbo run` remote cache | Large monorepo CI is slow | Single-app repo with <30s checks already |
| Nx affected targets | Huge repo; only lint changed projects | Simple Expo app without Nx graph |
| EAS Build without prior lint | Emergency hotfix bypass (documented) | Normal feature development - too slow to fail |

## FAQs

What scripts should every Expo app expose for CI?

* `lint` → `expo lint`
* `typecheck` → `tsc --noEmit`
* `format:check` → `prettier --check .`
* `test` → your unit test runner

CI should call these by name, not inline tool commands.

Why run typecheck if expo lint already runs TypeScript ESLint?

* ESLint analyzes per-file patterns; `tsc` validates exports, generics, and cross-package imports.
* A broken type in `packages/ui` may not appear until the app imports it - `tsc` catches that.

How do I add quality gates to EAS Workflows?

* Create `.eas/workflows/quality-gates.yml`.
* Use `eas/checkout`, `eas/install_node_modules`, then `run: npm run <script>` steps.
* Add `needs: [quality]` on downstream `type: build` jobs.

Gotcha: Why does CI fail on typed routes but local passes?

* Local `.expo/types` exists after `expo start`; CI checkout is clean.
* Run `npx expo customize tsconfig.json` or `expo export` step that generates types before `tsc`.

Should lint and typecheck run in parallel jobs?

* Parallel jobs install `node_modules` twice - slower for small repos.
* Single sequential job is simpler until total runtime exceeds ~5 minutes.
* Split when monorepo packages justify parallel fan-out via Turbo.

How do I gate merges on GitHub?

1. Open repo **Settings → Branches**.
2. Add rule for `main`.
3. Enable **Require status checks to pass**.
4. Select your `quality` job name.

Can I skip CI with a commit message?

* EAS Workflows honor `[eas skip]` / `[skip eas]` in commit messages for push triggers.
* Prefer branch protection exceptions for hotfixes instead of routine skip tokens.

What Node version should CI use?

* Node 20 LTS matches Expo SDK 57 tooling expectations.
* Align `engines.node` in root `package.json` with CI `node-version`.

How do monorepos run tests in CI?

```bash
npx turbo run test --filter=mobile
# or all packages:
npx turbo run test
```

* Mark `test` `dependsOn: ["^test"]` when packages must build/typecheck first.

Does expo lint work in CI without a simulator?

* Yes. ESLint is static analysis - no device or emulator required.
* Maestro / Detox jobs are separate gates for UI integration tests.

How long should I set timeout-minutes?

* 10–15 minutes covers install + lint + tsc + unit tests for typical Expo apps.
* Increase when monorepo `turbo` fan-out grows; decrease when only running affected packages.

Should I run expo-doctor in CI?

* Yes as an optional weekly or PR gate - catches SDK mismatch before native builds.
* Add `npx expo-doctor` as a step after install; fail on incompatible dependency versions.

## Related

* [Linting Basics](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/linting-basics/) - `eslint-config-expo` and the rules `expo lint` enforces
* [Prettier & Import Sorting](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/prettier-and-import-sorting/) - `format:check` script and `.prettierignore`
* [TypeScript Strict Mode](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/typescript-strict-mode/) - what `typecheck` validates
* [Monorepo with Turborepo](https://docs.wahwei/reactnative.codeguides.io/project-setup/monorepo-with-turborepo/) - `turbo run lint typecheck` across workspaces
* [Project Setup Basics](https://docs.wahwei/reactnative.codeguides.io/project-setup/project-setup-basics/) - default scripts scaffolded with SDK 57
* [EAS Workflows](https://docs.wahwei/reactnative.codeguides.io/cicd/eas-workflows/) - full workflow catalog beyond quality gates

> **Stack versions:** This page was written for **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**. 383k393a3c3q3e393a3o1r3e3k3x383c3e3k221w1u3x1v1t1v1z1t20

Reviewed by Chris St. John·Last updated Jul 19, 2026
