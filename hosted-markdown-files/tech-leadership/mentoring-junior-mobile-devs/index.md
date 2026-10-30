# Mentoring Junior Mobile Devs

Simulator skills, debugging, and **safe first PRs** for engineers new to Expo SDK 57. Mobile mentoring fails when juniors fight Metro day three while seniors expect feature velocity - structure the first two weeks deliberately.

Highlights / Mentoring Junior Mobile Devs

* Week one: Metro green, named sim profiles, one merged tiny PR before feature scope
* Teach Expo Router thin routes early - prevents god-screen refactors
* Safe first PRs: copy, styles, tests - not app.config or native deps solo
* Debugging ladder: redbox → React DevTools → native logs → preview build
* Pair on first eas build and store-adjacent files - never solo experimentation
* Growth tied to evidence matrix - [Junior → Mid RN Leveling](../team/junior-mid-rn-leveling.md)

## Recipe

> Quick-reference mentor card - assign buddy + milestones.

```text
Week 1 milestones:
  Day 1  Metro green + expo-doctor (iPhone 16 + Pixel 8 emu)
  Day 2  Tiny UI PR merged (subtitle, test, screenshots)
  Day 3  Trace one feature: app/ route → features/ screen → hook
  Day 4  Fix one lint/a11y review comment with TalkBack check
  Day 5  Install preview EAS build on personal device
 
Safe first PR types:
  ✅ Copy, spacing, RNTL test, accessibilityLabel
  ✅ New screen behind existing tab pattern (buddy reviews route)
  ⚠️  New npm dependency (buddy + lead review)
  🚫 Solo app.config.ts / eas.json / config plugin / native module
```

```bash
# Mentor runs this with mentee on day 1
npx expo-doctor
npx expo start
# Press i → iOS   Press a → Android
# Shift+I / Shift+A → pick standard team devices
```

**When to reach for this:**

* Hiring web React devs onto mobile squads.
* Intern or bootcamp graduate joining mid-sprint.
* Senior IC asked to "buddy" without a written path - use [First-Week Learning Path](https://docs.wahwei/reactnative.codeguides.io/team/first-week-learning-path/) as spine.

## Working Example

### Simulator skills curriculum

| Day | Skill | Exercise |
| --- | --- | --- |
| 1 | Boot simulators | `npx expo start` → `i` / `a`; screenshot both platforms |
| 2 | Device picker | `Shift+I` choose iPhone SE - layout still readable |
| 3 | Reload vs dev menu | `r` reload; dev menu → Fast Refresh verify |
| 4 | Accessibility | VoiceOver ⌘F5; navigate one form with labels |
| 5 | Physical device | Install preview build; compare safe area to sim |

Deep reference: [iOS Simulator & Android Emulator](https://docs.wahwei/reactnative.codeguides.io/expo-cli/ios-simulator-and-android-emulator/).

```bash
# Standard team device names (document in CONTRIBUTING.md)
xcrun simctl list devices available | grep "iPhone 16"
# Android: Pixel 8 API 35 in AVD Manager
```

### Safe first PR - "Explore subtitle"

**Scope:** One TSX file in `features/`, thin route re-export, one RNTL test, PR screenshots.

```tsx
// features/explore/screens/ExploreScreen.tsx - mentee edits here only
import { Text, View } from "react-native";
 
export function ExploreScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text accessibilityRole="header">Explore</Text>
      <Text>Discover tips curated for you.</Text>
    </View>
  );
}
```

```tsx
// __tests__/ExploreScreen.test.tsx
import { render, screen } from "@testing-library/react-native";
import { ExploreScreen } from "@/features/explore/screens/ExploreScreen";
 
test("shows curated subtitle", () => {
  render(<ExploreScreen />);
  expect(screen.getByText(/curated for you/i)).toBeTruthy();
});
```

**Mentor review teaches:**

* PR template checklist from [Code Review Standards for RN](https://docs.wahwei/reactnative.codeguides.io/tech-leadership/code-review-standards-for-rn/)
* Why route file stays one line - [Mobile Architecture Basics](https://docs.wahwei/reactnative.codeguides.io/architecture-design/mobile-architecture-basics/)
* Attach iOS + Android screenshots before requesting review

### Debugging ladder (teach in order)

```text
1. Read the redbox / LogBox - full message, file, line
2. React DevTools - props/state wrong vs layout wrong
3. Metro terminal - transform / resolution errors
4. npx expo-doctor - version skew
5. eas build preview - reproduces native-only failures
6. Xcode / Android Studio logs - last resort; pair only
```

```tsx
// Common junior mistake - mentor demo fix
// ❌ Inline renderItem invalidates list memo
<FlashList renderItem={({ item }) => <Row item={item} />} ... />
 
// ✅ Module-level or useCallback
const renderItem = useCallback(({ item }: { item: Item }) => <Row item={item} />, []);
```

Pair on first **Hermes** `undefined is not a function` - teach `npm why <pkg>` and lockfile hygiene, not random cache clears.

### PRs to defer until mid-level

| Topic | Why wait | Mentor alternative |
| --- | --- | --- |
| `app.config.ts` plugins | Store rejection risk | Pair read-only walkthrough |
| `eas.json` credentials | Org-wide blast radius | Shadow `eas build:list` |
| Native module install | Dev client + OTA rules | Watch lead merge similar PR |
| Navigation restructure | Dual back stacks | Bugfix in existing stack first |
| TanStack Query cache design | Global data bugs | Add field to existing query |

Align promotion evidence with [Junior → Mid RN Leveling](https://docs.wahwei/reactnative.codeguides.io/team/junior-mid-rn-leveling/).

### Weekly mentor sync (15 minutes)

```markdown
## Mentee: @name - week 2
 
Shipped:
- PR #412 Explore subtitle (merged)
- Preview build on Android device
 
Stuck:
- useLocalSearchParams typing - read typed routes doc
 
Next:
- Add Tips row + Link to /tips (capstone)
 
Mentor action:
- Pair 30m on Query hook Thursday
```

Feed "stuck" items into onboarding doc PRs - [Onboarding Basics](https://docs.wahwei/reactnative.codeguides.io/team/onboarding-basics/).

## Gotchas

* **"Works on my machine"** - Junior uses Expo Go; app needs dev client. **Fix:** Day-one README clarity; preview build by day five.
* **Throwing juniors on hotfix Friday** - No rollback literacy. **Fix:** Hotfixes shadowed; first solo fix is Monday OTA with template.
* **Review nitpicks without teaching** - Style comments without "why" do not build mobile judgment. **Fix:** One teaching comment per review (a11y, perf, or boundary).
* **Skipping Android** - iOS-only habit on Android-majority user base. **Fix:** Both screenshots required from week one.

## Alternatives

| Approach | Use When | Don't Use When |
| --- | --- | --- |
| Buddy + written path | Default | "Sink or swim" on legacy brownfield |
| Mob programming week one | Complex domain (fintech) | Simple CRUD - overkill |
| Formal training budget | Large hiring wave | One hire - use internal docs |
| Rotating mentors | Broad exposure | Needs continuity for first PRs |

## FAQs

Web React hire - what transfers?

Component thinking, hooks, and testing mindset transfer. **New:** Metro, simulators, native boundaries, store release clocks, platform a11y services.

How hands-on should mentors be?

**Pair** on days 1–5 for environment and first merge; **review** with teaching comments week 2–4; **delegate** bounded features by week 3–6 if capstone merged.

Junior wants to learn native modules immediately?

Redirect to Expo SDK modules first. Custom native is mid+ competency unless hired as platform engineer - see [Native vs JavaScript Trade-offs](https://docs.wahwei/reactnative.codeguides.io/tech-leadership/native-vs-javascript-trade-offs/).

What if buddy is too busy?

Lead assigns alternate buddy for **reviews** within 24h; do not leave first PR idle - kills confidence.

## Related

* [First-Week Learning Path](https://docs.wahwei/reactnative.codeguides.io/team/first-week-learning-path/) - five-day capstone cookbook
* [Onboarding Basics](https://docs.wahwei/reactnative.codeguides.io/team/onboarding-basics/) - machine setup
* [Junior → Mid RN Leveling](https://docs.wahwei/reactnative.codeguides.io/team/junior-mid-rn-leveling/) - skills matrix
* [Codebase Tour Checklist](https://docs.wahwei/reactnative.codeguides.io/team/codebase-tour-checklist/) - tiered repo tour
* [Pairing & Mob on Mobile](https://docs.wahwei/reactnative.codeguides.io/team/pairing-and-mob-on-mobile/) - session norms
* [Code Review Standards for RN](https://docs.wahwei/reactnative.codeguides.io/tech-leadership/code-review-standards-for-rn/) - teach review checklist
* [iOS Simulator & Android Emulator](https://docs.wahwei/reactnative.codeguides.io/expo-cli/ios-simulator-and-android-emulator/) - device matrix

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
