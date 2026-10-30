# i18n Basics

10 examples to get you started with internationalization in Expo SDK 57 - string externalization, locale detection on first launch, and a minimal provider you can grow into i18next later.

Highlights / i18n Basics

* Externalize every user-visible string - literals in JSX block translation and RTL QA
* Resolve locale once at boot: device default from expo-localization, user override from storage
* Use BCP 47 language tags (en-US, es-419) - not bare language codes alone
* Store message keys, not concatenated sentence fragments
* Gate first paint until locale is known - avoid English flash on Arabic devices
* Pair locale with textDirection for layout - see RTL Layouts

## Prerequisites

Scaffold a production-shaped Expo app with an explicit SDK 57 pin. These examples assume Expo Router, TypeScript, and `expo-localization` for the device default.

```bash
npx create-expo-app@latest MyApp --template default@sdk-57
cd MyApp
npm install
```

```bash
npx expo install expo-localization @react-native-async-storage/async-storage
```

```json
{
  "dependencies": {
    "expo": "~57.0.4",
    "react": "19.2.3",
    "react-native": "0.86.0"
  }
}
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**.

---

## Basic Examples

### 1. String Externalization: No Literals in JSX

Every user-visible string belongs in translation files - not inline in components. Literals block translators, break plural rules, and make RTL truncation QA impossible.

```tsx
// ❌ Blocks i18n
<Text>Welcome back, {name}</Text>
 
// ✅ Key resolves at render time
<Text>{t("home.welcome", { name })}</Text>
```

```json
// src/i18n/locales/en/common.json
{
  "home": {
    "welcome": "Welcome back, {{name}}"
  }
}
```

* **One key per complete phrase** - never split `"Welcome back,"` and `name` into separate lookups
* **Interpolation tokens** (`{{name}}`) stay in the translation file so word order can change per language
* Start with a `common` namespace; split by feature (`auth`, `settings`) as the catalog grows

> **Related:** [i18n Best Practices](https://docs.wahwei/reactnative.codeguides.io/i18n/best-practices/) - never concatenate sentences

---

### 2. Translation File Layout

Keep locale files parallel - same keys in every language. Missing keys should fail CI, not silently render English in production.

```text
src/i18n/
  locales/
    en/
      common.json
      auth.json
    es/
      common.json
      auth.json
    ar/
      common.json
      auth.json
  resolveLocale.ts
  LocaleProvider.tsx
  useT.ts
```

```json
// src/i18n/locales/es/common.json
{
  "home": {
    "welcome": "Bienvenido de nuevo, {{name}}"
  },
  "actions": {
    "save": "Guardar",
    "cancel": "Cancelar"
  }
}
```

* **Mirror structure** across locales - translators diff by key, not by folder shape
* **JSON over TS** for copy files so non-engineers and TMS tools can edit without builds
* Version keys with namespaces when you adopt i18next - see [i18next / react-i18next](https://docs.wahwei/reactnative.codeguides.io/i18n/i18next-react-i18next/)

---

### 3. Minimal `t()` Lookup

Before adding i18next, a 20-line resolver proves the externalization pattern and unblocks locale switching in Context.

```ts
// src/i18n/useT.ts
import { useLocale } from "./LocaleProvider";
import enCommon from "./locales/en/common.json";
import esCommon from "./locales/es/common.json";
import arCommon from "./locales/ar/common.json";
 
const catalogs: Record<string, Record<string, unknown>> = {
  en: enCommon,
  es: esCommon,
  ar: arCommon,
};
 
function getNested(obj: Record<string, unknown>, path: string): string | undefined {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as object)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj) as string | undefined;
}
 
export function useT(namespace = "common") {
  const { locale } = useLocale();
  const table = catalogs[locale] ?? catalogs.en;
 
  return function t(key: string, vars?: Record<string, string | number>) {
    const template = getNested(table as Record<string, unknown>, key) ?? key;
    if (!vars) return template;
    return Object.entries(vars).reduce(
      (out, [k, v]) => out.replaceAll(`{{${k}}}`, String(v)),
      template,
    );
  };
}
```

* **Fallback to key name** in dev surfaces missing translations immediately
* Replace this helper with i18next once you need plurals, lazy packs, or ICU - see [i18next / react-i18next](https://docs.wahwei/reactnative.codeguides.io/i18n/i18next-react-i18next/)
* Keep `useT` as the component boundary - never import JSON directly in screens

---

### 4. Device Locale on First Launch

Use `expo-localization` synchronously at boot to read the user's preferred `languageTag`. Map it to a supported app locale.

```ts
// src/i18n/resolveLocale.ts
import { getLocales } from "expo-localization";
 
export const SUPPORTED_LOCALES = ["en", "es", "ar"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
 
export function resolveDeviceLocale(): AppLocale {
  const [primary] = getLocales();
  const tag = primary?.languageTag ?? "en-US";
  const language = tag.split("-")[0]?.toLowerCase() ?? "en";
  return (SUPPORTED_LOCALES as readonly string[]).includes(language)
    ? (language as AppLocale)
    : "en";
}
```

```ts
// src/i18n/localeStorage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppLocale } from "./resolveLocale";
 
const KEY = "user:locale:v1";
 
export async function loadSavedLocale(): Promise<AppLocale | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  return raw as AppLocale;
}
 
export async function saveLocale(locale: AppLocale) {
  await AsyncStorage.setItem(KEY, locale);
}
```

* **`getLocales()`** returns the user's ordered preference list - first entry is the default
* **Map to supported set** - do not ship 40 JSON files on day one; fall back to `en` gracefully
* Full device API surface - see [expo-localization](https://docs.wahwei/reactnative.codeguides.io/i18n/expo-localization/)

---

### 5. Boot Gate: Avoid Locale Flash

Resolve saved override + device default before rendering navigation. A null splash prevents English copy flashing on Arabic devices.

```tsx
// src/i18n/LocaleProvider.tsx
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadSavedLocale, saveLocale } from "./localeStorage";
import { resolveDeviceLocale, type AppLocale } from "./resolveLocale";
 
type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (next: AppLocale) => Promise<void>;
  isReady: boolean;
};
 
const LocaleContext = createContext<LocaleContextValue | null>(null);
 
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>("en");
  const [isReady, setIsReady] = useState(false);
 
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadSavedLocale();
      if (!cancelled) {
        setLocaleState(saved ?? resolveDeviceLocale());
        setIsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
 
  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      isReady,
      setLocale: async (next) => {
        setLocaleState(next);
        await saveLocale(next);
      },
    }),
    [locale, isReady],
  );
 
  if (!isReady) return null;
 
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
 
export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
```

```tsx
// app/_layout.tsx (excerpt)
import { LocaleProvider } from "@/i18n/LocaleProvider";
 
export default function RootLayout() {
  return (
    <LocaleProvider>
      <Stack />
    </LocaleProvider>
  );
}
```

* **`isReady` gate** - return `null` or a branded splash until locale resolves
* **User override wins** over device default - settings screen calls `setLocale`
* Locale in Context is low-churn - see [Context Without Storms](https://docs.wahwei/reactnative.codeguides.io/state-management/context-without-storms/)

---

### 6. Settings Screen: User Locale Override

Expose supported languages in settings. Persist immediately so the choice survives reinstall only if you also sync to the server.

```tsx
// src/features/settings/LanguagePicker.tsx
import { Pressable, Text, View } from "react-native";
import { useLocale } from "@/i18n/LocaleProvider";
import { SUPPORTED_LOCALES, type AppLocale } from "@/i18n/resolveLocale";
import { useT } from "@/i18n/useT";
 
const LABELS: Record<AppLocale, string> = {
  en: "English",
  es: "Español",
  ar: "العربية",
};
 
export function LanguagePicker() {
  const { locale, setLocale } = useLocale();
  const t = useT();
 
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={t("settings.language")}>
      {SUPPORTED_LOCALES.map((code) => (
        <Pressable
          key={code}
          accessibilityRole="radio"
          accessibilityState={{ selected: locale === code }}
          onPress={() => setLocale(code)}
        >
          <Text>{LABELS[code]}</Text>
        </Pressable>
      ))}
    </View>
  );
}
```

* **Native language names** (`Español`, not "Spanish") - users recognize their language faster
* Changing locale may require **RTL relayout** - see [RTL Layouts](https://docs.wahwei/reactnative.codeguides.io/i18n/rtl-layouts/)
* White-label apps may ship different locale lists per brand - [Theming & Brand Flavors](https://docs.wahwei/reactnative.codeguides.io/design-systems/theming-and-brand-flavors/)

---

### 7. Interpolation and Variables

Pass dynamic values as a vars object - never template literals around translated fragments.

```tsx
// src/components/OrderSummary.tsx
import { Text } from "react-native";
import { useT } from "@/i18n/useT";
 
export function OrderSummary({ itemCount, total }: { itemCount: number; total: number }) {
  const t = useT();
  return (
    <Text>
      {t("cart.summary", { count: itemCount, total: total.toFixed(2) })}
    </Text>
  );
}
```

```json
{
  "cart": {
    "summary": "{{count}} items - {{total}} total"
  }
}
```

```json
// es - word order changes
{
  "cart": {
    "summary": "{{count}} artículos - total {{total}}"
  }
}
```

* **Format numbers and dates at the edge** with `Intl` - pass already-formatted strings only when the phrase demands it
* For real plural rules (`1 item` vs `5 items`), graduate to i18next - see [i18next / react-i18next](https://docs.wahwei/reactnative.codeguides.io/i18n/i18next-react-i18next/)
* Error mappers should return **keys**, not literals - [User-Facing Error Copy](https://docs.wahwei/reactnative.codeguides.io/error-resilience/user-facing-error-copy/)

---

### 8. Context-Aware Keys

Same English word, different translations - use distinct keys per UI context. Translators need semantic hints, not homographs.

```json
{
  "actions": {
    "close_dialog": "Close",
    "close_account": "Close account"
  },
  "status": {
    "pending": "Pending approval",
    "order_pending": "Order pending"
  }
}
```

```tsx
<Text>{t("actions.close_dialog")}</Text>
<Text>{t("actions.close_account")}</Text>
```

* **Never reuse** `t("close")` for both a dialog button and account deletion
* Add `_verb`, `_noun`, or screen prefix when English collides
* TMS tools export keys - ambiguous IDs waste translator time and cause wrong UI copy

---

### 9. Type-Safe Translation Keys (Optional)

As catalogs grow, constrain keys with TypeScript so typos fail at compile time.

```ts
// src/i18n/keys.ts
import type enCommon from "./locales/en/common.json";
 
type NestedKeyOf<T, P extends string = ""> = T extends string
  ? P extends ""
    ? never
    : P
  : {
      [K in keyof T & string]: NestedKeyOf<T[K], P extends "" ? K : `${P}.${K}`>;
    }[keyof T & string];
 
export type CommonKey = NestedKeyOf<typeof enCommon>;
```

```ts
// useT.ts (excerpt) - overload for common namespace
export function useT(): (key: CommonKey, vars?: Record<string, string | number>) => string;
```

* **Generate keys** from source JSON in CI when catalogs exceed ~200 entries - see [Translation CI](https://docs.wahwei/reactnative.codeguides.io/i18n/translation-ci/)
* i18next provides `CustomTypeOptions` for the same guarantee at scale
* Start untyped for prototypes; add types before v1 multilingual ship

---

### 10. End-to-End Screen With Locale

Tie provider, lookup, and device default into one home screen teams can copy.

```tsx
// src/features/home/HomeScreen.tsx
import { Text, View } from "react-native";
import { useLocale } from "@/i18n/LocaleProvider";
import { useT } from "@/i18n/useT";
import { LanguagePicker } from "@/features/settings/LanguagePicker";
 
export function HomeScreen({ userName }: { userName: string }) {
  const { locale } = useLocale();
  const t = useT();
 
  return (
    <View style={{ padding: 16 }}>
      <Text accessibilityRole="header">{t("home.welcome", { name: userName })}</Text>
      <Text>{t("home.current_locale", { locale })}</Text>
      <LanguagePicker />
    </View>
  );
}
```

```json
// en/common.json (excerpt)
{
  "home": {
    "welcome": "Welcome back, {{name}}",
    "current_locale": "App language: {{locale}}"
  },
  "settings": {
    "language": "Language"
  }
}
```

```text
i18n boot checklist:
 
✓ expo-localization installed (npx expo install expo-localization)
✓ LocaleProvider gates root layout until storage + device resolve
✓ No user-visible literals in feature components
✓ User override persisted in AsyncStorage
✓ RTL direction wired when locale is ar/he - see RTL Layouts
✓ CI verifies keys across locales before release - see Translation CI
```

* Promote to **i18next** when you need namespaces, lazy packs, or plurals
* Pair with **brand flavors** for per-tenant locale lists - [Theming & Brand Flavors](https://docs.wahwei/reactnative.codeguides.io/design-systems/theming-and-brand-flavors/)
* Summary rules - [i18n Best Practices](https://docs.wahwei/reactnative.codeguides.io/i18n/best-practices/)

> **Related:** [expo-localization](https://docs.wahwei/reactnative.codeguides.io/i18n/expo-localization/) - device locale API | [i18next / react-i18next](https://docs.wahwei/reactnative.codeguides.io/i18n/i18next-react-i18next/) - production library

---

## FAQs

When should I adopt i18next instead of a minimal t() helper?

When you need plural rules, ICU formatting, lazy-loaded language packs, or translator workflows with namespaces. The minimal helper in this page is enough for 2–3 locales and <100 keys.

Should locale live in Context or Zustand?

Context is fine - locale changes rarely and should not re-render list rows. Split locale from high-churn session state - see [Context Without Storms](https://docs.wahwei/reactnative.codeguides.io/state-management/context-without-storms/).

Do I need separate builds per language?

No for most Expo apps - ship all locale JSON in the bundle or lazy-load packs. White-label **brand flavors** may vary supported locales per tenant without forking code - see [Theming & Brand Flavors](https://docs.wahwei/reactnative.codeguides.io/design-systems/theming-and-brand-flavors/).

How do I test locale on simulators?

Change **Settings → General → Language & Region** on iOS or **Settings → System → Languages** on Android. For RTL, add Arabic or Hebrew and verify layout - [RTL Layouts](https://docs.wahwei/reactnative.codeguides.io/i18n/rtl-layouts/).

What about Expo Router route titles?

Resolve titles with `useT()` inside screen components or `Stack.Screen` `options` callbacks - do not hard-code `title: "Home"` in layout files.

## Related

* [expo-localization](https://docs.wahwei/reactnative.codeguides.io/i18n/expo-localization/) - `getLocales`, calendars, currency hooks
* [i18next / react-i18next](https://docs.wahwei/reactnative.codeguides.io/i18n/i18next-react-i18next/) - namespaces, plurals, lazy packs
* [RTL Layouts](https://docs.wahwei/reactnative.codeguides.io/i18n/rtl-layouts/) - `I18nManager` and mirrored icons
* [Locale Fallbacks & Pseudolocale](https://docs.wahwei/reactnative.codeguides.io/i18n/locale-fallbacks-and-pseudolocale/) - fallback chains and truncation QA
* [Translation CI](https://docs.wahwei/reactnative.codeguides.io/i18n/translation-ci/) - extract, upload, verify in pipeline
* [i18n Best Practices](https://docs.wahwei/reactnative.codeguides.io/i18n/best-practices/) - section summary
* [../design-systems/theming-and-brand-flavors/theming-and-brand-flavors.md](https://docs.wahwei/reactnative.codeguides.io/design-systems/theming-and-brand-flavors/) - per-brand locale lists
* [../state-management/context-without-storms/context-without-storms.md](https://docs.wahwei/reactnative.codeguides.io/state-management/context-without-storms/) - locale in Context
* [../error-resilience/user-facing-error-copy/user-facing-error-copy.md](https://docs.wahwei/reactnative.codeguides.io/error-resilience/user-facing-error-copy/) - error message keys

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
