# Structured Logging On Device

Batching structured logs on device and **shipping on next foreground** (and on background flush). Mobile networks are unreliable; per-line streaming wastes battery. This cookbook builds a small buffer you own before adopting Datadog or a custom ingest API.

Highlights / Structured Logging On Device

* Structured logs are JSON lines with stable keys - grep-friendly in any backend
* Buffer on device; ship batches on foreground and before background - not per log line
* Cap buffer size and drop verbose levels first - unbounded logs OOM low-RAM Android
* Attach release, OTA id, sessionId, and route to every batch header
* Never persist access tokens or PII in log payloads - hash user ids
* Pair with crash reporters - logs uploaded on prior foreground explain native crashes

## Prerequisites

```bash
npx expo install @react-native-async-storage/async-storage expo-application expo-updates
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**.

---

## Recipe

> Quick-reference recipe card - copy-paste ready.

**1. Log schema**

```ts
// src/logging/types.ts
export type LogLevel = "debug" | "info" | "warn" | "error";
 
export type StructuredLog = {
  ts: string;              // ISO-8601
  level: LogLevel;
  event: string;           // stable snake_case name: feed_fetch_failed
  message?: string;
  data?: Record<string, string | number | boolean | null>;
};
 
export type LogBatchHeader = {
  sessionId: string;
  release: string;
  otaUpdateId: string;
  route?: string;
  platform: "ios" | "android";
};
```

**2. Ring buffer with persistence**

```ts
// src/logging/buffer.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StructuredLog } from "./types";
 
const STORAGE_KEY = "log_buffer_v1";
const MAX_LOGS = 200;
 
let memory: StructuredLog[] = [];
 
export async function appendLog(entry: StructuredLog) {
  memory.push(entry);
  if (memory.length > MAX_LOGS) {
    memory = memory.slice(-MAX_LOGS);
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
}
 
export async function drainLogs(): Promise<StructuredLog[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const logs: StructuredLog[] = raw ? JSON.parse(raw) : memory;
  memory = [];
  await AsyncStorage.removeItem(STORAGE_KEY);
  return logs;
}
```

**3. Logger facade**

```ts
// src/logging/logger.ts
import type { LogLevel, StructuredLog } from "./types";
import { appendLog } from "./buffer";
 
function write(level: LogLevel, event: string, data?: StructuredLog["data"], message?: string) {
  const entry: StructuredLog = {
    ts: new Date().toISOString(),
    level,
    event,
    message,
    data,
  };
  if (__DEV__) console[level === "debug" ? "log" : level](event, data ?? {});
  void appendLog(entry);
}
 
export const logger = {
  debug: (event: string, data?: StructuredLog["data"]) => write("debug", event, data),
  info: (event: string, data?: StructuredLog["data"]) => write("info", event, data),
  warn: (event: string, data?: StructuredLog["data"]) => write("warn", event, data),
  error: (event: string, data?: StructuredLog["data"], message?: string) =>
    write("error", event, data, message),
};
```

**4. Ship on foreground**

```tsx
// src/logging/useLogShipping.ts
import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import * as Application from "expo-application";
import * as Updates from "expo-updates";
import { drainLogs } from "./buffer";
import { getSessionId } from "@/observability/session";
 
async function shipBatch(route?: string) {
  const logs = await drainLogs();
  if (logs.length === 0) return;
 
  const header = {
    sessionId: await getSessionId(),
    release: `${Application.nativeApplicationVersion}+${Application.nativeBuildVersion}`,
    otaUpdateId: Updates.updateId ?? "embedded",
    route,
    platform: require("react-native").Platform.OS,
  };
 
  await fetch(`${process.env.EXPO_PUBLIC_API_URL}/v1/logs/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ header, logs }),
  });
}
 
export function useLogShipping(route?: string) {
  const appState = useRef(AppState.currentState);
 
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === "active") {
        void shipBatch(route);
      }
      if (next === "background") {
        void shipBatch(route); // flush before suspend - may not complete on iOS
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [route]);
}
```

**When to reach for this:**

* You need **offline-tolerant** telemetry without blocking UI on every `fetch`
* Native crashes wipe in-memory state - persisted buffers from the **previous session** explain last actions
* You want vendor-neutral JSON before committing to Datadog / CloudWatch / custom ELK
* API failures need structured `event` names for dashboards - not unstructured `console.log`

---

## Working Example

Wire shipping at the app shell with auth-safe fields and sampling.

```tsx
// app/_layout.tsx
import { Stack } from "expo-router";
import { usePathname } from "expo-router";
import { useLogShipping } from "@/logging/useLogShipping";
 
export default function RootLayout() {
  const pathname = usePathname();
  useLogShipping(pathname);
  return <Stack />;
}
```

```ts
// src/api/client.ts - structured API errors
import { logger } from "@/logging/logger";
 
export async function apiGet<T>(path: string): Promise<T> {
  const start = Date.now();
  try {
    const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}${path}`);
    if (!res.ok) {
      logger.warn("api_request_failed", {
        path,
        status: res.status,
        durationMs: Date.now() - start,
      });
      throw new Error(`HTTP ${res.status}`);
    }
    logger.info("api_request_ok", { path, durationMs: Date.now() - start });
    return res.json();
  } catch (err) {
    logger.error("api_request_error", { path, durationMs: Date.now() - start });
    throw err;
  }
}
```

```ts
// Auth events - no tokens
import { logger } from "@/logging/logger";
 
export function logAuthEvent(event: "login_success" | "logout" | "refresh_failed", userId?: string) {
  logger.info(event, { userId: userId ? hashId(userId) : null });
}
 
function hashId(id: string) {
  return id.slice(0, 8) + "…"; // replace with real hash in production
}
```

---

## Batching Rules

| Rule | Rationale |
| --- | --- |
| **Max 200 lines** per device | Prevents AsyncStorage bloat on chatty screens |
| **Drop `debug` first** when over capacity | Keeps `error` and `warn` under pressure |
| **Ship on foreground** | Network usually available; user expects brief sync |
| **Ship on background** | Best-effort before suspend - iOS may kill task |
| **Idempotent ingest** | Server dedupes by `sessionId` + `ts` + `event` |

```ts
// src/logging/buffer.ts - drop debug when trimming
function trim(logs: StructuredLog[]) {
  if (logs.length <= MAX_LOGS) return logs;
  const errors = logs.filter((l) => l.level !== "debug");
  return errors.slice(-MAX_LOGS);
}
```

---

## Correlation with Crashes and Traces

```ts
// Include the same ids Sentry and OTel use
logger.info("checkout_started", {
  sessionId,
  release,
  otaUpdateId: Updates.updateId,
  traceId, // from opentelemetry-on-mobile when enabled
});
```

* Logs **without** shared ids are orphan narratives - always copy `sessionId` from [Observability Basics](https://docs.wahwei/reactnative.codeguides.io/observability/observability-basics/)
* Upload batches **before** heavy crash reproduction attempts - device logs rotate quickly
* For [Performance Monitoring](https://docs.wahwei/reactnative.codeguides.io/observability/performance-monitoring/), log slow spans as `warn` when duration exceeds budget

---

## Privacy and Retention

* **No** emails, names, free-text user input, or card data in `data`
* Hash or truncate **user ids** - align with [Analytics & Privacy](https://docs.wahwei/reactnative.codeguides.io/observability/analytics-and-privacy/) retention policy
* Server-side retention: 30–90 days for mobile client logs unless compliance requires longer
* Honor **logout** by rotating `sessionId` and draining the buffer - see [Mobile Auth Basics](https://docs.wahwei/reactnative.codeguides.io/auth-session/mobile-auth-basics/)

---

## FAQs

Why not log directly to the cloud from the device?

* Per-line HTTPS on every tap drains battery and fails offline.
* Batching amortizes TLS handshakes and survives brief offline windows.

Does AsyncStorage survive native crashes?

* Usually yes for writes that completed - last logs may explain the prior session.
* In-memory-only buffers are lost on every native crash.

Should I use console.log in production?

* `console` in release builds is often stripped or ignored.
* Structured logger writes to buffer **and** optional dev console.

How does this relate to Sentry breadcrumbs?

* Breadcrumbs ride with crash events - small ring, crash-time only.
* Structured logs are a **durable, queryable** stream - ship both, duplicate sparingly.

## Related

* [Observability Basics](https://docs.wahwei/reactnative.codeguides.io/observability/observability-basics/) - session and release context
* [Sentry for React Native](https://docs.wahwei/reactnative.codeguides.io/observability/sentry-for-react-native/) - breadcrumbs vs batched logs
* [OpenTelemetry on Mobile](https://docs.wahwei/reactnative.codeguides.io/observability/opentelemetry-on-mobile/) - trace id in log payloads
* [Performance Basics](https://docs.wahwei/reactnative.codeguides.io/performance/performance-basics/) - log slow paths against TTI budgets
* [OTA Updates Basics](https://docs.wahwei/reactnative.codeguides.io/ota-updates/ota-updates-basics/) - tag batches with update id
* [Refresh Token Rotation](https://docs.wahwei/reactnative.codeguides.io/auth-session/refresh-token-rotation/) - log auth failures without secrets

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

383k393a3c3q3e393a3o1r3e3k3x383c3e3k221u1x3x1v1t1v1z1t20

Reviewed by Chris St. John·Last updated Jul 19, 2026
