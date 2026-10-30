# Component Patterns Best Practices

A condensed summary of the 25 most important best practices drawn from every page in this section.

Highlights / Component Patterns Best Practices

* Split screens into container + presenter before files exceed ~300 lines
* Extract UI state into custom hooks; keep data fetching in containers
* Use compound components for tabs and field groups with shared context
* Prefer headless hooks that return accessibility prop bags
* Never nest Pressable inside Link - use asChild-style prop merging
* Co-locate feature code under features/<name>/ with a single public export

1. **Name the screen vs presenter split:** The screen (container) owns data, navigation, and side effects; the presenter renders props only - if you cannot test UI without mocking fetch, the boundary is wrong.
2. **Co-locate by feature, not by type:** Keep `features/orders/screens`, `hooks`, and `components` together - a global `components/` dump becomes a graveyard of one-off wrappers.
3. **One public export per feature:** Expose `OrdersScreen` from `features/orders/index.ts` - route files import one symbol; internals stay private to the folder.
4. **Extract UI hooks before the third `useState`:** Modal open state, disclosure toggles, and filter chips belong in `useDisclosure` / `useFilters` - not twenty `useState` calls at the top of a screen.
5. **Keep data hooks separate from UI hooks:** `useOrdersQuery` fetches; `useOrderFilters` shapes UI - mixing them makes hooks untestable and over-fetches on unrelated toggles.
6. **Use compound components for multi-part UI:** Tabs, accordions, and field groups share implicit state via context - prop-drilling `selectedIndex` through four layers is a maintenance tax.
7. **Expose intent methods on compound APIs:** Export `selectTab(id)` instead of raw `setIndex` - screens should not bypass validation or analytics hooks wired inside the compound root.
8. **Reach for render props when children need data the parent owns:** List empty states and row skeletons are classic render-prop slots - avoid cloning the parent just to read its state.
9. **Use Expo Router `<Slot />` for layout shells:** Slot patterns flatten deep navigation trees without wrapper hell - the layout owns chrome; leaf routes own content.
10. **Container/presenter naming is documentation:** Suffix `OrdersScreen` + `OrdersView` (or `OrdersPresenter`) so reviewers instantly know which file may call `fetch` or `router.push`.
11. **Test presenters with plain props:** Presenters should render from a props object with zero providers - snapshot and interaction tests run in milliseconds without MSW.
12. **Headless primitives return behavior, not styles:** `useDisclosure` exports `triggerProps` and `contentProps` bags - pre-styled output in the primitive couples every consumer to your design tokens.
13. **Mirror visual state in accessibility props:** Selected tabs and expanded accordions must set `accessibilityState` and `accessibilityRole` - VoiceOver does not read your CSS.
14. **Memoize accessibility prop bags:** Rebuilding `{ onPress, accessibilityRole, … }` inline every render defeats `memo` on list rows - `useMemo` keyed on `open` / `selected`.
15. **Never call hooks inside render props:** `children={() => useFoo()}` violates the Rules of Hooks - extract a named child component or call the hook in the parent.
16. **Use polymorphic `as` with generics:** `BoxProps<E extends ElementType>` preserves `href` vs `onPress` typing - bare `ElementType` erases the host contract.
17. **Prefer asChild over nested touchables:** Merging props onto Expo Router `Link` avoids invalid `Pressable > Link` trees and fixes focus order on web targets.
18. **Enforce a single child for asChild:** `Children.only` fails fast when designers wrap two nodes - document the constraint in Storybook examples.
19. **Chain onPress handlers deliberately:** Parent and child both fire by default - document precedence when navigation should swallow the parent handler.
20. **Split god screens at 300 lines, not 2,000:** Extract presenters and hooks incrementally - waiting until a file is unmaintainable guarantees a risky big-bang refactor.
21. **Move FlatList renderItem to a memoized row component:** Inline 200-line `renderItem` closures re-create every parent render and block virtualization wins.
22. **Validate route params at the container:** God screens branch on twelve raw string params - parse `useLocalSearchParams` with Zod in the screen container before passing typed props down.
23. **Keep platform switches in presenters or tokens:** Repeated `Platform.OS` ternaries through JSX signal a missing presenter split or design-system variant.
24. **Reserve global stores for cross-route state:** Bottom-sheet open state for one screen does not belong in Zustand - local state or a feature-scoped context is enough.
25. **Unit-test headless hooks, snapshot one skin:** Test `useDisclosure` behavior in isolation; integration-test a single styled reference component - not every consumer markup tree.

## FAQs

When should I reach for compound components vs context alone?

* Compound components when the public API is static parts (`Tabs.List`, `Tabs.Panel`) that must stay in sync.
* Raw context when only one wrapper exists and the API is a single provider + hook.

Is container/presenter overkill for small screens?

* A 80-line screen can stay combined - split when you add fetching, navigation, or a second presenter variant (loading/error).
* The split pays off the first time you write a presenter test without MSW.

How is asChild different from passing children?

* asChild merges accessibility and press props onto the child host - the child becomes the interactive element.
* Plain children render inside a wrapper `Pressable`, which breaks link semantics and nesting rules.

What is the first extraction from a god screen?

* The presentational JSX block into a `*View` component with typed props.
* Leave fetch and `router.push` in the screen file until the view stabilizes.

Should design-system buttons be headless?

* Primitives (disclosure, tabs, combobox) should be headless or compound.
* Opinionated branded buttons can ship styled - not every atom needs a hook twin.

Do render props still matter with hooks?

* Yes when the parent owns data the child layout should not fetch - hooks replace render props only when the child can call the hook directly at the top level.

What file belongs in app/ vs features/?

* `app/` routes stay thin - import `FeatureScreen` from `features/` and render it.
* Business logic never exports from route files for other features to import.

## Related

* [Component Patterns Basics](https://docs.wahwei/reactnative.codeguides.io/component-patterns/component-patterns-basics/) - screen/presenter tour and folder conventions
* [Custom Hooks for UI Logic](https://docs.wahwei/reactnative.codeguides.io/component-patterns/custom-hooks-for-ui-logic/) - extracting stateful UI without prop drilling
* [Compound Components](https://docs.wahwei/reactnative.codeguides.io/component-patterns/compound-components/) - tabs, accordions, and field groups
* [Container/Presenter on Mobile](https://docs.wahwei/reactnative.codeguides.io/component-patterns/container-presenter-on-mobile/) - testable data/UI split
* [Headless Components](https://docs.wahwei/reactnative.codeguides.io/component-patterns/headless-components/) - logic-only primitives and a11y bags
* [Anti-Patterns: God Screens](https://docs.wahwei/reactnative.codeguides.io/component-patterns/anti-patterns-god-screens/) - how large screens fail and how to split them

### External Related Links

* [react.dev](https://react.dev/) - core React concepts RN builds on
* [reactnative.dev](https://reactnative.dev/) - official React Native site
* [galaxies.dev](https://galaxies.dev/) - structured RN/Expo courses (Simon Grimm)

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
