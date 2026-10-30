# React Native Paper

Material Design components and theming for Android-first UX.

Highlights / React Native Paper

* Paper ships Material Design 3 components - Button, TextInput, FAB, Snackbar
* PaperProvider must wrap the app - theme, icons, and ripple settings flow from context
* MD3Theme maps color roles: primary, onPrimary, surface, onSurface, elevation
* adaptNavigationTheme bridges React Navigation colors with Paper's MD3 palette
* Custom fonts and roundness extend MD3LightTheme / MD3DarkTheme - do not fork per screen
* Paper excels on Android-first apps; iOS still works but reads Material, not Cupertino

**React Native Paper** implements **Material Design 3** for React Native: buttons, text fields, dialogs, chips, and surfaces with built-in accessibility roles and ripple feedback. On **Expo SDK 57**, pair `PaperProvider` with **MD3 themes** and optionally **adapt React Navigation** so headers and tabs match your palette.

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx create-expo-app@latest MyPaperApp --template blank-typescript
cd MyPaperApp
npx expo install react-native-paper react-native-safe-area-context
npm install @react-navigation/native
```

```tsx
// theme/paper.ts
import {
  MD3DarkTheme,
  MD3LightTheme,
  adaptNavigationTheme,
  configureFonts,
} from "react-native-paper";
import {
  DarkTheme as NavDarkTheme,
  DefaultTheme as NavDefaultTheme,
} from "@react-navigation/native";
 
const fontConfig = configureFonts({ config: { fontFamily: "System" } });
 
export const lightTheme = {
  ...MD3LightTheme,
  fonts: fontConfig,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#2563eb",
    secondary: "#7c3aed",
  },
  roundness: 10,
};
 
export const darkTheme = {
  ...MD3DarkTheme,
  fonts: fontConfig,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#60a5fa",
    secondary: "#a78bfa",
  },
  roundness: 10,
};
 
export const { LightTheme: NavLight, DarkTheme: NavDark } = adaptNavigationTheme({
  reactNavigationLight: NavDefaultTheme,
  reactNavigationDark: NavDarkTheme,
  materialLight: lightTheme,
  materialDark: darkTheme,
});
```

```tsx
// App.tsx
import { useColorScheme } from "react-native";
import { PaperProvider } from "react-native-paper";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeScreen } from "./screens/HomeScreen";
import { darkTheme, lightTheme, NavDark, NavLight } from "./theme/paper";
 
const Stack = createNativeStackNavigator();
 
export default function App() {
  const scheme = useColorScheme() ?? "light";
  const paperTheme = scheme === "dark" ? darkTheme : lightTheme;
  const navTheme = scheme === "dark" ? NavDark : NavLight;
 
  return (
    <PaperProvider theme={paperTheme}>
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Inbox" }} />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
```

```tsx
// screens/HomeScreen.tsx
import { View } from "react-native";
import { Button, Card, Text, TextInput } from "react-native-paper";
 
export function HomeScreen() {
  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Card mode="elevated">
        <Card.Title title="Welcome" subtitle="Material 3 on Expo" />
        <Card.Content>
          <Text variant="bodyMedium">Compose forms and actions from Paper primitives.</Text>
        </Card.Content>
        <Card.Actions>
          <Button mode="text">Dismiss</Button>
          <Button mode="contained">Continue</Button>
        </Card.Actions>
      </Card>
      <TextInput mode="outlined" label="Email" placeholder="you@example.com" />
    </View>
  );
}
```

**When to reach for this:**

* Product targets **Android-first** or explicitly adopts **Material Design 3**.
* You need **accessible inputs, dialogs, and snackbars** without building from scratch.
* Navigation chrome should **match Paper colors** via `adaptNavigationTheme`.
* Timeline is tight - Paper's `Button`, `FAB`, and `Searchbar` ship production-ready patterns.

## Working Example

Login flow with MD3 theming, icon provider, snackbar feedback, and dark mode.

```tsx
// providers/AppProviders.tsx
import { useMemo } from "react";
import { useColorScheme } from "react-native";
import { PaperProvider, MD3Theme } from "react-native-paper";
import { NavigationContainer, Theme } from "@react-navigation/native";
import { darkTheme, lightTheme, NavDark, NavLight } from "../theme/paper";
 
export function AppProviders({
  children,
  navigationRef,
}: {
  children: React.ReactNode;
  navigationRef?: React.RefObject<object>;
}) {
  const scheme = useColorScheme() ?? "light";
  const paperTheme = useMemo<MD3Theme>(
    () => (scheme === "dark" ? darkTheme : lightTheme),
    [scheme],
  );
  const navTheme = useMemo<Theme>(
    () => (scheme === "dark" ? NavDark : NavLight),
    [scheme],
  );
 
  return (
    <PaperProvider theme={paperTheme}>
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        {children}
      </NavigationContainer>
    </PaperProvider>
  );
}
```

```tsx
// screens/LoginScreen.tsx
import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { Button, HelperText, Snackbar, Text, TextInput } from "react-native-paper";
 
export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [snack, setSnack] = useState(false);
 
  function handleSubmit() {
    if (!email.includes("@")) {
      setError("Enter a valid email");
      return;
    }
    setError(null);
    setSnack(true);
  }
 
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 12 }}>
        <Text variant="headlineMedium">Sign in</Text>
        <TextInput
          mode="outlined"
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          error={!!error}
          accessibilityLabel="Email address"
        />
        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>
        <Button mode="contained" onPress={handleSubmit} accessibilityLabel="Sign in">
          Sign in
        </Button>
      </View>
      <Snackbar visible={snack} onDismiss={() => setSnack(false)} duration={3000}>
        Signed in as {email}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}
```

**What this demonstrates:**

* **`PaperProvider`** supplies MD3 theme to all Paper components - colors, roundness, fonts, ripple.
* **`adaptNavigationTheme`** aligns React Navigation header/tab colors with Paper's `primary` and `surface` roles.
* **`Text variant="headlineMedium"`** uses MD3 typography scale - not raw `fontSize`.
* **`HelperText` + `error` prop** on `TextInput` - accessible validation pattern.
* **`Snackbar`** for transient feedback without custom toast infrastructure.

## Deep Dive

### How It Works

* **MD3 color roles** - `primary`, `onPrimary`, `primaryContainer`, `surface`, `onSurface`, `outline`, etc. Paper components consume roles, not arbitrary hex.
* **`PaperProvider`** - React context for theme, icons (`settings.icon`), and ripple configuration.
* **`useTheme()`** hook from Paper returns the active `MD3Theme` inside any child component.
* **`mode` props** - `Button mode="contained|outlined|text|elevated"`, `Card mode="elevated|outlined|contained"`.
* **Icons** - Paper uses `react-native-vector-icons` MaterialCommunityIcons by default; override via `settings.icon` in provider.

### MD3 Theme Structure

```tsx
import { MD3LightTheme } from "react-native-paper";
 
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#2563eb",       // brand actions
    onPrimary: "#ffffff",     // text on primary buttons
    surface: "#ffffff",       // cards, sheets
    onSurface: "#1c1b1f",     // body text on surface
    background: "#f8fafc",    // screen backdrop
  },
  roundness: 10,              // global corner radius baseline
};
```

Map your semantic tokens from [Design Systems Basics](https://docs.wahwei/reactnative.codeguides.io/design-systems/design-systems-basics/) to MD3 roles - do not invent parallel naming.

### React Navigation Integration

```tsx
import { adaptNavigationTheme } from "react-native-paper";
import { DefaultTheme, DarkTheme } from "@react-navigation/native";
 
const { LightTheme, DarkTheme: NavDark } = adaptNavigationTheme({
  reactNavigationLight: DefaultTheme,
  reactNavigationDark: DarkTheme,
  materialLight: lightTheme,
  materialDark: darkTheme,
});
```

Navigation headers pick up `primary` and `card` from Paper - avoids mismatched blues between app bar and buttons.

### TypeScript Notes

```tsx
import type { MD3Theme } from "react-native-paper";
 
export const lightTheme: MD3Theme = { ... };
```

* Type the theme export so custom color keys added incorrectly surface compile errors.
* `Text` `variant` is a union of MD3 typography names - autocomplete in IDE.

## Gotchas

* **Missing `PaperProvider`** - Components render with default theme; custom colors ignored. **Fix:** Wrap at root, inside `SafeAreaProvider`.
* **Hard-coded hex in screens** - Breaks dark mode. **Fix:** Use `useTheme().colors.primary` or Paper components that read theme automatically.
* **iOS users expecting Cupertino** - Paper reads Material on both platforms. **Fix:** Use Paper for Android-primary apps; consider `@expo/ui` or custom primitives for iOS-native chrome.
* **TextInput behind keyboard** - Outlined fields need `KeyboardAvoidingView` on iOS. **Fix:** Wrap form screens; test on small iPhones.
* **Ripple on iOS** - Paper simulates feedback; it is not identically Material Android. **Fix:** Accept platform differences or customize `android_ripple` via theme.
* **Mixing Paper and unstyled RN `Text`** - Typography rhythm drifts. **Fix:** Use Paper `Text` with `variant` inside Paper screens.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| **React Native Paper** | MD3, Android-first, forms and dialogs | Fully custom non-Material brand |
| **Tamagui / NativeWind** | Custom design language | You want prebuilt MD3 widgets |
| **@expo/ui** | Native SwiftUI/Compose controls | Material-specific elevation and ripple |
| **react-native-elements** | Legacy projects already on RNE | Greenfield MD3 apps - prefer Paper |

## FAQs

Does React Native Paper work with Expo SDK 57?

Yes. `npx expo install react-native-paper react-native-safe-area-context`. No native config plugin required for standard usage.

Where does PaperProvider go?

Outside navigation but inside safe area - typically wrapping `NavigationContainer` in `App.tsx` or root layout. One provider per app.

How do I change the primary brand color?

Override `colors.primary` (and `onPrimary`) in `MD3LightTheme` / `MD3DarkTheme` spreads. Keep contrast ratios for accessibility - see [Accessibility Basics](https://docs.wahwei/reactnative.codeguides.io/accessibility/accessibility-basics/).

Can I use custom fonts?

Pass `configureFonts({ config: { fontFamily: "Inter-Regular" } })` into the theme after loading fonts with expo-font. See [Typography Scale & Font Loading](https://docs.wahwei/reactnative.codeguides.io/styling-layout/typography-scale-and-font-loading/).

How does dark mode work?

Build `darkTheme` from `MD3DarkTheme`, select with `useColorScheme`, pass to `PaperProvider`. Sync `StatusBar` and navigation via `adaptNavigationTheme`.

Paper vs Tamagui?

Paper ships **opinionated MD3 components**. Tamagui ships **token primitives you style**. Choose Paper when Material patterns are the product; Tamagui when the brand is custom.

Are Paper components accessible?

Paper sets roles on many primitives, but you still must provide `accessibilityLabel` on icon-only buttons and test with VoiceOver/TalkBack. See [accessibilityLabel & accessibilityRole](https://docs.wahwei/reactnative.codeguides.io/accessibility/accessibilitylabel-and-accessibilityrole/).

## Related

* [Design Systems Basics](https://docs.wahwei/reactnative.codeguides.io/design-systems/design-systems-basics/) - semantic tokens mapped to MD3 roles
* [Dark Mode & Color Schemes](https://docs.wahwei/reactnative.codeguides.io/styling-layout/dark-mode-and-color-schemes/) - scheme selection at root
* [NativeWind (Tailwind for RN)](https://docs.wahwei/reactnative.codeguides.io/design-systems/nativewind-tailwind-for-rn/) - custom utility styling alternative
* [Expo UI Drop-Ins](https://docs.wahwei/reactnative.codeguides.io/design-systems/expo-ui-drop-ins/) - native SwiftUI/Compose vs Material
* [Accessibility Basics](https://docs.wahwei/reactnative.codeguides.io/accessibility/accessibility-basics/) - testing Paper screens with assistive tech
* [Styling Basics](https://docs.wahwei/reactnative.codeguides.io/styling-layout/styling-basics/) - when to wrap Paper vs raw layout

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
