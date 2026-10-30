# create-expo-app Templates

`create-expo-app` ships five first-party templates - each pins Expo SDK 57 when you pass `@sdk-57`. Picking the wrong starter costs days of migration; this page maps each template to the product shape it fits.

Highlights / create-expo-app Templates

* default@sdk-57 is the team default - Expo Router, TypeScript, and recommended scripts
* tabs@sdk-57 and default@sdk-57 are interchangeable for most apps - pick one and standardize
* blank-typescript@sdk-57 is for spikes and brownfield experiments without navigation wired
* bare-minimum@sdk-57 runs prebuild immediately - only when you need android/ and ios/ on day one
* Always suffix templates with @sdk-57 during the SDK transition - bare @latest may scaffold SDK 54

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
# Team default - multi-screen app with Expo Router + TypeScript
npx create-expo-app@latest ShopApp --template default@sdk-57 --yes
 
# Tab-first navigation starter (similar scope to default)
npx create-expo-app@latest ShopApp --template tabs@sdk-57 --yes
 
# Minimal spike - no router, TypeScript enabled
npx create-expo-app@latest Spike --template blank-typescript@sdk-57 --yes
 
# Native dirs on day one - runs prebuild during scaffold
npx create-expo-app@latest NativeDay1 --template bare-minimum@sdk-57 --yes
 
cd ShopApp && npx expo-doctor
```

**When to reach for this:**

* Choosing a starter before the first production commit - template swaps are painful once navigation and native dirs grow roots.
* Standardizing template choice across squads so every new repo boots the same scripts and folder layout.
* Deciding whether you need `bare-minimum` now or can stay managed and run `npx expo prebuild` later.
* Auditing an accidental SDK 54 scaffold - compare `package.json` against the template you intended.

## Working Example

```bash
#!/usr/bin/env bash
# scripts/new-expo-app.sh - org template picker with SDK 57 verification
set -euo pipefail
 
APP_NAME="${1:?Usage: ./new-expo-app.sh <AppName> [default|tabs|blank-typescript|bare-minimum]}"
KIND="${2:-default}"
 
case "$KIND" in
  default|tabs|blank-typescript|bare-minimum) TEMPLATE="${KIND}@sdk-57" ;;
  *) echo "Unknown template: $KIND" >&2; exit 1 ;;
esac
 
npx create-expo-app@latest "$APP_NAME" --template "$TEMPLATE" --yes
cd "$APP_NAME"
 
# Fail fast if the scaffold drifted from SDK 57
EXPO_VER="$(node -p "require('./package.json').dependencies.expo")"
RN_VER="$(node -p "require('./package.json').dependencies['react-native']")"
test "$EXPO_VER" = "~57.0.4" || { echo "Expected expo ~57.0.4, got $EXPO_VER" >&2; exit 1; }
test "$RN_VER" = "0.86.0" || { echo "Expected react-native 0.86.0, got $RN_VER" >&2; exit 1; }
 
npx expo-doctor
npx tsc --noEmit
 
echo "✅ $APP_NAME scaffolded with $TEMPLATE"
```

After `default@sdk-57`, expect this layout:

```text
ShopApp/
├── app/
│   ├── _layout.tsx          # Expo Router root layout
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Tab navigator
│   │   ├── index.tsx
│   │   └── explore.tsx
│   └── +not-found.tsx
├── assets/
├── app.json
├── package.json             # expo ~57.0.4, react-native 0.86.0, react 19.2.3
└── tsconfig.json
```

**What this demonstrates:**

* A single script encodes org policy - engineers pass `default`, `tabs`, `blank-typescript`, or `bare-minimum`; the `@sdk-57` suffix is never optional.
* Post-scaffold version assertions catch SDK drift before feature work starts.
* `expo-doctor` and `tsc --noEmit` as mandatory gates after every template choice.
* `default@sdk-57` ships file-based routing under `app/` - the layout you extend for production navigation.

## Deep Dive

### How It Works

* **`create-expo-app`** copies a versioned template from the Expo monorepo, writes `package.json`, installs dependencies, and generates starter source.
* The **`@sdk-57` suffix** pins the template's dependency graph - `expo` resolves to `~57.0.4` with matching `react-native` `0.86.0` and `react` `19.2.3`.
* **`default` and `tabs`** both enable Expo Router and TypeScript; they differ in starter navigation structure, not SDK capabilities.
* **`blank` / `blank-typescript`** ship a single `App.tsx` entry - no `app/` directory, no router - you add navigation manually.
* **`bare-minimum`** runs `npx expo prebuild` during setup, generating `android/` and `ios/` immediately.

### Template Comparison

| Template | Navigation | TypeScript | Native dirs (`android/`, `ios/`) | Best for |
| --- | --- | --- | --- | --- |
| `default@sdk-57` | Expo Router, tab/stack starter | Yes | No (managed / CNG) | **Most production apps** - team default |
| `tabs@sdk-57` | Expo Router, tab layout emphasized | Yes | No | Apps where tab IA is decided day one |
| `blank@sdk-57` | None - single `App.js` | No | No | JS-only spikes, teaching RN primitives |
| `blank-typescript@sdk-57` | None - single `App.tsx` | Yes | No | Typed spikes, library experiments, brownfield probes |
| `bare-minimum@sdk-57` | None - single `App.tsx` | Yes | **Yes** (prebuild runs) | Custom native code or CI that compiles native on day one |

```bash
# Side-by-side comparison - scaffold into /tmp, inspect, delete
npx create-expo-app@latest /tmp/compare-default --template default@sdk-57 --yes
npx create-expo-app@latest /tmp/compare-blank --template blank-typescript@sdk-57 --yes
ls /tmp/compare-default/app        # Router present
ls /tmp/compare-blank/app 2>/dev/null || echo "blank: no app/ directory"
```

### Decision Flow

| Your situation | Template |
| --- | --- |
| New product app with multiple screens | `default@sdk-57` |
| Tab bar is the primary IA from sprint one | `tabs@sdk-57` (or `default` - nearly equivalent) |
| Prototype one screen, no navigation yet | `blank-typescript@sdk-57` |
| Embed RN inside existing native shell | `blank-typescript@sdk-57` or brownfield flow - not `bare-minimum` by default |
| Need `android/` and `ios/` committed immediately | `bare-minimum@sdk-57` |
| Physical device testing with stock Expo Go only | SDK 54 project (Expo Go constraint) - not SDK 57 templates |

### What Each Template Omits

| Template | You add later |
| --- | --- |
| `default` / `tabs` | State management, API client, feature folders under `src/features/` |
| `blank-typescript` | Expo Router (`npx expo install expo-router` + `app/` directory) or React Navigation |
| `bare-minimum` | Navigation, managed-workflow simplicity - you own native project maintenance |

### TypeScript Notes

```tsx
// blank-typescript@sdk-57 entry - no Router, single root component
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
 
export default function App() {
  return (
    <View style={styles.container}>
      <Text>Blank TypeScript starter on SDK 57.</Text>
      <StatusBar style="auto" />
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
});
```

```tsx
// default@sdk-57 - route files live under app/, not App.tsx
// app/(tabs)/index.tsx
import { StyleSheet, Text, View } from "react-native";
 
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text>Home tab - Expo Router file route.</Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
});
```

Prefer `default@sdk-57` when the app will have more than one screen - retrofitting Expo Router into `blank-typescript` is doable but wastes the first sprint.

## Gotchas

* **Scaffolding without `@sdk-57`** - During the SDK 57 transition, bare `create-expo-app@latest` may create SDK 54 for Expo Go on physical devices. **Fix:** Pass `--template default@sdk-57` (or your chosen template with the suffix) for new production work.
* **Treating `tabs` and `default` as fundamentally different** - Both ship Expo Router and TypeScript with similar file counts. Teams waste time debating them. **Fix:** Pick one org-wide; the difference is starter layout, not capability.
* **Choosing `bare-minimum` for "just in case"** - Prebuild commits `android/` and `ios/`, increasing merge conflict surface and slowing managed upgrades. **Fix:** Start `default@sdk-57`; run `npx expo prebuild` when native dirs are actually required.
* **Staying on `blank` when the app grows past one screen** - Engineers bolt React Navigation into `App.tsx` and end up with a non-standard tree. **Fix:** Migrate to Expo Router early or start with `default@sdk-57`.
* **Assuming templates include state management or API layers** - No template ships Redux, TanStack Query, or feature folders. **Fix:** Add architecture after scaffold; see [Folder Structure for Features](https://docs.wahwei/reactnative.codeguides.io/project-setup/folder-structure-for-features/).
* **Mixing template entry styles** - `default` uses `app/_layout.tsx`; `blank-typescript` uses `App.tsx`. Copy-pasting route code between them without restructuring fails. **Fix:** Match imports and entry points to the template you chose.
* **Skipping `expo-doctor` after template selection** - Template metadata can resolve incompatible native module peers. **Fix:** Run `npx expo-doctor` before the first feature PR.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `default@sdk-57` | Standard multi-screen Expo apps | You need only a single-screen spike (`blank-typescript`) |
| `tabs@sdk-57` | Tab IA is fixed from day one | You want the general-purpose starter name (`default`) |
| `blank-typescript@sdk-57` | Minimal surface, no router yet | Production app with multiple screens |
| `bare-minimum@sdk-57` | Native directories required immediately | Managed workflow with CNG is acceptable |
| `--example` from `expo/examples` | Learning a specific integration (Router, SQLite) | Production scaffold - examples are demos, not maintained product templates |
| Internal template repo (fork of `default@sdk-57`) | Org-wide lint, CI, and design tokens baked in | One-off prototypes where official templates are faster |

## FAQs

What templates does create-expo-app ship?

Five first-party templates: `default`, `tabs`, `blank`, `blank-typescript`, and `bare-minimum`. Append `@sdk-57` to pin Expo SDK 57 at scaffold time.

Which template should most teams pick?

`default@sdk-57`. It includes Expo Router, TypeScript, and the recommended Expo CLI scripts. Use `blank-typescript@sdk-57` for minimal spikes and `bare-minimum@sdk-57` only when you need native directories immediately.

What is the difference between default and tabs?

Both target multi-screen apps with Expo Router and TypeScript. `default` is the general-purpose starter; `tabs` emphasizes tab navigation structure in the generated `app/` tree. For most teams they are interchangeable - standardize on one.

When should I choose blank-typescript?

When you need a typed minimal app without navigation wired - library spikes, RN learning exercises, or brownfield experiments. Add Expo Router or React Navigation when screens multiply.

When should I choose bare-minimum?

When you need `android/` and `ios/` directories on day one - custom native modules, existing native CI, or brownfield integration that cannot wait for a later `prebuild`. Otherwise start managed with `default@sdk-57`.

Why must I use @sdk-57 in the template name?

During the SDK 57 transition, `create-expo-app@latest` without `--template` may scaffold SDK 54 for Expo Go compatibility on physical devices. Production work targeting RN 0.86 should pass `@sdk-57` explicitly.

How do I verify the template pinned SDK 57?

```bash
node -p "require('./package.json').dependencies.expo"
node -p "require('./package.json').dependencies['react-native']"
npx expo-doctor
```

Expect `~57.0.4` and `0.86.0`.

Does default include TypeScript?

Yes. `default@sdk-57` and `tabs@sdk-57` ship TypeScript, `tsconfig.json`, and typed route files under `app/`. Use `blank@sdk-57` only when you explicitly want JavaScript without types.

Can I switch templates after scaffolding?

There is no automatic migration. Moving from `blank-typescript` to Expo Router means adding `app/`, dependencies, and config. Moving from managed to `bare-minimum` means running `prebuild` and committing native dirs. Pick the right template early.

What files does bare-minimum add?

`android/` and `ios/` directories generated by `npx expo prebuild` during setup, plus the same minimal `App.tsx` entry as `blank-typescript`. You maintain native projects from commit one.

Should I use --example instead of --template?

`--example` pulls demos from `expo/examples` - great for learning integrations. For production apps, use `default@sdk-57` or your org fork so upgrades track the maintained template.

Gotcha: why does my tabs template look like default?

They share the same SDK, Router, and TypeScript stack. The generated `app/` file names and tab layout differ slightly. Functionally they solve the same problem - do not re-scaffold to switch between them.

Do templates include testing or CI setup?

No. Templates ship app source, `app.json`, and Expo scripts. Add Jest, Maestro, EAS, and lint configs after scaffold - or use an internal template repo that extends `default@sdk-57`.

Can I scaffold into a monorepo subdirectory?

Yes:

```bash
npx create-expo-app@latest apps/mobile --template default@sdk-57 --yes
```

Install from the monorepo root afterward. See [Monorepo with Turborepo](https://docs.wahwei/reactnative.codeguides.io/project-setup/monorepo-with-turborepo/).

What is the relationship between templates and Expo Go?

SDK 57 templates target RN 0.86. Physical iOS devices can only install the latest Expo Go from the App Store, which may lag SDK 57. Use a simulator, a matching Expo Go build from expo.dev/go, or a development build - not an older template SDK - for device testing.

## Related

* [Project Setup Basics](https://docs.wahwei/reactnative.codeguides.io/project-setup/project-setup-basics/) - standard app layout, scripts, and first-run verification after scaffold
* [create-expo-app Quickstart](https://docs.wahwei/reactnative.codeguides.io/expo-platform/create-expo-app-quickstart/) - full scaffold workflow, flags, and SDK pin checklist
* [Folder Structure for Features](https://docs.wahwei/reactnative.codeguides.io/project-setup/folder-structure-for-features/) - where feature code lives after you pick a template
* [Monorepo with Turborepo](https://docs.wahwei/reactnative.codeguides.io/project-setup/monorepo-with-turborepo/) - scaffold `apps/mobile` with `default@sdk-57` inside a workspace
* [Expo Go vs Development Builds](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-go-vs-development-builds/) - how template SDK choice affects local run targets
* [Component Patterns Basics](https://docs.wahwei/reactnative.codeguides.io/component-patterns/component-patterns-basics/) - container/presenter splits inside the template's `app/` routes

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
