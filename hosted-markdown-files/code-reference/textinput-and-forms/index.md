# TextInput and Forms

Text entry, keyboard configuration, focus management, and simple form state patterns on mobile.

Highlights / TextInput and Forms

* Controlled TextInput
* Secure Password Field
* Focus Next Field
* Switch Controlled
* Keyboard dismiss

#### Controlled TextInput

Drive `value` from state and update with `onChangeText` (string, not a DOM event).

```tsx
import { TextInput } from "react-native";
 
const [email, setEmail] = useState("");
return (
  <TextInput
    value={email}
    onChangeText={setEmail}
    autoCapitalize="none"
    keyboardType="email-address"
  />
);
```

#### Secure Password Field

`secureTextEntry` masks characters. Pair with a show/hide toggle via state.

```tsx
<TextInput
  value={password}
  onChangeText={setPassword}
  secureTextEntry={!visible}
  textContentType="password"
/>
```

#### Keyboard Types

Pick a keyboard that matches the data: `email-address`, `numeric`, `phone-pad`, `url`, and platform variants.

```tsx
<TextInput keyboardType="number-pad" value={code} onChangeText={setCode} />
```

#### returnKeyType Submit

Label the return key (`next`, `done`, `send`, `go`) so users know what happens next.

```tsx
<TextInput returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} />
```

#### Multiline TextInput

Set `multiline` for notes. Control height with styles; `textAlignVertical="top"` helps on Android.

```tsx
<TextInput
  multiline
  value={notes}
  onChangeText={setNotes}
  style={{ minHeight: 96, textAlignVertical: "top" }}
/>
```

#### Auto Capitalize Correct

Disable aggressive auto-correct for emails, codes, and usernames.

```tsx
<TextInput
  autoCapitalize="none"
  autoCorrect={false}
  autoComplete="email"
  value={email}
  onChangeText={setEmail}
/>
```

#### Focus Next Field

Hold refs to inputs and call `.focus()` from `onSubmitEditing` for multi-field forms.

```tsx
const passwordRef = useRef<TextInput>(null);
// email field:
onSubmitEditing={() => passwordRef.current?.focus()}
// password:
<TextInput ref={passwordRef} />
```

#### onSubmitEditing Form

Submit when the user hits the keyboard action on the last field.

```tsx
<TextInput
  returnKeyType="go"
  onSubmitEditing={onSubmit}
  blurOnSubmit
  value={query}
  onChangeText={setQuery}
/>
```

#### Placeholder and Selection Color

Theme placeholders and caret/selection colors for brand consistency.

```tsx
<TextInput
  placeholder="Search"
  placeholderTextColor="#9ca3af"
  selectionColor="#2563eb"
  value={q}
  onChangeText={setQ}
/>
```

#### Editable False ReadOnly

Disable editing without removing the field from layout - useful for review steps.

```tsx
<TextInput value={accountId} editable={false} selectTextOnFocus />
```

#### maxLength Counter

Cap input length and optionally show a live counter beside the field.

```tsx
const max = 120;
<TextInput maxLength={max} value={bio} onChangeText={setBio} />
<Text>{bio.length}/{max}</Text>
```

#### Switch Controlled

Boolean toggles use `value` and `onValueChange` on `Switch`.

```tsx
import { Switch } from "react-native";
 
<Switch value={enabled} onValueChange={setEnabled} />
```

#### Pressable as Checkbox

Build a custom checkbox row when design systems do not use stock controls.

```tsx
<Pressable
  onPress={() => setChecked((v) => !v)}
  accessibilityRole="checkbox"
  accessibilityState={{ checked }}
>
  <Text>{checked ? "☑" : "☐"} Agree to terms</Text>
</Pressable>
```

#### Form State Object

Group related fields when they submit together; spread previous state on each change.

```tsx
const [form, setForm] = useState({ name: "", email: "" });
const setField = (k: keyof typeof form, v: string) =>
  setForm((f) => ({ ...f, [k]: v }));
```

#### Keyboard dismiss

Dismiss the keyboard from a toolbar button or tap-outside handler.

```tsx
import { Keyboard } from "react-native";
 
function onDone() {
  Keyboard.dismiss();
  onSubmit();
}
```

## Related

* [Pressables and Touch](https://docs.wahwei/reactnative.codeguides.io/code-reference/pressables-and-touch/) - submit buttons and hit targets
* [Core Views and Text](https://docs.wahwei/reactnative.codeguides.io/code-reference/core-views-and-text/) - KeyboardAvoidingView wrappers
* [Accessibility and Safe Area](https://docs.wahwei/reactnative.codeguides.io/code-reference/accessibility-and-safe-area/) - labels for form fields

### External Related Links

* [reactnative.dev/docs](https://reactnative.dev/docs/getting-started) - full RN documentation
* [reactnative.dev](https://reactnative.dev/) - official React Native site
* [react.dev](https://react.dev/) - core React concepts RN builds on

> **Stack versions:** React 19.2.3 · React Native 0.86.0 · Expo SDK 57

Reviewed by Chris St. John·Last updated Jul 18, 2026
