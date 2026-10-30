# Environments & EAS Environment Variables

Separate dev, staging, and production configuration without committing secrets - using local `.env` files for development and EAS environment variables for cloud builds, updates, and workflows.

Highlights / Environments & EAS Environment Variables

* EAS provides three built-in environments: development, preview, and production
* Map eas.json build profiles to EAS environments with the `environment` field
* Only `EXPO\_PUBLIC\_` variables are safe to embed in client JavaScript - treat them as public
* `eas env:pull` syncs cloud variables to `.env.local` for local dev without committing secrets
* SDK 55+ requires `--environment` on `eas update` so OTA bundles match build-time config
* Secret visibility variables are for build-time tooling (NPM tokens), not client-side API keys

## Recipe

> Quick-reference recipe card - copy-paste ready.

```json
// eas.json - wire each build profile to an EAS environment
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "environment": "development"
    },
    "preview": {
      "distribution": "internal",
      "environment": "preview"
    },
    "production": {
      "distribution": "store",
      "environment": "production"
    }
  }
}
```

```bash
# Create cloud variables (repeat per environment)
eas env:create --name EXPO_PUBLIC_API_URL \
  --value https://api.staging.example.com \
  --environment preview \
  --visibility plaintext
 
# Pull preview vars locally (writes .env.local - keep gitignored)
eas env:pull --environment preview
 
# Publish an OTA update using the same environment as the build
eas update --environment production --message "Hotfix auth redirect"
```

```tsx
// src/config.ts - only EXPO_PUBLIC_ vars are inlined into the bundle
export const config = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000",
  appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? "development",
} as const;
```

**When to reach for this:**

* You ship **multiple app variants** (dev client, internal QA, App Store) that need different API endpoints or bundle identifiers.
* Your team runs **EAS Build or EAS Update** and cannot rely on uncommitted local `.env` files on remote runners.
* You need **role-based visibility** - plaintext for public config, sensitive for obfuscated logs, secret for NPM tokens and signing keys.
* You want **one source of truth** so a preview build and a preview OTA update resolve the same `EXPO_PUBLIC_*` values.

## Working Example

```tsx
// app.config.ts - branch native config per environment without hardcoding secrets
import type { ExpoConfig } from "expo/config";
 
const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV ?? "development";
 
const bundleIds: Record<string, string> = {
  development: "com.example.myapp.dev",
  preview: "com.example.myapp.staging",
  production: "com.example.myapp",
};
 
const apiUrls: Record<string, string> = {
  development: "http://localhost:3000",
  preview: "https://api.staging.example.com",
  production: "https://api.example.com",
};
 
const config: ExpoConfig = {
  name: APP_ENV === "production" ? "My App" : `My App (${APP_ENV})`,
  slug: "my-app",
  version: "1.0.0",
  ios: {
    bundleIdentifier: bundleIds[APP_ENV] ?? bundleIds.development,
  },
  android: {
    package: bundleIds[APP_ENV] ?? bundleIds.development,
  },
  extra: {
    appEnv: APP_ENV,
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? apiUrls[APP_ENV],
    eas: {
      projectId: "00000000-0000-0000-0000-000000000000",
    },
  },
};
 
export default config;
```

```tsx
// App.tsx - read runtime config from inlined public vars and app.config extra
import Constants from "expo-constants";
import { StyleSheet, Text, View } from "react-native";
 
export default function App() {
  const apiUrl =
    process.env.EXPO_PUBLIC_API_URL ??
    (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
    "not configured";
 
  const appEnv =
    process.env.EXPO_PUBLIC_APP_ENV ??
    (Constants.expoConfig?.extra?.appEnv as string | undefined) ??
    "unknown";
 
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Environment: {appEnv}</Text>
      <Text style={styles.body}>API: {apiUrl}</Text>
      <Text style={styles.hint}>
        EAS builds inject EXPO_PUBLIC_* at bundle time. Secrets never appear here.
      </Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 8 },
  title: { fontSize: 20, fontWeight: "700" },
  body: { fontSize: 15, color: "#374151" },
  hint: { fontSize: 13, color: "#6b7280", marginTop: 12 },
});
```

```bash
# .gitignore - never commit local overrides or pulled secrets
.env*.local
```

**What this demonstrates:**

* Mapping **EAS environments** (`development`, `preview`, `production`) to `eas.json` build profiles.
* Using **`EXPO_PUBLIC_*`** for client-safe values that Metro inlines at bundle time.
* Keeping **bundle identifiers and display names** environment-specific via `app.config.ts`.
* Separating **build-time secrets** (NPM tokens, signing keys) from anything referenced in JavaScript.

## Deep Dive

### How It Works

* **Local development:** Expo CLI loads `.env`, `.env.local`, and other standard dotenv files. Variables prefixed with `EXPO_PUBLIC_` are statically replaced in your source during bundling.
* **EAS Build:** When `environment` is set on a build profile, EAS injects that environment's variables into the build worker. Plaintext and sensitive variables are available when resolving `app.config.ts`; secret variables are available only on the server during the job.
* **EAS Update (SDK 55+):** `eas update --environment <name>` is **required**. Only variables from that EAS environment are used - local `.env` files are ignored, keeping OTA bundles aligned with store builds.
* **Scope:** Variables can be **project-wide** (one app) or **account-wide** (shared across apps in an organization).

### EAS Environment Mapping

| EAS environment | Typical use | `eas.json` signal (if `environment` omitted) |
| --- | --- | --- |
| `development` | Dev client, local API, debug tooling | `developmentClient: true` |
| `preview` | Internal QA, staging API, TestFlight/Play internal | Everything else (default fallback) |
| `production` | App Store / Play Store releases | `distribution: "store"` |

Explicit `environment` fields are recommended - auto-detection is convenient but easy to misconfigure when profiles share similar flags.

### Visibility Settings

| Visibility | Readable in dashboard/CLI | In build logs | Client bundle |
| --- | --- | --- | --- |
| Plain text | Yes | Yes | Only if referenced as `EXPO_PUBLIC_*` |
| Sensitive | Toggle on dashboard | Obfuscated | Only if referenced as `EXPO_PUBLIC_*` |
| Secret | No (server-only) | Obfuscated | **Never** - build-time tooling only |

> Anything embedded in client JavaScript is extractable from the compiled app. Use secrets for `NPM_TOKEN`, `SENTRY_AUTH_TOKEN`, and similar build-time values - not for "private" API keys shipped to users.

### Built-in EAS Build Variables

These are set automatically on EAS Build workers (not part of your project environments):

| Variable | Value |
| --- | --- |
| `EAS_BUILD` | `true` |
| `EAS_BUILD_PROFILE` | Profile name from `eas.json` |
| `EAS_BUILD_PLATFORM` | `android` or `ios` |
| `EAS_BUILD_ID` | Unique build UUID |
| `EAS_BUILD_PROJECT_ID` | Linked EAS project ID |

Use `EAS_BUILD_PROFILE` in `app.config.ts` when you need profile-specific logic beyond the three standard environments.

### TypeScript Notes

```tsx
// env.d.ts - document expected public variables for the team
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API_URL: string;
    EXPO_PUBLIC_APP_ENV: "development" | "preview" | "production";
  }
}
 
// Static access only - Metro will NOT inline bracket notation or destructuring
const url = process.env.EXPO_PUBLIC_API_URL; // ✓ inlined
// const url = process.env["EXPO_PUBLIC_API_URL"]; // ✗ not inlined
```

## Gotchas

* **Putting API secrets in `EXPO_PUBLIC_*`** - Any value inlined into JavaScript is visible in the app binary. **Fix:** Keep secrets server-side; use short-lived tokens from your backend.
* **Omitting `--environment` on `eas update` (SDK 55+)** - Updates may not match the variables used in your production build. **Fix:** Always pass `--environment` matching the target build profile.
* **Using `NODE_ENV` to switch `.env` files** - `npx expo export` forces `NODE_ENV=production`, so test/staging files won't load as expected. **Fix:** Use `eas env:pull --environment <name>` or explicit `EXPO_PUBLIC_APP_ENV`.
* **Bracket notation for env vars** - `process.env['EXPO_PUBLIC_KEY']` is not statically analyzable and won't be inlined. **Fix:** Use dot notation: `process.env.EXPO_PUBLIC_KEY`.
* **Assuming secrets are available in `app.config.ts` locally** - Secret-type variables are unreadable outside EAS servers. **Fix:** Use sensitive/plaintext for values needed during local config resolution, or provide dev defaults.
* **Committing `.env.local` after `eas env:pull`** - Pulled files often contain staging/production values. **Fix:** Add `.env*.local` to `.gitignore` and use separate pull commands per developer machine.
* **Mismatched environments across workflow jobs** - A fingerprint job on `production` paired with a preview build causes wrong secrets. **Fix:** Set `jobs.<id>.environment` to match the build profile's environment in EAS Workflows.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| EAS environment variables | Cloud builds, updates, team-wide config | You need zero Expo account dependency |
| Local `.env` files only | Solo dev, no EAS, open-source samples | Remote CI/CD or EAS Build - files won't be on the runner |
| `eas env:pull` + `.env.local` | Local dev parity with cloud environments | You want fully offline config with no Expo CLI |
| `app.config.ts` + `extra` field | Values needed before JS bundle (icons, bundle ID) | Simple runtime flags - prefer `EXPO_PUBLIC_*` |
| `react-native-config` | Legacy bare RN apps not on Expo env vars | New Expo SDK 57 projects - migrate to `EXPO_PUBLIC_*` |
| Runtime remote config (Firebase, LaunchDarkly) | Feature flags that change without a new build | Static API URLs known at build time |

## FAQs

What are the three default EAS environments?

`development`, `preview`, and `production`. Each is an independent set of variables. Custom environment names are available on Enterprise and Production EAS plans.

How do I connect an eas.json build profile to an environment?

Add the `environment` field to the profile:

```json
{
  "build": {
    "production": {
      "environment": "production"
    }
  }
}
```

All variables assigned to that environment are injected during the build.

What is the difference between project-wide and account-wide variables?

* **Project-wide:** Scoped to one EAS project (one app). Managed in project settings.
* **Account-wide:** Available to all projects under an Expo account or organization. Useful for shared tooling tokens.

Which variables are safe to use in client JavaScript?

Only variables prefixed with `EXPO_PUBLIC_`. They are inlined into the bundle at build time and are extractable from the compiled app. Never prefix private keys or admin tokens with `EXPO_PUBLIC_`.

How do I load EAS variables for local development?

```bash
eas env:pull --environment development
```

This writes a `.env.local` file. Restart Metro or reload the app to pick up changes. Keep `.env.local` gitignored.

Why is --environment required for eas update in SDK 55+?

To guarantee OTA bundles use the same EAS environment variables as cloud builds - not whatever `.env` file happens to exist on the machine running the update command.

Gotcha: Why does process.env["EXPO\_PUBLIC\_API\_URL"] not work?

Expo's Metro config only inlines **static dot notation** (`process.env.EXPO_PUBLIC_API_URL`). Bracket access and destructuring are not supported. Use dot notation everywhere.

What are secret-type variables for?

Build-time values like `NPM_TOKEN` or private registry credentials. They are unreadable outside EAS servers and are not available during local `app.config.ts` evaluation. They do **not** protect values you embed in client code.

How does EAS pick an environment if I omit the environment field?

Automatically: `production` when `distribution` is `store`, `development` when `developmentClient` is `true`, and `preview` for everything else. Explicit configuration is safer for teams with many profiles.

Can I use environment variables in EAS Workflows?

Yes. Build jobs inherit `environment` from the matching `eas.json` profile. Other job types (update, fingerprint, Maestro) accept `jobs.<id>.environment`. Keep environments consistent across jobs in the same workflow.

How do file-type environment variables work?

Upload a file (for example `google-services.json`) as an environment variable. EAS exposes it as a file path on the build runner. Useful for credentials that must exist as files during native compilation.

Should I commit .env to git?

Commit a `.env` with safe defaults or placeholder `EXPO_PUBLIC_*` values if helpful for onboarding. Never commit `.env.local` or files containing real secrets. Use EAS for production values.

How do I run a one-off command with EAS environment variables?

```bash
eas env:exec --environment production 'npx sentry-expo-upload-sourcemaps dist'
```

`eas env:exec` loads the environment before executing the shell command.

How does app.config.ts read environment variables during EAS Build?

Node evaluates `app.config.ts` on the build worker. Plaintext and sensitive EAS variables are available as `process.env.*`. Use them to set `bundleIdentifier`, `name`, plugins, and `extra` fields per environment.

What is the relationship between EXPO\_PUBLIC\_APP\_ENV and EAS environments?

They are independent concepts that you align by convention. `EXPO_PUBLIC_APP_ENV` is a variable you define. EAS `development`/`preview`/`production` are containers for variables. Set `EXPO_PUBLIC_APP_ENV=preview` inside the preview EAS environment for consistency.

## Related

* [app.json & app.config.js](https://docs.wahwei/reactnative.codeguides.io/expo-platform/app-json-and-app-config-js/) - dynamic config, plugins, and multi-environment manifests
* [Expo Platform Basics](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-platform-basics/) - `APP_VARIANT` branching and EAS project linking
* [Expo Go vs Development Builds](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-go-vs-development-builds/) - development profile and dev-client setup
* [Upgrading Expo SDK Versions](https://docs.wahwei/reactnative.codeguides.io/expo-platform/upgrading-expo-sdk-versions/) - env var behavior changes across SDK bumps
* [Expo Account, Projects & Permissions](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-account-projects-and-permissions/) - org-scoped variables and role access
* [Best Practices](https://docs.wahwei/reactnative.codeguides.io/expo-platform/best-practices/) - secrets hygiene and long-term config governance

### External Related Links

* [docs.expo.dev](https://docs.expo.dev/) - official Expo docs (recommended framework)
* [reactnative.dev/docs/more-resources](https://reactnative.dev/docs/more-resources) - curated further reading, tools, starter kits
* [reactnative.dev](https://reactnative.dev/) - official React Native site

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
