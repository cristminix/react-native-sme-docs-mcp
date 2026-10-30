# Preview Builds on PRs

A cookbook for **QR distribution** of EAS preview builds on pull requests - so design and QA review on **real devices** before merge.

Highlights / Preview Builds on PRs

* Preview profile produces internal-distribution binaries - install via QR, not the public store
* Label-gated or path-filtered triggers keep EAS credits under control
* expo-github-action or EAS Workflows both work - post install URL as PR comment
* Android APK previews install without Play Console; iOS uses ad hoc or simulator builds
* Pair preview builds with Maestro smoke when native navigation changed
* Document which PRs need previews - designers add a label, not every typo

## Recipe

> Quick-reference recipe card - copy-paste ready.

```json
// eas.json - preview profile
{
  "build": {
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "android": { "buildType": "apk" },
      "ios": { "simulator": false }
    }
  }
}
```

```yaml
# .github/workflows/preview-pr.yml
name: Preview Build
on:
  pull_request:
    types: [labeled]
 
jobs:
  preview:
    if: contains(github.event.pull_request.labels.*.name, 'needs-preview')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: npm ci
      - id: build
        run: |
          eas build --profile preview --platform android --non-interactive --json > build.json
          echo "url=$(jq -r '.[0].artifacts.buildUrl' build.json)" >> $GITHUB_OUTPUT
      - uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## 📱 Preview build\n\nInstall: ${{ steps.build.outputs.url }}\n\nScan QR on device or open link.`
            })
```

**When to reach for this:**

* Native navigation, gestures, or camera flows designers must see on hardware.
* QA sign-off before merge on features that Jest cannot cover.
* Cross-platform UI review when web Storybook is not enough.
* Stakeholder demos without waiting for nightly or release train.

## Working Example

**Project layout:**

```text
your-expo-app/
  .github/workflows/preview-pr.yml
  .eas/workflows/preview-pr.yml   # optional EAS-native alternative
  eas.json
  app.json
```

### eas.json profiles

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "env": {
        "APP_VARIANT": "preview"
      },
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": false
      }
    },
    "preview-simulator": {
      "distribution": "internal",
      "ios": { "simulator": true },
      "android": { "buildType": "apk" }
    }
  }
}
```

```ts
// app.config.ts - optional variant banner
const IS_PREVIEW = process.env.APP_VARIANT === "preview";
 
export default {
  expo: {
    name: IS_PREVIEW ? "MyApp (Preview)" : "MyApp",
    // ...
  },
};
```

### GitHub Actions - comment with install link

```yaml
name: Preview on PR
on:
  pull_request:
    types: [opened, synchronize, labeled]
 
concurrency:
  group: preview-${{ github.event.pull_request.number }}
  cancel-in-progress: true
 
jobs:
  preview:
    if: contains(github.event.pull_request.labels.*.name, 'needs-preview')
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: npm ci
      - run: npm run typecheck
      - name: EAS preview build
        id: eas
        run: |
          eas build \
            --profile preview \
            --platform android \
            --non-interactive \
            --json > build-output.json
          BUILD_URL=$(jq -r '.[0].artifacts.buildUrl // .artifacts.buildUrl' build-output.json)
          QR_URL=$(jq -r '.[0].artifacts.applicationArchiveUrl // empty' build-output.json)
          echo "build_url=$BUILD_URL" >> $GITHUB_OUTPUT
      - name: Comment on PR
        uses: actions/github-script@v7
        with:
          script: |
            const url = '${{ steps.eas.outputs.build_url }}';
            const body = [
              '## 📱 Android preview build',
              '',
              `**Install:** ${url}`,
              '',
              '1. Open the link on your Android device',
              '2. Scan the QR code or download the APK',
              '3. Allow install from unknown sources if prompted (internal testing only)',
              '',
              '_Built from commit `${{ github.sha }}` with profile `preview`._'
            ].join('\n');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body
            });
```

### EAS Workflows alternative

```yaml
# .eas/workflows/preview-pr.yml
name: Preview PR
on:
  pull_request:
    types: [labeled]
 
jobs:
  quality:
    if: ${{ github.event.pull_request.labels.*.name contains 'needs-preview' }}
    steps:
      - uses: eas/checkout
      - uses: eas/install_node_modules
      - run: npm run typecheck
 
  build_preview:
    needs: [quality]
    type: build
    params:
      platform: android
      profile: preview
```

Trigger manually when testing:

```bash
npx eas-cli@latest workflow:run .eas/workflows/preview-pr.yml
```

**What this demonstrates:**

* **`distribution: internal`** - EAS hosts install page with QR ([Internal Distribution](https://docs.wahwei/reactnative.codeguides.io/eas-build/internal-distribution/)).
* **`buildType: apk`** on Android - sideload without Play internal track.
* **Label gate** - only PRs with `needs-preview` spend build credits.
* **PR comment** - QA and design get link without digging in EAS dashboard.
* **Concurrency** - latest push cancels stale preview for same PR number.

## Deep Dive

### Who Installs What

| Platform | Preview profile | Installer | Best for |
| --- | --- | --- | --- |
| Android | `apk` + internal | QR / APK link | QA on physical devices |
| iOS device | ad hoc / internal | QR via EAS | Registered UDIDs |
| iOS | `simulator: true` | `.app` tar | Designer on Mac simulator |
| Both | + `channel: preview` | + optional `eas update` | JS hotfix on same preview binary |

### Trigger Strategies

```yaml
# Label-gated (recommended)
if: contains(github.event.pull_request.labels.*.name, 'needs-preview')
 
# Path-filter - native-impacting changes only
on:
  pull_request:
    paths:
      - "app/**"
      - "src/**"
      - "app.config.ts"
      - "plugins/**"
```

| Strategy | Credit cost | Risk |
| --- | --- | --- |
| Every PR push | High | Best coverage |
| Label `needs-preview` | Low | Requires discipline |
| Path filter | Medium | Misses shared package changes if filter too narrow |

Document in `CONTRIBUTING.md`:

```markdown
## Preview builds
Add label `needs-preview` when QA or design needs a device build.
Do **not** add for copy-only or test-only changes.
```

### OTA on Preview Channel

After the preview binary exists, JS fixes can ship without rebuilding:

```bash
eas update --channel preview --message "PR-${{ github.event.pull_request.number }}"
```

* Preview binary must match `runtimeVersion` - [Runtime Version Policy](https://docs.wahwei/reactnative.codeguides.io/ota-updates/runtime-version-policy/)
* Comment on PR when OTA lands so QA refreshes the bundle
* Native changes still need a new preview build

### Pair with Maestro Smoke

When navigation changes, run a thin Maestro flow on the preview `build_id` before merge:

```yaml
  maestro_smoke:
    needs: [build_preview]
    type: maestro
    params:
      build_id: ${{ needs.build_preview.outputs.build_id }}
      flow_path: [".maestro/smoke.yml"]
```

* Fail the PR check if smoke fails - optional but valuable for routing refactors
* Keep smoke to 3–5 steps - [Maestro E2E](https://docs.wahwei/reactnative.codeguides.io/testing/maestro-e2e/)

## Gotchas

* **Preview on every commit** - EAS credit exhaustion by mid-sprint. **Fix:** Label gate + concurrency cancel.
* **iOS preview without registered devices** - Ad hoc build installs nowhere. **Fix:** Maintain device list in Apple Developer portal or use simulator profile for designers.
* **QA tests Expo Go** - Bundle ID and native modules differ from preview build. **Fix:** Always distribute the EAS artifact link.
* **Stale PR comment** - Old install link after rebase. **Fix:** Edit comment or post new comment per build; include `github.sha` in body.
* **Production credentials on preview profile** - Accidental store signing on feature branch. **Fix:** Separate `preview` profile without `autoIncrement` production keys.
* **Missing `pull-requests: write` permission** - Comment step fails silently or errors. **Fix:** Add `permissions` block in workflow.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| EAS internal distribution QR | Default for device QA | You need Play internal track phased rollout |
| `eas update` on preview channel | JS-only PR tweaks | New native module added |
| TestFlight external + PR number | iOS-heavy team already on ASC | Fast Android APK feedback needed |
| Screenshot tests only | Pure layout/copy | Gestures, camera, haptics |

## FAQs

How does QA install on Android?

Open the EAS build page link from the PR comment → scan QR → install APK. Enable "install unknown apps" for the browser if prompted.

Can I build iOS and Android in one PR job?

```bash
eas build --profile preview --platform all --non-interactive
```

Costs two builds; comment both links or build Android-only for faster feedback.

How do designers get iOS preview without UDIDs?

Use `preview-simulator` profile - download simulator build; designer runs on Xcode simulator.

Should preview use a different API?

Set `env.API_URL` in preview profile to staging - never point preview builds at production write APIs.

## Related

* [GitHub Actions + EAS](https://docs.wahwei/reactnative.codeguides.io/cicd/github-actions-plus-eas/) - secrets and expo-github-action
* [EAS Workflows](https://docs.wahwei/reactnative.codeguides.io/cicd/eas-workflows/) - preview tier checklist items
* [Internal Distribution](https://docs.wahwei/reactnative.codeguides.io/eas-build/internal-distribution/) - ad hoc and enterprise tracks
* [Build Profiles & Flavors](https://docs.wahwei/reactnative.codeguides.io/eas-build/build-profiles-and-flavors/) - preview vs production
* [Mobile Testing Basics](https://docs.wahwei/reactnative.codeguides.io/testing/mobile-testing-basics/) - what previews complement
* [Maestro E2E](https://docs.wahwei/reactnative.codeguides.io/testing/maestro-e2e/) - smoke on preview build\_id
* [Mobile CI/CD Basics](https://docs.wahwei/reactnative.codeguides.io/cicd/mobile-ci-cd-basics/) - PR checks vs preview builds

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
