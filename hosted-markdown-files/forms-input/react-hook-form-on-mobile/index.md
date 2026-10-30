# react-hook-form on Mobile

React Native `TextInput` components are always controlled from the native side, but you still want uncontrolled *form state* on the JS thread. **react-hook-form** subscribes to field changes instead of re-rendering the whole screen on every keystroke - the pattern that keeps multi-field signup and checkout flows smooth on mid-range Android devices.

Highlights / react-hook-form on Mobile

* Use Controller for every TextInput - React Native has no native form element to register by ref
* defaultValues must list every field or isDirty and reset behave incorrectly
* mode: onTouched validates after blur, reducing keyboard-dismiss churn on small screens
* formState is a Proxy - destructure only the flags you read or you opt into extra re-renders
* setFocus jumps between fields for wizard steps and accessible error recovery
* Pair with Zod via zodResolver so validation schemas stay the single source of truth

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import { Controller, useForm } from "react-hook-form";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
 
interface SignInValues {
  email: string;
  password: string;
}
 
export function SignInForm() {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  });
 
  async function onSubmit(values: SignInValues) {
    await fetch("https://api.example.com/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
  }
 
  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="email"
        rules={{ required: "Email is required" }}
        render={({ field: { onChange, onBlur, value, ref } }) => (
          <TextInput
            ref={ref}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="Email"
            style={styles.input}
          />
        )}
      />
      {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}
 
      <Controller
        control={control}
        name="password"
        rules={{ minLength: { value: 8, message: "At least 8 characters" } }}
        render={({ field: { onChange, onBlur, value, ref } }) => (
          <TextInput
            ref={ref}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            secureTextEntry
            placeholder="Password"
            style={styles.input}
          />
        )}
      />
      {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}
 
      <Pressable
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting}
        style={styles.button}
      >
        <Text style={styles.buttonText}>{isSubmitting ? "Signing in…" : "Sign in"}</Text>
      </Pressable>
    </View>
  );
}
 
const styles = StyleSheet.create({
  form: { gap: 12, padding: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  error: { color: "#dc2626", fontSize: 13 },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});
```

**When to reach for this:**

* Screens with more than three `TextInput` fields where `useState` per field causes visible jank.
* Dynamic field lists (addresses, line items) via `useFieldArray`.
* Forms that share validation with your web app through Zod schemas.
* Multi-step wizards that need one form instance across steps.
* Any flow where you need `isDirty` guards before navigating back.

## Working Example

```tsx
// components/form/TextField.tsx - reusable RN field wired to RHF
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
 
interface TextFieldProps<T extends FieldValues> extends Omit<TextInputProps, "value" | "onChangeText"> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
}
 
export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  ...inputProps
}: TextFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value, ref }, fieldState: { error, isTouched } }) => (
        <View style={styles.field}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            ref={ref}
            value={value ?? ""}
            onChangeText={onChange}
            onBlur={onBlur}
            style={[styles.input, isTouched && error && styles.inputError]}
            accessibilityLabel={label}
            {...inputProps}
          />
          {error && <Text style={styles.error}>{error.message}</Text>}
        </View>
      )}
    />
  );
}
 
const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151" },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  inputError: { borderColor: "#dc2626" },
  error: { color: "#dc2626", fontSize: 13 },
});
```

```tsx
// app/(auth)/register.tsx - profile form with focus chain and submit guard
import { useForm } from "react-hook-form";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { TextField } from "../../components/form/TextField";
 
interface RegisterValues {
  fullName: string;
  email: string;
  phone: string;
}
 
export default function RegisterScreen() {
  const router = useRouter();
 
  const {
    control,
    handleSubmit,
    setFocus,
    formState: { isSubmitting, isDirty },
  } = useForm<RegisterValues>({
    defaultValues: { fullName: "", email: "", phone: "" },
    mode: "onTouched",
  });
 
  async function onSubmit(values: RegisterValues) {
    const res = await fetch("https://api.example.com/v1/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      Alert.alert("Registration failed", "Check your details and try again.");
      return;
    }
    Alert.alert("Account created", "You can sign in now.");
  }
 
  function handleBack() {
    if (isDirty) {
      Alert.alert("Discard changes?", "You have unsaved edits.", [
        { text: "Stay", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: () => router.back() },
      ]);
      return;
    }
    router.back();
  }
 
  return (
    <KeyboardAwareScrollView
      bottomOffset={24}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Create account</Text>
 
      <TextField
        control={control}
        name="fullName"
        label="Full name"
        autoComplete="name"
        returnKeyType="next"
        onSubmitEditing={() => setFocus("email")}
      />
 
      <TextField
        control={control}
        name="email"
        label="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        returnKeyType="next"
        onSubmitEditing={() => setFocus("phone")}
      />
 
      <TextField
        control={control}
        name="phone"
        label="Phone"
        keyboardType="phone-pad"
        autoComplete="tel"
        returnKeyType="done"
        onSubmitEditing={handleSubmit(onSubmit)}
      />
 
      <View style={styles.actions}>
        <Pressable onPress={handleBack} style={styles.secondary}>
          <Text style={styles.secondaryText}>Back</Text>
        </Pressable>
        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          style={styles.primary}
        >
          <Text style={styles.primaryText}>{isSubmitting ? "Saving…" : "Continue"}</Text>
        </Pressable>
      </View>
    </KeyboardAwareScrollView>
  );
}
 
const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 16 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  actions: { flexDirection: "row", gap: 12, marginTop: 8 },
  secondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryText: { fontWeight: "600", color: "#374151" },
  primary: {
    flex: 1,
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryText: { color: "#fff", fontWeight: "600" },
});
```

**What this demonstrates:**

* `Controller` bridges react-hook-form to every `TextInput` - the required pattern on React Native.
* A reusable `TextField` keeps error styling and accessibility labels consistent across screens.
* `setFocus` and `returnKeyType="next"` chain the software keyboard without extra state.
* `mode: "onTouched"` validates after blur, not on every character - better for mobile typing.
* `isDirty` powers a discard-changes guard before the user leaves the screen.
* `KeyboardAwareScrollView` keeps the active field visible above the keyboard.

## Deep Dive

### How It Works

* `useForm` holds field values in a ref-backed store - updating a field does not re-render the parent unless you subscribe to that slice of `formState`.
* `Controller` registers the field, wires `onChange` to `onChangeText`, and attaches the `ref` so `setFocus` can call `TextInput.focus()`.
* Validation runs through `rules` on the `Controller`, a custom `resolver`, or `zodResolver` (see [Validation with Zod](https://docs.wahwei/reactnative.codeguides.io/forms-input/validation-with-zod/)).
* `handleSubmit` runs validation first; your `onSubmit` only fires when the form is valid.
* `formState` uses a Proxy - reading `errors.email` subscribes the component to email errors; reading the entire `formState` object subscribes to everything.

### Controller vs register on Mobile

| Approach | React Native | Notes |
| --- | --- | --- |
| `register` + spread props | Does not work | No `<input>` ref; `TextInput` needs `onChangeText` |
| `Controller` | Default | Full control over `TextInput` props and styling |
| `useController` | Custom field components | Same as `Controller`, better for design-system wrappers |

On web you can `{...register("email")}` on a native input. On RN, always use `Controller` or `useController`.

### Validation Modes for Mobile

| `mode` | When validation runs | Mobile fit |
| --- | --- | --- |
| `onSubmit` | On button press | Simple one-field forms |
| `onTouched` | After first blur, then on change | **Recommended default** for multi-field screens |
| `onBlur` | Every blur | Good for long text areas |
| `onChange` | Every keystroke | Use sparingly - can fight the keyboard and cause jank |

Combine with `reValidateMode: "onChange"` so corrected fields clear errors immediately after the first submit attempt.

### FormProvider and Multi-Step Flows

```tsx
import { FormProvider, useForm } from "react-hook-form";
 
const methods = useForm<WizardValues>({ defaultValues: { /* all steps */ } });
 
return (
  <FormProvider {...methods}>
    {step === 1 ? <AccountStep /> : <AddressStep />}
  </FormProvider>
);
```

* Declare **all step fields** in `defaultValues` even if the current step only renders a subset - `isDirty` and `reset` stay accurate.
* Child steps call `useFormContext()` instead of receiving `control` through props.
* Persist `methods.getValues()` to AsyncStorage between steps for wizard recovery (see [Multi-Step & Wizard Flows](https://docs.wahwei/reactnative.codeguides.io/forms-input/multi-step-and-wizard-flows/)).

### TypeScript Notes

```tsx
import { useForm, type SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
 
const ProfileSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
});
 
type ProfileValues = z.infer<typeof ProfileSchema>;
 
const onSubmit: SubmitHandler<ProfileValues> = async (values) => {
  // values is fully typed
};
 
const form = useForm<ProfileValues>({
  resolver: zodResolver(ProfileSchema),
  defaultValues: { fullName: "", email: "" },
});
```

* Install with `npx expo install react-hook-form @hookform/resolvers zod`.
* Use `FieldPath<ProfileValues>` on reusable field `name` props so typos fail at compile time.
* `TextInput` values are always strings - coerce numbers in Zod with `z.coerce.number()` rather than typing fields as `number` in `defaultValues`.

### Parameters & Return Values

| API | Purpose on RN |
| --- | --- |
| `useForm({ defaultValues })` | Required - every field key must appear |
| `control` | Pass to `Controller` / `useFieldArray` |
| `handleSubmit(onValid, onInvalid?)` | Wraps `Pressable.onPress`; `onInvalid` can call `setFocus` on first error |
| `setFocus(name)` | Moves keyboard focus to a field by name |
| `reset(values?)` | Clears after success or restores draft |
| `watch(name)` | Subscribe to one field - avoid watching the whole form in render |
| `useFieldArray({ control, name })` | Dynamic rows - key list items with `field.id`, not array index |

## Gotchas

* **Spreading `register` on `TextInput`** - `register` returns web-centric props (`onChange`, `name`) that do not map to `onChangeText`. **Fix:** Use `Controller` and map `onChange` → `onChangeText`.
* **Missing `defaultValues` keys** - New fields show `undefined`, `isDirty` stays false after edits, and `reset()` skips them. **Fix:** List every field in `defaultValues`, including empty strings and empty arrays.
* **Destructuring all of `formState`** - `const { formState } = useForm()` then reading `formState.isSubmitting` in render still works, but `const { isSubmitting, errors, isDirty, isValid } = formState` subscribes to four signals at once. **Fix:** Destructure only what the component displays.
* **`watch()` in the parent render** - `watch()` without arguments re-renders on every keystroke across all fields - the problem RHF solves. **Fix:** `watch("email")` for one field, or move watched UI into an isolated child.
* **`undefined` TextInput value** - Passing `value={undefined}` triggers warnings and clears cursor position. **Fix:** `value={value ?? ""}` in the `Controller` render.
* **`onSubmit` without `handleSubmit`** - Pressing the button skips validation and sends partial data. **Fix:** `onPress={handleSubmit(onSubmit)}` on `Pressable`, never `onPress={onSubmit}`.
* **Server errors not mapped to fields** - API returns `{ fieldErrors: { email: "Taken" } }` but the UI shows a generic alert. **Fix:** Loop `setError("email", { type: "server", message })` and `setFocus("email")`.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| react-hook-form + `Controller` | Default for 4+ fields, dynamic lists, shared Zod schemas | A single search box with one piece of local state |
| Plain `useState` per field | 1–3 fields, no validation, prototype screens | Checkout, onboarding, or any form with cross-field rules |
| Formik | Brownfield app already on Formik | Greenfield Expo apps - heavier re-render profile |
| React 19 `useActionState` | Web-style server actions in Expo Router API routes | Complex client-only validation and masked inputs on device |
| TanStack Form | You want headless form primitives with fine-grained subscriptions | Team already standardized on RHF across web and mobile |

## FAQs

Why can't I use register() like on the web?

* React Native has no DOM `<input>` - `register` relies on ref + native change events that `TextInput` does not expose the same way.
* `TextInput` uses `onChangeText`, not `onChange`.
* `Controller` is the supported bridge and gives you full control over keyboard props.

What validation mode should I use on mobile?

* Start with `mode: "onTouched"` - errors appear after the user leaves a field, not mid-word.
* Add `reValidateMode: "onChange"` so fixed fields clear errors without another submit.
* Reserve `mode: "onChange"` for short fields like promo codes where instant feedback helps.

How do I move focus to the next field when the user taps Return?

```tsx
<TextField
  name="email"
  returnKeyType="next"
  onSubmitEditing={() => setFocus("password")}
/>
```

* `setFocus` is built into `useForm` - no manual ref map required when field names are registered.
* Set `returnKeyType="done"` on the last field and call `handleSubmit(onSubmit)` in `onSubmitEditing`.

How do I focus the first invalid field after submit?

```tsx
handleSubmit(onSubmit, (invalid) => {
  const first = Object.keys(invalid)[0] as keyof RegisterValues;
  setFocus(first);
})();
```

* The second argument to `handleSubmit` runs when validation fails.
* Combine with `scrollTo` from a ref on `KeyboardAwareScrollView` for long forms.

Does react-hook-form work with TypeScript on Expo?

* Yes - pass a generic to `useForm<FormValues>()` and to `Control<FormValues>` on field components.
* Pair with `zodResolver` and `z.infer<typeof Schema>` for end-to-end typed forms.
* Install via `npx expo install react-hook-form @hookform/resolvers zod`.

How do I show a loading state on the submit button?

* Destructure `isSubmitting` from `formState`.
* `handleSubmit` sets it true while your async `onSubmit` promise is pending.
* Disable the `Pressable` and change label text while `isSubmitting` is true.

Can I use react-hook-form inside a FlatList?

* Yes for the form wrapper - put fields inside `ListHeaderComponent` or `ListFooterComponent`.
* Do not put uncontrolled `TextInput` inside `renderItem` without `Controller` - recycling will reset values.
* For dynamic rows, prefer `useFieldArray` over manual index state.

How do I reset the form after a successful API call?

```tsx
async function onSubmit(values: RegisterValues) {
  await createAccount(values);
  reset(); // back to defaultValues
}
```

* `reset()` clears errors, dirty state, and values.
* Pass `reset(partialValues)` to keep some fields after success (e.g. email for a confirmation step).

Should I use FormProvider?

* Use it when multiple child components need `useFormContext()` - wizard steps, modal field groups, or design-system form sections.
* For a single-screen form, passing `control` to `TextField` is enough.

How does react-hook-form compare to controlled useState on RN?

* `useState` re-renders the owning component on every `onChangeText`.
* RHF stores values in refs and only re-renders subscribed `formState` slices.
* For 1–2 fields the difference is negligible; past ~4 fields RHF wins on mid-tier hardware.

How do I handle secure text and password visibility toggles?

* Keep `secureTextEntry` on `TextInput` inside `Controller` - do not fork a second uncontrolled input.
* Toggle visibility with local `useState` in the field component; the RHF value stays the same string.

Can I combine react-hook-form with KeyboardAwareScrollView?

* Yes - wrap the form in `KeyboardAwareScrollView` from `react-native-keyboard-controller`.
* Set `keyboardShouldPersistTaps="handled"` so submit buttons work while the keyboard is open.
* See [Keyboard Controller](https://docs.wahwei/reactnative.codeguides.io/forms-input/keyboard-controller/) for `bottomOffset` and toolbar setup.

How do I install react-hook-form in an Expo SDK 57 project?

```bash
npx expo install react-hook-form
```

* Add `@hookform/resolvers` and `zod` when you wire schema validation.
* No native config plugin required - pure JavaScript.

## Related

* [Forms Basics](https://docs.wahwei/reactnative.codeguides.io/forms-input/forms-basics/) - controlled `TextInput`, keyboard types, and focus fundamentals
* [Validation with Zod](https://docs.wahwei/reactnative.codeguides.io/forms-input/validation-with-zod/) - `zodResolver`, inline errors, and schema-first mobile UX
* [Keyboard Controller](https://docs.wahwei/reactnative.codeguides.io/forms-input/keyboard-controller/) - keep focused inputs visible above the software keyboard
* [Accessibility in Forms](https://docs.wahwei/reactnative.codeguides.io/forms-input/accessibility-in-forms/) - labels, error announcements, and focus order
* [Multi-Step & Wizard Flows](https://docs.wahwei/reactnative.codeguides.io/forms-input/multi-step-and-wizard-flows/) - one `useForm` instance across steps
* [Forms Best Practices](https://docs.wahwei/reactnative.codeguides.io/forms-input/best-practices/) - tap reduction, draft persistence, and offline submit

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
