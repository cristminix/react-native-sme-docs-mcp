# Mobile Incident Basics

Ten examples for **severity levels**, **comms channels**, and a **first-15-minutes checklist** - the foundation every Expo SDK 57 on-call rotation needs before a crash spike, bad OTA, or store delisting. Pair with [Observability Basics](https://docs.wahwei/reactnative.codeguides.io/observability/observability-basics/) for signal taxonomy and [Rollback Runbook](https://docs.wahwei/reactnative.codeguides.io/ota-updates/rollback-runbook/) for OTA containment.

Highlights / Mobile Incident Basics

* Mobile incidents need a single incident commander - not parallel Slack threads
* Severity ties to user impact and revenue path - not how loud the alert is
* First 15 minutes: confirm scope, contain blast radius, assign roles
* Tag every signal with release, OTA update id, and channel before triage
* Containment beats root cause in minute zero - pause rollout, flip flags, rollback OTA
* Runbooks live in the repo next to the code - not buried in Slack search

## Prerequisites

Your team should already ship with release identity on every crash and log - see [Sentry for React Native](https://docs.wahwei/reactnative.codeguides.io/observability/sentry-for-react-native/). These examples assume **EAS Update** channels and **Sentry Release Health** are wired for production.

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**.

---

## Basic Examples

### 1. Define Mobile Severity Levels

Web-style P1/P2 labels fail on mobile because **store adoption**, **OTA propagation**, and **offline users** stretch blast radius. Use impact-based severity:

```ts
// docs/incident-severity.ts - copy into your runbook repo
export type IncidentSeverity = "SEV1" | "SEV2" | "SEV3" | "SEV4";
 
export type SeverityCriteria = {
  sev: IncidentSeverity;
  userImpact: string;
  revenuePath: boolean;
  example: string;
};
 
export const MOBILE_SEVERITY_MATRIX: SeverityCriteria[] = [
  {
    sev: "SEV1",
    userImpact: "App unusable for majority OR removed from store OR data breach",
    revenuePath: true,
    example: "Play suspension; auth down for all users on live build",
  },
  {
    sev: "SEV2",
    userImpact: "Critical path broken for >25% of active users",
    revenuePath: true,
    example: "Checkout crash on iOS 2.4.0 phased release",
  },
  {
    sev: "SEV3",
    userImpact: "Regression with workaround; partial rollout or single platform",
    revenuePath: false,
    example: "Settings tab crash on Android preview channel",
  },
  {
    sev: "SEV4",
    userImpact: "Internal-only, policy warning, or sub-threshold metric drift",
    revenuePath: false,
    example: "Sentry noise on dev profile; App Store metadata deadline",
  },
];
```

* **SEV1** pages exec, legal, and comms - not just engineering
* **SEV2** is the default production crash spike with payment or auth involvement
* **SEV3** can wait for business hours if a kill switch exists
* Re-evaluate severity every 30 minutes - OTA propagation can escalate SEV3 → SEV2 quickly

---

### 2. Incident Commander and Roles

One person decides; everyone else executes. Parallel Slack threads without an IC waste the first 15 minutes.

```markdown
## Role assignment (paste into #incident-YYYYMMDD)
 
| Role | Owner | Responsibility |
|------|-------|----------------|
| **Incident Commander (IC)** | @oncall-mobile | Severity, timeline, go/no-go on rollback |
| **Tech Lead** | @mobile-lead | Triage, bisect, hotfix branch |
| **Comms** | @support-lead | Status page, support macros, social |
| **Scribe** | volunteer | Decision log with timestamps |
| **Store Ops** | @release-mgr | Pause phased release, Play halt - [Store Incident Response](../store-operations/store-incident-response.md) |
```

* IC does **not** need to be the best debugger - they need authority to pause releases
* Scribe captures: decision, who approved, UTC timestamp, link to dashboard snapshot
* Rotate IC after 4 hours on SEV1 - fatigue causes bad rollback calls

---

### 3. Comms Channels (Internal vs External)

Mobile incidents span engineering, support, executives, and app store status. Separate channels by audience:

```markdown
## Comms map
 
| Channel | Audience | Content rules |
|---------|----------|---------------|
| `#incident-YYYYMMDD` | Engineering + IC | Technical facts, commands run, hypotheses |
| `#incident-comms` | Support + PM + Comms | Approved customer-facing language only |
| PagerDuty / Opsgenie | On-call | Alert → acknowledge → join incident channel |
| Status page | Customers | No root cause until confirmed; no blame |
| Exec email | C-suite | Business impact, ETA range, what we are doing now |
```

```text
# Internal (engineering) - OK
Suspect OTA group abc123 published 14:02 UTC. Crash-free dropped 99.4% → 96.1%.
Running eas channel:view production. IC: @jane.
 
# External (status page) - OK
We are investigating reports of ShopApp closing unexpectedly on some devices.
Next update in 30 minutes or sooner.
 
# External - NEVER
Caused by @bob's deploy. Rolling back now.
```

* Engineering channel is noisy - that's fine; comms channel is curated
* Support macros must match status page wording - mismatched messages create ticket storms
* For store delisting, legal owns external copy - see [Store Outage & Policy Incident](https://docs.wahwei/reactnative.codeguides.io/troubleshooting/store-outage-and-policy-incident/)

---

### 4. First-15-Minutes Checklist

Containment before root cause. This checklist fits on one screen:

```markdown
## T+0 to T+15 (mobile production)
 
- [ ] **Acknowledge** alert; IC assigned (single name in channel topic)
- [ ] **Confirm scope:** platform(s), build number, OTA update id, channel, % users
- [ ] **Correlate timing:** OTA publish, store rollout %, backend deploy, feature flag change
- [ ] **Contain blast radius:**
  - [ ] Pause iOS phased release / halt Play staged rollout
  - [ ] Flip remote kill switch for suspected surface
  - [ ] Start OTA rollback if JS bundle suspect - [OTA Emergency Rollback](./ota-emergency-rollback.md)
- [ ] **Open dashboards:** Sentry Release Health, payment success, auth errors, OTA apply rate
- [ ] **Notify** comms + exec if SEV1/SEV2
- [ ] **Do not** merge hotfix to main until IC confirms containment path
```

```bash
# Scope confirmation commands (run in parallel)
eas channel:view production
eas update:list --branch production --limit 3
# Sentry: filter by release + dist (OTA update id)
```

* If you cannot name the **OTA update id** or **build number** in 5 minutes, observability gaps are the incident - fix tagging first
* Containment at T+10 beats perfect RCA at T+45

---

### 5. Correlate Release, OTA, and Backend

Mobile spikes often look like backend outages until you segment by client version.

```ts
// Log at session start - support and incidents depend on this
import * as Application from "expo-application";
import * as Updates from "expo-updates";
 
export function getIncidentCorrelationTags() {
  return {
    nativeRelease: `${Application.nativeApplicationVersion}+${Application.nativeBuildVersion}`,
    otaUpdateId: Updates.updateId ?? "embedded",
    channel: Updates.channel ?? "none",
    runtimeVersion: Updates.runtimeVersion ?? "unknown",
  };
}
```

| Signal shift pattern | Likely layer |
| --- | --- |
| Spike only on one `otaUpdateId` | Bad OTA - rollback channel |
| Spike on one `nativeRelease` only | Bad store build - pause rollout |
| All versions, all platforms | Backend or third-party API |
| Spike after flag change | Remote config - revert flag |

* [Observability Best Practices](https://docs.wahwei/reactnative.codeguides.io/observability/best-practices/) - tag every report with release identity
* [SLOs for Mobile Apps](https://docs.wahwei/reactnative.codeguides.io/observability/slos-for-mobile-apps/) - define rollback triggers before launch week

---

### 6. Containment Levers by Layer

Know which lever fixes which failure - wrong lever wastes hours.

| Layer | Containment lever | Time to effect |
| --- | --- | --- |
| **Remote config / flags** | Disable feature in LaunchDarkly / Firebase | Seconds–minutes |
| **OTA (JS bundle)** | `eas update:rollback` on channel | 5–15 minutes |
| **Store rollout** | Pause phased / halt staged % | Minutes |
| **Backend** | Roll back API deploy, circuit breaker | Minutes |
| **Native binary** | New `eas build` + expedited review | Hours–days |

```bash
# OTA containment (JS regression)
eas update:rollback
eas channel:view production
```

* OTA cannot fix native SIGABRT - do not burn 30 minutes on channel revert for a native-only crash
* Feature flags first when logic is isolated; OTA rollback when bundle-wide regression

---

### 7. Incident Channel Hygiene

Structured updates reduce duplicate work and prevent IC from re-answering the same question.

```text
## Status template (post every 15–30 min)
 
**SEV:** SEV2
**IC:** @jane
**Impact:** Checkout crash on iOS build 240012 (~18% phased users)
**Containment:** Phased release paused; flag `newCheckout` off
**Next:** Bisect OTA vs native - see Crash Spike Triage
**ETA:** Next update 15:45 UTC
```

* Pin the latest status message in the incident channel
* Link to Sentry issue cluster URL - not screenshots of stack traces
* `@channel` only for severity changes or containment confirmation - not every hypothesis

---

### 8. When to Page Exec and Legal

Not every crash warrants CEO email. Use explicit triggers:

```markdown
## Exec / legal notification triggers
 
| Trigger | Notify |
|---------|--------|
| App removed from App Store or Play | Exec + Legal immediately (SEV1) |
| PII exposure or regulatory breach allegation | Legal immediately |
| Payment success down >5% abs for >15 min | Exec + Finance |
| Auth down >25% users | Exec |
| SEV3 optional feature crash | Engineering only |
```

* Exec updates need **business impact** and **customer-facing status** - not stack traces
* Legal reviews any customer email about data incidents before send

---

### 9. Handoff to Deeper Runbooks

The first 15 minutes route to specialized playbooks - don't improvise under pressure.

| Symptom | Next runbook |
| --- | --- |
| Crash-free rate cliff after OTA | [Crash Spike Triage](https://docs.wahwei/reactnative.codeguides.io/troubleshooting/crash-spike-triage/) |
| Need channel revert now | [OTA Emergency Rollback](https://docs.wahwei/reactnative.codeguides.io/troubleshooting/ota-emergency-rollback/) |
| `eas build` failing on release cut | [Native Build Failure War Room](https://docs.wahwei/reactnative.codeguides.io/troubleshooting/native-build-failure-war-room/) |
| Store removal or policy strike | [Store Outage & Policy Incident](https://docs.wahwei/reactnative.codeguides.io/troubleshooting/store-outage-and-policy-incident/) |
| Incident resolved | [Post-Mortem Template for Mobile](https://docs.wahwei/reactnative.codeguides.io/troubleshooting/post-mortem-template-for-mobile/) |

---

### 10. Post-Incident Minimum (Same Day)

Before the team disperses, capture enough for tomorrow's post-mortem:

```markdown
## Same-day capture (scribe owns)
 
- [ ] Incident start/end UTC
- [ ] Final severity
- [ ] Affected releases: native builds + OTA ids
- [ ] Containment actions with timestamps
- [ ] Customer-visible duration
- [ ] Link to Sentry cluster / EAS update group
- [ ] Schedule post-mortem within 5 business days (SEV1/SEV2)
```

* "We'll write it up later" loses decision rationale - scribe notes beat memory
* Blameless post-mortems still require factual timelines - see [Post-Mortem Template for Mobile](https://docs.wahwei/reactnative.codeguides.io/troubleshooting/post-mortem-template-for-mobile/)

---

## FAQs

Who should be Incident Commander?

The on-call mobile engineer or release manager with authority to pause store rollouts and approve OTA rollback. IC does not need to be the person who wrote the buggy code - they need decision authority and calm under alert noise.

Is a crash spike always SEV2?

No. A spike on an optional tab affecting <1% of sessions with a kill switch available may be SEV3. Payment or auth regression on the live production build is SEV2 or SEV1 depending on scope. Use the severity matrix in Example 1, not alert volume alone.

What if we cannot tell OTA from native?

Filter Sentry by `dist` (OTA update id) and `release` (native version+build). If crashes span all OTA ids on one native build, suspect native. If isolated to one update id, suspect JS bundle. See [Crash Spike Triage](https://docs.wahwei/reactnative.codeguides.io/troubleshooting/crash-spike-triage/).

## Related

* [Observability Basics](https://docs.wahwei/reactnative.codeguides.io/observability/observability-basics/) - signal stack and release context
* [Sentry for React Native](https://docs.wahwei/reactnative.codeguides.io/observability/sentry-for-react-native/) - release health and clustering
* [Rollback Runbook](https://docs.wahwei/reactnative.codeguides.io/ota-updates/rollback-runbook/) - OTA channel republish
* [Store Incident Response](https://docs.wahwei/reactnative.codeguides.io/store-operations/store-incident-response/) - delisting and policy events
* [Crash Spike Triage](https://docs.wahwei/reactnative.codeguides.io/troubleshooting/crash-spike-triage/) - Sentry clustering and bisect
* [Production Troubleshooting Best Practices](https://docs.wahwei/reactnative.codeguides.io/troubleshooting/best-practices/) - 25-item summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
