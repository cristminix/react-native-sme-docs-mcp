# Team & Onboarding Best Practices

A condensed summary of the **25 most important team and onboarding practices** for Expo SDK 57 mobile teams - drawn from every page in this section.

Highlights / Team & Onboarding Best Practices

* Day one: Node 20, npm ci, expo-doctor, Metro green - before feature tickets
* Week one ships a capstone PR with navigation, test, and preview build evidence
* Codebase tour is tiered and buddy-led - not a solo file tree binge
* Leveling uses a mobile skills matrix - Router, EAS, device matrix, release hygiene
* Pairing rotates driver/navigator; PRs include iOS + Android screenshots for UI
* Onboarding docs improve every hire - record confusion as doc PRs

1. **Machine setup before tickets:** Node 20 LTS, `npm ci`, `npx expo-doctor`, and `npx expo start` green on day one - [Onboarding Basics](https://docs.wahwei/reactnative.codeguides.io/team/onboarding-basics/).
2. **Pin SDK 57 explicitly:** `expo` ~57.0.4, React 19.2.3, RN 0.86.0 - new hires do not bump SDK in week one - [Project Setup Basics](https://docs.wahwei/reactnative.codeguides.io/project-setup/project-setup-basics/).
3. **CONTRIBUTING.md is canonical:** Clone path, env template, branch rules, and preview label documented - not scattered Slack pins.
4. **Same scripts locally and in CI:** `lint`, `typecheck`, `test`, `start` - hires learn one command surface - [Mobile CI/CD Basics](https://docs.wahwei/reactnative.codeguides.io/cicd/mobile-ci-cd-basics/).
5. **Week-one capstone is mandatory:** One E2E feature - route, screen, test, merged PR - [First-Week Learning Path](https://docs.wahwei/reactnative.codeguides.io/team/first-week-learning-path/).
6. **Expo Router tour early:** Thin `app/` routes re-exporting `features/` - mental model before deep refactors - [Expo Router Basics](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/).
7. **Buddy assignment day one:** Named buddy for 90-minute codebase tour and first two PRs - not "ask anyone."
8. **Tiered codebase checklist:** Tier 1 day one, Tier 2 before capstone, Tier 3–4 week two - [Codebase Tour Checklist](https://docs.wahwei/reactnative.codeguides.io/team/codebase-tour-checklist/).
9. **Trace one feature slice together:** Tap → hook → API → client - whiteboard path beats reading every file.
10. **Preview build in week one:** Every hire triggers or installs an EAS `preview` build on hardware - [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/).
11. **Expo Go vs dev client documented:** README states which - custom native modules require dev client, not guesswork.
12. **EAS login and org invite day one:** Humans use `eas login`; CI uses `EXPO_TOKEN` robot - never commit tokens.
13. **`.env.example` committed:** `EXPO_PUBLIC_*` only - production secrets in EAS environments.
14. **Standard simulator names:** iPhone 16 + Pixel 8 API 35 - pairing and screenshots stay comparable.
15. **PR evidence for UI:** iOS and Android screenshots or recording - sim-only review is insufficient for shipping confidence - [Pairing & Mob on Mobile](https://docs.wahwei/reactnative.codeguides.io/team/pairing-and-mob-on-mobile/).
16. **Rotate driver every 25 minutes:** Mob and pair sessions - one keyboard hogging hides bus factor.
17. **Device lab checkout sheet:** Physical devices for camera, push, biometrics - logged out between uses.
18. **Leveling matrix over tenure:** Junior vs mid defined by Router, Query, EAS, tests - [Junior → Mid RN Leveling](https://docs.wahwei/reactnative.codeguides.io/team/junior-mid-rn-leveling/).
19. **One competency per sprint growth plan:** Gap plans are focused - not unfocused "learn React Native."
20. **Tiny merged PR by day two:** Builds CI literacy before capstone scope - confidence from green checks.
21. **Record week-one confusion as doc PRs:** README path maps and tour notes improve the next hire - onboarding is a product.
22. **Pair on `app.config.ts` and `eas.json` first time:** Credentials and bundle IDs are not solo experimentation.
23. **Defer SDK upgrades and native plugins:** Week one is read-and-ship - platform changes need staff pairing.
24. **Release pairing for first submit shadow:** Observer on `eas submit` + rollback doc - [EAS Submit](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-submit/).
25. **Written week-one retro to lead:** Three bullets - clearest doc, most confusing folder, proposed doc fix - closes the feedback loop.

## FAQs

How long should onboarding take before "normal" velocity?

Expect full sprint capacity by week three. Week one is learning-shaped workload - capstone, not backlog avalanche.

One buddy or rotating buddies?

One primary buddy for two weeks; optional rotate for domain experts (CI, design system) in week two.

Remote hire without device lab?

Ship one team device or reimburse short-term rental. Require preview APK/IPA install on personal phone with staging accounts from vault.

Contractor onboarding - same path?

Same machine and tour checklist; scope leveling matrix to contract length. Capstone still proves merge and CI literacy.

Biggest onboarding mistake?

Assigning production tickets before Metro green and codebase tour Tier 1 - produces silent struggle and revert-heavy PRs.

## Related

* [Onboarding Basics](https://docs.wahwei/reactnative.codeguides.io/team/onboarding-basics/) - 10 day-one setup examples
* [First-Week Learning Path](https://docs.wahwei/reactnative.codeguides.io/team/first-week-learning-path/) - five-day capstone cookbook
* [Codebase Tour Checklist](https://docs.wahwei/reactnative.codeguides.io/team/codebase-tour-checklist/) - 30 tiered items
* [Junior → Mid RN Leveling](https://docs.wahwei/reactnative.codeguides.io/team/junior-mid-rn-leveling/) - skills matrix
* [Pairing & Mob on Mobile](https://docs.wahwei/reactnative.codeguides.io/team/pairing-and-mob-on-mobile/) - sim sharing and review norms
* [Project Setup Basics](https://docs.wahwei/reactnative.codeguides.io/project-setup/project-setup-basics/) - SDK 57 scaffold
* [Expo Router Basics](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/) - routing mental model
* [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - cloud builds and profiles

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
