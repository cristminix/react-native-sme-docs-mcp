# Expo Router Highlights Summary

Every highlight bullet from the 8 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Expo Router Highlights Summary

* File names in app/ map to URLs - settings.tsx becomes /settings without a central route table
* Stack from expo-router wraps native-stack - file names become pushable screens automatically
* Tabs from expo-router maps each child file or folder to a tab - icons live in \_layout.tsx
* Parentheses folders are route groups - they organize files without adding URL segments
* Link is the default navigation primitive - it preserves accessibility and web-like href semantics
* experiments.typedRoutes: true generates .expo/types/router.d.ts from your app/ tree

## [Expo Router Basics](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/)

* File names in app/ map to URLs - settings.tsx becomes /settings without a central route table
* app/\_layout.tsx is the root navigator: wrap providers once, then export Stack, Tabs, or Slot
* Expo Router is React Navigation under the hood - you gain file-based routes, not a different renderer
* main: expo-router/entry in package.json wires Metro to the router bootstrap instead of App.tsx
* Dynamic segments [id].tsx and catch-all [...slug].tsx power entity detail and CMS-style URLs
* Thin route files re-export feature screens - logic belongs in features/, not beside \_layout.tsx

## [Stack Navigation](https://docs.wahwei/reactnative.codeguides.io/expo-router/stack-navigation/)

* Stack from expo-router wraps native-stack - file names become pushable screens automatically
* screenOptions on \_layout.tsx sets team-wide header defaults; per-route options override
* presentation: modal and headerShown: false are the two most common stack tweaks in production
* useNavigation().setOptions updates titles after async data loads without remounting
* Nested stacks under tabs keep the tab bar visible while detail screens push on top
* Android hardware back and iOS swipe-back follow React Navigation stack rules - test both

## [Tabs & Drawers](https://docs.wahwei/reactnative.codeguides.io/expo-router/tabs-and-drawers/)

* Tabs from expo-router maps each child file or folder to a tab - icons live in \_layout.tsx
* Nest a Stack inside a tab folder when that section needs list → detail push without losing the tab bar
* Drawer requires @react-navigation/drawer - install with npx expo install and wrap in app/(drawer)/
* href: null hides a route from the tab bar while keeping it addressable via router.push
* Lazy tabs mount on first visit - prefetch heavy tabs with Link prefetch when UX demands
* Three-level nesting (drawer → tabs → stack) is the practical ceiling before flattening

## [Route Groups & Organizing `app/`](https://docs.wahwei/reactnative.codeguides.io/expo-router/route-groups-and-organizing-app/)

* Parentheses folders are route groups - they organize files without adding URL segments
* (auth), (app), (tabs), and (modals) are the four groups most production apps need
* Leading underscore marks private files - \_components/ is not a route
* Multiple groups at the same level compose URLs from non-group segments only
* Split auth and app shells with separate \_layout.tsx files per group
* Mirror features/ in src/ - app/ stays a thin routing map, not a feature dump

## [Link & href](https://docs.wahwei/reactnative.codeguides.io/expo-router/link-and-href/)

* Link is the default navigation primitive - it preserves accessibility and web-like href semantics
* href accepts strings or objects with pathname and params - prefer objects for dynamic routes
* router.push, replace, and back are imperative - use after mutations and auth redirects
* Link prefetch loads lazy routes early - valuable for heavy tab screens and detail views
* asChild merges Link behavior into Pressable or custom components without wrapper views
* Centralize href builders in routes.ts - features import orderDetailHref(id) not raw strings

## [Typed Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router/typed-routes/)

* experiments.typedRoutes: true generates .expo/types/router.d.ts from your app/ tree
* Href and Route types catch invalid pathnames at compile time - not at runtime in production
* Dynamic routes require params objects - /orders/[id] needs { id: string } in the href
* Run tsc --noEmit in CI after every app/ restructure - generated types drift silently otherwise
* Central href builders return Href - one typo fix updates every callsite
* Validate URL params with Zod at screen entry - types do not prove runtime deep-link input

## [Redirects & Index Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router/redirects-and-index-routes/)

* app/index.tsx is the / route - use it as a redirect hub, not a 200-line home screen
* Redirect component declaratively sends users based on session - replace for auth transitions
* router.replace after login prevents swipe-back to credential screens
* Index routes inside folders default that path segment - orders/index.tsx is /orders
* Never duplicate index.tsx across route groups - both (auth) and (app) cannot own /
* Gate on session hydration first - redirecting before AsyncStorage/SecureStore reads causes flicker

## [Expo Router Fundamentals Best Practices](https://docs.wahwei/reactnative.codeguides.io/expo-router/best-practices/)

* Route files re-export feature screens - no business logic beside \_layout.tsx
* One root \_layout.tsx owns providers; nested layouts handle stack/tab chrome only
* Enable experiments.typedRoutes and run tsc --noEmit when app/ changes
* Auth gates wait for session hydration - then Redirect or router.replace, never push
* Prefer href objects and centralized builders over stringly-typed router.push paths
* Validate URL params with Zod at screen entry - typed routes do not secure deep links

636f64656775696465732e696f7c6367696f3936347c323032363037

Reviewed by Chris St. John·Last updated Jul 19, 2026
