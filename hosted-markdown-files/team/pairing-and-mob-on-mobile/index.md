# Pairing & Mob on Mobile

A cookbook for **simulator sharing**, **device lab etiquette**, and **review norms** on Expo SDK 57 teams - mobile pairing fails when only one person sees the screen.

Highlights / Pairing & Mob on Mobile

* One driver, one navigator - rotate every 25 minutes in mob sessions
* Share simulators via screen share + named device profiles - avoid 'works on my phone'
* Device lab: checkout sheet, charged devices, wipe guest accounts between sessions
* PR reviews require sim or device evidence for UI, gestures, and safe areas
* Remote pairing: Tandem / VS Code Live Share for code; QuickTime for iOS sim mirror
* Mob on release days - RC install, smoke flows, and rollback paths together

## Recipe

> Quick-reference session card - paste into calendar invite.

```markdown
## Pairing session - <feature>
- Driver: <name> (keyboard)
- Navigator: <name> (reads aloud, watches sim)
- Device: iPhone 16 sim + Pixel 8 API 35 emu
- Branch: feature/<ticket>
- Rotate: 25 min
- Done when: PR opened with screenshot + test output
```

```bash
# Shared verification before ending session
npm run lint && npm run typecheck && npm test
npx expo start --dev-client   # if native modules
```

**When to reach for this:**

* Onboarding week-one capstone and first EAS preview install.
* Debugging gesture conflicts, keyboard overlap, or safe-area bugs.
* Release candidate walkthrough before store submit.
* Teaching EAS dashboard and credential flows - never solo on production keys.

## Working Example

### Remote pairing setup

| Tool | Use for | Mobile tip |
| --- | --- | --- |
| Zoom / Meet | Sim mirror, face cam | Share **window** not full screen - hide notifications |
| VS Code Live Share | Same buffer, shared terminal | Driver runs Metro; navigator watches sim on stream |
| QuickTime (macOS) | Crisp iOS sim video | File → New Movie Recording → pick Simulator window |
| scrcpy | Android device mirror | `scrcpy --stay-awake` for physical device sessions |

```bash
# Driver - standard start
npx expo start --clear
 
# Navigator - verify on second platform without stopping Metro
# press a / i in shared terminal with driver consent
```

**Norms:**

* Navigator **asks before** keyboard takeover - "mind if I drive for the repro?"
* Keep **one Metro** instance - second `expo start` causes port confusion
* Mute when not speaking; unmute to read error messages aloud - silent debugging wastes mob time

### Simulator sharing checklist

```markdown
## Before session
- [ ] Same Node 20 + `npm ci` completed both machines
- [ ] Same git branch checked out
- [ ] Named simulators: iPhone 16, Pixel_8_API_35
- [ ] .env.local values confirmed (staging API)
 
## During session
- [ ] Redbox reproduced on both iOS and Android once for UI bugs
- [ ] Font scale 100% default; test XL if a11y ticket
- [ ] Dark mode toggled if theme-related
 
## After session
- [ ] PR description includes both platform screenshots
- [ ] No uncommitted `app.config.ts` experiments left on driver machine
```

Standard device names tie back to [Onboarding Basics](https://docs.wahwei/reactnative.codeguides.io/team/onboarding-basics/) - team scripts `npm run ios:16` reduce pairing friction.

### Device lab etiquette

Physical devices beat simulators for camera, push, biometrics, and performance.

```markdown
## Device lab shelf - team norms
 
### Checkout
- Sign device out in #device-lab or sheet: name, date, ticket
- Note OS version sticker on cradle (iOS 18.2, Android 15)
 
### Hygiene
- Log out of personal Apple/Google accounts before return
- Clear app data for staging builds when testing auth flows
- Charge to 80%+ before check-in; cable stays with cradle
 
### Shared staging accounts
- Use team vault credentials - never personal 2FA-only accounts
- Rotate passwords quarterly; document in 1Password vault
 
### Broken / flaky devices
- Red tag "do not use" + Slack post - flaky hardware wastes mob hours
```

```bash
# iOS internal build install - buddy verifies UDID registered
eas device:create
eas build --profile preview --platform ios
 
# Android APK sideload
eas build --profile preview --platform android
# QR from EAS dashboard - both observe install success
```

> **Related:** [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - internal distribution | [Internal Distribution](https://docs.wahwei/reactnative.codeguides.io/eas-build/internal-distribution/)

### Mob programming format (3+ people)

```text
Roles rotate each slice:
  Driver     - types
  Navigator  - strategy, reads tickets
  Researcher - docs, Sentry, Expo forums
  Device op  - physical device + screenshots (optional fifth)
```

**25-minute slices:**

1. **Repro** - show bug on sim + device
2. **Hypothesis** - navigator states theory before code
3. **Change** - smallest diff
4. **Verify** - tests + both platforms
5. **Retro 2m** - what slowed us down?

```markdown
## Mob rules (mobile)
- No parallel Metro on different branches mid-session
- Production EAS credentials: senior only, group observes
- Merge only after everyone saw green tests on stream
```

### PR review norms (mobile-specific)

Require evidence beyond green CI:

| Change type | Reviewer expects |
| --- | --- |
| Layout / spacing | iOS + Android screenshots; note device class |
| Gestures / sheets | Screen recording or paired repro steps |
| Navigation | Deep link path or back-stack behavior described |
| Permissions | Screenshot of allow/deny dialogs |
| Native-adjacent | Preview `build_id` or dev client version noted |
| Performance | Before/after if list or animation touched |

**Review comment templates:**

```markdown
<!-- Request device evidence -->
Thanks - please add Android screenshot; iOS safe area looks correct.
 
<!-- Request preview build -->
This adds a config plugin - please trigger `needs-preview` and paste EAS link.
 
<!-- Approve with device note -->
Verified on iPhone 16 sim + Pixel 8 emu - LGTM.
```

**SLA norms:**

* First review within **1 business day** for onboarding PRs
* **Pair review** (sync 15m) when PR touches `app/_layout.tsx`, `app.config.ts`, or `eas.json`

### Pairing on EAS and release

Never solo on first production credential touch - mob the checklist.

```markdown
## Release pairing checklist (45m)
- [ ] Confirm RC `build_id` matches QA sign-off sheet
- [ ] Driver shares EAS dashboard read-only; navigator reads steps aloud
- [ ] `eas submit` only after Maestro smoke green
- [ ] Rollback doc open: OTA roll-back + staged rollout pause links
- [ ] Post submit links in #releases thread
```

> **Related:** [Mobile CI/CD Basics](https://docs.wahwei/reactnative.codeguides.io/cicd/mobile-ci-cd-basics/) - release vs PR lanes

## Deep Dive

### When pairing beats async review

| Scenario | Pair | Async OK |
| --- | --- | --- |
| First-week onboarding capstone | ✓ |  |
| Hermes redbox only on device | ✓ |  |
| Copy change in static Text |  | ✓ |
| New Expo config plugin | ✓ |  |
| Typo in test fixture |  | ✓ |
| Flaky Maestro in CI | ✓ |  |
| API type fix |  | ✓ |

### Anti-patterns

| Anti-pattern | Fix |
| --- | --- |
| "Let me share later" screenshots | Block merge until evidence in PR |
| Driver hogs keyboard 2h | Hard rotate 25m |
| Sim-only review for camera ticket | Mandatory device lab checkout |
| Two people run different `expo start` | One Metro; driver owns terminal |
| Mob of 6 on tiny typo | Split - pair for code, async for review |

### Inclusion and time zones

* Rotate driver so junior does not only navigate for a month
* Record **short** repro clips (under 2 min) for APAC/EU async - not hour-long mob recordings
* Document decisions in PR thread - verbal-only agreements exclude absent teammates

### Suggested cadence by team size

| Team size | Pairing cadence |
| --- | --- |
| 3–4 engineers | 2–3 paired sessions / week |
| 5–8 | Weekly mob on release + ad-hoc pairs |
| 9+ | Feature-area pairing pods; monthly cross-pod mob |

## FAQs

Pairing feels slow - how do we justify it?

Onboarding capstones and native bugs are faster paired than three async review rounds. Track time-to-merge for paired vs solo tickets one sprint.

No device lab budget?

Minimum: one team Android + one iOS device passed between squads. Simulators cover 80%; pairing on shared hardware for the 20%.

Remote-only team?

QuickTime sim mirror + scrcpy + strict screenshot PR template. Quarterly in-person or device-ship week for tactile QA.

How is mob different from standup?

Mob produces merged code or a repro recording. Standup syncs status - do not mob entire backlog in standup block.

## Related

* [Onboarding Basics](https://docs.wahwei/reactnative.codeguides.io/team/onboarding-basics/) - simulator setup
* [First-Week Learning Path](https://docs.wahwei/reactnative.codeguides.io/team/first-week-learning-path/) - buddy capstone
* [Codebase Tour Checklist](https://docs.wahwei/reactnative.codeguides.io/team/codebase-tour-checklist/) - paired tour agenda
* [Junior → Mid RN Leveling](https://docs.wahwei/reactnative.codeguides.io/team/junior-mid-rn-leveling/) - autonomy expectations
* [Preview Builds on PRs](https://docs.wahwei/reactnative.codeguides.io/cicd/preview-builds-on-prs/) - QR review distribution
* [Project Setup Basics](https://docs.wahwei/reactnative.codeguides.io/project-setup/project-setup-basics/) - shared scripts and device names

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
