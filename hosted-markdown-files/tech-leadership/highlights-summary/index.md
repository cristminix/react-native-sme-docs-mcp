# Technical Leadership Highlights Summary

Every highlight bullet from the 7 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Technical Leadership Highlights Summary

* Three clocks: OTA (minutes), store binary (days), backend API - leads own the dependency map
* ADRs are short, dated, and reversible - not design novels in Confluence
* Mobile review is device evidence + boundary checks - not style-only LGTM
* Default to JavaScript + Expo SDK until measured perf or OS API gaps force native
* Week one: Metro green, named sim profiles, one merged tiny PR before feature scope
* Disagreements stuck in Slack need a time-boxed decision forum - not endless threads

## [Tech Lead Basics on Mobile](https://docs.wahwei/reactnative.codeguides.io/tech-leadership/tech-lead-basics-on-mobile/)

* Three clocks: OTA (minutes), store binary (days), backend API - leads own the dependency map
* Velocity without guardrails ships store rejections and rollback weekends
* Classify every change: JS-only, native-impacting, policy-sensitive - before promising a date
* Risk budget: one store submit per sprint unless incident lane is pre-approved
* Preview builds on PRs catch native drift; Expo Go alone hides custom native modules
* Protect main with CI gates - speed comes from small PRs, not skipped checks

## [Architecture Decision Records](https://docs.wahwei/reactnative.codeguides.io/tech-leadership/architecture-decision-records/)

* ADRs are short, dated, and reversible - not design novels in Confluence
* Mobile ADRs must name release clock: OTA, store binary, or both
* Record runtimeVersion impact and rollback path in every shipping ADR
* Native vs SDK decisions include maintenance owner and upgrade cost
* Link to ranked ADRs in architecture-design for navigation and state
* Supersede - don't edit history - when SDK or policy flips the decision

## [Code Review Standards for RN](https://docs.wahwei/reactnative.codeguides.io/tech-leadership/code-review-standards-for-rn/)

* Mobile review is device evidence + boundary checks - not style-only LGTM
* Perf: list virtualization, stable renderItem, root layout import weight
* A11y: label, role, state, font scaling - VoiceOver/TalkBack spot check
* Native boundary: expo install, config plugins, OTA vs build classification
* Router: thin routes, params typed, no business logic in app/
* Block merge on missing rollback notes for release and native PRs

## [Native vs JavaScript Trade-offs](https://docs.wahwei/reactnative.codeguides.io/tech-leadership/native-vs-javascript-trade-offs/)

* Default to JavaScript + Expo SDK until measured perf or OS API gaps force native
* Every native path adds build time, OTA lockout, and Swift/Kotlin bus factor
* Third-party SDKs are native debt with vendor upgrade schedules
* TurboModules pay off at sustained high-frequency bridge traffic - not one-off calls
* Record maintenance owner and escape hatch in ADR before merging native code
* Revisit when SDK 58 ships - Expo may absorb your custom module

## [Mentoring Junior Mobile Devs](https://docs.wahwei/reactnative.codeguides.io/tech-leadership/mentoring-junior-mobile-devs/)

* Week one: Metro green, named sim profiles, one merged tiny PR before feature scope
* Teach Expo Router thin routes early - prevents god-screen refactors
* Safe first PRs: copy, styles, tests - not app.config or native deps solo
* Debugging ladder: redbox → React DevTools → native logs → preview build
* Pair on first eas build and store-adjacent files - never solo experimentation
* Growth tied to evidence matrix - [Junior → Mid RN Leveling](https://docs.wahwei/reactnative.codeguides.io/team/junior-mid-rn-leveling/)

## [Handling Technical Disagreements](https://docs.wahwei/reactnative.codeguides.io/tech-leadership/handling-technical-disagreements/)

* Disagreements stuck in Slack need a time-boxed decision forum - not endless threads
* Navigation and state are multi-year tax - escalate with ranked ADRs, not opinions
* Disagree-and-commit: record dissent, owner ships, revisit trigger named
* Prototype budget: 2–3 days max for spikes - binary choice after metrics or ADR
* Staff engineer dissent on compliance/native - override needs written risk acceptance
* Post-decision: no relitigation until revisit date or production incident

## [Technical Leadership Best Practices](https://docs.wahwei/reactnative.codeguides.io/tech-leadership/best-practices/)

* Classify every ship: OTA, store binary, backend - before promising dates
* ADRs for native, OTA production, and navigation/state commits
* Review standards scale quality - lead reviews boundaries, not every line
* Disagree-and-commit with written dissent and revisit triggers
* Mentor week-one outcomes: Metro, sims, merged tiny PR, preview build
* Native code is a budget line - default JavaScript until ranked doc says otherwise

Reviewed by Chris St. John·Last updated Jul 18, 2026
