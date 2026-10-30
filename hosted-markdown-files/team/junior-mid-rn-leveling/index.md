# Junior → Mid RN Leveling

A cookbook **skills matrix** for **mobile-specific competencies** on Expo SDK 57 teams - define what junior looks like, what mid owns, and how to close gaps with evidence.

Highlights / Junior → Mid RN Leveling

* Junior: ship UI with Router, RNTL tests, and green PR checks on guidance
* Mid: own feature slices, preview builds, Query cache, and thin Maestro smokes
* Mobile-specific axes: navigation, offline, permissions, device matrix, release hygiene
* Leveling is evidence-based - merged PRs, not years of tenure
* Gap plans pair one competency per sprint - avoid unfocused 'learn RN' goals
* Web React experience accelerates UI work - does not replace native literacy

## Recipe

> Quick-reference leveling card - copy into eng ladder or performance rubric.

```text
Junior RN (L3) - "ships with support"
  ✓ Expo Router screens + Link navigation
  ✓ RNTL tests for happy path
  ✓ PR checks green; fixes own lint/tsc failures
  ✓ Runs app on sim + one physical device
  ✓ Asks for review before touching native config
 
Mid RN (L4) - "owns vertical slices"
  ✓ Feature folder end-to-end: route → API → test → preview build
  ✓ TanStack Query patterns; no duplicate fetch in global store
  ✓ Debugs Metro, Hermes redboxes, and flaky CI
  ✓ Triggers preview EAS build; reads eas.json profiles
  ✓ Authors 1–3 Maestro smoke steps or equivalent E2E
  ✓ Participates in on-call / release rotation with checklist
```

**When to reach for this:**

* Calibrating promotion discussions beyond vague "strong engineer."
* Building growth plans for web-to-mobile transfers.
* Staffing tickets - juniors on bounded UI; mids on cross-layer features.

## Working Example

### Competency matrix

Rate **A** (autonomous), **G** (guided), **N** (not yet) per quarter. Mid bar = **A** on all mid rows, **G+** on most junior rows.

| Competency | Junior (L3) | Mid (L4) | Evidence |
| --- | --- | --- | --- |
| **Expo Router** | G - adds screens in existing groups | A - route groups, modals, typed params | Merged PRs touching `app/` |
| **React / RN UI** | G - lists, forms, loading states | A - perf-aware lists, keyboard, a11y roles | Reviewer notes; RNTL queries by role |
| **TypeScript** | G - props types, fixes tsc errors | A - narrow unions at route boundaries | Zero tsc suppressions in owned files |
| **Testing** | G - one component test per PR | A - hook tests + MSW integration | CI coverage on owned feature folder |
| **Networking** | G - calls existing API hooks | A - designs Query keys, error UX, retry policy | [TanStack Query on Mobile](https://docs.wahwei/reactnative.codeguides.io/networking-api/tanstack-query-on-mobile/) patterns |
| **Navigation edge cases** | N - back stack surprises | G - deep links, auth redirects | Manual test matrix documented in PR |
| **Native / EAS** | N - uses provided dev client | G - triggers preview build, reads logs | EAS dashboard screenshot in PR |
| **Permissions** | N - copies existing pattern | G - camera/location flows with denial path | Screenshots of OS dialogs in QA notes |
| **Offline / NetInfo** | N - aware | G - empty/offline UI states | Unit test with mocked NetInfo |
| **Performance** | N - avoids obvious rerenders | G - FlashList, memo boundaries | Profiler before/after on hot list |
| **CI/CD literacy** | G - fixes PR check failures | A - knows preview vs release lanes | [Mobile CI/CD Basics](https://docs.wahwei/reactnative.codeguides.io/cicd/mobile-ci-cd-basics/) quiz pass |
| **Release hygiene** | N | G - runtimeVersion awareness, no secrets in bundle | Checklist sign-off on RC |
| **Debugging** | G - Metro cache, basic redbox | A - symbolicated traces, device logs | Postmortem participation |
| **Communication** | G - daily standup, asks early | A - estimates slices, flags native risk in planning | Ticket breakdown quality |

### Junior → mid gap plan (12 weeks)

One competency focus per sprint - not "learn everything."

```markdown
## <Engineer> - Q3 leveling plan
 
| Sprint | Focus | Success signal |
| --- | --- | --- |
| 1 | Router + thin routes | 2 screens via feature re-export |
| 2 | RNTL by role/label | 80% new UI has test |
| 3 | TanStack Query reads | Remove one Zustand fetch duplication |
| 4 | Error + loading UX | Standard ErrorView on owned feature |
| 5 | Preview EAS build | Solo `eas build --profile preview` |
| 6 | Physical device QA | Device matrix row in PR template |
| 7 | Deep link or auth redirect | One `Redirect` / guard flow owned |
| 8 | Maestro smoke slice | 3-step YAML flow in CI optional job |
| 9 | List performance | Migrate one ScrollView → FlashList |
| 10 | Offline empty state | NetInfo mock test + UI |
| 11 | Release shadow | Buddy on RC checklist |
| 12 | Mid packet review | Matrix all A/G on mid rows |
```

### Ticket sizing guide

| Level | Appropriate tickets | Avoid until mid |
| --- | --- | --- |
| Junior | New row UI, copy, icon, isolated hook, test fixes | SDK bump, new config plugin, store submit |
| Mid | New feature slice, API integration, navigation restructure | Solo SDK major upgrade without staff engineer |
| Senior+ | Cross-app modules, native bridges, CI architecture | - |

```text
Junior ticket example:
  "Add order status badge to OrderRow - uses existing useOrder hook"
 
Mid ticket example:
  "Add order cancellation flow - new route, mutation, error states, preview build"
```

### Web transfer acceleration map

| Web skill | Maps to mobile | Gap to close |
| --- | --- | --- |
| React hooks | Same mental model | RN primitives (`View`, `Pressable`) |
| CSS layout | Flexbox similar | No cascade - StyleSheet / NativeWind |
| React Router | Expo Router file routes | Imperative `router.push`, mobile back stack |
| Browser DevTools | React DevTools | Flipper / React Native DevTools, sim logs |
| `fetch` + SWR | TanStack Query | Offline, app backgrounding, token refresh |
| Jest + RTL | RNTL | `jest-expo`, native module mocks |
| Deploy to Vercel | EAS Build + stores | Code signing, phased rollout |

### Promotion packet (evidence list)

Mid promotion should cite **artifacts**, not adjectives:

```markdown
## Mid promotion evidence - <name>
 
### Delivery
- 3 feature slices owned E2E (link PRs)
- 1 preview-build-driven QA cycle led
 
### Quality
- RNTL tests on owned features - <count> tests added
- Zero P1 bugs traced to missing loading/error state in owned code
 
### Mobile craft
- Maestro smoke: <link or flow file>
- Device matrix completed on RC <version>
 
### Collaboration
- Onboarded 1 hire on codebase tour
- Release checklist buddy on <date>
 
### Growth edges (honest)
- Still G on: push notification cold start
- Plan: pair with <senior> in Q4
```

## Deep Dive

### Signals that are *not* leveling

| Signal | Why it fails |
| --- | --- |
| "Knows React for 5 years" | Web tenure ≠ native release literacy |
| "Merged 100 PRs" | Count without scope - typo fixes ≠ feature ownership |
| "Works late" | Hours ≠ autonomy on EAS or device matrix |
| "Strong opinions on Redux" | Architecture debates without shipping evidence |

### Signals that *are* leveling

* **Autonomous preview build** when native-adjacent UI changes
* **Query cache** designed so sibling screens do not double-fetch
* **Reviewer trust** on owned feature folder - fewer nit comments over time
* **Incident participation** with actionable notes ("missing offline gate")

### Staff calibration questions

Use in leveling meetings:

1. Can they ship a feature without daily routing help?
2. Do their PRs include device evidence when gestures or safe areas change?
3. Can they explain why OTA cannot fix their last change?
4. Did they catch a native risk in planning before sprint commit?

### Recommended learning by gap

| Gap | Resource in this docs site |
| --- | --- |
| Router | [Expo Router Basics](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/) |
| EAS | [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) |
| Testing | [Mobile Testing Basics](https://docs.wahwei/reactnative.codeguides.io/testing/mobile-testing-basics/) |
| CI | [Mobile CI/CD Basics](https://docs.wahwei/reactnative.codeguides.io/cicd/mobile-ci-cd-basics/) |
| Structure | [Folder Structure for Features](https://docs.wahwei/reactnative.codeguides.io/project-setup/folder-structure-for-features/) |
| Performance | [Performance Basics](https://docs.wahwei/reactnative.codeguides.io/performance/performance-basics/) |

## FAQs

Junior with strong web background - start at mid?

UI velocity may be mid-level; native/EAS/permissions likely junior. Split matrix rows - do not skip device and release literacy.

How many mid engineers per squad?

Common ratio: 2 mid : 1 senior : 1–2 junior for a product squad of 4–5. Adjust when release load is high.

Contractor on 6-month term?

Use matrix for scope boundaries, not promotion. Contractors can be "mid scope" without L4 title.

Expo Go only team - defer EAS?

No - mid bar still requires preview build literacy. Use org's shared dev client if personal EAS access is limited.

## Related

* [Onboarding Basics](https://docs.wahwei/reactnative.codeguides.io/team/onboarding-basics/) - day-one setup
* [First-Week Learning Path](https://docs.wahwei/reactnative.codeguides.io/team/first-week-learning-path/) - week-one capstone
* [Codebase Tour Checklist](https://docs.wahwei/reactnative.codeguides.io/team/codebase-tour-checklist/) - repo orientation
* [Project Setup Basics](https://docs.wahwei/reactnative.codeguides.io/project-setup/project-setup-basics/) - SDK 57 conventions
* [Expo Router Basics](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/) - navigation competency
* [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - build literacy
* [Team & Onboarding Best Practices](https://docs.wahwei/reactnative.codeguides.io/team/best-practices/) - 25 summary practices

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

WTI5a1pXZDFhV1JsY3k1cGIzeGpaMmx2T1RjMWZESXdNall3Tnc9PQ==

Reviewed by Chris St. John·Last updated Jul 19, 2026
