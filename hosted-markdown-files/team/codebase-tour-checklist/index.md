# Codebase Tour Checklist

A tiered checklist for **where routes, features, native config, and CI live** in an Expo SDK 57 app - use on day two with a buddy, not as a solo scavenger hunt.

Highlights / Codebase Tour Checklist

* Tier 1: day-one paths - app/, package.json, app.config.ts, CONTRIBUTING.md
* Tier 2: feature slices, shared API client, env and EAS config
* Tier 3: native plugins, testing layout, observability hooks
* Tier 4: CI workflows, release channels, monorepo boundaries
* Check off with a buddy - annotate repo wiki with your team's actual paths
* Failed items become doc PRs - onboarding improves when confusion is recorded

## How to Use This Checklist

* Complete **Tier 1** before your first PR; **Tier 2** before capstone feature; **Tier 3–4** in week two.
* Replace placeholder paths (`features/orders/`) with your repo's real names - grep if README is stale.
* Mark each item **✓ found**, **? unclear**, or **✗ missing** - escalate `✗` to platform lead.
* Record answers in your onboarding PR or internal wiki - the next hire inherits your notes.
* Re-run Tier 4 when joining a new squad or after a major architecture migration.

---

## Tier 1 - Day One (1–8)

*You can run Metro and find the home screen without asking Slack.*

1. **Repository entry README** - clone command, Node version, `npm ci` vs `pnpm`, link to Slack channels.

   * **Look for:** `engines.node`, `#mobile` or `#app` channel, link to EAS project
   * **Ask if missing:** "Where is the canonical getting-started doc?"
2. **`package.json` scripts** - how lint, typecheck, test, and start are invoked.

   * **Look for:** `expo start`, `typecheck`, `lint`, `test` - same scripts CI calls
   * **Related:** [Project Setup Basics](https://docs.wahwei/reactnative.codeguides.io/project-setup/project-setup-basics/)
3. **SDK pin** - `expo`, `react`, `react-native` versions match SDK 57 matrix.

   * **Look for:** `"expo": "~57.0.4"`, `"react": "19.2.3"`, `"react-native": "0.86.0"`
   * **Verify:** `npx expo-doctor` passes on clean clone
4. **`app/` directory** - file-based routes (Expo Router).

   * **Look for:** `_layout.tsx`, `index.tsx`, `(tabs)/` or route groups
   * **Rule:** Route files stay thin - re-export feature screens
   * **Related:** [Expo Router Basics](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/)
5. **Root layout `app/_layout.tsx`** - providers, fonts, splash, root navigator.

   * **Look for:** QueryClient, theme, auth gate, `Stack` / `Tabs` from `expo-router`
   * **Signal:** All global wrappers should be here or one imported provider file
6. **`app.config.ts` or `app.json`** - bundle IDs, icons, plugins, `extra` for env.

   * **Look for:** `ios.bundleIdentifier`, `android.package`, `plugins: []`, `extra.eas.projectId`
   * **Related:** [Project Setup Basics](https://docs.wahwei/reactnative.codeguides.io/project-setup/project-setup-basics/)
7. **Environment template** - `.env.example` with `EXPO_PUBLIC_*` vars documented.

   * **Look for:** Staging API URL, feature flag keys safe for client bundle
   * **Never:** Private API secrets in `EXPO_PUBLIC_`
8. **`CONTRIBUTING.md`** - branch flow, commit style, PR template, preview build label.

   * **Look for:** `needs-preview` label rules, CODEOWNERS mention, conventional commits

---

## Tier 2 - First PR (9–16)

*You can trace one user action from tap to network.*

9. **Feature folder convention** - where screen logic lives outside `app/`.

   * **Look for:** `features/<name>/screens|hooks|api|components/`
   * **Alt patterns:** `src/modules/`, FSD `entities/` + `features/`
   * **Related:** [Folder Structure for Features](https://docs.wahwei/reactnative.codeguides.io/project-setup/folder-structure-for-features/)
10. **Shared API client** - single HTTP wrapper with auth headers and base URL.

    * **Look for:** `shared/api/client.ts`, `lib/api.ts`, or `createApiClient()` factory
    * **Trace:** Screen → hook → `ordersApi.getById` → `client.get`
11. **Auth/session gate** - how signed-out users are redirected.

    * **Look for:** `Redirect` in `app/_layout.tsx`, `(auth)/` route group, or `useAuth()` guard
    * **Ask:** Where is refresh token stored? (`expo-secure-store` pattern)
12. **State strategy** - what lives in TanStack Query vs Zustand vs context.

    * **Look for:** `useQuery` for server data; store only for UI session state
    * **Smell:** `fetch` inside Zustand actions duplicating query cache
13. **Design system entry** - buttons, typography, theme tokens.

    * **Look for:** `shared/ui/`, `@/components`, or external package import
    * **Ask:** Storybook or on-device catalog URL if it exists
14. **`eas.json` build profiles** - development, preview, production.

    * **Look for:** `developmentClient`, `distribution: internal`, `channel` per profile
    * **Related:** [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/)
15. **TypeScript paths** - `@/` alias mapping in `tsconfig.json`.

    * **Look for:** `"paths": { "@/*": ["./*"] }"` or monorepo package names
    * **Verify:** Jump-to-definition from route to feature screen works in IDE
16. **Test colocation** - `*.test.tsx` beside components or `__tests__` folder policy.

    * **Look for:** `jest.config.js`, `jest.setup.ts`, `jest-expo` preset
    * **Run:** `npm test -- --listTests | head`

---

## Tier 3 - Week Two (17–24)

*You can reason about native behavior and debug production-shaped builds.*

17. **Config plugins** - native changes without hand-editing `ios/` / `android/`.

    * **Look for:** `plugins: ["expo-router", "./plugins/withCustom"]` in app config
    * **Ask:** When was last `npx expo prebuild` and is CNG adopted?
18. **`ios/` and `android/` presence** - managed vs bare vs generated native dirs.

    * **Managed/CNG:** folders gitignored - EAS generates at build
    * **Bare:** folders committed - local `pod install` required
    * **Related:** [Prebuild Basics](https://docs.wahwei/reactnative.codeguides.io/cng-prebuild/prebuild-basics/)
19. **Deep linking config** - scheme, universal links, intent filters.

    * **Look for:** `scheme` in app config, `apple-app-site-association`, Android intent filters
    * **Related:** [Deep Linking Basics](https://docs.wahwei/reactnative.codeguides.io/deep-linking/deep-linking-basics/)
20. **Push notifications wiring** - token registration and cold-start route.

    * **Look for:** `expo-notifications` setup, `app/_layout.tsx` notification response listener
    * **Ask:** Which environment sends test pushes?
21. **Analytics and error reporting** - Sentry, Datadog, Amplitude, etc.

    * **Look for:** init in root layout or `AppProviders`, `captureException` usage pattern
    * **Ask:** PII rules - what is forbidden in breadcrumbs?
22. **OTA updates** - channels and `runtimeVersion` policy.

    * **Look for:** `expo-updates` config, `eas update` channel names in docs
    * **Related:** [OTA Updates Basics](https://docs.wahwei/reactnative.codeguides.io/ota-updates/ota-updates-basics/)
23. **Maestro / E2E folder** - smoke flows and when CI runs them.

    * **Look for:** `.maestro/smoke.yml`, `appId` matching bundle identifier
    * **Related:** [Mobile Testing Basics](https://docs.wahwei/reactnative.codeguides.io/testing/mobile-testing-basics/)
24. **Internationalization** - locale files and date/number formatting.

    * **Look for:** `i18n/`, `locales/`, `expo-localization` usage
    * **Smell:** Hard-coded strings in feature screens without extraction

---

## Tier 4 - Release Literacy (25–30)

*You know how code becomes a store binary and who to ping when it breaks.*

25. **CI workflow location** - GitHub Actions, GitLab CI, or EAS Workflows.

    * **Look for:** `.github/workflows/pr-checks.yml`, `.eas/workflows/`
    * **Trace:** PR open → which jobs run → required checks for merge
26. **PR vs release pipelines** - separate triggers and secrets.

    * **Look for:** `pull_request` for lint/tsc/test; `tags: v*` for `eas build`
    * **Related:** [Mobile CI/CD Basics](https://docs.wahwei/reactnative.codeguides.io/cicd/mobile-ci-cd-basics/)
27. **`EXPO_TOKEN` and secrets docs** - where robot credentials live (not in repo).

    * **Look for:** GitHub org secrets runbook, 1Password vault name
    * **Never:** Tokens in workflow YAML plaintext
28. **Store submission path** - who runs `eas submit` and TestFlight / Play tracks.

    * **Look for:** `submit` profile in `eas.json`, internal testing doc links
    * **Related:** [EAS Submit](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-submit/)
29. **Monorepo boundaries** - if applicable, which workspace is the mobile app.

    * **Look for:** `apps/mobile/`, `packages/ui`, `turbo.json` pipeline filters
    * **Related:** [Monorepo with Turborepo](https://docs.wahwei/reactnative.codeguides.io/project-setup/monorepo-with-turborepo/)
30. **CODEOWNERS and on-call** - who must approve `app/`, native, or release changes.

    * **Look for:** `.github/CODEOWNERS`, PagerDuty / on-call schedule link
    * **Ask:** Hotfix process outside business hours

---

## Tour Session Template

Use this 60-minute agenda with a buddy:

```markdown
## Codebase tour - <hire> + <buddy> - <date>
 
### Tier 1 (20m)
- [ ] README clone path verified
- [ ] app/_layout.tsx walked
- [ ] app.config.ts bundle IDs noted
 
### Tier 2 (25m)
- [ ] Traced: <pick one feature> tap → API
- [ ] eas.json profiles explained
- [ ] Test command run together
 
### Tier 3–4 (15m sketch)
- [ ] CI PR checks named
- [ ] Preview build label demonstrated
- [ ] Open questions logged below
 
### Open questions → doc PRs
1.
2.
```

## FAQs

Our paths do not match the checklist - now what?

Update your team wiki with a path map table. Send a doc PR adding a `## Repository map` section to README linking real folders.

How deep on Tier 4 for juniors?

Awareness only in week one - "PR checks live here, releases tagged there." Hands-on release duty comes after first preview build.

Brownfield repo with native apps?

Add items for host app entry point, RN bundle URL, and bridge modules - see [Brownfield Basics](https://docs.wahwei/reactnative.codeguides.io/brownfield/brownfield-basics/).

## Related

* [Onboarding Basics](https://docs.wahwei/reactnative.codeguides.io/team/onboarding-basics/) - machine setup before the tour
* [First-Week Learning Path](https://docs.wahwei/reactnative.codeguides.io/team/first-week-learning-path/) - capstone feature arc
* [Project Setup Basics](https://docs.wahwei/reactnative.codeguides.io/project-setup/project-setup-basics/) - default SDK 57 layout
* [Expo Router Basics](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/) - `app/` routing
* [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - build profiles
* [Mobile CI/CD Basics](https://docs.wahwei/reactnative.codeguides.io/cicd/mobile-ci-cd-basics/) - PR vs release pipelines

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
