# Expo Router Navigation

File-based routing idioms for Expo Router - stacks, tabs, params, and imperative navigation.

Highlights / Expo Router Navigation

* File-based Screen
* Link Component Navigate
* Dynamic Route Params
* Tabs Layout
* Redirect Auth Gate

#### File-based Screen

Routes map from the `app/` directory. `app/index.tsx` is the entry route for that segment.

```tsx
// app/index.tsx
import { Text, View } from "react-native";
 
export default function HomeScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text>Home</Text>
    </View>
  );
}
```

#### Stack Screen Options

Configure titles and headers in `_layout.tsx` with `Stack.Screen` options.

```tsx
// app/_layout.tsx
import { Stack } from "expo-router";
 
export default function Layout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Home" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
    </Stack>
  );
}
```

#### Link Component Navigate

Declarative navigation with `Link` - good for list rows and static menus.

```tsx
import { Link } from "expo-router";
import { Text } from "react-native";
 
<Link href="/settings">
  <Text>Open settings</Text>
</Link>
```

#### router.push Path

Imperative navigation from handlers after async work or validation.

```tsx
import { router } from "expo-router";
 
function onCreated(id: string) {
  router.push(`/items/${id}`);
}
```

#### Dynamic Route Params

Dynamic segments live in brackets: `app/items/[id].tsx` matches `/items/42`.

```tsx
// app/items/[id].tsx
import { useLocalSearchParams } from "expo-router";
 
export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Text>Item {id}</Text>;
}
```

#### useLocalSearchParams

Read path and query params for the focused route. Values may be `string | string[]` - normalize when needed.

```tsx
const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
const itemId = Array.isArray(id) ? id[0] : id;
```

#### Tabs Layout

Group tab screens under a `(tabs)` folder with a tabs `_layout`.

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
 
export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
```

#### Redirect Auth Gate

Send unauthenticated users to sign-in without mounting protected UI.

```tsx
import { Redirect } from "expo-router";
 
if (!session) return <Redirect href="/sign-in" />;
return <AppShell />;
```

#### router.back and canGoBack

Pop the stack when possible; otherwise route to a safe fallback.

```tsx
import { router } from "expo-router";
 
function onBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}
```

#### replace vs push

`push` adds history; `replace` swaps the current entry - use after login so back does not return to the form.

```tsx
router.replace("/(tabs)");
```

#### Modal Presentation Route

Present a screen as a modal via stack options (`presentation: "modal"`).

```tsx
<Stack.Screen name="compose" options={{ presentation: "modal", title: "New" }} />
```

#### Href Object Params

Build hrefs as objects when you need query params without string concatenation.

```tsx
<Link href={{ pathname: "/search", params: { q: query } }}>
  <Text>Search</Text>
</Link>
```

#### useNavigation setOptions

Update the header from inside a screen when the title depends on loaded data.

```tsx
import { useNavigation } from "expo-router";
import { useLayoutEffect } from "react";
 
const navigation = useNavigation();
useLayoutEffect(() => {
  navigation.setOptions({ title: item?.name ?? "Item" });
}, [navigation, item?.name]);
```

#### Slot and Groups

Parentheses folders like `(auth)` group routes without affecting the URL path.

```tsx
// app/(auth)/sign-in.tsx -> /sign-in
// app/(auth)/_layout.tsx can wrap auth screens without a URL segment
```

#### Deep Link Path

Configure scheme in `app.json` / `app.config` so `/items/1` opens the matching route when the OS delivers a URL.

```tsx
// app.config: { expo: { scheme: "myapp" } }
// Opens: myapp://items/1  -> app/items/[id].tsx
```

## Related

* [Platform Linking and Share](https://docs.wahwei/reactnative.codeguides.io/code-reference/platform-linking-and-share/) - OS-level Linking and share sheets
* [App State and Hooks](https://docs.wahwei/reactnative.codeguides.io/code-reference/app-state-and-hooks/) - useFocusEffect and lifecycle
* [Core Views and Text](https://docs.wahwei/reactnative.codeguides.io/code-reference/core-views-and-text/) - screen body building blocks

### External Related Links

* [reactnavigation.org](https://reactnavigation.org/) - official React Navigation docs
* [docs.expo.dev](https://docs.expo.dev/) - official Expo docs (recommended framework)
* [reactnative.dev](https://reactnative.dev/) - official React Native site

> **Stack versions:** React 19.2.3 · React Native 0.86.0 · Expo SDK 57 · Expo Router

Reviewed by Chris St. John·Last updated Jul 18, 2026
