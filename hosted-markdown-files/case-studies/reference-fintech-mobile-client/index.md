# Reference: Fintech Mobile Client

A composite reference for a **retail banking / wealth-lite** mobile client - balances, transfers, statements, card controls. Security and compliance constraints dominate architecture. Stack: **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, **React 19.2.3**.

Highlights / Reference: Fintech Mobile Client

* OAuth PKCE via expo-auth-session - no client secrets in the mobile bundle
* Refresh tokens in SecureStore; access tokens in memory with proactive refresh
* Biometric step-up before transfers - not a substitute for secure storage
* Certificate pinning adopted with SPKI backup pins and rotation ADR
* Immutable client audit trail - who, what, when, device attestation level
* OTA cannot change pins or native payment SDK - store train for native bumps

## Context

**Regulatory and security drivers:**

* PCI-aligned mobile practices: no PAN in logs, screenshot policy on CVV flows, session idle timeout.
* Security team mandates **certificate pinning** for API and attestation endpoints.
* **Audit trail** required for authentication events, transfer confirmations, and policy overrides.
* Biometric unlock for app open; **step-up** biometric before wire transfers above threshold.

**Release model:** Store binaries monthly; **no production OTA** for this client (compliance chose artifact-only JS delivery via store). Preview channel OTA used for internal QA only.

---

## Architecture

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                     Fintech client - security architecture                  │
├────────────────────────────────────────────────────────────────────────────┤
│  Expo Router                                                               │
│    (auth)/login, (auth)/device-trust                                       │
│    (app)/(tabs)/accounts|transfer|more                                     │
│    (app)/transfer/confirm  ← biometric gate + audit event                │
├────────────────────────────────────────────────────────────────────────────┤
│  Auth layer                                                                │
│    expo-auth-session (PKCE) → code exchange → SecureStore refresh          │
│    AuthProvider: bootstrapping → authenticated | session_expired           │
│    AppState foreground refresh - Auth Session Lifecycle                    │
├────────────────────────────────────────────────────────────────────────────┤
│  Transport                                                                 │
│    api/client.ts → assertHttps → native TLS pin validator (release only)   │
│    Certificate Pinning config plugin - primary + backup SPKI hashes        │
├────────────────────────────────────────────────────────────────────────────┤
│  Step-up                                                                   │
│    expo-local-authentication before high-risk mutations                    │
│    Server records step-up timestamp - client emits audit event             │
├────────────────────────────────────────────────────────────────────────────┤
│  Audit pipeline                                                            │
│    audit.log(event) → batch queue → POST /audit (signed payload)           │
│    Sentry scrubbed - no tokens, no account numbers in breadcrumbs          │
├────────────────────────────────────────────────────────────────────────────┤
│  Release                                                                   │
│    EAS Build production only; eas update disabled on production channel    │
│    Native payment SDK + pin set versioned with store semver                │
└────────────────────────────────────────────────────────────────────────────┘
```

**Authentication flow:**

```text
Cold start → SecureStore read refresh → silent refresh
  ├─ success → (app) tabs
  ├─ fail → (auth)/login → OAuth PKCE → store refresh → audit: LOGIN_SUCCESS
  └─ device risk elevated → (auth)/device-trust → audit: DEVICE_CHALLENGE
```

**Transfer flow (high risk):**

```text
User confirms amount → LocalAuthentication.authenticateAsync()
  ├─ fail → audit: STEP_UP_FAILED, remain on screen
  └─ success → POST /transfers + Idempotency-Key → audit: TRANSFER_INITIATED
```

> **Related:** [Security Rules for Mobile](https://docs.wahwei/reactnative.codeguides.io/expo-rules/security-rules-for-mobile/) - minimum bar before store submission

---

## Recipe

> Quick-reference security stack on SDK 57 - complete ADR checklist before pinning.

```bash
npx create-expo-app@latest AcmeBank --template default@sdk-57
npx expo install expo-auth-session expo-secure-store expo-local-authentication
# Pinning: config plugin + dev-client rebuild - not Expo Go
eas build --profile preview --platform all
```

```ts
// src/audit/auditLog.ts (excerpt) - structured, no PII in message body
type AuditEvent =
  | { type: "LOGIN_SUCCESS"; deviceId: string }
  | { type: "STEP_UP_FAILED"; reason: string }
  | { type: "TRANSFER_INITIATED"; transferId: string; amountBucket: string };
 
export function auditLog(event: AuditEvent) {
  const entry = {
    ...event,
    at: new Date().toISOString(),
    appVersion: Application.nativeApplicationVersion,
    sdk: "57",
  };
  queueForUpload(entry); // flush on foreground + before transfer POST
}
```

```text
Pinning ADR must include:
  1. Threat model (rogue CA, captive portal - not "prevent reverse engineering")
  2. Primary + backup SPKI pins
  3. 30-day cert renewal alerts
  4. Corporate MITM bypass policy (usually: no bypass - document help desk script)
  5. Native rebuild path when pins rotate
```

---

## Decisions Made

| # | Decision | Choice | Rationale |
| --- | --- | --- | --- |
| 1 | OAuth | **PKCE via expo-auth-session** | Mobile public client - no embedded client secret - [Auth Session Lifecycle](https://docs.wahwei/reactnative.codeguides.io/auth-session/auth-session-lifecycle/) |
| 2 | Token storage | **SecureStore refresh; memory access** | Tier 2 security rules; AsyncStorage grep-zero policy |
| 3 | Pinning | **Native SPKI pinning with backup pin** | Threat model included rogue CA; rotation runbook owned by security ops - [Certificate Pinning](https://docs.wahwei/reactnative.codeguides.io/networking-api/certificate-pinning/) |
| 4 | Biometrics | **Step-up for transfers; app unlock optional** | Biometrics gate UI, not storage - [Biometrics with LocalAuthentication](https://docs.wahwei/reactnative.codeguides.io/auth-session/biometrics-with-localauthentication/) |
| 5 | OTA | **Disabled on production channel** | Compliance required binary provenance; preview OTA for QA only - [Release & OTA Rules](https://docs.wahwei/reactnative.codeguides.io/expo-rules/release-and-ota-rules/) |
| 6 | Audit trail | **Client event queue + server immutability** | Device emits structured events; server is legal record |
| 7 | Jailbreak/root | **Risk signal → limited features** | No hard crash; audit `DEVICE_RISK_ELEVATED` - security rules Tier 4 |
| 8 | Logging | **Sentry with Authorization scrubber** | Test crash payload review in staging mandatory |
| 9 | Deep links | **No tokens in URLs** | Push opens `/accounts/[id]` - exchange short-lived server nonce - [Expo Linking API](https://docs.wahwei/reactnative.codeguides.io/deep-linking/expo-linking-api/) |

**Rejected alternatives:**

* **Pinning via JS-only fetch** - not possible on managed path; native module required.
* **AsyncStorage session cache** - failed internal audit in week three.
* **OTA for fraud-rule JS** - compliance required store submission hash for material risk logic.

---

## Outcomes

Internal launch on SDK 57 after migrating from SDK 55 (incremental path through 56 - see SDK upgrade case study).

| Control | Result |
| --- | --- |
| **Pen test findings (mobile)** | 0 critical after pinning + SecureStore migration |
| **Audit completeness** | 99.2% client events matched server ingest (gaps from offline queue - flushed on reconnect) |
| **Pin rotation drill** | Backup pin saved 48-hour outage window during primary cert renewal |
| **Biometric step-up opt-in** | 87% enabled; fallback PIN path audited |
| **False lockouts (root detect)** | <0.3% - degraded mode instead of crash |

One incident: engineer shipped debug `rejectUnauthorized: false` - CI grep rule added per [Security Rules for Mobile](https://docs.wahwei/reactnative.codeguides.io/expo-rules/security-rules-for-mobile/) #17.

---

## Lessons

1. **File pinning ADR before writing native code.** Rotation without backup pins bricks production until store approval - drill quarterly.
2. **Audit events are not analytics.** Separate pipeline, stricter retention, no third-party SDK sampling.
3. **Step-up timestamp must reach server.** Client-only biometric success is not evidence for disputes.
4. **OTA policy is a compliance decision, not a velocity decision.** This client chose store-only production; B2C SaaS sibling case study chose OTA - both valid with documentation.
5. **SecureStore migration is a release, not a refactor.** One-time AsyncStorage → SecureStore path ran before enabling refresh-on-resume.
6. **Annotate SDK 57 in audit payloads.** Fraud ops correlates behavior with `expo` and Hermes versions during incident review.

---

## Related

* [Security Rules for Mobile](https://docs.wahwei/reactnative.codeguides.io/expo-rules/security-rules-for-mobile/) - tiered checklist
* [Certificate Pinning](https://docs.wahwei/reactnative.codeguides.io/networking-api/certificate-pinning/) - threat model and cost
* [SecureStore and Keychain/Keystore](https://docs.wahwei/reactnative.codeguides.io/auth-session/securestore-and-keychain-keystore/) - token storage
* [Auth Session Lifecycle](https://docs.wahwei/reactnative.codeguides.io/auth-session/auth-session-lifecycle/) - AppState refresh
* [Biometrics with LocalAuthentication](https://docs.wahwei/reactnative.codeguides.io/auth-session/biometrics-with-localauthentication/) - step-up flows
* [Observability Basics](https://docs.wahwei/reactnative.codeguides.io/observability/observability-basics/) - scrubbed crash reporting
* [EAS Submit](https://docs.wahwei/reactnative.codeguides.io/eas-build/eas-submit/) - store release train
* [Reference: B2C Expo SaaS App](https://docs.wahwei/reactnative.codeguides.io/case-studies/reference-b2c-expo-saas-app/) - contrasting OTA-heavy architecture

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

3730363230327c3236396f6967637c6f692e73656469756765646f63

Reviewed by Chris St. John·Last updated Jul 19, 2026
