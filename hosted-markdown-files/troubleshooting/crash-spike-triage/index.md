# Crash Spike Triage

A cookbook for **Sentry clustering**, **bisecting releases**, and **sizing user impact** when crash-free sessions drop after a store rollout or OTA publish. Assumes production is wired per [Sentry for React Native](https://docs.wahwei/reactnative.codeguides.io/observability/sentry-for-react-native/) and release identity per [Observability Basics](https://docs.wahwei/reactnative.codeguides.io/observability/observability-basics/).

Highlights / Crash Spike Triage

* Cluster by fingerprint and release tags before reading individual stack traces
* Bisect OTA update id vs native build - wrong layer wastes the rollback window
* Crash-free sessions beats raw event count for user impact sizing
* Compare phased rollout % to crash cohort size - small rollout can still be SEV2
* Symbolicated stacks required - unsymbolicated Hermes frames are not triage
* Document suspect update group id in the incident channel within 10 minutes

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
# 1. Confirm spike (Sentry UI or API)
#    Filter: environment=production, last 1h vs 24h baseline
 
# 2. Segment by native release
#    Group by: release (e.g. 2.4.0+240012)
 
# 3. Segment by OTA dist within top release
#    Group by: dist (expo-updates updateId)
 
# 4. Open top issue cluster - note fingerprint + first seen
 
# 5. Correlate with deploy timeline
eas update:list --branch production --limit 5
# App Store Connect: phased release % / Play: staged rollout %
 
# 6. Contain (parallel with triage)
#    Pause rollout / eas update:rollback / kill switch
 
# 7. Size impact
#    crash-free sessions delta × DAU estimate = affected users
```

**When to reach for this:**

* Sentry alert: crash-free sessions dropped >2% absolute vs 7-day baseline
* Support ticket volume for "app closes" correlates with alert window
* Release Health shows new issue fingerprint with steep `first seen` ramp

**When to escalate instead of bisecting:**

* Spike across **all** releases and OTA ids simultaneously → backend or CDN incident
* Native-only SIGABRT with no new OTA → store build rollback path, not channel revert
* Unsymbolicated stacks only → fix source map upload first - see [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/)

---

## Working Example

A **45-minute triage drill** for a crash spike on production after an OTA publish.

### T+0 - Confirm the spike is real (5 min)

```text
Baseline (7d):  99.4% crash-free sessions
Current (1h):   96.8% crash-free sessions
Delta:          -2.6% absolute  →  exceeds rollback trigger
```

Sentry Release Health filters:

| Filter | Value |
| --- | --- |
| `environment` | `production` |
| `release` | `2.4.0+240012` (latest live native) |
| Time range | Last 1 hour vs previous 24 hours |

* Ignore dev and preview environments in production numerators - see [SLOs for Mobile Apps](https://docs.wahwei/reactnative.codeguides.io/observability/slos-for-mobile-apps/)
* Compare **sessions**, not raw event count - one loop crash generates hundreds of events

---

### T+5 - Cluster issues (10 min)

Open **Issues** sorted by event volume in the alert window.

```text
Top cluster:
  Fingerprint: checkout-screen-null-ref
  First seen:  2026-07-09 14:02 UTC
  Events:      4,200 (82% of spike)
  Releases:    2.4.0+240012 only
  Dist:        abc123-update-group (single OTA id)
```

Sentry query patterns:

```text
is:unresolved release:2.4.0+240012 dist:abc123-update-group
```

| Cluster pattern | Interpretation |
| --- | --- |
| One fingerprint, one `dist` | Bad OTA bundle - rollback channel |
| One fingerprint, all `dist` on one `release` | Native regression in that binary |
| Many fingerprints, one `dist` | Bad OTA with multiple bugs - still rollback |
| Many fingerprints, all releases | Backend, config, or third-party SDK outage |

* **Breadcrumbs** on the top event: last navigation route, API failures, flag state
* If fingerprint is `NativeModule` / `SIGABRT`, skip OTA bisect - open native war room

---

### T+15 - Bisect releases (10 min)

Timeline on a whiteboard or incident doc:

```markdown
| UTC Time | Event |
|----------|-------|
| 13:45 | Backend deploy v892 - no mobile change |
| 14:02 | eas update --channel production (group abc123) |
| 14:05 | Sentry alert fired |
| 14:08 | iOS phased at 25% - build 240012 |
```

**Bisect decision tree:**

```text
Crash only on dist abc123?
  YES → Suspect OTA. eas update:view abc123. Rollback per OTA Emergency Rollback.
  NO  → Crash on all dist values for release 2.4.0+240012?
          YES → Suspect native binary. Pause phased release. Hotfix build.
          NO  → Crash on multiple native releases?
                  YES → Backend / shared dependency. Engage API on-call.
```

```bash
# OTA bisect
eas update:list --branch production --limit 5
eas update:view <suspect-group-id>
 
# Git bisect (after identifying suspect SHA)
git log --oneline <last-good-sha>..<suspect-sha> -- app/ src/
```

* `eas update:list` timestamp should precede Sentry `first seen` by minutes (OTA propagation)
* Store rollout % alone does not explain OTA-only dist clustering

---

### T+25 - Size user impact (5 min)

```ts
// Rough impact estimate for IC / exec comms
type ImpactEstimate = {
  crashFreeDelta: number;      // e.g. -0.026 (99.4% → 96.8%)
  sessionsLastHour: number;  // from Sentry Release Health
  dau: number;               // from analytics
};
 
function estimateAffectedUsers(e: ImpactEstimate): number {
  const crashedSessions = e.sessionsLastHour * e.crashFreeDelta;
  // Scale to DAU if spike is sustained - conservative for exec comms
  return Math.round(Math.min(crashedSessions, e.dau * e.crashFreeDelta));
}
```

| Input | Source |
| --- | --- |
| `crashFreeDelta` | Sentry Release Health |
| `sessionsLastHour` | Sentry Release Health |
| Phased rollout % | App Store Connect / Play Console - [Phased Release & Rollback](https://docs.wahwei/reactnative.codeguides.io/store-operations/phased-release-and-rollback/) |
| OTA adoption % | Analytics tag `otaUpdateId` cohort size |

**Example comms line for IC:**

```text
~2.6% session crash rate on production; top cluster affects checkout on OTA abc123.
iOS phased at 25% (~40k users). Containment: OTA rollback in progress.
```

* Under-reporting beats exaggerating - give ranges ("tens of thousands") if analytics lags
* Payment route crashes use revenue metrics, not just crash-free rate

---

### T+30 - Contain while triage finishes (parallel)

| Finding | Action |
| --- | --- |
| Single bad OTA `dist` | [OTA Emergency Rollback](https://docs.wahwei/reactnative.codeguides.io/troubleshooting/ota-emergency-rollback/) |
| Bad native build | Pause phased / halt staged; flag off |
| Isolated feature | Remote kill switch first |
| Backend correlation | Page API team; mobile holds rollouts |

```bash
eas update:rollback
eas channel:view production
```

Monitor 60 minutes post-containment - crash-free should recover toward baseline. If not, second cluster or wrong layer - re-bisect.

---

## Sentry Configuration for Triage

Ensure these are set at init - otherwise bisect fails silently:

```tsx
// app/_layout.tsx
import * as Sentry from "@sentry/react-native";
import * as Application from "expo-application";
import * as Updates from "expo-updates";
 
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  release: `${Application.nativeApplicationVersion}+${Application.nativeBuildVersion}`,
  dist: Updates.updateId ?? Application.nativeBuildVersion ?? "embedded",
  environment: process.env.EXPO_PUBLIC_APP_ENV,
  enableAutoSessionTracking: true,
});
```

| Tag | Purpose in triage |
| --- | --- |
| `release` | Native build bisect |
| `dist` | OTA bundle bisect |
| `environment` | Exclude preview from production alerts |
| `transaction` / route | Screen-level clustering |

* Upload source maps on every EAS production build - unsymbolicated stacks block fingerprint accuracy
* Tag [Staged Rollouts](https://docs.wahwei/reactnative.codeguides.io/ota-updates/staged-rollouts/) cohorts during percentage OTA publishes

---

## Common Triage Mistakes

| Mistake | Fix |
| --- | --- |
| Chasing every event individually | Sort by fingerprint; top 3 clusters usually explain >90% |
| Rolling back OTA for native SIGABRT | Check issue platform and stack - native frames skip JS rollback |
| Ignoring phased rollout % | 5% rollout × high crash rate still hits revenue if checkout |
| No `dist` tag | Wire `Updates.updateId` before next incident |
| Declaring victory at 30 min | Watch Release Health for 60 min - slow OTA adoption masks recovery |

---

## FAQs

How do I cluster in Sentry during an incident?

Issues → sort by Events in time window → open top issue → check **First Seen**, **Releases**, and **Dist** distribution. Use Discover queries to group by `dist` when the Issues UI is noisy. Same fingerprint = same root cause candidate.

OTA rollback did not fix crashes - now what?

Re-check `dist` on incoming events - if `dist` unchanged, clients have not picked up rollback yet (wait or force reload policy). If `dist` changed but crashes persist, suspect native layer or second bug. Re-cluster from T+0.

What rollback trigger should we use?

Common mobile thresholds: crash-free -2% absolute, payment success -1% absolute, auth errors +3% relative. Define in [SLOs for Mobile Apps](https://docs.wahwei/reactnative.codeguides.io/observability/slos-for-mobile-apps/) and [Rollback Runbook](https://docs.wahwei/reactnative.codeguides.io/ota-updates/rollback-runbook/) before launch.

## Related

* [Sentry for React Native](https://docs.wahwei/reactnative.codeguides.io/observability/sentry-for-react-native/) - init, source maps, release health
* [Observability Best Practices](https://docs.wahwei/reactnative.codeguides.io/observability/best-practices/) - tag every signal
* [OTA Emergency Rollback](https://docs.wahwei/reactnative.codeguides.io/troubleshooting/ota-emergency-rollback/) - channel revert under pressure
* [Rollback Runbook](https://docs.wahwei/reactnative.codeguides.io/ota-updates/rollback-runbook/) - full OTA rollback playbook
* [Mobile Incident Basics](https://docs.wahwei/reactnative.codeguides.io/troubleshooting/mobile-incident-basics/) - first 15 minutes
* [Phased Release & Rollback](https://docs.wahwei/reactnative.codeguides.io/store-operations/phased-release-and-rollback/) - store rollout containment

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
