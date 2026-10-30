# Technical Leadership Best Practices

A condensed summary of the **25 most important technical leadership practices** for Expo SDK 57 mobile teams - drawn from every page in this section. Protect quality without becoming the bottleneck.

Highlights / Technical Leadership Best Practices

* Classify every ship: OTA, store binary, backend - before promising dates
* ADRs for native, OTA production, and navigation/state commits
* Review standards scale quality - lead reviews boundaries, not every line
* Disagree-and-commit with written dissent and revisit triggers
* Mentor week-one outcomes: Metro, sims, merged tiny PR, preview build
* Native code is a budget line - default JavaScript until ranked doc says otherwise

1. **Classify changes by release clock:** JS-only OTA vs native store binary vs backend dependency - before sprint commitment - [Tech Lead Basics on Mobile](https://docs.wahwei/reactnative.codeguides.io/tech-leadership/tech-lead-basics-on-mobile/).
2. **Maintain a three-clock dependency map:** Align mobile leads with backend and release managers on [Release Train Calendar](https://docs.wahwei/reactnative.codeguides.io/cicd/release-train-calendar/) - not surprise Friday API breaks.
3. **Risk budget store submits:** Cap store releases per sprint; track rejections as process debt - velocity without guardrails ships rollback weekends.
4. **OTA requires runtimeVersion discipline:** Mismatch needs new binary - document rollback `updateId` every production OTA - [Runtime Version Policy](https://docs.wahwei/reactnative.codeguides.io/ota-updates/runtime-version-policy/).
5. **Preview builds on native-touching PRs:** Expo Go hides custom native modules - [Preview Builds on PRs](https://docs.wahwei/reactnative.codeguides.io/cicd/preview-builds-on-prs/).
6. **Write ADRs for irreversible choices:** OTA-to-production policy, new native modules, navigation/state commits - short markdown in repo - [Architecture Decision Records](https://docs.wahwei/reactnative.codeguides.io/tech-leadership/architecture-decision-records/).
7. **Supersede ADRs - never silent edits:** Status field + new file preserves onboarding truth.
8. **Point to ranked architecture docs:** Team ADR records **your** choice; frameworks live in [architecture-design](https://docs.wahwei/reactnative.codeguides.io/architecture-design/best-practices/).
9. **Default native boundary to Expo SDK:** Custom TurboModules need maintenance owners and cost worksheet - [Native vs JavaScript Trade-offs](https://docs.wahwei/reactnative.codeguides.io/tech-leadership/native-vs-javascript-trade-offs/).
10. **Enforce PR review checklist:** Perf lists, a11y labels, native `expo install`, thin routes - [Code Review Standards for RN](https://docs.wahwei/reactnative.codeguides.io/tech-leadership/code-review-standards-for-rn/).
11. **Require device evidence on UI PRs:** iOS + Android screenshot or recording - sim-only Pro Max review lies on Android-majority apps.
12. **Small PRs over hero reviews:** Target under 400 lines; same-day review beats weekly mega-diffs.
13. **CODEOWNERS on `app.config.ts` and `eas.json`:** Native config mistakes are org-wide - not junior solo experimentation.
14. **Time-box technical disagreements:** Owner, decide-by date ≤ 5 days, ranked ADR or spike - no 50-message Slack limbo - [Handling Technical Disagreements](https://docs.wahwei/reactnative.codeguides.io/tech-leadership/handling-technical-disagreements/).
15. **Disagree-and-commit in writing:** Dissent preserved; one implementation after commit; revisit trigger named.
16. **Navigation debates use ranked ADR:** Greenfield SDK 57 defaults Expo Router; brownfield exceptions documented - [ADR: Navigation Library Choice](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-navigation-library-choice/).
17. **State debates classify first:** Server → Query; client UI → Zustand; URL → Router params - [ADR: State Management Selection](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-state-management-selection/).
18. **Mentor structured week one:** Metro green, tiny merged PR, preview on device - not production tickets day one - [Mentoring Junior Mobile Devs](https://docs.wahwei/reactnative.codeguides.io/tech-leadership/mentoring-junior-mobile-devs/).
19. **Safe first PR scope:** Copy, tests, a11y - defer solo native config until mid-level evidence - [Junior → Mid RN Leveling](https://docs.wahwei/reactnative.codeguides.io/team/junior-mid-rn-leveling/).
20. **Buddy + capstone path:** Use [First-Week Learning Path](https://docs.wahwei/reactnative.codeguides.io/team/first-week-learning-path/) - not "read the repo."
21. **Teach debugging ladder:** Redbox → DevTools → expo-doctor → preview build → native logs paired.
22. **Pair on first EAS build and submit shadow:** Release literacy before on-call rotation - [Onboarding Basics](https://docs.wahwei/reactnative.codeguides.io/team/onboarding-basics/).
23. **Review architecture boundaries - delegate feature diffs:** Lead on native, release, and cross-squad contracts; mids own feature quality.
24. **Run refactoring checklist before major release:** God modules block parallel PRs and SDK upgrades - [Refactoring Checklist](https://docs.wahwei/reactnative.codeguides.io/architecture-design/refactoring-checklist/).
25. **Improve onboarding from every hire retro:** Confusion → doc PR - leadership is a feedback loop into [team](https://docs.wahwei/reactnative.codeguides.io/team/best-practices/) practices.

## FAQs

How do I avoid becoming the sole approver?

Publish checklists and ranked ADRs so mids block boundary violations. You approve exceptions and release PRs - not every `Text` color change.

Startup with no ADR culture - minimum viable?

Three ADRs: navigation choice, state stack, OTA vs store policy. Expand when native modules appear.

EM vs tech lead on disagree-and-commit?

Tech lead owns technical option scoring; EM breaks ties on calendar risk and staffing. Both sign compliance-sensitive ADRs.

Contractors and leadership practices?

Same review checklist and ADR stack; scope mentoring to contract length. No solo `eas.json` edits without staff review.

Biggest tech-lead failure mode on mobile?

Optimizing PR count without release-clock literacy - fast merges that OTA native changes or miss store review buffers.

## Related

* [Tech Lead Basics on Mobile](https://docs.wahwei/reactnative.codeguides.io/tech-leadership/tech-lead-basics-on-mobile/) - velocity vs store-review risk
* [Architecture Decision Records](https://docs.wahwei/reactnative.codeguides.io/tech-leadership/architecture-decision-records/) - mobile ADR cookbook
* [Code Review Standards for RN](https://docs.wahwei/reactnative.codeguides.io/tech-leadership/code-review-standards-for-rn/) - perf, a11y, native checklist
* [Native vs JavaScript Trade-offs](https://docs.wahwei/reactnative.codeguides.io/tech-leadership/native-vs-javascript-trade-offs/) - ranked native decisions
* [Mentoring Junior Mobile Devs](https://docs.wahwei/reactnative.codeguides.io/tech-leadership/mentoring-junior-mobile-devs/) - simulators and safe PRs
* [Handling Technical Disagreements](https://docs.wahwei/reactnative.codeguides.io/tech-leadership/handling-technical-disagreements/) - disagree-and-commit
* [Architecture Best Practices](https://docs.wahwei/reactnative.codeguides.io/architecture-design/best-practices/) - structural decisions
* [Team & Onboarding Best Practices](https://docs.wahwei/reactnative.codeguides.io/team/best-practices/) - hiring and leveling

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
