# Tech Lead Basics on Mobile

Balancing **ship velocity** with **store-review risk** on Expo SDK 57 teams. Mobile tech leads own the **release clock map** - when OTA is enough, when a store build is mandatory, and when product dates must yield to Apple or Google policy.

Highlights / Tech Lead Basics on Mobile

* Three clocks: OTA (minutes), store binary (days), backend API - leads own the dependency map
* Velocity without guardrails ships store rejections and rollback weekends
* Classify every change: JS-only, native-impacting, policy-sensitive - before promising a date
* Risk budget: one store submit per sprint unless incident lane is pre-approved
* Preview builds on PRs catch native drift; Expo Go alone hides custom native modules
* Protect main with CI gates - speed comes from small PRs, not skipped checks

## Recipe

> Quick-reference lead card - paste into sprint planning or release retro.

```text
Change classification (every ticket):
  [ ] JS-only, same runtimeVersion     → OTA candidate
  [ ] Native module / plugin / permission → eas build required
  [ ] Store policy (payments, UGC, health) → legal + review buffer
  [ ] Backend contract change            → coordinate Clock C first
 
Velocity rules:
  - PRs < 400 lines when possible - review same day
  - UI PRs include iOS + Android screenshot or recording
  - No Friday store submit without Monday rollback owner
  - One incident hotfix lane documented in CONTRIBUTING.md
```

```bash
# Before promising "ship tomorrow"
npx expo-doctor
eas build:list --limit 3          # last binary age + runtimeVersion
eas channel:list                  # production channel ↔ runtimeVersion
git diff main -- package.json app.config.ts eas.json
```

**When to reach for this:**

* You are the default decision-maker on release path (OTA vs store) and review throughput.
* Product asks for a date before engineering classifies native impact.
* Crash rate or store rejection rate is climbing while PR velocity stays high.
* Onboarding a new squad lead onto an existing EAS + Expo Router app.

## Working Example

### Sprint planning - classify the backlog

| Ticket | Ship path | Review risk | Lead call |
| --- | --- | --- | --- |
| Copy fix on checkout | OTA → `production` | Low | Ship after QA on staging channel |
| New `expo-camera` scan flow | Store binary | Medium - camera permission strings | Build preview Mon; submit Wed |
| In-app subscription UI | Store binary | **High** - IAP guidelines | Pair with [App Store Review Guidelines](https://docs.wahwei/reactnative.codeguides.io/ios-platform/app-store-review-guidelines/); +3 day buffer |
| Backend required field | OTA **after** API live | Medium - old binaries | Backend prod Tue; OTA Wed with flag off |
| SDK 57 → 58 bump | Store binary | High - regression surface | Dedicated sprint; no feature coupling |

Document the table in the sprint ticket or release notes - "we'll OTA it" without classification is how teams ship broken `runtimeVersion` pairings.

### Release decision tree

```text
Need to ship a fix?
  │
  ├─ Touches ios/, android/, app.config plugins, native deps?
  │    └─ YES → eas build + submit (Clock A). OTA cannot help.
  │
  ├─ JS/TS/assets only AND runtimeVersion unchanged on live binary?
  │    └─ YES → eas update on channel (Clock B). Rollback in minutes.
  │
  └─ Store policy change (login, payments, medical claims)?
       └─ YES → review checklist + human review buffer before submit.
```

```json
// eas.json - separate profiles so velocity does not shortcut production credentials
{
  "build": {
    "preview": {
      "distribution": "internal",
      "channel": "preview"
    },
    "production": {
      "channel": "production",
      "autoIncrement": true
    }
  }
}
```

### Review throughput without skipping gates

```yaml
# .github/workflows/pr.yml - fast feedback, same gates as main
name: PR checks
on: pull_request
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm" }
      - run: npm ci
      - run: npx expo-doctor
      - run: npm run lint && npm run typecheck && npm test
```

* **Small PRs** merge faster than heroic review marathons - split native config from UI when possible.
* **Named reviewers** for `app.config.ts`, `eas.json`, and `plugins/` - not drive-by approval.
* **Preview label** triggers EAS preview build - see [Preview Builds on PRs](https://docs.wahwei/reactnative.codeguides.io/cicd/preview-builds-on-prs/).

### Store-review risk budget

```markdown
## Release risk ledger - sprint 24
 
| Risk spent | Item | Outcome |
| --- | --- | --- |
| 1 unit | IAP copy change | Approved day 2 |
| 1 unit | New photo upload (UGC) | Rejected - missing moderation ADR |
| 0 (OTA) | Button color | Shipped same day |
 
Budget: 2 store submits / sprint. Over budget → defer to next train or OTA-only week.
```

Leads track **rejections as process debt** - each rejection costs more calendar time than an extra day of QA. Pair with [Release Train Calendar](https://docs.wahwei/reactnative.codeguides.io/cicd/release-train-calendar/) for the three-clock model.

### When to slow down velocity

| Signal | Lead action |
| --- | --- |
| Crash-free rate drops after OTA | Roll back channel; freeze OTA until root cause |
| `expo-doctor` warnings in CI | Block merge - skew becomes Friday fire |
| Reviewer skips device evidence on UI PR | Reinstate screenshot rule from [Pairing & Mob on Mobile](https://docs.wahwei/reactnative.codeguides.io/team/pairing-and-mob-on-mobile/) |
| Product wants Friday submit + new native module | Renegotiate date or descope native - not both |
| Two squads ship conflicting `app.config` plugins | Architecture sync - see [Mobile Architecture Basics](https://docs.wahwei/reactnative.codeguides.io/architecture-design/mobile-architecture-basics/) |

## Gotchas

* **"We'll hotfix with OTA" after adding a native package** - OTA does not ship Hermes bytecode for new `.so` / framework linkage. **Fix:** Rebuild binary; communicate delay early.
* **Expo Go green, dev client red** - Juniors demo in Go; production uses custom native modules. **Fix:** Preview build in Definition of Done for native-touching work.
* **Velocity = skipping typecheck** - Merged `any` and broken routes compound into review-week refactors. **Fix:** Same CI on PR and main; no admin bypass.
* **Single approver on store metadata** - Wrong privacy nutrition label triggers rejection unrelated to code quality. **Fix:** Checklist row for App Store Connect / Play Console fields.
* **Backend deploy after mobile** - New required JSON field bricks old app versions. **Fix:** Tolerant readers first; see release train dependency matrix.

## Alternatives

| Approach | Use When | Don't Use When |
| --- | --- | --- |
| OTA-first culture | Mature `runtimeVersion` discipline; few native changes | Team frequently adds native modules |
| Store train only (no OTA) | Regulated apps banning remote JS | You need same-day copy fixes |
| Feature flags + OTA | Decouple binary live from feature visible | Flag system itself needs governance |
| Code freeze weeks | Major SDK upgrade or holiday moratorium | Every sprint - trains stop moving |

## FAQs

How do I explain OTA vs store to product in one sentence?

**OTA** updates JavaScript on the binary users already installed - minutes to rollback. **Store** ships a new installable app - required for native changes and the only path for new users on old OS versions.

What is a healthy PR merge rate for a 6-person mobile squad?

Aim for **2–4 merged PRs per engineer per week**, mostly under 400 lines. One store release every 2–4 weeks plus OTA in between beats daily mega-merges.

Should the tech lead review every PR?

No - you review **architecture boundaries**, **native config**, and **release PRs**. Delegate feature PRs to mids; audit checklist compliance weekly.

When is Friday store submit acceptable?

When Monday **rollback owner** is named, OTA rollback path is tested, and the change is not a first-time policy-sensitive feature (IAP, health, kids category).

How does this relate to web tech lead habits?

Web leads optimize deploy frequency; mobile leads optimize **clock alignment** and **review risk**. Continuous deploy does not exist for Clock A - plan accordingly.

## Related

* [Release Train Calendar](https://docs.wahwei/reactnative.codeguides.io/cicd/release-train-calendar/) - three clocks and dependency matrix
* [Architecture Decision Records](https://docs.wahwei/reactnative.codeguides.io/tech-leadership/architecture-decision-records/) - OTA vs store ADR template
* [Code Review Standards for RN](https://docs.wahwei/reactnative.codeguides.io/tech-leadership/code-review-standards-for-rn/) - perf, a11y, native checklist
* [Mobile Architecture Basics](https://docs.wahwei/reactnative.codeguides.io/architecture-design/mobile-architecture-basics/) - boundaries that keep PRs small
* [Onboarding Basics](https://docs.wahwei/reactnative.codeguides.io/team/onboarding-basics/) - day-one setup before velocity pressure
* [App Store Review Guidelines](https://docs.wahwei/reactnative.codeguides.io/ios-platform/app-store-review-guidelines/) - rejection prevention
* [OTA Updates Basics](https://docs.wahwei/reactnative.codeguides.io/ota-updates/ota-updates-basics/) - Clock B constraints

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
