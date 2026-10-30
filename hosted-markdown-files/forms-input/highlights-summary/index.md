# Forms & Input Highlights Summary

Every highlight bullet from the 8 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Forms & Input Highlights Summary

* Controlled inputs store value in React state and update via onChangeText
* Use Controller for every TextInput - React Native has no native form element to register by ref
* z.infer<typeof Schema> is the single source of truth for form values and API payloads
* KeyboardProvider at the app root enables consistent keyboard events on iOS and Android
* Use @react-native-community/datetimepicker for dates and times - it renders the OS-native control
* Keep one form object across steps - split UI, not state, unless steps are independent domains

## [Forms Basics](https://docs.wahwei/reactnative.codeguides.io/forms-input/forms-basics/)

* Controlled inputs store value in React state and update via onChangeText
* keyboardType picks the correct software keyboard - email, numeric, phone
* returnKeyType labels the action key - next, done, go, search
* blurOnSubmit=false keeps focus moving between fields without dismissing the keyboard
* Refs call .focus() for autofocus, error recovery, and programmatic focus chains
* onSubmitEditing wires the keyboard action key to focus the next field or submit
* keyboardShouldPersistTaps="handled" lets submit buttons work on the first tap

## [react-hook-form on Mobile](https://docs.wahwei/reactnative.codeguides.io/forms-input/react-hook-form-on-mobile/)

* Use Controller for every TextInput - React Native has no native form element to register by ref
* defaultValues must list every field or isDirty and reset behave incorrectly
* mode: onTouched validates after blur, reducing keyboard-dismiss churn on small screens
* formState is a Proxy - destructure only the flags you read or you opt into extra re-renders
* setFocus jumps between fields for wizard steps and accessible error recovery
* Pair with Zod via zodResolver so validation schemas stay the single source of truth

## [Validation with Zod](https://docs.wahwei/reactnative.codeguides.io/forms-input/validation-with-zod/)

* z.infer is the single source of truth for form values and API payloads
* zodResolver bridges Zod into react-hook-form - errors map to field paths automatically
* TextInput always yields strings - use z.coerce.number() or preprocess before comparing numbers
* Show errors only after touch or submit to avoid shouting at users mid-keystroke
* Use .refine() and .superRefine() for cross-field rules like password confirmation
* Map server fieldErrors with setError so API failures appear inline, not in alerts

## [Keyboard Controller](https://docs.wahwei/reactnative.codeguides.io/forms-input/keyboard-controller/)

* KeyboardProvider at the app root enables consistent keyboard events on iOS and Android
* KeyboardAwareScrollView scrolls the focused TextInput above the keyboard with native timing
* bottomOffset accounts for fixed footers, toolbars, and safe-area padding
* KeyboardToolbar adds Previous / Next / Done without custom focus bookkeeping
* Prefer keyboard-controller over KeyboardAvoidingView for multi-field forms
* Pair with react-hook-form setFocus for return-key and toolbar navigation

## [Pickers, Date/Time & Native Inputs](https://docs.wahwei/reactnative.codeguides.io/forms-input/pickers-date-time-and-native-inputs/)

* Use @react-native-community/datetimepicker for dates and times - it renders the OS-native control
* Android pickers are modal dialogs; iOS pickers are inline spinners unless you wrap them
* @react-native-picker/picker maps to UIPickerView and Android Spinner - not a dropdown menu
* Store Date objects in state; format for display with Intl or date-fns at the edge
* Custom wheel pickers look consistent cross-platform but lose accessibility and locale behavior
* Always pair picker triggers with visible labels and accessibilityLabel on the Pressable

## [Multi-Step & Wizard Flows](https://docs.wahwei/reactnative.codeguides.io/forms-input/multi-step-and-wizard-flows/)

* Keep one form object across steps - split UI, not state, unless steps are independent domains
* Validate per step on Next; run full-schema validation only on final submit
* Back navigation must not discard entered data - persist to memory, MMKV, or AsyncStorage
* Hardware back on Android and swipe-back on iOS need explicit guards when a step is dirty
* react-hook-form FormProvider shares one methods instance across step components
* Show progress (step N of M) and disable Next until the current step schema passes

## [Accessibility in Forms](https://docs.wahwei/reactnative.codeguides.io/forms-input/accessibility-in-forms/)

* Every TextInput needs an accessibilityLabel - placeholder text is not a label
* Expose validation errors with accessibilityLiveRegion or AccessibilityInfo.announceForAccessibility
* Move focus to the first invalid field after submit - screen reader users miss visual-only error summaries
* Group related inputs with accessibilityRole and accessibilityState, not visual proximity alone
* accessibilityHint carries format guidance; keep labels short and stable
* Test with VoiceOver and TalkBack on device - eslint-plugin-react-native-a11y catches only a fraction

## [Forms Best Practices](https://docs.wahwei/reactnative.codeguides.io/forms-input/best-practices/)

* Keep TextInput controlled with value and onChangeText
* Use react-hook-form Controller - register does not wire RN inputs
* Validate with Zod at submit and map server errors with setError
* Wrap the app in KeyboardProvider for keyboard-controller layouts
* Persist multi-step drafts and confirm before discarding dirty wizards
* Announce validation failures to VoiceOver and TalkBack

Reviewed by Chris St. John·Last updated Jul 18, 2026
