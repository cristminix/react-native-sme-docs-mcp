# expo-localization

Device locale, calendars, and currency formatting hooks. `expo-localization` reads native **Language & Region** settings so your app matches how users expect dates, numbers, and currency to appear - without guessing from a bare language code.

Highlights / expo-localization

* Install with npx expo install expo-localization - versions match Expo SDK 57
* getLocales() and getCalendars() are synchronous; use hooks for reactive updates
* On Android, re-read locale when AppState returns to active - users change Settings without restart
* Format money with Intl.NumberFormat - currencyCode comes from getLocales()
* textDirection from locale drives RTL - pair with I18nManager in RTL Layouts
* Store ISO dates in state; format with device separators at the display edge

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install expo-localization
```

```json
{
  "expo": {
    "plugins": ["expo-localization"]
  }
}
```

```ts
// src/i18n/deviceLocale.ts
import { getLocales, getCalendars } from "expo-localization";
 
export function readDeviceLocale() {
  const [locale] = getLocales();
  const [calendar] = getCalendars();
  return {
    languageTag: locale.languageTag,
    languageCode: locale.languageCode ?? "en",
    regionCode: locale.regionCode,
    textDirection: locale.textDirection,
    currencyCode: locale.currencyCode,
    currencySymbol: locale.currencySymbol,
    decimalSeparator: locale.decimalSeparator,
    digitGroupingSeparator: locale.digitGroupingSeparator,
    measurementSystem: locale.measurementSystem,
    temperatureUnit: locale.temperatureUnit,
    timeZone: calendar.timeZone,
    uses24hourClock: calendar.uses24hourClock,
    firstWeekday: calendar.firstWeekday,
  };
}
```

**When to reach for this:**

* First-launch locale detection before user override - see [i18n Basics](https://docs.wahwei/reactnative.codeguides.io/i18n/i18n-basics/)
* `Intl` formatters need `languageTag`, `currencyCode`, or `regionCode`
* RTL detection via `textDirection` before enabling `I18nManager` - [RTL Layouts](https://docs.wahwei/reactnative.codeguides.io/i18n/rtl-layouts/)
* Calendar-aware scheduling UI (week start, 12h vs 24h clock)
* Any screen that shows prices, distances, or temperatures localized to device region

## Working Example

### 1. `getLocales()` - Primary Language Tag

```ts
import { getLocales } from "expo-localization";
 
const [primary, ...fallbacks] = getLocales();
 
console.log(primary.languageTag); // "en-US"
console.log(primary.languageCode); // "en"
console.log(primary.regionCode); // "US"
console.log(primary.textDirection); // "ltr" | "rtl"
console.log(primary.currencyCode); // "USD"
console.log(primary.currencySymbol); // "$"
```

* **Ordered list** - first entry matches the user's top preference in OS settings
* **`languageTag`** is BCP 47 (`es-419`, `zh-Hans-CN`) - pass directly to `Intl` constructors
* Map to your app's supported set - full resolution logic in [Locale Fallbacks & Pseudolocale](https://docs.wahwei/reactnative.codeguides.io/i18n/locale-fallbacks-and-pseudolocale/)

---

### 2. `useLocales()` - Reactive Locale List

Hooks re-render when OS language settings change (common on Android without app restart).

```tsx
import { useLocales } from "expo-localization";
import { Text, View } from "react-native";
 
export function LocaleDebugBanner() {
  const [primary] = useLocales();
  return (
    <View>
      <Text>Tag: {primary.languageTag}</Text>
      <Text>Currency: {primary.currencyCode ?? "unknown"}</Text>
      <Text>Direction: {primary.textDirection}</Text>
    </View>
  );
}
```

* Prefer **`useLocales`** in components that display device-derived formatting
* Use synchronous **`getLocales`** in boot resolvers and non-React modules
* On iOS, values are stable while the app runs; Android may change mid-session

---

### 3. `getCalendars()` - Time Zone and Clock

```ts
import { getCalendars } from "expo-localization";
 
const [calendar] = getCalendars();
 
calendar.timeZone; // "America/Los_Angeles"
calendar.uses24hourClock; // true | false
calendar.firstWeekday; // 1 = Sunday … 7 = Saturday
calendar.calendar; // "gregory"
```

```tsx
import { useCalendars } from "expo-localization";
 
export function ScheduleHeader() {
  const [cal] = useCalendars();
  const hour12 = cal.uses24hourClock ? false : true;
  const label = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "numeric",
    hour12,
    timeZone: cal.timeZone ?? undefined,
  }).format(new Date());
  return <Text>{label}</Text>;
}
```

* **`undefined` locale** in `Intl` follows device settings - do not hard-code `"en-US"`
* Store **UTC/ISO** in API payloads; apply `timeZone` only at display
* Week-start UI (calendar grids) should read `firstWeekday` - not assume Monday

---

### 4. Currency Formatting

```ts
// src/i18n/formatCurrency.ts
import { getLocales } from "expo-localization";
 
export function formatCurrency(amount: number, overrideCurrency?: string) {
  const [{ languageTag, currencyCode }] = getLocales();
  const currency = overrideCurrency ?? currencyCode ?? "USD";
  return new Intl.NumberFormat(languageTag, {
    style: "currency",
    currency,
  }).format(amount);
}
```

```tsx
<Text>{formatCurrency(1299.5)}</Text>
// en-US device → "$1,299.50"
// de-DE device → "1.299,50 €" (when EUR region)
```

* **`currencyCode`** on iOS reflects Region setting; on Android it is per-locale entry
* For **fixed catalog currency** (always USD), pass `overrideCurrency` - do not rely on device region alone in commerce apps
* Pair with server-side currency rules for checkout - client formatting is display-only

---

### 5. Number Formatting With Device Separators

```ts
import { getLocales } from "expo-localization";
 
export function formatDecimal(value: number, fractionDigits = 2) {
  const [{ languageTag, decimalSeparator, digitGroupingSeparator }] = getLocales();
  const formatted = new Intl.NumberFormat(languageTag, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
 
  // Optional: assert separators match expo-localization for custom parsers
  void decimalSeparator;
  void digitGroupingSeparator;
  return formatted;
}
```

* Use **`Intl.NumberFormat`** - never manual `toFixed` + hard-coded `.` for user-facing numbers
* **Parse user input** with locale-aware helpers - reversing `formatDecimal` by splitting on `decimalSeparator`
* Form validation messages belong in i18n keys - [i18n Basics](https://docs.wahwei/reactnative.codeguides.io/i18n/i18n-basics/)

---

### 6. Android: Refresh on Foreground

Android users can change locale in Settings without killing your app. Re-read when returning to foreground.

```tsx
// src/hooks/useDeviceLocale.ts
import { useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { getLocales, type Locale } from "expo-localization";
 
export function useDeviceLocale(): Locale {
  const [locale, setLocale] = useState(() => getLocales()[0]);
 
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        setLocale(getLocales()[0]);
      }
    });
    return () => sub.remove();
  }, []);
 
  return locale;
}
```

* Compare **previous vs next `languageTag`** before reloading i18n resources
* RTL changes may still require **`I18nManager` + reload** - [RTL Layouts](https://docs.wahwei/reactnative.codeguides.io/i18n/rtl-layouts/)
* iOS typically requires restart for direction flips - document QA expectations

---

### 7. Measurement and Temperature Units

```ts
import { getLocales } from "expo-localization";
 
const [{ measurementSystem, temperatureUnit, languageTag }] = getLocales();
 
export function formatDistance(meters: number) {
  if (measurementSystem === "us" || measurementSystem === "uk") {
    const miles = meters / 1609.344;
    return `${miles.toFixed(1)} mi`;
  }
  const km = meters / 1000;
  return new Intl.NumberFormat(languageTag, { maximumFractionDigits: 1 }).format(km) + " km";
}
 
export function formatTemperature(celsius: number) {
  if (temperatureUnit === "fahrenheit") {
    const f = (celsius * 9) / 5 + 32;
    return `${Math.round(f)}°F`;
  }
  return `${Math.round(celsius)}°C`;
}
```

* **`measurementSystem`** is `null` on web - ask user preference or infer from `regionCode`
* Product policy may **override** device defaults (aviation apps always metric) - document in copy
* Keep canonical **SI units** in state/API; convert at render

---

### 8. Map Device Locale to App Locale

```ts
// src/i18n/mapDeviceToApp.ts
import { getLocales } from "expo-localization";
 
const SUPPORTED = ["en", "es", "fr", "ar"] as const;
type AppLocale = (typeof SUPPORTED)[number];
 
export function mapDeviceToAppLocale(): AppLocale {
  const tags = getLocales().map((l) => l.languageTag);
  for (const tag of tags) {
    const lang = tag.split("-")[0]?.toLowerCase();
    if (lang && (SUPPORTED as readonly string[]).includes(lang)) {
      return lang as AppLocale;
    }
  }
  return "en";
}
```

* Walk the **full preference list** - not only `getLocales()[0]` - for better fallback matching
* Region-specific variants (`pt-BR` vs `pt-PT`) need explicit mapping - [Locale Fallbacks & Pseudolocale](https://docs.wahwei/reactnative.codeguides.io/i18n/locale-fallbacks-and-pseudolocale/)
* User override in AsyncStorage still wins - [i18n Basics](https://docs.wahwei/reactnative.codeguides.io/i18n/i18n-basics/)

---

### 9. Integrate With i18next Init

```ts
// src/i18n/i18n.ts (excerpt)
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import { mapDeviceToAppLocale } from "./mapDeviceToApp";
import en from "./locales/en.json";
import es from "./locales/es.json";
 
const deviceLang = mapDeviceToAppLocale();
const [{ languageTag }] = getLocales();
 
void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es } },
  lng: deviceLang,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  // Pass full tag to Intl helpers via i18n.language or a custom formatter
});
 
export { languageTag };
```

* Initialize **once at boot** after reading saved user override
* Lazy packs per language - [i18next / react-i18next](https://docs.wahwei/reactnative.codeguides.io/i18n/i18next-react-i18next/)
* Brand-specific locale lists - [Theming & Brand Flavors](https://docs.wahwei/reactnative.codeguides.io/design-systems/theming-and-brand-flavors/)

---

### 10. Provider Component

```tsx
// src/i18n/DeviceLocaleContext.tsx
import { createContext, useContext, type ReactNode } from "react";
import { useDeviceLocale } from "@/hooks/useDeviceLocale";
import type { Locale } from "expo-localization";
 
const DeviceLocaleContext = createContext<Locale | null>(null);
 
export function DeviceLocaleProvider({ children }: { children: ReactNode }) {
  const locale = useDeviceLocale();
  return (
    <DeviceLocaleContext.Provider value={locale}>{children}</DeviceLocaleContext.Provider>
  );
}
 
export function useDeviceLocaleContext() {
  const ctx = useContext(DeviceLocaleContext);
  if (!ctx) throw new Error("useDeviceLocaleContext requires DeviceLocaleProvider");
  return ctx;
}
```

```text
expo-localization checklist:
 
✓ npx expo install expo-localization
✓ Config plugin in app.json when using CNG
✓ getLocales for boot; useLocales / AppState for live updates
✓ Intl formatters use languageTag - never hard-coded en-US
✓ textDirection consulted before RTL layout enable
✓ Currency display uses currencyCode with commerce overrides where needed
```

## Gotchas

* **Hard-coding `"en-US"` in Intl** - Breaks for EU users with English UI. **Fix:** `getLocales()[0].languageTag` or `undefined`.
* **Parsing formatted dates** - Locale strings are ambiguous. **Fix:** Store `Date` or ISO; format only for display.
* **Assuming `currencyCode` matches product currency** - Region ≠ settlement currency. **Fix:** Server-driven currency with localized formatting.
* **Skipping Android AppState refresh** - Settings change leaves stale locale until cold start. **Fix:** `useDeviceLocale` hook pattern above.
* **Web null fields** - `measurementSystem` and currency may be `null`. **Fix:** Region lookup table or explicit user preference.

## FAQs

expo-localization vs Intl alone?

`expo-localization` exposes native **region, currency, calendar, and text direction** that `Intl` does not surface consistently on mobile. Use both: expo-localization for device facts, `Intl` for formatting.

Do I need the config plugin?

For Expo SDK 57 CNG projects, add `"plugins": ["expo-localization"]` in `app.json`. Expo Go already includes the module - plugin matters for production binaries.

How does this relate to user-selected app language?

`expo-localization` reads **device** settings. App language override lives in your `LocaleProvider` and i18next `changeLanguage` - device locale is only the default on first launch.

Can I detect RTL from expo-localization?

Yes - `textDirection === "rtl"`. You still must enable RTL layout via `I18nManager` - see [RTL Layouts](https://docs.wahwei/reactnative.codeguides.io/i18n/rtl-layouts/).

## Related

* [i18n Basics](https://docs.wahwei/reactnative.codeguides.io/i18n/i18n-basics/) - externalization and boot gate
* [i18next / react-i18next](https://docs.wahwei/reactnative.codeguides.io/i18n/i18next-react-i18next/) - translation library integration
* [RTL Layouts](https://docs.wahwei/reactnative.codeguides.io/i18n/rtl-layouts/) - `I18nManager` after `textDirection`
* [Locale Fallbacks & Pseudolocale](https://docs.wahwei/reactnative.codeguides.io/i18n/locale-fallbacks-and-pseudolocale/) - mapping tags to supported locales
* [../forms-input/pickers-date-time-and-native-inputs/pickers-date-time-and-native-inputs.md](https://docs.wahwei/reactnative.codeguides.io/forms-input/pickers-date-time-and-native-inputs/) - `Intl` date formatting
* [../design-systems/theming-and-brand-flavors/theming-and-brand-flavors.md](https://docs.wahwei/reactnative.codeguides.io/design-systems/theming-and-brand-flavors/) - per-brand locale defaults
* [i18n Best Practices](https://docs.wahwei/reactnative.codeguides.io/i18n/best-practices/) - section summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
