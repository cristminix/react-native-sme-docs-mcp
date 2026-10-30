# Product & Stakeholders Highlights Summary

Every highlight bullet from the 7 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Product & Stakeholders Highlights Summary

* Figma frames are hypotheses - validate on iOS and Android hardware before sprint commitment
* Platform parity is a product choice - not an accident of whichever dev finished first
* Mobile estimates are ranges with explicit risk flags - not single-point web story points
* Tech debt is unpaid shipping tax - frame it as risk and velocity, not engineer comfort
* Stakeholders need outcomes and dates as ranges - not git commit hashes
* Feasibility review at wireframe saves more time than redesign at hi-fi

## [Product Collaboration Basics](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/product-collaboration-basics/)

* Figma frames are hypotheses - validate on iOS and Android hardware before sprint commitment
* Safe areas, keyboard, and gesture back change layout math - not optional polish
* One feasibility note per screen beats a post-sprint 'we can't build that' surprise
* Motion specs need frame budget and fallback - see Animations & Gestures before pixels lock
* Design tokens from your system beat one-off hex values copied from web mocks
* Demo on device in refinement - stakeholders trust thumbs, not static artboards

## [Platform Parity Decisions](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/platform-parity-decisions/)

* Platform parity is a product choice - not an accident of whichever dev finished first
* Follow HIG and Material where users expect native chrome - document exceptions in ADR
* Shared design tokens with platform-specific navigation patterns is the default stack
* Intentional divergence needs a ticket, screenshot pair, and PM sign-off - not silent drift
* Android predictive back and iOS edge swipe change custom gesture specs
* Store review and OS policy sometimes force platform-specific flows - record the constraint

## [Estimation & Risk on Mobile](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/estimation-and-risk-on-mobile/)

* Mobile estimates are ranges with explicit risk flags - not single-point web story points
* Store review adds 1–5+ days of calendar uncertainty - separate from engineering done
* Native spikes are billable discovery - 0.5–2 days before committing to custom UI
* OTA-safe vs store-build changes affect release timeline - state which path in every ticket
* Device matrix and permission flows multiply QA - estimate in parallel hours, not 'one QA pass'
* Honest buffers build trust; surprise slips destroy product partnership

## [Prioritizing Tech Debt vs Features](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/prioritizing-tech-debt-vs-features/)

* Tech debt is unpaid shipping tax - frame it as risk and velocity, not engineer comfort
* SDK lag blocks store policy, security patches, and hiring - quantify calendar cost
* Perf work is revenue when cold start and scroll jank hit conversion - bring numbers
* 20% capacity rule works when debt is visible in a portfolio board PM attends
* Feature freezes for upgrades beat death-by-a-thousand deferred native bumps
* Pair debt items to business outcomes - 'upgrade Expo' alone loses to any feature

## [Stakeholder Communication](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/stakeholder-communication/)

* Stakeholders need outcomes and dates as ranges - not git commit hashes
* Crash-free rate and ANR rate are the mobile uptime metric - translate from Sentry/Crashlytics
* Release status: binary vs OTA vs in review - three different user-visible states
* Trade-off memos in one screen: option, cost, risk, recommendation
* Red/yellow/green without context causes panic - always pair status with next action
* Device demo clips beat paragraphs for design approval and incident comms

## [Working with Design & Motion](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/working-with-design-and-motion/)

* Feasibility review at wireframe saves more time than redesign at hi-fi
* Every motion spec needs: trigger, duration, easing, interrupt rule, and reduced-motion fallback
* Reanimated 4 for gesture-linked frames; Animated API for simple fades - decide before Figma lock
* Prototype on device in 30 minutes beats a week of pixel debate
* Design tokens constrain motion values - spring configs live in the system
* Say 'fallback pattern' in refinement - stakeholders accept phased delight

## [Product Collaboration Best Practices](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/best-practices/)

* Device demos in refinement - stakeholders trust thumbs, not static artboards
* Feasibility notes on every net-new screen before sprint commit
* Platform parity documented - intentional divergence beats silent drift
* Estimates as ranges with OTA vs store path stated per ticket
* Crash-free and rollout % in weekly updates - not git jargon
* Motion classified before hi-fi lock - Reanimated vs static decided jointly

Reviewed by Chris St. John·Last updated Jul 18, 2026
