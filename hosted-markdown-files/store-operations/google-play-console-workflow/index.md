# Google Play Console Workflow

Data safety, content rating, and staged rollout - the **Google Play Console checklist** for Expo SDK 57 AABs uploaded via [EAS Submit](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-submit/). Runtime permissions and manifest hygiene are covered in [Permissions & Play Policy](https://docs.wahwei/reactnative.codeguides.io/android-platform/permissions-and-play-policy/); this page is the store-operator view from first app creation through production rollout.

Highlights / Google Play Console Workflow

* Play Console Dashboard tasks block production until policy forms are complete
* Data safety answers must match SDK behavior - mismatches cause rejection and user trust issues
* Content rating (IARC) is mandatory before any public track
* Staged rollout percentage is separate from internal/closed/open testing tracks
* versionCode must increase monotonically - Play rejects duplicate integers
* eas submit --track controls upload destination; rollout % is set in Console UI

## How to Use This Checklist

* **Tier 1** - one-time app setup and Play App Signing.
* **Tier 2** - policy forms that gate **every** track (internal included on first release).
* **Tier 3** - store listing and creative assets per release.
* **Tier 4** - upload, testing tracks, and production **staged rollout**.
* Re-run Tier 2 when adding SDKs that collect data, request dangerous permissions, or show ads.

---

## Tier 1: App Setup (before first upload)

* **Google Play Developer account** active; one-time registration fee paid
* **App created** in Play Console with default language and app name
* **`android.package`** in `app.config.ts` matches Play app ID - cannot change after first publish
* **Play App Signing** enabled - Google holds app signing key; you upload with upload key
* **Upload key** registered with EAS - see [Signing & Play App Signing](https://docs.wahwei/reactnative.codeguides.io/android-platform/signing-and-play-app-signing/)
* **Service account** for EAS Submit with **Release to testing tracks** (minimum) or **Release to production**
* **Service account JSON** path in `eas.json` - not committed to git
* **versionCode** scheme documented - monotonic integer every upload
* **Privacy policy URL** on public HTTPS page
* **Target API level** meets Play requirements for SDK 57 / RN 0.86 builds (verify in EAS build logs)

```json
// eas.json - submit to internal first
{
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./secrets/play-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

---

## Tier 2: Policy & Compliance (gates all tracks)

### Data safety form

* **Data safety** section opened in Play Console → **Start**
* Inventory all SDKs - analytics, crash, ads, auth, push, maps (grep `package.json` + `app.config.ts` plugins)
* For each data type collected:
  + **Collected or shared** answered honestly
  + **Purpose** matches actual use (analytics vs fraud prevention vs personalization)
  + **Encrypted in transit** - HTTPS for your API; SDK defaults documented
  + **Users can request deletion** - aligns with in-app account deletion if accounts exist
* **Location** - precise vs approximate matches `expo-location` usage
* **Photos and videos** - matches picker vs broad storage reads
* **Device or other IDs** - advertising ID, Firebase installation ID, etc.
* **Data safety labels** preview matches what users see on Play Store listing
* Cross-check with [Compliance: ATT & Privacy Labels](https://docs.wahwei/reactnative.codeguides.io/store-operations/compliance-att-and-privacy-labels/) for iOS parity

| Common Expo SDK | Data safety touchpoint |
| --- | --- |
| `expo-notifications` | Device ID, push token |
| `@sentry/react-native` | Crash logs, diagnostics |
| `expo-image-picker` | Photos (user-selected) |
| `expo-location` | Location (approximate/precise) |
| `react-native-google-mobile-ads` | Advertising ID, usage data |

### Content rating

* **Content rating** questionnaire started (IARC)
* Violence, gambling, user-generated content, and location sharing answered accurately
* **Received rating** (Everyone, Teen, Mature, etc.) applied to release
* Re-run questionnaire when adding chat, WebView user content, or loot mechanics

### Target audience & news apps

* **Target audience and content** - age groups selected; no appeal to children if not designed for them
* **News apps** declaration if applicable
* **COVID-19 apps** declaration if applicable (legacy form may still appear)
* **Government apps** declaration if applicable

### Ads & declarations

* **Contains ads** toggle matches reality (AdMob, mediation SDKs)
* **App access** - credentials provided if login required for review (like iOS review notes)
* **Ads ID** - declare if using advertising ID; respect **Privacy Sandbox** / opt-out flows

### Permissions alignment

* `AndroidManifest.xml` permissions (via prebuild) match Data safety - remove unused permissions with `blockedPermissions`
* Dangerous permissions have in-app rationale before system prompt
* See [Permissions & Play Policy](https://docs.wahwei/reactnative.codeguides.io/android-platform/permissions-and-play-policy/) for photo picker and notification patterns

---

## Tier 3: Store Listing (every release)

### Main store listing

* **App name** ≤ 30 characters
* **Short description** ≤ 80 characters - primary value prop
* **Full description** ≤ 4000 characters - features match submitted build
* **App icon** 512×512 PNG
* **Feature graphic** 1024×500 JPG or PNG (required for featuring)
* **Phone screenshots** - min 2, max 8; 16:9 or 9:16; current UI
* **7-inch tablet** and **10-inch tablet** screenshots if `supportsTablet` or layout targets tablets
* **Chromebook** / **Android XR** assets if distributing to those form factors
* **Video** optional - YouTube URL
* Localized listings per country/language you support

### Release notes

* **Release notes** per language - user-visible changes for this `versionCode`
* No keyword stuffing - Play may flag ASO abuse

### Pricing & distribution

* **Countries/regions** selected
* **Free or paid** consistent with billing setup
* **Managed Google Play** / enterprise constraints if B2B

---

## Tier 4: Upload, Tracks & Staged Rollout

### Build upload

* `eas build --profile production --platform android` produces **AAB**
* `android.versionCode` incremented in `app.config.ts`
* `eas submit --platform android --latest` succeeds
* Play Console shows release **Processing** → **Available to testers** or **In review**

### Testing track progression (recommended)

* **Internal testing** - up to 100 testers; minutes-to-hours processing
* **Closed testing (alpha)** - email lists, larger QA pool
* **Open testing (beta)** - public opt-in URL
* Sign-off checklist completed on each track before production
* See [Internal Testing Tracks](https://docs.wahwei/reactnative.codeguides.io/android-platform/internal-testing-tracks/)

### Production release

* Promote tested AAB to **Production** (or submit `track: "production"` via EAS)
* **Staged rollout** enabled - start **5–10%** for risky releases
* **Rollout percentage** owners documented (who can pause/halt)
* Monitor **Android vitals** - crash rate, ANR rate, startup time
* Increase rollout: 10% → 20% → 50% → 100% with go/no-go between steps
* **Halt rollout** procedure ready - see [Phased Release & Rollback](https://docs.wahwei/reactnative.codeguides.io/store-operations/phased-release-and-rollback/)

```markdown
## Staged rollout go/no-go (example)
| Gate | Threshold | Action |
|------|-----------|--------|
| Crash rate | < 1.1× baseline | Continue rollout |
| ANR rate | < 1.5× baseline | Pause at current % |
| 1-star spike | > 2× daily avg | Halt + triage |
```

### Post-release

* **Pre-launch report** reviewed (Accessibility, security, SDK warnings)
* **Policy status** green - no outstanding violations
* Archive AAB mapping file if using R8 mapping for crash deobfuscation
* Tag git `store/android/2.4.0-build240012`

---

## Dashboard Required Tasks (quick audit)

Open **Play Console → Dashboard** and clear every red item before expecting production visibility:

* Set up your app (initial wizard)
* Privacy policy
* App access (login credentials for reviewers)
* Ads declaration
* Content rating
* Target audience
* Data safety
* Store listing (at least default language)
* Select countries

---

## FAQs

Internal track vs production - same AAB?

* Yes - you promote the same artifact up tracks.
* `versionCode` must be unique across all tracks in the app.

Does eas submit set rollout percentage?

* No - EAS uploads to the track you specify.
* **Staged rollout %** is configured in Play Console **Production → Releases**.

Data safety vs permissions in manifest?

* Manifest declares what OS *can* grant; Data safety declares what you *collect/share*.
* Both must align - see [Permissions & Play Policy](https://docs.wahwei/reactnative.codeguides.io/android-platform/permissions-and-play-policy/).

Rejected for Data safety inaccuracy?

* Update form to match SDK reality or remove SDK.
* File appeal only with evidence (code paths, network logs) - see [Store Rejection Playbook](https://docs.wahwei/reactnative.codeguides.io/store-operations/store-rejection-playbook/).

Can I ship 100% immediately?

* Yes - toggle staged rollout to 100% for hotfixes or low-risk patches.
* Default to partial rollout for native migrations (RN upgrade, New Architecture flip).

## Related

* [Store Operations Basics](https://docs.wahwei/reactnative.codeguides.io/store-operations/store-operations-basics/) - dual-store release flow
* [Permissions & Play Policy](https://docs.wahwei/reactnative.codeguides.io/android-platform/permissions-and-play-policy/) - runtime permissions cookbook
* [Internal Testing Tracks](https://docs.wahwei/reactnative.codeguides.io/android-platform/internal-testing-tracks/) - alpha/beta progression
* [Signing & Play App Signing](https://docs.wahwei/reactnative.codeguides.io/android-platform/signing-and-play-app-signing/) - upload key setup
* [Compliance: ATT & Privacy Labels](https://docs.wahwei/reactnative.codeguides.io/store-operations/compliance-att-and-privacy-labels/) - cross-store privacy alignment
* [Phased Release & Rollback](https://docs.wahwei/reactnative.codeguides.io/store-operations/phased-release-and-rollback/) - halt Play rollout
* [EAS Submit](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-submit/) - AAB upload automation

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
