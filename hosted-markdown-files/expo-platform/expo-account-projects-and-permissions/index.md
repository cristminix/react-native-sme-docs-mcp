# Expo Account, Projects & Permissions

Structure Expo accounts, EAS projects, and role-based access so teams can ship multiple apps under one organization - with clear ownership, credential isolation, and least-privilege permissions.

Highlights / Expo Account, Projects & Permissions

* Personal accounts suit solo work; organizations enable team RBAC and shared credentials
* Four org roles: Owner, Admin, Developer, Viewer - least privilege for day-to-day work
* Set expo.owner in app.json so builds and credentials land under the correct account
* extra.eas.projectId is the stable identifier for EAS Build, Update, and env vars
* Account-wide environment variables share tooling tokens across multiple apps
* Project transfers require Owner/Admin on both source and destination accounts

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
# Log in and link a new app to an organization project
eas login
eas init
```

```json
// app.json - route the app to an organization and pin the EAS project
{
  "expo": {
    "name": "Retail App",
    "slug": "retail-app",
    "owner": "acme-mobile",
    "extra": {
      "eas": {
        "projectId": "bd2f7e21-1ee7-47f2-8357-d7c4b50622fb"
      }
    }
  }
}
```

```bash
# Verify which account owns the linked project
eas project:info
```

**When to reach for this:**

* Your team has **more than one developer** touching builds, credentials, or environment variables.
* You ship **multiple apps** (per client, brand, or platform) and need isolated credentials with shared billing.
* You need **auditability** - who can submit to the store, rotate secrets, or invite members.
* You are moving from a **personal account** to an **organization** without breaking production apps.

## Working Example

```json
// app.config.ts - multi-app org: shared projectId pattern, distinct slugs per app
import type { ExpoConfig } from "expo/config";
 
const APP_SLUG = "retail-consumer";
const ORG_OWNER = "acme-mobile";
 
const config: ExpoConfig = {
  name: "Acme Retail",
  slug: APP_SLUG,
  owner: ORG_OWNER,
  version: "3.1.0",
  ios: {
    bundleIdentifier: "com.acme.retail",
  },
  android: {
    package: "com.acme.retail",
  },
  extra: {
    eas: {
      projectId: "bd2f7e21-1ee7-47f2-8357-d7c4b50622fb",
    },
    appFamily: "retail",
  },
};
 
export default config;
```

```json
// eas.json - profiles inherit org credentials via the linked projectId
{
  "cli": {
    "version": ">= 16.0.0",
    "appVersionSource": "remote"
  },
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
      "environment": "production",
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleTeamId": "ABCDE12345"
      }
    }
  }
}
```

```bash
# CI: use a robot token with minimal scope - not a personal password
# Expo dashboard → Account Settings → Access Tokens → Create token
export EXPO_TOKEN="xxxxxxxxxxxxxxxxxxxxxxxx"
eas build --profile production --platform ios --non-interactive
```

**What this demonstrates:**

* **`owner`** routes the app to an organization - builds, credentials, and env vars scope to `acme-mobile`.
* **`projectId`** is the durable key EAS services use across slug or bundle ID changes.
* **Build profiles** map to environments without duplicating credential stores per developer.
* **Robot tokens** for CI preserve least privilege - no shared personal passwords.

## Deep Dive

### How It Works

#### Account types

| Type | Best for | Collaboration |
| --- | --- | --- |
| **Personal** | Solo projects, learning, prototypes | Share credentials manually (discouraged) |
| **Organization** | Teams, agencies, multi-app companies | RBAC, shared credentials, audit logs |

Every `expo.dev` signup creates a Personal account. Create an Organization when more than one person needs build, submit, or credential access.

#### EAS project linking

```
eas init  →  creates/links project under active account
          →  writes extra.eas.projectId to app config
          →  EAS Build / Update / env vars key off projectId
```

* **`slug`** is human-readable and used in URLs - it can change.
* **`projectId`** is a UUID - stable for the lifetime of the project.
* **`owner`** determines which account's credential store and billing apply.

#### Organization roles

| Role | Builds & updates | Credentials | Billing & invites | Delete account/projects |
| --- | --- | --- | --- | --- |
| **Owner** | ✓ | ✓ | ✓ | ✓ |
| **Admin** | ✓ | ✓ | ✓ (no Owner grant) | ✗ |
| **Developer** | ✓ | ✓ | ✗ | ✗ |
| **Viewer** | View in Expo Go only | ✗ | ✗ | ✗ |

Assign **Developer** for engineers who ship daily. Reserve **Owner** for leads and billing contacts. Use **Viewer** for stakeholders who only need to open preview builds in Expo Go.

#### Multi-app governance patterns

| Pattern | Structure |
| --- | --- |
| **One org, many projects** | `acme-mobile` org with `retail-app`, `warehouse-app`, `driver-app` - each with its own `projectId` |
| **Org per client (agency)** | `client-a-mobile` org isolates credentials and billing per customer |
| **Account-wide env vars** | Shared `NPM_TOKEN` or Sentry org token at account scope; app-specific API URLs at project scope |
| **Escrow transfer** | Temporary org holds a project during acquisition - both parties need Owner on escrow |

#### Programmatic access

* **Personal access tokens** - tied to a user; inherit that user's org memberships and roles.
* **Robot users / tokens** - for CI/CD; assign to an org with Developer role minimum for builds.
* **SSO** - Enterprise orgs can enforce single sign-on (see Expo SSO docs).

### TypeScript Notes

```tsx
// Reading linked project metadata at runtime (diagnostics only - not for auth)
import Constants from "expo-constants";
 
const projectId = Constants.expoConfig?.extra?.eas?.projectId;
const owner = Constants.expoConfig?.owner; // available in static config
 
export function DiagnosticsBanner() {
  if (!__DEV__) return null;
  return (
    <Text>
      EAS {projectId ?? "unlinked"} · owner: {owner ?? "personal"}
    </Text>
  );
}
```

Never use `projectId` or `owner` for in-app authorization - they are build-time identifiers, not security boundaries.

## Gotchas

* **Sharing a personal account password** - No audit trail, no per-person revocation, violates Expo ToS. **Fix:** Create an Organization and invite members with appropriate roles.
* **Omitting `owner` on org projects** - `eas build` may target your personal account instead of the team. **Fix:** Set `"owner": "org-slug"` in `app.json` before `eas init` or transfer the project.
* **Hardcoding credentials per developer machine** - Apple/Google keys stored locally break CI and onboarding. **Fix:** Let EAS host credentials under the org project; use `eas credentials` for rotation.
* **Granting Owner to every engineer** - One mistaken click can delete production credentials. **Fix:** Default to Developer; keep two Owners for bus-factor coverage.
* **Reusing one EAS project for unrelated apps** - Credentials, env vars, and update channels collide. **Fix:** One `projectId` per app binary (bundle ID / package).
* **Transferring without Admin on both sides** - Project moves require Owner or Admin on source **and** destination. **Fix:** Use an escrow organization for third-party transfers.
* **CI tokens on personal accounts** - Token inherits personal project scope; leaves when the employee departs. **Fix:** Create a robot token under the organization.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Organization account | Any team ≥ 2 people | Solo hobby project with no CI |
| Personal account | Learning, single-developer prototypes | Production apps with shared credentials |
| One org per client | Agency isolation and offboarding | Single-product company - unnecessary overhead |
| Account-wide env vars | Shared tokens across all org apps | App-specific API URLs - use project scope |
| Personal access token (CI) | Quick CI setup on a small team | Long-lived production pipelines - prefer robot tokens |
| Convert personal → org | Solo dev becoming a team | You need a clean client separation - create a new org instead |

## FAQs

When should I create an Organization instead of using my personal account?

When anyone besides you needs to run builds, manage credentials, configure environment variables, or submit to app stores. Organizations provide RBAC, shared credential stores, and member management.

What are the four organization roles?

* **Owner** - full control including deletion
* **Admin** - settings, billing, invites (cannot grant Owner)
* **Developer** - builds, updates, credentials
* **Viewer** - read-only via Expo Go, no modifications

What does the owner field in app.json do?

It sets which Expo account (personal username or organization slug) owns the project. Builds, credentials, and dashboard URLs resolve under that account. Required when the project belongs to an organization you are a member of.

What is extra.eas.projectId?

A stable UUID written by `eas init` that links your repo to an EAS project. EAS Build, Update, environment variables, and credentials all scope to this ID - not to `slug` or bundle identifier.

How do I link an existing repo to EAS?

```bash
eas login
eas init
```

Follow prompts to create a new project or link to an existing one. The command writes `projectId` into your app config.

Gotcha: Why did my build run on my personal account instead of the team org?

The active `eas whoami` account or a missing `owner` field defaults to personal scope. Set `"owner": "your-org-slug"` in app config and confirm `eas project:info` shows the organization.

Can I convert a personal account into an organization?

Yes - User Settings → "Convert your account into an organization." Projects, credentials, EAS subscriptions, and webhooks transfer. Plan a maintenance window and confirm integrations using your access token still work.

How do project transfers work?

Project Settings → General → Transfer project. You must be Owner or Admin on **both** source and destination accounts. For transfers to a third party without shared access, use an escrow organization.

Who can invite new members?

Owners and Admins. Admins can assign any role except Owner. Owners can assign any role including Owner.

What is the difference between project-wide and account-wide environment variables?

* **Project-wide:** Scoped to one EAS project (one app).
* **Account-wide:** Available to all projects in the organization. Configure under Account Settings → Environment variables.

How should CI authenticate to EAS?

Create an access token (robot user for organizations). Set `EXPO_TOKEN` in CI secrets. Use `--non-interactive` on `eas build` and `eas submit`. Do not store personal passwords in CI.

Can multiple apps share one EAS project?

Technically yes, but not recommended. Credentials, update channels, and environment variables collide. Use one EAS project per distinct app (unique bundle ID / package).

What permissions does a Developer need for day-to-day work?

Developer role covers `eas build`, `eas update`, `eas credentials`, and environment variable reads (per visibility). Developers cannot manage billing, invite members, or change org settings.

How do I structure an agency with many clients?

Create a separate Organization per client (`client-a-mobile`, `client-b-mobile`). Each org holds its own projects, credentials, and billing. Developers receive invites only to the orgs they serve.

Where do I audit account security changes?

Account Overview → User settings → Security activity. Shows password, email, and 2FA changes. Organization Owners should enforce 2FA for all members on production accounts.

## Related

* [Environments & EAS Environment Variables](https://docs.wahwei/reactnative.codeguides.io/expo-platform/environments-and-eas-environment-variables/) - project-scoped and account-scoped env vars
* [Expo Platform Basics](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-platform-basics/) - `eas init` and early project linking
* [Expo Go vs Development Builds](https://docs.wahwei/reactnative.codeguides.io/expo-platform/expo-go-vs-development-builds/) - Viewer role limits and dev-client workflows
* [app.json & app.config.js](https://docs.wahwei/reactnative.codeguides.io/expo-platform/app-json-and-app-config-js/) - `owner`, `slug`, and `extra` configuration
* [Upgrading Expo SDK Versions](https://docs.wahwei/reactnative.codeguides.io/expo-platform/upgrading-expo-sdk-versions/) - org-wide upgrade coordination across multiple projects
* [Best Practices](https://docs.wahwei/reactnative.codeguides.io/expo-platform/best-practices/) - governance checklist for production teams

### External Related Links

* [docs.expo.dev](https://docs.expo.dev/) - official Expo docs (recommended framework)
* [Expo GitHub & examples](https://github.com/expo/expo) - Expo monorepo + example projects
* [reactnative.dev](https://reactnative.dev/) - official React Native site

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
