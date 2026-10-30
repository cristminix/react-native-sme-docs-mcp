# Forms Best Practices

A condensed summary of the 25 most important best practices drawn from every page in this section.

Highlights / Forms Best Practices

* Keep TextInput controlled with value and onChangeText
* Use react-hook-form Controller - register does not wire RN inputs
* Validate with Zod at submit and map server errors with setError
* Wrap the app in KeyboardProvider for keyboard-controller layouts
* Persist multi-step drafts and confirm before discarding dirty wizards
* Announce validation failures to VoiceOver and TalkBack

1. **Control every TextInput:** Pair `value` with `onChangeText` - uncontrolled inputs fight autofill, reset logic, and validation libraries on mobile.
2. **Match keyboardType to the field:** `email-address`, `phone-pad`, and `numeric` reduce errors and speed entry - wrong keyboards frustrate users on small screens.
3. **Chain fields with returnKeyType:** Use `next` + `onSubmitEditing` → `.focus()` on the next ref - fewer taps than dismissing the keyboard between fields.
4. **Set blurOnSubmit false on multi-field screens:** Last field uses `done` - intermediate fields should move focus, not dismiss the keyboard prematurely.
5. **Dismiss keyboard on submit:** Call `Keyboard.dismiss()` in the submit handler so success states and navigation are not obscured.
6. **Use keyboardShouldPersistTaps on scroll forms:** `ScrollView`/`FlatList` wrappers need `keyboardShouldPersistTaps="handled"` so submit buttons receive taps while the keyboard is open.
7. **Prefer react-hook-form on mobile:** Subscriptions beat giant `useState` forms - wire inputs with `Controller`, not web-style `register`.
8. **Validate on touch, not every keystroke:** `mode: "onTouched"` keeps inline errors calm - screaming validation on `onChange` feels hostile on phones.
9. **Single source of truth with Zod:** Export `z.infer<typeof Schema>` - duplicating interfaces beside schemas drifts on the first API change.
10. **Coerce TextInput strings in schemas:** `z.coerce.number()` or explicit transforms - `TextInput` always delivers strings even for numeric fields.
11. **Put cross-field errors on the right path:** Password confirm `.refine()` needs `path: ["confirmPassword"]` - root errors are invisible on mobile.
12. **Map server validation with setError:** HTTP 422 field errors should land on the matching `Controller` - generic toasts alone force users to guess what failed.
13. **Install KeyboardProvider at the root:** `react-native-keyboard-controller` requires the provider in `_layout` - without it, aware scroll and toolbar helpers noop.
14. **Prefer KeyboardAwareScrollView over naive KAV:** Keyboard controller tracks focused inputs more reliably across iOS and Android edge-to-edge (RN 0.86).
15. **Set Android softwareKeyboardLayoutMode:** `app.config` `softwareKeyboardLayoutMode: "pan"` pairs with keyboard-controller - resizes behave differently per OEM without it.
16. **Use native pickers for dates when UX allows:** `@react-native-community/datetimepicker` respects platform conventions - custom wheels cost accessibility and maintenance.
17. **Store picker values as Date or ISO in state:** Format with `Intl` at the display edge - parsing locale strings in submit handlers breaks on i18n.
18. **One form object across wizard steps:** `FormProvider` holds all fields - per-step `useState` loses email when step 2 mounts.
19. **Validate only current step fields on Next:** `trigger(STEP_FIELDS[step])` - full-schema validation on step 1 fails because step 3 is empty.
20. **Persist wizard drafts:** MMKV or AsyncStorage autosave survives process death - confirm before Cancel when `isDirty`.
21. **Intercept Android hardware back in wizards:** `BackHandler` decrements step index - otherwise users leave the flow accidentally.
22. **Label every field for accessibility:** `accessibilityLabel` or visible labels linked with `accessibilityLabelledBy` - placeholder text is not a label.
23. **Announce form errors:** `AccessibilityInfo.announceForAccessibility` on submit failure - screen readers may not move focus to the first error automatically.
24. **Focus the first invalid field after submit:** `setFocus` on the first error path - mobile users should not hunt for red borders off-screen.
25. **Queue offline submissions explicitly:** Optimistic UI plus a persisted retry queue - silent failure offline is worse than a clear "Saved locally" state.

## FAQs

Should I use react-hook-form or plain useState for a three-field form?

* `useState` is fine for a single screen with three fields and no server errors.
* Reach for RHF once you add Zod, multi-step flows, or field-level performance concerns.

Is KeyboardAvoidingView enough in 2026?

* It still works for simple screens.
* Feed-heavy or chat UIs benefit from `react-native-keyboard-controller` for consistent inset handling on RN 0.86.

When should pickers be custom UI?

* When brand requires a non-native look and you accept the accessibility testing cost.
* Default to native pickers for dates and single-choice lists unless design mandates otherwise.

## Related

* [Forms Basics](https://docs.wahwei/reactnative.codeguides.io/forms-input/forms-basics/) - controlled inputs, focus, and keyboard basics
* [react-hook-form on Mobile](https://docs.wahwei/reactnative.codeguides.io/forms-input/react-hook-form-on-mobile/) - Controller patterns and minimal re-renders
* [Validation with Zod](https://docs.wahwei/reactnative.codeguides.io/forms-input/validation-with-zod/) - schema-first inline errors
* [Keyboard Controller](https://docs.wahwei/reactnative.codeguides.io/forms-input/keyboard-controller/) - avoiding obscured inputs
* [Multi-Step & Wizard Flows](https://docs.wahwei/reactnative.codeguides.io/forms-input/multi-step-and-wizard-flows/) - persistence and back navigation
* [Accessibility in Forms](https://docs.wahwei/reactnative.codeguides.io/forms-input/accessibility-in-forms/) - labels, errors, and focus

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
