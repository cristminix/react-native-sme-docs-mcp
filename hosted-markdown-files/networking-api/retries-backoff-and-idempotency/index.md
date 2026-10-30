# Retries, Backoff & Idempotency

Resilient calls on flaky LTE and subway mode - when to retry, how to back off, and how idempotency keys prevent duplicate charges.

Highlights / Retries, Backoff & Idempotency

* Retry only idempotent requests or those with idempotency keys - never blind POST retries
* Exponential backoff with jitter prevents thundering herds when LTE returns
* Cap attempts at 3–5 - infinite retry drains battery in airplane mode
* Pair retries with onlineManager - pause while offline, resume on reconnect
* 429 Retry-After headers deserve respect - sleep before next attempt

## Recipe

> Quick-reference recipe card - copy-paste ready.

```ts
// src/api/retry.ts
export type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
};
 
function jitter(ms: number): number {
  return ms * (0.5 + Math.random() * 0.5);
}
 
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  opts: RetryOptions = {}
): Promise<Response> {
  const {
    maxAttempts = 4,
    baseDelayMs = 500,
    maxDelayMs = 8_000,
    shouldRetry = defaultShouldRetry,
  } = opts;
 
  let lastError: unknown;
 
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(input, init);
      if (res.status === 429) {
        const retryAfter = res.headers.get("Retry-After");
        const waitSec = retryAfter ? Number(retryAfter) : 2 ** attempt;
        await sleep(jitter(waitSec * 1000));
        continue;
      }
      if (res.ok || !shouldRetry(res, attempt)) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (error) {
      lastError = error;
      if (!shouldRetry(error, attempt)) throw error;
    }
 
    if (attempt < maxAttempts) {
      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      await sleep(jitter(delay));
    }
  }
 
  throw lastError;
}
 
function defaultShouldRetry(error: unknown, attempt: number): boolean {
  if (attempt >= 4) return false;
  if (error instanceof Response) {
    const status = error.status;
    return status >= 500 || status === 408 || status === 429;
  }
  if (error instanceof Error) {
    if (error.name === "AbortError") return false;
    return error instanceof TypeError; // network blip
  }
  return false;
}
 
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
```

**When to reach for this:**

* GET and safe HEAD requests on unreliable cellular.
* Idempotent PUT/DELETE with server-side deduplication.
* Background sync replay after offline queues drain.

## Working Example

```tsx
import NetInfo from "@react-native-community/netinfo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { fetchWithRetry } from "../api/retry";
 
const API = process.env.EXPO_PUBLIC_API_URL ?? "https://api.example.com";
 
function idempotencyKey(): string {
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
 
async function createOrder(items: { sku: string; qty: number }[], key: string) {
  const res = await fetchWithRetry(
    `${API}/orders`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": key,
      },
      body: JSON.stringify({ items }),
    },
    {
      maxAttempts: 3,
      shouldRetry: (err, attempt) => {
        if (err instanceof Response) return err.status >= 500 && attempt < 3;
        return err instanceof TypeError && attempt < 3;
      },
    }
  );
 
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
 
export function useCreateOrder() {
  const queryClient = useQueryClient();
 
  const waitForOnline = useCallback(async () => {
    const state = await NetInfo.fetch();
    if (state.isConnected && state.isInternetReachable !== false) return;
    await new Promise<void>((resolve) => {
      const unsub = NetInfo.addEventListener((s) => {
        if (s.isConnected && s.isInternetReachable !== false) {
          unsub();
          resolve();
        }
      });
    });
  }, []);
 
  return useMutation({
    mutationFn: async (items: { sku: string; qty: number }[]) => {
      await waitForOnline();
      const key = idempotencyKey();
      return createOrder(items, key);
    },
    retry: false, // retries handled in fetchWithRetry with idempotency key
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });
}
```

**What this demonstrates:**

* **Exponential backoff + jitter** spaces retries when a cell tower recovers and many clients reconnect at once.
* **Idempotency-Key header** lets the server return the same order if the client retries a POST after timeout.
* **429 handling** reads `Retry-After` when present.
* **`retry: false` on useMutation** when transport-layer retry already runs with keys - avoids duplicate mutation fn calls with new keys.
* **waitForOnline** gates user-initiated checkout - optional; background queues use different patterns in [Network Failure UX](https://docs.wahwei/reactnative.codeguides.io/error-resilience/network-failure-ux/).

## Deep Dive

### What Is Safe to Retry?

| Method / case | Retry? | Condition |
| --- | --- | --- |
| GET, HEAD | ✅ Yes | Bounded attempts + backoff |
| PUT with stable id | ✅ Usually | Server upserts by resource id |
| DELETE | ✅ Usually | Second delete should 404 safely |
| POST payment | ⚠️ Only with idempotency key | Server stores key → same response |
| POST without key | ❌ No | Risk duplicate rows/charges |
| 401 / 403 | ❌ No | Refresh auth first |
| 400 validation | ❌ No | Payload is wrong - fix client |
| 409 conflict | ❌ No | Merge or show UI |

### Idempotency Key Contract

```ts
type IdempotentRequest = {
  idempotencyKey: string; // client-generated UUID
  operation: "createOrder" | "capturePayment";
  payload: unknown;
};
```

* **Generate once per user action** - store with offline queue item; replay same key on flush
* **Server stores key → response** for 24–72 h - document TTL with backend
* **Stripe, Adyen, and many REST APIs** accept `Idempotency-Key` - align header name with provider
* Client keys complement server **[Optimistic UI](https://docs.wahwei/reactnative.codeguides.io/data-offline/optimistic-ui/)** - pending rows map to keys

### TanStack Query Retry Tuning

```tsx
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (failureCount >= 3) return false;
        if (error instanceof Error && error.message.startsWith("HTTP 4")) return false;
        return true;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
    },
    mutations: {
      retry: 0,
    },
  },
});
```

* Wire **onlineManager** so retries pause offline - see [TanStack Query on Mobile](https://docs.wahwei/reactnative.codeguides.io/networking-api/tanstack-query-on-mobile/)
* **Mutations default `retry: 0`** - explicit idempotency at transport layer instead

### LTE / Subway Failure Modes

| Symptom | Likely cause | Retry strategy |
| --- | --- | --- |
| `TypeError: Network request failed` | Handoff, tunnel, airplane | Backoff; pause if offline |
| Hang then timeout | Weak signal | AbortController + retry |
| HTTP 502/503 | Gateway recovery | Retry with jitter |
| Intermittent 200 + empty body | CDN glitch | Parse guard; retry once |
| Success on server, timeout on client | Slow ACK | Idempotency key on POST |

### Offline Queue Replay

```ts
for (const item of queue) {
  try {
    await fetchWithRetry(url, { headers: { "Idempotency-Key": item.key }, ... });
    dequeue(item);
  } catch {
    incrementAttempts(item);
    if (item.attempts > 5) surfaceToUser(item);
  }
}
```

* **FIFO per entity** - two updates to same row should not race
* After max attempts, **show manual Retry/Discard** - silent loss erodes trust
* Full queue design in [Sync Strategies](https://docs.wahwei/reactnative.codeguides.io/data-offline/sync-strategies/)

## Gotchas

* **Retrying POST without idempotency** - Double charges on timeout. **Fix:** Key per action; server dedupes.
* **Retrying 401** - Amplifies auth outage. **Fix:** Refresh token once; logout on failure.
* **No jitter** - LTE recovery causes synchronized client spikes. **Fix:** Randomize delay 50–100%.
* **Infinite TanStack Query retry** - Battery drain in airplane mode. **Fix:** Cap at 2–3 + onlineManager.
* **New idempotency key on each retry attempt** - Server creates duplicates. **Fix:** Same key for all attempts of one action.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Transport `fetchWithRetry` | Custom fetch client | Already using axios-retry with same rules |
| TanStack Query `retry` | GET queries | Non-idempotent mutations |
| Background TaskManager replay | Large uploads hours later | Immediate user feedback required |
| Server long-polling | Client retry budget exhausted | Normal REST with short timeouts |

## FAQs

How many retry attempts on mobile?

**3–4** for reads with exponential backoff. **0–1** for mutations unless idempotency keys are guaranteed.

What is jitter?

Randomizing delay (e.g. 500–1000 ms instead of exactly 750 ms) so thousands of devices do not retry in the same millisecond when a tower comes back.

Should I retry 404?

No - the resource is missing or the URL is wrong. Retrying wastes battery and obscures bugs.

How do idempotency keys differ from client-generated IDs?

Idempotency keys tell the **server** to dedupe within a TTL. Client IDs become the resource id in the payload - use both for offline creates when possible.

Does axios-retry replace this pattern?

It can, if configured with the same idempotency and status rules. Transport-agnostic utilities keep fetch and axios consistent.

## Related

* [Networking Basics](https://docs.wahwei/reactnative.codeguides.io/networking-api/networking-basics/) - timeouts and AbortController
* [TanStack Query on Mobile](https://docs.wahwei/reactnative.codeguides.io/networking-api/tanstack-query-on-mobile/) - onlineManager and query retry defaults
* [Network Failure UX](https://docs.wahwei/reactnative.codeguides.io/error-resilience/network-failure-ux/) - offline queues and user-facing retry
* [Optimistic UI](https://docs.wahwei/reactnative.codeguides.io/data-offline/optimistic-ui/) - pending state until idempotent ack
* [Sync Strategies](https://docs.wahwei/reactnative.codeguides.io/data-offline/sync-strategies/) - ordered replay and conflict handling
* [Networking Best Practices](https://docs.wahwei/reactnative.codeguides.io/networking-api/best-practices/) - section summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
