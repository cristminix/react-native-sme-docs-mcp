# Architecture Decision Records

Mobile **ADR** examples for decisions every Expo lead faces: **OTA vs store**, **custom native module vs Expo SDK**, and how to write records that survive SDK 57 → 58 upgrades. ADRs are **short, dated, and linked** - not wiki essays nobody reads.

Highlights / Architecture Decision Records

* ADRs are short, dated, and reversible - not design novels in Confluence
* Mobile ADRs must name release clock: OTA, store binary, or both
* Record runtimeVersion impact and rollback path in every shipping ADR
* Native vs SDK decisions include maintenance owner and upgrade cost
* Link to ranked ADRs in architecture-design for navigation and state
* Supersede - don't edit history - when SDK or policy flips the decision

## Recipe

> Quick-reference ADR skeleton - copy into `docs/adr/` or `.adr/` in the repo.

```markdown
# ADR-NNNN: <Title>
 
- **Status:** proposed | accepted | superseded by ADR-XXXX
- **Date:** YYYY-MM-DD
- **Deciders:** @mobile-lead, @platform
- **Release clock:** OTA | store binary | backend | none
 
## Context
What problem and constraints? (team size, brownfield, compliance)
 
## Decision
We will <choice> because <one paragraph>.
 
## Consequences
### Positive
- …
### Negative
- …
### Rollback / reversal
- OTA: `eas update --roll-back --channel <ch>`
- Store: ship <version> binary; feature flag <name> off
 
## Alternatives considered
| Option | Rejected because |
| --- | --- |
| … | … |
```

```bash
# Repo layout
docs/adr/
  0001-ota-vs-store-for-checkout-copy.md
  0002-expo-camera-vs-custom-scanner.md
  README.md   # index with status table
```

**When to reach for this:**

* Two engineers argue the same OTA vs rebuild question every sprint.
* You add a third-party native SDK - need a paper trail for audit and onboarding.
* Store rejection forces a policy change - future hires must know **why** moderation exists.
* Squads disagree on navigation or state - point to [ranked ADRs](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-navigation-library-choice/) and record your override.

## Working Example

### ADR-0007: Checkout error copy via OTA (not store)

```markdown
# ADR-0007: Checkout error copy via OTA
 
- **Status:** accepted
- **Date:** 2026-03-12
- **Deciders:** @mobile-lead, @pm-checkout
- **Release clock:** OTA (`production` channel)
 
## Context
Support needs clearer card-decline messaging before weekend campaign.
No API, native, or `runtimeVersion` change. Live binary: `2.4.1` (runtimeVersion `2.4.0`).
 
## Decision
Ship copy change with `eas update` to `production` after staging channel QA.
Do not cut store release `2.4.2` for text-only change.
 
## Consequences
### Positive
- Same-day ship; rollback in minutes
- Avoids store review queue during campaign
### Negative
- Users on ancient sideload builds off channel may not receive update
### Rollback
`eas update --roll-back --channel production`
Known-good update ID: recorded in release ticket MOB-4821
 
## Alternatives considered
| Option | Rejected because |
| --- | --- |
| Store submit 2.4.2 | 2–5 day review for zero native benefit |
| Backend-driven copy only | Offline checkout still needs local strings |
```

### ADR-0008: Barcode scan - `expo-camera` vs custom Vision module

```markdown
# ADR-0008: Barcode scan - expo-camera vs custom Vision module
 
- **Status:** accepted
- **Date:** 2026-04-02
- **Deciders:** @mobile-lead, @android-lead, @ios-lead
- **Release clock:** store binary (new native dependency)
 
## Context
Warehouse app needs Code 128 scan at 30 fps on mid-tier Android.
`expo-camera` barcode API meets MVP; custom ML Kit wrapper promised 2× speed.
 
## Decision
Use **expo-camera** `CameraView` barcode scanning for v1.
Revisit custom module only if field metrics show >5% scan failure on Pixel 6a class.
 
## Consequences
### Positive
- Config plugin + Expo SDK upgrade path maintained by Expo
- One less Swift/Kotlin module for juniors to maintain
### Negative
- May not match dedicated scanner hardware latency
- Still requires **dev client** rebuild - not OTA-able as native add
### Rollback
Feature flag `warehouse_scan_v1` off; prior manual entry flow remains
 
## Alternatives considered
| Option | Rejected because |
| --- | --- |
| Custom TurboModule + ML Kit | 2 eng-months maintenance; no field data yet |
| WebView + browser scan | Poor offline; store WebView policy risk |
| Third-party RN scanner (unmaintained) | Last commit 18 months ago; RN 0.86 untested |
```

### ADR-0009: Push notifications - Expo Notifications vs vendor SDK

```markdown
# ADR-0009: Push - Expo Notifications vs OneSignal SDK
 
- **Status:** accepted
- **Date:** 2026-05-18
- **Deciders:** @mobile-lead, @growth
- **Release clock:** store binary if switching later
 
## Context
Growth wants A/B rich push; engineering wants minimal native surface.
 
## Decision
**expo-notifications** + server-side campaign tooling for v1.
OneSignal evaluated - defer until marketing needs in-app IAM beyond product scope.
 
## Consequences
### Positive
- Aligns with EAS credentials and Expo push token flow
- Smaller native binary vs dual SDK
### Negative
- Advanced segmentation lives in our backend, not vendor UI
### Rollback
Stay on expo-notifications; no vendor SDK to remove
 
## Alternatives considered
| Option | Rejected because |
| --- | --- |
| OneSignal RN SDK | Extra native dep + duplicate FCM/APNs wiring |
| Firebase only (no Expo wrapper) | Loses unified Expo push DX for managed workflow |
```

### ADR index table

```markdown
# ADR index
 
| ID | Title | Status | Clock |
| --- | --- | --- | --- |
| 0007 | Checkout copy OTA | accepted | OTA |
| 0008 | expo-camera scan | accepted | store |
| 0009 | expo-notifications | accepted | store |
| 0010 | Expo Router (greenfield) | accepted | - |
```

Link architectural choices to existing ranked docs:

* Navigation: [ADR: Navigation Library Choice](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-navigation-library-choice/)
* State: [ADR: State Management Selection](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-state-management-selection/)

Record **only the team-specific override** - do not duplicate entire ranked pages.

### When to write vs when to skip

| Situation | ADR? |
| --- | --- |
| Button color OTA | No - ticket comment suffices |
| First OTA to production channel | **Yes** - establishes rollback ritual |
| New native module | **Yes** - maintenance owner required |
| Expo Router on new app | **Yes** - links ranked ADR + template choice |
| Zustand vs Context for one screen | No - reverse quickly |
| SDK 57 → 58 upgrade strategy | **Yes** - supersede prior SDK ADRs |

## Gotchas

* **ADR without rollback line** - Acceptable decision becomes irreversible in incidents. **Fix:** Every `accepted` ADR names OTA roll-back or store version pin.
* **Editing old ADRs in place** - Git history lies. **Fix:** `Status: superseded by ADR-0012` and new file.
* **"We decided in Slack"** - Onboarding repeats the debate. **Fix:** Slack thread link in ADR context; decision lives in repo.
* **Ignoring runtimeVersion** - ADR says OTA but binary mismatch bricks users. **Fix:** Mandate `runtimeVersion` line in Context.
* **Native ADR without owner** - Module rots when author leaves. **Fix:** Named `@ios-lead` / `@android-lead` in Deciders.

49454e4f4d5f434e4f5904434556494d4345131c1a56181a181c1a1d

## Alternatives

| Format | Use When | Don't Use When |
| --- | --- | --- |
| Markdown in `docs/adr/` | Default for RN teams | Org mandates ADR tooling (e.g. Log4brains) |
| Nygard template (Context/Decision/Consequences) | Cross-team architecture | Need mobile-specific clock fields - extend template |
| RFC with comment period | Large org, many stakeholders | Two-pizza team - overhead kills velocity |
| Wiki only | Never for decisions | Repo ADRs are versioned with code |

## FAQs

How long should a mobile ADR be?

One to two pages. If longer, split into ADR (decision) + cookbook (how-to). Link [Native vs JavaScript Trade-offs](https://docs.wahwei/reactnative.codeguides.io/tech-leadership/native-vs-javascript-trade-offs/) for framework depth.

Who approves ADRs?

Tech lead + one affected specialist (iOS, Android, backend). Product signs policy-sensitive ADRs (IAP, UGC, health).

ADR number vs date ordering?

Use monotonic IDs (`0008`) - dates slip; IDs stay sortable. Index table shows status at a glance.

Do ADRs replace expo-doctor or CI?

No. ADRs document **why** you accepted a native dependency; CI still blocks skewed installs.

How do ADRs relate to architecture-design section?

**architecture-design** holds ranked decision frameworks. **tech-leadership ADRs** hold **your team's recorded choice** and exceptions.

## Related

* [ADR: Navigation Library Choice](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-navigation-library-choice/) - Expo Router vs React Navigation
* [ADR: State Management Selection](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-state-management-selection/) - Query-first stack
* [Native vs JavaScript Trade-offs](https://docs.wahwei/reactnative.codeguides.io/tech-leadership/native-vs-javascript-trade-offs/) - ranked native boundary decisions
* [Tech Lead Basics on Mobile](https://docs.wahwei/reactnative.codeguides.io/tech-leadership/tech-lead-basics-on-mobile/) - velocity vs store risk
* [Incremental Adoption ADR](https://docs.wahwei/reactnative.codeguides.io/brownfield/incremental-adoption-adr/) - brownfield strangler ADRs
* [Runtime Version Policy](https://docs.wahwei/reactnative.codeguides.io/ota-updates/runtime-version-policy/) - OTA ADR prerequisite
* [Native Modules Basics](https://docs.wahwei/reactnative.codeguides.io/native-modules/native-modules-basics/) - when SDK is not enough

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 19, 2026
