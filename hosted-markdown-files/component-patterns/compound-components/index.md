# Compound Components

Compound components let callers assemble flexible UIs - tabs, cards, form field groups - from named parts that share implicit state. The parent owns `activeIndex` or `isExpanded`; children like `Tabs.List` and `Tabs.Panel` read it through context instead of prop drilling through every slot.

Highlights / Compound Components

* Parent owns state; children declare structure - consumers compose the UI they need
* React Context shares implicit state without long prop lists
* Tabs, accordions, and form fields are the classic mobile compound wins
* Static properties (Tabs.List, Tabs.Panel) document the API in TypeScript
* Throw in development when a sub-component is used outside its provider
* Prefer layout primitives (View, Pressable) inside parts - not opinionated styling

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import { createContext, useContext, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
 
interface TabsContextValue {
  activeIndex: number;
  setActiveIndex: (index: number) => void;
}
 
const TabsContext = createContext<TabsContextValue | null>(null);
 
function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs.* must be used inside <Tabs>");
  return ctx;
}
 
function Tabs({ defaultIndex = 0, children }: { defaultIndex?: number; children: ReactNode }) {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);
  return (
    <TabsContext.Provider value={{ activeIndex, setActiveIndex }}>
      <View>{children}</View>
    </TabsContext.Provider>
  );
}
 
function TabList({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "row", gap: 8 }}>{children}</View>;
}
 
function Tab({ index, children }: { index: number; children: ReactNode }) {
  const { activeIndex, setActiveIndex } = useTabsContext();
  const active = activeIndex === index;
  return (
    <Pressable onPress={() => setActiveIndex(index)}>
      <Text style={{ fontWeight: active ? "700" : "400" }}>{children}</Text>
    </Pressable>
  );
}
 
function TabPanel({ index, children }: { index: number; children: ReactNode }) {
  const { activeIndex } = useTabsContext();
  if (activeIndex !== index) return null;
  return <View>{children}</View>;
}
 
Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;
 
// Consumer - reorder, omit, or restyle parts freely
export function SettingsScreen() {
  return (
    <Tabs defaultIndex={0}>
      <Tabs.List>
        <Tabs.Tab index={0}>Account</Tabs.Tab>
        <Tabs.Tab index={1}>Privacy</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel index={0}>
        <Text>Account settings</Text>
      </Tabs.Panel>
      <Tabs.Panel index={1}>
        <Text>Privacy settings</Text>
      </Tabs.Panel>
    </Tabs>
  );
}
```

**When to reach for this:**

* Several child pieces need the same parent state (active tab, open section, field error)
* Prop lists like `tabLabels`, `tabContents`, `onTabChange` fight flexible layouts
* Design system primitives should stay unstyled while product teams compose structure
* You want an API that reads like JSX - `<Card.Header>` not `renderHeader()`
* Mobile layouts need to reorder chrome (tabs on bottom on phone, side on tablet) without API changes

## Working Example

```tsx
import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
 
interface AccordionContextValue {
  openId: string | null;
  toggle: (id: string) => void;
}
 
const AccordionContext = createContext<AccordionContextValue | null>(null);
 
function useAccordion() {
  const ctx = useContext(AccordionContext);
  if (!ctx) throw new Error("Accordion.* must be used inside <Accordion>");
  return ctx;
}
 
interface AccordionProps {
  children: ReactNode;
  defaultOpenId?: string | null;
}
 
function Accordion({ children, defaultOpenId = null }: AccordionProps) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId);
 
  const toggle = useCallback((id: string) => {
    setOpenId((current) => (current === id ? null : id));
  }, []);
 
  const value = useMemo(() => ({ openId, toggle }), [openId, toggle]);
 
  return (
    <AccordionContext.Provider value={value}>
      <View style={styles.accordion}>{children}</View>
    </AccordionContext.Provider>
  );
}
 
interface ItemProps {
  title: string;
  children: ReactNode;
}
 
function AccordionItem({ title, children }: ItemProps) {
  const id = useId();
  const { openId, toggle } = useAccordion();
  const open = openId === id;
 
  return (
    <View style={styles.item}>
      <Pressable
        onPress={() => toggle(id)}
        style={styles.trigger}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.triggerText}>{title}</Text>
        <Text style={styles.chevron}>{open ? "▾" : "▸"}</Text>
      </Pressable>
      {open ? <View style={styles.panel}>{children}</View> : null}
    </View>
  );
}
 
interface FieldGroupContextValue {
  error?: string;
}
 
const FieldGroupContext = createContext<FieldGroupContextValue>({});
 
interface FieldGroupProps {
  label: string;
  error?: string;
  children: ReactNode;
}
 
function FieldGroup({ label, error, children }: FieldGroupProps) {
  const value = useMemo(() => ({ error }), [error]);
  return (
    <FieldGroupContext.Provider value={value}>
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{label}</Text>
        {children}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </FieldGroupContext.Provider>
  );
}
 
function FieldInput(props: React.ComponentProps<typeof TextInput>) {
  const { error } = useContext(FieldGroupContext);
  return (
    <TextInput
      {...props}
      style={[styles.input, error && styles.inputError, props.style]}
      placeholderTextColor="#94a3b8"
    />
  );
}
 
FieldGroup.Input = FieldInput;
 
export default function ProfileFormScreen() {
  const [name, setName] = useState("");
  const nameError = name.length > 0 && name.length < 2 ? "Name is too short" : undefined;
 
  return (
    <View style={styles.screen}>
      <Text style={styles.heading}>Profile</Text>
 
      <Accordion defaultOpenId={null}>
        <AccordionItem title="Personal info">
          <FieldGroup label="Display name" error={nameError}>
            <FieldGroup.Input
              value={name}
              onChangeText={setName}
              placeholder="Jane Doe"
              autoCapitalize="words"
            />
          </FieldGroup>
        </AccordionItem>
 
        <AccordionItem title="Notifications">
          <Text style={styles.body}>
            Push and email preferences live here. The accordion keeps the screen
            short on small phones.
          </Text>
        </AccordionItem>
      </Accordion>
    </View>
  );
}
 
Accordion.Item = AccordionItem;
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, backgroundColor: "#f8fafc", gap: 16 },
  heading: { fontSize: 24, fontWeight: "700", color: "#0f172a" },
  accordion: { gap: 8 },
  item: { backgroundColor: "#fff", borderRadius: 12, overflow: "hidden" },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  triggerText: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  chevron: { fontSize: 14, color: "#64748b" },
  panel: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 14, fontWeight: "600", color: "#334155" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#0f172a",
  },
  inputError: { borderColor: "#dc2626" },
  error: { fontSize: 13, color: "#dc2626" },
  body: { fontSize: 15, color: "#475569", lineHeight: 22 },
});
```

**What this demonstrates:**

* `Accordion` owns `openId`; `AccordionItem` generates a stable `useId()` and reads shared toggle logic
* `FieldGroup` + `FieldGroup.Input` share error styling without passing `error` into every input prop
* Static properties (`Accordion.Item`, `FieldGroup.Input`) expose a discoverable namespace API
* Consumers control order and nesting - notification copy can sit beside the name field without API changes
* Context values are memoized to avoid re-rendering every item when unrelated state changes

## Deep Dive

### How It Works

* The **root compound component** holds state (`activeIndex`, `openId`, `variant`) and provides it via `React.createContext`.
* **Sub-components** call `useContext` (wrapped in a custom hook) to read and update shared state.
* Children are composed in JSX - the parent does not map over configuration arrays to render slots.
* Static assignment (`Tabs.List = TabList`) attaches parts to the root export for a single import ergonomics.
* React 19 still reconciles children normally; compound parts are ordinary function components.
* Throwing when context is `null` fails fast in development if a part is used outside its provider.

### Compound API Building Blocks

| Piece | Responsibility | RN note |
| --- | --- | --- |
| Root (`<Tabs>`) | State, provider, optional layout shell | Often a `View` with `gap` - no ScrollView unless needed |
| List / chrome (`Tabs.List`) | Groups triggers | Use `flexDirection: "row"` or column for bottom tabs |
| Trigger (`Tabs.Tab`) | `Pressable` + `accessibilityRole` | Mark `accessibilityState={{ selected: active }}` |
| Panel (`Tabs.Panel`) | Conditional render or `display: "none"` | Unmount hidden panels to save memory on heavy screens |
| Leaf input (`FieldGroup.Input`) | Forwards refs/props to primitive | Spread `TextInput` props; do not hard-code keyboard types |

### Context Value Stability

```tsx
// Unstable - new object every render re-renders all consumers
<TabsContext.Provider value={{ activeIndex, setActiveIndex }}>
 
// Stable - memoize; stabilize setters with useCallback in the root
const value = useMemo(
  () => ({ activeIndex, setActiveIndex }),
  [activeIndex, setActiveIndex]
);
```

* Only descendants that **read** a changed field re-render when context updates.
* Split hot and cold context if needed: `TabsStateContext` + `TabsActionsContext` for large trees.
* For high-frequency updates (animated scrubbers), prefer a hook or ref instead of context.

### TypeScript Notes

```tsx
import type { ReactNode } from "react";
 
// Namespace typing with static parts
type TabsComponent = ((props: TabsProps) => JSX.Element) & {
  List: typeof TabList;
  Tab: typeof Tab;
  Panel: typeof TabPanel;
};
 
const Tabs = RootTabs as TabsComponent;
Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;
 
// Discriminated props on items - invalid combos fail at compile time
type FormFieldProps =
  | { kind: "text"; value: string; onChangeText: (t: string) => void }
  | { kind: "switch"; value: boolean; onValueChange: (v: boolean) => void };
```

* Export context hooks as `useTabsContext` - do not export raw context unless testing.
* Type static parts with intersection types so `Tabs.List` autocompletes in the IDE.
* See [Typing Components & Props](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-components-and-props/) for discriminated unions on variant parts.

## Gotchas

* **Missing provider guard** - Using `Tabs.Tab` outside `<Tabs>` reads `null` context and silently misbehaves. **Fix:** Throw in `useTabsContext()` with a clear error message.
* **Unstable context value** - Inline `value={{ activeIndex, setActiveIndex }}` re-renders every consumer each parent render. **Fix:** `useMemo` the value; wrap setters in `useCallback`.
* **Index-based tabs break on reorder** - Hard-coded `index={2}` shifts when marketing inserts a tab. **Fix:** Key tabs by string id (`"account"`) internally; map to index if needed.
* **Mounting all panels at once** - Heavy charts in hidden tabs still run effects and hurt scroll perf. **Fix:** Return `null` from inactive `TabPanel` or lazy-mount on first activation.
* **God compound** - One mega-`<Form>` with 20 sub-parts becomes harder than props. **Fix:** Split into `FieldGroup`, `SelectField`, and `DateField` compounds rather than one export.
* **Styling inside primitives** - Baking brand colors into `Tabs.Tab` blocks white-label apps. **Fix:** Accept `style` / `textStyle` props or a `className` hook for NativeWind consumers.
* **Accessibility state not wired** - Tabs without `accessibilityRole="tab"` and `selected` state confuse VoiceOver/TalkBack. **Fix:** Mirror web ARIA roles on `Pressable` per platform guidance.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Compound components | Flexible layout of related parts sharing state | Single self-contained button with no children |
| Custom hook + dumb parts | One screen needs behavior; no shared child API | External teams compose varied tab layouts from your library |
| Render props | Caller owns markup entirely | JSX readability matters - nested functions get noisy |
| Configuration arrays | Fixed-order tabs from CMS JSON | Designers reorder chrome per platform frequently |
| Single component + many props | ≤3 variants, no structural flexibility | Prop list exceeds ~8 optional layout props |
| Headless + slots | Design system needs total style control | Internal app with one visual language |

## FAQs

What makes a component compound?

* A parent provides **shared state** through context (or cloneElement in older patterns).
* Children are **named parts** composed in JSX, not opaque configuration objects.
* The caller controls **structure and order** - the library does not hard-code one layout.

Compound components vs React Context - what is the difference?

* Compound components are a **pattern** built on context (or scoped state).
* Raw context exports a provider and hook; compound wraps that into ergonomic sub-components.
* Prefer compounds for design-system APIs; raw context for app-level theme or auth.

Should inactive tab panels stay mounted?

* **Unmount** when panels run heavy effects, map views, or video players.
* **Keep mounted** when switching back must preserve scroll position or form input.
* Expose `unmountOnBlur?: boolean` on the root if both use cases matter.

How do I type static properties like Tabs.List?

* Define the root function, then intersect with `{ List: typeof TabList; ... }`.
* Cast once when attaching parts, or build an object literal and assert the namespace type.
* Re-export a single `Tabs` symbol so consumers import one name.

Gotcha: Why do all accordion items re-render on toggle?

* A new context value object each render notifies every `useContext` subscriber.
* Memoize the provider value and split state vs actions if lists are large.
* Wrap item bodies in `memo` when the panel content is expensive.

Can compound components work with Expo Router layouts?

* Yes - a layout can render `<Tabs>` around a `<Slot />` for nested routes.
* Route-driven tabs still benefit from compound triggers that call `router.push`.
* See [Render Props & Slot Patterns](https://docs.wahwei/reactnative.codeguides.io/component-patterns/render-props-and-slot-patterns/) for slot composition.

How do form field compounds integrate with validation libraries?

* Root `FieldGroup` accepts `error` from React Hook Form's `fieldState.error?.message`.
* Keep validation logic outside the compound - it only displays error chrome.
* Pass `onChangeText` / `value` through `FieldGroup.Input` unchanged.

Is cloneElement still used for compound components?

* Context is the modern default - less fragile than reaching into child props.
* `cloneElement` appears in legacy libraries; new RN design systems should use context.
* React 19 `ref` as a prop simplifies forwarding without `cloneElement`.

How many sub-components is too many?

* If consumers routinely use only one sub-part, the API may be over-factored.
* Aim for 3–6 parts per compound (`Root`, `List`, `Trigger`, `Panel`, `Input`).
* Split into multiple compounds linked by shared hooks when namespaces grow unwieldy.

Gotcha: useId collisions across servers?

* `useId` is per React tree - safe for accordion item ids on mobile.
* Do not persist `useId` output to storage; generate server ids separately for APIs.

How do bottom tabs differ from compound tabs?

* React Navigation / Expo Router bottom tabs are **navigators** with route state.
* Compound tabs are **in-screen** UI for settings, filters, or wizard steps.
* Use navigators when each tab is a route; use compounds for local panel switching.

Can I forward styles to every part?

```tsx
function Tab({ index, children, style }: TabProps) {
  const { activeIndex, setActiveIndex } = useTabsContext();
  const active = activeIndex === index;
  return (
    <Pressable onPress={() => setActiveIndex(index)} style={[styles.tab, style]}>
      <Text>{children}</Text>
    </Pressable>
  );
}
```

* Accept optional `style` / `textStyle` on each part for brand overrides.
* Document which styles merge with defaults vs replace them.

How does this relate to custom hooks?

* Extract state logic into `useTabsState()` when multiple roots need the same behavior.
* Compound root calls the hook and passes the result into context.
* See [Custom Hooks for UI Logic](https://docs.wahwei/reactnative.codeguides.io/component-patterns/custom-hooks-for-ui-logic/) for the hook layer.

Should compound roots render a ScrollView?

* Default to `View` - callers wrap in `ScrollView` when content overflows.
* Built-in `ScrollView` fights nested scroll and keyboard-aware layouts.
* Document max-height behavior for accordion panels inside parent scroll views.

## Related

* [Component Patterns Basics](https://docs.wahwei/reactnative.codeguides.io/component-patterns/component-patterns-basics/) - feature folders and presentational splits
* [Custom Hooks for UI Logic](https://docs.wahwei/reactnative.codeguides.io/component-patterns/custom-hooks-for-ui-logic/) - extract compound state into reusable hooks
* [Render Props & Slot Patterns](https://docs.wahwei/reactnative.codeguides.io/component-patterns/render-props-and-slot-patterns/) - composition alternatives for navigation trees
* [Headless Components](https://docs.wahwei/reactnative.codeguides.io/component-patterns/headless-components/) - logic-only compounds without default styling
* [Typing Components & Props](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-components-and-props/) - typing namespace static parts
* [Event Handling & Touchables](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/event-handling-and-touchables/) - Pressable patterns for triggers

### External Related Links

* [react.dev](https://react.dev/) - core React concepts RN builds on
* [reactnative.dev](https://reactnative.dev/) - official React Native site
* [React Native Paper](https://reactnativepaper.com/) - Material Design component library

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
