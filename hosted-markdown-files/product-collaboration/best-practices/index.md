# Product Collaboration Best Practices

A condensed summary of the **25 most important product collaboration practices** for Expo SDK 57 mobile teams - drawn from every page in this section.

Highlights / Product Collaboration Best Practices

* Device demos in refinement - stakeholders trust thumbs, not static artboards
* Feasibility notes on every net-new screen before sprint commit
* Platform parity documented - intentional divergence beats silent drift
* Estimates as ranges with OTA vs store path stated per ticket
* Crash-free and rollout % in weekly updates - not git jargon
* Motion classified before hi-fi lock - Reanimated vs static decided jointly

1. **Demo on real devices in refinement:** iOS + Android preview build or sim recording before sprint commit - [Product Collaboration Basics](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/product-collaboration-basics/).
2. **Figma is a hypothesis:** Handoff checklist includes safe areas, keyboard, and non-happy-path states - not only marketing frames.
3. **Engineer in design crit early:** Wireframe-stage attendance catches gesture and navigation issues before hi-fi investment.
4. **Feasibility comment per screen:** One engineer note on ticket - spike needed, fallback pattern, or clear - [Working with Design & Motion](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/working-with-design-and-motion/).
5. **Safe area is layout:** `useSafeAreaInsets` - never magic `paddingTop: 44` copied from web mocks.
6. **Keyboard states in design review:** Primary CTA visible with keyboard up on smallest supported phone.
7. **Touch targets ≥48dp:** Enforce in design system components - dense Figma does not override HIG/Material - [Design Systems Basics](https://docs.wahwei/reactnative.codeguides.io/design-systems/design-systems-basics/).
8. **Platform parity is a decision:** Document intentional iOS/Android differences in ADR - [Platform Parity Decisions](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/platform-parity-decisions/).
9. **Native chrome over custom imitation:** System back, share sheet, and pickers unless brand ADR says otherwise.
10. **Gestures flagged before pointing:** Swipe, drag, pull-to-refresh tickets link Gesture Handler feasibility - [Gesture Handler](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/react-native-gesture-handler/).
11. **Motion spec before hi-fi lock:** Trigger, duration, interrupt, reduced-motion fallback - [Animations Basics](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/animations-basics/).
12. **Reanimated for gesture-linked UI:** Scroll-linked headers and swipe rows - not `Animated` with JS-thread scroll - [Reanimated 4](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/react-native-reanimated-4/).
13. **30-minute motion spikes:** GO / SIMPLIFY / DEFER verdict with screen recording on mid-tier Android.
14. **Phased delight is valid:** v1 static transitions + v1.1 motion - label in roadmap, not hidden descope.
15. **Estimates are ranges:** Engineering + discovery + release calendar - [Estimation & Risk on Mobile](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/estimation-and-risk-on-mobile/).
16. **OTA vs store on every ticket:** JS-only OTA path stated; native changes trigger store timeline honesty.
17. **Store review buffer explicit:** +2–5 calendar days on binary releases - never promise users a date at merge.
18. **Native spikes are billable discovery:** 0.5–2 days with written outcome - not hidden padding.
19. **Risk register on epics:** Top three risks reviewed weekly with PM - likelihood, impact, owner.
20. **Debt in the portfolio board:** SDK upgrades and perf beside features with business risk - [Prioritizing Tech Debt vs Features](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/prioritizing-tech-debt-vs-features/).
21. **Crash-free in stakeholder updates:** ≥99.5% target with plain-language impact - [Stakeholder Communication](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/stakeholder-communication/).
22. **Trade-off memos:** Three options, recommendation, decision date - engineering recommends, PM decides.
23. **Yellow flag early:** Estimate bust same-day - revised range beats demo-day surprise.
24. **PR screenshots both platforms:** Unintentional parity drift is a bug; intentional drift is documented.
25. **Tokens over one-off pixels:** Color, spacing, and motion presets in design system - screens compose components, not literals - [Theming & Brand Flavors](https://docs.wahwei/reactnative.codeguides.io/design-systems/theming-and-brand-flavors/).

## FAQs

What is the single highest-leverage habit?

Device demo in refinement - one 10-minute walkthrough prevents more rework than any process doc.

How do we onboard PMs to mobile constraints?

Share this best-practices page + [OTA Updates Basics](https://docs.wahwei/reactnative.codeguides.io/ota-updates/ota-updates-basics/) - OTA vs store is the most common misconception.

Design team resists feasibility sessions?

Frame as protecting craft - fewer emergency simplifications post-sprint. 30 minutes at wireframe saves days of hi-fi rework.

How often to review platform parity ADRs?

When adding gestures, sheets, or OS upgrades (e.g. Android predictive back). Otherwise quarterly audit of screenshot pairs.

Minimum stakeholder update cadence?

Weekly mobile health message - release stage, crash-free, top issue, ask. Incidents get impact-first template same day.

## Related

* [Product Collaboration Basics](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/product-collaboration-basics/) - 10 design-to-mobile examples
* [Platform Parity Decisions](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/platform-parity-decisions/) - ranked iOS/Android choices
* [Estimation & Risk on Mobile](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/estimation-and-risk-on-mobile/) - ranges and store buffer
* [Prioritizing Tech Debt vs Features](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/prioritizing-tech-debt-vs-features/) - debt portfolio framing
* [Stakeholder Communication](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/stakeholder-communication/) - crash and release templates
* [Working with Design & Motion](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/working-with-design-and-motion/) - pre-hi-fi feasibility cookbook
* [Design Systems Best Practices](https://docs.wahwei/reactnative.codeguides.io/design-systems/best-practices/) - token and component hygiene
* [Animations & Gestures Best Practices](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/best-practices/) - motion performance norms

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

383k393a3c3q3e393a3o1r3e3k3x383c3e3k221u223x1v1t1v1z1t20

Reviewed by Chris St. John·Last updated Jul 19, 2026
