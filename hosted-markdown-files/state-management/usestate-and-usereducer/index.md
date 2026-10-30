# useState & useReducer

When component state is enough on mobile screens. Reach for **`useReducer`** when multiple fields update together - checkout steps, onboarding wizards, and validation-heavy forms. Keep API responses in TanStack Query; reducers own **client UI transitions** only.

Highlights / useState & useReducer

* useState fits toggles, counters, and single-screen selections
* useReducer groups related transitions - forms, wizards, and step machines
* Dispatch is stable in React 19 - safe to omit from effect deps
* Keep server data in TanStack Query - not in reducer initial state from fetch
* Colocate reducers beside the screen that owns the workflow
* useActionState is web-centric; mobile forms still use Hook Form or useReducer

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
// useState - ephemeral UI on one screen
const [expanded, setExpanded] = useState(false);
```

```tsx
// useReducer - related fields + explicit transitions
type State = { step: 0 | 1 | 2; email: string; error?: string };
type Action =
  | { type: "set_email"; email: string }
  | { type: "next" }
  | { type: "back" }
  | { type: "set_error"; error: string };
 
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "set_email":
      return { ...state, email: action.email, error: undefined };
    case "next":
      return state.step < 2 ? { ...state, step: (state.step + 1) as State["step"] } : state;
    case "back":
      return state.step > 0 ? { ...state, step: (state.step - 1) as State["step"] } : state;
    case "set_error":
      return { ...state, error: action.error };
    default:
      return state;
  }
}
 
const [state, dispatch] = useReducer(reducer, { step: 0, email: "" });
```

**When to reach for this:**

* State affects **one screen** (or one feature subtree) and unmounts with it.
* Several `useState` calls update in **lockstep** - one reducer replaces five `setX` calls.
* You need **predictable transitions** (wizard back/next) without a global store.
* Form has **few fields** (login) - reducer is enough; large forms use React Hook Form.
* You are **not** caching API lists - that belongs in Query.

## Working Example

```tsx
// OnboardingWizard.tsx - useReducer for steps; useState for a simple toggle
import { useReducer, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
 
type WizardState = {
  step: 1 | 2 | 3;
  name: string;
  notifications: boolean;
  error?: string;
};
 
type WizardAction =
  | { type: "set_name"; name: string }
  | { type: "toggle_notifications" }
  | { type: "next" }
  | { type: "back" }
  | { type: "submit_error"; error: string }
  | { type: "reset" };
 
const initial: WizardState = { step: 1, name: "", notifications: true };
 
function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "set_name":
      return { ...state, name: action.name, error: undefined };
    case "toggle_notifications":
      return { ...state, notifications: !state.notifications };
    case "next": {
      if (state.step === 1 && state.name.trim().length < 2) {
        return { ...state, error: "Name must be at least 2 characters" };
      }
      return state.step < 3 ? { ...state, step: (state.step + 1) as WizardState["step"], error: undefined } : state;
    }
    case "back":
      return state.step > 1 ? { ...state, step: (state.step - 1) as WizardState["step"], error: undefined } : state;
    case "submit_error":
      return { ...state, error: action.error };
    case "reset":
      return initial;
    default:
      return state;
  }
}
 
export function OnboardingWizard({ onComplete }: { onComplete: (payload: WizardState) => void }) {
  const [state, dispatch] = useReducer(wizardReducer, initial);
  const [submitting, setSubmitting] = useState(false);
 
  async function handleFinish() {
    setSubmitting(true);
    try {
      // await saveProfile(state) - mutation via Query in production apps
      onComplete(state);
      dispatch({ type: "reset" });
    } catch {
      dispatch({ type: "submit_error", error: "Could not save - try again" });
    } finally {
      setSubmitting(false);
    }
  }
 
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Step {state.step} of 3</Text>
      {state.error && <Text style={styles.error}>{state.error}</Text>}
 
      {state.step === 1 && (
        <TextInput
          placeholder="Your name"
          value={state.name}
          onChangeText={(name) => dispatch({ type: "set_name", name })}
          style={styles.input}
        />
      )}
 
      {state.step === 2 && (
        <Pressable onPress={() => dispatch({ type: "toggle_notifications" })}>
          <Text>Notifications: {state.notifications ? "On" : "Off"}</Text>
        </Pressable>
      )}
 
      {state.step === 3 && <Text>Review: {state.name}</Text>}
 
      <View style={styles.row}>
        {state.step > 1 && (
          <Pressable style={styles.btnSecondary} onPress={() => dispatch({ type: "back" })}>
            <Text>Back</Text>
          </Pressable>
        )}
        {state.step < 3 ? (
          <Pressable style={styles.btn} onPress={() => dispatch({ type: "next" })}>
            <Text style={styles.btnLabel}>Next</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.btn} onPress={handleFinish} disabled={submitting}>
            <Text style={styles.btnLabel}>{submitting ? "Saving…" : "Finish"}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: "700" },
  error: { color: "#dc2626" },
  input: { borderWidth: 1, borderColor: "#cbd5e1", padding: 12, borderRadius: 8 },
  row: { flexDirection: "row", gap: 8, marginTop: 8 },
  btn: { backgroundColor: "#2563eb", padding: 14, borderRadius: 8, flex: 1 },
  btnSecondary: { padding: 14, borderRadius: 8, borderWidth: 1, borderColor: "#94a3b8" },
  btnLabel: { color: "#fff", fontWeight: "600", textAlign: "center" },
});
```

**What this demonstrates:**

* **`useReducer`** owns step, name, notifications, and validation error - one transition function.
* **`useState(submitting)`** stays separate - async pending is orthogonal to wizard data.
* **Validation runs in the reducer** on `next` - impossible states (step 4) never exist.
* **`reset`** returns a known initial object - testable and idempotent.
* **Network submit** stays outside the reducer - dispatch only records success/failure UI.

## Deep Dive

### When useState Is Enough

| Pattern | Example | Why useState |
| --- | --- | --- |
| Boolean UI | Modal open, accordion | One value, one setter |
| Single selection | Highlighted list row | Parent holds `selectedId` |
| Counter | Quantity stepper | `setQty((q) => q + 1)` is clear |
| Text filter (local) | Search box before debounced Query | Ephemeral until submit |

### When useReducer Wins

| Pattern | Example | Why reducer |
| --- | --- | --- |
| Wizard / steps | Onboarding, KYC | `next`/`back` encode rules |
| Form with cross-field rules | Password + confirm | One action updates multiple fields |
| State machine | Upload: idle → uploading → done | Finite transitions |
| Undo batch | Draft editor | Single `RESET` action |

### Dispatch Stability (React 19)

`dispatch` from `useReducer` is **stable** for the component lifetime - omit it from `useEffect` dependency arrays. Same for `setState` from `useState`. The [react-hooks lint rules](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/react-hooks-lint-rules/) document this.

### Lazy Initialization

```tsx
const [state, dispatch] = useReducer(reducer, props.initialStep, (step) => ({
  step,
  email: "",
  notifications: true,
}));
```

Pass a third argument when initial state is expensive to compute - runs once on mount.

### Colocation Rule

Keep `wizardReducer` in the same file as `OnboardingWizard` until a second screen needs identical transitions. Promote to `features/onboarding/wizardReducer.ts` only on reuse - not preemptively.

### Server Data Boundary

```tsx
// ❌ Do not hydrate reducer from fetch in useEffect
useEffect(() => {
  fetchProfile().then((p) => dispatch({ type: "load_profile", profile: p }));
}, []);
 
// ✅ Query owns profile; reducer owns edit draft
const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
const [draft, dispatch] = useReducer(editReducer, profile ?? emptyDraft);
```

Sync draft from Query with a keyed remount or explicit `reset` when `profile.id` changes - not on every render.

## Gotchas

* **Many unrelated `useState` calls** - Five booleans for one form means missed updates. **Fix:** One `useReducer` or React Hook Form.
* **Mutating state inside reducer** - `state.items.push(x)` breaks React. **Fix:** Return new objects: `{ ...state, items: [...state.items, x] }`.
* **Reducer side effects** - Fetching inside `switch` makes testing hard. **Fix:** Side effects in event handlers; reducer stays pure.
* **Storing API lists in reducer** - Duplicates TanStack Query cache. **Fix:** Query for server data; reducer for UI-only draft.
* **Lifting reducer too high** - Wizard state in root Context re-renders the app. **Fix:** Keep reducer on the wizard screen until another route truly needs it.
* **Missing `default` case** - TypeScript exhaustiveness helps; runtime unknown actions should return `state`.
* **Functional updates with reducer** - Reducers already receive previous state - do not nest `setState` patterns inside.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `useState` | 1–2 independent values | Many coupled fields |
| `useReducer` | Wizards, small forms, state machines | Global cart across tabs |
| React Hook Form | Large forms, validation schemas | Single email field |
| Zustand | Global client state with selectors | Ephemeral modal on one screen |
| XState | Complex audited workflows | Simple three-step onboarding |

## FAQs

useState or useReducer for a login form?

Two fields (email, password) - `useState` is fine. If you add remember-me, MFA step, and inline validation, switch to `useReducer` or Hook Form.

Can I use useReducer with Context?

Yes - `useReducer` in a provider is the built-in global pattern. Split contexts or Zustand when consumers re-render too often - see [Context Without Storms](https://docs.wahwei/reactnative.codeguides.io/state-management/context-without-storms/).

Does useReducer replace Redux?

Only for **local** or **small shared** UI state. Redux Toolkit still wins for audited multi-feature domains and DevTools at scale - see [Redux Toolkit](https://docs.wahwei/reactnative.codeguides.io/state-management/redux-toolkit/).

How do I test a reducer?

Export `wizardReducer` and unit-test actions without rendering:

```tsx
expect(wizardReducer(initial, { type: "next" })).toEqual({ ...initial, error: "Name must be at least 2 characters" });
```

Should submitting be in the reducer?

Keep **`submitting`** as `useState` or derive from `useMutation` `isPending`. Async status is a side effect, not a pure transition.

What about React 19 useActionState?

`useActionState` targets Server Actions on web. Expo mobile apps use `useReducer` + TanStack Query `useMutation` for networked submits.

How many useState hooks is too many?

Rule of thumb: more than **four related values** on one screen → consider one reducer or a custom hook wrapping state.

Can I use immer with useReducer?

Yes via `useImmerReducer` from `use-immer`. Zustand + immer middleware is more common for global stores - see [Zustand](https://docs.wahwei/reactnative.codeguides.io/state-management/zustand/).

How do wizards interact with Expo Router?

Keep step index in reducer state for animated transitions. For shareable progress, mirror step in `router.setParams({ step: "2" })` - URL is optional UX, reducer is source of truth during the session.

Why not put everything in one big useState object?

`setState({ ...s, email })` works until two updates batch incorrectly or you forget a field. Reducers force explicit action names - easier to log and test.

How does this relate to container/presenter?

Container holds `useReducer` / `useState`; presenter receives props and callbacks only - see [container-presenter on mobile](https://docs.wahwei/reactnative.codeguides.io/component-patterns/container-presenter-on-mobile/).

Performance on long lists?

Reducer state in a parent of a 500-row `FlatList` re-renders all rows. Move list data to Query; keep selection in reducer with `extraData` or row-level memoization.

## Related

* [State Management Basics](https://docs.wahwei/reactnative.codeguides.io/state-management/state-management-basics/) - local vs global vs server classification
* [Context Without Storms](https://docs.wahwei/reactnative.codeguides.io/state-management/context-without-storms/) - when reducer moves to Context
* [TanStack Query](https://docs.wahwei/reactnative.codeguides.io/state-management/tanstack-query/) - server mutations on wizard submit
* [Zustand](https://docs.wahwei/reactnative.codeguides.io/state-management/zustand/) - when wizard state must survive unmount
* [../component-patterns/anti-patterns-god-screens/anti-patterns-god-screens.md](https://docs.wahwei/reactnative.codeguides.io/component-patterns/anti-patterns-god-screens/) - too many useState calls on one screen
* [../architecture-design/adr-state-management-selection/adr-state-management-selection.md](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-state-management-selection/) - form state decision

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
