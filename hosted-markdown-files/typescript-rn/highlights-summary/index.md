# TypeScript in RN Highlights Summary

Every highlight bullet from the 9 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / TypeScript in RN Highlights Summary

* Extend `expo/tsconfig.base` and keep `strict: true` - Expo scaffolds already ship this layout
* Props interfaces document the public contract - keep them narrow and explicit
* Enable experiments.typedRoutes so Expo CLI generates Href and Route types
* Native module JS proxies default to loose types - declare contracts at the wrapper layer
* Treat every `res.json()` as `unknown` until a Zod schema parses it - compile-time types alone do not survive the wire
* `StyleProp<ViewStyle>` accepts a single style, an array, or falsy entries - match what RN components already accept

## [TypeScript in RN Basics](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typescript-in-rn-basics/)

* Extend `expo/tsconfig.base` and keep `strict: true` - Expo scaffolds already ship this layout
* Name prop interfaces `ComponentNameProps`; avoid `React.FC` because it adds implicit `children`
* Use `StyleProp<ViewStyle>` when a component accepts style overrides or style arrays
* Type route params at the screen boundary - untyped `useLocalSearchParams()` hides missing keys
* Treat API JSON as `unknown` until Zod validates it; `z.infer` keeps runtime and compile-time in sync
* `Pick`, `Omit`, and `ComponentProps` derive shapes from one source instead of duplicate interfaces

## [Typing Components & Props](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-components-and-props/)

* Props interfaces document the public contract - keep them narrow and explicit
* Discriminated unions model variant components without optional-prop soup
* Generic components preserve item types through lists and render props
* Extend ViewProps or PressableProps instead of re-declaring layout props
* Omit and Pick build reusable base contracts shared across a design system
* React 19 function components infer children from props - type them when you restrict layout

## [Typing Navigation & Route Params](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-navigation-and-route-params/)

* Enable experiments.typedRoutes so Expo CLI generates Href and Route types
* Dynamic segments require Href objects with a params map - string paths alone fail
* Pass the route literal to useLocalSearchParams for strongly typed path params
* Query strings are not inferred from the file tree - type them with a second generic
* URL params arrive as strings - validate and coerce at the screen boundary
* Zod parse at the trust boundary catches deep links and stale bookmarks

## [Typing Native Module APIs](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-native-module-apis/)

* Native module JS proxies default to loose types - declare contracts at the wrapper layer
* requireNativeModule<T> attaches a TypeScript surface to JSI host objects
* Treat every native return as unknown until parsed - same trust model as fetch().json()
* Zod at the boundary converts NSDictionary/Bundle payloads into narrow TS types
* EventEmitter listeners receive untyped payloads - validate in the subscription callback
* Legacy NativeModules remain in brownfield code - wrap and deprecate behind typed facades

## [Typing API Responses & Zod](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-api-responses-and-zod/)

* Treat every `res.json()` as `unknown` until a Zod schema parses it - compile-time types alone do not survive the wire
* `z.infer<typeof Schema>` is the single source of truth for both runtime checks and TypeScript exports
* Use `safeParse` at UI boundaries and `parse` in trusted fetch helpers where you want exceptions to bubble
* Compose schemas with `.extend`, `.pick`, and `z.discriminatedUnion` so list and detail endpoints share field definitions
* Pair validated fetch helpers with TanStack Query so every screen reuses the same typed `queryFn`

## [Utility Types for RN](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/utility-types-for-rn/)

* `StyleProp<ViewStyle>` accepts a single style, an array, or falsy entries - match what RN components already accept
* `ComponentProps<typeof Pressable>` forwards every native prop without maintaining a hand-written list
* Use `Omit` to replace `children` or `style` when your wrapper exposes a narrower API
* `PressableProps['style']` captures the function-style callback Pressable allows - do not narrow to `ViewStyle` alone
* Derive event types from handler props (`ComponentProps<typeof TextInput>['onChangeText']`) instead of guessing signatures

## [Expo Router Typed Routes](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/expo-router-typed-routes/)

* Enable `experiments.typedRoutes` in app config - default Expo Router templates on SDK 57 often ship with this already on
* Expo CLI regenerates route types when `npx expo start` runs - output lands in `.expo/types` and `expo-env.d.ts`
* `Href` autocomplete catches typos in `<Link href>` and `router.push` at compile time
* Dynamic routes require object hrefs with strictly typed `params` - string templates alone are not enough
* Run `npx expo customize tsconfig.json` on CI so typecheck works without starting Metro

## [Gradual Typing in Brownfield Apps](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/gradual-typing-in-brownfield-apps/)

* Rename `.js` → `.ts` / `.tsx` file by file - `allowJs: true` lets JS and TS coexist during migration
* Enable `strictNullChecks` first; it catches the most real mobile bugs (undefined params, missing API fields)
* Use `// @ts-expect-error` with a ticket comment - it fails the build when the underlying error is fixed
* Type boundaries (API clients, navigation params, native bridges) before leaf UI files
* Track progress with `tsc --noEmit` error count per folder - shrink the blast radius sprint over sprint

## [TypeScript in RN Best Practices](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/best-practices/)

* Extend expo/tsconfig.base and enable strict incrementally in brownfield apps
* Use discriminated unions instead of optional fields per variant
* Validate fetch responses with Zod at the network boundary
* Type styles as StyleProp<ViewStyle>, not bare ViewStyle
* Enable experiments.typedRoutes and regenerate .expo/types in CI
* Wrap native modules with requireNativeModule<T> and runtime parsers

Y29kZWd1aWRlcy5pb3xjZ2lvOTc4fDIwMjYwNw

Reviewed by Chris St. John·Last updated Jul 19, 2026
