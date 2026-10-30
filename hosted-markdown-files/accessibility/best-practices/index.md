# Accessibility Best Practices

A condensed summary of the 25 most important best practices drawn from every page in this section.

Highlights / Accessibility Best Practices

* Every interactive control needs a name - lint catches some gaps, devices catch the rest
* Design-system primitives own labels, roles, and scaling policy for the whole app
* VoiceOver and TalkBack on physical hardware are release gates, not nice-to-haves
* Maximum font scale and Reduce Motion belong in every RC test matrix
* Form errors must be announced and focus must move to the first invalid field
* Respect reduced motion in Reanimated with ReduceMotion.System - not animation-always marketing defaults

1. **Name every interactive control:** Provide `accessibilityLabel`, visible text, or `accessibilityLabelledBy` - icon-only buttons without names fail VoiceOver and store review.
2. **Set the correct `accessibilityRole`:** Use `button` for actions, `link` for navigation, `header` for section titles, and `switch` on native toggles - roles set user expectations.
3. **Expose state with `accessibilityState`:** Communicate `selected`, `disabled`, `checked`, and `expanded` - never rely on color alone for selection or errors.
4. **Hide decorative content:** Set `accessible={false}` and `importantForAccessibility="no-hide-descendants"` on ornaments, redundant chevrons, and background art.
5. **Enforce 44×44 pt targets:** Use `minHeight`, padding, or `hitSlop` on small visuals - touch and switch-control users need generous hit regions.
6. **Centralize semantics in design system:** `AppButton`, `IconButton`, and `Field` wrappers require labels at the type level - features should not reinvent raw `Pressable` patterns.
7. **Forward accessibility props on primitives:** Custom components accept and pass through `accessibilityLabel`, `accessibilityHint`, and `accessibilityState` like underlying `Pressable`.
8. **Placeholder is not a label:** `TextInput` needs a visible label or `accessibilityLabelledBy` - placeholder-only fields fail forms audits.
9. **Announce meaningful dynamic updates:** Use `AccessibilityInfo.announceForAccessibility` or `accessibilityLiveRegion` for cart counts, submit errors, and async completion - not every re-render.
10. **Group list rows into one focus stop:** Tappable cards should merge title, price, and metadata into a single label - reduce swipes for TalkBack and Switch Control.
11. **Test VoiceOver on a physical iPhone:** Simulator smoke is insufficient - rotor behavior, hint timing, and focus quirks appear on device.
12. **Test TalkBack on a physical Android:** `importantForAccessibility` and live regions differ from iOS - ship only after Android device walkthrough.
13. **Query tests by role and name:** React Native Testing Library `getByRole('button', { name: 'Save' })` aligns CI with assistive tech - `testID` alone hides label gaps.
14. **Run eslint-plugin-react-native-a11y in CI:** Catch missing labels before review - treat lint as necessary, not sufficient.
15. **Allow font scaling on body copy:** `allowFontScaling` defaults true - never disable globally; cap dense UI with `maxFontSizeMultiplier` instead.
16. **Use flexible layouts at large text sizes:** Prefer `minHeight`, `flexWrap`, and column reflow over fixed `height` + `numberOfLines={1}` on primary labels.
17. **Read font scale on app resume:** `PixelRatio.getFontScale()` after `AppState` active - users change text size while your app is backgrounded.
18. **Honor Reduce Motion:** Subscribe to `reduceMotionChanged` and pass `ReduceMotion.System` to Reanimated timing and entering animations.
19. **Never block tasks on animation:** Users with reduce motion enabled must reach final UI state instantly - provide non-gesture alternatives for swipe actions.
20. **Trap modal focus:** Set `accessibilityViewIsModal` on sheets and dialogs; restore focus to the trigger on dismiss with `setAccessibilityFocus`.
21. **Move focus on navigation changes:** Master-detail selection, wizard steps, and post-submit success should land screen reader focus on the new primary heading.
22. **Enable hardware keyboard traversal:** `focusable` on actionable `Pressable` controls and `returnKeyType="next"` chains on forms - critical for iPad and DeX.
23. **Run the audit checklist before RC:** Tier 1–2 every release; score P0/P1/P1 - see [Accessibility Audit Checklist](https://docs.wahwei/reactnative.codeguides.io/accessibility/accessibility-audit-checklist/).
24. **Coordinate with animations policy:** Pair `AccessibilityInfo` checks with Reanimated `ReduceMotion.System` - see [Reduced Motion](https://docs.wahwei/reactnative.codeguides.io/accessibility/reduced-motion/) and [Animations reduced motion](https://docs.wahwei/reactnative.codeguides.io/accessibility/reduced-motion/).
25. **Document known gaps for enterprise buyers:** Track checklist scores per release; publish accessibility contact and remediation timeline - procurement asks before users do.

## FAQs

Is accessibility only for screen reader users?

* Large text, reduced motion, keyboard navigation, and high-contrast system themes benefit many users.
* Semantic labels also stabilize Maestro, Detox, and RNTL tests.

What is the minimum bar before App Store / Play submission?

* Labeled controls on critical flows, device VoiceOver + TalkBack pass, max font scale without clipped CTAs, and modals that trap focus.
* Run the pre-release gate in the audit checklist.

Should we build a separate accessible mode?

* No - bake labels, scaling, motion policy, and focus management into default UI.
* Detection hooks adjust coaching or decorative motion only.

Where do design systems fit?

* Tokens and primitives fix whole classes of bugs - see [Design Systems Basics](https://docs.wahwei/reactnative.codeguides.io/design-systems/design-systems-basics/) and [Building an Internal Component Library](https://docs.wahwei/reactnative.codeguides.io/design-systems/building-an-internal-component-library/).

How do forms differ from general a11y?

* Forms need labelled inputs, announced errors, and focus on first invalid field - [Accessibility in Forms](https://docs.wahwei/reactnative.codeguides.io/forms-input/accessibility-in-forms/) extends this section.

## Related

* [Accessibility Basics](https://docs.wahwei/reactnative.codeguides.io/accessibility/accessibility-basics/) - 10-example VoiceOver/TalkBack tour
* [accessibilityLabel & accessibilityRole](https://docs.wahwei/reactnative.codeguides.io/accessibility/accessibilitylabel-and-accessibilityrole/) - semantics cookbook
* [Focus Order & Keyboard Navigation](https://docs.wahwei/reactnative.codeguides.io/accessibility/focus-order-and-keyboard-navigation/) - tablets and switch control
* [Dynamic Type & Font Scaling](https://docs.wahwei/reactnative.codeguides.io/accessibility/dynamic-type-and-font-scaling/) - font scale layouts
* [Reduced Motion](https://docs.wahwei/reactnative.codeguides.io/accessibility/reduced-motion/) - Reanimated and AccessibilityInfo
* [Accessibility Audit Checklist](https://docs.wahwei/reactnative.codeguides.io/accessibility/accessibility-audit-checklist/) - pre-release gate
* [Design Systems Basics](https://docs.wahwei/reactnative.codeguides.io/design-systems/design-systems-basics/) - accessible primitives
* [Animations reduced motion](https://docs.wahwei/reactnative.codeguides.io/accessibility/reduced-motion/) - animation-engine checklist

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
