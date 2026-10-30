# Validation with Zod

Zod describes what valid data looks like at runtime and infers the same TypeScript type your IDE autocompletes. On mobile, that matters twice: `TextInput` always delivers strings, and users expect inline errors under the field they just left - not a modal after tapping Submit.

Highlights / Validation with Zod

* z.infer<typeof Schema> is the single source of truth for form values and API payloads
* zodResolver bridges Zod into react-hook-form - errors map to field paths automatically
* TextInput always yields strings - use z.coerce.number() or preprocess before comparing numbers
* Show errors only after touch or submit to avoid shouting at users mid-keystroke
* Use .refine() and .superRefine() for cross-field rules like password confirmation
* Map server fieldErrors with setError so API failures appear inline, not in alerts

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
 
const SignUpSchema = z
  .object({
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    password: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });
 
type SignUpValues = z.infer<typeof SignUpSchema>;
 
export function SignUpForm() {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
    mode: "onTouched",
  });
 
  function onSubmit(values: SignUpValues) {
    console.log(values);
  }
 
  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="email"
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
 
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, onBlur, value, ref } }) => (
          <TextInput
            ref={ref}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            secureTextEntry
            placeholder="Confirm password"
            style={styles.input}
          />
        )}
      />
      {errors.confirmPassword && (
        <Text style={styles.error}>{errors.confirmPassword.message}</Text>
      )}
 
      <Pressable onPress={handleSubmit(onSubmit)} disabled={isSubmitting} style={styles.button}>
        <Text style={styles.buttonText}>Create account</Text>
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

* Any form where validation rules should match your API request schema.
* Cross-field rules - password confirmation, date ranges, conditional required fields.
* Sharing schemas between mobile forms and fetch-layer parsing (see [Typing API Responses & Zod](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-api-responses-and-zod/)).
* Localized error messages derived from one schema definition.
* Preventing `TextInput` string quirks from breaking numeric or boolean validation.

## Working Example

```ts
// lib/schemas/profile.ts - shared between form and API client
import { z } from "zod";
 
export const ProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required")
    .max(40, "Keep it under 40 characters"),
  bio: z
    .string()
    .max(280, "Bio must be 280 characters or fewer")
    .optional()
    .or(z.literal("")),
  age: z
    .string()
    .min(1, "Age is required")
    .pipe(
      z.coerce
        .number({ invalid_type_error: "Enter a number" })
        .int("Whole numbers only")
        .min(13, "You must be at least 13")
        .max(120, "Enter a realistic age")
    ),
  newsletter: z.boolean().default(false),
});
 
export type ProfileValues = z.infer<typeof ProfileSchema>;
 
export const ProfileUpdateSchema = ProfileSchema.pick({
  displayName: true,
  bio: true,
  newsletter: true,
});
 
export type ProfileUpdateValues = z.infer<typeof ProfileUpdateSchema>;
```

```tsx
// components/form/ValidatedTextField.tsx
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
 
interface ValidatedTextFieldProps<T extends FieldValues>
  extends Omit<TextInputProps, "value" | "onChangeText"> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
}
 
export function ValidatedTextField<T extends FieldValues>({
  control,
  name,
  label,
  ...inputProps
}: ValidatedTextFieldProps<T>) {
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
            accessibilityHint={error?.message}
            {...inputProps}
          />
          {isTouched && error && (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error.message}
            </Text>
          )}
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
// app/settings/profile.tsx - submit with server error mapping
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { ProfileSchema, type ProfileValues } from "../../lib/schemas/profile";
import { ValidatedTextField } from "../../components/form/ValidatedTextField";
 
type ApiFieldErrors = Partial<Record<keyof ProfileValues, string>>;
 
async function saveProfile(
  values: ProfileValues
): Promise<{ ok: true } | { ok: false; fieldErrors?: ApiFieldErrors; message?: string }> {
  const res = await fetch("https://api.example.com/v1/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const json: unknown = await res.json();
  if (!res.ok) {
    const body = json as { fieldErrors?: ApiFieldErrors; message?: string };
    return { ok: false, fieldErrors: body.fieldErrors, message: body.message };
  }
  return { ok: true };
}
 
export default function ProfileScreen() {
  const {
    control,
    handleSubmit,
    setError,
    setFocus,
    formState: { isSubmitting, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      displayName: "",
      bio: "",
      age: "",
      newsletter: false,
    },
    mode: "onTouched",
    reValidateMode: "onChange",
  });
 
  async function onSubmit(values: ProfileValues) {
    const result = await saveProfile(values);
    if (result.ok) {
      Alert.alert("Saved", "Your profile was updated.");
      return;
    }
    if (result.fieldErrors) {
      for (const [field, message] of Object.entries(result.fieldErrors)) {
        setError(field as keyof ProfileValues, { type: "server", message });
      }
      const first = Object.keys(result.fieldErrors)[0] as keyof ProfileValues;
      setFocus(first);
      return;
    }
    Alert.alert("Save failed", result.message ?? "Try again.");
  }
 
  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <ValidatedTextField control={control} name="displayName" label="Display name" />
 
      <ValidatedTextField
        control={control}
        name="bio"
        label="Bio"
        multiline
        numberOfLines={3}
        style={styles.multiline}
      />
 
      <ValidatedTextField
        control={control}
        name="age"
        label="Age"
        keyboardType="number-pad"
      />
 
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Email newsletter</Text>
        <Controller
          control={control}
          name="newsletter"
          render={({ field: { value, onChange } }) => (
            <Switch value={value} onValueChange={onChange} />
          )}
        />
      </View>
 
      <Pressable
        onPress={handleSubmit(onSubmit)}
        disabled={isSubmitting || !isDirty}
        style={[styles.button, (!isDirty || isSubmitting) && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>{isSubmitting ? "Saving…" : "Save changes"}</Text>
      </Pressable>
    </KeyboardAwareScrollView>
  );
}
 
const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 16 },
  multiline: { minHeight: 88, textAlignVertical: "top" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  switchLabel: { fontSize: 16 },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "600" },
});
```

**What this demonstrates:**

* One `ProfileSchema` drives both compile-time types and runtime validation.
* `.trim()`, `.coerce.number()`, and `.optional().or(z.literal(""))` handle `TextInput` string realities.
* `ValidatedTextField` shows errors only after touch - better mobile UX than validating on every character.
* `setError` + `setFocus` maps server `fieldErrors` to inline messages under the right input.
* `ProfileUpdateSchema.pick()` reuses field definitions for a partial edit form without duplicating rules.

## Deep Dive

### How It Works

* You define a Zod schema describing the shape, constraints, and error messages.
* `zodResolver(Schema)` adapts that schema to react-hook-form's `resolver` slot.
* On submit (or per `mode`), RHF passes current values to Zod; failures become `formState.errors` keyed by field path.
* `z.infer<typeof Schema>` exports the TypeScript type - no parallel `interface` to drift.
* Zod runs in plain `.ts` files with no JSX, so Metro can import schemas from API clients, background tasks, and tests.

### Rules at a Glance

| Zod helper | Mobile form use |
| --- | --- |
| `z.string().min(1)` | Required text fields (after `.trim()`) |
| `z.string().email()` | Email `TextInput` with `keyboardType="email-address"` |
| `z.coerce.number()` | Numeric fields - `TextInput` always returns strings |
| `z.boolean()` | `Switch` values via `Controller` |
| `z.enum(["a", "b"])` | Segmented controls and picker selections |
| `.optional()` | Field may be absent from the object |
| `.nullable()` | Field may be explicit `null` from the API |
| `.default(false)` | Checkbox off without registering `undefined` |
| `.refine()` | Cross-field rules with `path` targeting one field |
| `.superRefine()` | Multiple errors or array-index paths |

### Empty Strings and Optional Fields

```ts
const OptionalBioSchema = z.object({
  bio: z
    .string()
    .trim()
    .max(280)
    .transform((s) => (s === "" ? undefined : s))
    .optional(),
});
```

* Users leave optional fields blank as `""`, not `undefined`.
* Transform empty strings once in the schema instead of cleaning in `onSubmit`.
* For required fields, chain `.trim().min(1, "Required")` so whitespace-only input fails.

### Cross-Field Validation

```ts
const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must differ from current",
    path: ["newPassword"],
  });
```

* `.refine()` runs after base field parsing - ideal for password confirmation.
* Set `path` so the error attaches to the correct `TextInput`, not the form root.
* Use `.superRefine()` when one validation produces multiple errors on different paths.

### TypeScript Notes

```ts
import { z } from "zod";
 
const OrderSchema = z.object({
  quantity: z.coerce.number().positive(),
  note: z.string().optional(),
});
 
type OrderInput = z.input<typeof OrderSchema>;   // before transforms/coerce
type OrderOutput = z.output<typeof OrderSchema>; // after - same as z.infer when no transforms
type OrderValues = z.infer<typeof OrderSchema>;
```

* Install with `npx expo install zod @hookform/resolvers react-hook-form`.
* Export `Schema`, `type Values = z.infer<typeof Schema>`, and `safeParse` helpers from one module.
* Reuse API response schemas with `.pick()` / `.omit()` / `.extend()` so list, detail, and form shapes stay aligned.

### Error Display Patterns

| Pattern | Behavior | Best for |
| --- | --- | --- |
| Show on touch | `isTouched && error` | Default mobile UX |
| Show after first submit | `isSubmitted && error` | Short forms with one CTA |
| Always show | `error && message` | Accessibility-critical compliance forms |
| Summary banner | Root `errors.root` message | Non-field server failures |

```tsx
// Surface a non-field server error
setError("root", { type: "server", message: "Network unavailable. Try again." });
{errors.root && <Text style={styles.banner}>{errors.root.message}</Text>}
```

## Gotchas

* **Duplicating types and schemas** - Maintaining a `interface Profile` separate from `ProfileSchema` drifts on the first API change. **Fix:** Export only `z.infer<typeof ProfileSchema>`.
* **Validating numbers without coercion** - `z.number()` fails when `TextInput` delivers `"25"` as a string. **Fix:** `z.coerce.number()` or `z.string().regex(/^\d+$/).transform(Number)`.
* **`.optional()` vs empty string** - Optional bio field with `""` fails `z.string().email()` chained after. **Fix:** Trim and transform `""` → `undefined`, or use `.or(z.literal(""))`.
* **Showing errors before touch** - Validating `onChange` on every keystroke frustrates mobile users. **Fix:** `mode: "onTouched"` and render `isTouched && error`.
* **Password match on wrong path** - `.refine()` without `path` puts the error on `_form` root. **Fix:** `path: ["confirmPassword"]` so the message sits under the right field.
* **Nullable API fields in forms** - Backend sends `middleName: null` but form uses `""`. **Fix:** Normalize in `defaultValues` and schema with `.nullable().transform(v => v ?? "")`.
* **Giant monolithic schema** - One 40-field schema makes error paths hard to read. **Fix:** Compose step schemas and merge with `.merge()` for wizards, or validate per step with `.pick()`.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Zod + `zodResolver` | Default for typed RN forms shared with API layer | Single checkbox with one local `useState` |
| Yup + `yupResolver` | Team already standardized on Yup | Greenfield apps where Zod matches your fetch schemas |
| Inline `rules` on `Controller` | 1–2 trivial fields (`required: true`) | Cross-field rules or schemas reused server-side |
| Valibot / ArkType | Bundle size is the top constraint | You already share Zod schemas with the backend and web app |
| Manual `safeParse` in `onSubmit` | Prototype without RHF | Production forms needing per-field touch state and `setError` |

## FAQs

How do I install Zod and the resolver in Expo SDK 57?

```bash
npx expo install zod @hookform/resolvers react-hook-form
```

* `expo install` pins versions compatible with your lockfile.
* Import schemas from plain `.ts` files - no native module setup.

What is the difference between parse and safeParse in forms?

* `zodResolver` uses `parse` internally - validation failures become RHF field errors automatically.
* Use `safeParse` in API clients when you want to branch without throwing.
* In `onSubmit`, values are already validated - trust the type RHF passes through.

How do I validate optional fields that users leave blank?

```ts
bio: z.string().trim().max(280).optional().or(z.literal(""))
```

* Empty `TextInput` yields `""`, not `undefined`.
* Either accept `""` with `.or(z.literal(""))` or transform to `undefined`.

How do I show errors only after the user submits once?

```tsx
const { isSubmitted } = formState;
{ (isTouched || isSubmitted) && error && <Text>{error.message}</Text> }
```

* Combine `isTouched` and `isSubmitted` for a forgiving first edit, strict after submit attempt.
* `mode: "onTouched"` still validates early fields before the first submit - adjust `mode` if needed.

How do I handle numeric TextInput fields?

```ts
quantity: z.coerce.number().positive("Enter a positive number")
```

* `keyboardType="number-pad"` does not change the JS type - value is still a string until coercion.
* Empty string coerces to `NaN` - add `.min(1)` on a string step or custom error map for clearer copy.

Can I reuse the same schema for forms and API responses?

* Yes - parse API JSON with `UserSchema.parse(json)` and validate forms with `zodResolver(UserSchema)`.
* Use `.pick()` for edit forms that submit a subset of fields.
* See [Typing API Responses & Zod](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-api-responses-and-zod/) for fetch-boundary patterns.

How do I attach a refine error to a specific field?

```ts
.refine((data) => data.startDate <= data.endDate, {
  message: "End date must be after start date",
  path: ["endDate"],
})
```

* Without `path`, the error lands on the form root - invisible next to inputs.
* Multiple refines can target different `path` values.

How do I map server validation errors to fields?

```tsx
setError("email", { type: "server", message: "Email already registered" });
setFocus("email");
```

* Loop `fieldErrors` from the API response.
* Use `type: "server"` so client-side rules can coexist.

Should I use z.input or z.infer for useForm generics?

* Use `z.infer` (output type) when the schema uses `.coerce`, `.default`, or `.transform`.
* Use `z.input` when the form holds pre-transform shapes (rare on mobile).
* When unsure, `z.infer` matches what `onSubmit` receives after validation.

How do I validate a dynamic list of fields?

```ts
const InviteSchema = z.object({
  emails: z.array(z.string().email("Invalid email")).min(1, "Add at least one invite"),
});
```

* Pair with `useFieldArray` from react-hook-form.
* Zod reports array-index paths like `emails.2` - map them to the correct row in UI.

Can I localize Zod error messages?

* Pass custom strings to every constraint: `.min(8, t("password.min"))`.
* Or use `z.setErrorMap()` globally for shared message templates.
* Keep message strings in your i18n layer - Zod only stores the final string RHF displays.

What validation mode pairs best with Zod on mobile?

* `mode: "onTouched"` + `reValidateMode: "onChange"` is the usual combination.
* First blur runs Zod; subsequent edits re-validate as the user fixes mistakes.
* Avoid `onChange` for long free-text fields - it fights autocorrect and multiline typing.

How is form Zod different from API Zod?

* Form schemas accept `TextInput` strings and coerce before compare.
* API schemas validate JSON shapes from the wire - numbers may already be numbers.
* Share a core object definition, then `.extend()` or wrap with form-specific coercion at the edge.

## Related

* [react-hook-form on Mobile](https://docs.wahwei/reactnative.codeguides.io/forms-input/react-hook-form-on-mobile/) - `Controller`, focus chain, and performant field wiring
* [Forms Basics](https://docs.wahwei/reactnative.codeguides.io/forms-input/forms-basics/) - keyboard types, controlled inputs, and native focus behavior
* [Keyboard Controller](https://docs.wahwei/reactnative.codeguides.io/forms-input/keyboard-controller/) - scroll focused fields into view while editing
* [Accessibility in Forms](https://docs.wahwei/reactnative.codeguides.io/forms-input/accessibility-in-forms/) - announce errors to VoiceOver and TalkBack
* [Typing API Responses & Zod](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-api-responses-and-zod/) - validate network JSON at the same schemas
* [Forms Best Practices](https://docs.wahwei/reactnative.codeguides.io/forms-input/best-practices/) - offline submit, draft recovery, and tap-reduction patterns

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
