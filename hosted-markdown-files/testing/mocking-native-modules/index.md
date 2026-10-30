# Mocking Native Modules

Jest runs in Node - there is no camera, GPS, or Keychain. `jest-expo` stubs most Expo SDK modules with safe defaults; you add manual mocks when your tests need specific permission results, sensor readings, or third-party native SDK behavior.

Highlights / Mocking Native Modules

* `jest-expo` auto-mocks most Expo modules - you override only what your test asserts
* Manual mocks live in `\_\_mocks\_\_/` adjacent to the module or via `jest.mock` inline
* Mock at your app's boundary (hooks/services), not every `node\_modules` import
* Reset mocks in `afterEach` - leaked implementations cause order-dependent flakes
* A passing Jest suite does not prove native code works - complement with Maestro or device QA

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
// __tests__/location-screen-test.tsx
import { render, screen, waitFor } from "@testing-library/react-native";
import * as Location from "expo-location";
import { LocationScreen } from "../src/screens/location-screen";
 
jest.mock("expo-location");
 
const mockLocation = jest.mocked(Location);
 
beforeEach(() => {
  mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
    status: "granted",
    granted: true,
    canAskAgain: true,
    expires: "never",
  });
 
  mockLocation.getCurrentPositionAsync.mockResolvedValue({
    coords: { latitude: 37.77, longitude: -122.42, altitude: 0, accuracy: 5, altitudeAccuracy: 5, heading: 0, speed: 0 },
    timestamp: 1_700_000_000_000,
  });
});
 
test("shows coordinates when permission is granted", async () => {
  render(<LocationScreen />);
  expect(await screen.findByText(/37\.77/)).toBeOnTheScreen();
  await waitFor(() => {
    expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalled();
  });
});
```

**When to reach for this:**

* Components call `expo-location`, `expo-notifications`, `expo-secure-store`, or other native bridges.
* Custom Expo modules or React Native native modules your app imports directly.
* Simulating permission denial, offline storage failures, or SDK error codes.
* Spying on module calls to assert your app reacts correctly - not to skip writing assertions.

## Working Example

```tsx
// src/services/push-token-service.ts
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
 
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }
 
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
 
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
 
  if (finalStatus !== "granted") {
    throw new Error("Push permission denied");
  }
 
  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}
```

```tsx
// __tests__/push-token-service-test.tsx
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { registerForPushNotifications } from "../src/services/push-token-service";
 
jest.mock("expo-notifications");
jest.mock("expo-device");
 
const notifications = jest.mocked(Notifications);
const device = jest.mocked(Device);
 
describe("registerForPushNotifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    device.isDevice = true;
  });
 
  test("returns token when permission already granted", async () => {
    notifications.getPermissionsAsync.mockResolvedValue({
      status: "granted",
      granted: true,
      canAskAgain: true,
      expires: "never",
    });
    notifications.getExpoPushTokenAsync.mockResolvedValue({
      data: "ExponentPushToken[abc]",
      type: "expo",
    });
 
    await expect(registerForPushNotifications()).resolves.toBe(
      "ExponentPushToken[abc]"
    );
    expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });
 
  test("requests permission when not yet granted", async () => {
    notifications.getPermissionsAsync.mockResolvedValue({
      status: "undetermined",
      granted: false,
      canAskAgain: true,
      expires: "never",
    });
    notifications.requestPermissionsAsync.mockResolvedValue({
      status: "granted",
      granted: true,
      canAskAgain: true,
      expires: "never",
    });
    notifications.getExpoPushTokenAsync.mockResolvedValue({
      data: "ExponentPushToken[xyz]",
      type: "expo",
    });
 
    await expect(registerForPushNotifications()).resolves.toBe(
      "ExponentPushToken[xyz]"
    );
    expect(notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });
 
  test("throws when permission denied", async () => {
    notifications.getPermissionsAsync.mockResolvedValue({
      status: "denied",
      granted: false,
      canAskAgain: false,
      expires: "never",
    });
 
    await expect(registerForPushNotifications()).rejects.toThrow(
      "Push permission denied"
    );
  });
 
  test("returns null on simulator", async () => {
    device.isDevice = false;
 
    await expect(registerForPushNotifications()).resolves.toBeNull();
    expect(notifications.getPermissionsAsync).not.toHaveBeenCalled();
  });
});
```

**What this demonstrates:**

* **`jest.mock("expo-*")`** - replaces the module with auto-mocked functions you configure per test.
* **`jest.mocked()`** - typed access to mock implementations in TypeScript.
* **Service-layer tests** - native calls isolated in one module; UI tests mock the service instead of three Expo packages.
* **Explicit permission branches** - each status (`granted`, `denied`, `undetermined`) gets its own test.
* **`jest.clearAllMocks()` in `beforeEach`** - prevents call-count leakage between tests.

## Deep Dive

### How It Works

* **`jest-expo` preset** installs default mocks for Expo modules so imports do not crash Jest. Defaults return resolved promises with generic "success" shapes - rarely matching your production edge cases.
* **`jest.mock("module-name")`** hoists to the top of the file and swaps the module before your imports evaluate. Works for `expo-*`, `@react-native-async-storage/async-storage`, and app-local modules.
* **Manual mocks** in `__mocks__/` next to `node_modules` package name or `src/` file apply when you call `jest.mock` without a factory.
* **Spy pattern** - `jest.spyOn(module, "fn")` wraps a single function while leaving the rest real (when not fully mocked).
* **Boundary mocking** - mock `src/services/api.ts`, not `fetch` and not every transitive import, unless testing the HTTP client itself.

### What jest-expo Mocks vs What You Must Mock

| Category | jest-expo default | You override when |
| --- | --- | --- |
| `expo-constants`, `expo-font` | Safe stubs | App reads specific `extra` config values |
| `expo-location`, `expo-camera` | Generic granted/success | Testing denial, timeout, or sensor errors |
| `expo-notifications` | Basic async fns | Permission flows and token shapes |
| Custom native module | Not mocked | Always - provide manual mock or wrapper |
| Third-party RN SDK (analytics, ads) | Not mocked | Mock at import site or facade module |

### Manual Mock Patterns

**Inline factory (per test file):**

```tsx
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
```

**Shared manual mock file:**

```
src/
  services/
    analytics.ts
  __mocks__/
    analytics.ts      # manual mock - jest.mock("../services/analytics") picks it up
```

```ts
// src/__mocks__/analytics.ts
export const trackEvent = jest.fn();
export const identifyUser = jest.fn();
```

**Re-export real module with one spy:**

```tsx
jest.mock("expo-linking", () => {
  const actual = jest.requireActual<typeof import("expo-linking")>("expo-linking");
  return {
    ...actual,
    openURL: jest.fn(actual.openURL),
  };
});
```

### Avoiding False Confidence

| Passing Jest test | Still verify on device |
| --- | --- |
| Mocked camera returns a URI | Real camera permissions and capture pipeline |
| Mocked biometrics always succeeds | Face ID / fingerprint failure UI |
| Mocked push token string | APNs/FCM registration on physical hardware |
| Mocked deep link URL | OS opening the app from cold start |

Treat Jest native mocks as **contract tests for your JS reaction** - not proof the native bridge works. Add [Maestro E2E](https://docs.wahwei/reactnative.codeguides.io/testing/maestro-e2e/) or manual QA for permission dialogs and hardware paths.

### TypeScript Notes

```tsx
import type { LocationObject } from "expo-location";
 
function buildLocation(overrides: Partial<LocationObject> = {}): LocationObject {
  return {
    coords: {
      latitude: 0,
      longitude: 0,
      altitude: 0,
      accuracy: 0,
      altitudeAccuracy: 0,
      heading: 0,
      speed: 0,
    },
    timestamp: Date.now(),
    ...overrides,
  };
}
 
mockLocation.getCurrentPositionAsync.mockResolvedValue(
  buildLocation({ coords: { latitude: 51.5, longitude: -0.12, altitude: 0, accuracy: 1, altitudeAccuracy: 1, heading: 0, speed: 0 } })
);
```

* Import **types** from the real package even when the implementation is mocked.
* Use `jest.mocked(fn)` instead of `(fn as jest.Mock)` for stricter typing.
* Factory mocks can call `jest.requireActual` to preserve unmocked exports and reduce drift.

## Gotchas

* **Assuming jest-expo defaults match your test** - Default permission mocks often return `granted`. Tests never exercise denial paths unless you override. **Fix:** Set `mockResolvedValue` for each permission/status scenario explicitly.
* **Mocking too deep** - Mocking `react-native` internals or every `expo-*` import makes tests brittle when SDK updates changes signatures. **Fix:** Mock your service boundary; keep one module responsible for native calls.
* **Forgetting `jest.clearAllMocks()`** - Call counts and queued implementations leak across tests. **Fix:** `afterEach` in `jest.setup.ts` or `beforeEach` in describe blocks that use spies.
* **`jest.requireActual` after full mock** - Spreading `requireActual` for native modules can pull real native bindings into Jest and crash. **Fix:** Mock only the functions you call; avoid `requireActual` on modules that touch native code.
* **False confidence from green suites** - All native behavior faked; production still fails on a real device. **Fix:** Document which flows need Maestro or manual device checks in PR templates.
* **Dynamic `import()` bypassing mocks** - Lazy imports may resolve before `jest.mock` applies if mis-ordered. **Fix:** Use static imports in code under test, or `jest.unstable_mockModule` for ESM dynamic import paths.
* **Duplicating mock setup in every file** - Copy-pasted `expo-font` mocks drift. **Fix:** Shared helpers in `test-utils/native-mocks.ts` or global mocks in `jest.setup.ts` for app-wide modules (fonts, splash screen).

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `jest-expo` auto-mocks | Default - module imports should not crash Jest | You need realistic permission denial without overrides |
| Inline `jest.mock` factory | Per-test-file control of return values | Same mock repeated in 20 files - extract a helper |
| `__mocks__/` manual files | Shared mock across many tests | One-off behavior only used once |
| Service facade + mock facade | Clean architecture, swappable implementations | Throwaway prototype with no service layer |
| Maestro / Detox on device | Real OS permissions and native UI | Fast feedback on pure logic branches |
| `@shopify/react-native-skia` mock community packages | Heavy native deps with published Jest shims | Expo modules already covered by `jest-expo` |

## FAQs

Does jest-expo mock every Expo module?

It mocks the majority of `expo-*` packages shipped with the SDK. Custom native modules, bare third-party SDKs, and some community packages are not covered - add `jest.mock` manually.

Where do I put shared mocks?

* App-wide: `jest.setup.ts` (fonts, splash screen, constants).
* Feature-specific: top of the test file or `__tests__/helpers/`.
* Package-style: `__mocks__/expo-location.ts` at project root for `jest.mock("expo-location")` auto-resolution.

jest.mock vs jest.spyOn?

* `jest.mock` replaces the entire module - use for native bridges.
* `jest.spyOn` wraps one method - use when most of the module should stay real (rare with native modules in Jest).

How do I mock AsyncStorage?

```tsx
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
```

The package ships an official Jest mock - prefer it over hand-rolled key-value objects.

How do I mock expo-router?

Prefer `renderRouter` from `expo-router/testing-library` over mocking `useRouter` when testing navigation. For leaf components, pass navigation callbacks as props instead of mocking the router hook.

Can I mock only one function in a module?

```tsx
jest.mock("expo-linking", () => ({
  ...jest.requireActual("expo-linking"),
  openURL: jest.fn(() => Promise.resolve(true)),
}));
```

Use sparingly - `requireActual` on native-heavy modules can fail; a thin wrapper module is safer.

Why does my mock not apply?

* `jest.mock` must be at module scope (hoisted), not inside `it`/`beforeEach`.
* Ensure the import path matches exactly what production code imports.
* Clear Metro/Jest cache: `npx jest --clearCache`.

Should I mock fetch or the API client?

Mock `src/api/client` or the TanStack Query `queryFn` wrapper - not both. One boundary keeps tests focused on how the app handles success and error responses.

How do I simulate permission denial?

```tsx
mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
  status: "denied",
  granted: false,
  canAskAgain: false,
  expires: "never",
});
```

Match the shape from the real Expo module's TypeScript types - incomplete objects cause false positives.

What is false confidence?

Tests pass because mocks always return success, while real users hit denial dialogs, airplane mode, or OS bugs. Complement Jest with [Maestro E2E](https://docs.wahwei/reactnative.codeguides.io/testing/maestro-e2e/) for permission and OS-integration paths.

How do I test a custom Expo native module?

Create a TypeScript facade that imports your module. In Jest, `jest.mock("@/modules/my-native-module")` with a manual mock returning the JS API your app expects. Validate the real module on device builds.

Do mocks belong in setupFilesAfterEnv?

Only for modules every test needs (fonts, splash, reanimated silence). Feature mocks belong next to the tests that assert on them - global mocks hide missing setup in new tests.

How do I reset mocks between tests?

```ts
afterEach(() => {
  jest.clearAllMocks(); // clears call history
  // jest.resetAllMocks(); // also resets implementations - use when tests override mockResolvedValue
});
```

Add to `jest.setup.ts` for project-wide consistency.

## Related

* [Jest Setup for Expo](https://docs.wahwei/reactnative.codeguides.io/testing/jest-setup-for-expo/) - `jest-expo` preset and global setup
* [React Native Testing Library](https://docs.wahwei/reactnative.codeguides.io/testing/react-native-testing-library/) - assert UI after mocks resolve
* [Mobile Testing Basics](https://docs.wahwei/reactnative.codeguides.io/testing/mobile-testing-basics/) - what belongs in unit vs E2E layers
* [Maestro E2E](https://docs.wahwei/reactnative.codeguides.io/testing/maestro-e2e/) - real device flows mocks cannot replace
* [Expo Modules Core](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-modules-core/) - how native modules expose JS APIs
* [Native Modules Basics](https://docs.wahwei/reactnative.codeguides.io/native-modules/native-modules-basics/) - custom bridges that always need manual mocks

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
