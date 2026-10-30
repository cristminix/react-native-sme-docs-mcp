# i18n Best Practices

A condensed summary of the 25 most important best practices drawn from every page in this section.

Highlights / i18n Best Practices

* Externalize every user-visible string - literals block translation and RTL QA
* One key per complete sentence - never concatenate t() fragments
* expo-localization for device default; AsyncStorage for user override
* i18next namespaces and lazy packs for catalogs past ~100 keys
* I18nManager + start/end edges for RTL - reload on direction change
* Translation CI verifies key parity before EAS production builds

1. **Externalize all user-visible copy:** Literals in JSX block translators, break plural rules, and prevent RTL truncation QA - use `t()` from day one.
2. **One key per complete phrase:** Never concatenate `t("welcome") + name + t("exclaim")` - word order differs in Arabic, Japanese, and German.
3. **Context-aware keys:** Duplicate English homographs (`close` dialog vs `close` account) need distinct keys - translators cannot guess from `"close"`.
4. **English JSON is the source locale:** Ship `en` changes in the same PR as new `t()` calls - TMS uploads and verify scripts treat English as authoritative.
5. **Resolve locale at boot before navigation:** Gate root layout until device default and AsyncStorage override resolve - avoid English flash on Arabic devices.
6. **Device default from expo-localization:** Use `getLocales()[0].languageTag` and walk the preference list - not `Intl` guesses or hard-coded `en-US`.
7. **User override beats device locale:** Settings persistence in AsyncStorage (or server profile) wins over OS language on next launch.
8. **Map BCP 47 tags to supported app locales:** `es-419` → `es`, `pt-PT` → `pt` - explicit tables beat bare language-code truncation.
9. **Fallback chains to English:** Configure `fallbackLng` (`fr-CA` → `fr` → `en`) - missing keys must never render blank in production.
10. **Format with Intl at the display edge:** Store ISO dates and raw numbers in state/API; format with `languageTag` and `currencyCode` from expo-localization.
11. **Never parse locale-formatted input:** Users type decimals with `,` or `.` - parse with known separators or structured pickers, not reversed display strings.
12. **Adopt i18next past ~100 keys:** Namespaces, plurals, lazy language packs, and TMS workflows outgrow hand-rolled `t()` helpers.
13. **Split namespaces by feature:** `common`, `auth`, `billing` - not one monolithic `translation.json` that conflicts on every merge.
14. **Lazy-load non-default languages:** Dynamic `import()` per locale keeps startup small - preload on Wi‑Fi after user selects a language.
15. **`escapeValue: false` in react-i18next:** React Native `Text` already escapes - `escapeValue: true` mangles apostrophes and ICU markup.
16. **Plural keys in JSON, not JSX branches:** Use `count` with `_one` / `_other` suffixes - Arabic and Polish need more than two forms.
17. **Error mappers return message keys:** Not literal English strings - resolve with `t()` in components so offline and auth copy translates.
18. **RTL is layout, not just translation:** Enable `I18nManager`, use `marginStart`/`paddingEnd`, mirror directional icons - reload when crossing LTR ↔ RTL.
19. **Do not mirror logos, media, or maps:** Chevrons and back arrows flip; brand marks and play buttons do not.
20. **Refresh locale on Android foreground:** `AppState` + `getLocales()` when returning active - users change language in Settings without restart.
21. **Pseudolocale before long locales ship:** `en-XA` or padded strings surface truncation in buttons and tabs before German copy arrives.
22. **Translation CI on every PR:** `i18next-parser` extract + `verify-locales` parity - block merge when `en` drifts or required locales miss keys.
23. **TMS for non-English writes:** Crowdin/Lokalise download into git - translators do not edit `es.json` in pull requests manually.
24. **testID for E2E, not copy assertions:** Detox and Maestro survive locale changes when selectors decouple from translated labels.
25. **Brand flavors may scope locales and RTL:** White-label tenants ship different language lists and direction rules without forking code - coordinate with design-system theming.

## FAQs

What is the default greenfield i18n stack?

`expo-localization` + `i18next` / `react-i18next` + AsyncStorage override + `I18nManager` for RTL + `i18next-parser` and verify script in CI. Start with [i18n Basics](https://docs.wahwei/reactnative.codeguides.io/i18n/i18n-basics/), graduate to [i18next / react-i18next](https://docs.wahwei/reactnative.codeguides.io/i18n/i18next-react-i18next/).

When is a minimal t() helper enough?

Two locales, fewer than ~100 keys, no plurals, and no TMS. Replace before plurals, lazy packs, or translator workflows - see [i18n Basics](https://docs.wahwei/reactnative.codeguides.io/i18n/i18n-basics/).

How do i18n and theming interact?

Locale choice is independent of light/dark theme, but **brand flavors** may fix supported locales, default language, and RTL policy per tenant - [Theming & Brand Flavors](https://docs.wahwei/reactnative.codeguides.io/design-systems/theming-and-brand-flavors/).

Do I need separate App Store listings per language?

Store metadata is separate from in-app i18n. In-app locales come from JSON bundles or OTA updates - [Translation CI](https://docs.wahwei/reactnative.codeguides.io/i18n/translation-ci/) gates production catalogs.

## Related

* [i18n Basics](https://docs.wahwei/reactnative.codeguides.io/i18n/i18n-basics/) - externalization and boot gate
* [expo-localization](https://docs.wahwei/reactnative.codeguides.io/i18n/expo-localization/) - device locale API
* [i18next / react-i18next](https://docs.wahwei/reactnative.codeguides.io/i18n/i18next-react-i18next/) - namespaces and lazy packs
* [RTL Layouts](https://docs.wahwei/reactnative.codeguides.io/i18n/rtl-layouts/) - `I18nManager` and mirrored icons
* [Translation CI](https://docs.wahwei/reactnative.codeguides.io/i18n/translation-ci/) - extract, upload, verify
* [Locale Fallbacks & Pseudolocale](https://docs.wahwei/reactnative.codeguides.io/i18n/locale-fallbacks-and-pseudolocale/) - fallback chains and truncation QA
* [../design-systems/theming-and-brand-flavors/theming-and-brand-flavors.md](https://docs.wahwei/reactnative.codeguides.io/design-systems/theming-and-brand-flavors/) - per-brand locale and RTL policy
* [../error-resilience/user-facing-error-copy/user-facing-error-copy.md](https://docs.wahwei/reactnative.codeguides.io/error-resilience/user-facing-error-copy/) - error message keys
* [../state-management/context-without-storms/context-without-storms.md](https://docs.wahwei/reactnative.codeguides.io/state-management/context-without-storms/) - locale in Context
* [../testing/detox-e2e/detox-e2e.md](https://docs.wahwei/reactnative.codeguides.io/testing/detox-e2e/) - testID selectors

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
