# expo-auth-session & OAuth

Authorization Code with **PKCE** is the standard OAuth pattern for Expo apps. This page covers redirect URI setup, `expo-auth-session` wiring, and provider-specific quirks for **Google** and **Apple** on SDK 57.

Highlights / expo-auth-session & OAuth

* Mobile OAuth must use Authorization Code + PKCE - never implicit flow in a WebView
* Register redirect URIs per environment: Expo Go, dev client, and production scheme differ
* Exchange authorization codes on your backend - client secrets do not belong in the app
* Google requires platform-specific OAuth client IDs; Apple Sign In is mandatory for some App Store categories
* Use makeRedirectUri() - hardcoded redirect strings break across build flavors
* Test OAuth on development builds - Expo Go redirect behavior is not identical to store binaries

## Prerequisites

```bash
npx expo install expo-auth-session expo-crypto expo-web-browser
```

`expo-web-browser` opens the system browser (or ASWebAuthenticationSession on iOS) - prefer it over embedded WebViews for OAuth.

Register a custom URL scheme in `app.config.ts`:

```ts
// app.config.ts
export default {
  expo: {
    name: "MyApp",
    slug: "my-app",
    scheme: "myapp",
    ios: { bundleIdentifier: "com.example.myapp" },
    android: { package: "com.example.myapp" },
  },
};
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**.

---

## PKCE Fundamentals

PKCE (Proof Key for Code Exchange) prevents authorization code interception on public mobile clients.

```ts
import * as Crypto from "expo-crypto";
 
function base64UrlEncode(bytes: Uint8Array) {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
 
export async function createPkcePair() {
  const verifierBytes = await Crypto.getRandomBytesAsync(32);
  const codeVerifier = base64UrlEncode(verifierBytes);
 
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    codeVerifier,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  );
 
  const codeChallenge = digest
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
 
  return { codeVerifier, codeChallenge };
}
```

* Generate a random **code\_verifier** and send its SHA-256 hash as **code\_challenge** on the authorize request
* Send the original **code\_verifier** when exchanging the authorization code for tokens
* `expo-auth-session` generates PKCE pairs automatically when `usePKCE: true` - manual generation is for custom backends
* Never use **implicit flow** (`response_type=token`) - access tokens in redirect URLs leak via logs and referrer headers

> **Related:** [Mobile Auth Basics](https://docs.wahwei/reactnative.codeguides.io/auth-session/mobile-auth-basics/) - normalizing OAuth tokens into your `Session` type

---

## Redirect URIs with makeRedirectUri

Redirect URIs must match exactly what you register with each OAuth provider.

```ts
import { makeRedirectUri } from "expo-auth-session";
import * as AuthSession from "expo-auth-session";
 
const redirectUri = makeRedirectUri({
  scheme: "myapp",
  path: "oauth",
});
 
// Examples by environment:
// Dev client / standalone:  myapp://oauth
// Expo Go (proxy):          https://auth.expo.io/@owner/slug  (legacy - avoid for production)
 
const discovery = {
  authorizationEndpoint: "https://accounts.example.com/oauth/authorize",
  tokenEndpoint: "https://accounts.example.com/oauth/token",
};
 
const [request, response, promptAsync] = AuthSession.useAuthRequest(
  {
    clientId: process.env.EXPO_PUBLIC_OAUTH_CLIENT_ID!,
    redirectUri,
    scopes: ["openid", "profile", "email"],
    usePKCE: true,
    responseType: AuthSession.ResponseType.Code,
  },
  discovery,
);
```

* **`makeRedirectUri`** derives the correct URI from your `scheme`, `native`/`development` build, and Expo config
* Register **every** variant (dev, preview, production) in the provider console - mismatches cause `redirect_uri_mismatch`
* Prefer **custom scheme** redirects (`myapp://`) for production - not `exp://` or Expo Go proxy URLs
* Log `redirectUri` once in development to copy into Google Cloud Console and Apple Developer portal

---

## Complete Sign-In Flow

```tsx
import { useEffect } from "react";
import { Button, Text, View } from "react-native";
import * as AuthSession from "expo-auth-session";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
 
WebBrowser.maybeCompleteAuthSession();
 
const redirectUri = makeRedirectUri({ scheme: "myapp", path: "oauth" });
 
const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: `${process.env.EXPO_PUBLIC_API_URL}/oauth/authorize`,
  tokenEndpoint: `${process.env.EXPO_PUBLIC_API_URL}/oauth/token`,
};
 
export function OAuthSignInButton() {
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_OAUTH_CLIENT_ID!,
      redirectUri,
      scopes: ["openid", "profile", "email"],
      usePKCE: true,
    },
    discovery,
  );
 
  useEffect(() => {
    if (response?.type !== "success") return;
 
    const { code } = response.params;
    exchangeCodeOnBackend(code, request?.codeVerifier);
  }, [response]);
 
  return (
    <View>
      <Button
        title="Sign in"
        disabled={!request}
        onPress={() => promptAsync({ preferEphemeralSession: true })}
      />
    </View>
  );
}
 
async function exchangeCodeOnBackend(code: string, codeVerifier?: string) {
  const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/oauth/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, codeVerifier, redirectUri }),
  });
 
  if (!res.ok) throw new Error("OAuth exchange failed");
 
  const { refreshToken, accessToken, expiresAt, userId } = await res.json();
 
  await SecureStore.setItemAsync("auth.refresh_token", refreshToken, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
 
  // Hydrate AuthProvider session state with { accessToken, refreshToken, expiresAt, userId }
}
```

* **`WebBrowser.maybeCompleteAuthSession()`** dismisses the browser tab when the redirect fires - call once at module scope
* Exchange the code on **your backend** when you have a confidential client or need to attach device metadata
* `preferEphemeralSession: true` on iOS avoids sharing cookies with Safari - good for shared devices
* Persist refresh tokens via [SecureStore](https://docs.wahwei/reactnative.codeguides.io/auth-session/securestore-and-keychain-keystore/) after exchange

> **Related:** [../expo-rules/security-rules-for-mobile/security-rules-for-mobile.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/security-rules-for-mobile/) - never ship OAuth client secrets in the bundle

---

## Google Sign-In Quirks

Google requires **separate OAuth client IDs** per platform.

```text
Google Cloud Console → APIs & Services → Credentials
 
┌─────────────────┬──────────────────────────────────────────────┐
│ Client type     │ Used for                                     │
├─────────────────┼──────────────────────────────────────────────┤
│ iOS             │ Bundle ID: com.example.myapp                 │
│ Android         │ Package + SHA-1 signing cert fingerprint     │
│ Web             │ Backend code exchange (client secret)        │
└─────────────────┴──────────────────────────────────────────────┘
```

```ts
// Use the iOS or Android client ID in the app - NOT the web client secret
const GOOGLE_CLIENT_ID = Platform.select({
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  default: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});
```

* **Android** requires the SHA-1 of your **upload key** and **app signing key** from Play Console - add both to Google Cloud
* **iOS** uses the reversed client ID as a URL scheme when using Google SDK - with `expo-auth-session`, your app `scheme` handles the redirect
* The **Web client ID** is for server-side token exchange - its secret stays on the backend
* Enable **Google People API** or relevant scopes only after privacy review - each scope triggers Play Data Safety declarations

Common errors:

| Error | Fix |
| --- | --- |
| `redirect_uri_mismatch` | Copy exact `makeRedirectUri()` output into Google console |
| `invalid_client` on Android | Add correct SHA-1 for the build profile you are testing |
| `access_denied` | OAuth consent screen in Testing mode - add test users |

---

## Apple Sign-In Quirks

Apple Sign In is required when you offer third-party sign-in on iOS for apps in certain categories.

```json
{
  "expo": {
    "ios": {
      "usesAppleSignIn": true,
      "bundleIdentifier": "com.example.myapp"
    },
    "plugins": ["expo-apple-authentication"]
  }
}
```

```bash
npx expo install expo-apple-authentication
```

```tsx
import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";
 
export function AppleSignInButton() {
  if (Platform.OS !== "ios") return null;
 
  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={8}
      style={{ width: "100%", height: 44 }}
      onPress={async () => {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });
 
        await sendAppleCredentialToBackend(credential);
      }}
    />
  );
}
```

* **Full name and email** are returned only on the **first** sign-in - persist immediately server-side
* Apple may relay email via **Hide My Email** - your backend must accept `@privaterelay.appleid.com` addresses
* `expo-apple-authentication` uses native Sign in with Apple - distinct from generic OAuth browser flow
* Offer Apple alongside Google on iOS when Google is present - App Review enforces parity rules in many app categories

---

## Provider Discovery and Custom IdPs

For Auth0, Okta, or Keycloak, use built-in discovery:

```ts
import * as AuthSession from "expo-auth-session";
 
const discovery = await AuthSession.fetchDiscoveryAsync(
  "https://your-tenant.auth0.com",
);
 
const [request, response, promptAsync] = AuthSession.useAuthRequest(
  {
    clientId: process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID!,
    redirectUri: makeRedirectUri({ scheme: "myapp" }),
    scopes: ["openid", "profile", "offline_access"],
    usePKCE: true,
    extraParams: { audience: "https://api.example.com" },
  },
  discovery,
);
```

* **`offline_access`** scope is required on many IdPs to receive a refresh token
* **`audience`** (Auth0) ensures access tokens are minted for your API - not just the IdP userinfo endpoint
* Cache discovery documents - fetching on every render adds latency; store in module scope or context
* Custom IdPs may require **custom URL paths** - verify `authorizationEndpoint` and `tokenEndpoint` in discovery JSON

---

## Development vs Production Checklist

```text
Before shipping OAuth:
□ redirectUri logged and registered for prod scheme (myapp://)
□ Google Android SHA-1 matches EAS production keystore
□ Apple Sign In entitlement present in provisioning profile
□ Backend validates code_verifier (PKCE)
□ Refresh tokens stored in SecureStore - not AsyncStorage
□ Tested on physical device with development build - not only Expo Go
□ OAuth tested after app kill + relaunch (cold start refresh)
```

* **Expo Go** uses Expo's bundle identifier - Google/Apple prod credentials will not match
* Build a **development client** (`expo-dev-client`) with your real bundle ID before OAuth integration testing
* Staging and production should use **separate OAuth clients** - prevents staging tokens working against prod APIs

> **Related:** [Auth Session Lifecycle](https://docs.wahwei/reactnative.codeguides.io/auth-session/auth-session-lifecycle/) - refresh after OAuth on app resume

---

## FAQs

Can I use a WebView for OAuth?

* No - embedded WebViews are vulnerable to MITM, violate provider policies, and cannot share system SSO state.
* Use `expo-auth-session` + `expo-web-browser` (system browser / ASWebAuthenticationSession).

Where does the OAuth client secret go?

* On your backend only - the mobile app sends the authorization code + code\_verifier to your server, which exchanges with the secret.

Why does Google work on iOS but fail on Android?

* Almost always a SHA-1 fingerprint mismatch - run `eas credentials` and add the correct fingerprint to Google Cloud Console.

Do I need universal links for OAuth?

* Custom URL schemes (`myapp://`) are sufficient for most apps.
* Universal links (`https://app.example.com/oauth`) add complexity but avoid scheme collision - optional for enterprise.

How do I handle OAuth cancel?

* `response.type === "cancel"` or `"dismiss"` - show nothing or a soft message; do not treat as an error worth logging to Sentry.

## Related

* [Mobile Auth Basics](https://docs.wahwei/reactnative.codeguides.io/auth-session/mobile-auth-basics/) - session models and logout semantics
* [SecureStore & Keychain/Keystore](https://docs.wahwei/reactnative.codeguides.io/auth-session/securestore-and-keychain-keystore/) - persisting tokens after OAuth exchange
* [Refresh Token Rotation](https://docs.wahwei/reactnative.codeguides.io/auth-session/refresh-token-rotation/) - handling refresh after OAuth sign-in
* [../networking-api/networking-basics/networking-basics.md](https://docs.wahwei/reactnative.codeguides.io/networking-api/networking-basics/) - API calls with OAuth-issued tokens
* [../expo-rules/security-rules-for-mobile/security-rules-for-mobile.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/security-rules-for-mobile/) - client secret and redirect URI rules

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
