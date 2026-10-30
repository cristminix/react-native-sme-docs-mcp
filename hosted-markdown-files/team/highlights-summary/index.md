# Team & Onboarding Highlights Summary

Every highlight bullet from the 6 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Team & Onboarding Highlights Summary

* Pin Node 20 LTS and SDK 57 before cloning - mismatched peers break Metro on hour one
* Days 1–2: run the app, tour app/ routes, ship a one-line UI PR
* Tier 1: day-one paths - app/, package.json, app.config.ts, CONTRIBUTING.md
* Junior: ship UI with Router, RNTL tests, and green PR checks on guidance
* One driver, one navigator - rotate every 25 minutes in mob sessions
* Day one: Node 20, npm ci, expo-doctor, Metro green - before feature tickets

## [Onboarding Basics](https://docs.wahwei/reactnative.codeguides.io/team/onboarding-basics/)

* Pin Node 20 LTS and SDK 57 before cloning - mismatched peers break Metro on hour one
* Xcode + CocoaPods for iOS simulators; Android Studio SDK 35 for emulators
* EAS CLI links your laptop to cloud builds - eas login once, eas build:configure in the repo
* npx expo-doctor is the first command after npm install - catches skew before obscure red screens
* Expo Go is fine for day one; dev clients are the path to native modules and E2E
* Document machine setup in CONTRIBUTING.md so every hire reproduces the same green path

## [First-Week Learning Path](https://docs.wahwei/reactnative.codeguides.io/team/first-week-learning-path/)

* Days 1–2: run the app, tour app/ routes, ship a one-line UI PR
* Days 3–4: trace one feature slice from route → hook → API → test
* Day 5: trigger a preview EAS build and install on a physical device
* Capstone: one small E2E feature - screen, navigation, test, preview build
* Pair with a buddy for first merge - review norms matter as much as syntax
* End week with a written 'what confused me' note - feed back into onboarding docs

## [Codebase Tour Checklist](https://docs.wahwei/reactnative.codeguides.io/team/codebase-tour-checklist/)

* Tier 1: day-one paths - app/, package.json, app.config.ts, CONTRIBUTING.md
* Tier 2: feature slices, shared API client, env and EAS config
* Tier 3: native plugins, testing layout, observability hooks
* Tier 4: CI workflows, release channels, monorepo boundaries
* Check off with a buddy - annotate repo wiki with your team's actual paths
* Failed items become doc PRs - onboarding improves when confusion is recorded

## [Junior → Mid RN Leveling](https://docs.wahwei/reactnative.codeguides.io/team/junior-mid-rn-leveling/)

* Junior: ship UI with Router, RNTL tests, and green PR checks on guidance
* Mid: own feature slices, preview builds, Query cache, and thin Maestro smokes
* Mobile-specific axes: navigation, offline, permissions, device matrix, release hygiene
* Leveling is evidence-based - merged PRs, not years of tenure
* Gap plans pair one competency per sprint - avoid unfocused 'learn RN' goals
* Web React experience accelerates UI work - does not replace native literacy

## [Pairing & Mob on Mobile](https://docs.wahwei/reactnative.codeguides.io/team/pairing-and-mob-on-mobile/)

* One driver, one navigator - rotate every 25 minutes in mob sessions
* Share simulators via screen share + named device profiles - avoid 'works on my phone'
* Device lab: checkout sheet, charged devices, wipe guest accounts between sessions
* PR reviews require sim or device evidence for UI, gestures, and safe areas
* Remote pairing: Tandem / VS Code Live Share for code; QuickTime for iOS sim mirror
* Mob on release days - RC install, smoke flows, and rollback paths together

## [Team & Onboarding Best Practices](https://docs.wahwei/reactnative.codeguides.io/team/best-practices/)

* Day one: Node 20, npm ci, expo-doctor, Metro green - before feature tickets
* Week one ships a capstone PR with navigation, test, and preview build evidence
* Codebase tour is tiered and buddy-led - not a solo file tree binge
* Leveling uses a mobile skills matrix - Router, EAS, device matrix, release hygiene
* Pairing rotates driver/navigator; PRs include iOS + Android screenshots for UI
* Onboarding docs improve every hire - record confusion as doc PRs

Reviewed by Chris St. John·Last updated Jul 18, 2026
