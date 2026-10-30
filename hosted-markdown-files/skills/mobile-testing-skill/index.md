# Mobile Testing Skill

Jest + Maestro plans from acceptance criteria - an **Agent Skill** that turns product AC into a **test pyramid slice** for **Expo SDK 57** apps.

Highlights / Mobile Testing Skill

* Skill converts acceptance criteria into Jest unit/component tests plus Maestro YAML flows
* jest-expo preset and transformIgnorePatterns are part of every SDK 57 output
* Mock native I/O at Jest boundaries - exercise real bridges in Maestro on EAS builds
* One user journey per Maestro file - appId must match installed bundle exactly
* EAS Workflows type: maestro jobs preferred over ad-hoc CI shell for SDK 57
* Outputs include npm run test:ci and maestro test commands with flaky-test controls

## What This Skill Does

From written acceptance criteria, produces:

* **Jest** unit and component tests (`jest-expo` + RNTL)
* **Maestro** YAML E2E flows for critical journeys
* CI wiring sketch (GitHub Actions or EAS Workflows)
* Explicit **what not to E2E** list (push down the pyramid)

## When to Invoke

* New feature ticket with AC but no test plan
* Regression after refactor - need targeted Jest + smoke Maestro
* PR asks "what should QA automate?"
* Setting up first Maestro flow on EAS `e2e-test` profile
* Converting manual test script to maintainable automation

## Inputs

| Input | Why |
| --- | --- |
| Acceptance criteria | Source of test cases |
| `appId` / bundle ID | Maestro `appId` field |
| Screen/route names | Stable selectors and navigation |
| `testID` policy | Team convention for Maestro `id:` taps |
| Build profile | `e2e-test` APK / simulator build |
| Mock boundaries | APIs, SecureStore, sensors |

## Outputs

* `*.test.ts(x)` files with RNTL queries (role/label first)
* `.maestro/<journey>.yml` flows
* `jest.setup.ts` additions if needed
* `eas.json` `e2e-test` profile snippet
* Commands: `npm run test:ci`, `maestro test .maestro/`

## Guardrails

1. **Many Jest, few Maestro** - pyramid discipline ([Mobile Testing Basics](https://docs.wahwei/reactnative.codeguides.io/testing/mobile-testing-basics/)).
2. **Query like users** - `getByRole`, `getByLabelText` before `testID` ([RNTL](https://docs.wahwei/reactnative.codeguides.io/testing/react-native-testing-library/)).
3. **Mock at boundaries** - don't assert implementation details inside components.
4. **Maestro `appId` exact match** - bundle ID ≠ display name.
5. **Short independent flows** - one journey per YAML file ([Maestro E2E](https://docs.wahwei/reactnative.codeguides.io/testing/maestro-e2e/)).
6. **E2E on real builds** - not Expo Go for production-shaped flows.

## Recipe

> Quick-reference recipe card - copy-paste ready.

**Input AC (example):**

```markdown
- Guest can add item to cart from product list
- Cart badge shows item count
- Signed-in user sees saved address at checkout
```

**Skill output skeleton:**

```ts
// src/features/cart/cart.test.ts
import { addToCart } from "./cart-logic";
 
describe("addToCart", () => {
  it("increments quantity for existing sku", () => {
    expect(addToCart({ sku: "A1", qty: 1 }, { sku: "A1", qty: 2 })).toEqual({
      sku: "A1",
      qty: 3,
    });
  });
});
```

```tsx
// src/features/cart/CartBadge.test.tsx
import { render, screen } from "@testing-library/react-native";
import { CartBadge } from "./CartBadge";
 
it("shows count when items present", () => {
  render(<CartBadge count={3} />);
  expect(screen.getByLabelText("Cart, 3 items")).toBeTruthy();
});
```

```yaml
# .maestro/add-to-cart.yml
appId: com.example.shop
---
- launchApp
- tapOn: "Products"
- tapOn:
    id: "product-tile-A1"
- tapOn: "Add to cart"
- assertVisible:
    id: "cart-badge"
    text: "1"
```

```bash
npm run test:ci
maestro test .maestro/add-to-cart.yml
```

**When to reach for this skill:**

* Sprint planning - AC exists, tests don't
* Agent asked to "add tests" without specifying layers
* Flaky E2E - skill should propose moving assertions down to Jest

---

## Working Example

### 1. Map AC → pyramid

| AC | Layer | Artifact |
| --- | --- | --- |
| Add to cart logic | Unit | `cart-logic.test.ts` |
| Badge visible | Component | `CartBadge.test.tsx` |
| List → detail → cart | E2E | `.maestro/add-to-cart.yml` |
| Saved address at checkout | Integration + E2E | mocked API test + checkout flow |

### 2. Jest setup (SDK 57)

```bash
npx expo install jest-expo jest @types/jest @testing-library/react-native test-renderer --dev
```

```json
{
  "jest": {
    "preset": "jest-expo",
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)"
    ],
    "setupFilesAfterEnv": ["<rootDir>/jest.setup.ts"]
  }
}
```

Full preset: [Jest Setup for Expo](https://docs.wahwei/reactnative.codeguides.io/testing/jest-setup-for-expo/).

### 3. Maestro + EAS Workflow

```json
// eas.json excerpt
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
      flow_path: [".maestro/add-to-cart.yml"]
```

### 4. Flaky controls

* Regex matchers: `assertVisible: "Welcome back.*"`
* `extendedWaitUntil` for slow network screens
* Avoid chaining five journeys in one YAML file

---

## Example Invocation Prompts

```text
Use Mobile Testing skill. SDK 57.
AC:
1. User can reset password via email link
2. Invalid code shows inline error
Deliver: Jest tests for validation + Maestro happy path only.
appId: com.example.auth. testID prefix: auth-
```

```text
Use Mobile Testing skill - review mode.
Existing tests attached. AC changed: cart supports quantity edit.
Diff test plan only - which Jest files to update, new Maestro flow or extend?
```

```text
Use Mobile Testing skill.
Add contract test stub for GET /v1/orders response shape.
Cross-link jest-expo setup. No Detox - Maestro only for E2E.
```

---

## Skill Output Checklist

```markdown
- [ ] AC → test case traceability table
- [ ] Unit tests for pure logic
- [ ] RNTL component tests for visible behavior
- [ ] ≤ 2 Maestro flows for critical paths
- [ ] jest-expo preset confirmed
- [ ] appId matches app.config bundle ID
- [ ] CI command: npm run test:ci
- [ ] E2E build profile documented
- [ ] Listed AC explicitly NOT covered by E2E (with reason)
```

---

## FAQs

Should the skill generate Detox tests?

Default to Maestro for SDK 57 Expo teams. Mention Detox only when AC requires native synchronization Detox excels at - see [Detox E2E](https://docs.wahwei/reactnative.codeguides.io/testing/detox-e2e/).

How many Maestro flows per feature?

One happy path + one critical failure path maximum per feature. More belongs in Jest.

Snapshot tests from the skill?

Only for small presentational components - not full screens. Prefer role/label assertions.

## Related

* [Mobile Testing Basics](https://docs.wahwei/reactnative.codeguides.io/testing/mobile-testing-basics/) - pyramid with 10 examples
* [Jest Setup for Expo](https://docs.wahwei/reactnative.codeguides.io/testing/jest-setup-for-expo/) - preset and mocks
* [React Native Testing Library](https://docs.wahwei/reactnative.codeguides.io/testing/react-native-testing-library/) - queries
* [Maestro E2E](https://docs.wahwei/reactnative.codeguides.io/testing/maestro-e2e/) - YAML flows and EAS Workflows
* [Mocking Native Modules](https://docs.wahwei/reactnative.codeguides.io/testing/mocking-native-modules/) - Jest boundaries
* [Testing Best Practices](https://docs.wahwei/reactnative.codeguides.io/testing/best-practices/) - pre-release gates
* [Agent Skills Basics](https://docs.wahwei/reactnative.codeguides.io/skills/agent-skills-basics/) - skill structure

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
