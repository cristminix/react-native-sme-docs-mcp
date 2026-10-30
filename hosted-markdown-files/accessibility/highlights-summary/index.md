# Accessibility Highlights Summary

Every highlight bullet from the 7 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Accessibility Highlights Summary

* Every interactive control needs a name - visible text, accessibilityLabel, or labelledBy
* Forward accessibility props from primitives - custom buttons must expose the same contract as Pressable
* Focus order follows the native view hierarchy - DOM-like reordering does not exist
* allowFontScaling defaults to true on Text - disabling app-wide breaks accessibility compliance
* AccessibilityInfo.isReduceMotionEnabled reflects iOS Reduce Motion and Android Remove animations
* Run Tier 1–2 on every release candidate; Tier 3–5 before major launches and compliance reviews

## [Accessibility Basics](https://docs.wahwei/reactnative.codeguides.io/accessibility/accessibility-basics/)

* Every interactive control needs a name - visible text, accessibilityLabel, or labelledBy
* Test on a physical device with VoiceOver (iOS) and TalkBack (Android) before store submission
* Pressable and TextInput expose semantics through accessibilityRole and accessibilityState
* Decorative images set accessible={false} - meaningful images need a short label
* Touch targets need 44×44 pt effective size via padding or hitSlop, not tiny icons alone
* eslint-plugin-react-native-a11y catches missing labels in CI - it does not replace device testing

## [accessibilityLabel & accessibilityRole](https://docs.wahwei/reactnative.codeguides.io/accessibility/accessibilitylabel-and-accessibilityrole/)

* Forward accessibility props from primitives - custom buttons must expose the same contract as Pressable
* Compose labels with accessibilityLabelledBy when visible text is split across elements
* Pick roles that match behavior - link for navigation, button for actions, header for section titles
* accessibilityHint explains how to act, not what the control is - keep hints short
* Hide decorative children so parents announce once - avoid triple-reading list rows
* Centralize semantics in design-system wrappers - features should not reinvent IconButton labels

## [Focus Order & Keyboard Navigation](https://docs.wahwei/reactnative.codeguides.io/accessibility/focus-order-and-keyboard-navigation/)

* Focus order follows the native view hierarchy - DOM-like reordering does not exist
* focusable on Pressable enables hardware keyboard activation on Android and iPad
* Split views must move focus into the detail pane when selection changes
* Switch Control and TalkBack rely on logical grouping - one focus stop per tappable row
* Modals need accessibilityViewIsModal so background content leaves the focus loop
* Test iPad Magic Keyboard and Android Bluetooth keyboard before shipping tablet layouts

## [Dynamic Type & Font Scaling](https://docs.wahwei/reactnative.codeguides.io/accessibility/dynamic-type-and-font-scaling/)

* allowFontScaling defaults to true on Text - disabling app-wide breaks accessibility compliance
* maxFontSizeMultiplier caps growth on dense UI without blocking body copy scaling
* Flexible layouts with flexWrap and minHeight survive extreme Dynamic Type settings
* PixelRatio.getFontScale() helps adapt toolbars and chips at runtime
* Design-system Text primitives should own scaling policy per variant
* Test maximum font scale on smallest phone before store submission

## [Reduced Motion](https://docs.wahwei/reactnative.codeguides.io/accessibility/reduced-motion/)

* AccessibilityInfo.isReduceMotionEnabled reflects iOS Reduce Motion and Android Remove animations
* Reanimated 4 ReduceMotion.System delegates to platform settings on withTiming and entering animations
* Never require animation to complete a task - instant state transitions must remain available
* Subscribe to reduceMotionChanged - users toggle the setting without restarting the app
* Pair JS-thread checks with Reanimated reduceMotion for layout and gesture motion
* Cross-check gesture-heavy flows with the animations section reduced-motion page

## [Accessibility Audit Checklist](https://docs.wahwei/reactnative.codeguides.io/accessibility/accessibility-audit-checklist/)

* Run Tier 1–2 on every release candidate; Tier 3–5 before major launches and compliance reviews
* Score failures P0 (blocks ship), P1 (next sprint), P2 (backlog) with an owner
* Device testing with VoiceOver and TalkBack is mandatory - lint cannot gate alone
* Test maximum font scale and Reduce Motion on the smallest supported phone
* Walk checkout, auth, and delete flows - highest audit and legal exposure
* Pair with design-system review so primitives fix whole app classes of bugs

## [Accessibility Best Practices](https://docs.wahwei/reactnative.codeguides.io/accessibility/best-practices/)

* Every interactive control needs a name - lint catches some gaps, devices catch the rest
* Design-system primitives own labels, roles, and scaling policy for the whole app
* VoiceOver and TalkBack on physical hardware are release gates, not nice-to-haves
* Maximum font scale and Reduce Motion belong in every RC test matrix
* Form errors must be announced and focus must move to the first invalid field
* Respect reduced motion in Reanimated with ReduceMotion.System - not animation-always marketing defaults

Reviewed by Chris St. John·Last updated Jul 18, 2026
