# Biometrics with LocalAuthentication

`expo-local-authentication` wraps **Face ID**, **Touch ID**, and **Android biometrics** for step-up authentication. Biometrics answer "is the person holding the phone the device owner?" - they do not replace your backend session.

Highlights / Biometrics with LocalAuthentication

* Biometrics prove user presence - they do not replace server authentication
* Use expo-local-authentication for Face ID, Touch ID, and Android fingerprint
* Step-up auth re-prompts biometrics before sensitive actions - transfers, password changes
* Offer passcode fallback - Apple requires it; never trap users without biometrics enrolled
* Store tokens in SecureStore; biometrics gate reading them - not a second password store
* Respect accessibility - always provide PIN/password path for users who cannot use biometrics

## Prerequisites

```bash
npx expo install expo-local-authentication expo-secure-store
```

Add the Face ID usage description on iOS:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSFaceIDUsageDescription": "Unlock MyApp and confirm sensitive actions."
      }
    }
  }
}
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**.

---

## Capability Check Before Prompting

Never call `authenticateAsync` without checking hardware and enrollment.

```ts
import * as LocalAuthentication from "expo-local-authentication";
 
export type BiometricCapability =
  | { available: false; reason: "no_hardware" | "not_enrolled" }
  | { available: true; types: LocalAuthentication.AuthenticationType[] };
 
export async function getBiometricCapability(): Promise<BiometricCapability> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) {
    return { available: false, reason: "no_hardware" };
  }
 
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!enrolled) {
    return { available: false, reason: "not_enrolled" };
  }
 
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  return { available: true, types };
}
```

* **`hasHardwareAsync`** - device has biometric sensor (or secure enclave for Face ID)
* **`isEnrolledAsync`** - user has registered at least one fingerprint or face
* **`supportedAuthenticationTypesAsync`** - returns `FINGERPRINT`, `FACIAL_RECOGNITION`, `IRIS` bitmask
* When unavailable, fall back to **password re-entry** or **device passcode** - never brick the flow

---

## App Unlock Pattern

Gate access to stored refresh tokens behind biometrics on cold start.

```tsx
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { secureTokenStorage } from "@/features/auth/adapters/secureTokenStorage";
import { refreshFromStoredToken } from "@/features/auth/api/refreshSession";
 
type UnlockState = "checking" | "locked" | "unlocked";
 
export function BiometricGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UnlockState>("checking");
 
  useEffect(() => {
    (async () => {
      const token = await secureTokenStorage.loadRefreshToken();
      if (!token) {
        setState("unlocked"); // no session - auth flow handles sign-in
        return;
      }
 
      const capability = await getBiometricCapability();
      if (!capability.available) {
        await refreshFromStoredToken();
        setState("unlocked");
        return;
      }
 
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock MyApp",
        cancelLabel: "Sign out",
        disableDeviceFallback: false,
      });
 
      if (result.success) {
        await refreshFromStoredToken();
        setState("unlocked");
      } else {
        setState("locked");
      }
    })();
  }, []);
 
  if (state === "checking") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }
 
  if (state === "locked") {
    return <SignOutOrRetryScreen onRetry={() => setState("checking")} />;
  }
 
  return <>{children}</>;
}
```

* Prompt **after** confirming a refresh token exists - no biometrics on first-time users
* `disableDeviceFallback: false` allows device PIN - required for App Store accessibility expectations
* **Cancel → Sign out** is clearer than an infinite lock screen
* Refresh session **after** successful biometric - access token stays in memory until unlock

> **Related:** [SecureStore & Keychain/Keystore](https://docs.wahwei/reactnative.codeguides.io/auth-session/securestore-and-keychain-keystore/) - where refresh tokens persist

---

## Step-Up Auth for Sensitive Actions

Re-prompt biometrics before high-risk operations even when the user is already signed in.

```ts
import * as LocalAuthentication from "expo-local-authentication";
 
export async function requireStepUpAuth(actionLabel: string): Promise<boolean> {
  const capability = await getBiometricCapability();
 
  if (!capability.available) {
    // Fall back to password modal or MFA challenge
    return promptPasswordModal(actionLabel);
  }
 
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: `Confirm ${actionLabel}`,
    fallbackLabel: "Use passcode",
  });
 
  return result.success;
}
```

```tsx
// Wire transfer screen
async function handleTransfer() {
  const confirmed = await requireStepUpAuth("wire transfer");
  if (!confirmed) return;
 
  await api.post("/transfers", { amount, toAccount });
}
```

* **Step-up** is time-bound - re-prompt if the sensitive screen was backgrounded > 60 seconds
* Server should accept a **step-up token** or recent MFA timestamp for high-risk endpoints - client biometrics alone are not proof for the backend
* Actions warranting step-up: money movement, password change, export PII, disable 2FA, add trusted device
* Log step-up failures without storing biometric data - only success/failure enum

---

## Settings Toggle: Opt-In Biometric Unlock

Let users enable or disable biometric unlock without affecting their server session.

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";
 
const BIOMETRIC_PREF_KEY = "prefs.biometric_unlock_enabled";
 
export async function isBiometricUnlockEnabled() {
  return (await AsyncStorage.getItem(BIOMETRIC_PREF_KEY)) === "1";
}
 
export async function setBiometricUnlockEnabled(enabled: boolean) {
  if (enabled) {
    const capability = await getBiometricCapability();
    if (!capability.available) {
      throw new Error("Biometrics not available on this device");
    }
    // Prove enrollment works before saving preference
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Enable biometric unlock",
    });
    if (!result.success) return false;
  }
 
  await AsyncStorage.setItem(BIOMETRIC_PREF_KEY, enabled ? "1" : "0");
  return true;
}
```

* **Preference** in AsyncStorage is fine - it is not a secret, just a boolean flag
* Require a **successful biometric** when enabling - prevents toggling on without verifying it works
* Disabling biometrics does not sign the user out - only removes the unlock gate
* Re-prompt enrollment check after OS update - users may add/remove fingerprints

---

## Android vs iOS Behavior

```text
┌────────────────┬─────────────────────────────┬──────────────────────────────┐
│ Concern        │ iOS                         │ Android                      │
├────────────────┼─────────────────────────────┼──────────────────────────────┤
│ Face           │ Face ID (TrueDepth)         │ Face unlock (vendor-dependent)│
│ Fingerprint    │ Touch ID (older devices)    │ Fingerprint / under-display  │
│ Fallback       │ Device passcode via system  │ Device PIN/pattern           │
│ Prompt         │ ASAuthorization-style sheet │ BiometricPrompt API          │
│ Cancel         │ User cancel ≠ failure lock  │ Vendor-specific              │
└────────────────┴─────────────────────────────┴──────────────────────────────┘
```

```ts
import { Platform } from "react-native";
 
const promptMessage = Platform.select({
  ios: "Unlock with Face ID",
  android: "Confirm with fingerprint",
  default: "Authenticate",
});
```

* Test on **physical devices** - simulators emulate biometrics with enrolled/not-enrolled toggles but miss vendor quirks
* Android **face unlock** security level varies by OEM - treat step-up on Android as UX convenience, not strong assurance
* iOS **Face ID** in simulator: Features → Face ID → Enrolled, then Matching Face
* Do not cache `authenticateAsync` results - each sensitive action gets a fresh prompt

---

## Security Limits

```text
What biometrics DO                    What biometrics DO NOT
────────────────────────────────────  ─────────────────────────────────────
Prove recent user presence            Replace server-side MFA
Speed up returning-user UX            Encrypt data (use SecureStore)
Reduce shoulder-surfing vs typing PIN   Survive jailbreak extraction alone
Meet some regulatory step-up UX       Prove identity to your API without backend
```

* Pair biometrics with **short access token TTL** and [refresh rotation](https://docs.wahwei/reactnative.codeguides.io/auth-session/refresh-token-rotation/)
* For regulated apps, send a **backend step-up challenge** after local biometric success
* Never store biometric templates - Expo does not expose them; do not build custom biometric storage
* See [Security Rules for Mobile](https://docs.wahwei/reactnative.codeguides.io/expo-rules/security-rules-for-mobile/) for defense-in-depth expectations

---

## FAQs

Should I use biometrics instead of a login password?

* No - users still sign in with password/OAuth once.
* Biometrics unlock an existing session stored in SecureStore - they are not a credential replacement.

What happens after too many failed attempts?

* iOS/Android lock out biometrics temporarily - fall back to device passcode via `disableDeviceFallback: false`.
* Your app should offer explicit sign-out - do not implement custom lockout counters on top of OS behavior.

Can I require biometrics for every API call?

* Impractical - users would face dozens of prompts.
* Use step-up for sensitive mutations; rely on access tokens for routine reads.

Does expo-local-authentication work in background tasks?

* No - biometric UI requires foreground user interaction.
* Background refresh uses refresh tokens without biometric gate - see Auth Session Lifecycle.

## Related

* [SecureStore & Keychain/Keystore](https://docs.wahwei/reactnative.codeguides.io/auth-session/securestore-and-keychain-keystore/) - token storage under biometric gate
* [Mobile Auth Basics](https://docs.wahwei/reactnative.codeguides.io/auth-session/mobile-auth-basics/) - session models and sign-out
* [Auth Session Lifecycle](https://docs.wahwei/reactnative.codeguides.io/auth-session/auth-session-lifecycle/) - foreground unlock vs background refresh
* [../expo-rules/security-rules-for-mobile/security-rules-for-mobile.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/security-rules-for-mobile/) - step-up and storage rules

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
