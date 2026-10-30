# Fetch vs axios

Interceptors, upload progress, and bundle-size trade-offs for Expo SDK 57 apps choosing between built-in `fetch` and `axios`.

Highlights / Fetch vs axios

* fetch is zero-dependency on Hermes - axios adds ~13–15 KB gzip to your JS bundle
* axios interceptors centralize auth refresh; fetch needs a thin wrapper module
* Upload progress requires XMLHttpRequest or expo-file-system - fetch has no onUploadProgress
* Default to fetch until you need interceptors, progress, or automatic JSON transforms
* Both run on the JS thread - neither replaces offline cache or TanStack Query

## Recipe

> Quick-reference recipe card - copy-paste ready.

```ts
// src/api/http.ts - fetch wrapper with interceptor-like hooks
import * as SecureStore from "expo-secure-store";
 
type RequestContext = { url: string; init: RequestInit };
type Interceptor = (ctx: RequestContext) => Promise<RequestContext> | RequestContext;
 
const requestInterceptors: Interceptor[] = [];
const responseHandlers: Array<(res: Response) => Response | Promise<Response>> = [];
 
export function onRequest(fn: Interceptor) {
  requestInterceptors.push(fn);
}
 
export function onResponse(fn: (res: Response) => Response | Promise<Response>) {
  responseHandlers.push(fn);
}
 
export async function http(input: string, init: RequestInit = {}) {
  let ctx: RequestContext = { url: input, init: { ...init } };
  for (const hook of requestInterceptors) {
    ctx = await hook(ctx);
  }
 
  let res = await fetch(ctx.url, ctx.init);
  for (const hook of responseHandlers) {
    res = await hook(res);
  }
  return res;
}
 
// Attach bearer once
onRequest(async (ctx) => {
  const token = await SecureStore.getItemAsync("access_token");
  if (!token) return ctx;
  return {
    ...ctx,
    init: {
      ...ctx.init,
      headers: { ...Object(ctx.init.headers), Authorization: `Bearer ${token}` },
    },
  };
});
```

**When to reach for this:**

* Greenfield Expo apps that want interceptor ergonomics without adding axios.
* Teams already standardized on `fetch` but need one place for auth headers and 401 handling.
* Read-heavy apps where upload progress is not required.

## Working Example

```tsx
// src/api/axiosClient.ts - when axios wins
import axios from "axios";
import * as SecureStore from "expo-secure-store";
 
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 12_000,
  headers: { Accept: "application/json" },
});
 
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
 
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // Trigger refresh flow - see Refresh Token Rotation
      await SecureStore.deleteItemAsync("access_token");
    }
    return Promise.reject(error);
  }
);
 
export { api };
```

```tsx
// src/screens/AvatarUploadScreen.tsx - upload progress via XMLHttpRequest
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
 
function uploadWithProgress(
  uri: string,
  onProgress: (ratio: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("file", {
      uri,
      name: "avatar.jpg",
      type: "image/jpeg",
    } as unknown as Blob);
 
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject());
    xhr.onerror = () => reject(new TypeError("Network error"));
    xhr.open("POST", `${process.env.EXPO_PUBLIC_API_URL}/upload`);
    xhr.send(form);
  });
}
 
export function AvatarUploadScreen() {
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
 
  async function pickAndUpload() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"] });
    if (result.canceled) return;
 
    setBusy(true);
    try {
      await uploadWithProgress(result.assets[0].uri, setProgress);
    } finally {
      setBusy(false);
      setProgress(0);
    }
  }
 
  return (
    <View style={{ padding: 16 }}>
      <Pressable onPress={pickAndUpload} disabled={busy}>
        <Text>Upload avatar</Text>
      </Pressable>
      {busy && (
        <>
          <ActivityIndicator />
          <Text>{Math.round(progress * 100)}%</Text>
        </>
      )}
    </View>
  );
}
```

```bash
npx expo install expo-image-picker expo-secure-store
npm install axios
```

**What this demonstrates:**

* **fetch wrapper** mimics axios request/response interceptors with zero extra dependencies.
* **axios** gives built-in `timeout`, `baseURL`, and `isAxiosError` for typed error branches.
* **Upload progress** on React Native requires `XMLHttpRequest` or `expo-file-system` multipart - neither fetch nor axios exposes progress on RN's fetch polyfill.
* **401 interceptor** clears tokens centrally - pair with [Refresh Token Rotation](https://docs.wahwei/reactnative.codeguides.io/auth-session/refresh-token-rotation/).

## Deep Dive

### Decision Matrix

| Need | fetch | axios |
| --- | --- | --- |
| Bundle size | ✅ Built-in | ⚠️ ~13–15 KB gzip minified |
| Interceptors | DIY wrapper (~40 lines) | ✅ Built-in |
| Timeout | `AbortController` | ✅ `timeout` option |
| Upload progress | ❌ Use XHR / FileSystem | ⚠️ RN axios uses adapter - progress via XHR |
| JSON transform | Manual `res.json()` | ✅ Automatic when `Content-Type` is JSON |
| Cancel | `AbortSignal` | `AbortController` via `signal` in config |
| Typed errors | Custom classifier | `axios.isAxiosError` |

### Bundle-Size Trade-offs

```bash
# Measure before adding axios to a Hermes bundle
npx expo export --platform ios
# Compare dist/_expo/static/js/ios/*.js before/after npm install axios
```

* **axios** pulls `follow-redirects` logic and transform pipelines - meaningful on low-end Android where every KB affects TTI
* **fetch + Zod** at the edge matches axios JSON ergonomics with better validation
* If axios is only used in two files, a **local wrapper** is cheaper than a global dependency
* Tree-shaking does not remove unused axios adapters entirely - assume the full client cost

### Interceptor Patterns on Mobile

| Pattern | fetch wrapper | axios |
| --- | --- | --- |
| Attach bearer | `onRequest` reads SecureStore | `interceptors.request` |
| Refresh on 401 | `onResponse` checks status, queues refresh | `interceptors.response` |
| Request ID header | Mutate `init.headers` | `config.headers["X-Request-Id"]` |
| Retry with backoff | Not built-in - use [Retries doc](https://docs.wahwei/reactnative.codeguides.io/networking-api/retries-backoff-and-idempotency/) | `axios-retry` plugin (extra dep) |

```ts
// Idempotent retry belongs outside either client - shared utility
import { fetchWithRetry } from "./retry";
```

### When axios Is Worth It

* **Large teams** with existing axios conventions from web code sharing packages in a monorepo.
* **Heavy mutation** flows with consistent error shape mapping via `AxiosError.response?.data`.
* **Upload dashboards** already built on `axios` + `onUploadProgress` on web - port XHR recipe above for RN parity.

### When fetch Is Enough

* **Expo-first** apps using TanStack Query as the network layer - `queryFn` only needs a thin `apiGet`.
* **Read-mostly** consumer apps with occasional POST and no progress UI.
* **Strict bundle budgets** on emerging-market devices.

## Gotchas

* **Expecting axios upload progress from fetch** - RN fetch has no upload events. **Fix:** `XMLHttpRequest` or `FileSystem.uploadAsync`.
* **Installing axios for JSON parsing alone** - `res.json()` + Zod is lighter. **Fix:** Parse at the edge per [Networking Basics](https://docs.wahwei/reactnative.codeguides.io/networking-api/networking-basics/).
* **Duplicate auth logic in screens and interceptors** - Drift causes mystery 401s. **Fix:** One client module; features never import axios directly.
* **axios `timeout` without retry policy** - Single timeout on LTE looks like flaky servers. **Fix:** Pair with backoff and idempotency keys.
* **Sharing axios instance between web and RN without adapter check** - Web adapters differ. **Fix:** Separate `axios.create` per platform or use fetch in shared core.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| fetch + wrapper | Default Expo apps, small teams | You need battle-tested retry/upload plugins today |
| axios | Shared web/RN packages, interceptor-heavy APIs | Bundle size is already over budget |
| TanStack Query only | Server state with cache | You still need a transport - pick fetch or axios underneath |
| `expo-file-system` upload | Large files, background-friendly uploads | Tiny JSON POST bodies |
| tRPC / generated clients | End-to-end typed APIs | Public third-party REST without codegen |

## FAQs

Should new Expo SDK 57 apps default to fetch or axios?

Default to **fetch** with a small `api/client.ts` wrapper. Add axios when interceptors, `isAxiosError`, or team conventions justify the bundle cost.

How do I add upload progress with fetch?

You cannot on React Native today. Use `XMLHttpRequest` (`xhr.upload.onprogress`) or `expo-file-system`'s `uploadAsync` with progress callbacks.

Does axios support AbortController?

Yes - pass `signal` in the request config. TanStack Query supplies `signal` to `queryFn`; forward it to axios for automatic cancellation on unmount.

Can I use axios with TanStack Query?

Yes - `queryFn: ({ signal }) => api.get('/posts', { signal }).then(r => r.data)`. Prefer one axios instance with interceptors at the root.

How big is axios in a Hermes bundle?

Roughly **13–15 KB gzip** for the core client - measure with `expo export` on your app. Wrapper code is often smaller than axios if you only need auth headers.

How do interceptors interact with token refresh?

On 401, pause outgoing requests, refresh once, replay queue, or logout. Serialize refresh to avoid stampedes - see [Refresh Token Rotation](https://docs.wahwei/reactnative.codeguides.io/auth-session/refresh-token-rotation/).

## Related

* [Networking Basics](https://docs.wahwei/reactnative.codeguides.io/networking-api/networking-basics/) - timeouts, cancellation, JSON parsing
* [TanStack Query on Mobile](https://docs.wahwei/reactnative.codeguides.io/networking-api/tanstack-query-on-mobile/) - cache layer above either transport
* [Retries, Backoff & Idempotency](https://docs.wahwei/reactnative.codeguides.io/networking-api/retries-backoff-and-idempotency/) - transport-agnostic retry utilities
* [Refresh Token Rotation](https://docs.wahwei/reactnative.codeguides.io/auth-session/refresh-token-rotation/) - 401 handling in interceptors
* [Networking Best Practices](https://docs.wahwei/reactnative.codeguides.io/networking-api/best-practices/) - section-wide summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
