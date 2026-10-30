# create-expo-app Quickstart

Scaffold a new Expo project with the correct template, an explicit SDK 57 pin, and a verification pass so your team starts on React Native 0.86 - not an accidental older SDK.

Highlights / create-expo-app Quickstart

* Pin SDK 57 explicitly with --template default@sdk-57 - bare @latest may scaffold SDK 54 during the transition
* default template ships Expo Router, TypeScript, and the recommended Expo CLI scripts
* Verify the pin in package.json: expo ~57.0.4 and react-native 0.86.0
* Run npx expo-doctor after scaffold to catch version skew before you write feature code
* bare-minimum runs prebuild immediately - choose it only when you need android/ and ios/ on day one

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
# Pin SDK 57 explicitly (recommended for new production apps)
npx create-expo-app@latest MyApp --template default@sdk-57
 
cd MyApp
 
# Confirm the SDK pin before writing features
node -e "const p=require('./package.json'); console.log({expo:p.dependencies.expo, rn:p.dependencies['react-native']})"
 
npx expo-doctor
npx expo start
```

**When to reach for this:**

* Starting a greenfield Expo app and you want SDK 57 / RN 0.86 from the first commit.
* Onboarding a teammate who needs a one-command reproducible scaffold.
* Choosing between `default`, `tabs`, `blank`, or `bare-minimum` before the repo grows roots.
* Auditing an existing scaffold for SDK drift after `create-expo-app@latest` changed its default template.

## Working Example

```bash
#!/usr/bin/env bash
# scripts/scaffold-team-app.sh - reproducible SDK 57 project for your org
 
set -euo pipefail
 
APP_NAME="${1:-TeamMobile}"
TEMPLATE="${2:-default@sdk-57}"   # tabs@sdk-57 | blank-typescript@sdk-57 | bare-minimum@sdk-57
 
npx create-expo-app@latest "$APP_NAME" \
  --template "$TEMPLATE" \
  --yes
 
cd "$APP_NAME"
 
# Lockfile + git from day one
git init
git add .
git commit -m "chore: scaffold $APP_NAME ($TEMPLATE)"
 
# Sanity checks every new repo should pass
npx expo-doctor
npx tsc --noEmit
 
echo "✅ $APP_NAME ready - run: cd $APP_NAME && npx expo start"
```

After the script finishes, open the project and confirm `package.json` dependencies:

```json
{
  "dependencies": {
    "expo": "~57.0.4",
    "react": "19.2.3",
    "react-native": "0.86.0"
  },
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  }
}
```

**What this demonstrates:**

* Explicit `--template default@sdk-57` so the scaffold matches your stack manifest, not whatever `@latest` defaults to during an SDK transition.
* `--yes` for CI-friendly, non-interactive project creation.
* `expo-doctor` as the first gate after scaffold - catches incompatible native module versions early.
* Committing immediately so SDK and template choices are traceable in git history.

## Deep Dive

### How It Works

* **`create-expo-app`** downloads a versioned template from the Expo monorepo, writes `package.json`, installs dependencies, and generates starter source (Expo Router layout for `default`/`tabs`).
* The **`@sdk-57` suffix** on a template name pins the Expo SDK major at scaffold time - the template's `package.json` resolves `expo` to `~57.0.4` and matching `react-native` / `react` peers.
* **`npx expo install <pkg>`** (used later) reads the pinned `expo` version and installs compatible native module versions - but only if the base `expo` pin is correct first.
* **`expo-doctor`** compares your dependency graph against the SDK 57 compatibility database and flags mismatches before they surface as obscure Metro or native build errors.

### Template Selection

| Template | Ships | Choose when |
| --- | --- | --- |
| `default@sdk-57` | Expo Router, TypeScript, tab/stack starter, recommended scripts | Most new apps - the team default |
| `tabs@sdk-57` | File-based routing focused starter (similar to default) | You want routing-first structure without extra boilerplate stripped |
| `blank@sdk-57` / `blank-typescript@sdk-57` | Minimal JS/TS, no navigation wired | Library spikes, brownfield experiments, teaching RN primitives |
| `bare-minimum@sdk-57` | Blank + `android/` and `ios/` via `npx expo prebuild` | You need native directories immediately (custom native code day one) |

```bash
# Examples - always include the SDK suffix for new SDK 57 work
npx create-expo-app@latest Shop --template tabs@sdk-57
npx create-expo-app@latest Spike --template blank-typescript@sdk-57
npx create-expo-app@latest NativeDay1 --template bare-minimum@sdk-57
```

### SDK Pin Verification Checklist

| Check | Command / location | Expected for SDK 57 |
| --- | --- | --- |
| `expo` package version | `package.json` → `dependencies.expo` | `~57.0.4` |
| React Native peer | `package.json` → `dependencies.react-native` | `0.86.0` |
| React peer | `package.json` → `dependencies.react` | `19.2.3` |
| Doctor pass | `npx expo-doctor` | No errors (warnings reviewed) |
| Resolved config | `npx expo config --type public` | `sdkVersion` / plugins align with 57 |

### create-expo-app Flags That Matter

| Flag | Effect |
| --- | --- |
| `--template <name>@sdk-57` | Selects starter + SDK major |
| `--yes` | Accepts defaults (name from folder, install deps) |
| `--no-install` | Skips `npm install` / CocoaPods - useful in CI that installs separately |
| `--example <name>` | Clones an example from `expo/examples` instead of a core template |
| `--no-agents-md` | Skips AI agent context files (`AGENTS.md`, etc.) |

### TypeScript Notes

```tsx
// App.tsx - blank-typescript template entry (no Router)
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
 
export default function App() {
  return (
    <View style={styles.container}>
      <Text>SDK 57 app booted.</Text>
      <StatusBar style="auto" />
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
});
```

The `default@sdk-57` template uses Expo Router (`app/_layout.tsx`) instead - prefer that for multi-screen apps.

## Gotchas

* **Scaffolding without `@sdk-57`** - During the SDK 57 transition, `npx create-expo-app@latest` without `--template` may create an SDK 54 project. **Fix:** Always pass `--template default@sdk-57` (or your chosen template with the SDK suffix).
* **Picking `bare-minimum` by default** - It runs `prebuild` immediately, committing `android/` and `ios/`. Teams on managed workflow lose CNG simplicity. **Fix:** Start with `default@sdk-57`; run `npx expo prebuild` only when native dirs are required.
* **Skipping `expo-doctor` after scaffold** - Version skew (e.g. `expo-camera` built for SDK 56) compiles but crashes at runtime. **Fix:** Run `npx expo-doctor` and `npx expo install --fix` before feature work.
* **Mixing package managers** - Copying a project scaffolded with npm but running `yarn install` leaves duplicate lockfiles and EAS may pick the wrong one. **Fix:** Stick to one manager; delete the other lockfile if migrating.
* **Assuming Expo Go matches your SDK** - Physical iOS devices can only install the latest Expo Go from the App Store. An SDK 57 project may not load in an older Expo Go. **Fix:** Match Expo Go version to SDK, or switch to a development build early.
* **Renaming the app folder without updating `slug`** - `app.json` / `app.config` `slug` stays at scaffold value; deep links and EAS project URLs break. **Fix:** Update `slug`, `name`, and bundle identifiers together in app config.
* **Committing `node_modules` or omitting the lockfile** - Reproducible installs fail across machines and EAS. **Fix:** Commit `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml`; keep `node_modules` gitignored.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `create-expo-app` with `@sdk-57` template | New Expo apps; team wants official starters | You are adding RN to an existing native app (brownfield) |
| `npx @react-native-community/cli init` | Pure RN without Expo tooling | You want EAS, Expo modules, and managed upgrades |
| `expo/examples` via `--example` | Learning a specific integration (Router, SQLite, etc.) | Production app scaffold - examples are demos, not product templates |
| Monorepo generators (Nx, Turborepo) | Multiple apps sharing packages | A single standalone app - extra complexity upfront |
| Fork an internal template repo | Org-wide lint, CI, and design tokens baked in | One-off prototypes where official templates are faster |

## FAQs

What is create-expo-app?

`create-expo-app` is Expo's project generator. It copies a versioned template, installs dependencies, and wires scripts (`expo start`, platform targets). It is the recommended way to start SDK 57 projects.

Why must I pass --template default@sdk-57 instead of just @latest?

During the SDK 57 rollout, `create-expo-app@latest` without a template may still scaffold SDK 54 for Expo Go compatibility on physical devices. New production work should pin `@sdk-57` explicitly so `package.json` resolves `expo` ~57.0.4.

Which template should most teams pick?

`default@sdk-57`. It includes Expo Router, TypeScript, and the standard Expo CLI scripts. Use `blank-typescript@sdk-57` for minimal spikes and `bare-minimum@sdk-57` only when you need native directories immediately.

How do I verify the SDK pin after scaffolding?

```bash
node -e "console.log(require('./package.json').dependencies.expo)"
npx expo-doctor
```

Expect `~57.0.4` and a clean doctor report.

What does npx expo-doctor check?

It validates that `expo`, `react-native`, and installed Expo modules match the SDK compatibility matrix. Run it after every scaffold and after adding native dependencies.

Can I scaffold non-interactively for CI?

Yes. Pass `--yes` and the app name:

```bash
npx create-expo-app@latest MyApp --template default@sdk-57 --yes
```

What is the difference between default and tabs templates?

Both target multi-screen apps with Expo Router and TypeScript. `default` is the general-purpose starter; `tabs` emphasizes tab navigation structure. For most teams they are interchangeable - pick one and standardize.

When should I choose bare-minimum?

When you need `android/` and `ios/` directories on day one - custom native modules, existing CI that compiles native projects, or brownfield integration. Otherwise start managed and run `npx expo prebuild` later.

Gotcha: Why does Expo Go fail to open my fresh project?

Expo Go on the App Store tracks one SDK at a time. An SDK 57 project requires a compatible Expo Go build. On iOS devices you cannot sideload older Expo Go versions - use a simulator, download a matching build from expo.dev/go, or create a development build.

How do I start the dev server after scaffold?

```bash
cd MyApp
npx expo start
```

Press `i` for iOS Simulator, `a` for Android emulator, or scan the QR code with Expo Go / a development build.

Should I use npm, yarn, pnpm, or bun?

All are supported. `create-expo-app` configures package-manager-specific settings (e.g. Yarn PnP `nodeLinker: node-modules`). Pick one per repo and commit the matching lockfile - EAS detects it automatically.

What does --no-install do?

Skips installing JavaScript dependencies (and CocoaPods for `bare-minimum`). Useful when CI runs `npm ci` in a later step with cached registries.

Can I use --example instead of --template?

Yes. `--example with-router` pulls from `expo/examples`. Examples teach specific features; they are not a substitute for `default@sdk-57` when you want the maintained production starter.

How do I add native modules after scaffold?

Always use Expo's installer so versions match SDK 57:

```bash
npx expo install expo-camera
```

Never `npm install expo-camera@latest` without checking compatibility.

What files should I commit after scaffolding?

Commit source, `app.json` / `app.config`, `package.json`, lockfile, `tsconfig.json`, and assets. Do not commit `node_modules`, `.expo/`, or local `.env*.local` files with secrets.

## Related

* [Expo Platform Basics](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-platform-basics/) - managed workflow mental model before you scaffold
* [app.json & app.config.js](https://docs.wahwei/reactnative.codeguides.io/expo-platform/app-json-and-app-config-js/) - configure name, slug, and plugins after scaffold
* [Expo Go vs Development Builds](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-go-vs-development-builds/) - choose how you run the project locally
* [Upgrading Expo SDK Versions](https://docs.wahwei/reactnative.codeguides.io/expo-platform/upgrading-expo-sdk-versions/) - when an existing app needs to move to SDK 57
* [Environments & EAS Environment Variables](https://docs.wahwei/reactnative.codeguides.io/expo-platform/environments-and-eas-environment-variables/) - wire staging/prod after the repo exists
* [React Native Basics](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/react-native-basics/) - first components once Metro is running

### External Related Links

* [docs.expo.dev](https://docs.expo.dev/) - official Expo docs (recommended framework)
* [docs.expo.dev/tutorial](https://docs.expo.dev/tutorial/introduction/) - official Expo step-by-step tutorial
* [reactnative.dev](https://reactnative.dev/) - official React Native site

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
