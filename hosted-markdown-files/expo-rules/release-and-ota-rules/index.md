# Release & OTA Rules

EAS Update channel naming, runtime version policy, promotion workflow, and rollback triggers for Expo SDK 57. OTA updates are powerful and dangerous - JavaScript can reach production in minutes without store review. These rules separate safe OTA changes from native-breaking releases and define when to roll back.

Highlights / Release & OTA Rules

* Channels map to environments: development, preview, production - not engineer first names
* runtimeVersion policy must match between eas build and eas update or OTAs miss devices
* Native dependency changes require store builds - OTA is JavaScript and assets only
* eas update --environment is required on SDK 55+ - local .env is ignored on update runners
* Define rollback triggers before launch: crash rate, failed payments, auth outage
* Never ship JS that calls new native APIs until store adoption crosses your threshold

## How to Use This Checklist

* Establish **Tier 1** before the first `eas update` - wrong `runtimeVersion` strands users on stale bundles silently.
* Apply **Tiers 2–3** on every release and OTA promotion - channel hygiene prevents staging JS hitting production users.
* **Tier 4** is the incident playbook - define rollback triggers before you need them at 2 a.m.
* Pair `eas update` with crash monitoring and feature flags - OTA without observability is blind flight.
* Store submissions and OTA promotions use different checklists - never skip native gates for native changes.

---

## Tier 1: Runtime Version & Update Config (1–6)

1. **Set explicit `runtimeVersion` policy in `app.config`:** Use `policy: "appVersion"`, `"sdkVersion"`, or `"fingerprint"` consistently - document which policy the team uses in README.

   * **Match:** The `runtimeVersion` on `eas build` artifacts must match what `eas update` targets.
   * **Reject:** Omitting `runtimeVersion` and hoping EAS guesses correctly across flavors.
2. **Bump runtime when native dependencies change:** New native module, SDK upgrade, or config plugin change → new store build and new runtime - OTA alone cannot add native code.

   * **Gate JS:** Feature flags hide JS calling new native APIs until store adoption threshold (e.g., 90%).
   * **See:** [Native Module Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/).
3. **Configure `updates.url` and project ID for EAS Update:** `extra.eas.projectId` and `updates.url` in `app.config` - verify with `npx expo config --type public`.

   * **Per app:** White-label flavors need distinct `projectId` and channels per bundle ID.
   * **Test:** `eas update:list` shows recent bundles after a test publish.
4. **Use `eas update --environment <name>` on SDK 55+:** Update runners load vars from the named EAS environment - local `.env` files are ignored, keeping OTA aligned with build env.

   * **Production:** `eas update --channel production --environment production`.
   * **Reject:** Publishing production updates from a laptop with stale `.env.local`.
5. **Check for updates on launch with a sane policy:** `expo-updates` `checkAutomatically` and `fallbackToCacheTimeout` - balance freshness with offline startup.

   * **UX:** Show "Update available - restart" for mandatory fixes; silent reload only for low-risk patches.
   * **Test:** Airplane mode launch still opens cached bundle.
6. **Code signing for updates when required:** Enable EAS Update code signing for high-assurance apps - verify signing cert rotation in runbook.

   * **ADR:** Document whether updates must be signed and who holds keys.
   * **Staging:** Test signed updates on preview channel before production.

---

## Tier 2: Channels, Branches & Promotion (7–12)

7. **Channel names map to environments, not people:** `development`, `preview`, `staging`, `production` - not `jane-test` or `hotfix-tuesday`.

   * **Map:** `eas.json` build profiles assign `channel` per profile.
   * **Document:** Table of channel → audience → who may publish.
8. **Promotion flow is linear:** `development` → `preview` (QA) → `production` - no skipping preview for "small" JS changes that touch payments or auth.

   * **Branch mapping:** Use EAS branches if team prefers Git branch names mapped to channels.
   * **Reject:** Direct `production` update from a feature branch without preview soak.
9. **Preview builds pair with preview channel:** QA installs EAS `preview` profile binary and receives OTA on `preview` channel - matches production behavior without store risk.

   * **Physical devices:** Maestro smoke on preview artifacts before production OTA.
   * **Reject:** QA on Expo Go for release sign-off.
10. **Production channel updates require two-person rule or CI-only publish:** Human `eas update --channel production` from laptops is error-prone - prefer GitHub Action on tagged release.

    * **Audit:** `eas update:list` reviewed in release ticket.
    * **Break-glass:** Document emergency publish procedure with postmortem requirement.
11. **Version `app.config` `version` and store build numbers independently:** Marketing version vs `ios.buildNumber` / `android.versionCode` - increment build numbers every store submission.

    * **Changelog:** User-facing release notes tied to store version, not OTA bundle ID.
    * **Align:** If using `runtimeVersion: { policy: "appVersion" }`, app version bumps affect OTA targeting.
12. **Feature flags gate risky OTA payloads:** Remote flags can disable bad JS paths without a second OTA - flags are not a substitute for preview testing.

    * **Kill switch:** Ops can flip flag off before OTA rollback completes.
    * **Server:** Authorization still enforced server-side.

---

## Tier 3: What Ships OTA vs Store (13–18)

13. **OTA-safe: JS, TS, assets, copy, styles, navigation structure:** Pure JavaScript changes that do not call new native symbols.

    * **Test:** Preview channel soak minimum (team-defined, often 24–48 hours for revenue paths).
    * **Reject:** "It's just one line" that imports a new native package.
14. **Store-required: native modules, plugins, permissions, scheme, entitlements:** Anything that changes `ios/` or `android/` output from prebuild.

    * **Plan:** Coordinate store submission lead time with marketing - OTA cannot replace review for native changes.
    * **Communicate:** #release when users must upgrade binary for new features.
15. **Hermes bytecode and bundle size regressions can ship OTA - treat as release events:** Large bundles slow startup - watch performance budgets (see [Performance Budget Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/performance-budget-rules/)).

    * **Measure:** Compare bundle size before production OTA.
    * **Rollback:** Size-only regressions qualify if TTI crosses budget.
16. **Database schema and API contract changes need backward compatibility:** Mobile users skip updates - JS must tolerate old API responses until store adoption is high.

    * **Contract tests:** Run in CI before OTA publish.
    * **Reject:** Breaking API change guarded only by latest JS.
17. **Do not OTA breaking changes to persisted local storage shape without migration:** MMKV/SQLite schema bumps need graceful migration or version gate - bad migration bricks installs.

    * **Test:** Upgrade from previous production bundle on device.
    * **Fallback:** Clear cache path with user warning if migration fails.
18. **Emergency OTA still runs through preview when possible:** True sev-1 may skip soak - document exception and require postmortem plus rollback verification within one hour.

    * **Monitor:** Crash-free sessions and auth error rate dashboards open during emergency push.
    * **Comms:** Status page and support macros ready.

---

## Tier 4: Rollback Triggers & Incident Response (19–25)

19. **Define rollback triggers before launch:**

    | Trigger | Owner | Action |
    | --- | --- | --- |
    | Crash-free rate drops > X% vs baseline | Mobile on-call | Republish previous bundle or channel redirect |
    | Auth/login failure rate spike | Backend + mobile | Rollback OTA + flag off |
    | Payment success rate drop | Revenue + mobile | Immediate production rollback |
    | P0 security issue in JS | Security + mobile | OTA fix or rollback within SLA |

    * **X:** Set per app (often 1–2% absolute drop).
    * **Baseline:** Rolling 7-day same hour comparison.
20. **Know how to roll back an EAS Update:** Republish prior bundle ID to channel, or use EAS dashboard rollback - practice in preview quarterly.

    * **Record:** Keep last known-good bundle ID in release notes.
    * **Time:** Target < 15 minutes from decision to rollback complete.
21. **Store rollback is slower - plan binary fallback:** Keep previous store version available; phased rollout on App Store and staged rollout on Play Store when possible.

    * **Native bug:** OTA cannot fix - halt rollout and submit patch binary.
    * **Communication:** In-app message for forced upgrade when minimum version enforced.
22. **Monitor after every production OTA for 24 hours:** Sentry, analytics, and API error dashboards - on-call watches without assuming success at publish time.

    * **Alert:** PagerDuty on crash and payment triggers from rule 19.
    * **Document:** Release ticket links dashboards used.
23. **Runtime mismatch alerts:** Users on old binaries who never receive updates - track `expo-updates` check failures and stale runtime versions in analytics.

    * **Force upgrade:** Minimum native version endpoint when security requires new binary.
    * **Metrics:** % users per runtime version weekly.
24. **Release checklist is two tracks:** Store submission checklist (native, screenshots, review) and OTA checklist (preview soak, flags, rollback ID) - attach both to release tickets.

    * **Sign-off:** QA, mobile lead, and product for production OTA on revenue paths.
    * **Reject:** Friday production OTA without weekend on-call.
25. **Post-release retrospective for any rollback:** Update triggers, preview duration, or CI gates - rollbacks are free lessons if documented.

    * **ADR:** Structural release process changes get ADRs.
    * **See:** [Architecture Decision Records](https://docs.wahwei/reactnative.codeguides.io/expo-rules/architecture-decision-records/).

## Applying the Checklist in Order

* **Tier 1 (1–6):** Runtime and update config - foundation; mistakes here make all channels unreliable.
* **Tier 2 (7–12):** Channels and promotion - prevents wrong audience receiving wrong bundle.
* **Tier 3 (13–18):** OTA vs store boundary - avoids shipping native-dependent JS over OTA.
* **Tier 4 (19–25):** Rollback and monitoring - operational readiness.

## FAQs

What is runtimeVersion policy appVersion vs fingerprint?

`appVersion` ties runtime to marketing version - simple for many apps. `fingerprint` hashes native project state - better when native changes without version bumps. Pick one policy, document it, and never mix inconsistently across flavors.

Can I fix a native crash with OTA?

No - native crashes need a new store build. OTA fixes JavaScript errors and logic bugs only.

How many channels do we need?

Minimum: development, preview, production. Larger orgs add staging. Avoid per-developer channels - use preview builds with branch-based updates instead.

Does eas update use my local .env?

On SDK 55+, `eas update --environment` uses EAS environment variables only - local `.env` is ignored on runners. Align with how `eas build` resolves env.

When should we force users to restart for an update?

Mandatory for security fixes and breaking API contract changes. Optional banner for UI tweaks. Document UX in `expo-updates` reload strategy.

How do feature flags interact with OTA?

Flags disable code paths in already-shipped bundles - faster than OTA rollback for logic errors. Flags do not replace preview testing or server authorization.

What is a good preview soak time?

24 hours minimum for auth and payment paths; shorter only with strong automated coverage and on-call coverage. Sev-1 exceptions documented post-hoc.

Can white-label apps share one update channel?

No - each bundle ID and EAS project needs distinct channels and runtime lines. Shared JS monorepo can publish per-app with separate `eas update` commands.

How do I test updates locally?

Use preview/dev client builds pointing at `development` channel. `expo-updates` dev settings can override update URL in controlled staging - not in production apps.

What goes in the release ticket?

Store version, build numbers, OTA bundle ID, channel, last known-good rollback ID, feature flags touched, preview soak window, and dashboard links.

Should production OTA be CI-only?

Strongly recommended - tags trigger `eas update` with environment production. Break-glass laptop publish requires second approver and postmortem.

How does SDK upgrade affect OTA?

SDK upgrade changes native binaries - new store build, new runtimeVersion line. Old runtimes stop receiving updates on the new native line; plan user upgrade messaging.

What if OTA and store versions diverge?

Expected - users on old store builds stay on their runtime channel until they upgrade the binary. Track runtime distribution and enforce minimum native version when needed.

## Related

* [Expo Project Rules Checklist](https://docs.wahwei/reactnative.codeguides.io/expo-rules/expo-project-rules-checklist/) - EAS projectId, environments, and SDK pin
* [Native Module Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/) - native changes require store builds
* [Security Rules for Mobile](https://docs.wahwei/reactnative.codeguides.io/expo-rules/security-rules-for-mobile/) - env vars on update runners and incident response
* [Performance Budget Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/performance-budget-rules/) - bundle size regression rollback triggers
* [Navigation & Routing Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/navigation-and-routing-rules/) - route changes and deep-link compatibility OTA
* [Expo Rules Best Practices](https://docs.wahwei/reactnative.codeguides.io/expo-rules/best-practices/) - condensed enforcement summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 9, 2026
