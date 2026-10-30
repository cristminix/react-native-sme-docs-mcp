# TestFlight Distribution

Internal/external testers and build expiration handling - the TestFlight cookbook for shipping Expo SDK 57 IPAs to QA, stakeholders, and beta users before App Store release.

Highlights / TestFlight Distribution

* Internal testers: up to 100 App Store Connect users - no Beta App Review
* External testers: up to 10,000 - requires Beta App Review per build
* TestFlight builds expire after 90 days - plan rebuild cadence for long QA cycles
* eas build + eas submit uploads IPAs; Connect distributes to TestFlight groups
* TestFlight uses production APNs - match push entitlements before push QA
* Universal links and associated domains need TestFlight builds, not Expo Go

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
# Build production-shaped IPA for TestFlight
eas build --profile production --platform ios
 
# Upload to App Store Connect (TestFlight tab)
eas submit --platform ios --latest
 
# Or build + submit in one workflow (eas.json)
eas build --profile production --platform ios --auto-submit
```

```json
// eas.json - production profile for TestFlight
{
  "build": {
    "production": {
      "distribution": "store",
      "ios": {
        "simulator": false
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "you@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCDE12345"
      }
    }
  }
}
```

**When to reach for this:**

* QA needs an installable iOS build without public App Store release.
* Validating universal links, push, Sign in with Apple, or IAP on real devices.
* Stakeholder demos on physical iPhones outside your USB cable.
* Dogfooding a release candidate before `eas submit` to App Review.
* Managing beta groups across marketing, QA, and executive teams.

## Working Example

**Step 1 - Configure EAS credentials**

```bash
eas credentials --platform ios
# Distribution cert + App Store provisioning profile for bundle ID
```

Ensure App Store Connect has an app record matching `ios.bundleIdentifier`.

**Step 2 - Build and submit**

```bash
eas build --profile production --platform ios
eas submit --platform ios --latest
```

App Store Connect → **TestFlight** tab → build shows **Processing** (5–30 minutes) then **Ready to Test**.

**Step 3 - Internal testing (fast path)**

| Property | Internal testers |
| --- | --- |
| Who | App Store Connect users with Admin/Developer/Marketing/Customer Support role |
| Limit | 100 users |
| Beta App Review | **Not required** |
| Expiration | **90 days** from upload |
| Use for | Engineering, PM, design - daily QA |

1. TestFlight → **Internal Testing** → default group or create group.
2. Add builds - latest upload auto-available to internal group.
3. Testers install **TestFlight** app from App Store → accept invite → install build.

**Step 4 - External testing (wider beta)**

| Property | External testers |
| --- | --- |
| Who | Email invites or public link |
| Limit | 10,000 testers |
| Beta App Review | **Required** per build (first external) |
| What Apple checks | Crashes, placeholder content, obvious guideline violations |
| Use for | Beta program, friendly customers, UAT |

1. TestFlight → **External Testing** → create group (e.g. `Public Beta`).
2. Add build → fill **What to Test** notes for reviewers.
3. Submit for Beta App Review - usually hours, not days.
4. Share **Public Link** or email invites.

**Step 5 - Handle 90-day expiration**

```text
TestFlight build expires: 2026-04-08
Today: 2026-04-01
Action: schedule eas build this week; notify testers before lapse
```

```bash
# Rebuild same git tag or release branch
eas build --profile production --platform ios
eas submit --platform ios --latest
# External groups: new build may need Beta App Review if material changes
```

Automate reminders:

```yaml
# .github/workflows/testflight-expiry-reminder.yml (conceptual)
# Parse Connect API for earliest expiring build; Slack when < 14 days
```

**What this demonstrates:**

* **Internal** path skips Beta App Review - fastest loop for engineering.
* **External** path scales to thousands with Apple gate.
* **90-day expiration** is hard - plan rebuilds for marathons QA.
* **Production profile** matches App Store signing and entitlements.

## Deep Dive

### TestFlight vs other iOS distribution

| Channel | Profile | Install method | Expires |
| --- | --- | --- | --- |
| **TestFlight internal** | `production` / `store` | TestFlight app | 90 days |
| **TestFlight external** | `production` / `store` | TestFlight app | 90 days |
| **Ad hoc** | `preview` / `internal` | Direct IPA / QR (EAS) | 1 year cert |
| **Development** | `development` | USB / dev client | 7-day cert (dev) |
| **App Store** | `production` | Public store | Until replaced |

For universal links and push, prefer **TestFlight** (production `aps-environment`) over dev clients when validating production behavior.

### Processing states

```text
Upload received → Processing → Ready to Test → (External) Waiting for Review → Testing
                     ↓ fail
                  Invalid Binary / Missing Compliance
```

**Missing Compliance:** Answer encryption questions in Connect - same as App Store.

**Invalid Binary:** Often privacy manifest (ITMS-91053) - fix before testers see anything.

### Tester experience

1. Receive email or public link.
2. Install Apple **TestFlight** app (if missing).
3. Accept invite → **Install** → app appears on home screen.
4. TestFlight shows **What to Test** release notes you provide.
5. Automatic updates when you assign newer builds to their group.

Crash logs and screenshots flow back to Connect → TestFlight → build → **Crashes**.

### What to Test notes (template)

```text
Build 1.4.0 (42) - March 2026 beta
 
Focus:
- Universal link: https://shop.example.com/orders/demo opens Order screen
- Push: enable notifications on login; tap notification routes to inbox
- Account deletion: Settings → Delete Account
 
Known issues:
- iPad layout minor clipping in cart - fix scheduled 1.4.1
 
Credentials: review@example.com / BetaDemo2026!
```

### Pairing with CI

```bash
# Non-interactive CI submit
EXPO_TOKEN=xxx eas build --profile production --platform ios --non-interactive
EXPO_TOKEN=xxx eas submit --platform ios --latest --non-interactive
```

Gate submit on `expo-doctor`, tests, and internal TestFlight soak time before external beta.

### Simulator builds

```json
"ios": { "simulator": true }
```

* Produces `.app` for Simulator - **cannot** upload to TestFlight.
* TestFlight requires device IPAs (`simulator: false`).

## Gotchas

* **Using `developmentClient: true` for TestFlight** - wrong binary type for store distribution. **Fix:** production profile without dev client flag for TestFlight track.
* **Expecting push on sandbox with TestFlight build** - TestFlight uses **production** APNs. **Fix:** production push key in provider; correct `aps-environment`.
* **Build expired mid-UAT** - testers cannot install or update. **Fix:** rebuild before day 90; communicate in Slack.
* **External beta blocked on first crash** - Beta App Review rejects unstable builds. **Fix:** internal soak first.
* **Wrong bundle ID in Connect** - upload succeeds to wrong app. **Fix:** match `ascAppId` in `eas.json` submit profile.
* **Universal links "work in simulator" but fail TestFlight** - AASA / `appID` mismatch with production bundle. **Fix:** [iOS Universal Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/ios-universal-links/).

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| EAS internal distribution (ad hoc) | Quick QR install, no TestFlight | Need 500+ testers or crash analytics in Connect |
| Xcode Organizer upload | Manual one-off without EAS | Team already standardized on `eas submit` |
| Firebase App Distribution | Cross-platform Android+iOS informal QA | You want Apple-native tester management |
| App Store phased release | Post-approval gradual rollout | Pre-release validation |

## FAQs

How many builds can I have active?

* Connect keeps a rolling window of builds; expired builds drop off TestFlight.
* Practical limit: rebuild monthly for active beta programs.

Can testers stay on an old build?

* Yes - TestFlight does not force upgrade unless you expire old builds or stop distributing them.
* Communicate minimum build for API compatibility.

Does TestFlight use the same IPA as App Store?

* Yes - same `production` artifact; App Review is a separate gate after TestFlight validation.

Public link vs email invite?

* Public link: anyone with link can join (up to 10,000) - good for open beta.
* Email: controlled list - good for NDAs and enterprise pilots.

Can I test IAP in TestFlight?

* Yes - Sandbox Apple ID for purchases; TestFlight builds use sandbox StoreKit environment.

What about App Store Connect API keys?

* Prefer API key for CI `eas submit` over Apple ID password + 2FA.
* Create in Users and Access → Integrations → App Store Connect API.

## Related

* [App Store Review Guidelines](https://docs.wahwei/reactnative.codeguides.io/ios-platform/app-store-review-guidelines/) - what Beta App Review screens for
* [EAS Submit](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-submit/) - upload automation
* [Internal Distribution](https://docs.wahwei/reactnative.codeguides.io/eas-build/internal-distribution/) - ad hoc alternative
* [iOS Credentials & Provisioning](https://docs.wahwei/reactnative.codeguides.io/eas-build/ios-credentials-and-provisioning/) - signing setup
* [Physical Device Testing](https://docs.wahwei/reactnative.codeguides.io/expo-cli/physical-device-testing/) - USB before TestFlight
* [iOS Universal Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/ios-universal-links/) - device verification
* [Deep Link Testing Matrix](https://docs.wahwei/reactnative.codeguides.io/deep-linking/deep-link-testing-matrix/) - TestFlight test cases

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

WTI5a1pXZDFhV1JsY3k1cGIzeGpaMmx2T1RNemZESXdNall3Tnc9PQ==

Reviewed by Chris St. John·Last updated Jul 19, 2026
