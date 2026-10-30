# Expo Router Fundamentals Best Practices

A condensed summary of the 25 most important best practices drawn from every page in this section.

Highlights / Expo Router Fundamentals Best Practices

* Route files re-export feature screens - no business logic beside \_layout.tsx
* One root \_layout.tsx owns providers; nested layouts handle stack/tab chrome only
* Enable experiments.typedRoutes and run tsc --noEmit when app/ changes
* Auth gates wait for session hydration - then Redirect or router.replace, never push
* Prefer href objects and centralized builders over stringly-typed router.push paths
* Validate URL params with Zod at screen entry - typed routes do not secure deep links

1. **Scaffold with Expo Router from day one:** `default@sdk-57` sets `main: "expo-router/entry"` - retrofitting file-based routing costs more than starting with `app/`.
2. **Install router through Expo:** `npx expo install expo-router` pins versions compatible with SDK 57's React Navigation peers - manual npm ranges cause native/JS skew.
3. **Treat file names as URLs:** `app/settings.tsx` → `/settings` - design paths for deep links and analytics before folders proliferate.
4. **Keep route files thin:** Under ~20 lines; re-export screens from `features/<name>/` - reviewers grep `app/` to understand navigation, not business rules.
5. **One root `_layout.tsx` for providers:** Theme, query client, auth session, and error boundaries mount once - never duplicate `QueryClientProvider` in tab layouts.
6. **Nested layouts own chrome only:** Stack headers, tab icons, drawer labels - not data fetching. `useFocusEffect` refetch belongs in screens.
7. **Use route groups for structure:** `(auth)`, `(app)`, `(tabs)`, `(modals)` - parentheses organize without polluting URLs.
8. **Private folders use underscore prefix:** `_components/` colocated with layouts is not routable - never create accidental `/components` screens.
9. **Index routes for list hubs:** `orders/index.tsx` lists; `orders/[id].tsx` details - predictable REST-like paths aid linking.
10. **Single redirect hub at `app/index.tsx`:** Auth and role routing live in one place - avoid duplicate `/` index files across groups.
11. **Wait for session hydration before redirect:** Show splash or spinner while SecureStore reads - premature `<Redirect>` causes login/home flicker.
12. **`router.replace` after login and logout:** Preserves back-stack hygiene - `push` leaves credential screens behind swipe-back.
13. **Guard authenticated groups in layout:** `(app)/_layout.tsx` redirects guests - deep links to `/settings` must not bypass auth.
14. **Prefer `Link` for declarative navigation:** Lists, inline links, and prefetch - reserve `router.push` for post-async side effects.
15. **Centralize href builders:** `orderDetailHref(id)` in `navigation/hrefs.ts` - one typo fix updates every feature callsite.
16. **Enable typed routes early:** `experiments: { typedRoutes: true }` in `app.config.ts` - invalid paths fail `tsc`, not production.
17. **Validate params with Zod at runtime:** `useLocalSearchParams()` input is untrusted from deep links and push payloads - types alone are insufficient.
18. **Nest stacks inside tabs for drill-down:** One tab pushes detail screens while the tab bar stays - cap nesting at drawer → tabs → stack.
19. **Hide non-tab routes with `href: null`:** Helper screens stay navigable via `router.push` without cluttering the tab bar.
20. **Modal routes are explicit:** `(modals)` group or `presentation: "modal"` - half-overlays break Android back and accessibility.
21. **Declare `scheme` before shipping deep links:** `app.config.ts` scheme and associated domains pair with file paths - test Maestro flows per critical URL.
22. **Run `tsc --noEmit` when `app/` changes:** Regenerated `.expo/types` catches stale hrefs - add to CI alongside `expo-doctor`.
23. **Align `app/` with feature slices:** `features/orders/` maps to `app/(tabs)/orders/` - import rule: routes import features, not the reverse.
24. **Document non-standard patterns in ADRs:** Modals as overlays, custom tab bars, or React Navigation escape hatches - before the third squad copies them.
25. **Revisit route map at ~30 screens:** Flatten deep trees, split modals, and audit duplicate paths - schedule before import cycles and duplicate `/` routes force a rewrite.

## FAQs

When should we adopt Expo Router over manual React Navigation?

* **Default for new SDK 57 greenfield apps** - template, linking, and typed routes align.
* Brownfield apps with heavy custom navigators may stay on React Navigation until a migration sprint is scheduled.
* See [ADR: Navigation Library Choice](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-navigation-library-choice/).

Where should business logic live?

In `features/<name>/` - hooks, API, and screen UI. `app/` files re-export only. Global providers live in root `_layout.tsx` or `app-providers.tsx`.

How do we enforce thin route files in review?

* Reject PRs with hooks or fetch calls in `app/*.tsx` unless auth redirect guards.
* Pair with [Navigation & Routing Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/navigation-and-routing-rules/) Tier 1 checklist.

Tabs or drawer for primary navigation?

* **Tabs** for 3–5 daily destinations on phones.
* **Drawer wrapping tabs** when you have 6+ sections or tablet-first IA.
* Avoid competing drawer and tab patterns for the same destinations.

How do typed routes fit with CI?

```bash
npx expo start --non-interactive &
npm run typecheck
```

Ensure `.expo/types` generates before `tsc` in CI when `app/` changes.

## Related

* [Expo Router Basics](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/) - 10 starter examples
* [Stack Navigation](https://docs.wahwei/reactnative.codeguides.io/expo-router/stack-navigation/) - headers and push/pop
* [Tabs & Drawers](https://docs.wahwei/reactnative.codeguides.io/expo-router/tabs-and-drawers/) - nested composition
* [Route Groups & Organizing `app/`](https://docs.wahwei/reactnative.codeguides.io/expo-router/route-groups-and-organizing-app/) - `(auth)` and private folders
* [Link & href](https://docs.wahwei/reactnative.codeguides.io/expo-router/link-and-href/) - declarative navigation
* [Typed Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router/typed-routes/) - generated `Href` types
* [Redirects & Index Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router/redirects-and-index-routes/) - auth-gated entry
* [../expo-rules/navigation-and-routing-rules/navigation-and-routing-rules.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/navigation-and-routing-rules/) - team routing checklist
* [../architecture-design/feature-sliced-design-for-rn/feature-sliced-design-for-rn.md](https://docs.wahwei/reactnative.codeguides.io/architecture-design/feature-sliced-design-for-rn/) - feature boundaries

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
