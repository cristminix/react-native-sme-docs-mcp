# Linting Best Practices

A condensed summary of the 25 most important best practices drawn from every page in this section.

Highlights / Linting Best Practices

* Start with npx expo lint and eslint-config-expo flat config
* Run Prettier and ESLint as separate concerns with eslint-config-prettier
* Enable TypeScript strict incrementally - do not flip everything in one PR
* Treat react-hooks/exhaustive-deps seriously on mobile lifecycle code
* Gate CI on lint, typecheck, format:check, and test scripts
* Run Knip and depcheck quarterly - native deps bloat binaries

1. **Start from eslint-config-expo:** `npx expo lint` scaffolds the flat config - do not cargo-cult a 2019 `.eslintrc` from a web repo.
2. **Use ESLint flat config in new projects:** `eslint.config.js` with `eslint-config-expo/flat` - legacy eslintrc is a migration tax, not a feature.
3. **Script lint in package.json:** `expo lint` or `eslint .` - every PR runs the same command locally and in CI.
4. **Separate Prettier from ESLint:** Format with Prettier; lint with ESLint - `eslint-config-prettier` prevents rule fights.
5. **Sort imports with a Prettier plugin:** `@ianvs/prettier-plugin-sort-imports` - consistent import order beats bike-shedding in review.
6. **Extend expo/tsconfig.base before strict:** Official base includes paths and JSX settings - strict flags layer on a working foundation.
7. **Enable strict incrementally:** `noImplicitAny` per folder beats a thousand-error wall - track progress in a living ADR.
8. **Add noUncheckedIndexedAccess deliberately:** Catches `params[0]` bugs in router code - enable after nullability cleanup in shared utils.
9. **Run tsc --noEmit in CI:** Types are not optional on mobile - ESLint does not replace the compiler.
10. **Install eslint-plugin-react-hooks:** `rules-of-hooks` and `exhaustive-deps` are non-negotiable - mobile code uses effects for AppState, focus, and NetInfo.
11. **Audit exhaustive-deps for focus effects:** `useFocusEffect` callbacks need stable deps - stale closures cause duplicate fetches on tab switch.
12. **Avoid eslint-disable on hooks rules:** If deps are "too noisy," fix the effect design - suppression hides real stale-data bugs.
13. **Ban console.log in production paths:** `no-console` with `allow: ["warn", "error"]` - use a logger wrapper for debug tiers.
14. **Enforce a11y props with eslint-plugin-react-native-a11y:** `accessibilityLabel` on icon-only Pressables - catch in CI, not in App Store review.
15. **Restrict cross-feature imports:** `no-restricted-paths` or Nx boundaries - `features/billing` must not import `features/orders/internals`.
16. **Custom local rules for org invariants:** Small `createRule` plugins for banned APIs (`AsyncStorage` in wrong layer) - document in CONTRIBUTING.
17. **CI runs lint, typecheck, format:check, test:** Four scripts, one `validate` meta-script - PRs do not merge on partial green.
18. **Cache ESLint in GitHub Actions:** `actions/cache` on `.eslintcache` - monorepos need cache keys per package.
19. **Mirror gates in EAS Workflows:** Same `validate` before `eas build` - native binaries should not ship from unlinted branches.
20. **Run Knip on a schedule:** Unused exports and dead files accumulate in RN apps with Expo Router entrypoints - quarterly Knip PRs stay small.
21. **Pair Knip with depcheck:** Knip finds unused code; depcheck finds unused package.json deps - native modules left installed inflate prebuild time.
22. **Whitelist Expo Router entries in Knip:** `app/**` routes are dynamic - configure `entry` patterns or false positives block adoption.
23. **Zero-warning policy with a sunset list:** New warnings fail CI; legacy warnings have ticket IDs - velocity without infinite debt.
24. **Auto-fix on save in editor, full check in CI:** Developers get fast feedback; CI remains authoritative - do not skip CI because "it looked fine locally."
25. **Document suppressions with why comments:** `eslint-disable-next-line` requires a one-line justification - `@ts-expect-error` preferred over `@ts-ignore` for the same reason.

## FAQs

Should Prettier run in a pre-commit hook?

* Optional for individuals; CI `format:check` is the enforcement layer.
* Hooks that auto-fix can hide unreviewed formatting churn - team preference.

Is strict TypeScript required on day one?

* Greenfield apps: yes for new `src/` and `features/`.
* Brownfield: incremental per module - see TypeScript in RN gradual typing page.

## Related

* [Linting Basics](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/linting-basics/) - eslint-config-expo and first-pass setup
* [Prettier & Import Sorting](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/prettier-and-import-sorting/) - formatting across packages
* [TypeScript Strict Mode](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/typescript-strict-mode/) - incremental strict flags
* [React Hooks Lint Rules](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/react-hooks-lint-rules/) - exhaustive-deps checklist
* [CI Quality Gates](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/ci-quality-gates/) - GitHub Actions and EAS Workflows
* [Dead Code & Dependency Analysis](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/dead-code-and-dependency-analysis/) - Knip and depcheck

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
