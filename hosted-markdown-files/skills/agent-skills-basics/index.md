# Agent Skills Basics

What a mobile SME **Agent Skill** contains and when to invoke it - ten examples for teams using AI assistants on **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**. These pages document **skills**, not app code. A skill is a `SKILL.md` playbook your agent reads before acting.

Highlights / Agent Skills Basics

* Agent Skills are SKILL.md playbooks - not app tutorials - that pin Expo SDK 57 workflows
* Every skill declares inputs, outputs, guardrails, and example prompts for repeatable AI assistance
* Invoke skills at decision points: release, routing, native bridges, testing, upgrades, incidents
* SDK-pinned skills prevent agents from suggesting React 18 or pre-SDK-57 APIs
* Skills compose with human docs - eas-build and testing sections are the source of truth
* Run npx expo-doctor after any skill output that touches dependencies or native config

## Prerequisites

Skills live in your repo (or team skill registry) beside the app they govern:

```text
.cursor/skills/
├── eas-release/
│   └── SKILL.md
├── expo-router/
│   └── SKILL.md
├── mobile-testing/
│   └── SKILL.md
└── sdk-upgrade/
    └── SKILL.md
```

Pin the stack in every skill header so agents never drift to outdated APIs:

```markdown
## Stack pin
- React 19.2.3
- React Native 0.86.0
- Expo SDK 57 (`expo` ~57.0.4)
```

> **Scope:** Skills orchestrate *how* an agent should work. Human-readable cookbooks in [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/), [Expo Router Basics](https://docs.wahwei/reactnative.codeguides.io/expo-router/expo-router-basics/), and [Mobile Testing Basics](https://docs.wahwei/reactnative.codeguides.io/testing/mobile-testing-basics/) remain the authoritative reference.

---

## Basic Examples

### 1. What an Agent Skill Is

An **Agent Skill** is a structured instruction file - typically `SKILL.md` - that tells an AI assistant *what to do*, *what to ask for*, and *what not to do* on a mobile task.

| Skill artifact | Purpose |
| --- | --- |
| `SKILL.md` | Trigger phrases, inputs, outputs, guardrails |
| `references/` | Optional deep links to internal ADRs or runbooks |
| `examples/` | Invocation prompts that passed review |

* Skills are **not** feature tutorials - they are **operational contracts** for assisted development
* Skills should be **SDK-pinned** - agents hallucinate older `expo-router` APIs without explicit version context
* One skill = one **decision domain** (release, routing, native module review, incident triage)

---

### 2. Minimum SKILL.md Structure

Every mobile skill should open with the same skeleton:

```markdown
# EAS Release Skill
 
## What this skill does
Guides build → submit → OTA with guardrails for SDK 57.
 
## When to invoke
- Before first production `eas build`
- When adding a new `eas.json` profile
- When planning a JS-only hotfix vs store binary
 
## Inputs (required)
- `eas.json`, `app.config.ts`, target channel/branch
- Last known-good `updateId` for rollback context
 
## Outputs
- Step checklist with commands
- Risk callouts (credentials, runtimeVersion)
- Verification commands (`eas channel:view`, `npx expo-doctor`)
 
## Guardrails
- Never OTA native-impacting changes without `eas build`
- Never submit to production track without internal QA binary
 
## Stack pin
React 19.2.3 · RN 0.86.0 · Expo SDK 57
 
## Example prompts
See §10 below.
```

* **Inputs** prevent the agent from guessing bundle IDs or missing `runtimeVersion`
* **Outputs** must be **verifiable** - commands, not prose
* **Guardrails** are the highest-value section - agents over-automate store actions without them

---

### 3. When to Invoke vs When to Read Docs

| Situation | Use a skill | Read human docs |
| --- | --- | --- |
| "Scaffold `eas.json` for preview + production" | [EAS Release Skill](https://docs.wahwei/reactnative.codeguides.io/skills/eas-release-skill/) | [Build Profiles & Flavors](https://docs.wahwei/reactnative.codeguides.io/eas-build/build-profiles-and-flavors/) |
| "Add typed route for `/orders/[id]`" | [Expo Router Skill](https://docs.wahwei/reactnative.codeguides.io/skills/expo-router-skill/) | [Typed Routes](https://docs.wahwei/reactnative.codeguides.io/expo-router/typed-routes/) |
| "Write Maestro from acceptance criteria" | [Mobile Testing Skill](https://docs.wahwei/reactnative.codeguides.io/skills/mobile-testing-skill/) | [Maestro E2E](https://docs.wahwei/reactnative.codeguides.io/testing/maestro-e2e/) |
| "Upgrade 56 → 57" | [SDK Upgrade Skill](https://docs.wahwei/reactnative.codeguides.io/skills/sdk-upgrade-skill/) | [SDK Upgrade Policy](https://docs.wahwei/reactnative.codeguides.io/governance/sdk-upgrade-policy/) |
| "Crash spike after OTA" | [Incident Triage Skill](https://docs.wahwei/reactnative.codeguides.io/skills/incident-triage-skill/) | [Rollback Runbook](https://docs.wahwei/reactnative.codeguides.io/ota-updates/rollback-runbook/) |

* Invoke skills at **decision points** where wrong automation is expensive
* Read docs when **learning concepts** - skills assume you want an executable plan now

---

### 4. Inputs the Agent Must Collect

Before executing, a well-written skill forces the agent to gather:

```markdown
## Inputs checklist
- [ ] `package.json` expo/react/react-native versions
- [ ] `app.config.ts` - scheme, bundleId, runtimeVersion policy
- [ ] `eas.json` profiles in scope
- [ ] Target platform(s): ios | android | all
- [ ] CNG mode: generated native dirs vs checked-in ios/android
- [ ] Incident context (if triage): buildNumber, channel, crash-free delta
```

* Missing **bundle ID / applicationId** breaks Maestro and submit skills
* Missing **`runtimeVersion`** breaks OTA skills - see [Runtime Version Policy](https://docs.wahwei/reactnative.codeguides.io/ota-updates/runtime-version-policy/)
* Agents should **paste collected values back** to the human for confirmation before destructive commands

---

### 5. Outputs You Should Expect

A skill run should end with concrete deliverables:

| Output type | Example |
| --- | --- |
| Command sequence | `eas build --profile production --platform all` |
| Config diff | `eas.json` submit profile snippet |
| Test plan | Jest cases + `.maestro/checkout.yml` outline |
| Review checklist | Config plugin idempotency + `expo-doctor` gate |
| Decision tree | OTA rollback vs store hotfix with timestamps |

* **No output = failed skill** - reject agent responses that only summarize docs
* Outputs should reference **verification** - `npx tsc --noEmit`, `npm test`, `eas channel:view`
* For SDK 57, always include **`npx expo-doctor`** when dependencies or plugins change

---

### 6. Guardrails Every Mobile Skill Needs

Copy these defaults into each `SKILL.md`:

```markdown
## Guardrails (SDK 57)
1. Use `npx expo install` - never hand-pin Expo module versions.
2. OTA (`eas update`) only when `runtimeVersion` matches live store binaries.
3. Native module or permission changes require `eas build`, not OTA alone.
4. Never commit secrets - EAS environments and CI secrets only.
5. Run `npx expo-doctor` before merging skill-generated dependency changes.
6. Do not edit generated `ios/` / `android/` under CNG - use config plugins.
7. Pause phased/staged store rollout before hotfix binary when crash storm is live.
```

* Guardrails convert agent enthusiasm into **release-engineering discipline**
* Pair with [Agent Skills Best Practices](https://docs.wahwei/reactnative.codeguides.io/skills/best-practices/) for team-wide rules

---

### 7. SDK 57 Pinning in Skills

Agents default to training-data versions. Pin explicitly:

```markdown
## Stack pin (required)
| Package | Version |
| --- | --- |
| react | 19.2.3 |
| react-native | 0.86.0 |
| expo | ~57.0.4 |
 
## SDK 57 specifics
- New Architecture defaults on RN 0.86 - verify TurboModule skills against NA-enabled builds.
- `experiments.typedRoutes` generates `.expo/types/router.d.ts` - regen after `app/` changes.
- EAS Workflows support `type: maestro` jobs - prefer over ad-hoc shell scripts.
```

* Re-pin skills on **every SDK bump** - stale skills are worse than no skills
* Cross-check agent output with `npx expo-doctor` and `npx expo install --check`

---

### 8. Skill Composition (Don't Duplicate Docs)

Skills **delegate** to human docs; they don't replace them:

```markdown
## References (read, don't rewrite)
- Build: ../eas-build/eas-build-basics/eas-build-basics.md
- Submit: ../eas-build/eas-submit/eas-submit.md
- OTA: ../ota-updates/ota-updates-basics/ota-updates-basics.md
- Router: ../expo-router/typed-routes/typed-routes.md
- Testing: ../testing/jest-setup-for-expo/jest-setup-for-expo.md
```

* Skill output = **plan + commands + gates**
* Doc output = **concepts + edge cases + FAQs**
* Link both directions: skills point to docs; docs can say "invoke X skill for assisted setup"

---

### 9. Verifying Skill Output

After any skill-assisted change:

```bash
# Dependency / native alignment
npx expo-doctor
 
# Type safety (router, TS strict)
npx tsc --noEmit
 
# Unit/component gate
npm run test:ci
 
# Optional E2E smoke (Maestro)
maestro test .maestro/smoke.yml
```

| Check | Catches |
| --- | --- |
| `expo-doctor` | SDK skew, misconfigured plugins, invalid app config |
| `tsc` | Broken typed routes, invalid `Href` |
| Jest | Regressions in business logic the agent refactored |
| Maestro | Navigation and native chrome the agent didn't mock |

* Treat skill output like a **junior engineer PR** - review before merge
* CI should run the same gates - see [CI Quality Gates](https://docs.wahwei/reactnative.codeguides.io/linting-formatting/ci-quality-gates/)

---

### 10. Example Invocation Prompts

**EAS release:**

```text
Use the EAS Release skill. Stack: Expo SDK 57, RN 0.86.
Inputs: eas.json attached, production channel, last good updateId abc123.
Goal: JS hotfix for checkout copy - confirm OTA is safe, then give commands.
Guardrails: no store submit unless doctor fails on native change.
```

**Expo Router:**

```text
Use the Expo Router skill. Add /settings/notifications with typed params.
Enable experiments.typedRoutes. Provide href builder + deep link scheme myapp://.
Run tsc verification steps.
```

**Mobile testing:**

```text
Use the Mobile Testing skill.
Acceptance criteria:
- Guest can add item to cart
- Cart badge shows count
Deliver: 3 Jest tests + 1 Maestro flow. SDK 57, appId com.example.shop.
```

**SDK upgrade:**

```text
Use the SDK Upgrade skill. Upgrade expo 56 → 57.
Produce ordered checklist with expo-doctor gates and breaking-change scan.
Do not skip lockfile regen or prebuild --clean recommendation.
```

**Incident triage:**

```text
Use the Incident Triage skill.
Crash-free dropped 99.2% → 94% after production OTA 30 min ago.
buildNumber 240012, iOS phased at 50%. Decision tree: OTA rollback vs pause vs hotfix binary.
```

---

## FAQs

Are Agent Skills the same as Expo config plugins?

No. Config plugins modify native projects at prebuild. Agent Skills instruct AI assistants how to perform team workflows safely. You may invoke the [Native Module Skill](https://docs.wahwei/reactnative.codeguides.io/skills/native-module-skill/) to *review* a config plugin - different layers.

Should skills live in the app repo or a central registry?

App repo for project-specific `eas.json` and routing conventions. Central registry for org-wide release and incident playbooks. Always pin SDK version in both.

Can one SKILL.md cover the entire mobile stack?

Avoid it. Split by decision domain so guardrails stay sharp. A monolithic skill dilutes OTA vs native boundaries and produces unsafe automation.

Do skills replace on-call runbooks?

No. Skills accelerate drafting checklists and commands. [Incident Triage Skill](https://docs.wahwei/reactnative.codeguides.io/skills/incident-triage-skill/) complements - does not replace - [Store Incident Response](https://docs.wahwei/reactnative.codeguides.io/store-operations/store-incident-response/).

How often should we refresh skills?

Every SDK upgrade, every change to `runtimeVersion` policy, and after any postmortem that reveals a missed guardrail. Run `npx expo-doctor` in the skill's verification section.

## Related

* [EAS Release Skill](https://docs.wahwei/reactnative.codeguides.io/skills/eas-release-skill/) - build, submit, OTA cookbook
* [Expo Router Skill](https://docs.wahwei/reactnative.codeguides.io/skills/expo-router-skill/) - routes, typed params, deep links
* [Mobile Testing Skill](https://docs.wahwei/reactnative.codeguides.io/skills/mobile-testing-skill/) - Jest + Maestro from AC
* [SDK Upgrade Skill](https://docs.wahwei/reactnative.codeguides.io/skills/sdk-upgrade-skill/) - Expo 57 upgrade checklist
* [Incident Triage Skill](https://docs.wahwei/reactnative.codeguides.io/skills/incident-triage-skill/) - crash clusters and rollback tree
* [Agent Skills Best Practices](https://docs.wahwei/reactnative.codeguides.io/skills/best-practices/) - 25-item team summary
* [EAS Build Basics](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-build-basics/) - human reference for builds
* [Mobile Testing Basics](https://docs.wahwei/reactnative.codeguides.io/testing/mobile-testing-basics/) - testing pyramid

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
