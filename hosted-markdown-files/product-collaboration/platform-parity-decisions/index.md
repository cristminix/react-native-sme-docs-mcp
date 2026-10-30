# Platform Parity Decisions

Ranked decision guide for when **iOS and Android intentionally differ** in Expo SDK 57 apps - choose the best approach per scenario, document the call, and avoid silent drift that confuses users and QA.

Highlights / Platform Parity Decisions

* Platform parity is a product choice - not an accident of whichever dev finished first
* Follow HIG and Material where users expect native chrome - document exceptions in ADR
* Shared design tokens with platform-specific navigation patterns is the default stack
* Intentional divergence needs a ticket, screenshot pair, and PM sign-off - not silent drift
* Android predictive back and iOS edge swipe change custom gesture specs
* Store review and OS policy sometimes force platform-specific flows - record the constraint

## How to Use This List

* Default assumption: **shared business logic**, **platform-native chrome** where OS conventions differ (back, sheets, permissions).
* Each decision ranks options - pick **Best** unless compliance, timeline, or brand mandates override.
* Record chosen rank, date, and dissent in a short ADR or ticket comment - link iOS + Android screenshots.
* Revisit when adding **gesture-heavy** flows, **Material You** theming, or **Android 15 predictive back**.

---

## Decision 1: Back navigation on nested stacks

**Scenario:** Multi-step checkout inside a stack; users expect to go back without losing cart state.

| Rank | Choice | Approach |
| --- | --- | --- |
| Best | **Platform-native back** | iOS swipe-from-edge + header back; Android hardware/gesture back via Expo Router stack |
| 2nd | **Custom header back with shared logic** | One `onBack` handler; platform icons from design system |
| 3rd | **Floating universal back button** | Bottom-left FAB - acceptable only in games or immersive media |

**Wrong choice:** Disabling Android system back to force a centered "Back" text button - users churn when gesture back exits the app unexpectedly.

**Why best is best:** Users muscle-memory OS navigation. Router `router.back()` wired to both header and Android `BackHandler` preserves state without fighting the platform.

---

## Decision 2: Primary action placement in forms

**Scenario:** Long signup form; primary CTA must be obvious on both platforms.

| Rank | Choice | Approach |
| --- | --- | --- |
| Best | **Sticky footer CTA (shared)** | Full-width button above safe area; keyboard avoidance tested both OS |
| 2nd | **iOS top-right text action + Android FAB** | Documented divergence for power-user apps |
| 3rd | **Inline submit after last field only** | Acceptable for 2-field flows |

**Wrong choice:** iOS-only top-right "Done" with no Android equivalent hidden in overflow menu - Android users never find submit.

**Why best is best:** Sticky footer survives keyboard and dynamic type; one layout QA matrix. Platform-specific placement doubles design and test cost for marginal UX gain.

---

## Decision 3: Date and time selection

**Scenario:** Schedule appointment; pick date + time with validation.

| Rank | Choice | Approach |
| --- | --- | --- |
| Best | **Platform pickers** | `@react-native-community/datetimepicker` - spinner on iOS, calendar/dialog on Android |
| 2nd | **Unified bottom sheet custom picker** | Brand-critical scheduling apps with motion budget |
| 3rd | **Web-style inline calendar always visible** | Only on tablet layouts |

**Wrong choice:** Forcing iOS wheel picker styling on Android - feels foreign and fails TalkBack/VoiceOver expectations.

**Why best is best:** Native pickers ship fast, respect locale, and pass store accessibility scrutiny. Custom pickers need spikes - [Working with Design & Motion](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/working-with-design-and-motion/).

---

## Decision 4: Share sheet and social actions

**Scenario:** User shares referral link or exports PDF from a detail screen.

| Rank | Choice | Approach |
| --- | --- | --- |
| Best | **`expo-sharing` + system share sheet** | OS-native targets (Messages, Drive, etc.) |
| 2nd | **Custom in-app share targets** | When analytics require channel tracking per tap |
| 3rd | **Copy link only** | MVP acceptable; expand before growth campaigns |

**Wrong choice:** Rebuilding the entire OS share sheet in RN - maintenance nightmare; never matches installed apps.

**Why best is best:** System sheets update with OS - new targets appear without app releases. Custom UI is product differentiation, not default.

---

## Decision 5: Tab bar vs navigation drawer

**Scenario:** App has 4–5 top-level destinations; PM wants "same as web sidebar."

| Rank | Choice | Approach |
| --- | --- | --- |
| Best | **Bottom tabs (phone)** | Expo Router `(tabs)` - thumb-reachable; Material/iOS tab bar conventions |
| 2nd | **Drawer on Android + tabs on iOS** | Document divergence; rare unless enterprise admin apps |
| 3rd | **Hamburger-only navigation** | Acceptable for 6+ destinations with clear IA |

**Wrong choice:** Permanent left sidebar on phone portrait - wastes horizontal space; fights one-handed use.

**Why best is best:** Mobile IA centers bottom tabs; tablet can use split view later. Web sidebar mental model does not transfer to 390px width.

---

## Decision 6: Modal presentation style

**Scenario:** Confirm destructive delete; need user attention without losing context.

| Rank | Choice | Approach |
| --- | --- | --- |
| Best | **Platform alert / action sheet** | `Alert.alert` simple; `@expo/react-native-action-sheet` for 3+ actions |
| 2nd | **Bottom sheet (shared)** | `@gorhom/bottom-sheet` - matches modern iOS sheet + Android bottom dialog |
| 3rd | **Centered web-style modal** | Desktop tablet only |

**Wrong choice:** Full-screen blocking modal with no dismiss gesture on Android - violates Material back expectations.

**Why best is best:** Destructive confirms map cleanly to platform dialogs. Sheets scale to rich content; centered modals feel web-imported on phones.

---

## Decision 7: Pull-to-refresh indicator

**Scenario:** Feed list refresh; brand has custom loading animation.

| Rank | Choice | Approach |
| --- | --- | --- |
| Best | **Platform refresh control** | `RefreshControl` with brand tint color token |
| 2nd | **Custom Lottie header** | Marketing-heavy apps; budget Reanimated + scroll sync |
| 3rd | **Manual refresh button only** | Offline-first lists where pull gesture conflicts with row swipe |

**Wrong choice:** Disabling pull-to-refresh on iOS only because custom animation was Android-only - users report "broken" on App Store reviews.

**Why best is best:** `RefreshControl` is one prop; tint aligns brand without custom scroll physics. Custom refresh needs [Gesture Conflict Resolution](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/gesture-conflict-resolution/).

---

## Decision 8: Typography and default fonts

**Scenario:** Brand uses custom font; body text must feel native.

| Rank | Choice | Approach |
| --- | --- | --- |
| Best | **Custom brand font + system fallback stack** | `expo-font` load; SF Pro / Roboto fallback for CJK and missing glyphs |
| 2nd | **Platform system font for body, brand for display** | Reduces bundle; slightly different cross-platform rhythm |
| 3rd | **Identical web font files both platforms** | Acceptable when marketing mandates pixel parity |

**Wrong choice:** Assuming Google Fonts web files render identically on iOS without testing diacritics and tabular nums.

**Why best is best:** Mobile readability and bundle size matter. Tokenized typography from [Design Systems Basics](https://docs.wahwei/reactnative.codeguides.io/design-systems/design-systems-basics/) documents which roles use brand vs system.

---

## Decision 9: Permissions prompts and pre-prompts

**Scenario:** Camera access for profile photo; store requires clear purpose strings.

| Rank | Choice | Approach |
| --- | --- | --- |
| Best | **In-app education screen → system prompt** | Same copy both platforms; `Info.plist` + `AndroidManifest` strings localized |
| 2nd | **iOS pre-prompt only (Android goes straight to system)** | Acceptable - Android has no official pre-prompt pattern |
| 3rd | **Custom fake "permission" UI that isn't system dialog** | Misleading; store rejection risk |

**Wrong choice:** Different permission rationale text per platform without legal review - compliance failure on enterprise contracts.

**Why best is best:** One education flow; native dialog is still OS-controlled. Document Android "don't ask again" path in support macros.

---

## Decision 10: Haptics on success and error

**Scenario:** Payment success, form error, toggle favorite - design spec includes haptic feedback.

| Rank | Choice | Approach |
| --- | --- | --- |
| Best | **iOS `expo-haptics` + Android short vibration fallback** | Map semantic events: success → notification success; error → error pattern |
| 2nd | **iOS haptics only; Android silent** | Documented divergence for low-priority delight |
| 3rd | **Identical long vibration both platforms** | Feels aggressive on iPhone; avoid |

**Wrong choice:** Calling haptics on every list scroll tick - battery drain and App Store "excessive feedback" complaints.

**Why best is best:** Semantic mapping preserves intent without pretending hardware is identical. Android vibration amplitude varies by OEM - keep patterns short.

---

## Decision 11: Dark mode and dynamic color

**Scenario:** App supports dark mode; Android Material You pulls wallpaper colors.

| Rank | Choice | Approach |
| --- | --- | --- |
| Best | **Shared semantic tokens + platform theme provider** | `useColorScheme` + [Theming & Brand Flavors](https://docs.wahwei/reactnative.codeguides.io/design-systems/theming-and-brand-flavors/) |
| 2nd | **Identical hex palette both modes** | No dynamic color on Android 12+ |
| 3rd | **Light mode only** | Acceptable short-term; document debt |

**Wrong choice:** Hard-coded `#FFFFFF` backgrounds - Android dark mode and iOS smart invert break layouts.

**Why best is best:** Semantic `surface`, `textPrimary` tokens absorb platform theme without redrawing every screen in Figma.

---

## Decision 12: Push notification permission timing

**Scenario:** Marketing wants push opt-in at first launch; engineering prefers contextual prompt.

| Rank | Choice | Approach |
| --- | --- | --- |
| Best | **Contextual prompt after first value moment** | e.g. after first order - higher opt-in, same API both platforms |
| 2nd | **iOS provisional / Android notification channels** | Platform-specific APIs with shared product timing doc |
| 3rd | **Launch-day modal** | Only if compliance mandates; expect lower opt-in |

**Wrong choice:** iOS system prompt on cold start before login - Apple Human Interface Guidelines discourage; users tap Don't Allow permanently.

**Why best is best:** Timing is product policy; implementation uses `expo-notifications` once. Divergence is **when**, not **whether**, to ask.

---

## FAQs

Must iOS and Android look identical?

No - they must feel **coherent**. Shared IA, tokens, and copy; native navigation and system components can differ. Document intentional deltas in ADRs.

Who signs off on platform divergence?

PM + design lead + engineering lead. QA receives a **parity matrix** listing screens that differ - not a single golden screenshot.

How do we prevent accidental drift?

PR template requires iOS + Android screenshots for UI changes. CI preview builds on both platforms. Unintentional drift is a bug; intentional is documented.

What about tablet and foldable layouts?

Treat as separate decisions - phone parity first. Foldables may follow Android Material adaptive guidelines while iPad uses split navigation.

Does Expo Router force parity?

Router file structure is shared; presentation options (`presentation: "modal"`) can diverge per platform with `Platform.select` - still document the choice.

## Related

* [Product Collaboration Basics](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/product-collaboration-basics/) - design-to-mobile translation
* [Working with Design & Motion](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/working-with-design-and-motion/) - motion feasibility per platform
* [Design Systems Basics](https://docs.wahwei/reactnative.codeguides.io/design-systems/design-systems-basics/) - shared tokens, platform chrome
* [Gesture Handler](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/react-native-gesture-handler/) - back gesture and pan conflicts
* [Theming & Brand Flavors](https://docs.wahwei/reactnative.codeguides.io/design-systems/theming-and-brand-flavors/) - dark mode tokens
* [Expo Router Basics](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/) - stack and tab patterns

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
