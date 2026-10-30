# RTL Layouts

`I18nManager` flip rules and mirrored icons. Right-to-left languages (Arabic, Hebrew, Persian, Urdu) require **layout mirroring** - not just translated strings. React Native flips flexbox and `start`/`end` edges when RTL is enabled; you still own icons, animations, and asymmetric padding.

Highlights / RTL Layouts

* Enable RTL with I18nManager.allowRTL + forceRTL - then reload the app
* Prefer flex start/end and marginStart/marginEnd - not left/right
* Mirror directional icons (chevrons, back arrows); do not mirror logos or media
* textDirection from expo-localization signals when to enable RTL
* Navigation back gestures and header back buttons must be QA'd in Arabic
* Brand flavors may force LTR chrome - document per-tenant rules

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install expo-localization expo-updates
```

```ts
// src/i18n/rtl.ts
import { I18nManager } from "react-native";
import * as Updates from "expo-updates";
import { getLocales } from "expo-localization";
 
const RTL_LANGS = new Set(["ar", "he", "fa", "ur"]);
 
export function isRtlLanguage(lang: string) {
  return RTL_LANGS.has(lang.split("-")[0]?.toLowerCase() ?? "");
}
 
export function readDeviceDirection() {
  return getLocales()[0]?.textDirection ?? "ltr";
}
 
export async function applyRtlForLanguage(lang: string) {
  const shouldRtl = isRtlLanguage(lang);
  if (I18nManager.isRTL === shouldRtl) return false;
 
  I18nManager.allowRTL(shouldRtl);
  I18nManager.forceRTL(shouldRtl);
  await Updates.reloadAsync();
  return true;
}
```

```tsx
// Use logical edges in StyleSheet
const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  chip: { marginStart: 8, paddingStart: 12, paddingEnd: 12 },
});
```

**When to reach for this:**

* Shipping **Arabic or Hebrew** (or other RTL locales)
* `expo-localization` reports `textDirection: "rtl"` - [expo-localization](https://docs.wahwei/reactnative.codeguides.io/i18n/expo-localization/)
* User switches language in settings - pair with i18next - [i18next / react-i18next](https://docs.wahwei/reactnative.codeguides.io/i18n/i18next-react-i18next/)
* QA reports **truncated or clipped** Hebrew/Arabic labels - also check [Locale Fallbacks & Pseudolocale](https://docs.wahwei/reactnative.codeguides.io/i18n/locale-fallbacks-and-pseudolocale/)
* White-label apps with **mixed RTL/LTR brand rules** - [Theming & Brand Flavors](https://docs.wahwei/reactnative.codeguides.io/design-systems/theming-and-brand-flavors/)

## Working Example

### 1. Detect RTL From Locale

```ts
import { getLocales } from "expo-localization";
import { isRtlLanguage } from "@/i18n/rtl";
 
export function shouldEnableRtl(lang?: string) {
  if (lang) return isRtlLanguage(lang);
  const [{ textDirection, languageCode }] = getLocales();
  return textDirection === "rtl" || isRtlLanguage(languageCode ?? "en");
}
```

* Trust **`textDirection`** first - OS knows script direction
* Maintain **`RTL_LANGS`** for app-language overrides that do not match device locale
* Call during i18n init - [i18n Basics](https://docs.wahwei/reactnative.codeguides.io/i18n/i18n-basics/)

---

### 2. Enable RTL at Boot

```tsx
// app/_layout.tsx (excerpt)
import { useEffect, useState } from "react";
import { applyRtlForLanguage } from "@/i18n/rtl";
import { initI18n, getCurrentLanguage } from "@/i18n/i18n";
 
export default function RootLayout() {
  const [ready, setReady] = useState(false);
 
  useEffect(() => {
    void (async () => {
      await initI18n();
      const lang = getCurrentLanguage();
      const reloaded = await applyRtlForLanguage(lang);
      if (!reloaded) setReady(true);
    })();
  }, []);
 
  if (!ready) return null;
  return <Stack />;
}
```

* **`Updates.reloadAsync`** applies `I18nManager` changes - hot reload is not enough
* First launch on Arabic device: enable RTL **before** first meaningful paint when possible
* Expo Go reflects RTL after reload - test on dev client builds too

---

### 3. Logical Styles: `start` / `end`

```tsx
import { StyleSheet, Text, View } from "react-native";
 
export function ListRow({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.textCol}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingStart: 16,
    paddingEnd: 16,
  },
  textCol: { flex: 1, marginEnd: 8 },
  title: { fontSize: 16, textAlign: "left" }, // see example 4
  subtitle: { fontSize: 13, color: "#6b7280" },
  chevron: { fontSize: 20 },
});
```

* **`paddingStart` / `marginEnd`** flip under RTL - `paddingLeft` does not
* **`flexDirection: "row"`** reverses child order in RTL - often correct for list rows
* Audit every `left`, `right`, `marginLeft`, `borderLeftWidth` in the codebase with ESLint custom rules

---

### 4. Text Alignment

```tsx
// Prefer writing-direction-aware alignment
<Text style={{ textAlign: I18nManager.isRTL ? "right" : "left" }}>{title}</Text>
 
// Better: default alignment follows locale when supported
<Text style={styles.body}>{body}</Text>
```

```ts
import { I18nManager, StyleSheet } from "react-native";
 
const styles = StyleSheet.create({
  body: {
    textAlign: "auto" as "auto", // RN 0.86 - follows writing direction
    writingDirection: I18nManager.isRTL ? "rtl" : "ltr",
  },
});
```

* **`textAlign: "auto"`** lets the bidi algorithm place mixed LTR/RTL strings
* Numbers and emails embedded in Arabic sentences need **unicode-bidi** care - keep LTR tokens in spans if clipping occurs
* Long German strings in LTR still truncate - pseudolocale QA - [Locale Fallbacks & Pseudolocale](https://docs.wahwei/reactnative.codeguides.io/i18n/locale-fallbacks-and-pseudolocale/)

---

### 5. Mirrored Icons

```tsx
import { I18nManager, Image, StyleSheet } from "react-native";
 
type Props = { source: number; mirrorInRtl?: boolean };
 
export function DirectionalIcon({ source, mirrorInRtl = true }: Props) {
  return (
    <Image
      source={source}
      style={[styles.icon, mirrorInRtl && I18nManager.isRTL && styles.mirror]}
    />
  );
}
 
const styles = StyleSheet.create({
  icon: { width: 24, height: 24 },
  mirror: { transform: [{ scaleX: -1 }] },
});
```

| Asset | Mirror in RTL? |
| --- | --- |
| Back chevron, forward arrow, send arrow | **Yes** |
| Search, close (X), checkmark | **No** |
| Media playback (play triangle) | **No** |
| Asymmetric logos, brand marks | **No** |
| Charts with time on X-axis | **Often no** - keep LTR time axis |

* Use **`scaleX: -1`** on `Image` - not separate asset files unless design demands
* Tab bars and FAB positions flip with `row` - verify thumb reach on RTL devices

---

### 6. Navigation Back Button

```tsx
import { Pressable, Text } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { DirectionalIcon } from "@/components/DirectionalIcon";
 
export function BackButton() {
  const { t } = useTranslation("common");
  return (
    <Pressable
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel={t("actions.back")}
      style={{ flexDirection: "row", alignItems: "center" }}
    >
      <DirectionalIcon source={require("@/assets/chevron-back.png")} />
      <Text>{t("actions.back")}</Text>
    </Pressable>
  );
}
```

* **Expo Router** and React Navigation honor RTL for stack transitions - still verify gesture direction
* **`accessibilityLabel`** must be translated - not "Back" hard-coded
* Detox tests should use `testID` - [Detox E2E](https://docs.wahwei/reactnative.codeguides.io/testing/detox-e2e/)

---

### 7. `I18nManager` Flags Explained

```ts
import { I18nManager } from "react-native";
 
I18nManager.isRTL; // current layout direction
I18nManager.allowRTL(true); // permit RTL layout
I18nManager.forceRTL(true); // force RTL even on LTR device (QA)
I18nManager.swapLeftAndRightInRTL; // swaps left/right style props in RTL (legacy helper)
```

* **`forceRTL(true)` on LTR device** - useful for QA without changing OS language
* Do not call `forceRTL` on every render - only when language **changes**
* Document that **reload is required** in settings copy when user picks Arabic

---

### 8. Animations and Absolute Position

```tsx
import { useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { I18nManager } from "react-native";
 
export function SlideInPanel({ open }: { open: boolean }) {
  const { width } = useWindowDimensions();
  const sign = I18nManager.isRTL ? -1 : 1;
 
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: withTiming(open ? 0 : sign * width) },
    ],
  }));
 
  return <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, width }, style]} />;
}
```

* **Absolute `left: 0`** anchors to visual left - wrong for RTL drawers anchored to start edge
* Prefer **`position: "absolute", start: 0`** (RN layout props) where supported
* Reanimated shared values are unaware of direction - multiply transforms by `sign`

---

### 9. Mixed LTR Content in RTL Screens

```tsx
<Text style={{ writingDirection: "rtl" }}>
  رقم الطلب: <Text style={{ writingDirection: "ltr" }}>#A-1042</Text>
</Text>
```

* Order IDs, phone numbers, and URLs often stay **LTR** inside RTL paragraphs
* Credit card and OTP fields should use **`textAlign: "left"`** + LTR direction regardless of app locale
* Do not mirror **maps** - geographic north stays up

---

### 10. RTL QA Checklist Screen

```tsx
export function RtlChecklistScreen() {
  const { t, i18n } = useTranslation("common");
  return (
    <View style={{ padding: 16 }}>
      <Text accessibilityRole="header">{t("rtl.checklist_title")}</Text>
      <Text>• {t("rtl.logical_margins")}</Text>
      <Text>• {t("rtl.mirrored_chevrons")}</Text>
      <Text>• {t("rtl.reload_after_switch")}</Text>
      <Text>Lang: {i18n.language} - RTL: {String(I18nManager.isRTL)}</Text>
    </View>
  );
}
```

```text
RTL ship checklist:
 
✓ I18nManager aligned with app language at boot
✓ No marginLeft/paddingRight in feature styles (grep audit)
✓ Directional icons mirrored; logos untouched
✓ Navigation back affordance tested on Arabic device
✓ Settings warns about brief reload on language change
✓ Pseudolocale + longest translation screenshot review
```

## Gotchas

* **`paddingLeft` in shared design tokens** - Breaks RTL site-wide. **Fix:** migrate tokens to `Start`/`End` suffixes.
* **Forgetting reload after `forceRTL`** - Layout stays LTR until restart. **Fix:** `Updates.reloadAsync()`.
* **Mirroring play buttons and maps** - Confusing and wrong. **Fix:** `mirrorInRtl={false}` per asset.
* **Concatenated strings** - Arabic grammar differs; mirrored UI exposes awkward word order. **Fix:** full-sentence keys - [i18n Best Practices](https://docs.wahwei/reactnative.codeguides.io/i18n/best-practices/).
* **LTR-only brand flavor** - Some tenants may disable RTL - document in [Theming & Brand Flavors](https://docs.wahwei/reactnative.codeguides.io/design-systems/theming-and-brand-flavors/).

## FAQs

Can I toggle RTL without reload?

Not reliably on RN 0.86. Plan for one `reloadAsync` when crossing LTR ↔ RTL. Minor string changes within the same direction do not need reload.

Does NativeWind/Tailwind support RTL?

Use `ms-`, `me-`, `ps-`, `pe-` logical utilities where available - see [NativeWind](https://docs.wahwei/reactnative.codeguides.io/design-systems/nativewind-tailwind-for-rn/). Avoid physical `ml-`/`mr-` in shared components.

How do I test RTL in the simulator?

Set device language to Arabic **or** call `I18nManager.forceRTL(true)` behind a dev menu flag, then reload.

Expo Router tabs in RTL?

Tab order mirrors with RTL. Verify icon-only tabs still have `tabBarAccessibilityLabel` translated.

## Related

* [expo-localization](https://docs.wahwei/reactnative.codeguides.io/i18n/expo-localization/) - `textDirection` from device
* [i18next / react-i18next](https://docs.wahwei/reactnative.codeguides.io/i18n/i18next-react-i18next/) - language change + reload
* [i18n Basics](https://docs.wahwei/reactnative.codeguides.io/i18n/i18n-basics/) - locale provider at root
* [Locale Fallbacks & Pseudolocale](https://docs.wahwei/reactnative.codeguides.io/i18n/locale-fallbacks-and-pseudolocale/) - truncation before translators
* [../design-systems/theming-and-brand-flavors/theming-and-brand-flavors.md](https://docs.wahwei/reactnative.codeguides.io/design-systems/theming-and-brand-flavors/) - per-brand RTL policy
* [../styling-layout/flexbox-deep-dive/flexbox-deep-dive.md](https://docs.wahwei/reactnative.codeguides.io/styling-layout/flexbox-deep-dive/) - row/column layout
* [i18n Best Practices](https://docs.wahwei/reactnative.codeguides.io/i18n/best-practices/) - section summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
