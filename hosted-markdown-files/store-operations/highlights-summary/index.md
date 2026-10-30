# Store Operations Highlights Summary

Every highlight bullet from the 8 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Store Operations Highlights Summary

* Store ops starts after a production-shaped EAS build - not Expo Go or debug APKs
* App Store Connect is the control plane - EAS Submit uploads binaries; humans own metadata and release
* Play Console Dashboard tasks block production until policy forms are complete
* iOS phased release spreads to 100% over 7 days - you can pause or accelerate from App Store Connect
* ATT applies when you track users across apps/websites owned by other companies - not all analytics
* Parse rejection emails for Guideline numbers and ITMS codes - not emotional language

## [Store Operations Basics](https://docs.wahwei/reactnative.codeguides.io/store-operations/store-operations-basics/)

* Store ops starts after a production-shaped EAS build - not Expo Go or debug APKs
* Bump ios.buildNumber and android.versionCode on every store upload - stores reject duplicates
* TestFlight and Play internal tracks validate signing and policy before App Review
* Metadata, privacy forms, and review notes live in git - not only in console UIs
* eas submit automates upload; humans still own release timing and rollout percentage
* Phased release on iOS and staged rollout on Play are your first rollback levers

## [App Store Connect Workflow](https://docs.wahwei/reactnative.codeguides.io/store-operations/app-store-connect-workflow/)

* App Store Connect is the control plane - EAS Submit uploads binaries; humans own metadata and release
* Screenshots must match current UI - stale marketing assets trigger 2.3.3 rejections
* Review notes with demo credentials cut Guideline 2.1 false negatives
* Privacy Nutrition Labels must match PrivacyInfo.xcprivacy and runtime behavior
* Phased release defaults on - plan marketing around 7-day rollout
* Expedited review is rare - reserve for revenue-critical or security fixes with evidence

## [Google Play Console Workflow](https://docs.wahwei/reactnative.codeguides.io/store-operations/google-play-console-workflow/)

* Play Console Dashboard tasks block production until policy forms are complete
* Data safety answers must match SDK behavior - mismatches cause rejection and user trust issues
* Content rating (IARC) is mandatory before any public track
* Staged rollout percentage is separate from internal/closed/open testing tracks
* versionCode must increase monotonically - Play rejects duplicate integers
* eas submit --track controls upload destination; rollout % is set in Console UI

## [Phased Release & Rollback](https://docs.wahwei/reactnative.codeguides.io/store-operations/phased-release-and-rollback/)

* iOS phased release spreads to 100% over 7 days - you can pause or accelerate from App Store Connect
* Play staged rollout is manual percentage - halt stops new installs without pulling existing users
* Neither store rolls back binaries automatically - you submit a prior or fixed build
* Crash spikes during partial rollout are the signal to pause - not Twitter alone
* OTA (EAS Update) can mitigate JS-only bugs; native regressions need new store build
* Document who has Console access to pause rollout before incident hour

## [Compliance: ATT & Privacy Labels](https://docs.wahwei/reactnative.codeguides.io/store-operations/compliance-att-and-privacy-labels/)

* ATT applies when you track users across apps/websites owned by other companies - not all analytics
* NSUserTrackingUsageDescription is required before AppTrackingTransparency prompt
* Privacy Nutrition Labels and App Privacy in Connect must match PrivacyInfo.xcprivacy
* Play Data safety must tell the same story as iOS labels - auditors compare both
* IDFA access without ATT prompt is a fast rejection and policy violation
* Rebuild native after privacy manifest or ATT changes - not OTA

## [Store Rejection Playbook](https://docs.wahwei/reactnative.codeguides.io/store-operations/store-rejection-playbook/)

* Parse rejection emails for Guideline numbers and ITMS codes - not emotional language
* Reproduce on Release build on device before replying - simulators miss native crashes
* Resolution Center replies need evidence: video, screenshots, test account, code pointers
* Metadata rejections fix in Connect; binary rejections need new EAS build
* Play appeals need Data safety evidence - form-only fixes without binary may suffice
* Escalate with facts after two failed round-trips - not after first denial

## [Store Incident Response](https://docs.wahwei/reactnative.codeguides.io/store-operations/store-incident-response/)

* Store incidents span delisting, policy strikes, broken live builds, and sudden guideline changes
* First hour: confirm scope, pause rollout, assign incident commander - not parallel Slack threads
* Removing app from sale is last resort - pause phased/staged rollout first when possible
* Legal and comms own external messaging; engineering owns technical timeline
* Post-incident: update privacy forms, rejection playbook entry, and on-call runbook
* Regulatory breaches may require user notification beyond store status pages

## [Store Operations Best Practices](https://docs.wahwei/reactnative.codeguides.io/store-operations/best-practices/)

* Version build numbers in git before every EAS production build
* TestFlight and Play internal are mandatory gates - not optional niceties
* Privacy inventory drives iOS labels and Play Data safety - one spreadsheet
* Phased and staged rollout are default; 100% day-one is the exception
* Review notes and demo accounts expire - rotate every release
* Incident runbooks name who can pause rollout before the outage happens

cGJxcnRodnFyZi52YnxwdHZiOTc3fDIwMjYwNw==

Reviewed by Chris St. John·Last updated Jul 19, 2026
