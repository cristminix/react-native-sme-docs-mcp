# React Hooks Lint Rules

A verification checklist for `eslint-plugin-react-hooks` in Expo React Native apps - catching illegal hook calls, stale closures in async mobile code, and missing cleanup before they ship to backgrounded devices.

Highlights / React Hooks Lint Rules

* eslint-config-expo ships react-hooks/rules-of-hooks and exhaustive-deps - verify both are on before tuning
* rules-of-hooks is always error; exhaustive-deps stays warn until the team trusts suppressions
* AppState, useFocusEffect, and NetInfo subscriptions are the top mobile stale-closure sources
* Never call hooks inside FlatList renderItem - extract a row component so lint and React agree
* Prefer functional setState and AbortController cleanup over blanket eslint-disable comments
* TanStack Query hook results belong in deps; the stable queryClient ref usually does not

## How to Use This Checklist

* Run **Tier 1** when scaffolding or upgrading ESLint - confirm `eslint-config-expo` registers the hooks plugin before adding overrides.
* Apply **Tiers 2–3** per screen or custom hook during PR review; mobile listeners and navigation focus effects fail more often than web `fetch` tutorials suggest.
* Treat every `eslint-disable-next-line react-hooks/exhaustive-deps` as a **documented exception** - note why the dep is stable or why stale data is acceptable.
* Revisit **Tier 4** after SDK upgrades - React 19 batching and New Architecture do not remove the need for correct dependency arrays.
* Device-test screens that pass lint but still show stale UI after backgrounding - lint cannot prove runtime subscription hygiene.

## Plugin & Baseline Severity (1–5)

1. **Confirm `eslint-plugin-react-hooks` is active:** `eslint-config-expo` bundles the plugin in flat config - run `npx eslint --print-config app/index.tsx` and verify `react-hooks/` rules appear.

   * **Missing plugin:** Add `eslint-plugin-react-hooks` and extend its recommended preset explicitly.
   * **Duplicate registration:** Do not install the plugin twice via overlapping presets - duplicate configs produce conflicting severities.
2. **`react-hooks/rules-of-hooks` severity:** Keep at **`error`** - illegal hook order breaks React in production and cannot be downgraded to warn without hiding ship-stoppers.

   * **CI gate:** `error` fails `expo lint` and GitHub Actions the same way as TypeScript errors.
   * **Never global-off:** A single `off` for this rule lets conditional hooks merge silently.
3. **`react-hooks/exhaustive-deps` severity:** Default to **`warn`** in active codebases; promote to **`error`** only after the team has a written suppression policy.

   * **Warn in CI:** Pair with `--max-warnings 0` when you want zero warnings without fighting stable-ref false positives on day one.
   * **Error for new modules:** Scope `error` to `src/features/**` once greenfield folders are clean.
4. **Flat config file targeting:** Ensure `app/`, `src/`, and `components/` are inside ESLint `files` globs - hooks in route files are linted the same as shared hooks.

   * **Monorepo:** Extend the same hooks block to shared `packages/ui` - stale closures in a design-system hook affect every screen.
   * **Ignore only generated dirs:** Do not ignore `app/` because Expo Router filenames confuse the linter.
5. **Editor integration:** Enable ESLint in the IDE with flat-config support so `exhaustive-deps` surfaces while typing effects, not only in CI.

   * **On-save fix:** Auto-fix handles import order, not dependency arrays - developers must edit deps manually.
   * **Pre-commit:** Run `expo lint` via lint-staged on changed `.tsx` files.

## Rules of Hooks Enforcement (6–10)

6. **No hooks inside `renderItem`:** `FlatList` / `SectionList` `renderItem` is a callback, not a component - extract `TodoRow` and call hooks at the top of that component.

   * **Lint signal:** `rules-of-hooks` flags hook calls inside nested functions.
   * **Fix pattern:** `renderItem={({ item }) => <TodoRow item={item} />}`.
7. **No hooks after early returns:** Guard clauses above `useState` / `useEffect` violate hook order when the guard toggles between renders.

   * **Common in RN:** `if (!fontsLoaded) return null` placed before hooks in a screen.
   * **Fix:** Move loading gates below all hooks or split into a wrapper shell component.
8. **Prefix custom hooks with `use`:** `getFilters()` can call `useState` illegally; `useFilters()` triggers `rules-of-hooks` on the custom hook body.

   * **File convention:** `use-app-state.ts` exporting `useAppState`.
   * **Test helpers:** `renderHook` from Testing Library still requires a proper `use*` hook.
9. **No hooks inside `useMemo` / `useCallback` factories:** The factory runs during render; hooks belong at component top level only.

   * **Smell:** Creating a subscription inside `useMemo(() => { useEffect(...) })`.
   * **Fix:** Plain `useEffect` with cleanup, or a dedicated custom hook.
10. **No hooks in Reanimated worklets or non-React callbacks:** Worklets and native module callbacks are outside React's render cycle - use shared values and `runOnJS` instead.

    * **Lint gap:** ESLint may not analyze worklet bodies - enforce via code review and `// eslint-disable` is not the answer.
    * **See:** [Custom Hooks for UI Logic](https://docs.wahwei/reactnative.codeguides.io/component-patterns/custom-hooks-for-ui-logic/) for platform hook extraction.

## exhaustive-deps - Mobile Patterns (11–18)

11. **`AppState` listeners:** Effects that subscribe to `AppState.addEventListener` must list every closed-over value used inside the handler, or read fresh values from refs.

    * **Stale pattern:** Handler reads `userId` from render when app returns from background after logout.
    * **Fix:** Include `userId` in deps, or `const userIdRef = useRef(userId)` synced in a separate effect.
12. **`useFocusEffect` from Expo Router / React Navigation:** The callback identity matters - wrap work in `useCallback` with correct deps or eslint flags the effect wrapper.

    * **Stale pattern:** Refetch uses `route.params.id` omitted from deps; wrong record flashes after deep link.
    * **Fix:** `[route.params.id]` in `useCallback` deps; return cleanup to cancel in-flight fetch.
13. **NetInfo / connectivity subscriptions:** `NetInfo.addEventListener` callbacks that enqueue mutations must see current auth and queue state.

    * **Stale pattern:** Replay offline queue with an expired token captured at mount.
    * **Fix:** Dep on `accessToken` or read from a ref updated on refresh.
14. **Keyboard and dimension listeners:** `Keyboard.addListener` and `Dimensions.addEventListener` effects need cleanup and deps for values used when firing.

    * **Stale pattern:** `keyboardVerticalOffset` computed once; lint-clean but wrong after rotation.
    * **Fix:** Dep on `layout` state or re-read `Dimensions.get` inside the handler.
15. **Async effects and `AbortController`:** `useEffect` that calls `async function load()` must abort on cleanup and list deps that change the request.

    * **Stale pattern:** Fast tab switches apply an older response - not caught by deps alone without abort.
    * **Fix:** `const ac = new AbortController(); … return () => ac.abort();` plus full dep array.
16. **Timers (`setInterval`, `setTimeout`):** Effects scheduling timers must clear them in cleanup and include delay-driving deps.

    * **Stale pattern:** Polling interval still hits API after screen blurs because `useFocusEffect` cleanup was forgotten.
    * **Fix:** Clear timer in both `useEffect` return and focus-effect cleanup.
17. **Stable refs vs missing deps:** `dispatch` from `useReducer`, `setState` from `useState`, and refs are stable - omitting them is fine; omitting **props and derived state** is not.

    * **False positive:** Lint wants `dispatch` - safe to leave; do not disable the rule for it.
    * **Real bug:** Omitting `filter` when effect posts `filter` to analytics - add `filter`.
18. **TanStack Query and context:** Include `data`, `isFetching`, and query-key inputs in deps when effects react to them; `queryClient` from `useQueryClient()` is stable.

    * **Stale pattern:** `useEffect` on `data` but missing `dataUpdatedAt` when only freshness matters.
    * **Fix:** Dep on the specific fields the effect reads, or derive a memoized primitive first.

## Suppression, Custom Hooks & CI (19–24)

19. **One-line disable policy:** `eslint-disable-next-line react-hooks/exhaustive-deps` requires an inline comment explaining stability or intentional staleness.

    * **Reject:** Blank disables to silence lint during a rush.
    * **Accept:** `// deps intentionally empty - mount-only analytics ping`.
20. **Never disable `rules-of-hooks`:** If the rule fires, refactor - conditional hooks are never a lint false positive.

    * **God-screen smell:** Multiple disables in one screen file - extract hooks per [Anti-Patterns: God Screens](https://docs.wahwei/reactnative.codeguides.io/component-patterns/anti-patterns-god-screens/).
21. **Custom hooks export a coherent dep story:** Hooks wrapping `AppState` / NetInfo should document which values callers must pass in so caller effects stay lint-clean.

    * **Pattern:** `useOnAppForeground(onForeground, deps)` internally mirrors `useEffect` deps.
    * **Anti-pattern:** Hidden global module state inside a hook - callers cannot satisfy exhaustive-deps honestly.
22. **Functional updates for rapid events:** `setCount(c => c + 1)` removes `count` from handler deps - prefer over disabling lint on press handlers.

    * **RN batching:** React 19 batches multiple `setState` in the same gesture - functional form stays correct.
    * **See:** [Props, State & Re-renders on Mobile](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/props-state-and-re-renders-on-mobile/).
23. **`useCallback` / `useMemo` dependency lint:** Nested hooks lint their own factories - if `useCallback` omits a closed-over prop, the bug is in the callback deps, not `exhaustive-deps` on the effect alone.

    * **Smell:** `useEffect(() => { doWork(cb) }, [cb])` where `cb` recreates every render anyway.
    * **Fix:** Stabilize `cb` with correct `useCallback` deps or inline the work in the effect.
24. **CI enforcement:** Add `expo lint` (or `eslint .`) to PR checks with `--max-warnings 0` when policy matures.

    * **Gradual:** Start with `rules-of-hooks` as error only; flip `exhaustive-deps` to error per package.
    * **See:** [CI Quality Gates](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/ci-quality-gates/) for script wiring.

## Applying the Checklist in Order

* **Tier 1 (1–5):** Plugin and severity - do once per repo or ESLint upgrade.
* **Tier 2 (6–10):** Hook placement - fix before reviewing deps; illegal hooks cannot be patched with dep tweaks.
* **Tier 3 (11–18):** Mobile async and subscriptions - highest ROI for production stale UI on background/resume.
* **Tier 4 (19–24):** Suppression discipline and CI - lock in after the codebase is mostly green.

## FAQs

Does eslint-config-expo include react-hooks rules?

Yes - the Expo flat config preset registers `eslint-plugin-react-hooks`. Confirm with `npx eslint --print-config` on a screen file before adding a duplicate plugin install.

Should exhaustive-deps be error or warn?

Start at **warn** so stable-ref false positives do not block velocity. Move to **error** (or `--max-warnings 0`) once the team documents acceptable one-line suppressions. Keep `rules-of-hooks` at **error** always.

Why does lint pass but my screen shows stale data after resume?

`exhaustive-deps` is static analysis - it cannot verify your `AppState` handler reads fresh auth state. Audit Tier 3 listeners manually and test background → foreground on a physical device.

Can I call useFocusEffect without useCallback?

You can, but the effect re-runs every render if the callback identity changes. Wrap the body in `useCallback` with the same deps you would put on a `useEffect`, or accept redundant refetches.

Is omitting dispatch from deps correct?

Yes - `useReducer` dispatch is stable for the component lifetime. The same applies to `useState` setters. Do not disable the rule solely to silence `dispatch`; add real missing values instead.

How do I fix hooks inside FlatList renderItem?

Extract a row component: `function Row({ item }) { const theme = useTheme(); … }`. Pass `renderItem={({ item }) => <Row item={item} />}`. Hooks then run in a real component.

Should queryClient be in my effect deps?

Usually no - `useQueryClient()` returns a stable client. Include query **results** and variables that change fetch behavior (`id`, `filter`), not the client singleton.

When is eslint-disable-next-line acceptable?

When you can state in one line why the dependency is stable (mount-only, ref-backed, or intentional empty deps). Never blanket-disable for a whole file or directory.

Do React 19 and New Architecture change these rules?

Batching and concurrent rendering make stale closures *more* visible, not less. Hook rules and `exhaustive-deps` semantics are unchanged - still enforce them on SDK 57.

How do I lint hooks in a monorepo shared package?

Apply the same `react-hooks` rules block to `packages/**` TypeScript sources. A stale hook in `packages/ui` ships to every app in the workspace.

What about useEffectEvent or experimental React APIs?

If your SDK ships an official stable API, follow its lint guidance. Until then, prefer refs for stable handlers inside effects rather than turning off `exhaustive-deps` globally.

Does useMemo remove the need for exhaustive-deps?

No - `useMemo` has its own dependency array. Effects that read memoized values still need those values (or their deps) listed on the effect.

How do I test hook cleanup?

Use `renderHook` with `@testing-library/react-native`, unmount the hook, and assert listeners are removed (mock `AppState.addEventListener`). Strict Mode double-mount in dev helps surface missing cleanup during manual runs.

Can I use a global eslint override for screens?

Avoid folder-wide disables for `app/`. Route screens are where `useFocusEffect` and param-driven effects concentrate - they need lint most, not least.

Where do custom platform hooks fit?

Wrap `AppState`, NetInfo, and Keyboard in `use*` hooks with explicit parameters for closed-over values. See [Custom Hooks for UI Logic](https://docs.wahwei/reactnative.codeguides.io/component-patterns/custom-hooks-for-ui-logic/).

## Related

* [Linting Basics](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/linting-basics/) - `eslint-config-expo`, flat config, and first-pass rule set
* [TypeScript Strict Mode](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/typescript-strict-mode/) - types that complement hook-safe patterns
* [CI Quality Gates](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/ci-quality-gates/) - failing PRs on `expo lint` and `--max-warnings 0`
* [Custom Hooks for UI Logic](https://docs.wahwei/reactnative.codeguides.io/component-patterns/custom-hooks-for-ui-logic/) - extracting listeners into testable hooks
* [Props, State & Re-renders on Mobile](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/props-state-and-re-renders-on-mobile/) - stale closures in press handlers and batching
* [Anti-Patterns: God Screens](https://docs.wahwei/reactnative.codeguides.io/component-patterns/anti-patterns-god-screens/) - stacked effects and listener soup in one file
* [Custom ESLint Rules for RN](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/custom-eslint-rules-for-rn/) - policy rules beyond hooks (console, a11y, imports)

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4). NzA2MjAyfDgwOW9pZ2N8b2kuc2VkaXVnZWRvYw==

Reviewed by Chris St. John·Last updated Jul 19, 2026
