# First-Week Learning Path

A cookbook for a new hire's **first five days** - learn **Expo Router**, trigger **EAS Build**, and ship **one end-to-end feature** before week two backlog work.

Highlights / First-Week Learning Path

* Days 1–2: run the app, tour app/ routes, ship a one-line UI PR
* Days 3–4: trace one feature slice from route → hook → API → test
* Day 5: trigger a preview EAS build and install on a physical device
* Capstone: one small E2E feature - screen, navigation, test, preview build
* Pair with a buddy for first merge - review norms matter as much as syntax
* End week with a written 'what confused me' note - feed back into onboarding docs

## Recipe

> Quick-reference recipe card - the minimum path from clone to merged PR with a device build.

```bash
# Day 1 - green path
git clone <repo> && cd <repo> && npm ci
npx expo-doctor && npm run typecheck
npx expo start
 
# Day 3 - trace + change
# app/(tabs)/explore.tsx → features/explore/screens/ExploreScreen.tsx
 
# Day 5 - preview on device
eas build --profile preview --platform android --non-interactive
```

```text
Week arc:
  Mon  → Machine + Metro + read CONTRIBUTING.md
  Tue  → Expo Router tour + tiny UI PR merged
  Wed  → Feature slice trace + unit test
  Thu  → Navigation + RNTL component test
  Fri  → Preview build on phone + capstone PR
```

**When to reach for this:**

* Onboarding a junior or web-transfer engineer onto an existing Expo SDK 57 app.
* Standardizing what "productive in week one" means across squads.
* Replacing ad-hoc "read the whole repo" guidance with a shippable outcome.

## Working Example

Assume a team app with tabs, a `features/` folder, and `eas.json` preview profile. The capstone feature: **add a "Tips" row on Explore that navigates to `/tips`**.

### Day 1 - Machine and mental model

```bash
npm ci
npx expo-doctor
cp .env.example .env.local
npx expo start
```

Read in order:

1. `CONTRIBUTING.md` - branch naming, PR template, preview label rules
2. `app/_layout.tsx` - providers and root navigator
3. `app/(tabs)/_layout.tsx` - tab bar configuration
4. [Expo Router Basics](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/) - file = route

**Deliverable:** Post in onboarding thread: screenshot of sim running + `expo-doctor` green.

### Day 2 - Tiny merged PR (Router)

Add a subtitle on an existing screen - practice branch → PR → CI without product risk.

```tsx
// app/(tabs)/explore.tsx - thin route file
import { ExploreScreen } from "@/features/explore/screens/ExploreScreen";
 
export default ExploreScreen;
```

```tsx
// features/explore/screens/ExploreScreen.tsx
import { Text, View } from "react-native";
 
export function ExploreScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text accessibilityRole="header">Explore</Text>
      <Text>Welcome - week one</Text>
    </View>
  );
}
```

```bash
git checkout -b onboarding/jane-explore-subtitle
npm run lint && npm run typecheck && npm test
git push -u origin HEAD
# Open PR - expect PR checks green in <10 min
```

**Deliverable:** One merged PR with passing CI. Read a teammate's review comment aloud in pairing.

### Day 3 - Feature slice trace

With your buddy, draw this path on a whiteboard for **one existing feature** (auth, cart, profile):

```text
app/orders/[id].tsx
  → features/orders/screens/OrderDetailScreen.tsx
    → features/orders/hooks/useOrder.ts
      → features/orders/api/ordersApi.ts
        → shared/api/client.ts
```

Grep exercise:

```bash
rg "useOrder" --type ts
rg "ordersApi" app features
```

Add a **unit test** for a pure formatter in the feature:

```tsx
// features/orders/lib/formatOrderTotal.test.ts
import { formatOrderTotal } from "./formatOrderTotal";
 
it("formats USD total", () => {
  expect(formatOrderTotal(1299, "USD")).toBe("$12.99");
});
```

**Deliverable:** Diagram photo + one new test file in the PR or capstone branch.

> **Related:** [Folder Structure for Features](https://docs.wahwei/reactnative.codeguides.io/project-setup/folder-structure-for-features/) - scaling past starter layout

### Day 4 - Capstone UI + navigation

Add the Tips flow - route, screen, link.

```tsx
// app/tips.tsx
import { TipsScreen } from "@/features/tips/screens/TipsScreen";
 
export default TipsScreen;
```

```tsx
// features/tips/screens/TipsScreen.tsx
import { Stack } from "expo-router";
import { ScrollView, Text } from "react-native";
 
export function TipsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Tips" }} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text>Ship small PRs. Run expo-doctor often.</Text>
      </ScrollView>
    </>
  );
}
```

```tsx
// features/explore/screens/ExploreScreen.tsx (excerpt)
import { Link } from "expo-router";
import { Pressable, Text } from "react-native";
 
<Link href="/tips" asChild>
  <Pressable accessibilityRole="link">
    <Text>View onboarding tips →</Text>
  </Pressable>
</Link>
```

Component test:

```tsx
// features/explore/screens/ExploreScreen.test.tsx
import { render, screen } from "@testing-library/react-native";
import { ExploreScreen } from "./ExploreScreen";
 
it("shows link to tips", () => {
  render(<ExploreScreen />);
  expect(screen.getByRole("link", { name: /tips/i })).toBeTruthy();
});
```

**Deliverable:** Navigation works in sim; test passes locally and in CI.

> **Related:** [Expo Router Basics](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/) - `Link` and `href`

### Day 5 - EAS preview on device

Trigger a preview build and install on a physical Android device (or iOS if UDID registered).

```bash
eas login
eas build --profile preview --platform android --non-interactive
# Open EAS dashboard URL - scan QR on device
```

```json
// eas.json - confirm preview profile exists
{
  "build": {
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "android": { "buildType": "apk" }
    }
  }
}
```

On PR, add label `needs-preview` if your team automates builds - [Preview Builds on PRs](https://docs.wahwei/reactnative.codeguides.io/cicd/preview-builds-on-prs/).

**Capstone PR checklist:**

* New route `app/tips.tsx` + feature screen
* Link from Explore
* Unit or component test
* Screenshot from physical device in PR description
* `npm run lint && npm run typecheck && npm test` green

**Deliverable:** Merged capstone PR + proof of preview build on hardware.

## Deep Dive

### What to defer past week one

| Topic | Defer why | When |
| --- | --- | --- |
| SDK upgrade | High blast radius | Month two with buddy |
| Native modules / config plugins | Needs dev client literacy | When assigned ticket |
| Store submit | Credentials + policy | After first preview build |
| Monorepo Turbo filters | CI complexity | When touching shared packages |
| Maestro E2E authoring | Capstone uses RNTL | Week two or three |

### Buddy session agenda (90 minutes)

```markdown
1. 10m - Pull main, expo-doctor, demo Metro shortcuts
2. 20m - Walk app/_layout.tsx and one tab stack
3. 20m - Open Sentry / analytics (read-only) if applicable
4. 20m - Pair on capstone navigation bug if any
5. 20m - Review PR description template and preview label
```

### Written retro (private to lead)

```markdown
## Week one retro - <name>
- Clearest doc:
- Most confusing folder:
- Tool that surprised me:
- One doc PR I will send:
```

Feed "confusing folder" answers into [Codebase Tour Checklist](https://docs.wahwei/reactnative.codeguides.io/team/codebase-tour-checklist/) updates.

### Success metrics for leads

| Signal | Healthy week one | Investigate |
| --- | --- | --- |
| PRs merged | ≥2 (tiny + capstone) | Zero merges - blocker |
| CI failures | Self-fixed after first | Same lint error day 4 |
| Device build | Preview installed | Sim-only at Friday |
| Questions | Specific, timed | Silent until day 10 |

## FAQs

What if CI fails on day two?

Fix CI before feature work - ask buddy to pair on `npx expo customize tsconfig.json` or missing env vars. Do not skip gates.

Capstone too big for juniors?

Drop the test requirement to one pure function test; keep navigation + preview build. Merge split PRs: UI first, link second.

No physical device available?

Use Android emulator with Play image or iOS simulator build profile. Still run `eas build` once to learn the dashboard.

Monorepo clone - different path?

Run install from app workspace root documented in README. Week-one capstone stays inside one app package - see [Monorepo with Turborepo](https://docs.wahwei/reactnative.codeguides.io/project-setup/monorepo-with-turborepo/).

## Related

* [Onboarding Basics](https://docs.wahwei/reactnative.codeguides.io/team/onboarding-basics/) - day-one machine setup
* [Expo Router Basics](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/) - routes and layouts
* [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - profiles and first build
* [Project Setup Basics](https://docs.wahwei/reactnative.codeguides.io/project-setup/project-setup-basics/) - SDK 57 scaffold
* [Codebase Tour Checklist](https://docs.wahwei/reactnative.codeguides.io/team/codebase-tour-checklist/) - structured repo walkthrough
* [Pairing & Mob on Mobile](https://docs.wahwei/reactnative.codeguides.io/team/pairing-and-mob-on-mobile/) - buddy session norms

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
