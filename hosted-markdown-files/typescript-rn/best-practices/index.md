# TypeScript in RN Best Practices

A condensed summary of the 25 most important best practices drawn from every page in this section.

Highlights / TypeScript in RN Best Practices

* Extend expo/tsconfig.base and enable strict incrementally in brownfield apps
* Use discriminated unions instead of optional fields per variant
* Validate fetch responses with Zod at the network boundary
* Type styles as StyleProp<ViewStyle>, not bare ViewStyle
* Enable experiments.typedRoutes and regenerate .expo/types in CI
* Wrap native modules with requireNativeModule<T> and runtime parsers

1. **Extend `expo/tsconfig.base`:** Expo SDK 57 projects should start from the official base config - it includes the right `jsx`, module resolution, and paths for Metro and native module typings.
2. **Turn on `strict` for greenfield screens:** New `.tsx` files should compile under full strictness from day one; brownfield apps phase flags in module by module instead of flipping everything at once.
3. **Name every component's props:** Export a `ComponentNameProps` interface (or type) beside the component - inline object types do not scale across refactors and Storybook stories.
4. **Prefer discriminated unions for variants:** Model `{ variant: "a"; aField: string } | { variant: "b"; bField: number }` instead of optional fields on every branch - TypeScript narrows correctly inside each case.
5. **Avoid `React.FC` in new code:** Type the function parameter directly - `React.FC` adds implicit `children` noise and is deprecated idiomatically in React 19 projects.
6. **Reuse RN prop types with `ComponentProps`:** Extend primitives via `ComponentProps<typeof Pressable>` and `Omit` only the keys you replace - hand-rolled prop lists drift when RN adds accessibility or platform props.
7. **Type press handlers from `PressableProps`:** Use `PressableProps["onPress"]` instead of hand-writing `GestureResponderEvent` signatures that may miss optional parameters.
8. **Push generics to list components:** Declare `FlatList<Place>` and `SectionList<Place>` at the list boundary - casting `data as Place[]` inside shared lists hides caller mistakes.
9. **Use `readonly T[]` for display props:** Prevent callers from mutating arrays you render - props are a contract, not a mutable shared buffer.
10. **Enable Expo Router typed routes:** Set `experiments.typedRoutes: true` in `app.config` and include `.expo/types/**/*.ts` so `Href` and `router.push` catch invalid paths at compile time.
11. **Regenerate route types in CI:** Run `npx expo customize tsconfig.json` before `tsc --noEmit` - without generated types, every `href` degrades to `string`.
12. **Pass dynamic routes as object hrefs:** Use `{ pathname: "/user/[id]", params: { id } }` - string literals like `"/user/[id]"` fail typed-route checks because params are missing.
13. **Match bracket names exactly:** A file `[id].tsx` requires `params: { id }`, not `{ userId }` - param keys must mirror the filesystem segment.
14. **Validate URL params with Zod:** Typed routes prove path shape, not value safety - parse `useLocalSearchParams` output before using IDs in fetch calls.
15. **Treat `fetch` JSON as `unknown`:** `res.json()` does not validate - assign to `unknown`, then `Schema.parse(data)`; never `as MyInterface` at the boundary.
16. **Model API envelopes explicitly:** Parse `{ items, nextCursor }` wrappers, not bare arrays - backends add pagination fields without a major version bump.
17. **Use `.nullable()` for SQL nulls:** Backend `avatarUrl: null` fails `.optional()` schemas - distinguish absent keys (optional) from present nulls (nullable).
18. **Coerce numbers at the boundary:** Gateways sometimes stringify numeric fields - `z.coerce.number()` belongs in the Zod schema, not repeated `Number()` calls in screens.
19. **Type styles as `StyleProp<ViewStyle>`:** Callers need to pass style arrays and falsy guards - bare `ViewStyle` rejects `[styles.base, pressed && styles.active]`.
20. **Use `PressableProps["style"]` for pressable wrappers:** Pressable styles can be functions of `pressed` state - narrowing to `ViewStyle` breaks the callback form.
21. **Wrap native modules with typed `requireNativeModule`:** Declare a `NativeModule` interface and parse async returns with Zod - JSI bindings can still return unexpected shapes across OS versions.
22. **Use `requireOptionalNativeModule` in Expo Go paths:** Modules missing from Expo Go should degrade gracefully - optional require plus feature flags beats try/catch around every call.
23. **Phase strictness in brownfield apps:** Enable `noImplicitAny`, then `strictNullChecks`, then `strict` - one flag per sprint keeps PRs reviewable.
24. **Prefer `@ts-expect-error` over `@ts-ignore`:** Expect-error fails when the underlying mistake is fixed - ignore comments linger and hide real regressions.
25. **Typecheck in CI separately from lint:** Run `tsc --noEmit` on every PR - ESLint does not catch invalid route hrefs, Zod mismatches, or broken generic inference.

## FAQs

Is strict TypeScript worth it on a two-person Expo team?

* Yes for new files - strict catches null crashes and bad API shapes before they reach TestFlight.
* Brownfield repos can enable strict per folder rather than blocking a release on a thousand legacy errors.

Should I use Zod on every API call?

* At minimum on responses that drive navigation or billing - high-impact boundaries.
* Internal constants and static config can stay TypeScript-only without runtime parsers.

Do typed Expo Router routes replace Zod for params?

* No - typed routes validate path structure at compile time.
* Zod still validates runtime values (UUID format, enum tabs, numeric limits).

What is the fastest win for style typing?

* Replace every `style?: ViewStyle` prop with `style?: StyleProp<ViewStyle>` in shared components.
* Most style-related TS errors in RN codebases come from this single mismatch.

How do I type a wrapper around Pressable without losing ripple props?

* Start from `ComponentProps<typeof Pressable>`, omit `children` if you rename it, and spread `...pressableProps` last only when callers should override defaults.

Can I skip types on native module bridges?

* Only if the module is throwaway prototype code.
* Production bridges need typed surfaces - untyped native returns are the top source of silent production crashes after OS upgrades.

Should `.expo/types` be committed?

* No - regenerate in dev and CI with `expo customize tsconfig.json`.
* Committing generated route types creates merge conflicts on every folder rename.

What strict flag hurts brownfield apps the most?

* `strictNullChecks` - it surfaces the most real bugs but also the most legacy noise.
* Enable it after `noImplicitAny` on new modules first.

## Related

* [TypeScript in RN Basics](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typescript-in-rn-basics/) - strict tsconfig and introductory typed examples
* [Typing Components & Props](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-components-and-props/) - unions, generics, and prop contracts
* [Typing Navigation & Route Params](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-navigation-and-route-params/) - Expo Router params and validation
* [Typing API Responses & Zod](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-api-responses-and-zod/) - runtime validation at fetch boundaries
* [Expo Router Typed Routes](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/expo-router-typed-routes/) - generated `Href` types and CI setup
* [Gradual Typing in Brownfield Apps](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/gradual-typing-in-brownfield-apps/) - incremental strictness playbook

### External Related Links

* [react.dev](https://react.dev/) - core React concepts RN builds on
* [reactnative.dev/docs](https://reactnative.dev/docs/getting-started) - full RN documentation
* [MDN Web Docs](https://developer.mozilla.org/) - JavaScript fundamentals

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

NzA2MjAyfDQwOW9pZ2N8b2kuc2VkaXVnZWRvYw==

Reviewed by Chris St. John·Last updated Jul 19, 2026
