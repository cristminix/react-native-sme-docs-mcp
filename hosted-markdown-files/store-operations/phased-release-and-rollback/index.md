# Phased Release & Rollback

Pausing iOS phased release and halting Play rollout - the cookbook for **containing bad releases** on Expo SDK 57 apps without waiting for full user exposure. Upload still flows through [EAS Submit](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-submit/); this page covers operator actions in App Store Connect and Play Console after a build is live or partially live.

Highlights / Phased Release & Rollback

* iOS phased release spreads to 100% over 7 days - you can pause or accelerate from App Store Connect
* Play staged rollout is manual percentage - halt stops new installs without pulling existing users
* Neither store rolls back binaries automatically - you submit a prior or fixed build
* Crash spikes during partial rollout are the signal to pause - not Twitter alone
* OTA (EAS Update) can mitigate JS-only bugs; native regressions need new store build
* Document who has Console access to pause rollout before incident hour

## Recipe

> Quick-reference recipe card - copy-paste ready.

```markdown
## Rollback decision tree (first 15 minutes)
1. Confirm bad build number in Sentry / Play Vitals matches live release
2. Classify: native crash (store build) vs JS logic (EAS Update candidate)
3. iOS: App Store Connect → pause phased release
4. Android: Play Console → halt staged rollout
5. If native: prepare hotfix build OR promote last-known-good versionCode / buildNumber
6. Post status page + in-app banner if auth/checkout broken
```

```bash
# Hotfix path - increment build numbers, rebuild, resubmit
# app.config.ts: ios.buildNumber + android.versionCode bumped
eas build --profile production --platform all
eas submit --platform ios --latest
eas submit --platform android --latest
```

**When to reach for this:**

* Crash-free rate drops > 0.5% during first day of rollout.
* ANR rate doubles on Android vitals at 20% staged rollout.
* Checkout or auth regression confirmed in production - not a flaky A/B test.
* Marketing pushed before engineering validated phased cohort metrics.
* You need to **stop new adopters** while deciding between OTA fix and hotfix binary.

---

## Working Example

### Scenario - 2.4.0 regression at partial rollout

**Symptoms:** iOS phased release day 2 (~28% users); Android at 20% staged rollout. Sentry shows 3.2% crash rate on `240012` (baseline 0.4%). Stack trace: null pointer in native module after RN 0.86 upgrade.

**Step 1 - Pause new exposure**

| Platform | Console path | Action |
| --- | --- | --- |
| iOS | App Store Connect → **Apps** → **ShopApp** → **Activity** → version **2.4.0** | **Pause Phased Release** |
| Android | Play Console → **Release** → **Production** → active release | **Halt rollout** (stops at current %) |

* **Pause iOS phased release** - users who already received update keep it; no new users get 2.4.0 until resumed or replaced.
* **Halt Play rollout** - same behavior; existing installs stay on bad build until they update again.

**Step 2 - Assess rollback options**

| Fix type | Tool | Time to users |
| --- | --- | --- |
| JS-only bug | EAS Update (runtime compatible) | Minutes–hours |
| Native crash | New store binary | 1–3+ days (review) |
| Server-side | API flag / config | Minutes |

This crash is **native** - OTA will not help. Proceed with hotfix **2.4.1** build `240013`.

**Step 3 - iOS: release strategy while paused**

1. Build and submit hotfix IPA via EAS.
2. Submit **2.4.1** for App Review - mention regression fix in review notes.
3. Options while waiting:
   * Leave **2.4.0 phased release paused** (limits blast radius).
   * If Apple approves **2.4.1** before pause expires, **release 2.4.1** with phased release enabled - do not resume 2.4.0.
4. **Cannot "downgrade"** users on iOS - users on 2.4.0 need forward fix 2.4.1.

```markdown
<!-- App Store Connect review note addendum -->
2.4.1 fixes crash on cold start (Sentry issue SHOP-4412) introduced in 2.4.0 build 240012.
2.4.0 phased release is paused. No new users receive 2.4.0.
```

**Step 4 - Android: halt + superseding release**

1. Play Console → **Production** → confirm rollout **halted** at 20%.
2. Upload hotfix AAB `versionCode 240013` via `eas submit`.
3. Create new production release with **100%** or restart **staged rollout at 5%** for the fix.
4. Google does not auto-replace installs - users on 2.4.0 pull 2.4.1 when they update.

```json
// eas.json - hotfix submit (same profiles, new versionCode in app.config.ts)
{
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./secrets/play-service-account.json",
        "track": "production"
      }
    }
  }
}
```

**Step 5 - Resume safe rollout**

| Platform | When metrics clean | Action |
| --- | --- | --- |
| iOS | 2.4.1 approved | Release with **phased release ON**; monitor 48h |
| Android | 2.4.1 at 5% for 24h | Increase 5 → 20 → 50 → 100 |

**Step 6 - Postmortem hooks**

* Tag Sentry releases with `buildNumber` / `versionCode`.
* Add go/no-go checklist to [Store Operations Basics](https://docs.wahwei/reactnative.codeguides.io/store-operations/store-operations-basics/) example 9.
* File incident doc if severity warranted - [Store Incident Response](https://docs.wahwei/reactnative.codeguides.io/store-operations/store-incident-response/).

---

## iOS Phased Release Reference

| Day (approx.) | % of auto-update users |
| --- | --- |
| Day 1 | 1% |
| Day 2 | 2% |
| Day 3 | 5% |
| Day 4 | 10% |
| Day 5 | 20% |
| Day 6 | 50% |
| Day 7 | 100% |

**Controls in App Store Connect:**

* **Pause Phased Release** - freeze percentage until resumed.
* **Release Update to All Users** - skip remaining phased days (use only when hotfix validated).
* **Turn off phased release** on next version - instant 100% (higher risk).

Users who **manually update** from the App Store may receive the build immediately regardless of phase - phased applies to automatic updates.

---

## Android Staged Rollout Reference

| Control | Effect |
| --- | --- |
| **Staged rollout 5%** | 5% of eligible new updaters receive release |
| **Increase percentage** | More users offered update; irreversible except halt |
| **Halt rollout** | Freeze at current %; no new users get release |
| **Full rollout 100%** | All eligible users offered update |

**Android vitals** (Play Console → **Quality** → **Android vitals**):

* **User-perceived crash rate**
* **ANR rate**
* Compare **versionCode** slices - not just aggregate app stats.

---

## EAS Update as Partial Mitigation

When the bug is **JavaScript-only** and runtime version policy allows:

```bash
eas update --branch production --message "fix: cart total rounding"
```

* Users on bad **native** build still need store hotfix if native code changed.
* Do not OTA over a crash-on-launch native regression - app never reaches JS bundle.
* Pair with feature flags to disable broken screens while update propagates.

---

## Rollback Limitations

| Expectation | Reality |
| --- | --- |
| "Roll back to 2.3.9 in stores" | Stores forward-only - submit 2.3.10 or 2.4.1 fix |
| "Pull binary from users' phones" | Not possible - only stop new installs |
| "Same versionCode re-upload" | Play rejects duplicate; iOS rejects duplicate build number |
| "Instant fix worldwide" | Review queue + phased/staged timing |

---

## FAQs

Pause phased release vs removing app from sale?

* **Pause phased** limits new updates to bad build - app stays available.
* **Remove from sale** is nuclear - use only for legal/policy crisis; see incident response doc.

Who can halt Play rollout?

* Users with **Release to production** permission.
* Document named backups - vacations cause delay.

Should first release use phased/staged?

* **Yes** for established apps with meaningful DAU.
* First-ever launch has no prior baseline - still consider 10% Android staged after internal track sign-off.

Expedited review for rollback hotfix?

* Request only with user-impact evidence - [App Store Connect Workflow](https://docs.wahwei/reactnative.codeguides.io/store-operations/app-store-connect-workflow/) expedited checklist.

## Related

* [App Store Connect Workflow](https://docs.wahwei/reactnative.codeguides.io/store-operations/app-store-connect-workflow/) - phased release on submit
* [Google Play Console Workflow](https://docs.wahwei/reactnative.codeguides.io/store-operations/google-play-console-workflow/) - staged rollout setup
* [Store Operations Basics](https://docs.wahwei/reactnative.codeguides.io/store-operations/store-operations-basics/) - monitoring after go-live
* [Feature Flags for Safe Rollout](https://docs.wahwei/reactnative.codeguides.io/error-resilience/feature-flags-for-safe-rollout/) - JS mitigation
* [EAS Submit](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-submit/) - hotfix upload
* [Store Incident Response](https://docs.wahwei/reactnative.codeguides.io/store-operations/store-incident-response/) - severe outage comms

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
