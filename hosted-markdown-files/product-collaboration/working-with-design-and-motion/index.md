# Working with Design & Motion

A cookbook for **feasibility reviews before pixels are final** - how Expo SDK 57 engineers and designers align on motion, gestures, and layout constraints without killing craft or missing sprint dates.

Highlights / Working with Design & Motion

* Feasibility review at wireframe saves more time than redesign at hi-fi
* Every motion spec needs: trigger, duration, easing, interrupt rule, and reduced-motion fallback
* Reanimated 4 for gesture-linked frames; Animated API for simple fades - decide before Figma lock
* Prototype on device in 30 minutes beats a week of pixel debate
* Design tokens constrain motion values - spring configs live in the system
* Say 'fallback pattern' in refinement - stakeholders accept phased delight

## Recipe

> Pre-hi-fi feasibility session card - 30 minutes, three attendees.

```markdown
## Motion feasibility - <screen name>
**Attendees:** Designer, engineer, PM (optional)
**Inputs:** Wireframe or lo-fi + interaction notes (not final pixels)
**Devices:** iPhone 16 sim + Pixel 6a or 8 (low-end Android mandatory for motion)
 
### Agenda (30 min)
1. Walk user path - 5 min
2. List interactions - scroll, swipe, shared element, keyboard - 5 min
3. Classify each: Static | Animated API | Reanimated | Native - 10 min
4. Flag spikes + fallbacks - 5 min
5. Write ticket notes + record 20s device clip - 5 min
```

```bash
# Engineer prep - have Reanimated starter running
npx expo install react-native-reanimated react-native-gesture-handler
npx expo start
# Open Performance monitor on Android: shake → Show Perf Monitor
```

**When to reach for this:**

* New onboarding with stepped transitions
* List row actions (swipe, drag-to-reorder)
* Hero / shared-element transitions
* Bottom sheet with nested scroll
* Marketing asks for "like Instagram" interactions

---

## Working Example

### Interaction classification matrix

Fill this in the session - paste into Jira/Linear:

| Interaction | Design intent | RN approach | Risk | Fallback |
| --- | --- | --- | --- | --- |
| Screen enter | Fade + slide up 250ms | `Animated` + `useNativeDriver` | Low | Instant navigate |
| Pull hero shrink | Collapsing header on scroll | Reanimated `useAnimatedScrollHandler` | Med Android FPS | Static header |
| Card → detail | Shared element transition | Reanimated shared transition | Med - router config | Cross-fade |
| Swipe row delete | iOS Mail pattern | Gesture Handler + Reanimated | High scroll conflict | Long-press menu |
| Skeleton shimmer | Loading placeholder | Reanimated loop or static gray | Low battery | Static skeleton |

* **Static** = no animation budget; ship first
* Link spikes to [Gesture Conflict Resolution](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/gesture-conflict-resolution/) when Risk = High

### Motion spec template for designers

```markdown
## Motion spec: Checkout success
**Trigger:** Payment API returns 200
**Enter:** Checkmark scale 0→1, spring (damping 15, stiffness 150), 400ms perceived
**Exit:** Auto-advance to receipt at 1200ms or tap Continue
**Interrupt:** Back gesture cancels animation → show receipt immediately
**Reduced motion:** Skip scale; show checkmark static + haptic only
**Haptic:** success notification (iOS); short vibrate (Android)
**Reference:** Not Lottie - vector draw in SVG or icon
```

Engineers map spring values to Reanimated `withSpring` - store presets in design system:

```tsx
// theme/motion.ts
export const motion = {
  springSnappy: { damping: 18, stiffness: 220 },
  springGentle: { damping: 22, stiffness: 120 },
  durationFast: 200,
  durationNormal: 300,
} as const;
```

Align with [Design Systems Basics](https://docs.wahwei/reactnative.codeguides.io/design-systems/design-systems-basics/) - motion tokens beside color tokens.

### 30-minute spike script

```tsx
// spikes/SwipeRowSpike.tsx - throwaway; answers GO / NO-GO
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
 
export function SwipeRowSpike() {
  const translateX = useSharedValue(0);
  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => { translateX.value = e.translationX; })
    .onEnd(() => { translateX.value = withSpring(0); });
 
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
 
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ height: 56, backgroundColor: "#eee" }, style]} />
    </GestureDetector>
  );
}
```

**Done when:**

* Screen recording attached: iOS + Android, FPS visible on Android
* Written verdict: **GO** (estimate range) | **SIMPLIFY** (fallback) | **SPIKE MORE** (time box +2h)
* PM acknowledges fallback in acceptance criteria

### Feasibility red flags (call out early)

| Red flag in Figma | Mobile reality |
| --- | --- |
| Parallax on every scroll screen | GPU + scroll thread contention |
| Blur behind sheets everywhere | `expo-blur` costly on old Android |
| Physics-based multi-card stack | Gesture conflicts + state complexity |
| Hover states | No hover - need pressed/focused |
| Video background autoplay | Battery + data; often needs native player |
| Custom cursor / drag handles | Touch targets and hitSlop differ |

Offer **ranked alternatives** - same pattern as [Product Collaboration Basics](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/product-collaboration-basics/).

### Reduced motion and accessibility

```tsx
import { useReducedMotion } from "react-native-reanimated";
 
export function useMotionPolicy() {
  const reduced = useReducedMotion();
  return {
    shouldAnimate: !reduced,
    enterDuration: reduced ? 0 : 300,
  };
}
```

* Design delivers **reduced-motion frame** alongside default - not engineer afterthought
* `AccessibilityInfo.isReduceMotionEnabled` on older paths if needed
* PM: reduced motion is not edge case - iOS Settings → Motion → Reduce Motion

### Review checklist before hi-fi lock

```markdown
## Hi-fi lock gate
- [ ] Safe areas on smallest phone frame
- [ ] Keyboard states documented
- [ ] Motion spec per non-static transition
- [ ] Reduced-motion variant approved
- [ ] Loading / empty / error frames exist
- [ ] Tokens used - no orphan hex values ([Design Systems](../design-systems/design-systems-basics.md))
- [ ] Engineer comment: no unresolved HIGH risk without spike ticket
- [ ] 20s device clip or preview QR attached
```

PM does not accept hi-fi lock without checklist - prevents "surprise" estimates.

### Collaborating with design system team

| Request | DS response |
| --- | --- |
| New button bounce | Add `motionPreset` to `PrimaryButton` |
| One-off marketing animation | Isolate in `campaign/` folder - not core DS |
| Shared element between catalog and detail | Document router config in DS motion ADR |

Prevents N custom animations in feature folders - see [Building an Internal Component Library](https://docs.wahwei/reactnative.codeguides.io/design-systems/building-an-internal-component-library/).

---

## Deep Dive

### When to insist on Reanimated 4

| Signal | Tool |
| --- | --- |
| Animation tied to scroll position | Reanimated |
| Gesture drives animation frame-by-frame | Reanimated + Gesture Handler |
| Simple opacity on mount | `Animated` |
| Layout enter/exit for list items | Reanimated Layout Animations |
| Keyboard height interpolation | Reanimated or `KeyboardAvoidingView` |

Full comparison: [Animations Basics](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/animations-basics/) and [Reanimated 4](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/react-native-reanimated-4/).

### Phased delivery language

```markdown
## Phased motion plan
**v1 (sprint N):** Static transitions, correct layout, haptics on success
**v1.1 (sprint N+1):** Swipe actions if spike GO
**v2:** Shared element - depends on Router upgrade
```

Stakeholders accept **phased delight** when labeled product strategy - not "cut scope" shame.

### Anti-patterns

| Anti-pattern | Fix |
| --- | --- |
| Motion review after hi-fi sign-off | Wireframe feasibility session |
| "Match iOS exactly on Android" | Platform parity doc per interaction |
| Lottie for simple fades | Vector + Reanimated - smaller bundle |
| No FPS check on Pixel A-series | Mandatory low-end Android in matrix |
| Designer-only prototype in Principle | RN spike - physics differ |

---

## FAQs

Who owns the motion spec - design or engineering?

Design owns intent (timing, feel, interrupt); engineering owns implementation map and fallbacks. Joint sign-off on feasibility doc.

How long should spikes take?

30 minutes to 0.5 day for motion/gesture questions. Stop with GO/NO-GO written verdict - no infinite polish on throwaway code.

Can we use Lottie for everything?

Lottie fits illustrated loaders and brand moments. Interaction-heavy UI (drags, scroll-linked) needs Reanimated - Lottie is not a gesture engine.

What if design insists on non-performant animation?

Show FPS recording on Pixel 6a. Trade-off memo: ship animation vs ship feature on time vs simplify. PM decides with data.

Do we need motion in the design system?

Yes for repeated patterns (button press, sheet enter, list skeleton). Campaign one-offs stay outside core tokens.

## Related

* [Product Collaboration Basics](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/product-collaboration-basics/) - design handoff fundamentals
* [Platform Parity Decisions](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/platform-parity-decisions/) - intentional iOS/Android motion differences
* [Estimation & Risk on Mobile](https://docs.wahwei/reactnative.codeguides.io/product-collaboration/estimation-and-risk-on-mobile/) - motion buffer and spikes
* [Animations Basics](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/animations-basics/) - Animated vs Reanimated
* [Reanimated 4](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/react-native-reanimated-4/) - UI-thread animations
* [Gesture Handler](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/react-native-gesture-handler/) - pan and scroll
* [Layout Animations](https://docs.wahwei/reactnative.codeguides.io/animations-gestures/layout-animations/) - list enter/exit
* [Design Systems Basics](https://docs.wahwei/reactnative.codeguides.io/design-systems/design-systems-basics/) - motion tokens with color/spacing

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
