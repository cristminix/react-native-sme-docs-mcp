# Code Review Standards for RN

Performance, accessibility, and **native-boundary** review checklist for Expo SDK 57 PRs. Standardize what reviewers verify so quality scales without the tech lead on every diff.

Highlights / Code Review Standards for RN

* Mobile review is device evidence + boundary checks - not style-only LGTM
* Perf: list virtualization, stable renderItem, root layout import weight
* A11y: label, role, state, font scaling - VoiceOver/TalkBack spot check
* Native boundary: expo install, config plugins, OTA vs build classification
* Router: thin routes, params typed, no business logic in app/
* Block merge on missing rollback notes for release and native PRs

## Recipe

> Quick-reference PR review card - paste into `.github/pull_request_template.md`.

```markdown
## Mobile review checklist
 
### Evidence (UI / gesture / a11y changes)
- [ ] iOS screenshot or recording attached
- [ ] Android screenshot or recording attached
- [ ] VoiceOver OR TalkBack spot-check noted (which flow)
 
### Performance
- [ ] Lists use FlashList/FlatList - not ScrollView for long feeds
- [ ] `renderItem` / `keyExtractor` stable (useCallback or module scope)
- [ ] No new heavy imports in `app/_layout.tsx` without lazy route
 
### Accessibility
- [ ] `accessibilityLabel` on icon-only controls
- [ ] `accessibilityRole` matches behavior (button vs link)
- [ ] Dynamic type: layout survives large font (or `maxFontSizeMultiplier` justified)
 
### Native boundary
- [ ] New deps added via `npx expo install <pkg>`
- [ ] `app.config.ts` / config plugin changes called out in description
- [ ] Classified: JS-only (OTA OK) vs requires `eas build`
- [ ] `npx expo-doctor` green (CI link)
 
### Architecture
- [ ] Route file thin - logic in `features/`
- [ ] No deep imports across feature boundaries
- [ ] Server state in TanStack Query - not duplicated in Zustand
 
### Release (if touching eas.json, runtimeVersion, channels)
- [ ] Rollback steps in ticket / PR comment
- [ ] runtimeVersion bump justified
```

**When to reach for this:**

* Review quality varies wildly across reviewers.
* Perf regressions merge because "it looked fine on iPhone 16 Pro."
* Juniors add native packages without config plugin awareness.
* You are formalizing [Pairing & Mob on Mobile](https://docs.wahwei/reactnative.codeguides.io/team/pairing-and-mob-on-mobile/) norms into CI-enforceable habits.

## Working Example

### Performance review - feed PR

```tsx
// ❌ Reviewer blocks - ScrollView map of 200 orders
export function OrdersScreenBad() {
  const { data } = useOrders();
  return (
    <ScrollView>
      {data?.map((o) => <OrderRow key={o.id} order={o} />)}
    </ScrollView>
  );
}
```

```tsx
// ✅ Approve path - virtualized list + stable renderItem
import { FlashList } from "@shopify/flash-list";
import { useCallback } from "react";
 
export function OrdersScreen() {
  const { data } = useOrders();
  const renderItem = useCallback(
    ({ item }: { item: Order }) => <OrderRow order={item} />,
    []
  );
 
  return (
    <FlashList
      data={data ?? []}
      renderItem={renderItem}
      keyExtractor={(o) => o.id}
      estimatedItemSize={72}
    />
  );
}
```

**Reviewer questions:**

* Did Profiler run on **mid-tier Android** reference device?
* Does parent re-create `renderItem` every render (inline arrow)?
* Any new context provider above the list?

See [Performance Best Practices](https://docs.wahwei/reactnative.codeguides.io/performance/best-practices/) and [Memory Leaks & List Churn](https://docs.wahwei/reactnative.codeguides.io/performance/memory-leaks-and-list-churn/).

### Accessibility review - custom pressable

```tsx
// ❌ Block - icon-only, no name, wrong role
<Pressable onPress={onSave}>
  <Icon name="check" />
</Pressable>
```

```tsx
// ✅ Approve - name, role, state
<Pressable
  onPress={onSave}
  accessibilityRole="button"
  accessibilityLabel="Save changes"
  accessibilityState={{ disabled: !dirty, busy: saving }}
>
  <Icon name="check" accessible={false} />
</Pressable>
```

**Reviewer spot-check (30 seconds):**

* Enable VoiceOver on iOS sim (⌘F5) - focus order logical?
* TalkBack on Android emu - double-tap activates?

See [accessibilityLabel & accessibilityRole](https://docs.wahwei/reactnative.codeguides.io/accessibility/accessibilitylabel-and-accessibilityrole/).

### Native-boundary review - new camera dependency

```diff
// package.json - reviewer verifies expo install, not raw npm major
+ "expo-camera": "~17.0.10"
```

```ts
// app.config.ts - plugin stanza present
plugins: [
  [
    "expo-camera",
    {
      cameraPermission: "Allow $(PRODUCT_NAME) to scan warehouse barcodes.",
    },
  ],
],
```

**Reviewer checklist:**

| Question | Pass criteria |
| --- | --- |
| OTA safe? | **No** - native module; PR labels `requires-build` |
| Permission strings human-readable? | Yes - store review reads these |
| Expo Go test claimed? | Flag misleading - needs dev client |
| ADR or ticket links native choice? | [Architecture Decision Records](https://docs.wahwei/reactnative.codeguides.io/tech-leadership/architecture-decision-records/) |

### Architecture review - route thickness

```tsx
// ❌ Block - fetch + branching in app/ route
// app/(tabs)/orders.tsx
export default function OrdersRoute() {
  const [filter, setFilter] = useState("open");
  const { data } = useQuery({ queryKey: ["orders", filter], queryFn: () => fetchOrders(filter) });
  return <FlatList data={data} ... />;
}
```

```tsx
// ✅ Approve - thin route
// app/(tabs)/orders.tsx
export { OrdersScreen as default } from "@/features/orders/screens/OrdersScreen";
```

Aligns with [Mobile Architecture Basics](https://docs.wahwei/reactnative.codeguides.io/architecture-design/mobile-architecture-basics/) and [Feature-Sliced Design for RN](https://docs.wahwei/reactnative.codeguides.io/architecture-design/feature-sliced-design-for-rn/).

### Review severity rubric

| Severity | Examples | Action |
| --- | --- | --- |
| **Block** | Missing permission plugin; ScrollView feed; secret in `EXPO_PUBLIC_*` | Must fix before merge |
| **Request changes** | Unstable list props; missing a11y label; deep feature import | Fix or ticket + follow-up |
| **Comment** | Naming, optional refactor, docs | Author discretion |
| **Praise** | Tests, rollback notes, device matrix evidence | Reinforce behavior |

## Gotchas

* **Sim-only iOS Pro Max** - Layout and perf lie. **Fix:** Require Android emu evidence for UI PRs.
* **"LGTM" on `package.json` only PR** - Native drift without plugin. **Fix:** Native-boundary section mandatory when lockfile changes include `expo-*` native packages.
* **Reviewing Expo Go screenshot for reanimated worklet bug** - Dev client differs. **Fix:** Preview build link in PR.
* **Approving Zustand cache of API list** - Duplicate source of truth. **Fix:** Point to [ADR: State Management Selection](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-state-management-selection/).
* **Skipping rollback on `eas.json` channel change** - Wrong users get update. **Fix:** Release subsection required.

## Alternatives

| Approach | Use When | Don't Use When |
| --- | --- | --- |
| PR template checklist | Default - low friction | Fully automated visual diff only teams |
| Danger / custom bot | Enforce screenshot labels | Small team - maintenance cost |
| Pair review only | Complex native migration | Daily feature throughput |
| CODEOWNERS on `app.config.ts` | Multi-squad monorepo | Solo maintainer overhead |

## FAQs

Should reviewers run the branch locally?

For **native config** and **gesture** PRs - yes. For copy-only TSX, device evidence in PR is enough if CI is green.

How long should mobile review take?

Target **same business day** for PRs under 400 lines. If longer, author should split or schedule review pairing.

Do we need both VoiceOver and TalkBack every PR?

Alternate per PR is fine; **both platforms** must be covered across the sprint - not all iOS.

What about auto-generated files?

Skip reviewing `.expo/types` line-by-line; **do** verify `tsc` passes and route params match usage.

Junior reviewer vs senior - same checklist?

Same checklist; seniors escalate architecture and native-boundary items. Juniors focus on a11y and list patterns first - [Junior → Mid RN Leveling](https://docs.wahwei/reactnative.codeguides.io/team/junior-mid-rn-leveling/).

## Related

* [Performance Best Practices](https://docs.wahwei/reactnative.codeguides.io/performance/best-practices/) - TTI, lists, bundle budgets
* [accessibilityLabel & accessibilityRole](https://docs.wahwei/reactnative.codeguides.io/accessibility/accessibilitylabel-and-accessibilityrole/) - semantics cookbook
* [Native Modules Basics](https://docs.wahwei/reactnative.codeguides.io/native-modules/native-modules-basics/) - native boundary primer
* [Mobile Architecture Basics](https://docs.wahwei/reactnative.codeguides.io/architecture-design/mobile-architecture-basics/) - thin routes and feature APIs
* [Pairing & Mob on Mobile](https://docs.wahwei/reactnative.codeguides.io/team/pairing-and-mob-on-mobile/) - review evidence norms
* [Tech Lead Basics on Mobile](https://docs.wahwei/reactnative.codeguides.io/tech-leadership/tech-lead-basics-on-mobile/) - velocity vs risk
* [CI Quality Gates](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/ci-quality-gates/) - automated PR gates

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
