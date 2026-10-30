# Accessibility in Forms

Labels, errors announced to VoiceOver/TalkBack, and focus management.

Highlights / Accessibility in Forms

* Every TextInput needs an accessibilityLabel - placeholder text is not a label
* Expose validation errors with accessibilityLiveRegion or AccessibilityInfo.announceForAccessibility
* Move focus to the first invalid field after submit - screen reader users miss visual-only error summaries
* Group related inputs with accessibilityRole and accessibilityState, not visual proximity alone
* accessibilityHint carries format guidance; keep labels short and stable
* Test with VoiceOver and TalkBack on device - eslint-plugin-react-native-a11y catches only a fraction

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import { useRef } from "react";
import {
  AccessibilityInfo,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
 
export function AccessibleField({
  label,
  hint,
  error,
  value,
  onChangeText,
}: {
  label: string;
  hint?: string;
  error?: string;
  value: string;
  onChangeText: (t: string) => void;
}) {
  const inputRef = useRef<TextInput>(null);
 
  return (
    <View style={{ gap: 4 }}>
      <Text nativeID="emailLabel" style={{ fontWeight: "600" }}>
        {label}
      </Text>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={label}
        accessibilityHint={hint}
        accessibilityLabelledBy="emailLabel"
        accessibilityInvalid={!!error}
      />
      {error ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          style={{ color: "#dc2626" }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
 
export async function announceFormError(message: string) {
  await AccessibilityInfo.announceForAccessibility(message);
}
 
export function focusFirstError(
  refs: Array<React.RefObject<TextInput | null>>,
  errors: boolean[],
) {
  const idx = errors.findIndex(Boolean);
  if (idx >= 0) refs[idx]?.current?.focus();
}
```

**When to reach for this:** Any production form - store review, enterprise procurement, and real users with VoiceOver/TalkBack enabled. Mobile forms fail accessibility audits most often on missing labels, silent errors, and lost focus after validation.

## Working Example

```tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { forwardRef, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { z } from "zod";
 
const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  phone: z
    .string()
    .regex(/^\d{10}$/, "Enter a 10-digit phone number without spaces"),
});
 
type FormValues = z.infer<typeof schema>;
 
const FIELD_ORDER = ["name", "email", "phone"] as const;
 
export function ContactForm({ onSuccess }: { onSuccess: () => void }) {
  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const refs = [nameRef, emailRef, phoneRef];
 
  const {
    control,
    handleSubmit,
    formState: { errors },
    setFocus,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "" },
    mode: "onTouched",
  });
 
  const onInvalid = async () => {
    const first = FIELD_ORDER.find((k) => errors[k]);
    if (first) {
      setFocus(first);
      const message = errors[first]?.message ?? "Fix the highlighted fields";
      await AccessibilityInfo.announceForAccessibility(message);
    }
  };
 
  const onSubmit = handleSubmit(async (data) => {
    await fakeSubmit(data);
    await AccessibilityInfo.announceForAccessibility("Message sent successfully");
    onSuccess();
  }, onInvalid);
 
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading} accessibilityRole="header">
        Contact us
      </Text>
      <Text style={styles.sub}>
        Required fields are marked. Errors are announced automatically.
      </Text>
 
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <Field
            ref={nameRef}
            label="Full name"
            required
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
 
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <Field
            ref={emailRef}
            label="Email"
            required
            hint="We reply within one business day"
            keyboardType="email-address"
            autoCapitalize="none"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
 
      <Controller
        control={control}
        name="phone"
        render={({ field, fieldState }) => (
          <Field
            ref={phoneRef}
            label="Phone"
            hint="Ten digits, no dashes"
            keyboardType="phone-pad"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
 
      <Pressable
        style={styles.submit}
        onPress={onSubmit}
        accessibilityRole="button"
        accessibilityLabel="Send message"
      >
        <Text style={styles.submitText}>Send</Text>
      </Pressable>
    </ScrollView>
  );
}
 
type FieldProps = {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  onBlur: () => void;
  error?: string;
  hint?: string;
  required?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences";
};
 
const Field = forwardRef<TextInput, FieldProps>(function Field(
  {
    label,
    value,
    onChangeText,
    onBlur,
    error,
    hint,
    required,
    keyboardType = "default",
    autoCapitalize = "sentences",
  },
  ref,
) {
  const labelId = `${label.replace(/\s/g, "")}Label`;
  const errorId = `${label.replace(/\s/g, "")}Error`;
  const a11yLabel = required ? `${label}, required` : label;
 
  return (
    <View style={styles.field}>
      <Text nativeID={labelId} style={styles.label}>
        {label}
        {required ? " *" : ""}
      </Text>
      <TextInput
        ref={ref}
        style={[styles.input, error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        accessibilityLabel={a11yLabel}
        accessibilityHint={hint}
        accessibilityLabelledBy={labelId}
        accessibilityInvalid={!!error}
      />
      {error ? (
        <Text
          nativeID={errorId}
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          style={styles.error}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
});
 
async function fakeSubmit(_data: FormValues) {
  await new Promise((r) => setTimeout(r, 300));
}
 
const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  heading: { fontSize: 24, fontWeight: "700" },
  sub: { fontSize: 14, color: "#64748b", marginBottom: 4 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  inputError: { borderColor: "#dc2626" },
  error: { fontSize: 13, color: "#dc2626" },
  submit: {
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  submitText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
```

**What this demonstrates:**

* **Visible + accessible labels** - `Text` with `nativeID` paired to `accessibilityLabelledBy` on `TextInput`.
* **Required state in the label** - "Full name, required" is announced once; asterisk is visual only.
* **Hints vs errors** - `accessibilityHint` for format guidance; `accessibilityLiveRegion="assertive"` for validation text.
* **Invalid state** - `accessibilityInvalid` flags the field for assistive tech when Zod fails.
* **Submit failure path** - `onInvalid` focuses the first bad field and calls `announceForAccessibility`.

## Deep Dive

### How It Works

* **Screen readers traverse the accessibility tree**, not the visual layout. Each `TextInput` must expose name (label), role (`textbox` is default), value, hint, and state (disabled, invalid).
* **Placeholder is not a label** - placeholders disappear on input and often fail contrast; always render a visible `Text` label.
* **Error announcement** - When error text mounts or changes, `accessibilityLiveRegion="polite"` or `"assertive"` asks TalkBack/VoiceOver to read it. For submit-time batch errors, `AccessibilityInfo.announceForAccessibility` gives a single spoken summary.
* **Focus management** - `.focus()` on the first invalid `TextInput` after failed submit matches web `focus()` on `aria-invalid` fields - critical because mobile users may not see the top of a long `ScrollView`.
* **Grouping** - Radio clusters, checkbox groups, and address blocks need a container with `accessibilityRole` (e.g., `"radiogroup"`) and a group label, not three isolated textboxes.

### Accessibility Props for Form Controls

| Prop | Purpose | Example |
| --- | --- | --- |
| `accessibilityLabel` | Spoken name when visible label is insufficient or icon-only | `"Email, required"` |
| `accessibilityHint` | How to interact / format expectation | `"Ten digits, no dashes"` |
| `accessibilityLabelledBy` | Tie to visible label `nativeID` (Android + iOS 13+) | `emailLabel` |
| `accessibilityInvalid` | Marks field as failing validation | `true` when error present |
| `accessibilityState` | Disabled, selected, checked, expanded | `{ disabled: true }` on submit |
| `accessibilityLiveRegion` | Announce dynamic error text | `"assertive"` on error `Text` |
| `accessibilityRole` | Semantic role override | `"button"` on custom submit `Pressable` |

### Error Announcement Strategies

```tsx
// 1. Inline error text - mount/unmount triggers live region
{error && (
  <Text accessibilityRole="alert" accessibilityLiveRegion="assertive">
    {error}
  </Text>
)}
 
// 2. Submit summary - one spoken message for multiple failures
const count = Object.keys(errors).length;
if (count > 0) {
  await AccessibilityInfo.announceForAccessibility(
    `${count} fields need attention. ${firstMessage}`,
  );
}
 
// 3. Success confirmation - do not rely on toast alone
await AccessibilityInfo.announceForAccessibility("Profile saved");
```

* Use **assertive** for blocking errors; **polite** for non-blocking hints (character count).
* Avoid announcing on every keystroke - validate on blur or submit for noisy fields.
* Pair announcements with focus moves - hearing the error without knowing which field failed is half an fix.

### TypeScript Notes

```tsx
import type { TextInput } from "react-native";
import type { RefObject } from "react";
 
type InputRef = RefObject<TextInput | null>;
 
function focusField(ref: InputRef) {
  ref.current?.focus();
}
 
// react-hook-form setFocus is typed to field names
import type { FieldPath } from "react-hook-form";
function focusByName<T extends Record<string, unknown>>(
  setFocus: (name: FieldPath<T>) => void,
  name: FieldPath<T>,
) {
  setFocus(name);
}
```

* `forwardRef` field components preserve ref typing for focus management.
* `accessibilityLabelledBy` accepts a string `nativeID` on iOS/Android recent versions; fall back to `accessibilityLabel` alone on older targets if needed.
* Keep label `nativeID`s unique per screen - collisions break the label association.

## Gotchas

* **Placeholder-only labels** - VoiceOver reads the empty field as "text field" with no name. **Fix:** Visible `Text` label + `accessibilityLabel`.
* **Errors only shown in red border** - Color-blind users and screen reader users miss the failure. **Fix:** Text error + `accessibilityInvalid` + live region or announcement.
* **Icon-only clear buttons** - Announced as unlabeled "button". **Fix:** `accessibilityLabel="Clear email field"`.
* **Submit with no focus move** - User hears nothing and assumes the app froze. **Fix:** `onInvalid` → `setFocus(firstError)` + `announceForAccessibility`.
* **Duplicated announcements** - Live region on every field fires six times on submit. **Fix:** Per-field inline errors on blur; single summary announcement on submit.
* **Custom picker triggers without value** - "Button" with no current date spoken. **Fix:** `accessibilityLabel={`Date, ${formatted}`}` - see pickers article.
* **Disabled submit with no explanation** - Button state `disabled` may not explain why. **Fix:** `accessibilityState={{ disabled: true }}` and helper text above when form incomplete.
* **`keyboardShouldPersistTaps` omitted** - VoiceOver double-tap on submit does not fire while keyboard is open. **Fix:** `"handled"` on form `ScrollView` / `KeyboardAwareScrollView`.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Visible label + `accessibilityLabelledBy` | Default for all text fields | Decorative single-field search with explicit `accessibilityLabel` on the input |
| `accessibilityLiveRegion` on error `Text` | Inline field errors after blur/submit | Batch server errors - use `announceForAccessibility` once |
| `AccessibilityInfo.announceForAccessibility` | Submit summary, success toast, step changes | Replacing per-field labels entirely |
| Design-system `Field` primitive | Enforce label/error/hint contract app-wide | One-off prototype - still copy the prop pattern |
| `eslint-plugin-react-native-a11y` | CI guard for missing labels on `TextInput` | Substitute for device testing with real assistive tech |
| Platform accessibility settings | Respect `AccessibilityInfo.isReduceMotionEnabled` for animated validation | Building a separate "accessible mode" - bake into default UI |

## FAQs

Is placeholder text enough for a label?

* No - placeholders are temporary, often low contrast, and not in the accessibility name once filled.
* Always render a persistent visible label; use `accessibilityLabel` that matches or supplements it.
* Search bars are the exception - set an explicit `accessibilityLabel="Search"` on the `TextInput`.

How do VoiceOver and TalkBack announce form errors?

* They read error text associated with the focused field when `accessibilityLiveRegion` or `accessibilityRole="alert"` is set.
* `announceForAccessibility` pushes a global announcement - useful after submit when focus moves.
* Test both platforms - interruption timing and verbosity differ slightly.

What is the difference between accessibilityLabel and accessibilityHint?

* **Label** - what the control *is* ("Email, required").
* **Hint** - what happens on activation or format rules ("Double tap to edit", "Ten digits").
* Do not put validation errors in `hint` - errors change; hints should be stable instructions.

How do I mark a field as required for screen readers?

* Include "required" in `accessibilityLabel` or visible label text.
* `accessibilityState` does not have `required` - spoken label is the reliable approach.
* Asterisks alone are not announced - do not rely on `*` without the word "required".

How do I focus the first invalid field after submit?

* `react-hook-form`: `handleSubmit(onValid, onInvalid)` and `setFocus(firstFieldName)` in `onInvalid`.
* Imperative refs: `refs.find` + `.focus()` on the first field with an error.
* Scroll the field into view if inside `ScrollView` - `scrollTo` or keyboard-aware scroll refs.

Does accessibilityInvalid exist in React Native 0.86?

* Yes - maps to platform invalid state for text fields.
* Pair with visible error text - not every AT version surfaces invalid identically.
* Also set border/error styling for sighted users - do not rely on AT alone.

How do checkbox and switch groups work?

* Each `Switch` needs its own `accessibilityLabel` describing what it toggles.
* For mutually exclusive options, use `accessibilityRole="radio"` / `radiogroup` on a `Pressable` cluster.
* Mirror checked state in `accessibilityState={{ checked: value }}`.

How do I handle password fields?

* `secureTextEntry` - label should still be "Password, required".
* Do not put password rules only in `hint` - repeat concise rules in visible helper text.
* Announce policy errors ("Password too short") via live region on blur, not every character typed.

What about errors from the server after submit?

* Map server field keys to form `setError("email", { message })`.
* Announce the first server error globally, then focus that field.
* If error is non-field (rate limit), use `announceForAccessibility` on a banner `Text` with `accessibilityRole="alert"`.

How do multi-step wizards announce step changes?

* On step advance: `announceForAccessibility("Step 2 of 4, Delivery address")`.
* Focus the first field on the new step after a short delay (`requestAnimationFrame`).
* See [Multi-Step & Wizard Flows](https://docs.wahwei/reactnative.codeguides.io/forms-input/multi-step-and-wizard-flows/) for navigation + persistence.

Can lint rules replace manual testing?

* `eslint-plugin-react-native-a11y` catches missing `accessibilityLabel` on some components.
* It cannot verify focus order, announcement timing, or TalkBack gesture conflicts.
* Add one device pass with VoiceOver + TalkBack to your release checklist.

How do pickers and custom inputs differ from TextInput?

* Triggers are `Pressable` with `accessibilityRole="button"` and label including current value.
* Native pickers inherit OS accessibility - custom wheels need manual item labels.
* See [Pickers, Date/Time & Native Inputs](https://docs.wahwei/reactnative.codeguides.io/forms-input/pickers-date-time-and-native-inputs/).

Does font scaling affect form layout?

* Large Dynamic Type / font scale can clip labels - use flexible layouts and `maxFontSizeMultiplier` on dense screens only with care.
* Test one field at 200% system font - errors must remain visible, not clipped.
* See [Typography Scale & Font Loading](https://docs.wahwei/reactnative.codeguides.io/styling-layout/typography-scale-and-font-loading/).

## Related

* [Forms Basics](https://docs.wahwei/reactnative.codeguides.io/forms-input/forms-basics/) - `TextInput` props, `keyboardType`, and focus chain
* [Validation with Zod](https://docs.wahwei/reactnative.codeguides.io/forms-input/validation-with-zod/) - error messages worth announcing
* [react-hook-form on Mobile](https://docs.wahwei/reactnative.codeguides.io/forms-input/react-hook-form-on-mobile/) - `setFocus`, `setError`, and `onInvalid`
* [Pickers, Date/Time & Native Inputs](https://docs.wahwei/reactnative.codeguides.io/forms-input/pickers-date-time-and-native-inputs/) - accessible picker triggers
* [Multi-Step & Wizard Flows](https://docs.wahwei/reactnative.codeguides.io/forms-input/multi-step-and-wizard-flows/) - step announcements and per-step errors
* [Keyboard Controller](https://docs.wahwei/reactnative.codeguides.io/forms-input/keyboard-controller/) - keeping focused fields visible above the keyboard
* [Event Handling & Touchables](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/event-handling-and-touchables/) - `accessibilityRole` and `accessibilityState` on `Pressable`

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
