# Project Setup Best Practices

A condensed summary of the 25 most important best practices drawn from every page in this section.

Highlights / Project Setup Best Practices

* Pin Expo SDK at scaffold with default@sdk-57 and verify with expo-doctor
* Keep app routes thin; put features under features/<name>/
* One react-native copy in monorepos - duplicate native deps crash at runtime
* Prefer SDK 57 auto Metro config before hand-tuning watchFolders
* Commit lockfiles; never commit ios/ and android/ under CNG
* White-label with app.config env variants, not forked feature code

1. **Scaffold with an SDK template pin:** `npx create-expo-app@latest --template default@sdk-57` - upgrading later costs more than starting on the supported SDK.
2. **Run expo-doctor on day one:** Fix version skew before the first feature PR - doctor catches config and dependency mismatches early.
3. **Commit lockfiles with the app:** CI and EAS must resolve the same tree as local dev - floating installs hide native/JS skew until TestFlight.
4. **Keep package.json scripts boring:** `start`, `ios`, `android`, `lint`, `typecheck` - every engineer should not memorize one-off Metro flags.
5. **Extend expo/tsconfig.base:** Strict TypeScript from the template - custom tsconfig drift breaks Expo Router typed routes and autolinking types.
6. **Use app.config.ts for environments:** Dynamic config beats duplicated `app.json` files - drive variants with `APP_VARIANT` or `BRAND` env vars.
7. **Pick the smallest template that fits:** `blank-typescript` for learning; `tabs` only when navigation is day-one scope - delete unused boilerplate immediately.
8. **Organize by feature, not layer-only:** `features/orders/` owns screens, hooks, and presenters - global `components/` is for design-system primitives only.
9. **One public export per feature:** Route files import `OrdersScreen` from `features/orders` - no cross-feature deep imports into `hooks/useOrder.ts`.
10. **Thin app/ directory:** Expo Router files re-export feature screens - business logic does not live beside `_layout.tsx`.
11. **Start monorepos with pnpm + Turborepo when sharing UI:** `apps/mobile` + `packages/ui` with `workspace:*` - add Nx when generators and affected graphs justify the complexity.
12. **Let SDK 57 configure Metro first:** Automatic monorepo detection beats hand-written `watchFolders` - customize only when doctor and builds prove a gap.
13. **Hoist or isolate pnpm symlinks consciously:** `nodeLinker: hoisted` avoids many Metro symlink bugs - document the choice in README for onboarding.
14. **Never duplicate react-native in the graph:** Two native copies cause "Invalid hook call" and obscure redboxes - `npx expo-doctor` and `why react-native` checks in CI.
15. **Declare peerDependencies in shared packages:** Workspace libraries should peer `react`, `react-native`, and `expo` - apps provide the single installed version.
16. **Use Nx tags for boundaries:** `scope:orders` cannot import `scope:billing` internals - enforce with `@nx/enforce-module-boundaries` in growing orgs.
17. **Run affected tasks in CI:** `nx affected -t lint,typecheck,test` keeps monorepo PRs fast - full-repo runs do not scale past a dozen packages.
18. **White-label with config, not forks:** `apps/acme` and `apps/globex` share `packages/core` - brand tokens inject via `BrandProvider`, not copy-paste screens.
19. **Separate EAS projectId per app binary:** White-label flavors need distinct credentials, env vars, and update channels - one projectId per bundle ID.
20. **Gitignore native folders under CNG:** Committed `ios/`/`android/` block SDK upgrades - regenerate on EAS Build or `expo prebuild --clean`.
21. **Document first-run verification:** A script that runs `expo-doctor`, `tsc --noEmit`, and a dev-client build - new hires prove the toolchain in one command.
22. **Ignore `.env.local`, commit `.env.example`:** Machine-specific secrets stay local - example env documents required `EXPO_PUBLIC_*` keys without values.
23. **Align Babel and Metro with the template:** Custom plugins belong in documented config - silent Babel drift breaks Fast Refresh and Reanimated.
24. **Choose Turborepo or Nx, not both orchestrators:** One task graph owner - mixing confuses `dev` scripts and cache keys.
25. **Revisit folder structure at ~15 engineers:** Layer-only layouts collapse under parallel feature teams - schedule a migration before import cycles force a rewrite.

## FAQs

When should we adopt a monorepo?

* When two or more apps or a shared UI package ships from the same team.
* Single-app teams should stay single-repo until duplication pain is measurable.

Turborepo or Nx for Expo?

* Turborepo for simpler caching and pnpm workspaces.
* Nx when you need generators, boundary enforcement, and affected graphs at scale.

Can multiple Expo apps share one node\_modules?

* Yes at the workspace root with pnpm - each app still needs its own `app.config` and EAS project.
* Metro must resolve one `react-native` instance.

## Related

* [Project Setup Basics](https://docs.wahwei/reactnative.codeguides.io/project-setup/project-setup-basics/) - layout, scripts, and first-run verification
* [create-expo-app Templates](https://docs.wahwei/reactnative.codeguides.io/project-setup/create-expo-app-templates/) - picking the right starter
* [Folder Structure for Features](https://docs.wahwei/reactnative.codeguides.io/project-setup/folder-structure-for-features/) - feature slices vs layers
* [Monorepo with Turborepo](https://docs.wahwei/reactnative.codeguides.io/project-setup/monorepo-with-turborepo/) - shared packages and caching
* [Shared Packages & Metro Resolution](https://docs.wahwei/reactnative.codeguides.io/project-setup/shared-packages-and-metro-resolution/) - watchFolders and symlinks
* [Multiple Apps in One Repo](https://docs.wahwei/reactnative.codeguides.io/project-setup/multiple-apps-in-one-repo/) - white-label patterns

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
