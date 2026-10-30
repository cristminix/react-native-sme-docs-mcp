# OTA Updates Highlights Summary

Every highlight bullet from the 7 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / OTA Updates Highlights Summary

* OTA ships JavaScript, TypeScript, and assets - not new native code
* runtimeVersion policy in app.config must match what eas build and eas update resolve
* Channels map to environments - development, preview, staging, production
* Target < 15 minutes from rollback decision to channel serving known-good bundle
* runtimeVersion is the compatibility key between eas build binaries and eas update bundles
* Per-update rollouts start with eas update --rollout-percentage=N

## [OTA Updates Basics](https://docs.wahwei/reactnative.codeguides.io/ota-updates/ota-updates-basics/)

* OTA ships JavaScript, TypeScript, and assets - not new native code
* runtimeVersion must match between eas build and eas update or devices silently skip updates
* New native modules, config plugins, and permission strings require a store build
* Preview channel soak catches JS that assumes native APIs not yet in production binaries
* Feature flags kill bad JS paths faster than waiting for a second OTA
* Expo Go cannot receive production EAS Update payloads - test on preview builds

## [expo-updates Configuration](https://docs.wahwei/reactnative.codeguides.io/ota-updates/expo-updates-configuration/)

* runtimeVersion policy in app.config must match what eas build and eas update resolve
* updates.url points at your EAS project - verify with npx expo config --type public
* checkAutomatically and fallbackToCacheTimeout trade freshness for offline startup
* Channel headers in requestHeaders must align with eas.json build profile channel
* Run eas update:configure once after eas init - rebuild native after first-time setup
* SDK 55+ requires eas update --environment - local .env is ignored on update runners

## [Release Channels & Branches](https://docs.wahwei/reactnative.codeguides.io/ota-updates/release-channels-and-branches/)

* Channels map to environments - development, preview, staging, production
* eas.json build.channel embeds the channel in each binary at build time
* Branches hold update history; channels point at a branch head
* Promotion is republish or channel redirect - never skip preview on revenue paths
* eas update --environment is required on SDK 55+ for env parity with builds
* Production publish should be CI-only with audit trail in release tickets

## [Rollback Runbook](https://docs.wahwei/reactnative.codeguides.io/ota-updates/rollback-runbook/)

* Target < 15 minutes from rollback decision to channel serving known-good bundle
* eas update:rollback republishes a prior update or embedded bundle interactively
* Record last known-good update ID in every production release ticket
* Feature flags off first when logic errors - OTA rollback second for bundle defects
* runtimeVersion mismatch cannot be fixed by OTA - escalate to store build
* Monitor crash-free rate for 60 minutes after rollback completes

## [Runtime Version Policy](https://docs.wahwei/reactnative.codeguides.io/ota-updates/runtime-version-policy/)

* runtimeVersion is the compatibility key between eas build binaries and eas update bundles
* appVersion policy is simplest - ties runtime to expo.version marketing string
* nativeVersion uses platform build numbers - bumps on every native rebuild
* fingerprint hashes native project state - best when native drifts without version bumps
* Never mix policies across flavors in the same release train
* Track runtime distribution weekly - stale runtimes stop receiving OTAs silently

## [Staged Rollouts](https://docs.wahwei/reactnative.codeguides.io/ota-updates/staged-rollouts/)

* Per-update rollouts start with eas update --rollout-percentage=N
* Branch-based rollouts split traffic between two branches on one channel
* Only one rollout per branch or channel at a time - end before publishing conflicting updates
* Monitor crash-free rate and payment success at each percentage step
* Pair EAS rollouts with feature flags for intra-bundle kill switches
* Revert with eas update:revert-update-rollout or eas channel:rollout End

## [OTA Updates Best Practices](https://docs.wahwei/reactnative.codeguides.io/ota-updates/best-practices/)

* OTA ships JS and assets only - native modules and permissions need store builds
* runtimeVersion must match between eas build and eas update on every release
* Channels map to environments - preview soak before production on revenue paths
* Record last known-good update ID before every production publish
* Use eas update --environment on SDK 55+ - local .env is ignored
* Feature flags and OTA rollback are complementary incident tools

636f64656775696465732e696f7c6367696f3934397c323032363037

Reviewed by Chris St. John·Last updated Jul 19, 2026
