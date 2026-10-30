# Networking Basics

10 examples for timeouts, cancellation, and parsing at the mobile edge - the foundation every Expo SDK 57 app needs before adding TanStack Query or axios.

Highlights / Networking Basics

* React Native ships fetch and AbortController - no polyfill required on Hermes
* Always set timeouts on mobile; LTE handoffs hang longer than Wi‑Fi
* Cancel in-flight requests on unmount to avoid setState-after-unmount warnings
* Parse JSON at the edge with Zod - never trust raw response shapes
* Classify errors: offline, timeout, HTTP status - UX copy differs for each
* Centralize fetch in one api/client module - attach auth headers once

## Prerequisites

React Native 0.86 includes a **WHATWG fetch** implementation backed by native networking stacks. Start from a blank Expo app:

```bash
npx create-expo-app@latest MyNetworkApp --template blank-typescript
cd MyNetworkApp
npx expo install zod @react-native-community/netinfo
```

Create a small API module so screens never call raw URLs:

```ts
// src/api/config.ts
export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ?? "https://jsonplaceholder.typicode.com";
```

> **Tooling:** These examples target **Expo SDK 57** (`expo` ~57.0.4), **React Native 0.86.0**, and **React 19.2.3**. Test on a physical device over cellular - simulators hide LTE handoff pain.

---

## Basic Examples

### 1. A Minimal GET with fetch

Mobile `fetch` mirrors web APIs. Always check `response.ok` before parsing - HTTP 404 still resolves the promise.

```ts
async function getPost(id: number) {
  const res = await fetch(`${API_BASE}/posts/${id}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json() as Promise<{ id: number; title: string; body: string }>;
}
```

* **`fetch` never throws on 4xx/5xx** - you must inspect `res.ok` or `res.status`
* **DNS and TLS errors throw** `TypeError` - often indistinguishable from offline on first glance
* Keep URLs in `API_BASE` - never scatter production hosts across feature folders

> **Related:** [Fetch vs axios](https://docs.wahwei/reactnative.codeguides.io/networking-api/fetch-vs-axios/) - when interceptors justify the bundle cost

---

### 2. Request Timeouts with AbortController

Unlike browsers, React Native fetch has **no built-in `timeout` option**. Combine `AbortController` with `setTimeout`:

```ts
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 10_000
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
 
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}
```

```ts
// Usage
const res = await fetchWithTimeout(`${API_BASE}/posts/1`, {}, 8_000);
```

* **Default 8–15 s on reads** - subway tunnels and elevator dead zones exceed 3 s regularly
* **Shorter for mutations** - users perceive stalled POSTs as broken; fail fast and offer Retry
* `AbortError` on timeout is distinct from network `TypeError` - classify before showing copy

---

### 3. Cancel In-Flight Requests on Unmount

Screens unmount when users navigate away mid-request. Wire `AbortController` to `useEffect` cleanup:

```tsx
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
 
export function PostDetail({ postId }: { postId: number }) {
  const [post, setPost] = useState<{ title: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
 
  useEffect(() => {
    const controller = new AbortController();
 
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/posts/${postId}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setPost(await res.json());
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Request failed");
      }
    })();
 
    return () => controller.abort();
  }, [postId]);
 
  if (error) return <Text>{error}</Text>;
  if (!post) return <ActivityIndicator />;
  return <Text>{post.title}</Text>;
}
```

* **Ignore `AbortError` in catch** - cancellation is expected, not a user-facing failure
* Changing `postId` aborts the previous request automatically via effect re-run
* With TanStack Query, prefer `queryKey` + built-in cancellation - see [TanStack Query on Mobile](https://docs.wahwei/reactnative.codeguides.io/networking-api/tanstack-query-on-mobile/)

---

### 4. Parse JSON Safely at the Edge

Never cast `res.json()` blindly. Validate once at the network boundary:

```ts
import { z } from "zod";
 
const postSchema = z.object({
  id: z.number(),
  title: z.string(),
  body: z.string(),
});
 
export type Post = z.infer<typeof postSchema>;
 
export async function getPostSafe(id: number): Promise<Post> {
  const res = await fetchWithTimeout(`${API_BASE}/posts/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
 
  const raw: unknown = await res.json();
  return postSchema.parse(raw);
}
```

* **Zod `.parse` throws `ZodError`** - map to "unexpected server response" in UI, not a stack trace
* Shared schemas power contract tests - see [Contract Tests for APIs](https://docs.wahwei/reactnative.codeguides.io/testing/contract-tests-for-apis/)
* Parse **arrays** with `z.array(schema)` - list endpoints drift more often than detail endpoints

---

### 5. Classify Network Errors for UX

Mobile users need different copy for offline, timeout, and server errors:

```ts
export type NetworkErrorKind = "offline" | "timeout" | "http" | "parse" | "unknown";
 
export function classifyFetchError(error: unknown, status?: number): NetworkErrorKind {
  if (status && status >= 400) return "http";
  if (error instanceof Error) {
    if (error.name === "AbortError") return "timeout";
    if (error instanceof TypeError) return "offline";
  }
  return "unknown";
}
 
export function userMessage(kind: NetworkErrorKind): string {
  switch (kind) {
    case "offline":
      return "No connection. Check airplane mode or try again when online.";
    case "timeout":
      return "This is taking too long. Try again on a stronger signal.";
    case "http":
      return "The server could not complete this request.";
    case "parse":
      return "Received an unexpected response. Try again later.";
    default:
      return "Something went wrong. Please retry.";
  }
}
```

* Pair with **NetInfo** for connectivity banners - see [Network Failure UX](https://docs.wahwei/reactnative.codeguides.io/error-resilience/network-failure-ux/)
* Do not show the offline banner on HTTP 500 - Wi‑Fi is fine; the server is not

---

### 6. JSON POST with Content-Type and Body

Mutations need explicit headers. `JSON.stringify` on plain objects - FormData is separate (multipart uploads):

```ts
export async function createPost(title: string, body: string) {
  const res = await fetchWithTimeout(
    `${API_BASE}/posts`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, body, userId: 1 }),
    },
    12_000
  );
 
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return postSchema.parse(await res.json());
}
```

* **`Content-Type: application/json`** is required - omitting it breaks many Rails/Express parsers
* **Idempotency keys** on POST belong in headers for payment flows - see [Retries, Backoff & Idempotency](https://docs.wahwei/reactnative.codeguides.io/networking-api/retries-backoff-and-idempotency/)
* Attach auth tokens in a shared client - see [Mobile Auth Basics](https://docs.wahwei/reactnative.codeguides.io/auth-session/mobile-auth-basics/)

---

### 7. Query Parameters Without String Bugs

Build search URLs with `URLSearchParams` - avoids `?foo=undefined` and encoding mistakes:

```ts
export async function searchPosts(query: string, limit = 20) {
  const params = new URLSearchParams({
    q: query,
    _limit: String(limit),
  });
 
  const res = await fetchWithTimeout(`${API_BASE}/posts?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
 
  const raw: unknown = await res.json();
  return z.array(postSchema).parse(raw);
}
```

* **Encode user input** - `URLSearchParams` handles `&`, spaces, and Unicode
* Omit empty optional params - `params.delete("q")` when query is blank
* For cursor pagination, pass `cursor` as a string param; validate shape with Zod

---

### 8. Central API Client with Auth Headers

One module attaches bearer tokens, base URL, and default timeout - features import `apiGet` / `apiPost`:

```ts
// src/api/client.ts
import * as SecureStore from "expo-secure-store";
import { fetchWithTimeout } from "./fetchWithTimeout";
import { API_BASE } from "./config";
 
async function authHeaders(): Promise<HeadersInit> {
  const token = await SecureStore.getItemAsync("access_token");
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
 
export async function apiGet<T>(path: string, parse: (raw: unknown) => T): Promise<T> {
  const res = await fetchWithTimeout(`${API_BASE}${path}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parse(await res.json());
}
```

```bash
npx expo install expo-secure-store
```

* **Never read tokens in every screen** - rotation and logout become impossible to audit
* On **401**, trigger refresh or session clear - see [Refresh Token Rotation](https://docs.wahwei/reactnative.codeguides.io/auth-session/refresh-token-rotation/)
* Reject non-HTTPS URLs in production builds at this choke point

---

### 9. Handle Empty and Non-JSON Responses

DELETE and some PATCH endpoints return **204 No Content**. Calling `res.json()` throws:

```ts
export async function deletePost(id: number, headers: HeadersInit): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE}/posts/${id}`, {
    method: "DELETE",
    headers,
  });
 
  if (res.status === 204) return;
 
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
 
  const text = await res.text();
  if (!text) return;
  // Some APIs return JSON bodies on DELETE - parse only when present
  JSON.parse(text);
}
```

* **Check `Content-Type`** before parsing - `text/html` error pages arrive as 200 from misconfigured proxies
* Use `res.text()` then `JSON.parse` when bodies are optional - clearer errors than `res.json()` on empty
* Log parse failures in dev only - never ship raw response bodies to users

---

### 10. Typed Hook with Loading, Error, and Retry

Before adopting TanStack Query, understand the manual pattern - then replace it:

```tsx
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { API_BASE } from "../api/config";
import { fetchWithTimeout } from "../api/fetchWithTimeout";
import { postSchema, type Post } from "../api/posts";
 
export function PostScreen({ id }: { id: number }) {
  const [data, setData] = useState<Post | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
 
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithTimeout(`${API_BASE}/posts/${id}`, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(postSchema.parse(await res.json()));
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [id]);
 
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
 
  return (
    <View style={{ padding: 16 }}>
      {loading && <Text>Loading…</Text>}
      {error && (
        <>
          <Text>{error}</Text>
          <Pressable onPress={() => load()}>
            <Text>Retry</Text>
          </Pressable>
        </>
      )}
      {data && <Text>{data.title}</Text>}
    </View>
  );
}
```

* **Retry calls `load()`** - not `Updates.reloadAsync()` or app restart
* Graduate to `useQuery` when you need cache, dedupe, and background refetch - [TanStack Query on Mobile](https://docs.wahwei/reactnative.codeguides.io/networking-api/tanstack-query-on-mobile/)
* Persist read models offline with [Offline-First Basics](https://docs.wahwei/reactnative.codeguides.io/data-offline/offline-first-basics/)

---

## Intermediate Patterns

### Combine Timeout + Cancellation + Parse

```ts
export async function requestJson<T>(
  path: string,
  options: RequestInit & { timeoutMs?: number; parse: (raw: unknown) => T }
): Promise<T> {
  const { timeoutMs = 10_000, parse, ...init } = options;
  const res = await fetchWithTimeout(`${API_BASE}${path}`, init, timeoutMs);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parse(await res.json());
}
```

### React 19 `use` with Suspense (Optional)

If your team adopts Suspense for data, keep the same timeout wrapper - only the consumption site changes. Most Expo apps still prefer TanStack Query for cache semantics on mobile.

---

## Gotchas

* **Assuming fetch throws on 404** - It resolves; check `res.ok`. **Fix:** Central client throws on `!res.ok`.
* **No timeout on cellular** - Requests hang until OS kills them. **Fix:** `AbortController` + 8–15 s default.
* **Parsing before checking status** - Error HTML bodies crash JSON parse. **Fix:** Check `res.ok` first.
* **setState after unmount** - Forgot abort cleanup. **Fix:** `useEffect` return `() => controller.abort()`.
* **Trusting `EXPO_PUBLIC_API_URL` in prod without HTTPS guard** - Cleartext leaks tokens. **Fix:** Assert `https://` in production client.

## Related

* [Fetch vs axios](https://docs.wahwei/reactnative.codeguides.io/networking-api/fetch-vs-axios/) - interceptors, upload progress, bundle size
* [TanStack Query on Mobile](https://docs.wahwei/reactnative.codeguides.io/networking-api/tanstack-query-on-mobile/) - cache, focus, and online managers
* [Retries, Backoff & Idempotency](https://docs.wahwei/reactnative.codeguides.io/networking-api/retries-backoff-and-idempotency/) - safe retries on flaky LTE
* [Network Failure UX](https://docs.wahwei/reactnative.codeguides.io/error-resilience/network-failure-ux/) - banners, stale data, retry queues
* [Mobile Auth Basics](https://docs.wahwei/reactnative.codeguides.io/auth-session/mobile-auth-basics/) - attaching tokens at the client layer
* [Networking Best Practices](https://docs.wahwei/reactnative.codeguides.io/networking-api/best-practices/) - condensed checklist for the whole section

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
