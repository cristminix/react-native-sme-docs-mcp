# Stakeholder Communication

A cookbook for explaining **crash rates, release status, and engineering trade-offs** in plain language - templates Expo SDK 57 leads paste into Slack, email, and exec updates without drowning non-engineers in jargon.

Highlights / Stakeholder Communication

* Stakeholders need outcomes and dates as ranges - not git commit hashes
* Crash-free rate and ANR rate are the mobile uptime metric - translate from Sentry/Crashlytics
* Release status: binary vs OTA vs in review - three different user-visible states
* Trade-off memos in one screen: option, cost, risk, recommendation
* Red/yellow/green without context causes panic - always pair status with next action
* Device demo clips beat paragraphs for design approval and incident comms

## Recipe

> Weekly product-health message - copy, fill blanks, send Monday 9am local.

```markdown
## Mobile health - week of <date>
 
**Release:** <version> - <In review | Rolling out 20% | Full production | OTA only>
**Crash-free sessions (7d):** <99.x%> - target ≥99.5% - <on track | investigating>
**Top crash:** <short signature> - <ticket> - owner <name> - ETA <range>
**Store:** <submitted | approved | not scheduled> - next binary <date range>
**Sprint:** <on track | at risk> - <one-line why>
 
**Needs from leadership:** <none | decision on scope X by Wednesday>
```

```bash
# Numbers source - run before writing update
# Sentry: Project → Releases → crash-free rate
# EAS: Dashboard → latest production build + OTA group
# Play Console / App Store Connect: rollout % and review status
```

**When to reach for this:**

* Weekly exec or product sync
* Post-incident stakeholder thread
* Pre-release go/no-go
* Scope negotiation when estimate busts
* Design sign-off when feasibility changes

---

## Working Example

### Crash rate: translate for PM and execs

| Engineer term | Stakeholder language |
| --- | --- |
| Crash-free sessions 98.2% | **1 in 55 sessions ends in a force-close** - above our 1-in-200 target |
| ANR rate 0.4% (Android) | App **freezes** on 4 in 1000 sessions - users may see "App isn't responding" |
| P95 launch time 2.8s | Slowest 5% of opens take **nearly 3 seconds** before interaction |
| OTA revert on channel `production` | **Instant rollback** of yesterday's JS fix - no App Store wait |
| New native build required | Users must **update from the store** - 3–7 day calendar minimum |

```markdown
## Incident summary (plain language)
**What users see:** App closes on the payment confirmation screen after tapping Pay.
**How many:** ~120 crashes in 24h (~0.3% of checkout sessions).
**Cause (initial):** JS error when card type missing - fix ready on preview.
**Fix path:** OTA to production after 4h preview soak - **no store submission**.
**Rollback:** Revert OTA channel if crash-free drops below 99% in first hour.
**Owner:** <name> - next update in #incidents at 3pm.
```

**Norms:**

* Lead with **user impact**, then scale, then technical cause
* State **fix delivery mechanism** early - OTA vs store sets expectations
* Never promise "fixed" until preview soak criteria met - say "fix candidate in preview"

### Release status ladder

```text
Stage 0: Development - internal only, preview builds
Stage 1: Store submitted - engineering done; calendar clock with Apple/Google
Stage 2: Approved / phased rollout - 1%→10%→100% Play; iOS manual release or phased
Stage 3: OTA on top of binary - JS changes only; runtimeVersion must match
```

```markdown
## Release note for #product (template)
**v2.14.0 (build 412)** - submitted to App Store <date>, Play <date>
**User-facing:** Loyalty card in wallet tab; improved search
**Not in this build:** Animated card flip - moved to v2.15 (needs Reanimated spike)
**OTA plan:** None until binary at 50% rollout
**Risk:** New camera permission string - first-time reviewers may ask questions (+1–2d)
```

* **"Engineering complete"** ≠ **"released"** - repeat until stakeholders internalize
* Link phased rollout % from store consoles - screenshots help async readers
* Cross-link [Estimation & Risk on Mobile](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/estimation-and-risk-on-mobile/) when dates slip

### Trade-off memo (one screen)

```markdown
## Decision needed: Custom date picker vs platform picker
**Context:** Checkout reschedule screen - design wants branded wheel; eng estimates 5d + risk.
 
| Option | Time | Risk | UX |
|--------|------|------|-----|
| A. Platform picker | 1d | Low | Native feel both OS |
| B. Custom Reanimated wheel | 5–7d | Med jank on Android | Brand match |
| C. Ship web date input (defer) | 0d | High support burden | Poor mobile UX |
 
**Recommendation:** A for v1; B as fast-follow if NPS data shows pain.
**Decision by:** <date> - blocks sprint commit.
```

* Three options maximum - decision fatigue kills memos
* Engineering recommends; PM decides - document dissent if overruled
* Attach 15s screen recording per option when UX is the debate

### Sprint status without jargon

| Instead of | Write |
| --- | --- |
| "Blocked on native module" | "Waiting on proof that barcode scanner works in our build - spike ends Thursday" |
| "Reanimated conflict" | "Swipe-to-delete fights scroll - trying fix; fallback is long-press menu" |
| "Red on CI" | "Automated checks failed - fixing tonight; not a user-facing delay yet" |
| "Tech debt" | "Paying down upgrade required for store policy in August" |

```markdown
## Sprint 24 - at risk (not red)
**Still shipping:** Profile edit, push prefs
**At risk:** Gift card scan - hardware test Friday; may slip 2d
**Not started:** Motion polish - descoped to protect scan deadline
**Ask:** PM confirm scan is P0 over animation
```

### Design and feasibility updates

When engineering discovers a design is costly, use **change request** not blame:

```markdown
## Feasibility update: Hero parallax on home
**Design intent:** Background moves at 0.5× scroll speed.
**Finding:** Jank on Pixel 6a in spike - 42 FPS vs 60 target.
**Options:** (1) Static hero - 0d (2) Simplified fade - 1d (3) Full parallax - 3d + perf ticket
**Design partner:** @design - can we review (2) on device tomorrow 10am?
```

* Invite **device review** - aligns with [Working with Design & Motion](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/working-with-design-and-motion/)
* Reference [Animations Basics](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/animations-basics/) only in technical appendix - not exec summary

### Executive escalation (brief)

```markdown
## Escalation: Store rejection risk
**Issue:** Payment SDK requires privacy manifest update before April policy.
**Business impact:** Cannot ship revenue features until resolved.
**Cost:** 1 sprint upgrade (already requested Sprint 25).
**Decision:** Approve feature freeze Apr 1–14? Y/N
**If no:** Accept risk of removal from App Store <policy date>.
```

One screen, forced choice, consequence of inaction stated neutrally.

---

## Deep Dive

### Status color rules

| Color | Meaning | Required companion text |
| --- | --- | --- |
| Green | On track within agreed range | What's shipping this sprint |
| Yellow | Risk identified; mitigation active | Owner + date of next checkpoint |
| Red | Missed commitment or user harm | Exec decision or scope cut listed |

**Never** post red without owner and next update time - panic without agency destroys trust.

### Audience-specific depth

| Audience | Include | Omit |
| --- | --- | --- |
| CEO | Revenue/release risk, calendar | Hermes, Metro, Reanimated |
| PM | Scope, dates, trade-offs | Gradle plugin internals |
| Design | Device clips, feasibility options | Crash stack traces |
| Support | Workaround steps, ETA plain | Git branch names |
| Engineering | Full technical detail | - |

### Cadence table

| Forum | Frequency | Format |
| --- | --- | --- |
| #product-mobile | Weekly | Health template |
| Sprint review | Biweekly | Demo on device + burndown |
| Incident channel | Per event | Impact-first template |
| Quarterly | Once | Debt + upgrade portfolio |

### Anti-patterns

| Anti-pattern | Fix |
| --- | --- |
| "Works on my machine" | Preview build QR in every UI update |
| Silent slip until demo day | Yellow flag when estimate range exceeded mid-sprint |
| Stack trace in #general | Link incident doc; plain language in channel |
| "QA will sign off" | Named QA status + device matrix |
| Undefined "soon" | Replace with date **range** |

---

## FAQs

How technical should weekly updates be?

Lead with business metrics (crash-free, rollout %, dates). Technical detail in linked doc or thread reply - interested engineers drill down; PMs stay oriented.

What crash-free target should we cite?

Common mobile SaaS target: **≥99.5%** crash-free sessions. Adjust per industry; state your target consistently so week-over-week comparisons matter.

How to communicate OTA vs store fix during incident?

"**OTA tonight**" means JS-only, users may need app restart. "**Store build**" means days minimum. Say which path and why - stakeholders often assume instant App Store updates.

PM wants daily ETA on in-review build?

Share **store console status** daily with same template; explain Apple does not expose precise review clocks. Ranges only - "approved between Wed–Fri."

How to push back on scope without sounding negative?

Trade-off memo with three options and a recommendation. "Yes, and here is what we defer" beats "no."

## Related

* [Estimation & Risk on Mobile](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/estimation-and-risk-on-mobile/) - ranges and risk register
* [Prioritizing Tech Debt vs Features](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/prioritizing-tech-debt-vs-features/) - portfolio language
* [Product Collaboration Basics](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/product-collaboration-basics/) - refinement demos
* [OTA Updates Basics](https://docs.wahwei/reactnative.codeguides.io/ota-updates/ota-updates-basics/) - OTA vs store for stakeholders
* [Rollback Runbook](https://docs.wahwei/reactnative.codeguides.io/ota-updates/rollback-runbook/) - incident rollback steps
* [Release Train Calendar](https://docs.wahwei/reactnative.codeguides.io/cicd/release-train-calendar/) - shared release dates
* [Design Systems Basics](https://docs.wahwei/reactnative.codeguides.io/design-systems/design-systems-basics/) - token debt explanations

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
