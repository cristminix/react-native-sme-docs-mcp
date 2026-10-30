# Internal Testing Tracks

Closed and open testing tracks on Google Play - the cookbook for shipping Expo SDK 57 Android builds to real testers before production users see regressions. Tracks are Play Console distribution channels; EAS Submit pushes signed AABs into them.

Highlights / Internal Testing Tracks

* Internal → closed → open → production is the risk gradient - catch policy and native bugs early
* Internal track accepts builds in minutes; up to 100 testers - ideal for QA and founders
* Closed testing supports email lists and Google Groups before public open beta
* eas submit --track internal automates upload; versionCode must monotonically increase
* Production staged rollout percentage is separate - start at 5–10% after tracks pass

## Recipe

> Quick-reference recipe card - copy-paste ready.

```json
// eas.json
{
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./secrets/play-service-account.json",
        "track": "internal"
      }
    },
    "closed-beta": {
      "android": {
        "serviceAccountKeyPath": "./secrets/play-service-account.json",
        "track": "alpha"
      }
    },
    "open-beta": {
      "android": {
        "serviceAccountKeyPath": "./secrets/play-service-account.json",
        "track": "beta"
      }
    }
  }
}
```

```bash
# Build release AAB
eas build --platform android --profile production
 
# Submit to internal testing (fastest feedback loop)
eas submit --platform android --profile production --latest
 
# Promote in Play Console UI: internal → closed → open → production
# Or submit directly to alpha/beta with matching eas.json profile
eas submit --platform android --profile closed-beta --latest
```

```ts
// app.config.ts - monotonic versionCode (required every upload)
export default {
  expo: {
    version: "2.4.0",
    android: {
      package: "com.example.shopapp",
      versionCode: 240012, // increment every Play upload
    },
  },
};
```

**When to reach for this:**

* First Play Store release - internal track validates signing, Data safety, and content rating before production.
* QA needs a Play-delivered build (not just EAS internal APK link) to test in-app purchases and App Links.
* You want 500 beta testers on closed track before 5% production staged rollout.
* Policy rejection - fix on internal, resubmit without touching production users.

## Working Example

**Step 1 - Create Play app and complete store listing basics**

1. Play Console → **Create app**.
2. Finish **Dashboard** required tasks: privacy policy, Data safety, content rating, target audience.
3. Enable **Play App Signing** on first upload.

**Step 2 - Service account for EAS Submit**

```bash
# Play Console → Users and permissions → Invite user → Service account
# Google Cloud → IAM → Create key JSON → save as secrets/play-service-account.json
# Grant Release manager (or minimum: Release to testing tracks)
```

**Step 3 - Internal track first upload**

```bash
eas build --platform android --profile production
eas submit --platform android --profile production --latest
```

Play Console → **Testing → Internal testing** → release appears after processing (~minutes to hours).

**Step 4 - Add testers**

| Track | Tester limit | How to add |
| --- | --- | --- |
| Internal | 100 | Email list in Internal testing → Testers tab |
| Closed (alpha) | Unlimited (invited) | Email lists or Google Groups |
| Open (beta) | Unlimited (public) | Opt-in URL anyone can join |
| Production | All users | Staged rollout % |

Share opt-in link from **Testers → Copy link** - testers accept invite, then install from Play Store.

**Step 5 - Promote after QA sign-off**

Play Console → **Promote release** from internal → closed → production.

Or submit a new build directly to production track with updated `eas.json` `"track": "production"` when ready.

**Step 6 - Verify App Links on internal build**

```bash
# After internal release is live on Play (re-signed with app signing key)
adb shell pm get-app-links com.example.shopapp
```

Use Play **App signing** SHA-256 in `assetlinks.json` - see [Android App Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/android-app-links/).

**What this demonstrates:**

* **Internal track** - fastest path from `eas submit` to installable Play build.
* **Service account** - CI-friendly non-interactive uploads.
* **versionCode** - must increase per upload across all tracks.
* **Promotion flow** - same artifact can climb tracks without rebuild.

## Deep Dive

### How It Works

* **Tracks** are Play Console release channels sharing one `applicationId` but different tester audiences.
* **AAB processing** - Google generates device-specific APKs after upload; testers download via Play Store, not sideload.
* **Same signing pipeline** - all tracks get Play App Signing; differences are visibility and rollout rules only.
* **EAS Submit** - uses Google Play Developer API (`edits.insert` + `bundles.upload`) to place AAB on chosen track.
* **Review** - Internal testing often skips lengthy review; **production** and sometimes **open testing** trigger policy review.

### Track Comparison

| Track | Play API name | Audience | Review speed | Typical use |
| --- | --- | --- | --- | --- |
| Internal | `internal` | Up to 100 invited | Fastest | Engineering, PM, design QA |
| Closed | `alpha` | Invited lists / groups | Fast | Beta customers under NDA |
| Open | `beta` | Public opt-in | Medium | Public beta, scale testing |
| Production | `production` | Everyone | Full | Staged rollout 1% → 100% |

```json
// eas.json track mapping (common convention)
// "alpha"  → Closed testing
// "beta"   → Open testing
// "internal" → Internal testing
```

### Versioning Rules

| Field | Where | Rule |
| --- | --- | --- |
| `version` | `app.config` `version` | User-visible semver (`2.4.0`) |
| `versionCode` | `app.config` `android.versionCode` | Integer - strictly increasing per upload |
| `versionName` | Derived from `version` in Gradle | Shown in Play listing |

```json
// eas.json - auto-increment versionCode on EAS Build
{
  "build": {
    "production": {
      "autoIncrement": true
    }
  }
}
```

### What to Test per Track

| Checkpoint | Internal | Closed | Open | Production |
| --- | --- | --- | --- | --- |
| Cold start / login | ✓ | ✓ | ✓ | ✓ |
| Push notifications | ✓ | ✓ | ✓ | ✓ |
| In-app purchases | ✓ | ✓ | ✓ | ✓ |
| App Links (verified) | ✓ | ✓ | ✓ | ✓ |
| Data safety accuracy | ✓ | ✓ | ✓ | ✓ |
| 16 KB page size devices | ✓ | ✓ | ✓ | ✓ |
| Low-RAM phone | Optional | ✓ | ✓ | ✓ |

### CI Pipeline Sketch

```yaml
# .github/workflows/android-release.yml (conceptual)
jobs:
  build-submit-internal:
    steps:
      - run: eas build --platform android --profile production --non-interactive
      - run: eas submit --platform android --profile production --latest --non-interactive
```

Gate production promotion on QA checklist + crash-free sessions in internal track.

## Gotchas

* **Same versionCode on resubmit** - Play rejects duplicate. **Fix:** Increment `versionCode` or enable `autoIncrement`.
* **Testers can't find app** - They must accept opt-in link with the Google account on device. **Fix:** Resend link; check account mismatch.
* **Testing debug APK instead of Play build** - IAP and App Links behave differently. **Fix:** Install from Play internal track after `eas submit`.
* **Skipping Data safety on internal** - Dashboard may block all tracks until complete. **Fix:** Finish compliance tasks first.
* **Open beta before closed validation** - Public one-star reviews on beta builds. **Fix:** Closed track with invited power users first.
* **Promote broken build to production** - Promotion copies release notes, not a new QA pass. **Fix:** Run checklist on each track promotion.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| EAS internal distribution (APK link) | Hourly dev QA, no Play needed | Testing Play billing or App Links |
| Firebase App Distribution | Cross-platform, non-Play | Play policy / IAP validation |
| Sideload `adb install` | Engineer-only smoke | PM/design testers without adb |
| Production 1% staged only | Tiny user base | No beta audience - risky |

## FAQs

How fast is internal testing available?

* Often minutes after processing; first app may take longer while Play completes setup tasks.
* Processing status appears in Play Console release dashboard.

Can I have multiple releases on one track?

* One active release per track at a time; new upload replaces or rolls forward depending on rollout state.
* Halt rollout before uploading conflicting version if needed.

Do internal testers need to pay for the app?

* Free apps: testers install at no cost.
* Paid apps: testers may need license testing configuration in Play Console.

What is the difference between alpha and beta tracks?

* **Alpha (closed)** - invite-only lists.
* **Beta (open)** - public opt-in link; anyone can join.
* Names are historical; think closed vs open.

Can EAS Submit go directly to production?

* Yes - set `"track": "production"` in `eas.json`.
* Recommended: internal first, then promote after QA for new apps.

How do release notes work per track?

* Enter per track in Play Console or via API metadata.
* Copy internal QA notes to closed/open when promoting - users read beta notes.

Does OTA (expo-updates) work on testing tracks?

* Yes - same binary; OTA targets runtime version policy.
* Native changes still need new AAB on a track.

How do I remove a tester?

* Play Console → track → Testers → remove email or disable opt-in link for open beta.

What permissions do the service account need?

* **Release to testing tracks** for internal/closed/open.
* **Release to production** for production submits - narrower IAM is better.

How does this connect to App Links?

* First Play upload establishes app signing cert for `assetlinks.json`.
* Verify links on internal track before production - [Android App Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/android-app-links/).

## Related

* [Signing & Play App Signing](https://docs.wahwei/reactnative.codeguides.io/android-platform/signing-and-play-app-signing/) - upload key and Play App Signing
* [Permissions & Play Policy](https://docs.wahwei/reactnative.codeguides.io/android-platform/permissions-and-play-policy/) - Data safety before any track ships
* [Android App Links](https://docs.wahwei/reactnative.codeguides.io/deep-linking/android-app-links/) - verify HTTPS links on internal builds
* [16 KB Page Size & Device Matrix](https://docs.wahwei/reactnative.codeguides.io/android-platform/16-kb-page-size-and-device-matrix/) - test matrix before open beta
* [../eas-build/eas-submit/eas-submit.md](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-submit/) - submit automation details
* [../store-operations/phased-release-and-rollback/phased-release-and-rollback.md](https://docs.wahwei/reactnative.codeguides.io/store-operations/phased-release-and-rollback/) - production rollout percentages

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

49454e4f4d5f434e4f5904434556494d434513121856181a181c1a1d

Reviewed by Chris St. John·Last updated Jul 19, 2026
