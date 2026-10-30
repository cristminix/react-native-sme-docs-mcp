# Maestro E2E

Maestro drives your installed app on a simulator or emulator with declarative YAML flows - tap, scroll, assert visible text - without writing native test harness code. Pair it with EAS builds so every PR runs the same journeys CI runs locally.

Highlights / Maestro E2E

* Flows are YAML files in `.maestro/` - readable by QA and engineers alike
* `appId` must match the installed bundle ID / application ID exactly
* EAS Workflows can build an APK/simulator app then run Maestro in one pipeline
* Regex matchers (`.\*`, `Welcome!`) absorb minor copy and timing variance
* Keep flows short and independent - one user journey per file

## Recipe

> Quick-reference recipe card - copy-paste ready.

```yaml
# .maestro/login.yml
appId: com.yourcompany.yourapp
---
- launchApp
- tapOn: "Sign in"
- tapOn:
    id: "email-input"
- inputText: "alex@example.com"
- tapOn: "Continue"
- assertVisible: "Welcome back.*"
```

```json
// eas.json (excerpt)
{
  "build": {
    "e2e-test": {
      "withoutCredentials": true,
      "ios": { "simulator": true },
      "android": { "buildType": "apk" }
    }
  }
}
```

```yaml
# .eas/workflows/e2e-test-android.yml
name: e2e-test-android
on:
  pull_request:
    branches: ["*"]
jobs:
  build_android_for_e2e:
    type: build
    params:
      platform: android
      profile: e2e-test
  maestro_test:
    needs: [build_android_for_e2e]
    type: maestro
    params:
      build_id: ${{ needs.build_android_for_e2e.outputs.build_id }}
      flow_path: [".maestro/login.yml"]
```

**When to reach for this:**

* Critical user journeys: login, checkout, onboarding, push-notification deep links.
* Flows that cross native chrome - OS permissions, tab bars, system keyboards.
* Regression gates before store submission (complement [Testing Best Practices](https://docs.wahwei/reactnative.codeguides.io/testing/best-practices/)).
* Teams that want non-developers to read and extend test scenarios in YAML.

## Working Example

**Project layout:**

```
your-expo-app/
  .maestro/
    home.yml
    explore-collapsible.yml
  .eas/
    workflows/
      e2e-test-android.yml
      e2e-test-ios.yml
  eas.json
  app.json
```

```json
// app.json (excerpt - appId source of truth)
{
  "expo": {
    "name": "Tasks Demo",
    "slug": "tasks-demo",
    "ios": { "bundleIdentifier": "com.example.tasksdemo" },
    "android": { "package": "com.example.tasksdemo" }
  }
}
```

```yaml
# .maestro/home.yml
appId: com.example.tasksdemo
---
- launchApp
- assertVisible: "Welcome!"
- tapOn: "Tasks.*"
- assertVisible: "No tasks yet"
```

```yaml
# .maestro/explore-collapsible.yml
appId: com.example.tasksdemo
---
- launchApp
- tapOn: "Explore.*"
- tapOn: ".*File-based routing"
- assertVisible: "This app has two screens.*"
- scrollUntilVisible:
    element: "Learn more"
    direction: DOWN
```

```json
// eas.json
{
  "build": {
    "e2e-test": {
      "withoutCredentials": true,
      "ios": {
        "simulator": true
      },
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

```yaml
# .eas/workflows/e2e-test-android.yml
name: e2e-test-android
 
on:
  pull_request:
    branches: ["*"]
 
jobs:
  build_android_for_e2e:
    type: build
    params:
      platform: android
      profile: e2e-test
 
  maestro_test:
    needs: [build_android_for_e2e]
    type: maestro
    params:
      build_id: ${{ needs.build_android_for_e2e.outputs.build_id }}
      flow_path:
        - ".maestro/home.yml"
        - ".maestro/explore-collapsible.yml"
```

```bash
# Local run (after installing Maestro CLI and a debug build on emulator/simulator)
maestro test .maestro/home.yml
maestro test .maestro/
 
# Trigger EAS Workflow manually
npx eas-cli@latest workflow:run .eas/workflows/e2e-test-android.yml
```

**What this demonstrates:**

* **`appId`** matches `android.package` / `ios.bundleIdentifier` from `app.json`.
* **Regex matchers** - `Tasks.*` and `Explore.*` tolerate minor label changes and platform text differences.
* **`e2e-test` build profile** - produces `.apk` (Android) and simulator `.app` (iOS) without store credentials.
* **EAS `maestro` job** - installs the build artifact from `build_id` and runs `flow_path` flows.
* **Independent flows** - each YAML file is one journey; failures pinpoint the broken screen.

## Deep Dive

### How It Works

* Maestro CLI connects to a running emulator/simulator (or physical device) and launches the app by **`appId`**.
* Each **flow** is a ordered list of commands (`launchApp`, `tapOn`, `inputText`, `assertVisible`, `scrollUntilVisible`, …) executed against the live UI tree.
* Maestro uses accessibility labels and visible text - add `testID` / `accessibilityLabel` in React Native when copy alone is ambiguous.
* **EAS Workflows** `type: build` produces an installable binary; `type: maestro` downloads that binary to the runner and executes flows - no manual artifact upload.
* Flows are **black-box** - they do not import your JS; changing implementation does not break tests if the user-visible UI stays the same.

### Common Flow Commands

| Command | Purpose |
| --- | --- |
| `launchApp` | Cold-start (or resume) the app under test |
| `tapOn` | Tap by text, id, or regex (`"Sign in"`, `id: "submit-btn"`) |
| `inputText` | Type into the focused field |
| `assertVisible` / `assertNotVisible` | Fail fast if copy or id missing |
| `scrollUntilVisible` | Scroll until element appears - lists and long screens |
| `runFlow` | Compose sub-flows for shared login steps |
| `extendedWaitUntil` | Wait for element with timeout - async loading gates |

### CI Integration Options

| Approach | Pros | Cons |
| --- | --- | --- |
| EAS Workflows `maestro` job | Native Expo integration, build + test linked | Requires EAS subscription and workflow setup |
| GitHub Actions + `maestro test` | Full control of runners | You manage emulator boot, APK install, and caching |
| Local `maestro test` before PR | Fastest feedback | Not enforced unless CI also runs |

Expo documents the EAS Workflows path in [Run E2E tests on EAS Workflows with Maestro](https://docs.expo.dev/eas/workflows/examples/e2e-tests/).

### Flaky-Test Controls

```yaml
# .maestro/checkout.yml
appId: com.example.tasksdemo
---
- launchApp
- extendedWaitUntil:
    visible: "Catalog"
    timeout: 15000
- tapOn:
    id: "product-card-1"
- assertVisible: "Add to cart"
```

| Technique | When |
| --- | --- |
| Regex (`Welcome.*`) | Minor punctuation or platform string differences |
| `extendedWaitUntil` | Network-loaded screens, splash → home transition |
| `id:` / `testID` | Duplicate visible text on screen |
| Short, focused flows | Isolate failure - avoid 40-step mega-flows |
| `runFlow` for login once | DRY without merging unrelated assertions |
| Stable test accounts / seed data | Backend state should not depend on production |

Track flake rate over time with [Maestro insights on EAS](https://docs.expo.dev/eas-insights/maestro/) - reruns without fixing root cause hide product bugs.

### React Native Notes

```tsx
// Prefer stable selectors Maestro can target
<Pressable
  testID="sign-in-button"
  accessibilityLabel="Sign in"
  onPress={handleSignIn}
>
  <Text>Sign in</Text>
</Pressable>
```

```yaml
- tapOn:
    id: "sign-in-button"
```

* **`testID` maps to `id`** in Maestro - use kebab-case consistently across platforms.
* **Expo Go vs dev client vs release builds** - `appId` differs; CI should test the same binary type you ship (EAS `e2e-test` profile, not Expo Go).
* **Animations** - wait for content with `extendedWaitUntil` instead of fixed `sleep` commands.
* **Keyboard** - `inputText` after focusing a field; on iOS simulator ensure software keyboard is enabled for realistic runs.

## Gotchas

* **Wrong `appId`** - Flow launches a different app or fails immediately. **Fix:** Copy `android.package` / `ios.bundleIdentifier` from `app.json` after `eas build:configure`, not the Expo slug.
* **Testing in Expo Go with production `appId`** - Expo Go's application id is `host.exp.exponent`, not your bundle ID. **Fix:** Install an EAS dev or preview build on the emulator before `maestro test`.
* **Mega-flows that are hard to debug** - One YAML file covering onboarding → paywall → settings hides which step failed. **Fix:** One journey per file; share login via `runFlow`.
* **Brittle exact-string assertions** - `"Welcome"` fails when copy becomes `"Welcome!"` or includes trailing space. **Fix:** Regex assertions (`Welcome!`, `Welcome.*`) and `testID` for critical taps.
* **Shared backend state between flows** - Parallel CI runs mutate the same test user. **Fix:** Dedicated test tenants, idempotent seed scripts, or per-run accounts.
* **No wait for async content** - `assertVisible` runs before fetch completes - intermittent failures. **Fix:** `extendedWaitUntil` or `assertVisible` after a stable loading indicator disappears.
* **Assuming Maestro replaces Jest** - E2E is slow and does not cover every branch. **Fix:** Keep unit/component tests ([Jest Setup for Expo](https://docs.wahwei/reactnative.codeguides.io/testing/jest-setup-for-expo/), [RNTL](https://docs.wahwei/reactnative.codeguides.io/testing/react-native-testing-library/)); use Maestro for thin critical paths.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Maestro | YAML-friendly E2E, fast authoring, Expo EAS integration | You need deep native synchronization hooks inside the app |
| Detox | Gray-box tests waiting for JS/native idle | Team wants zero native test code and minimal setup |
| Manual QA checklist | Exploratory passes before major releases | Regression on every PR - does not scale |
| RNTL + `renderRouter` | Route logic without emulator cost | OS permission dialogs or real gestures |
| Appium | Cross-stack enterprise standard already in place | Greenfield Expo team wanting lowest ceremony |

## FAQs

How do I install Maestro locally?

Follow [Installing Maestro CLI](https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli). You need a booted emulator/simulator with your app binary installed before `maestro test`.

Where do flow files live?

Convention: `.maestro/` at the project root (sibling to `eas.json`). Name flows by journey (`login.yml`, `checkout-guest.yml`), not by sprint number.

What is the --- separator in YAML flows?

Lines above `---` are config (`appId`, optional `name`, env). Lines below are the command list executed in order.

How do I run all flows?

```bash
maestro test .maestro/
```

Runs every flow in the directory. In CI, list explicit paths in `flow_path` so experimental drafts are not picked up accidentally.

How does EAS know which app binary to install?

The `maestro` job `build_id` references the artifact from the `build` job in the same workflow. Build with the `e2e-test` profile so the output is an installable `.apk` or simulator `.app`.

Can I run Maestro on iOS and Android in one workflow?

Use separate workflow files (or jobs) per platform - `platform: ios` vs `platform: android` builds produce different artifacts. Share YAML flows when UI parity is close; branch with platform-specific flows when not.

How do I target an element with duplicate text?

```yaml
- tapOn:
    id: "submit-button"
```

Add `testID` in React Native. Prefer `id` over coordinate taps - coordinates break across screen sizes.

How do I handle loading spinners?

```yaml
- extendedWaitUntil:
    visible: "Dashboard"
    timeout: 20000
```

Wait for the post-load screen - not the spinner itself - so fast networks do not flake on spinner visibility.

Can Maestro fill secure text fields?

Yes - `inputText` works on focused secure fields. Ensure the field is tapped first. Test on both platforms; keyboard behavior differs on iOS simulator.

How do I reuse a login sequence?

```yaml
# .maestro/subflows/login.yml
- tapOn: "Sign in"
- inputText: "test@example.com"
# ...
 
# .maestro/checkout.yml
- runFlow: subflows/login.yml
- tapOn: "Checkout"
```

Keep subflows in `.maestro/subflows/` and reference with `runFlow`.

What build profile should e2e-test use?

* `withoutCredentials: true` - internal CI builds without store signing setup.
* Android `buildType: "apk"` - installable on emulator without Play signing dance.
* iOS `simulator: true` - produces a simulator `.app`, not an App Store IPA.

Maestro vs Detox for Expo SDK 57?

Maestro: YAML, black-box, EAS Workflow job type, low setup. Detox: JS tests, gray-box sync, native build config - see [Detox E2E](https://docs.wahwei/reactnative.codeguides.io/testing/detox-e2e/) when you need in-app test IDs and idle synchronization.

How do I reduce flakes in CI?

* Pin emulator API level in CI to match local dev.
* Seed backend data before flows.
* Use `extendedWaitUntil` for network-bound screens.
* Split long flows; retry policies help but fix root timing issues first.

Should I commit .maestro to git?

Yes - flows are source code. Review them like application changes. Exclude local Maestro debug output or screen recordings if your team generates them during development.

How many E2E flows do I need?

Cover **critical paths** only - auth, pay, data loss, regulatory screens. Exhaustive branch coverage stays in Jest. See [Mobile Testing Basics](https://docs.wahwei/reactnative.codeguides.io/testing/mobile-testing-basics/) for pyramid balance.

## Related

* [Mobile Testing Basics](https://docs.wahwei/reactnative.codeguides.io/testing/mobile-testing-basics/) - where E2E sits in the test pyramid
* [Jest Setup for Expo](https://docs.wahwei/reactnative.codeguides.io/testing/jest-setup-for-expo/) - fast unit tests Maestro does not replace
* [React Native Testing Library](https://docs.wahwei/reactnative.codeguides.io/testing/react-native-testing-library/) - component tests below E2E
* [Detox E2E](https://docs.wahwei/reactnative.codeguides.io/testing/detox-e2e/) - gray-box alternative when Maestro is not enough
* [GitHub Actions Integration](https://docs.wahwei/reactnative.codeguides.io/git/github-actions-integration/) - non-EAS CI runners with Maestro
* [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - build profiles that feed E2E jobs

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
