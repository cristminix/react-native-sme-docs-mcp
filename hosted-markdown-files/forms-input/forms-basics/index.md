# Forms Basics

Controlled TextInput, focus flow, and mobile keyboard types.

Highlights / Forms Basics

* Controlled inputs store value in React state and update via onChangeText
* keyboardType picks the correct software keyboard - email, numeric, phone
* returnKeyType labels the action key - next, done, go, search
* blurOnSubmit=false keeps focus moving between fields without dismissing the keyboard
* Refs call .focus() for autofocus, error recovery, and programmatic focus chains
* onSubmitEditing wires the keyboard action key to focus the next field or submit
* keyboardShouldPersistTaps="handled" lets submit buttons work on the first tap

## Prerequisites

Every example below uses built-in React Native primitives - no form libraries. Scaffold a standard **Expo SDK 57** TypeScript app and replace `App.tsx` to run each snippet.

```bash
npx create-expo-app@latest MyFormsApp --template blank-typescript
cd MyFormsApp
npx expo start
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**.

---

## Basic Examples

### 1. Controlled TextInput

On mobile, `TextInput` is **always controlled** when you care about validation, submission, or resetting fields. Mirror web React: hold `value` in state and update it in `onChangeText`.

```tsx
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
 
export default function App() {
  const [name, setName] = useState("");
 
  return (
    <View style={styles.screen}>
      <Text style={styles.label}>Display name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Alex Chen"
        placeholderTextColor="#94a3b8"
      />
      <Text style={styles.preview}>
        {name.length === 0 ? "Type to preview" : `Hello, ${name}`}
      </Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: "#334155" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  preview: { fontSize: 15, color: "#64748b", marginTop: 4 },
});
```

* `onChangeText` receives a **string** - not a synthetic event like web `onChange`
* `value={name}` makes the native field a controlled component; omit `value` only for fully uncontrolled prototypes
* Reset a field by calling `setName("")` from a button or after successful submit
* Pair controlled state with validation libraries later - see react-hook-form and Zod guides when forms grow past a few fields

> **Related:** [react-hook-form on Mobile](https://docs.wahwei/reactnative.codeguides.io/forms-input/react-hook-form-on-mobile/) - fewer re-renders when many inputs share one screen

---

### 2. keyboardType and autoCapitalize

`keyboardType` selects the **software keyboard layout**. Combine it with `autoCapitalize` and `autoCorrect` so users get the right keys and autocorrect behavior per field.

```tsx
import { useState, type ReactNode } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
 
export default function App() {
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
 
  return (
    <View style={styles.screen}>
      <Field label="Email">
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          placeholder="you@example.com"
        />
      </Field>
 
      <Field label="Age">
        <TextInput
          style={styles.input}
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
          placeholder="25"
        />
      </Field>
 
      <Field label="Phone">
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          placeholder="(555) 010-2030"
        />
      </Field>
    </View>
  );
}
 
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: "600", color: "#334155" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
});
```

* Common `keyboardType` values: `default`, `email-address`, `numeric`, `number-pad`, `phone-pad`, `decimal-pad`, `url`
* `email-address` and `url` keyboards include `@` and `/` - still set `autoCapitalize="none"` because sentence-case defaults are annoying in those fields
* `number-pad` and `phone-pad` have **no Return key** - plan submit via an on-screen button or move focus with refs
* `textContentType` (iOS) and `autoComplete` (Android) improve password-manager and SMS autofill - expand in the password example below

> **Related:** [Pickers, Date/Time & Native Inputs](https://docs.wahwei/reactnative.codeguides.io/forms-input/pickers-date-time-and-native-inputs/) - when a native picker beats free-text entry

---

### 3. returnKeyType

`returnKeyType` relabels the keyboard's **action key** - "Next", "Done", "Go", "Search". Match the label to what actually happens when the user taps it.

```tsx
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
 
export default function App() {
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
 
  return (
    <View style={styles.screen}>
      <Text style={styles.label}>Search</Text>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
        onSubmitEditing={() => console.log("search:", query)}
        placeholder="Find articles"
      />
 
      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={note}
        onChangeText={setNote}
        multiline
        returnKeyType="default"
        blurOnSubmit={false}
        placeholder="A short bio - Return inserts a new line"
      />
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: "#334155" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  multiline: { minHeight: 96, textAlignVertical: "top" },
});
```

* Use `next` between fields in a wizard, `done` on the last single-line field, `go` when submitting to a server, `send` in chat UIs
* On **multiline** inputs, Return normally inserts a newline - keep `blurOnSubmit={false}` so the action key does not dismiss the keyboard unexpectedly
* `onSubmitEditing` fires when the user taps the action key - wire it to focus the next field or run submit logic
* Android honors `returnKeyType` inconsistently on some OEM keyboards - always provide an on-screen fallback button

> **Related:** [Multi-Step & Wizard Flows](https://docs.wahwei/reactnative.codeguides.io/forms-input/multi-step-and-wizard-flows/) - `returnKeyType="next"` across step boundaries

---

### 4. blurOnSubmit

`blurOnSubmit` controls whether tapping the action key **dismisses the keyboard** after `onSubmitEditing`. For multi-field forms, set `blurOnSubmit={false}` on every field except the last so focus can move without the keyboard collapsing.

```tsx
import { useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View, type TextInput as TextInputType } from "react-native";
 
export default function App() {
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const zipRef = useRef<TextInputType>(null);
 
  return (
    <View style={styles.screen}>
      <Text style={styles.label}>City</Text>
      <TextInput
        style={styles.input}
        value={city}
        onChangeText={setCity}
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => zipRef.current?.focus()}
        placeholder="Portland"
      />
 
      <Text style={styles.label}>ZIP code</Text>
      <TextInput
        ref={zipRef}
        style={styles.input}
        value={zip}
        onChangeText={setZip}
        keyboardType="number-pad"
        returnKeyType="done"
        blurOnSubmit
        placeholder="97201"
      />
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: "#334155" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
});
```

* Default is `true` for single-line inputs - fine for a one-field search bar, wrong for "Next" chains
* `blurOnSubmit={false}` + `onSubmitEditing` → `nextRef.focus()` is the standard **two-field pattern**
* On the **last** field, leave `blurOnSubmit` at default (`true`) or set it explicitly so Done dismisses the keyboard
* Number pads lack a Return key - `blurOnSubmit` matters less there; rely on a visible Submit button

> **Related:** [Keyboard Controller](https://docs.wahwei/reactnative.codeguides.io/forms-input/keyboard-controller/) - keep inputs visible when the keyboard is open

---

### 5. Refs and Programmatic Focus

Attach a **ref** to `TextInput` to call `.focus()`, `.blur()`, or `.clear()` imperatively. Use this for autofocus on mount, jumping to the first invalid field, or "Edit" shortcuts.

```tsx
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInput as TextInputType } from "react-native";
 
export default function App() {
  const inputRef = useRef<TextInputType>(null);
  const [code, setCode] = useState("");
 
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);
 
  return (
    <View style={styles.screen}>
      <Text style={styles.heading}>Enter verification code</Text>
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="000000"
      />
      <Pressable style={styles.button} onPress={() => inputRef.current?.focus()}>
        <Text style={styles.buttonText}>Focus input</Text>
      </Pressable>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  heading: { fontSize: 20, fontWeight: "700", color: "#0f172a" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: "center",
    backgroundColor: "#fff",
  },
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});
```

* `useRef<TextInput>(null)` - call `ref.current?.focus()` with optional chaining because the node may not be mounted yet
* Delay autofocus slightly (`setTimeout` ~300ms) after navigation transitions so the keyboard does not fight screen animations
* After validation fails, `firstErrorRef.current?.focus()` brings screen readers and sighted users to the problem field
* React 19 still passes refs to native components the same way - `ref={inputRef}` on `TextInput` is the idiomatic pattern

> **Related:** [Accessibility in Forms](https://docs.wahwei/reactnative.codeguides.io/forms-input/accessibility-in-forms/) - announcing errors and managing VoiceOver/TalkBack focus

---

### 6. Focus Chain with onSubmitEditing

Chain fields by combining **`returnKeyType="next"`**, **`blurOnSubmit={false}`**, refs, and **`onSubmitEditing`**. The keyboard's Next key should land on the logical next field every time.

```tsx
import { useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View, type TextInput as TextInputType } from "react-native";
 
export default function App() {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [company, setCompany] = useState("");
 
  const lastRef = useRef<TextInputType>(null);
  const companyRef = useRef<TextInputType>(null);
 
  return (
    <View style={styles.screen}>
      <Text style={styles.label}>First name</Text>
      <TextInput
        style={styles.input}
        value={first}
        onChangeText={setFirst}
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => lastRef.current?.focus()}
        textContentType="givenName"
        autoComplete="given-name"
        placeholder="Alex"
      />
 
      <Text style={styles.label}>Last name</Text>
      <TextInput
        ref={lastRef}
        style={styles.input}
        value={last}
        onChangeText={setLast}
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => companyRef.current?.focus()}
        textContentType="familyName"
        autoComplete="family-name"
        placeholder="Chen"
      />
 
      <Text style={styles.label}>Company</Text>
      <TextInput
        ref={companyRef}
        style={styles.input}
        value={company}
        onChangeText={setCompany}
        returnKeyType="done"
        blurOnSubmit
        textContentType="organizationName"
        placeholder="Acme Inc."
      />
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: "#334155" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
});
```

* Order refs to match **visual tab order** - do not jump randomly because it is convenient in code
* `textContentType` / `autoComplete` help OS autofill insert values without breaking your focus chain
* For the last field in a chain, switch to `returnKeyType="done"` and call your submit handler in `onSubmitEditing`
* Long forms belong in a `ScrollView` - scroll the focused field into view before calling `.focus()` on lower fields (see example 9)

> **Related:** [Forms Best Practices](https://docs.wahwei/reactnative.codeguides.io/forms-input/best-practices/) - reducing taps and preventing data loss on back navigation

---

### 7. Submit Handler

Wire an on-screen **Submit** button to validate state, call your API, and dismiss the keyboard. Use `keyboardShouldPersistTaps` on parent scrollables so the button responds on the first tap.

```tsx
import { useState } from "react";
import {
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
 
export default function App() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
 
  async function handleSubmit() {
    if (!email.includes("@")) {
      Alert.alert("Invalid email", "Enter a valid email address.");
      return;
    }
 
    setSubmitting(true);
    Keyboard.dismiss();
 
    try {
      await fakeSubscribe(email);
      Alert.alert("Subscribed", `Confirmation sent to ${email}`);
      setEmail("");
    } finally {
      setSubmitting(false);
    }
  }
 
  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Newsletter</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
        placeholder="you@example.com"
      />
      <Pressable
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.buttonText}>{submitting ? "Submitting…" : "Subscribe"}</Text>
      </Pressable>
    </ScrollView>
  );
}
 
async function fakeSubscribe(_email: string) {
  await new Promise((r) => setTimeout(r, 600));
}
 
const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12 },
  heading: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
```

* Call `Keyboard.dismiss()` at the start of submit so the keyboard does not cover success UI
* `keyboardShouldPersistTaps="handled"` lets `Pressable` receive taps **without** requiring a second tap to dismiss the keyboard first
* Disable the button and show inline loading copy while `submitting` - prevents double posts on slow networks
* Replace the inline `includes("@")` check with Zod or your API schema before shipping - see the validation guide

> **Related:** [Validation with Zod](https://docs.wahwei/reactnative.codeguides.io/forms-input/validation-with-zod/) - schema-first errors surfaced next to each field

---

## Intermediate Examples

### 8. secureTextEntry and Password Autofill

Password fields need `secureTextEntry`, sensible `textContentType` / `autoComplete`, and often a **visibility toggle** - users cannot proofread masked text.

```tsx
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
 
export default function App() {
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
 
  return (
    <View style={styles.screen}>
      <Text style={styles.label}>Password</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!visible}
          textContentType="password"
          autoComplete="password"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          placeholder="••••••••"
        />
        <Pressable
          style={styles.toggle}
          onPress={() => setVisible((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={visible ? "Hide password" : "Show password"}
        >
          <Text style={styles.toggleText}>{visible ? "Hide" : "Show"}</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>Minimum 8 characters</Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 6 },
  label: { fontSize: 14, fontWeight: "600", color: "#334155" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  toggle: { paddingHorizontal: 8, paddingVertical: 10 },
  toggleText: { color: "#2563eb", fontWeight: "600" },
  hint: { fontSize: 13, color: "#64748b" },
});
```

* `secureTextEntry` masks characters on screen and in some screenshots - still treat the value as sensitive in logs
* iOS Keychain / Android Autofill use `textContentType="password"` and `autoComplete="password"` - use `newPassword` on sign-up flows
* Toggling visibility flips `secureTextEntry` only - the state value stays the same
* Never store plaintext passwords in AsyncStorage - collect, validate, hash or tokenize server-side

> **Related:** [Accessibility in Forms](https://docs.wahwei/reactnative.codeguides.io/forms-input/accessibility-in-forms/) - labeling secure fields for assistive tech

---

### 9. ScrollView, KeyboardAvoidingView, and Taps

Full-screen forms need a **scroll container**, keyboard avoidance, and tap handling so fields near the bottom stay reachable and buttons stay tappable.

```tsx
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
 
export default function App() {
  const [subject, setSubject] = useState("");
  const [orderId, setOrderId] = useState("");
  const [details, setDetails] = useState("");
 
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.heading}>Support request</Text>
 
        <View style={styles.field}>
          <Text style={styles.label}>Subject</Text>
          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            returnKeyType="next"
            blurOnSubmit={false}
            placeholder="Brief summary"
          />
        </View>
 
        <View style={styles.field}>
          <Text style={styles.label}>Order ID</Text>
          <TextInput
            style={styles.input}
            value={orderId}
            onChangeText={setOrderId}
            returnKeyType="next"
            blurOnSubmit={false}
            placeholder="ORD-12345"
          />
        </View>
 
        <View style={styles.field}>
          <Text style={styles.label}>Details</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={details}
            onChangeText={setDetails}
            multiline
            blurOnSubmit={false}
            placeholder="What happened?"
          />
        </View>
 
        <Pressable style={styles.button} onPress={() => {}}>
          <Text style={styles.buttonText}>Send request</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
 
const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: "600", color: "#334155" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  multiline: { minHeight: 120, textAlignVertical: "top" },
  button: {
    marginTop: 8,
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
```

* `KeyboardAvoidingView` with `behavior="padding"` on iOS lifts content when the keyboard opens - tune `keyboardVerticalOffset` for your header height
* `keyboardDismissMode="on-drag"` lets users drag the scroll view to dismiss the keyboard - expected on long forms
* `keyboardShouldPersistTaps="handled"` is **required** when submit buttons sit inside the same `ScrollView` as inputs
* For pixel-perfect keyboard tracking and sticky footers, graduate to `react-native-keyboard-controller` - linked below

> **Related:** [Keyboard Controller](https://docs.wahwei/reactnative.codeguides.io/forms-input/keyboard-controller/) - `KeyboardAwareScrollView` and consistent cross-platform offsets

---

### 10. Complete Sign-In Form

This example combines **controlled inputs**, keyboard types, a **focus chain**, password masking, validation, and submit - the baseline pattern most apps extend.

```tsx
import { useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInput as TextInputType,
} from "react-native";
 
export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
 
  const passwordRef = useRef<TextInputType>(null);
 
  async function handleSignIn() {
    if (!email.includes("@")) {
      Alert.alert("Check email", "Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Check password", "Password must be at least 8 characters.");
      passwordRef.current?.focus();
      return;
    }
 
    setSubmitting(true);
    Keyboard.dismiss();
 
    try {
      await fakeSignIn(email, password);
      Alert.alert("Signed in", `Welcome back, ${email}`);
    } catch {
      Alert.alert("Sign-in failed", "Check your credentials and try again.");
    } finally {
      setSubmitting(false);
    }
  }
 
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Sign in</Text>
 
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
          autoComplete="email"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => passwordRef.current?.focus()}
          placeholder="you@example.com"
        />
 
        <Text style={styles.label}>Password</Text>
        <TextInput
          ref={passwordRef}
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
          autoComplete="password"
          returnKeyType="go"
          onSubmitEditing={handleSignIn}
          placeholder="••••••••"
        />
 
        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={submitting}
        >
          <Text style={styles.buttonText}>{submitting ? "Signing in…" : "Sign in"}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
 
async function fakeSignIn(_email: string, _password: string) {
  await new Promise((r) => setTimeout(r, 800));
}
 
const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 8, paddingBottom: 32 },
  heading: { fontSize: 28, fontWeight: "700", color: "#0f172a", marginBottom: 8 },
  label: { fontSize: 14, fontWeight: "600", color: "#334155", marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  button: {
    marginTop: 16,
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
```

* Validation failures call `passwordRef.current?.focus()` so the user lands on the field that needs attention
* `returnKeyType="next"` on email and `go` on password mirror the on-screen primary action
* `Keyboard.dismiss()` before async work avoids the keyboard reappearing under loading overlays
* Swap `Alert` for inline error text under each field - Zod + react-hook-form make that scalable across larger forms

> **Related:** [react-hook-form on Mobile](https://docs.wahwei/reactnative.codeguides.io/forms-input/react-hook-form-on-mobile/) - same UX with less manual state | [Validation with Zod](https://docs.wahwei/reactnative.codeguides.io/forms-input/validation-with-zod/) - reusable schemas for email and password rules

---

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
