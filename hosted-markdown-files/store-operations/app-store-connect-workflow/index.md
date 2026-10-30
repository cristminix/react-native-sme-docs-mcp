# App Store Connect Workflow

Metadata, screenshots, review notes, and expedited review - the **App Store Connect checklist** for shipping Expo SDK 57 IPAs built with EAS. Upload automation lives in [EAS Submit](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-submit/); this page covers everything reviewers and users see before and after binary processing.

Highlights / App Store Connect Workflow

* App Store Connect is the control plane - EAS Submit uploads binaries; humans own metadata and release
* Screenshots must match current UI - stale marketing assets trigger 2.3.3 rejections
* Review notes with demo credentials cut Guideline 2.1 false negatives
* Privacy Nutrition Labels must match PrivacyInfo.xcprivacy and runtime behavior
* Phased release defaults on - plan marketing around 7-day rollout
* Expedited review is rare - reserve for revenue-critical or security fixes with evidence

## How to Use This Checklist

* Run **Tier 1** before the first `eas submit` - missing agreements or tax forms block all releases.
* Complete **Tier 2** on every version bump - metadata drift is a top rejection cause.
* **Tier 3** is submission day - attach review notes and select release strategy.
* **Tier 4** is post-approval - phased release, pricing, and EU trader compliance.
* Pair with [App Store Review Guidelines](https://docs.wahwei/reactnative.codeguides.io/ios-platform/app-store-review-guidelines/) for rejection context.

---

## Tier 1: Account & App Record (before first upload)

* **Apple Developer Program** membership active; team role includes App Manager or Admin
* **App Store Connect agreements** signed (Paid Applications if IAP; free apps still need base agreement)
* **Tax and banking** complete if selling digital goods or subscriptions
* **Bundle ID** registered in Certificates, Identifiers & Profiles - matches `ios.bundleIdentifier` in `app.config.ts`
* **App record created** in App Store Connect with correct primary language and SKU
* **ASC App ID** (`ascAppId`) copied into `eas.json` submit profile
* **App Privacy** questionnaire started - answers must match SDK inventory (see [Compliance: ATT & Privacy Labels](https://docs.wahwei/reactnative.codeguides.io/store-operations/compliance-att-and-privacy-labels/))
* **Privacy policy URL** public, HTTPS, no login wall
* **Export compliance** answered in Connect - encryption self-classification consistent with `ITSAppUsesNonExemptEncryption` in config
* **TestFlight** enabled - first upload processes through TestFlight before App Review selection

---

## Tier 2: Metadata & Creative (every release)

### Listing copy

* **App name** ≤ 30 characters; no competitor trademarks or keyword stuffing
* **Subtitle** ≤ 30 characters; describes primary value, not generic "best app ever"
* **Promotional text** updated (can change without new binary - use for timely campaigns)
* **Description** accurate - features listed must exist in the submitted build
* **Keywords** comma-separated, no spaces, no repeat of app name, ≤ 100 bytes total
* **Support URL** loads; **Marketing URL** optional but recommended
* **What's New** describes user-visible changes - not internal refactors or "bug fixes" only
* **Copyright** string current year and legal entity
* **Age rating** questionnaire re-run if content, chat, UGC, or gambling mechanics changed
* **Category** primary + secondary still accurate

### Screenshots & preview assets

* **6.7" (iPhone 15 Pro Max)** screenshot set required - other sizes optional but recommended
* **6.5"** and **5.5"** if supporting older devices in marketing
* **iPad Pro 12.9"** if `supportsTablet: true` in config
* Screenshots show **current build UI** - not Figma mocks or last year's redesign
* Status bar clean - full battery, reasonable time, no debug banners
* Localized screenshot sets per locale you ship (EN, DE, JA, etc.)
* **App Preview video** optional - must be screen capture, not motion graphics only
* **App icon** 1024×1024 without alpha channel uploaded in Connect (or pulled from build)

```bash
# Optional: Fastlane snapshot or custom Detox script → store/screenshots/ios/
# Commit locale folders: en-US/, de-DE/
```

### Pricing & availability

* **Price tier** or free confirmed
* **Territories** list matches legal/compliance sign-off (EU, UK, CN require extra forms)
* **Pre-orders** disabled unless intentionally configured
* **In-App Purchases** and subscriptions in **Ready to Submit** state if referenced in app

---

## Tier 3: Submission Day

### Build selection

* Correct **build number** selected - matches `ios.buildNumber` from EAS build you QA'd
* Build **processed** (not "Processing" or "Invalid Binary")
* No **ITMS** email errors - privacy manifest, entitlements, or icon issues resolved (see [iOS Privacy Manifests](https://docs.wahwei/reactnative.codeguides.io/ios-platform/ios-privacy-manifests-and-required-reason-apis/))

### App Review Information

* **Sign-in required** toggle accurate
* **Demo account** username + password tested within last 24 hours
* **Contact info** - phone number that rings during US business hours if possible
* **Notes** field includes:
  + Step-by-step path to core feature
  + Hardware requirements (camera, NFC, Apple Watch companion)
  + Feature flags or A/B tests disabled for review
  + ATT behavior ("not shown" vs "shown on second launch")
  + Backend environment (production vs staging)
* **Attachment** optional - PDF with screenshots of hidden admin flows

```markdown
<!-- store/review-notes-ios.md - paste into Connect -->
Demo: reviewer@example.com / ReviewDemo2026!
Path: Sign In → Home → Scan tab → grant Camera → scan any barcode
Account deletion: Profile → Settings → Delete Account
No cross-app tracking; ATT not displayed.
```

### Compliance toggles on version record

* **IDFA / tracking** declaration matches app behavior
* **Encryption** export compliance answers consistent with prior submissions
* **Content rights** - third-party content licensed if app streams music/video/UGC
* **EU Digital Services Act** trader status complete if distributing in EU

### Submit for review

* **Release option** chosen:
  + **Manually release** after approval (safest for coordinated launches)
  + **Automatically release** after approval
  + **Scheduled release** date/time for marketing alignment
* **Phased release** enabled (recommended) - 7-day gradual rollout
* Click **Submit for Review** - status moves to **Waiting for Review**

---

## Tier 4: After Approval

* Confirm **Ready for Sale** or trigger manual release
* Monitor **Phased Release** progress (App Store Connect → Activity → phased release)
* Watch **Crashlytics / Sentry** for build number tied to phased cohort
* Respond to **App Review messages** within 24 hours if metadata dispute arises
* Update **TestFlight** groups - expire old builds per 90-day limit
* Archive screenshot PNGs in git tag `store/ios/2.4.0`

---

## Expedited Review Checklist

Apple grants **expedited review** sparingly - misuse burns credibility. Use only when delay causes measurable user harm or revenue loss.

### Before requesting

* Issue is **blocking live users** (checkout broken, auth outage) - not "we promised marketing a date"
* Fix is in **submitted or about-to-submit** binary - not a metadata-only hope
* Standard review already **waiting** or **rejected with fix uploaded**
* No policy gray area - expedite will not bypass Guideline 4.2 or 5.1.1 disputes

### Request package

* **App Store Connect → Contact Us → App Review → Expedited App Review Request**
* **Concise explanation** (≤ 1 paragraph): user impact, timeline, why standard queue is insufficient
* **Evidence**: crash rate graph, support ticket volume, press embargo date (if contractual)
* **No duplicate requests** - one open expedite per app at a time

```text
Subject: Expedited Review - ShopApp 2.4.1 auth fix
 
Users cannot complete checkout since 2026-07-08 14:00 UTC due to OAuth redirect regression.
~12,000 DAU affected; support tickets +340%. Fix in build 240013, submitted today.
Standard queue would miss contractual SLA with enterprise customers.
```

### After decision

* If **approved** - monitor review status hourly; be available for reviewer questions
* If **denied** - proceed on standard queue; do not re-request same day without new facts
* Document outcome in postmortem - expedite is emergency tool, not release planning

---

## FAQs

How long does App Review take?

* Median is 24–48 hours; first submission and holiday weeks run longer.
* **Waiting for Review** is queue time; **In Review** usually lasts minutes to hours.

Can I edit metadata while In Review?

* Some fields lock during review - plan copy changes before submit.
* Rejection resets some locks; expedited resubmit may need unchanged metadata.

TestFlight build vs App Store build - same IPA?

* Yes - production EAS IPA uploads once; you choose TestFlight vs App Review distribution in Connect.

What triggers ITMS-91053 before human review?

* Missing **Required Reason API** declarations in privacy manifest - fix in `app.config.ts` and rebuild.
* See [App Store Review Guidelines](https://docs.wahwei/reactnative.codeguides.io/ios-platform/app-store-review-guidelines/).

Phased release vs manual release?

* **Phased** rolls to 100% of users over 7 days - pause if crashes spike.
* **Manual** lets you hold approved build until marketing go - then enable phased on release day.

## Related

* [Store Operations Basics](https://docs.wahwei/reactnative.codeguides.io/store-operations/store-operations-basics/) - build → live overview
* [App Store Review Guidelines](https://docs.wahwei/reactnative.codeguides.io/ios-platform/app-store-review-guidelines/) - rejection cookbook
* [TestFlight Distribution](https://docs.wahwei/reactnative.codeguides.io/ios-platform/testflight-distribution/) - pre-review QA
* [Compliance: ATT & Privacy Labels](https://docs.wahwei/reactnative.codeguides.io/store-operations/compliance-att-and-privacy-labels/) - privacy forms
* [Phased Release & Rollback](https://docs.wahwei/reactnative.codeguides.io/store-operations/phased-release-and-rollback/) - pause iOS rollout
* [EAS Submit](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-submit/) - IPA upload automation
* [Store Rejection Playbook](https://docs.wahwei/reactnative.codeguides.io/store-operations/store-rejection-playbook/) - triage templates

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
