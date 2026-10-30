# Internationalization Highlights Summary

Every highlight bullet from the 7 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Internationalization Highlights Summary

* Externalize every user-visible string - literals in JSX block translation and RTL QA
* Install with npx expo install expo-localization - versions match Expo SDK 57
* i18next scales past hand-rolled t() - plurals, contexts, and lazy language packs
* Enable RTL with I18nManager.allowRTL + forceRTL - then reload the app
* i18next-parser extracts keys from source - English JSON stays authoritative
* fallbackLng chains: pt-BR → pt → en - never silent empty strings

## [i18n Basics](https://docs.wahwei/reactnative.codeguides.io/i18n/i18n-basics/)

* Externalize every user-visible string - literals in JSX block translation and RTL QA
* Resolve locale once at boot: device default from expo-localization, user override from storage
* Use BCP 47 language tags (en-US, es-419) - not bare language codes alone
* Store message keys, not concatenated sentence fragments
* Gate first paint until locale is known - avoid English flash on Arabic devices
* Pair locale with textDirection for layout - see RTL Layouts

## [expo-localization](https://docs.wahwei/reactnative.codeguides.io/i18n/expo-localization/)

* Install with npx expo install expo-localization - versions match Expo SDK 57
* getLocales() and getCalendars() are synchronous; use hooks for reactive updates
* On Android, re-read locale when AppState returns to active - users change Settings without restart
* Format money with Intl.NumberFormat - currencyCode comes from getLocales()
* textDirection from locale drives RTL - pair with I18nManager in RTL Layouts
* Store ISO dates in state; format with device separators at the display edge

## [i18next / react-i18next](https://docs.wahwei/reactnative.codeguides.io/i18n/i18next-react-i18next/)

* i18next scales past hand-rolled t() - plurals, contexts, and lazy language packs
* Split namespaces by feature (common, auth, billing) - not one giant JSON file
* react-i18next useTranslation(ns) loads only the namespaces a screen needs
* Lazy-import locale JSON in changeLanguage to keep startup bundle small
* Disable escapeValue in RN - React already escapes Text children
* Pair init locale with expo-localization device default and AsyncStorage override

## [RTL Layouts](https://docs.wahwei/reactnative.codeguides.io/i18n/rtl-layouts/)

* Enable RTL with I18nManager.allowRTL + forceRTL - then reload the app
* Prefer flex start/end and marginStart/marginEnd - not left/right
* Mirror directional icons (chevrons, back arrows); do not mirror logos or media
* textDirection from expo-localization signals when to enable RTL
* Navigation back gestures and header back buttons must be QA'd in Arabic
* Brand flavors may force LTR chrome - document per-tenant rules

## [Translation CI](https://docs.wahwei/reactnative.codeguides.io/i18n/translation-ci/)

* i18next-parser extracts keys from source - English JSON stays authoritative
* verify-locales fails CI when es/fr/ar miss keys present in en
* Upload en to Crowdin/Lokalise on main; download translations on schedule
* Block EAS production builds without passing i18n:verify
* Pseudolocale generation runs in CI to keep en-XA in sync
* Never let translators edit keys in TMS - lock key names, translate values only

## [Locale Fallbacks & Pseudolocale](https://docs.wahwei/reactnative.codeguides.io/i18n/locale-fallbacks-and-pseudolocale/)

* fallbackLng chains: pt-BR → pt → en - never silent empty strings
* Map device languageTag to supported app locales with explicit rules
* Pseudolocale (en-XA) pads strings ~30% to surface truncation early
* Longest-locale screenshot QA catches layout breaks before Arabic ships
* partialBundledLanguages lets lazy packs fall back to English per key
* CI verifies fallback locales still expose missing keys in dev builds

## [i18n Best Practices](https://docs.wahwei/reactnative.codeguides.io/i18n/best-practices/)

* Externalize every user-visible string - literals block translation and RTL QA
* One key per complete sentence - never concatenate t() fragments
* expo-localization for device default; AsyncStorage for user override
* i18next namespaces and lazy packs for catalogs past ~100 keys
* I18nManager + start/end edges for RTL - reload on direction change
* Translation CI verifies key parity before EAS production builds

Reviewed by Chris St. John·Last updated Jul 18, 2026
