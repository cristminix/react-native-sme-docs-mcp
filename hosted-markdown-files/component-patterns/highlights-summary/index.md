# Component Patterns Highlights Summary

Every highlight bullet from the 9 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Component Patterns Highlights Summary

* Screens wire navigation and data; presentational components own layout and styles only
* Custom hooks bundle state + effects + handlers into one reusable unit
* Parent owns state; children declare structure - consumers compose the UI they need
* Render props pass state to a function - the caller owns all markup
* Containers own data, navigation side effects, and platform wiring
* Headless primitives own state, events, and accessibility - consumers own layout and StyleSheet

## [Component Patterns Basics](https://docs.wahwei/reactnative.codeguides.io/component-patterns/component-patterns-basics/)

* Screens wire navigation and data; presentational components own layout and styles only
* Feature folders colocate screens, hooks, and UI so a module can be moved or deleted in one cut
* Custom hooks extract refresh, pagination, and form state without prop drilling through the tree
* Compound components share implicit state via context - ideal for tabs, cards, and field groups
* Container/presenter splits async work from pure UI so presenters are easy to snapshot-test
* Headless hooks return state and handlers; design-system components decide colors, spacing, and motion

## [Custom Hooks for UI Logic](https://docs.wahwei/reactnative.codeguides.io/component-patterns/custom-hooks-for-ui-logic/)

* Custom hooks bundle state + effects + handlers into one reusable unit
* Return a small object or tuple - consumers pick only what they need
* UI hooks differ from data hooks: no fetch/cache, only presentation behavior
* Keyboard, sheet, and scroll hooks are the highest-ROI extractions on mobile
* Prefix with use and keep hooks pure - no JSX inside the hook body
* Colocate hooks next to the feature until a second screen needs the same logic

## [Compound Components](https://docs.wahwei/reactnative.codeguides.io/component-patterns/compound-components/)

* Parent owns state; children declare structure - consumers compose the UI they need
* React Context shares implicit state without long prop lists
* Tabs, accordions, and form fields are the classic mobile compound wins
* Static properties (Tabs.List, Tabs.Panel) document the API in TypeScript
* Throw in development when a sub-component is used outside its provider
* Prefer layout primitives (View, Pressable) inside parts - not opinionated styling

## [Render Props & Slot Patterns](https://docs.wahwei/reactnative.codeguides.io/component-patterns/render-props-and-slot-patterns/)

* Render props pass state to a function - the caller owns all markup
* Slot patterns (Expo Router Slot) swap child routes without nested wrappers
* Prefer children-as-function only when the parent owns non-trivial state
* Flatten navigation layouts - logic components should not wrap every screen
* Typed render props preserve item types through lists and async data
* Combine with memoized row components to keep list render props fast

## [Container/Presenter on Mobile](https://docs.wahwei/reactnative.codeguides.io/component-patterns/container-presenter-on-mobile/)

* Containers own data, navigation side effects, and platform wiring
* Presenters are pure UI - props in, JSX out, easy to snapshot test
* Screens are often containers; shared lists and cards are presenters
* TanStack Query belongs in the container layer, not inside design-system atoms
* Co-locate container + presenter per feature before splitting across packages
* Expo Router route files are thin containers that delegate to feature presenters

## [Headless Components](https://docs.wahwei/reactnative.codeguides.io/component-patterns/headless-components/)

* Headless primitives own state, events, and accessibility - consumers own layout and StyleSheet
* Return prop bags (triggerProps, contentProps) instead of rendering Pressable or View yourself
* Custom hooks are the RN default; render props remain useful when JSX shape varies per screen
* Spread accessibilityRole and accessibilityState onto the consumer's host element
* Context wires compound headless parts without exporting internal state setters
* Test behavior through the hook API - not snapshotting styled output

## [Polymorphic & AsChild Patterns](https://docs.wahwei/reactnative.codeguides.io/component-patterns/polymorphic-and-aschild-patterns/)

* Polymorphic `as` lets one primitive render as Pressable, Link, or Text with correct prop types
* asChild merges event and accessibility props onto a single child - no Pressable wrapping Link
* Implement Slot with React.Children.only and cloneElement - RN has no built-in Radix Slot
* Default to Pressable; promote to Link only when navigation is the primary action
* Omit conflicting keys (onPress vs href) at the type level with discriminated unions
* Forward refs with React 19 ref-as-prop on custom components that wrap hosts

## [Anti-Patterns: God Screens](https://docs.wahwei/reactnative.codeguides.io/component-patterns/anti-patterns-god-screens/)

* A screen file over 400 lines is a refactor ticket - not a style preference
* Screens should orchestrate; they should not own fetch parsers, modal markup, and list cells
* Colocate by feature folder, not by file type spread across the repo
* Extract when a second screen needs the same block - not when line count feels ugly
* One screen-level data hook beats five chained useEffects
* God screens fail review because nobody can reason about the whole diff

## [Component Patterns Best Practices](https://docs.wahwei/reactnative.codeguides.io/component-patterns/best-practices/)

* Split screens into container + presenter before files exceed ~300 lines
* Extract UI state into custom hooks; keep data fetching in containers
* Use compound components for tabs and field groups with shared context
* Prefer headless hooks that return accessibility prop bags
* Never nest Pressable inside Link - use asChild-style prop merging
* Co-locate feature code under features// with a single public export

NzA2MjAyfDE4OG9pZ2N8b2kuc2VkaXVnZWRvYw==

Reviewed by Chris St. John·Last updated Jul 19, 2026
