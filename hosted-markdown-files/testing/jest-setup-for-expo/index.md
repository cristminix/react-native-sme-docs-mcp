# Jest Setup for Expo

`jest-expo` gives Expo SDK 57 projects a working Jest preset: native modules are mocked, TypeScript transforms are configured, and you can run unit and component tests on every commit without booting a simulator.

Highlights / Jest Setup for Expo

* `jest-expo` preset mocks Expo SDK modules so Jest runs without a simulator
* Install with `npx expo install` so versions match Expo SDK 57
* `transformIgnorePatterns` is the fix when Jest cannot parse ESM in node\_modules
* Keep tests out of `app/` - use `\_\_tests\_\_` or colocated `\*.test.tsx` files
* Snapshots are for small presentational components - not full screens

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install jest-expo jest @types/jest @testing-library/react-native test-renderer --dev
```

```json
{
  "scripts": {
    "test": "jest --watchAll",
    "test:ci": "jest --ci --coverage=false"
  },
  "jest": {
    "preset": "jest-expo",
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)"
    ],
    "setupFilesAfterEnv": ["<rootDir>/jest.setup.ts"]
  }
}
```

```ts
// jest.setup.ts
import "@testing-library/react-native";
 
afterEach(() => {
  jest.clearAllMocks();
});
```

**When to reach for this:**

* Every Expo app that ships features - run tests in CI before EAS builds.
* Component and hook tests with `@testing-library/react-native` (see [React Native Testing Library](https://docs.wahwei/reactnative.codeguides.io/testing/react-native-testing-library/)).
* Pure TypeScript utilities (formatters, reducers, API mappers) with no native imports.
* Snapshot tests for small, stable presentational components - not navigation trees.

## Working Example

```bash
# From project root (Expo SDK 57)
npx expo install jest-expo jest @types/jest @testing-library/react-native test-renderer --dev
```

```json
// package.json (excerpt)
{
  "scripts": {
    "test": "jest --watchAll",
    "test:ci": "jest --ci --coverage=false --changedSince=origin/main",
    "test:update-snapshots": "jest -u --coverage=false"
  },
  "jest": {
    "preset": "jest-expo",
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)"
    ],
    "setupFilesAfterEnv": ["<rootDir>/jest.setup.ts"],
    "collectCoverageFrom": [
      "**/*.{ts,tsx}",
      "!**/__tests__/**",
      "!**/coverage/**",
      "!**/node_modules/**",
      "!**/.expo/**",
      "!**/expo-env.d.ts"
    ]
  }
}
```

```ts
// jest.setup.ts
import "@testing-library/react-native";
 
// Reset module mocks between tests when you use jest.mock at file scope.
afterEach(() => {
  jest.clearAllMocks();
});
```

```json
// tsconfig.json (excerpt - enables Jest globals in TypeScript)
{
  "compilerOptions": {
    "types": ["jest"]
  }
}
```

```tsx
// src/components/greeting.tsx
import { StyleSheet, Text, View } from "react-native";
 
export function Greeting({ name }: { name: string }) {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header">Hello, {name}</Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { padding: 16 },
});
```

```tsx
// __tests__/greeting-test.tsx
import { render, screen } from "@testing-library/react-native";
import { Greeting } from "../src/components/greeting";
 
describe("<Greeting />", () => {
  test("renders the name", () => {
    render(<Greeting name="Alex" />);
    expect(screen.getByRole("header", { name: "Hello, Alex" })).toBeOnTheScreen();
  });
 
  test("matches snapshot for stable markup", () => {
    const { toJSON } = render(<Greeting name="Alex" />);
    expect(toJSON()).toMatchSnapshot();
  });
});
```

**What this demonstrates:**

* `jest-expo` preset - zero custom Babel config for standard Expo projects.
* `transformIgnorePatterns` - transpiles ESM packages Jest would otherwise skip.
* `jest.setup.ts` - imports RNTL once so Jest matchers (`toBeOnTheScreen`) are registered.
* `*-test.tsx` naming - recognized by `jest-expo` without extra `testMatch` config.
* Snapshot on a leaf component - not the whole app shell.

## Deep Dive

### How It Works

* **`jest-expo` preset** extends Jest with Expo-aware transforms, module name mappers, and built-in mocks for most `expo-*` and React Native internals.
* **Test Renderer** (via `@testing-library/react-native`) renders components to a JS tree - no native view hierarchy, no simulator.
* **`transformIgnorePatterns`** tells Jest which `node_modules` packages to run through Babel; without it, imports from `react-native`, `expo-router`, or navigation packages throw syntax errors.
* **`setupFilesAfterEnv`** runs after the test framework installs - ideal for global matchers, mock resets, and shared `jest.mock` setup.
* **Fake timers** in setup are optional; enable per-file when testing `setTimeout`, animations, or debounced search.

### Jest Config at a Glance

| Option | Purpose |
| --- | --- |
| `preset: "jest-expo"` | Base Expo/RN transform + native mocks |
| `transformIgnorePatterns` | Allow-list ESM packages for Babel |
| `setupFilesAfterEnv` | Global test setup (`jest.setup.ts`) |
| `collectCoverageFrom` | Files included in coverage reports |
| `moduleNameMapper` | Alias `@/` paths (add if using `tsconfig` paths) |

### Module Path Aliases

When `tsconfig.json` maps `@/*` to `./src/*`, mirror it in Jest:

```json
"jest": {
  "preset": "jest-expo",
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/src/$1"
  }
}
```

### Snapshot Discipline

| Do | Don't |
| --- | --- |
| Snapshot leaf components with stable props | Snapshot entire screens with live data |
| Review snapshot diffs in PRs | Auto-approve snapshot updates without reading |
| Pair snapshots with behavior assertions | Rely on snapshots alone for navigation flows |
| Delete obsolete snapshots when components are removed | Keep thousand-line snapshots "just in case" |

Expo's own docs recommend **Maestro E2E** over snapshot tests for full UI flows - snapshots complement, not replace, integration and E2E coverage.

### TypeScript Notes

```ts
// jest.setup.ts - typed mock helpers for native modules
import "@testing-library/react-native";
 
type ExpoLocationMock = {
  requestForegroundPermissionsAsync: jest.Mock;
  getCurrentPositionAsync: jest.Mock;
};
 
export function getLocationMock(): ExpoLocationMock {
  return jest.requireMock("expo-location") as ExpoLocationMock;
}
```

* Add `"jest"` to `compilerOptions.types` so `describe`, `it`, and `expect` type-check.
* Install `@types/jest` via `expo install` to stay aligned with the SDK's Jest version.
* Prefer `jest.MockedFunction<typeof fn>` over `any` when typing mocked imports.

## Gotchas

* **Tests inside `app/` with Expo Router** - Every file under `app/` must be a route or layout. **Fix:** Put tests in `__tests__/` at the project root or colocate `*.test.tsx` next to `src/components/`.
* **"Cannot use import statement outside a module"** - A dependency ships ESM and Jest skips transpiling it. **Fix:** Add the package to `transformIgnorePatterns` (or use the full Expo-recommended regex above).
* **Forgetting `test-renderer`** - `@testing-library/react-native` depends on the standalone `test-renderer` package (not deprecated `react-test-renderer`). **Fix:** `npx expo install test-renderer --dev`.
* **Matchers like `toBeOnTheScreen` not found** - RNTL extends Jest only after you import from `@testing-library/react-native`. **Fix:** Add `import "@testing-library/react-native"` to `jest.setup.ts`.
* **Snapshots that never fail** - Giant snapshots of screens with timestamps, random IDs, or fetched data create noise. **Fix:** Snapshot presentational components with fixed props; test data-driven UI with queries and assertions.
* **Running `jest` without `jest-expo`** - Plain Jest does not mock `expo-constants`, `expo-font`, or native modules. **Fix:** Always set `"preset": "jest-expo"` in `package.json` or `jest.config.js`.
* **Watch mode in CI** - `--watchAll` hangs CI runners. **Fix:** Use `"test:ci": "jest --ci --coverage=false"` in pipelines and pre-merge checks.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `jest-expo` + Jest | Unit/component tests for Expo apps | You need real native UI synchronization (use Detox or Maestro) |
| Vitest | Shared monorepo already standardized on Vitest for web packages | Expo RN preset and native mocks are Jest-first today |
| Manual `react-native` Jest preset | Bare RN without Expo | You are on Expo SDK - `jest-expo` is the maintained path |
| Maestro / Detox E2E | Full flows, gestures, native chrome | Testing a pure `formatCurrency()` function |

## FAQs

What do I install for Jest on Expo SDK 57?

```bash
npx expo install jest-expo jest @types/jest @testing-library/react-native test-renderer --dev
```

Always use `expo install` for version alignment with SDK 57 - do not pin Jest versions manually from npm.

Where does Jest config live?

* `package.json` under a `"jest"` key is the Expo default and works for most apps.
* A standalone `jest.config.js` is fine for larger teams - still set `preset: "jest-expo"`.
* Do not duplicate config in both places; pick one source of truth.

What file names does jest-expo recognize as tests?

* `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`
* `*-test.ts`, `*-test.tsx` (Expo docs convention)
* Files under `__tests__/` directories

No extra `testMatch` is required with the default preset.

Do I still need react-test-renderer?

No. `react-test-renderer` does not support React 19. Install the standalone `test-renderer` package as a dev dependency alongside `@testing-library/react-native`.

How do I fix transformIgnorePatterns for pnpm or Bun?

pnpm and Bun add store path segments inside `node_modules`. Expo documents alternate regex patterns - copy the variant for your package manager from [Unit testing with Jest](https://docs.expo.dev/develop/unit-testing/) rather than the npm/Yarn regex.

What belongs in jest.setup.ts?

* `import "@testing-library/react-native"` for matchers
* Global `afterEach(() => jest.clearAllMocks())` when using spies
* Shared mocks only if every test file needs them - prefer per-file `jest.mock` for module-specific behavior

Should I enable coverage in CI?

* Turn on `collectCoverage` locally or on main-branch builds first.
* Exclude `app/`, generated types, and `.expo/` via `collectCoverageFrom`.
* Add `coverage/` to `.gitignore` - never commit HTML reports.

Can I test Expo Router screens with this setup?

Yes - after `jest-expo` and RNTL are configured, use `expo-router/testing-library` and `renderRouter`. See [React Native Testing Library](https://docs.wahwei/reactnative.codeguides.io/testing/react-native-testing-library/) for query patterns; keep test files outside `app/`.

When are snapshots worth it?

* Small components with stable structure (badges, empty states, error banners).
* Not for screens that embed navigation, fetching, or animation state.
* Expo recommends E2E (Maestro) for full UI regression - see [Maestro E2E](https://docs.wahwei/reactnative.codeguides.io/testing/maestro-e2e/).

How do I run only changed tests?

```json
"test:ci": "jest --ci --coverage=false --changedSince=origin/main"
```

Pair with `--passWithNoTests` on fresh branches if your CI policy allows zero-test PRs.

jest-expo mocks everything - is that enough?

`jest-expo` mocks most Expo modules with safe defaults. Custom native modules, third-party SDKs, and nuanced permission flows need manual mocks. See [Mocking Native Modules](https://docs.wahwei/reactnative.codeguides.io/testing/mocking-native-modules/).

How do I mock expo-font or expo-splash-screen in setup?

```ts
jest.mock("expo-font", () => ({
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
}));
 
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));
```

Place app-wide mocks in `jest.setup.ts`; feature-specific mocks stay in the test file.

What test scripts should package.json expose?

| Script | When |
| --- | --- |
| `test` | Local dev with `--watchAll` |
| `test:ci` | CI - no watch, fail on errors |
| `test:update-snapshots` | Intentional snapshot refresh (`jest -u`) |

Never run watch mode on EAS or GitHub Actions runners.

## Related

* [Mobile Testing Basics](https://docs.wahwei/reactnative.codeguides.io/testing/mobile-testing-basics/) - unit → component → integration → E2E pyramid
* [React Native Testing Library](https://docs.wahwei/reactnative.codeguides.io/testing/react-native-testing-library/) - queries, async, and user-centric assertions
* [Mocking Native Modules](https://docs.wahwei/reactnative.codeguides.io/testing/mocking-native-modules/) - manual mocks beyond `jest-expo` defaults
* [Maestro E2E](https://docs.wahwei/reactnative.codeguides.io/testing/maestro-e2e/) - YAML flows when Jest is not enough
* [Container/Presenter on Mobile](https://docs.wahwei/reactnative.codeguides.io/component-patterns/container-presenter-on-mobile/) - presenters are ideal Jest + RNTL targets
* [GitHub Actions Integration](https://docs.wahwei/reactnative.codeguides.io/git/github-actions-integration/) - wire `test:ci` into PR checks

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
