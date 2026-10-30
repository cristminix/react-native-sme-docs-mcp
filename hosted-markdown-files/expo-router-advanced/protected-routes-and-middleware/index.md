# Protected Routes & Middleware

Auth gates, role checks, and redirect loop prevention. Expo Router SDK 57 introduces `Stack.Protected` and `Tabs.Protected` with `guard` booleans - the recommended pattern over sprinkling `<Redirect />` in every layout. Session hydration still lives in React context backed by [../auth-session/](https://docs.wahwei/reactnative.codeguides.io/auth-session/) storage; protected routes react when `guard` flips.

Highlights / Protected Routes & Middleware

* Stack.Protected / Tabs.Protected guard screens by session - SDK 57+ preferred over redirect-only layouts
* All routes exist on disk; guards control client-side access, not file deletion
* Hydrate session before rendering navigators - SplashScreen until SecureStore read completes
* Never duplicate the same screen in two Protected groups - declare once with nested guards
* router.replace after login - push lets users swipe back to credential screens
* Expo Router has no native middleware on mobile - web server middleware is future; use client guards today

## Recipe

> Quick-reference recipe card - copy-paste ready.

```text
app/
├── _layout.tsx          # SessionProvider + Stack.Protected
├── sign-in.tsx          # guard={!session}
└── (app)/
    ├── _layout.tsx      # authenticated stack
    └── (tabs)/...
```

```tsx
// app/_layout.tsx
import { Stack } from "expo-router";
import { SplashScreen } from "expo-router";
import { SessionProvider, useSession } from "@/features/auth";
 
SplashScreen.preventAutoHideAsync();
 
export default function RootLayout() {
  return (
    <SessionProvider>
      <SplashScreenController />
      <RootNavigator />
    </SessionProvider>
  );
}
 
function SplashScreenController() {
  const { isLoading } = useSession();
  if (!isLoading) SplashScreen.hideAsync();
  return null;
}
 
function RootNavigator() {
  const { session } = useSession();
 
  return (
    <Stack>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
 
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}
```

```tsx
// app/sign-in.tsx
import { router } from "expo-router";
import { Button, View } from "react-native";
import { useSession } from "@/features/auth";
 
export default function SignInScreen() {
  const { signIn } = useSession();
 
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Button
        title="Sign in"
        onPress={async () => {
          await signIn();
          router.replace("/(app)/(tabs)");
        }}
      />
    </View>
  );
}
```

**When to reach for this:**

* **Binary auth** - signed-in vs guest route sets
* **Role gates** - nested `Stack.Protected` for admin-only screens
* **Tab visibility** - hide `profile` tab until authenticated
* **Session expiry** - `guard` flips false → user redirected off protected screens automatically

## Working Example

Session provider, nested role protection, redirect hub fallback, and loop-safe patterns.

```tsx
// features/auth/model/SessionProvider.tsx
import { createContext, use, useEffect, useState, type PropsWithChildren } from "react";
import * as SecureStore from "expo-secure-store";
 
type Session = { userId: string; role: "user" | "admin" } | null;
 
const AuthContext = createContext<{
  session: Session;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
} | null>(null);
 
export function useSession() {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error("useSession requires SessionProvider");
  return ctx;
}
 
export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session>(null);
  const [isLoading, setLoading] = useState(true);
 
  useEffect(() => {
    SecureStore.getItemAsync("session")
      .then((raw) => setSession(raw ? JSON.parse(raw) : null))
      .finally(() => setLoading(false));
  }, []);
 
  const signIn = async () => {
    const next: Session = { userId: "u1", role: "user" };
    await SecureStore.setItemAsync("session", JSON.stringify(next));
    setSession(next);
  };
 
  const signOut = async () => {
    await SecureStore.deleteItemAsync("session");
    setSession(null);
  };
 
  return (
    <AuthContext value={{ session, isLoading, signIn, signOut }}>
      {children}
    </AuthContext>
  );
}
```

```tsx
// app/_layout.tsx - root guards
import { Stack } from "expo-router";
import { SessionProvider, useSession } from "@/features/auth";
 
function RootNavigator() {
  const { session, isLoading } = useSession();
 
  if (isLoading) return null;
 
  const isLoggedIn = !!session;
  const isAdmin = session?.role === "admin";
 
  return (
    <Stack>
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Protected guard={isAdmin}>
          <Stack.Screen name="admin" />
        </Stack.Protected>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
 
      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}
 
export default function RootLayout() {
  return (
    <SessionProvider>
      <RootNavigator />
    </SessionProvider>
  );
}
```

```tsx
// app/index.tsx - optional redirect hub (avoid fighting Stack.Protected)
import { Redirect } from "expo-router";
import { useSession } from "@/features/auth";
 
export default function Index() {
  const { session, isLoading } = useSession();
  if (isLoading) return null;
  if (session) return <Redirect href="/(app)/(tabs)" />;
  return <Redirect href="/sign-in" />;
}
```

```tsx
// app/(app)/(tabs)/_layout.tsx - protect individual tabs
import { Tabs } from "expo-router";
import { useSession } from "@/features/auth";
 
export default function TabsLayout() {
  const { session } = useSession();
  const isLoggedIn = !!session;
 
  return (
    <Tabs>
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Protected guard={isLoggedIn}>
        <Tabs.Screen name="inbox" options={{ title: "Inbox" }} />
        <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      </Tabs.Protected>
    </Tabs>
  );
}
```

## Deep Dive

### How `guard` redirects work

When `guard` is `false`:

1. User cannot **client-navigate** to protected screens (Link, `router.push`).
2. If already on a protected screen when `guard` becomes false, router redirects to the **anchor** route (usually `index`) or the **first available** screen in the stack.
3. History entries for that protected subtree are **removed** when guard flips false.

Place the sign-in screen **outside** the authenticated `Stack.Protected` group so guests always have a fallback target.

### Avoiding redirect loops

| Anti-pattern | Loop | Fix |
| --- | --- | --- |
| `index` redirects to `/sign-in` while sign-in redirects to `/` | Infinite bounce | Use `Stack.Protected` - only one authority decides fallback |
| Both `(auth)` and `(app)` own `index.tsx` at `/` | Ambiguous `/` | Single `app/index.tsx` hub |
| Redirect before `isLoading === false` | Flash sign-in → home → sign-in | `return null` until hydration completes |
| `sign-in` inside authenticated group | No fallback when logged out | `guard={!session}` group for auth screens |
| `router.push` after login | Back to sign-in | `router.replace` |

```tsx
// ❌ Loop risk - two layouts both redirect on /
// (auth)/_layout.tsx
if (!session) return <Redirect href="/sign-in" />;
// (app)/_layout.tsx
if (!session) return <Redirect href="/sign-in" />;
 
// ✅ Single source of truth
// app/_layout.tsx - Stack.Protected only
```

### Middleware: what exists in SDK 57

Expo Router **does not** ship Next.js-style route middleware on native. On web, routing is primarily static generation today - **no custom server middleware** for per-request auth redirects.

| Layer | Native | Web (SDK 57) |
| --- | --- | --- |
| `Stack.Protected` | ✅ Client guard | ✅ Client guard |
| `<Redirect />` in layouts | ✅ | ✅ |
| Server middleware | ❌ | ❌ (not yet) |
| API route auth | Separate concern | `app/api/**` + your server |

Treat protected routes as **UX gates**, not security boundaries. Validate tokens on every API call - see [../auth-session/mobile-auth-basics/mobile-auth-basics.md](https://docs.wahwei/reactnative.codeguides.io/auth-session/mobile-auth-basics/) and [../auth-session/securestore-and-keychain-keystore/securestore-and-keychain-keystore.md](https://docs.wahwei/reactnative.codeguides.io/auth-session/securestore-and-keychain-keystore/).

### Deep links while logged out

A user opening `myapp://inbox/42` while logged out hits a protected screen → router redirects to the first available unguarded screen (`sign-in`). After login, `router.replace` to the intended href:

```tsx
const redirect = useGlobalSearchParams<{ redirect?: string }>();
 
await signIn();
router.replace((redirect as `/${string}`) ?? "/(app)/(tabs)");
```

Pass `redirect` query param when sending users to sign-in.

### Sign-out behavior

Calling `signOut()` flips `guard` to false. Protected history is cleared automatically - user should land on `sign-in` without manual `router.replace` if layouts are wired correctly.

## Gotchas

* **Protected routes ≠ server security** - URLs are still in the bundle. **Fix:** API authorization, token expiry, certificate pinning for sensitive apps.
* **Duplicating screens across Protected groups** - Same `profile` in two groups throws. **Fix:** One declaration; nest guards for roles.
* **Rendering navigators before hydration** - Brief false `guard` causes redirect flicker. **Fix:** SplashScreen + `isLoading` gate.
* **Using `disabled` on native tabs as auth** - `disabled` only blocks tab bar taps; `router.push` still works. **Fix:** `Tabs.Protected` or root `Stack.Protected`.
* **Static web export of protected routes** - Protected screens are skipped at build time; direct URL access may still fetch JS. **Fix:** Do not rely on SSG for secrecy.
* **Modal sign-in without anchor** - Deep link context lost. **Fix:** `unstable_settings.anchor` - see [Modal & Presentation Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router-advanced/modal-and-presentation-routes/).

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `Stack.Protected` | SDK 57+ auth shells | You must support Expo Router < 5 |
| `<Redirect />` in layouts | Simple hub, legacy code | Complex role matrix (prefer nested Protected) |
| Imperative `router.replace` only | One-off post-login | Ongoing session enforcement |
| Feature-level guards in screens | Extra sensitive action (delete account) | Replacing layout-level auth entirely |
| Server session (web API routes) | Token refresh, RBAC on server | Expecting it to block native navigation alone |

## FAQs

Stack.Protected vs Redirect - which wins?

* Prefer **`Stack.Protected`** for navigator-level access in SDK 57+.
* Use **`<Redirect />`** in `app/index.tsx` as a landing hub, not in every nested layout.
* Do not combine conflicting rules on the same route.

How do nested role guards compose?

```tsx
<Stack.Protected guard={isLoggedIn}>
  <Stack.Protected guard={isAdmin}>
    <Stack.Screen name="admin" />
  </Stack.Protected>
  <Stack.Screen name="(app)" />
</Stack.Protected>
```

`/admin` requires both guards true. `/about` under the outer group requires login only.

What happens when guard changes while user is on a protected screen?

* Router redirects to anchor or first available screen.
* Protected screen history is **removed** from the stack.
* No manual `router.replace('/sign-in')` required if sign-in is the unguarded fallback.

Can I use expo-auth-session with protected routes?

* Yes - OAuth completes in `sign-in.tsx`; persist tokens in SecureStore; set session state.
* See [../auth-session/expo-auth-session-and-oauth/expo-auth-session-and-oauth.md](https://docs.wahwei/reactnative.codeguides.io/auth-session/expo-auth-session-and-oauth/).

How do I prevent the sign-in ↔ home loop?

1. Wait for `isLoading === false` before any redirect.
2. Single guard authority at root `Stack.Protected`.
3. `router.replace` after login, never `push`.
4. One `app/index.tsx` - no competing index routes in groups.

Is there Expo Router middleware like Next.js?

* **Not on native** - use client guards.
* **Web** - middleware-style server redirects are not supported yet; use client `Stack.Protected` and loading states.
* API routes authenticate separately on the server.

## Related

* [Nested Navigators](https://docs.wahwei/reactnative.codeguides.io/expo-router-advanced/nested-navigators/) - `(auth)` / `(app)` stack nesting
* [Modal & Presentation Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router-advanced/modal-and-presentation-routes/) - sign-in as modal
* [../expo-router/redirects-and-index-routes/redirects-and-index-routes.md](https://docs.wahwei/reactnative.codeguides.io/expo-router/redirects-and-index-routes/) - index hubs and replace
* [../auth-session/mobile-auth-basics/mobile-auth-basics.md](https://docs.wahwei/reactnative.codeguides.io/auth-session/mobile-auth-basics/) - session model
* [../auth-session/auth-session-lifecycle/auth-session-lifecycle.md](https://docs.wahwei/reactnative.codeguides.io/auth-session/auth-session-lifecycle/) - refresh and expiry
* [../auth-session/securestore-and-keychain-keystore/securestore-and-keychain-keystore.md](https://docs.wahwei/reactnative.codeguides.io/auth-session/securestore-and-keychain-keystore/) - token storage

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
