# Pickers, Date/Time & Native Inputs

Platform pickers vs custom UI trade-offs.

Highlights / Pickers, Date/Time & Native Inputs

* Use @react-native-community/datetimepicker for dates and times - it renders the OS-native control
* Android pickers are modal dialogs; iOS pickers are inline spinners unless you wrap them
* @react-native-picker/picker maps to UIPickerView and Android Spinner - not a dropdown menu
* Store Date objects in state; format for display with Intl or date-fns at the edge
* Custom wheel pickers look consistent cross-platform but lose accessibility and locale behavior
* Always pair picker triggers with visible labels and accessibilityLabel on the Pressable

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install @react-native-community/datetimepicker @react-native-picker/picker
```

```tsx
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
 
export function AppointmentFields() {
  const [date, setDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [timezone, setTimezone] = useState("America/New_York");
 
  const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowDate(false);
    if (selected) setDate(selected);
  };
 
  return (
    <View>
      <Pressable
        onPress={() => setShowDate(true)}
        accessibilityRole="button"
        accessibilityLabel="Appointment date"
        accessibilityHint="Opens the date picker"
      >
        <Text>{date.toLocaleDateString()}</Text>
      </Pressable>
 
      {showDate && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onDateChange}
        />
      )}
 
      <Picker
        selectedValue={timezone}
        onValueChange={setTimezone}
        accessibilityLabel="Time zone"
      >
        <Picker.Item label="Eastern" value="America/New_York" />
        <Picker.Item label="Pacific" value="America/Los_Angeles" />
      </Picker>
    </View>
  );
}
```

**When to reach for this:** Any form field where free-text entry is error-prone - birth dates, appointment slots, country/region selection, or enumerated options with more than a handful of values.

## Working Example

```tsx
import { useCallback, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
 
type FormState = {
  date: Date;
  time: Date;
  durationMinutes: number;
};
 
const DURATIONS = [15, 30, 45, 60] as const;
 
const formatDate = (d: Date) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
 
const formatTime = (d: Date) =>
  new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
 
export function BookingForm({
  onSubmit,
}: {
  onSubmit: (value: FormState) => void;
}) {
  const [form, setForm] = useState<FormState>({
    date: new Date(),
    time: new Date(),
    durationMinutes: 30,
  });
  const [activePicker, setActivePicker] = useState<
    "date" | "time" | null
  >(null);
 
  const closePicker = useCallback(() => setActivePicker(null), []);
 
  const onPickerChange = useCallback(
    (field: "date" | "time") =>
      (_event: DateTimePickerEvent, selected?: Date) => {
        if (Platform.OS === "android") closePicker();
        if (!selected) return;
        setForm((prev) => ({ ...prev, [field]: selected }));
      },
    [closePicker],
  );
 
  const iosPicker = activePicker ? (
    <Modal transparent animationType="slide" onRequestClose={closePicker}>
      <Pressable style={styles.backdrop} onPress={closePicker} />
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Pressable onPress={closePicker} accessibilityRole="button">
            <Text style={styles.done}>Done</Text>
          </Pressable>
        </View>
        <DateTimePicker
          value={form[activePicker]}
          mode={activePicker}
          display="spinner"
          onChange={onPickerChange(activePicker)}
        />
      </View>
    </Modal>
  ) : null;
 
  const androidPicker =
    Platform.OS === "android" && activePicker ? (
      <DateTimePicker
        value={form[activePicker]}
        mode={activePicker}
        onChange={onPickerChange(activePicker)}
      />
    ) : null;
 
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Date</Text>
      <Pressable
        style={styles.field}
        onPress={() => setActivePicker("date")}
        accessibilityRole="button"
        accessibilityLabel={`Date, ${formatDate(form.date)}`}
      >
        <Text>{formatDate(form.date)}</Text>
      </Pressable>
 
      <Text style={styles.label}>Time</Text>
      <Pressable
        style={styles.field}
        onPress={() => setActivePicker("time")}
        accessibilityRole="button"
        accessibilityLabel={`Time, ${formatTime(form.time)}`}
      >
        <Text>{formatTime(form.time)}</Text>
      </Pressable>
 
      <Text style={styles.label}>Duration</Text>
      <View style={styles.pickerWrap}>
        <Picker
          selectedValue={form.durationMinutes}
          onValueChange={(durationMinutes) =>
            setForm((prev) => ({ ...prev, durationMinutes }))
          }
          accessibilityLabel="Duration"
        >
          {DURATIONS.map((m) => (
            <Picker.Item key={m} label={`${m} minutes`} value={m} />
          ))}
        </Picker>
      </View>
 
      <Pressable
        style={styles.submit}
        onPress={() => onSubmit(form)}
        accessibilityRole="button"
      >
        <Text style={styles.submitText}>Book</Text>
      </Pressable>
 
      {iosPicker}
      {androidPicker}
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151" },
  field: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    overflow: "hidden",
  },
  submit: {
    marginTop: 12,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#2563eb",
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "600" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  sheetHeader: {
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  done: { color: "#2563eb", fontWeight: "600", fontSize: 16 },
});
```

**What this demonstrates:**

* **Trigger + native picker** - visible `Pressable` fields open OS pickers instead of asking users to type dates.
* **Platform branching** - Android uses the system dialog; iOS wraps the spinner in a bottom sheet with an explicit Done action.
* **Date in state, string at the edge** - `Date` objects in React state; `Intl.DateTimeFormat` for display.
* **Enumerated duration** - `@react-native-picker/picker` for a short fixed list.
* **Accessibility labels** - each trigger announces its current value to VoiceOver/TalkBack.

## Deep Dive

### How It Works

* **Date/time pickers** delegate to `@react-native-community/datetimepicker`, which bridges to `UIDatePicker` on iOS and `DatePickerDialog` / `TimePickerDialog` on Android.
* **Value pickers** use `@react-native-picker/picker`, which renders `UIPickerView` (iOS) or `Spinner` (Android) - not an HTML-style `<select>` dropdown.
* **Android modals** - `DateTimePicker` on Android is typically shown once and dismissed on selection or cancel; you control visibility with local state.
* **iOS inline spinners** - the same component can render inline in your layout or inside a `Modal` / bottom sheet for a compact trigger pattern.
* **Locale and 12/24-hour** - the native control respects system locale and clock preference; you do not reimplement AM/PM logic unless you build a custom picker.

### Platform Display Modes

| Platform | `mode` | Common `display` | UX |
| --- | --- | --- | --- |
| iOS | `date` | `spinner`, `inline`, `compact` | Inline calendar (iOS 14+) or wheel |
| iOS | `time` | `spinner`, `compact` | Wheel or compact clock chip |
| Android | `date` | `default`, `calendar`, `spinner` | System dialog |
| Android | `time` | `default`, `clock`, `spinner` | System dialog |

On Android, prefer `default` unless design requires a specific variant. On iOS, `compact` works well in dense forms; `spinner` inside a sheet is familiar for booking flows.

### Storing and Submitting Values

```tsx
// Store native Date objects in form state
const [startsAt, setStartsAt] = useState(new Date());
 
// Serialize only at the API boundary
const payload = {
  startsAt: startsAt.toISOString(), // UTC ISO-8601
  dateOnly: startsAt.toISOString().slice(0, 10), // YYYY-MM-DD when time is irrelevant
};
 
// Parse API responses back to Date
const restored = new Date(payload.startsAt);
```

* Keep **time zones explicit** in your API contract - the picker returns a local `Date`; servers usually want UTC or an IANA zone string.
* For **date-only** fields (birthday), zero out time components before submit or use a dedicated `YYYY-MM-DD` string to avoid off-by-one bugs across zones.
* Pair with [Validation with Zod](https://docs.wahwei/reactnative.codeguides.io/forms-input/validation-with-zod/) to reject impossible dates (e.g., appointment in the past).

### TypeScript Notes

```tsx
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
 
type PickerField = "date" | "time";
 
function handleChange(
  field: PickerField,
  event: DateTimePickerEvent,
  selected?: Date,
) {
  // event.type: "set" | "dismissed" (Android)
  if (event.type === "dismissed") return;
  if (selected) {
    // narrow field-specific updates
  }
}
```

* `DateTimePickerEvent.type` distinguishes confirm vs dismiss on Android - do not update state on `dismissed`.
* `Picker.Item` `value` can be `string | number`; keep types consistent with your form schema.
* Wrap picker state in a small hook (`useDatePickerField`) so screens stay readable.

## Gotchas

* **Typing dates into TextInput** - Users enter `01/02/03` and parsers disagree on month vs day. **Fix:** Use a native or sheet picker; reserve text fields for search, not calendar entry.
* **Android picker left open** - Forgetting to set `showPicker` to `false` after `onChange` leaves an invisible modal blocking touches. **Fix:** Close on every `onChange` on Android; guard with `event.type === "dismissed"`.
* **iOS spinner without Done** - Inline iOS spinners update on every wheel tick, which can fire validation mid-gesture. **Fix:** Use a sheet with Done/Cancel; commit value only on Done.
* **Picker as a hidden dropdown** - `@react-native-picker/picker` always occupies layout height - it is not a collapsed menu. **Fix:** Use a `Pressable` trigger + modal picker pattern, or a design-system bottom sheet, for long lists.
* **Storing formatted strings in state** - Saving `"Mar 8, 2026"` makes comparisons and API mapping fragile. **Fix:** Store `Date` or ISO strings; format at render time.
* **Time zone surprises on submit** - `toISOString()` converts to UTC and can shift the calendar day. **Fix:** Send `date-fns-tz` / `Temporal` (when available) normalized values, or date-only strings for birthdays.
* **Missing accessibility on custom triggers** - Icon-only calendar buttons announce as "button" with no context. **Fix:** Set `accessibilityLabel` including the current value; add `accessibilityHint` for the action.
* **Huge Picker lists** - Rendering 200 `<Picker.Item>` rows hurts mount time and scroll performance. **Fix:** Native picker for < ~20 items; searchable modal list (`FlatList` + filter) for countries or airports.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `@react-native-community/datetimepicker` | Standard date/time; you want OS locale, accessibility, and store-review-safe UX | You need pixel-identical wheels on iOS and Android |
| `@react-native-picker/picker` | Short fixed enumerations (duration, salutation, US state) | Long searchable lists or multi-select |
| Custom wheel (`react-native-wheely`, Reanimated) | Brand-mandated cross-platform visual | You can ship native pickers - a11y and locale cost is high |
| Bottom sheet + `FlatList` | 50+ options, search, multi-select tags | Three-option enums where a native picker is faster to ship |
| `TextInput` + mask (`inputMode`, regex) | Currency, phone, postal codes - not calendar data | Dates, times, or enumerated policy fields |
| `expo-document-picker` / `expo-image-picker` | Files and media - different "native input" family | Scalar form fields |

## FAQs

Should I use native pickers or a custom bottom sheet?

* Native pickers win on accessibility, locale, and maintenance - the OS handles VoiceOver/TalkBack and 12/24-hour clocks.
* Custom sheets win when design requires identical visuals on iOS and Android or advanced features (range selection, blocked dates).
* Hybrid is common: native on phone, custom calendar grid on tablet - see [Responsive & Adaptive Layout](https://docs.wahwei/reactnative.codeguides.io/styling-layout/responsive-and-adaptive-layout/).

How do I install pickers in an Expo SDK 57 project?

* Run `npx expo install @react-native-community/datetimepicker @react-native-picker/picker` so versions match RN 0.86.
* Rebuild dev clients after adding native modules - Expo Go includes these modules; custom dev clients need a rebuild.
* Import from the package root; no manual linking in managed workflow.

Why does Android show a dialog but iOS shows a spinner?

* Each platform exposes its idiomatic control - Android `DatePickerDialog`, iOS `UIDatePicker`.
* You normalize the UX in your layer with triggers, sheets, and Done buttons - do not fight the underlying widget.
* `display="compact"` on iOS 14+ yields a tappable chip that expands inline - good for dense settings screens.

How do I pick both date and time for one appointment?

* Use two fields with `mode="date"` and `mode="time"`, then merge into one `Date` before submit.
* Alternatively, pick date first, then time in a second step - clearer for thumb reach on small phones.
* Validate the combined instant is in the future with Zod `refine` on the merged value.

What is the difference between datetimepicker and Picker?

* `datetimepicker` is for calendar clock values - returns a `Date` through `onChange`.
* `Picker` is for choosing among discrete string/number options - think duration, category, prefix.
* Do not use `Picker` for dates; do not use `datetimepicker` for enum lists.

How do I disable past dates or weekends?

* `@react-native-community/datetimepicker` supports `minimumDate` and `maximumDate` props on both platforms.
* Blocking arbitrary weekdays (e.g., no Sundays) is not built in - validate on submit or use a custom calendar.
* Document blocked rules in inline helper text so users understand why a day is rejected.

How do pickers interact with react-hook-form?

* Register a `Controller` whose `render` wraps your trigger + picker; call `field.onChange(date)` when the user confirms.
* Use `value={field.value ?? new Date()}` and validate with Zod `z.coerce.date()` or `z.date()`.
* See [react-hook-form on Mobile](https://docs.wahwei/reactnative.codeguides.io/forms-input/react-hook-form-on-mobile/) for `Controller` patterns that avoid re-renders.

Can I show a picker inline without a Pressable trigger?

* Yes on iOS - render `DateTimePicker` with `display="inline"` directly in the form.
* Android still prefers dialog mode for date/time - inline calendar is iOS-biased.
* Inline pickers consume vertical space; pair with [Keyboard Controller](https://docs.wahwei/reactnative.codeguides.io/forms-input/keyboard-controller/) so fields above are not obscured.

How do I format dates for US vs EU users?

* Use `Intl.DateTimeFormat(undefined, options)` - `undefined` locale follows the device setting.
* Store ISO or epoch in state/API; never persist locale-formatted strings.
* For i18n-heavy apps, centralize format helpers - see the i18n section when those articles ship.

What about pickers in dark mode?

* Native pickers follow system appearance automatically.
* Custom trigger borders and sheet backgrounds need theme tokens - see [Dark Mode & Color Schemes](https://docs.wahwei/reactnative.codeguides.io/styling-layout/dark-mode-and-color-schemes/).
* Test compact iOS chips in both schemes - contrast on `surface` containers matters.

Do pickers work inside a ScrollView?

* Inline iOS spinners inside `ScrollView` can cause gesture conflicts - nest carefully or use modal presentation.
* Android dialogs are outside the scroll tree - no conflict.
* For long forms, dismiss the keyboard before opening pickers so layout does not jump.

How do I test pickers in Jest?

* Mock `@react-native-community/datetimepicker` to a `Pressable` that calls `onChange` with a fixed date.
* Mock `Picker` as a `View` that exposes `onValueChange` via `testID`.
* Assert your trigger `accessibilityLabel` and submitted ISO string - not native wheel semantics.

## Related

* [Forms Basics](https://docs.wahwei/reactnative.codeguides.io/forms-input/forms-basics/) - controlled `TextInput`, focus order, and `keyboardType`
* [react-hook-form on Mobile](https://docs.wahwei/reactnative.codeguides.io/forms-input/react-hook-form-on-mobile/) - `Controller` wiring with minimal re-renders
* [Validation with Zod](https://docs.wahwei/reactnative.codeguides.io/forms-input/validation-with-zod/) - `z.date()`, ranges, and inline error copy
* [Keyboard Controller](https://docs.wahwei/reactnative.codeguides.io/forms-input/keyboard-controller/) - keeping inputs visible when pickers and keyboard compete for space
* [Accessibility in Forms](https://docs.wahwei/reactnative.codeguides.io/forms-input/accessibility-in-forms/) - labels, error announcements, and focus after picker dismiss
* [Multi-Step & Wizard Flows](https://docs.wahwei/reactnative.codeguides.io/forms-input/multi-step-and-wizard-flows/) - date fields spread across steps with draft persistence
* [Event Handling & Touchables](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/event-handling-and-touchables/) - `Pressable` patterns for picker triggers

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
