# Redirects & Index Routes

Default landing screens and auth-gated entry points. `index.tsx` files define default routes for their folder; `<Redirect />` and `router.replace` send users to the right shell without polluting the back stack.

Highlights / Redirects & Index Routes

* app/index.tsx is the / route - use it as a redirect hub, not a 200-line home screen
* Redirect component declaratively sends users based on session - replace for auth transitions
* router.replace after login prevents swipe-back to credential screens
* Index routes inside folders default that path segment - orders/index.tsx is /orders
* Never duplicate index.tsx across route groups - both (auth) and (app) cannot own /
* Gate on session hydration first - redirecting before AsyncStorage/SecureStore reads causes flicker

## Recipe

> Quick-reference recipe card - copy-paste ready.

```text
app/
├── _layout.tsx
├── index.tsx              # / - auth redirect hub
├── (auth)/
│   ├── login.tsx          # /login
│   └── register.tsx
└── (app)/
    └── (tabs)/
        ├── _layout.tsx
        └── index.tsx      # / - real home when signed in
```

```tsx
// app/index.tsx - redirect hub
import { Redirect } from "expo-router";
import { useSession } from "@/features/auth";
 
export default function Index() {
  const { session, isLoading } = useSession();
 
  if (isLoading) return null;
 
  if (session) {
    return <Redirect href="/(tabs)" />;
  }
 
  return <Redirect href="/login" />;
}
```

```tsx
// After login - imperative replace
import { router } from "expo-router";
 
router.replace("/(tabs)");
```

**When to reach for this:**

* **Auth-gated entry** - signed-in users skip login; guests skip tabs
* **Marketing `/` → `/home`** - legacy path support
* **Onboarding completion** - `replace` to main app
* **Role-based landing** - admin vs user default tab

## Working Example

Session provider, root redirect hub, protected app group layout, and post-login replace.

```tsx
// features/auth/model/useSession.tsx (simplified)
import { createContext, useContext, useEffect, useState } from "react";
 
type Session = { userId: string } | null;
 
const SessionContext = createContext<{
  session: Session;
  isLoading: boolean;
  signIn: () => void;
  signOut: () => void;
}>({ session: null, isLoading: true, signIn: () => {}, signOut: () => {} });
 
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>(null);
  const [isLoading, setLoading] = useState(true);
 
  useEffect(() => {
    // Hydrate from SecureStore - see auth-session section
    const timer = setTimeout(() => {
      setSession(null);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);
 
  return (
    <SessionContext.Provider
      value={{
        session,
        isLoading,
        signIn: () => setSession({ userId: "1" }),
        signOut: () => setSession(null),
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
 
export const useSession = () => useContext(SessionContext);
```

```tsx
// app/_layout.tsx
import { Stack } from "expo-router";
import { SessionProvider } from "@/features/auth";
 
export default function RootLayout() {
  return (
    <SessionProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </SessionProvider>
  );
}
```

```tsx
// app/index.tsx
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useSession } from "@/features/auth";
 
export default function RootIndex() {
  const { session, isLoading } = useSession();
 
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }
 
  if (session) {
    return <Redirect href="/(tabs)" />;
  }
 
  return <Redirect href="/login" />;
}
```

```tsx
// app/(app)/_layout.tsx - belt-and-suspenders guard
import { Redirect, Stack } from "expo-router";
import { useSession } from "@/features/auth";
 
export default function AppGroupLayout() {
  const { session, isLoading } = useSession();
 
  if (isLoading) return null;
  if (!session) return <Redirect href="/login" />;
 
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

```tsx
// app/(auth)/login.tsx (excerpt)
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSession } from "@/features/auth";
 
export default function LoginScreen() {
  const { signIn } = useSession();
 
  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 16 }}>
      <Pressable
        onPress={() => {
          signIn();
          router.replace("/(tabs)");
        }}
      >
        <Text>Sign in</Text>
      </Pressable>
    </View>
  );
}
```

```tsx
// app/(app)/(tabs)/index.tsx - actual home content
import { Text, View } from "react-native";
 
export default function HomeScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text>Home</Text>
    </View>
  );
}
```

## Deep Dive

### Index route resolution

```text
app/index.tsx                    → /
app/orders/index.tsx             → /orders
app/(app)/(tabs)/index.tsx       → /   (when (app) group is active)
```

* Only **one file** should own `/` for a given navigation state - use root `app/index.tsx` as hub
* **Folder index** is the list/default screen for that segment
* **`index.tsx` vs `orders.tsx`** - choose one; mixing creates confusing duplicates

### Redirect mechanisms

| Mechanism | API | Back stack | Use case |
| --- | --- | --- | --- |
| `<Redirect href>` | Declarative in render | Replaces current entry | Auth hub, layout guards |
| `router.replace` | Imperative | No back to prior | Post-login, logout |
| `router.push` | Imperative | Preserves back | Not for auth gates |
| `<Link replace>` | Declarative tap | Replace on navigate | Rare; prefer router after async |

```tsx
// Layout guard pattern
if (!session) return <Redirect href="/login" />;
```

### Auth-gated entry sequence

```text
1. Root _layout mounts SessionProvider
2. app/index.tsx waits for isLoading === false
3. session ? Redirect → /(tabs) : Redirect → /login
4. (app)/_layout.tsx re-checks session (deep link protection)
5. Login success → router.replace("/(tabs)")
6. Logout → router.replace("/login")
```

* **Double guard** - root hub + `(app)/_layout` catches deep links to `/settings` when logged out
* **Loading UI** - never redirect while session hydrates; prevents flash of login screen
* **Signed-in user on `/login`** - optionally redirect to `/(tabs)` from `(auth)/_layout.tsx`

### Logout and stack reset

```tsx
function signOut() {
  clearSession();
  router.replace("/login");
}
```

For stubborn stack state, remount navigators:

```tsx
// app/_layout.tsx
const { session } = useSession();
return <Stack key={session?.userId ?? "guest"} />;
```

## Gotchas

* **Redirect before session hydration** - users flash through login → home → login. **Fix:** `isLoading` gate with spinner or splash.
* **Two index routes at `/`** - `(auth)/index.tsx` and `(app)/index.tsx` conflict. **Fix:** Single `app/index.tsx` hub.
* **`router.push` after login** - swipe back exposes credentials. **Fix:** `router.replace`.
* **Infinite redirect loop** - `(app)` layout redirects to `/login` while login redirects to `/(tabs)` before session updates. **Fix:** Ensure `signIn` sets session **before** `router.replace`.
* **Deep link to protected route** - `/settings` bypasses hub. **Fix:** Guard in `(app)/_layout.tsx`, not only `app/index.tsx`.
* **Redirect in every child screen** - duplicated logic drifts. **Fix:** Layout-level `<Redirect>` once per group.
* **`href="/(tabs)"` vs `href="/"`** - both may work but mean different things when groups change. **Fix:** Prefer explicit tab root path; use typed `Href`.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `app/index.tsx` + `<Redirect>` | Standard auth gate | You need async server-side redirect (use web middleware) |
| `(app)/_layout` guard only | Simple apps | Deep links must also be protected - hub still recommended |
| `router.replace` post-login | Imperative after mutation | Initial cold start routing |
| Splash screen hold | Long hydration (1s+) | Fast SecureStore read - spinner enough |
| React Navigation `initialRouteName` | Manual RN without files | Expo Router file-based entry |
| Feature flag redirect | Maintenance mode | Per-user auth routing |

## FAQs

What is the difference between index and redirect?

**Index** is a real screen at the default path for a folder. **Redirect** sends navigation elsewhere without rendering content. Use `app/index.tsx` as a thin redirect hub; put home UI in `(tabs)/index.tsx`.

Redirect vs router.replace?

`<Redirect>` is declarative - render when condition is true. `router.replace` is imperative - call after `signIn()` completes. Both avoid back-stack entries when configured correctly.

How do I prevent back to login after sign-in?

```tsx
router.replace("/(tabs)");
```

Never `push` to the main app from login. Clear auth stack with `replace`.

How do I handle logout?

```tsx
await clearTokens();
router.replace("/login");
```

Also `queryClient.clear()` and reset tab stacks - remount with `key` on root layout if needed.

Can I redirect to an external URL?

Use `expo-linking` `openURL` for external sites. `<Redirect>` is for in-app routes only.

How do role-based redirects work?

```tsx
if (session?.role === "admin") return <Redirect href="/admin" />;
return <Redirect href="/(tabs)" />;
```

Keep role logic in session model - index hub reads one `useSession()` hook.

What about onboarding flows?

```tsx
if (!session) return <Redirect href="/login" />;
if (!session.onboardingDone) return <Redirect href="/onboarding" />;
return <Redirect href="/(tabs)" />;
```

Chain conditions in `app/index.tsx` - ordered from most specific to default.

How do index routes work in nested folders?

`app/orders/index.tsx` serves `/orders`. Navigating to `/orders` shows the list; `/orders/42` pushes `[id].tsx` on the orders stack.

Should signed-in users access /login?

Optionally redirect in `(auth)/_layout.tsx`:

```tsx
if (session) return <Redirect href="/(tabs)" />;
```

Prevents bookmarked login screen when already authenticated.

How do I test redirect logic?

Use `expo-router/testing-library` `renderRouter` with mock session providers. Assert `Redirect` targets by inspecting navigation state after `waitFor`.

## Related

* [Route Groups & Organizing `app/`](https://docs.wahwei/reactnative.codeguides.io/expo-router/route-groups-and-organizing-app/) - `(auth)` vs `(app)` split
* [Link & href](https://docs.wahwei/reactnative.codeguides.io/expo-router/link-and-href/) - `replace` vs `push`
* [Typed Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router/typed-routes/) - type-safe `Redirect href`
* [Expo Router Basics](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/) - index route fundamentals
* [../auth-session/mobile-auth-basics/mobile-auth-basics.md](https://docs.wahwei/reactnative.codeguides.io/auth-session/mobile-auth-basics/) - session hydration
* [../expo-rules/navigation-and-routing-rules/navigation-and-routing-rules.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/navigation-and-routing-rules/) - auth gate review rules

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4). cGJxcnRodnFyZi52YnxwdHZiOTU1fDIwMjYwNw==

Reviewed by Chris St. John·Last updated Jul 19, 2026
