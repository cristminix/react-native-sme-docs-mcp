# i18next / react-i18next

Namespaces, plurals, and lazy-loaded language packs. **i18next** is the de facto translation engine for React Native; **react-i18next** wires it to hooks and suspense-friendly loading. Use it when catalogs exceed ~100 keys or you need proper plural rules and translator workflows.

Highlights / i18next / react-i18next

* i18next scales past hand-rolled t() - plurals, contexts, and lazy language packs
* Split namespaces by feature (common, auth, billing) - not one giant JSON file
* react-i18next useTranslation(ns) loads only the namespaces a screen needs
* Lazy-import locale JSON in changeLanguage to keep startup bundle small
* Disable escapeValue in RN - React already escapes Text children
* Pair init locale with expo-localization device default and AsyncStorage override

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install expo-localization
npm install i18next react-i18next
```

```ts
// src/i18n/i18n.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { mapDeviceToAppLocale } from "./mapDeviceToApp";
import enCommon from "./locales/en/common.json";
import esCommon from "./locales/es/common.json";
 
void i18n.use(initReactI18next).init({
  resources: {
    en: { common: enCommon },
    es: { common: esCommon },
  },
  lng: mapDeviceToAppLocale(),
  fallbackLng: "en",
  defaultNS: "common",
  ns: ["common"],
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
  compatibilityJSON: "v4",
});
 
export default i18n;
```

```tsx
// app/_layout.tsx (excerpt)
import "@/i18n/i18n";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n/i18n";
 
export default function RootLayout() {
  return (
    <I18nextProvider i18n={i18n}>
      <Stack />
    </I18nextProvider>
  );
}
```

```tsx
import { useTranslation } from "react-i18next";
 
export function SaveButton() {
  const { t } = useTranslation("common");
  return <Button title={t("actions.save")} />;
}
```

**When to reach for this:**

* More than one locale with **plural**, **gender**, or **context** variants
* Feature teams own separate copy files (**namespaces**)
* You want **lazy language packs** - ship `en` in the main bundle, download `ja` on demand
* Translators export/import via TMS keyed by namespace - see [Translation CI](https://docs.wahwei/reactnative.codeguides.io/i18n/translation-ci/)
* You have graduated from the minimal `t()` in [i18n Basics](https://docs.wahwei/reactnative.codeguides.io/i18n/i18n-basics/)

## Working Example

### 1. Namespace Layout

```text
src/i18n/locales/
  en/
    common.json
    auth.json
    billing.json
  es/
    common.json
    auth.json
    billing.json
```

```json
// en/auth.json
{
  "sign_in": "Sign in",
  "sign_out": "Sign out",
  "errors": {
    "invalid_email": "Enter a valid email address"
  }
}
```

```tsx
// src/features/auth/SignInScreen.tsx
import { useTranslation } from "react-i18next";
 
export function SignInScreen() {
  const { t } = useTranslation("auth");
  return <Text>{t("sign_in")}</Text>;
}
```

* **`useTranslation("auth")`** loads only the `auth` namespace for that screen
* Preload multiple namespaces: `useTranslation(["auth", "common"])`
* Keep **shared chrome** (`actions.save`) in `common` - feature-specific copy in feature namespaces

---

### 2. Register Multiple Namespaces at Init

```ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enCommon from "./locales/en/common.json";
import enAuth from "./locales/en/auth.json";
import esCommon from "./locales/es/common.json";
import esAuth from "./locales/es/auth.json";
 
void i18n.use(initReactI18next).init({
  resources: {
    en: { common: enCommon, auth: enAuth },
    es: { common: esCommon, auth: esAuth },
  },
  lng: "en",
  fallbackLng: "en",
  defaultNS: "common",
  ns: ["common", "auth"],
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
  compatibilityJSON: "v4",
});
```

* **`ns` array** declares known namespaces - `loadNamespaces` can add more at runtime
* **`defaultNS`** avoids repeating `"common"` in every `t("save")` call
* **`compatibilityJSON: "v4"`** - required for plural rules on modern i18next

---

### 3. Plural Keys

```json
// en/billing.json
{
  "invoice_count_one": "{{count}} invoice",
  "invoice_count_other": "{{count}} invoices"
}
```

```tsx
const { t } = useTranslation("billing");
<Text>{t("invoice_count", { count: items.length })}</Text>
```

i18next resolves `_one` / `_other` (and `_zero` where needed) from the `count` option.

```json
// ar/billing.json - Arabic has complex plural rules; i18next handles forms
{
  "invoice_count_zero": "لا توجد فواتير",
  "invoice_count_one": "فاتورة واحدة",
  "invoice_count_two": "فاتورتان",
  "invoice_count_few": "{{count}} فواتير",
  "invoice_count_many": "{{count}} فاتورة",
  "invoice_count_other": "{{count}} فاتورة"
}
```

* **Never branch in JSX** (`count === 1 ? ... : ...`) for translatable plurals
* Verify plural forms with native speakers - [Translation CI](https://docs.wahwei/reactnative.codeguides.io/i18n/translation-ci/) can lint required suffixes
* ICU format is available via `i18next-icu` when TMS exports ICU strings

---

### 4. Context Variants

```json
{
  "status": "Open",
  "status_male": "Open",
  "status_female": "Open",
  "friend": "Friend",
  "friend_male": "Friend",
  "friend_female": "Friend"
}
```

```tsx
t("friend", { context: "female" }); // resolves friend_female when present
```

* Use **context** for gendered languages and disambiguation - cleaner than separate key trees
* Prefer explicit keys (`close_dialog`) when context is unclear to translators - [i18n Basics](https://docs.wahwei/reactnative.codeguides.io/i18n/i18n-basics/)

---

### 5. Lazy Language Packs

Keep English in the main bundle; dynamically import other locales when the user switches language or on first need.

```ts
// src/i18n/loadLanguage.ts
import i18n from "./i18n";
 
const loaders: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  es: () => import("./locales/es/common.json"),
  ja: () => import("./locales/ja/common.json"),
  ar: () => import("./locales/ar/common.json"),
};
 
export async function ensureLanguage(lang: string) {
  if (i18n.hasResourceBundle(lang, "common")) return;
  const load = loaders[lang];
  if (!load) return;
  const bundle = await load();
  i18n.addResourceBundle(lang, "common", bundle.default, true, true);
}
 
export async function changeAppLanguage(lang: string) {
  await ensureLanguage(lang);
  await i18n.changeLanguage(lang);
}
```

```tsx
// LanguagePicker with lazy load
import { changeAppLanguage } from "@/i18n/loadLanguage";
 
<Pressable onPress={() => void changeAppLanguage("ja")}>
  <Text>日本語</Text>
</Pressable>
```

* **`addResourceBundle`** merges without replacing existing keys when last arg is `true`
* Show a **loading state** during import - language packs can be 50–200 KB each
* Preload likely locale on Wi‑Fi after onboarding - optional `InteractionManager` task

---

### 6. Lazy Namespaces Per Screen

```ts
import i18n from "@/i18n/i18n";
 
export async function preloadNamespaces(lang: string, namespaces: string[]) {
  await Promise.all(
    namespaces.map(async (ns) => {
      if (i18n.hasResourceBundle(lang, ns)) return;
      const mod = await import(`./locales/${lang}/${ns}.json`);
      i18n.addResourceBundle(lang, ns, mod.default, true, true);
    }),
  );
}
```

```tsx
// src/features/billing/BillingScreen.tsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { preloadNamespaces } from "@/i18n/loadNamespaces";
 
export function BillingScreen() {
  const { i18n, t } = useTranslation("billing");
  const [ready, setReady] = useState(i18n.hasResourceBundle(i18n.language, "billing"));
 
  useEffect(() => {
    void preloadNamespaces(i18n.language, ["billing"]).then(() => setReady(true));
  }, [i18n.language]);
 
  if (!ready) return <ActivityIndicator />;
  return <Text>{t("title")}</Text>;
}
```

* Split **billing**, **settings**, and **onboarding** namespaces for code-splitting
* Expo Router screens can preload in `useFocusEffect` before paint
* Missing namespace shows key string - fail in CI instead - [Translation CI](https://docs.wahwei/reactnative.codeguides.io/i18n/translation-ci/)

---

### 7. Persist User Language Choice

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "./i18n";
import { changeAppLanguage } from "./loadLanguage";
import { mapDeviceToAppLocale } from "./mapDeviceToApp";
 
const KEY = "user:locale:v1";
 
export async function initI18n() {
  const saved = await AsyncStorage.getItem(KEY);
  const lang = saved ?? mapDeviceToAppLocale();
  await changeAppLanguage(lang);
  await i18n.changeLanguage(lang);
}
 
export async function setAppLanguage(lang: string) {
  await changeAppLanguage(lang);
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem(KEY, lang);
}
```

```tsx
// app/_layout.tsx
const [ready, setReady] = useState(false);
useEffect(() => {
  void initI18n().then(() => setReady(true));
}, []);
if (!ready) return null;
```

* Call **`initI18n` before** rendering localized navigation - same boot gate as [i18n Basics](https://docs.wahwei/reactnative.codeguides.io/i18n/i18n-basics/)
* Device locale from [expo-localization](https://docs.wahwei/reactnative.codeguides.io/i18n/expo-localization/) is the default when no save exists

---

### 8. Type-Safe Keys

```ts
// src/i18n/i18next.d.ts
import "i18next";
import type common from "./locales/en/common.json";
import type auth from "./locales/en/auth.json";
 
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: {
      common: typeof common;
      auth: typeof auth;
    };
  }
}
```

```tsx
const { t } = useTranslation("common");
t("actions.save"); // autocomplete + typo errors
```

* Regenerate or verify types in **Translation CI** when English source changes
* English JSON is the **source of truth** for key shapes

---

### 9. RTL Language Change

```ts
import { I18nManager } from "react-native";
import * as Updates from "expo-updates";
import { setAppLanguage } from "./persistLanguage";
 
export async function setAppLanguageWithRtl(lang: string) {
  const isRtl = lang === "ar" || lang === "he";
  if (I18nManager.isRTL !== isRtl) {
    I18nManager.allowRTL(isRtl);
    I18nManager.forceRTL(isRtl);
    await setAppLanguage(lang);
    await Updates.reloadAsync();
    return;
  }
  await setAppLanguage(lang);
}
```

* RTL flips require **native reload** - see [RTL Layouts](https://docs.wahwei/reactnative.codeguides.io/i18n/rtl-layouts/)
* `expo-updates` `reloadAsync` works in dev client and production updates

---

### 10. Testing With react-i18next

```tsx
// __tests__/SignInScreen.test.tsx
import { render, screen } from "@testing-library/react-native";
import i18n from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { SignInScreen } from "../SignInScreen";
import enAuth from "@/i18n/locales/en/auth.json";
 
beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: "en",
    resources: { en: { auth: enAuth } },
    interpolation: { escapeValue: false },
  });
});
 
test("renders sign in label", () => {
  render(
    <I18nextProvider i18n={i18n}>
      <SignInScreen />
    </I18nextProvider>,
  );
  expect(screen.getByText("Sign in")).toBeOnTheScreen();
});
```

* Use **`testID`** in Detox for cross-locale E2E - [Detox E2E](https://docs.wahwei/reactnative.codeguides.io/testing/detox-e2e/)
* Mock `changeLanguage` in unit tests - integration tests load real JSON bundles

## Gotchas

* **`escapeValue: true` (default)** - Breaks apostrophes in RN `Text`. **Fix:** `escapeValue: false` - React escapes.
* **`useSuspense: true` on RN** - Suspense boundaries are awkward without React 19 streaming. **Fix:** `useSuspense: false` until you add explicit fallbacks.
* **Eager import of all locales** - Bloates startup. **Fix:** Lazy `import()` per language in `changeAppLanguage`.
* **Single `translation` namespace forever** - Merge conflicts and slow TMS sync. **Fix:** Feature namespaces early.
* **Concatenated `t()` calls** - Invalid in gendered languages. **Fix:** One key per sentence with interpolation.

## FAQs

i18next vs react-intl vs lingui?

All work on RN. **i18next** has the largest RN community, simple JSON namespaces, and lazy loading. Pick one library per app - do not mix formatters.

How do I extract keys for translators?

Use `i18next-parser` in CI - [Translation CI](https://docs.wahwei/reactnative.codeguides.io/i18n/translation-ci/). English files are usually the source locale uploaded to Crowdin/Lokalise.

Does i18next work with Expo Router headers?

Yes - `useTranslation` in screen components; for `Stack.Screen` options use a child layout or `navigation.setOptions` in `useEffect`.

What about fallback when Japanese pack fails to load?

Configure `fallbackLng: "en"` and `partialBundledLanguages: true`. See [Locale Fallbacks & Pseudolocale](https://docs.wahwei/reactnative.codeguides.io/i18n/locale-fallbacks-and-pseudolocale/).

## Related

* [i18n Basics](https://docs.wahwei/reactnative.codeguides.io/i18n/i18n-basics/) - externalization and boot gate
* [expo-localization](https://docs.wahwei/reactnative.codeguides.io/i18n/expo-localization/) - device default locale
* [RTL Layouts](https://docs.wahwei/reactnative.codeguides.io/i18n/rtl-layouts/) - direction flip on language change
* [Locale Fallbacks & Pseudolocale](https://docs.wahwei/reactnative.codeguides.io/i18n/locale-fallbacks-and-pseudolocale/) - fallback chains
* [Translation CI](https://docs.wahwei/reactnative.codeguides.io/i18n/translation-ci/) - extract and verify keys
* [../design-systems/theming-and-brand-flavors/theming-and-brand-flavors.md](https://docs.wahwei/reactnative.codeguides.io/design-systems/theming-and-brand-flavors/) - per-brand copy packs
* [i18n Best Practices](https://docs.wahwei/reactnative.codeguides.io/i18n/best-practices/) - section summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
