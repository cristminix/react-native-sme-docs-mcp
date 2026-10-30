# Expo SDK Packages Best Practices

A condensed summary of **25 essentials** for Expo SDK 57 packages - install hygiene, permission rationale copy, storage tiers, and graceful denial UX. Drawn from every page in this section.

Highlights / Expo SDK Packages Best Practices

* 25 essentials for installing, permissioning, and operating Expo SDK modules
* Always npx expo install - never drift from the SDK compatibility matrix
* Pre-prompt before every OS permission dialog - especially notifications and location
* Graceful denial: Settings deep link, degraded mode, never infinite spinners
* Secrets in SecureStore; files in FileSystem; relational data in SQLite
* Background work is deferrable - foreground reconnect remains primary

1. **Always add Expo modules with `npx expo install`:** Plain `npm install` can pull native ABIs untested against your `expo` pin - run `npx expo install --fix` after every SDK bump.
2. **Treat `expo` ~57.0.4 as the contract:** Every `expo-*` version is validated against SDK 57 - mixing generations causes native compile failures, not graceful JS errors.
3. **Run `npx expo doctor` before native builds:** Catches duplicate React Native copies, wrong module versions, and missing config plugins before expensive EAS minutes burn.
4. **Config plugins require a new binary:** Permission strings, background modes, and notification icons are not OTA-safe - plan store releases when plugins change.
5. **Pre-prompt before OS permission dialogs:** Show in-app rationale (why + benefit) on a dedicated screen - requesting on first mount maximizes permanent denials.
6. **Match plugin strings to in-app copy:** iOS App Review compares `Info.plist` usage descriptions to UI - vague "needs location" copy fails review.
7. **Offer graceful denial paths:** When users deny, show `Linking.openSettings()` guidance and a **degraded mode** that still delivers core value without the capability.
8. **Request the narrowest permission tier first:** Location When-In-Use before Always; camera only when user taps capture; photos library only for gallery picks.
9. **Register TaskManager tasks in global scope:** `defineTask` at app entry - never inside components - or cold-start background wakes find no handler.
10. **Import notification handlers before first push:** `setNotificationHandler` side-effect at `index.ts` or `_layout.tsx` top - not lazily inside a screen.
11. **Create Android notification channels before posting:** Android 8+ silently drops notifications without a channel - separate transactional vs marketing channels.
12. **Register push tokens server-side per device:** Upsert on reinstall; delete on logout - tokens in React state alone do not survive process death.
13. **Test push and background location on development builds:** Expo Go is insufficient for final QA of credentials, icons, and `UIBackgroundModes`.
14. **Stop location watches on unmount:** `subscription.remove()` in `useEffect` cleanup - forgotten watchers drain battery and leak callbacks.
15. **Downscale images before preview and upload:** Full-resolution URIs in `<Image>` cause OOM on mid-tier Android - resize to 1280–1920px and JPEG 0.7–0.8.
16. **Store file paths in SQLite, not blobs:** Photos and PDFs live in `expo-file-system`; databases hold URIs and metadata only.
17. **Prefer SDK 57 `File` / `Directory` / `Paths`:** Use `expo-file-system/legacy` only during migration - URI string concat is a common Android path bug.
18. **Never store refresh tokens in AsyncStorage or plain files:** Use `expo-secure-store` with `WHEN_UNLOCKED_THIS_DEVICE_ONLY` - see [../auth-session/securestore-and-keychain-keystore/securestore-and-keychain-keystore.md](https://docs.wahwei/reactnative.codeguides.io/auth-session/securestore-and-keychain-keystore/).
19. **Use `expo-crypto` for randomness and digests:** PKCE verifiers and nonces need `getRandomBytes` - never `Math.random()`; hash cache keys, not passwords for server auth.
20. **Clear SecureStore on logout and account switch:** Namespace keys per `userId`; pair with `queryClient.clear()` and navigation reset - stale vault entries are a security defect.
21. **OTA updates change JS only:** Native module additions, permission strings, and SDK bumps need a store binary - use `expo-updates` check/fetch/reload for bundle fixes only.
22. **Prompt before `reloadAsync`:** Mid-form reload loses state - fetch silently, reload on idle screens or after explicit user consent.
23. **Treat background tasks as a safety net:** Foreground NetInfo flush is primary; `minimumInterval: 15` minutes is not real-time - batch work and return `Success`/`Failed` honestly.
24. **Keep background handlers free of React:** Open SQLite and `fetch` imperatively inside `defineTask` - hooks and Query clients do not exist in OS wake entry.
25. **Document capability matrices per build flavor:** Maintain a table of which SDK features work in dev client vs production - prevents shipping features that only worked in Expo Go.

## FAQs

What is the default install command for any Expo SDK package?

```bash
npx expo install <package-name>
```

Never `npm install expo-*@latest` unless you are intentionally upgrading the SDK with a changelog review.

What should denial UX always include?

* Clear explanation of what the user misses without the permission.
* A button to open **Settings** when status is `denied`.
* A **continue without** path when the feature is optional.

Where do secrets, files, and cache belong?

| Tier | Store |
| --- | --- |
| Refresh tokens | `expo-secure-store` |
| PDFs / photos | `expo-file-system` (`document` vs `cache`) |
| Relational rows | `expo-sqlite` |
| Theme / flags | AsyncStorage or MMKV |

How does this section relate to auth-session?

* OAuth and session lifecycle live in **auth-session**.
* SDK packages here supply the **primitives** - SecureStore vault, crypto randomness, file uploads for attachments.

## Related

* [Expo SDK Basics](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-sdk-basics/) - install and lifecycle
* [expo-notifications](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-notifications/) - push and channels
* [expo-location](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-location/) - disclosure strings
* [expo-camera & expo-image-picker](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-camera-and-expo-image-picker/) - capture memory safety
* [expo-file-system](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-file-system/) - sandboxed storage
* [expo-secure-store & expo-crypto](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-secure-store-and-expo-crypto/) - secrets and hashing
* [expo-updates (Client API)](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-updates-client-api/) - check/fetch/reload
* [expo-task-manager & Background Tasks](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-task-manager-and-background-tasks/) - deferred work
* [../auth-session/best-practices/best-practices.md](https://docs.wahwei/reactnative.codeguides.io/auth-session/best-practices/) - auth-specific security
* [../expo-rules/security-rules-for-mobile/security-rules-for-mobile.md](https://docs.wahwei/reactnative.codeguides.io/expo-rules/security-rules-for-mobile/) - mobile security checklist

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
