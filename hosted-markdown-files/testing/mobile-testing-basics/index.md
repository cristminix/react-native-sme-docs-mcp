# Mobile Testing Basics

10 examples to get you started with Mobile Testing - 7 basic and 3 intermediate.

Highlights / Mobile Testing Basics

* The pyramid is wide at the bottom: many fast unit tests, fewer E2E flows
* jest-expo preset mocks most Expo modules so Jest runs in Node without a simulator
* React Native Testing Library queries mirror how users find UI - label and role before testID
* Mock native modules at the boundary; never assert on implementation details inside components
* Maestro YAML flows are cheap smoke tests; Detox fits when you need native synchronization
* Contract tests catch API shape drift before a store build ships to production users

## Prerequisites

Expo SDK 57 ships Jest integration through **jest-expo**. Add React Native Testing Library for component tests:

```bash
npx create-expo-app@latest MyTestApp --template blank-typescript
cd MyTestApp
npx expo install jest-expo @testing-library/react-native @types/jest --dev
```

Wire the preset in `package.json` and add a setup file for RNTL matchers:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "jest": {
    "preset": "jest-expo",
    "setupFilesAfterEnv": ["<rootDir>/jest.setup.ts"]
  }
}
```

```ts
// jest.setup.ts
import "@testing-library/react-native/extend-expect";
```

Run the suite locally before every PR:

```bash
npm test
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**. E2E snippets assume a dev or release build - Expo Go alone is not enough for Detox or most Maestro production flows.

---

## Basic Examples

### 1. The Testing Pyramid for React Native

Mobile apps need a **layered strategy**: fast tests run on every save; slow tests run before release.

```text
           ┌─────────────┐
           │  E2E flows  │  few - Maestro / Detox on real builds
           ├─────────────┤
           │ Integration │  some - screens + navigation + mocked APIs
           ├─────────────┤
           │  Component  │  many - RNTL, user-visible behavior
           ├─────────────┤
           │    Unit     │  most - pure functions, reducers, hooks logic
           └─────────────┘
```

| Layer | Runs in | Typical tools | When it fails |
| --- | --- | --- | --- |
| Unit | Node (ms) | Jest | Bad math, bad state transitions |
| Component | Node (ms) | Jest + RNTL | Wrong label, missing button |
| Integration | Node (s) | Jest + RNTL + mocks | Screen flow breaks across files |
| E2E | Simulator/device (min) | Maestro, Detox | Real navigation, native bridges, timing |

* **Invest in the base** - a five-minute E2E suite cannot replace hundreds of unit tests for edge cases
* **Push native I/O to boundaries** - mock `expo-secure-store`, `fetch`, and sensors in Jest; exercise them in E2E
* **One failing layer should localize blame** - if unit and component tests pass but E2E fails, suspect navigation, permissions, or real network
* Flaky E2E often means you have **too many E2E tests** - move assertions down the pyramid

> **Related:** [Testing Best Practices](https://docs.wahwei/reactnative.codeguides.io/testing/best-practices/) - what to run before every store submission

---

### 2. Unit Test a Pure Function

Unit tests are the pyramid base: no React tree, no native modules, sub-millisecond feedback.

```ts
// src/lib/formatPrice.ts
export function formatPrice(cents: number, currency = "USD"): string {
  if (!Number.isFinite(cents) || cents < 0) {
    throw new RangeError("cents must be a non-negative finite number");
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}
```

```ts
// src/lib/formatPrice.test.ts
import { formatPrice } from "./formatPrice";
 
describe("formatPrice", () => {
  it("formats whole dollars", () => {
    expect(formatPrice(1200)).toBe("$12.00");
  });
 
  it("rejects negative values", () => {
    expect(() => formatPrice(-1)).toThrow(RangeError);
  });
});
```

* Colocate tests as `*.test.ts` next to the module or under `__tests__/` - both work; pick one convention per repo
* **No `render()` here** - if you need a component tree, that is a component or integration test
* Test edge cases the UI will hit: empty strings, zero, overflow, timezone boundaries for date helpers
* Reducers, validators, and URL parsers belong in this layer - they are cheap to maintain and high value

> **Related:** [Jest Setup for Expo](https://docs.wahwei/reactnative.codeguides.io/testing/jest-setup-for-expo/) - preset, transforms, and snapshot discipline

---

### 3. Component Test with React Native Testing Library

Component tests assert what the user sees - text, roles, and press outcomes - not internal state variable names.

```tsx
// src/components/PrimaryButton.tsx
import { Pressable, Text, StyleSheet } from "react-native";
 
type Props = {
  label: string;
  onPress: () => void;
};
 
export function PrimaryButton({ label, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.button}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}
 
const styles = StyleSheet.create({
  button: { backgroundColor: "#2563eb", padding: 12, borderRadius: 8 },
  label: { color: "#fff", textAlign: "center", fontWeight: "600" },
});
```

```tsx
// src/components/PrimaryButton.test.tsx
import { render, screen, userEvent } from "@testing-library/react-native";
import { PrimaryButton } from "./PrimaryButton";
 
describe("PrimaryButton", () => {
  it("calls onPress when tapped", async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
 
    render(<PrimaryButton label="Continue" onPress={onPress} />);
    await user.press(screen.getByRole("button", { name: "Continue" }));
 
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

* **`userEvent.press`** simulates the full press lifecycle - prefer it over raw `fireEvent` for closer-to-user behavior
* Query with **`getByRole` + `name`** when possible - it enforces accessible labels you will reuse in E2E
* `render` still runs in Node; native views are mocked - that is why the layer is fast
* One assertion focus per test keeps failures readable in CI logs

> **Related:** [React Native Testing Library](https://docs.wahwei/reactnative.codeguides.io/testing/react-native-testing-library/) - query priority, async utilities, and anti-patterns

---

### 4. Query by What the User Sees

RNTL query priority mirrors accessibility: label and role beat `testID`, and `testID` beats brittle CSS-like selectors (which do not exist in RN anyway).

```tsx
import { View, Text, TextInput, StyleSheet } from "react-native";
 
export function EmailField() {
  return (
    <View>
      <Text nativeID="email-label">Email</Text>
      <TextInput
        accessibilityLabel="Email"
        accessibilityLabelledBy="email-label"
        placeholder="you@example.com"
        style={styles.input}
      />
    </View>
  );
}
 
const styles = StyleSheet.create({
  input: { borderWidth: 1, borderColor: "#d1d5db", padding: 10, borderRadius: 8 },
});
```

```tsx
import { render, screen } from "@testing-library/react-native";
import { EmailField } from "./EmailField";
 
it("exposes the email field by accessible name", () => {
  render(<EmailField />);
  expect(screen.getByLabelText("Email")).toBeTruthy();
});
```

* **`getByLabelText`** ties tests to the same strings VoiceOver and TalkBack read aloud
* Reach for **`testID` only when** role and label cannot disambiguate duplicate controls
* Avoid querying by component type alone (`UNSAFE_getByType`) - refactors break those tests instantly
* If a query is awkward, fix the component's accessibility first, then the test

> **Related:** [React Native Testing Library](https://docs.wahwei/reactnative.codeguides.io/testing/react-native-testing-library/) - `within`, async `findBy*`, and debug output

---

### 5. Mock a Native Module at the Boundary

Jest runs in Node - native bridges are unavailable unless mocked. Mock the module, not your component's internals.

```tsx
// src/hooks/useHapticTap.ts
import * as Haptics from "expo-haptics";
 
export async function useHapticTap() {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}
```

```ts
// src/hooks/useHapticTap.test.ts
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light" },
}));
 
import * as Haptics from "expo-haptics";
import { useHapticTap } from "./useHapticTap";
 
it("fires light impact on tap", async () => {
  await useHapticTap();
  expect(Haptics.impactAsync).toHaveBeenCalledWith("light");
});
```

* Place **`jest.mock` before imports** of the module under test (Jest hoists mocks, but keep the pattern consistent)
* Assert the **contract you rely on** - function called with expected args - not that a private helper ran
* `jest-expo` auto-mocks many Expo modules; **override** when you need deterministic return values
* Mocked native success does not prove the real bridge works - schedule a dev-build check or E2E tap for critical paths

> **Related:** [Mocking Native Modules](https://docs.wahwei/reactnative.codeguides.io/testing/mocking-native-modules/) - manual mocks, `__mocks__`, and false-confidence traps

---

### 6. Integration Test a Screen Flow

Integration tests render a screen (or navigator slice), interact across child components, and assert the combined outcome.

```tsx
// src/screens/SignInScreen.tsx
import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
 
export function SignInScreen({ onSubmit }: { onSubmit: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const canSubmit = email.includes("@");
 
  return (
    <View style={styles.screen}>
      <Text accessibilityRole="header">Sign in</Text>
      <TextInput
        accessibilityLabel="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={styles.input}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue"
        disabled={!canSubmit}
        onPress={() => onSubmit(email)}
        style={[styles.button, !canSubmit && styles.disabled]}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { padding: 24, gap: 12 },
  input: { borderWidth: 1, borderColor: "#d1d5db", padding: 10, borderRadius: 8 },
  button: { backgroundColor: "#2563eb", padding: 12, borderRadius: 8 },
  disabled: { opacity: 0.4 },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "600" },
});
```

```tsx
// src/screens/SignInScreen.test.tsx
import { render, screen, userEvent } from "@testing-library/react-native";
import { SignInScreen } from "./SignInScreen";
 
it("submits a valid email", async () => {
  const user = userEvent.setup();
  const onSubmit = jest.fn();
 
  render(<SignInScreen onSubmit={onSubmit} />);
  await user.type(screen.getByLabelText("Email"), "user@example.com");
  await user.press(screen.getByRole("button", { name: "Continue" }));
 
  expect(onSubmit).toHaveBeenCalledWith("user@example.com");
});
```

* Integration tests **wire multiple components** - buttons, inputs, and conditional enablement - without booting a simulator
* Mock **network and storage at the screen edge** (`fetch`, `expo-secure-store`) so the test stays deterministic
* Prefer one happy path plus one validation failure per screen; exhaust every edge case in unit tests instead
* When flows cross routes, wrap with a **test `NavigationContainer`** and seed initial state

> **Related:** [Jest Setup for Expo](https://docs.wahwei/reactnative.codeguides.io/testing/jest-setup-for-expo/) - mocking navigation and global fetch

---

### 7. Snapshot Sparingly

Snapshots catch unintended visual tree drift, but overuse creates noisy diffs teams rubber-stamp.

```tsx
import { render } from "@testing-library/react-native";
import { Text, View } from "react-native";
 
function Badge({ count }: { count: number }) {
  return (
    <View>
      <Text>{count} unread</Text>
    </View>
  );
}
 
it("matches stable badge markup", () => {
  const { toJSON } = render(<Badge count={3} />);
  expect(toJSON()).toMatchSnapshot();
});
```

* Snapshots are **cheap to add and expensive to review** - limit them to stable, presentational leaf components
* Never snapshot an entire screen that embeds timestamps, random IDs, or fetched data - diff noise hides real regressions
* Pair snapshots with **behavior assertions** - snapshot alone does not prove the button works
* Delete snapshots that churn every PR; replace with explicit `getByRole` expectations

> **Related:** [Jest Setup for Expo](https://docs.wahwei/reactnative.codeguides.io/testing/jest-setup-for-expo/) - snapshot serializers and update workflow

---

## Intermediate Examples

### 8. Async Data with `waitFor`

Network-backed UI needs async queries - render loading first, then assert settled content.

```tsx
import { useEffect, useState } from "react";
import { Text, View, ActivityIndicator } from "react-native";
 
type Profile = { name: string };
 
export function ProfileCard({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
 
  useEffect(() => {
    let cancelled = false;
    fetch(`https://api.example.com/users/${userId}`)
      .then((res) => res.json())
      .then((data: Profile) => {
        if (!cancelled) setProfile(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load profile");
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);
 
  if (error) return <Text>{error}</Text>;
  if (!profile) return <ActivityIndicator accessibilityLabel="Loading profile" />;
 
  return (
    <View>
      <Text accessibilityRole="header">{profile.name}</Text>
    </View>
  );
}
```

```tsx
import { render, screen, waitFor } from "@testing-library/react-native";
import { ProfileCard } from "./ProfileCard";
 
beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ name: "Riley" }),
  }) as jest.Mock;
});
 
it("shows the profile name after fetch resolves", async () => {
  render(<ProfileCard userId="42" />);
  expect(screen.getByLabelText("Loading profile")).toBeTruthy();
 
  await waitFor(() => {
    expect(screen.getByRole("header", { name: "Riley" })).toBeTruthy();
  });
});
```

* Use **`findBy*`** as sugar for `waitFor + getBy*` when you only need presence
* Always **`mock fetch`** (or MSW) in Jest - never hit real APIs in unit or integration tests
* Assert the **loading state** explicitly so regressions that skip the spinner are caught
* Test the error branch with `mockRejectedValue` - mobile networks fail constantly

> **Related:** [Mocking Native Modules](https://docs.wahwei/reactnative.codeguides.io/testing/mocking-native-modules/) - stubbing `fetch` and Expo networking modules

---

### 9. E2E: Maestro Flow vs Detox

End-to-end tests sit at the pyramid top - few flows, real binary, real gestures. Pick the runner by build pipeline and flakiness tolerance.

```yaml
# .maestro/flows/sign-in.yaml
appId: com.example.mytestapp
---
- launchApp
- tapOn: "Sign in"
- inputText: "user@example.com"
- tapOn: "Continue"
- assertVisible: "Welcome"
```

```ts
// e2e/signIn.e2e.ts - Detox (requires dev client / release build)
describe("Sign in", () => {
  beforeAll(async () => {
    await device.launchApp();
  });
 
  it("shows welcome after valid email", async () => {
    await element(by.text("Sign in")).tap();
    await element(by.label("Email")).typeText("user@example.com");
    await element(by.text("Continue")).tap();
    await expect(element(by.text("Welcome"))).toBeVisible();
  });
});
```

| Tool | Best for | Tradeoff |
| --- | --- | --- |
| **Maestro** | YAML smoke flows, CI without heavy native test harness | Less gray-box control over async native timers |
| **Detox** | Deep native sync, biometrics, complex navigation stacks | Higher setup cost, Xcode/Android toolchain required |

* Run **3–8 E2E flows** per app: sign-in, core purchase/read path, and one settings/deep-link path
* E2E belongs in a **separate CI job** with simulator boot - do not block every PR commit on a 20-minute suite
* If Maestro passes but users report bugs, add **component coverage** before adding more E2E
* Both tools need an **installable build** - wire EAS Build or `expo run:ios` in CI first

> **Related:** [Maestro E2E](https://docs.wahwei/reactnative.codeguides.io/testing/maestro-e2e/) - YAML flows and flaky-test controls | [Detox E2E](https://docs.wahwei/reactnative.codeguides.io/testing/detox-e2e/) - gray-box synchronization

---

### 10. Layered `package.json` Scripts and Contract Guards

Tie the pyramid to commands developers actually run - and guard API shapes so integration tests do not lie.

```json
{
  "scripts": {
    "test": "jest --ci",
    "test:unit": "jest --testPathPattern=\\.test\\.ts$",
    "test:integration": "jest --testPathPattern=screens/",
    "test:e2e:maestro": "maestro test .maestro/flows",
    "test:contract": "jest --testPathPattern=contract"
  }
}
```

```ts
// src/api/contracts/userSchema.ts
import { z } from "zod";
 
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(1),
});
 
export type User = z.infer<typeof userSchema>;
```

```ts
// src/api/contracts/userSchema.contract.test.ts
import { userSchema } from "./userSchema";
 
const fixture = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  email: "user@example.com",
  displayName: "Riley",
};
 
it("mobile client accepts the user payload the server documents", () => {
  expect(() => userSchema.parse(fixture)).not.toThrow();
});
```

* **`test:unit` vs `test:integration`** lets CI parallelize fast and slow jobs - same pyramid, different runners
* Contract tests sit **beside the client parser** - they fail when the backend adds required fields you never handled
* Pair contracts with **Storybook** for visual states the pyramid does not cover - catalog components, screenshot on device
* Before store submission, run unit + integration on every PR, Maestro on `main`, and revisit [Testing Best Practices](https://docs.wahwei/reactnative.codeguides.io/testing/best-practices/)

> **Related:** [Contract Tests for APIs](https://docs.wahwei/reactnative.codeguides.io/testing/contract-tests-for-apis/) - Pact and schema strategies | [Visual Regression & Storybook](https://docs.wahwei/reactnative.codeguides.io/testing/visual-regression-and-storybook/) - on-device component catalogs

---

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
