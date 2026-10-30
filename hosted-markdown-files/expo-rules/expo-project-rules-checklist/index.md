# Expo Project Rules Checklist

Twenty-five non-negotiables for maintainable Expo apps on React Native 0.86 and Expo SDK 57. These rules cover project scaffolding, configuration, folder layout, Continuous Native Generation (CNG), dependency hygiene, and team conventions. Treat violations as merge blockers unless an ADR documents an exception.

Highlights / Expo Project Rules Checklist

* Pin SDK 57 at scaffold with default@sdk-57 and verify with expo-doctor before the first feature PR
* app.config.ts is the source of truth - never commit secrets to extra or EXPO\_PUBLIC\_\*
* Thin app/ routes; business logic lives in features/<name>/ with one public export per feature
* Gitignore ios/ and android/ under CNG - regenerate on EAS Build or expo prebuild --clean
* Use npx expo install for every Expo package - manual npm install skews native binaries
* Commit lockfiles, .env.example, and eas.json - never commit .env.local or hand-edited native folders

## How to Use This Checklist

* Run **Tier 1** when scaffolding a new app or immediately after an SDK upgrade - config and dependency mistakes compound every sprint.
* Apply **Tiers 2–4** during PR review; route files, native folders, and secret handling are the highest-risk areas.
* Record intentional exceptions in `docs/adr/` - "we'll fix it later" without an ADR becomes permanent debt.
* Revisit the full checklist quarterly and after every major SDK bump - RN 0.86 and New Architecture defaults change what "green" means.
* Pair this list with [Expo Rules Best Practices](https://docs.wahwei/reactnative.codeguides.io/expo-rules/best-practices/) for a condensed enforcement summary in standups.

---

## Tier 1: Scaffold & Config (1–6)

1. **Pin the SDK at scaffold time:** Start with `npx create-expo-app@latest --template default@sdk-57` so `expo` resolves to `~57.0.4` - upgrading three SDKs in one PR is a merge conflict factory.

   * **Verify:** `npx expo-doctor` passes before the first feature branch merges.
   * **Reject:** `latest` without an SDK pin in CI or README onboarding docs.
2. **`app.config.ts` is the single source of truth:** Dynamic config supports environments, typed helpers, and conditional plugins; a lone static `app.json` does not scale past one build flavor.

   * **Pattern:** Export a typed `ExpoConfig` from `app.config.ts` and delete duplicate `app.json` fields.
   * **Audit:** `npx expo config --type public` before every store submission.
3. **Never commit secrets to `extra` or `EXPO_PUBLIC_*`:** Values prefixed `EXPO_PUBLIC_` inline at bundle time - API keys, signing secrets, and admin tokens belong in EAS Secrets, not git.

   * **Runtime non-secrets only:** Pass feature flags and public API URLs via `extra` and read with `Constants.expoConfig`.
   * **Reject:** `process.env.STRIPE_SECRET_KEY` anywhere in app source or config.
4. **Commit lockfiles with the app:** `package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock` must match what EAS Build and CI resolve - floating installs hide native/JS skew until TestFlight.

   * **CI:** Fail builds when lockfile is missing or out of sync with `package.json`.
   * **Monorepo:** One lockfile at the workspace root; apps do not maintain independent floating trees.
5. **Use `npx expo install` for every Expo package:** Manual `npm install expo-camera@latest` can pull JS stubs that do not match SDK 57 native binaries - TypeScript compiles while production crashes.

   * **Upgrade path:** `npx expo install --fix` after SDK bumps, then `expo-doctor`.
   * **Document:** Any package that requires a custom version override gets an ADR.
6. **Map EAS build profiles to environments:** `eas.json` profiles declare `environment: development | preview | production` so credentials and env vars resolve the same in CI and on laptops.

   * **Local sync:** `eas env:pull --environment development` for onboarding - not copy-paste from Slack.
   * **Reject:** Hard-coded API URLs in source that differ from the profile used on EAS Build.

---

## Tier 2: Folder Layout & Code Boundaries (7–12)

7. **Thin `app/` directory:** Expo Router files re-export feature screens - business logic, hooks, and API clients do not live beside `_layout.tsx`.

   * **Pattern:** `app/(tabs)/orders/index.tsx` exports `OrdersScreen` from `features/orders`.
   * **Lint:** Optional ESLint rule or CODEOWNERS on `app/` to keep files under ~20 lines.
8. **Organize by feature, not layer-only:** `features/orders/` owns screens, hooks, presenters, and feature-specific types - global `components/` is for design-system primitives only.

   * **Reject:** `screens/`, `hooks/`, and `services/` trees where every feature touches every folder.
   * **Scale trigger:** Revisit at ~15 engineers before import cycles force a rewrite.
9. **One public export per feature:** Route files import from `features/orders` barrel - no cross-feature deep imports into `features/billing/hooks/useInvoice.ts`.

   * **Enforce:** Nx module boundaries or a custom ESLint `no-restricted-imports` rule in monorepos.
   * **Exception:** Shared `packages/core` APIs documented in README.
10. **Keep package.json scripts boring:** `start`, `ios`, `android`, `lint`, `typecheck`, `test` - every engineer should not memorize one-off Metro flags.

    * **CI mirrors local:** The same script names run in GitHub Actions and EAS hooks.
    * **Document:** Non-obvious scripts (`postinstall`, `eas-build-pre-install`) in README.
11. **Extend `expo/tsconfig.base`:** Strict TypeScript from the template - custom `tsconfig` drift breaks Expo Router typed routes and autolinking types.

    * **Paths:** Mirror `@/*` aliases in Jest `moduleNameMapper` when using path aliases.
    * **Reject:** `skipLibCheck: false` fights with third-party RN typings - follow Expo defaults.
12. **Colocate tests beside source:** `Button.test.tsx` next to `Button.tsx` or under `features/orders/__tests__/` - distant `__tests__` at repo root stop being updated.

    * **Exclude:** Keep tests out of `app/` route files - use `__tests__` or `*.test.tsx` in `src/` and `features/`.
    * **CI:** `npm test -- --ci` on every PR.

---

## Tier 3: Native Workflow & CNG (13–18)

13. **Gitignore `ios/` and `android/` under CNG:** Committed native folders from an older SDK block RN 0.86 prebuild templates - regenerate on EAS Build or `npx expo prebuild --clean`.

    * **Brownfield exception:** Document in ADR if native dirs are intentionally committed.
    * **Upgrade ritual:** Delete stale native dirs before `expo prebuild` after SDK bumps.
14. **Express native changes as config plugins:** Hand-editing generated `Info.plist` or `AndroidManifest.xml` is lost on `npx expo prebuild --clean` - the SDK 57 default.

    * **Idempotent plugins:** Safe on repeated prebuild runs - plugins that append twice corrupt projects.
    * **See:** [Native Module Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/) for when custom native code is justified.
15. **Start with Expo Go, graduate to dev builds:** Expo Go is fine for learning; add `expo-dev-client` as soon as you depend on native modules not bundled in Expo Go.

    * **Rebuild rule:** Rebuild the dev client after every SDK bump - OTA updates change JavaScript only.
    * **CI:** A `development` EAS profile produces installable dev clients for QA.
16. **One `react-native` instance in the dependency graph:** Duplicate native copies cause "Invalid hook call" and obscure redboxes - `npx expo-doctor` and `npm why react-native` in CI.

    * **Monorepo:** `npx expo install` from the app directory; hoist consciously with pnpm `nodeLinker`.
    * **Reject:** Nested `node_modules/react-native` from conflicting workspace packages.
17. **Let SDK 57 configure Metro first:** Automatic monorepo detection beats hand-written `watchFolders` - customize only when doctor and builds prove a gap.

    * **Document:** Any custom `metro.config.js` change links to the failure it fixes.
    * **Reject:** Copy-pasting Metro config from a pre-SDK-54 blog post.
18. **Register the root with `registerRootComponent`:** Bare or brownfield entry points that skip Expo bootstrap miss autolinking initialization and fail mysteriously when calling native modules.

    * **Verify:** `MainComponent` / `moduleName` matches JS registration in brownfield embeds.
    * **See:** Expo Platform docs for `expo` entry in `package.json` `main`.

---

## Tier 4: Team, EAS & Governance (19–25)

19. **Set `owner` for organization projects:** Omitting `"owner": "org-slug"` in `app.config` routes builds and credentials to a personal account instead of the team.

    * **One `projectId` per app binary:** Reusing an EAS project across unrelated bundle IDs collides credentials and update channels.
    * **Stable `projectId`:** Never rotate - EAS services key off the UUID for the app's lifetime.
20. **Robot tokens for CI, not personal passwords:** Organization-scoped robot users survive employee departures and provide an auditable revocation path.

    * **Scope:** Minimum permissions per workflow - build, submit, update.
    * **Reject:** Shared "ci@company" human accounts with Owner role.
21. **Ignore `.env.local`, commit `.env.example`:** Machine-specific secrets stay local - example env documents required `EXPO_PUBLIC_*` keys without values.

    * **Onboarding:** README lists `eas env:pull` as step two after `npm install`.
    * **Reject:** `.env.production` with real secrets in git history.
22. **Run `expo-doctor` in CI on every PR:** Catches mismatched native module versions, invalid config fields, and dependency skew before merge.

    * **Upgrade branches:** Doctor must pass before the SDK bump PR merges - not as a follow-up ticket.
    * **Pair with:** `tsc --noEmit` and `expo lint`.
23. **Document first-run verification:** A script that runs `expo-doctor`, `tsc --noEmit`, and optionally a dev-client build - new hires prove the toolchain in one command.

    * **Name it:** `npm run verify` or `scripts/verify-toolchain.sh`.
    * **Update:** After every SDK upgrade, before announcing "upgrade complete."
24. **ADR for every non-default architectural choice:** Custom Metro config, committed native folders, non-Expo navigation, or skipped secure storage - record context and revisit date.

    * **Location:** `docs/adr/NNNN-title.md` with status Accepted | Superseded | Deprecated.
    * **See:** [Architecture Decision Records](https://docs.wahwei/reactnative.codeguides.io/expo-rules/architecture-decision-records/) for the mobile template.
25. **Upgrade SDKs sequentially:** Jumping multiple SDK versions in one PR compounds breaking changes - step through changelogs between merges even if the final target is SDK 57.

    * **Read:** RN 0.86, Hermes, Reanimated, and New Architecture notes before merging.
    * **Rollback plan:** Know which store build and OTA channel to promote if the upgrade branch fails QA.

## Applying the Checklist in Order

* **Tier 1 (1–6):** Scaffold and config - fix before writing features; wrong SDK pin or leaked secrets are expensive to unwind.
* **Tier 2 (7–12):** Layout and boundaries - prevents god-screens and import spaghetti as headcount grows.
* **Tier 3 (13–18):** Native workflow - highest cost when violated; prebuild and Metro mistakes block releases.
* **Tier 4 (19–25):** Governance and upgrades - locks conventions before the team doubles.

## FAQs

Should we commit ios/ and android/ folders?

No for standard CNG Expo apps - gitignore them and let EAS Build or `expo prebuild` regenerate. Brownfield apps with hand-maintained native code are the exception; document that choice in an ADR.

app.json or app.config.ts?

Prefer `app.config.ts` for any app with more than one environment. Keep a minimal `app.json` only if tooling requires it, but avoid duplicating fields in both files.

When is Expo Go enough?

Learning, demos, and early UI work without custom native modules. Move to `expo-dev-client` before integrating payments, push, background tasks, or any package not in Expo Go.

How do we enforce the thin app/ rule?

Code review, optional ESLint `max-lines` on `app/**`, and feature barrels that screens must import from. Route files should read like a table of contents, not a novel.

What belongs in EXPO\_PUBLIC\_ vs EAS Secrets?

`EXPO_PUBLIC_*` only for values safe to ship in the client bundle (public API URLs, analytics keys meant for client). Server secrets, signing keys, and admin tokens stay in EAS Secrets and server-side code.

Do monorepos need different rules?

Same rules apply; add: one lockfile, one `react-native` instance, `npx expo install` from each app directory, and Nx or Turborepo boundary enforcement for cross-feature imports.

How often should we run expo-doctor?

On every PR in CI, locally after `npm install`, and mandatorily before merging any SDK upgrade branch.

Can we skip lockfiles in libraries-only packages?

Apps always commit lockfiles. Internal workspace packages consumed only via `workspace:*` follow the root lockfile - do not float versions inside `packages/ui`.

What scripts must every Expo app have?

At minimum: `start`, platform targets (`ios`/`android` or `expo run:*`), `lint`, and `typecheck`. Add `test` once Jest is configured. CI should call the same names developers use locally.

When do we need an ADR instead of a README note?

When the choice affects native code, release channels, security posture, or is hard to reverse - custom native modules, committed `ios/`, cert pinning, or skipping `expo-secure-store` for tokens.

How do we handle white-label apps?

Separate `app.config` variants per brand (`APP_VARIANT`), distinct bundle IDs, separate EAS `projectId` per binary, shared `packages/core` - not forked feature code per client.

Does New Architecture change these project rules?

RN 0.86 defaults favor New Architecture - project rules still apply. SDK upgrades require reading native changelog items; CNG and `expo-doctor` matter more, not less.

What is the minimum CI gate for a new Expo repo?

`expo-doctor`, `tsc --noEmit`, `expo lint`, and unit tests (`jest --ci`). Add EAS Build on `main` once native modules exceed Expo Go.

Should features import from other features?

Only through public barrels or shared packages - never deep-import another feature's internal hooks. Cross-feature coupling belongs in `packages/core` with explicit APIs.

## Related

* [Navigation & Routing Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/navigation-and-routing-rules/) - Expo Router conventions and deep-link hygiene
* [Native Module Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/native-module-rules/) - when to write native code vs use SDK packages
* [Security Rules for Mobile](https://docs.wahwei/reactnative.codeguides.io/expo-rules/security-rules-for-mobile/) - secrets, storage, and cert pinning
* [Release & OTA Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/) - channels, runtime versions, and rollback
* [Architecture Decision Records](https://docs.wahwei/reactnative.codeguides.io/expo-rules/architecture-decision-records/) - mobile ADR template and examples
* [Expo Rules Best Practices](https://docs.wahwei/reactnative.codeguides.io/expo-rules/best-practices/) - condensed 25-item enforcement summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 9, 2026
