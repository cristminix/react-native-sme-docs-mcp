# Expo Router Advanced Highlights Summary

Every highlight bullet from the 8 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Expo Router Advanced Highlights Summary

* Each \_layout.tsx owns one navigator - Stack, Tabs, or NativeTabs at that folder level
* Modal routes are files in app/ - set presentation on Stack.Screen, not a separate navigator
* Stack.Protected / Tabs.Protected guard screens by session - SDK 57+ preferred over redirect-only layouts
* NativeTabs from expo-router/unstable-native-tabs - alpha in SDK 57, uses system tab bars
* SplitView from expo-router/unstable-split-view - alpha, iOS-native; falls back to Slot on Android
* RSC in Expo Router is experimental/beta in SDK 57 - not production-default

## [Nested Navigators](https://docs.wahwei/reactnative.codeguides.io/expo-router-advanced/nested-navigators/)

* Each \_layout.tsx owns one navigator - Stack, Tabs, or NativeTabs at that folder level
* Back pops the innermost stack first; only when that stack is at root does back leave the tab
* Deep links use full paths (/home/messages) - no nested screen params object required
* Nest Stack inside each tab when tabs need headers and push screens
* Export unstable\_settings.anchor on modal stacks so deep links keep navigation context
* Avoid duplicate route files across groups - one screen belongs in one navigator tree

## [Modal & Presentation Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router-advanced/modal-and-presentation-routes/)

* Modal routes are files in app/ - set presentation on Stack.Screen, not a separate navigator
* presentation: 'modal' slides up on iOS; Android back dismisses the modal stack
* formSheet supports detents - sheetAllowedDetents, sheetInitialDetentIndex, grabber on iOS
* Anchor deep-linked modals with unstable\_settings.anchor so background routes survive
* Prefer router.back() or href='../' on web - Android hardware back is automatic
* React Native Modal is for ephemeral UI; Expo Router modals belong in navigation history

## [Protected Routes & Middleware](https://docs.wahwei/reactnative.codeguides.io/expo-router-advanced/protected-routes-and-middleware/)

* Stack.Protected / Tabs.Protected guard screens by session - SDK 57+ preferred over redirect-only layouts
* All routes exist on disk; guards control client-side access, not file deletion
* Hydrate session before rendering navigators - SplashScreen until SecureStore read completes
* Never duplicate the same screen in two Protected groups - declare once with nested guards
* router.replace after login - push lets users swipe back to credential screens
* Expo Router has no native middleware on mobile - web server middleware is future; use client guards today

## [Native Tabs](https://docs.wahwei/reactnative.codeguides.io/expo-router-advanced/native-tabs/)

* NativeTabs from expo-router/unstable-native-tabs - alpha in SDK 57, uses system tab bars
* Unlike Stack/Tabs, routes are NOT auto-added - declare each NativeTabs.Trigger explicitly
* Nest Stack inside each tab folder for headers and push navigation
* SDK 55+ uses NativeTabs.Trigger.Icon / .Label / .Badge compound API
* hidden on Trigger removes a tab; disabled only blocks tab bar taps - router.push still works
* Fall back to JavaScript Tabs when you need fully custom tab bar UI

## [Split View & Tablet Layouts](https://docs.wahwei/reactnative.codeguides.io/expo-router-advanced/split-view-and-tablet-layouts/)

* SplitView from expo-router/unstable-split-view - alpha, iOS-native; falls back to Slot on Android
* Master-detail maps to URL segments - /orders and /orders/42, not parallel local state
* On iPhone, SplitView collapses to one column - topColumnForCollapsing picks the visible pane
* Responsive fallback: useWindowDimensions + conditional Stack or two-pane layout on Android tablet
* Only one SplitView per app - cannot nest inside other navigators except Slot
* Empty detail state needs [type]/index.tsx placeholder - Mail-style 'nothing selected'

## [Server Components Experiments](https://docs.wahwei/reactnative.codeguides.io/expo-router-advanced/server-components-experiments/)

* RSC in Expo Router is experimental/beta in SDK 57 - not production-default
* reactServerFunctions enables Server Functions; full route RSC needs reactServerComponentRoutes
* Server Functions stream RSC payloads to client - wrap in React.Suspense
* Full RSC mode breaks Stack/Tabs/Drawer layouts today - no stack routing yet
* EAS Update and DOM components do not support RSC in production yet
* Protected routes and API auth remain server-side - RSC does not replace mobile auth guards

## [Custom Navigators & Headless Router](https://docs.wahwei/reactnative.codeguides.io/expo-router-advanced/custom-navigators-and-headless-router/)

* Slot renders the active child route without adding a navigator - layout chrome only
* Navigator + useNavigationBuilder powers fully custom routers with file-based routes
* withLayoutContext ports existing React Navigation navigators into Expo Router
* Navigator.Slot renders the focused route inside custom navigator context
* Protected works with custom navigators via withLayoutContext
* Prefer Slot until you truly need custom transition or history semantics

## [Expo Router Advanced Best Practices](https://docs.wahwei/reactnative.codeguides.io/expo-router-advanced/best-practices/)

* Model navigation as URLs - every screen worth restoring must have a file route
* Stack.Protected at root owns auth - avoid competing Redirect chains in nested layouts
* Anchor modal stacks for deep links - unstable\_settings.anchor preserves tab context
* Per-tab stacks preserve back history - do not expect one global pop order
* Treat alpha APIs (NativeTabs, SplitView, RSC) as feature-flagged experiments
* Test cold-start deep links on both platforms before every release

Reviewed by Chris St. John·Last updated Jul 18, 2026
