# Typing API Responses & Zod

TypeScript types disappear at the network boundary. On mobile - spotty connectivity, CDN caches, and backend deploys that race your app store release - runtime validation with Zod keeps API payloads honest before they reach your UI.

Highlights / Typing API Responses & Zod

* Treat every `res.json()` as `unknown` until a Zod schema parses it - compile-time types alone do not survive the wire
* `z.infer<typeof Schema>` is the single source of truth for both runtime checks and TypeScript exports
* Use `safeParse` at UI boundaries and `parse` in trusted fetch helpers where you want exceptions to bubble
* Compose schemas with `.extend`, `.pick`, and `z.discriminatedUnion` so list and detail endpoints share field definitions
* Pair validated fetch helpers with TanStack Query so every screen reuses the same typed `queryFn`

## Recipe

> Quick-reference recipe card - copy-paste ready.

```ts
import { z } from "zod";
 
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});
 
type User = z.infer<typeof UserSchema>;
 
async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`https://api.example.com/users/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json: unknown = await res.json();
  return UserSchema.parse(json);
}
```

**When to reach for this:**

* Any screen that renders fields from a REST or GraphQL JSON payload.
* Shared API clients used across multiple tabs or offline-sync layers.
* Responses where the backend might add, rename, or coerce fields between releases.
* Error envelopes (`{ error: { code, message } }`) that must be distinguished from success shapes.
* Cached AsyncStorage or SQLite rows that were written by an older app version.

## Working Example

```ts
// lib/api/schemas.ts - shared shapes for list + detail endpoints
import { z } from "zod";
 
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
 
export const UserSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  avatarUrl: z.string().url().nullable(),
});
 
export const UserDetailSchema = UserSummarySchema.extend({
  email: z.string().email(),
  createdAt: z.string().datetime(),
});
 
export const UserListSchema = z.object({
  items: z.array(UserSummarySchema),
  nextCursor: z.string().nullable(),
});
 
export type UserSummary = z.infer<typeof UserSummarySchema>;
export type UserDetail = z.infer<typeof UserDetailSchema>;
export type UserList = z.infer<typeof UserListSchema>;
```

```ts
// lib/api/client.ts - one validated fetch helper for the app
import {
  ApiErrorSchema,
  UserDetailSchema,
  UserListSchema,
  type UserDetail,
  type UserList,
} from "./schemas";
 
const BASE = "https://api.example.com";
 
async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text) as unknown;
}
 
function throwApiError(status: number, body: unknown): never {
  const parsed = ApiErrorSchema.safeParse(body);
  if (parsed.success) {
    throw new Error(`${parsed.data.error.code}: ${parsed.data.error.message}`);
  }
  throw new Error(`HTTP ${status}`);
}
 
export async function fetchUserList(cursor?: string): Promise<UserList> {
  const url = new URL("/v1/users", BASE);
  if (cursor) url.searchParams.set("cursor", cursor);
 
  const res = await fetch(url);
  const json = await readJson(res);
  if (!res.ok) throwApiError(res.status, json);
 
  return UserListSchema.parse(json);
}
 
export async function fetchUserDetail(id: string): Promise<UserDetail> {
  const res = await fetch(`${BASE}/v1/users/${id}`);
  const json = await readJson(res);
  if (!res.ok) throwApiError(res.status, json);
 
  return UserDetailSchema.parse(json);
}
```

```tsx
// app/users/[id].tsx - screen consumes only validated types
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { fetchUserDetail, type UserDetail } from "../../lib/api/client";
 
export default function UserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
 
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchUserDetail(String(id));
        if (!cancelled) setUser(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Request failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);
 
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }
 
  if (!user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
 
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{user.name}</Text>
      <Text style={styles.meta}>{user.email}</Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "600" },
  meta: { marginTop: 8, color: "#64748b" },
  error: { color: "#dc2626" },
});
```

**What this demonstrates:**

* Raw JSON is typed as `unknown` until a schema parses it - no accidental `any` in screens.
* `UserDetailSchema.extend(...)` reuses list fields so list and detail endpoints cannot drift silently.
* HTTP errors are validated separately from success payloads via `ApiErrorSchema`.
* The screen imports only inferred types (`UserDetail`); it never touches Zod at the UI layer.
* `readJson` handles empty bodies common on `204` or flaky mobile proxies before `JSON.parse` throws.

## Deep Dive

### How It Works

* **`fetch` + `res.json()`** returns `Promise<any>` in TypeScript's DOM lib - assigning to a named interface does not validate anything at runtime.
* **Zod schemas** walk the parsed object and coerce or reject fields; `z.infer` projects the schema into a TypeScript type at compile time.
* **`parse`** throws `ZodError` with a path array - useful in dev to see exactly which field failed.
* **`safeParse`** returns `{ success, data | error }` - better for forms and inline retry UI where you do not want exceptions.
* On mobile, validation failures often mean **stale cache** or a partial response on a dropped connection - log the `ZodError` `issues` array to your crash reporter.

### Schema Building Blocks

| Zod helper | Use for API responses |
| --- | --- |
| `z.object({ ... })` | Standard JSON objects |
| `z.array(schema)` | List endpoints |
| `z.string().uuid()` / `.email()` / `.url()` | Constrained string fields |
| `z.coerce.number()` | Query params and loosely typed backends that send `"42"` |
| `z.enum(["ios", "android"])` | Platform or status enums |
| `z.discriminatedUnion("type", [...])` | Polymorphic payloads (`type: "user" | "org"`) |
| `.nullable()` / `.optional()` | Missing keys vs explicit `null` from SQL backends |
| `.transform()` | Normalize dates (`string` → `Date`) at the boundary |

```ts
import { z } from "zod";
 
const NotificationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("push"), title: z.string(), body: z.string() }),
  z.object({ kind: z.literal("sms"), phone: z.string(), message: z.string() }),
]);
 
// Backend sends ISO strings; app wants Date objects
const EventSchema = z.object({
  id: z.string(),
  startsAt: z.string().datetime().transform((s) => new Date(s)),
});
```

### parse vs safeParse

| Method | Returns | Use when |
| --- | --- | --- |
| `schema.parse(json)` | `T` or throws | Central fetch helpers; errors bubble to error boundaries |
| `schema.safeParse(json)` | `{ success: true, data }` or `{ success: false, error }` | User-facing retry, background sync that should not crash |
| `schema.parseAsync(json)` | `Promise<T>` | Schemas with async refinements (e.g. uniqueness check) |

### TypeScript Notes

```ts
import { z } from "zod";
 
// Single source of truth - export schema + inferred type together
export const DeviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  platform: z.enum(["ios", "android"]),
});
 
export type Device = z.infer<typeof DeviceSchema>;
 
// Narrow unknown without assertion
function isDevice(value: unknown): value is Device {
  return DeviceSchema.safeParse(value).success;
}
 
// Input vs output types when using .transform or .default
type DeviceInput = z.input<typeof DeviceSchema>;
type DeviceOutput = z.output<typeof DeviceSchema>;
```

* Install Zod with `npx expo install zod` so the version stays compatible with your Expo SDK lockfile.
* Keep schemas in plain `.ts` files - no JSX - so Metro can import them from hooks, background tasks, and tests.
* Prefer `z.infer` over duplicating an `interface Device` - the interface will drift the first time the API changes.

## Gotchas

* **Casting `res.json()` to an interface** - `const data = (await res.json()) as User` silences TypeScript but not bad payloads. **Fix:** Assign to `unknown`, then `UserSchema.parse(data)`.
* **Optional vs nullable mismatch** - Backend sends `avatarUrl: null` but schema uses `.optional()` only; Zod rejects the response. **Fix:** Use `.nullable()` for SQL nulls, `.optional()` for absent keys, or `.nullish()` for both.
* **Number fields arriving as strings** - Some gateways stringify numbers in JSON. **Fix:** `z.coerce.number()` at the boundary, or `z.union([z.number(), z.string().transform(Number)])` when both shapes appear.
* **Date strings used as `Date` in UI** - `z.string().datetime()` validates format but leaves a string; `new Date(iso)` in every screen duplicates logic. **Fix:** `.transform((s) => new Date(s))` once in the schema.
* **Validating only success responses** - Error bodies with a different shape throw opaque `ZodError` in fetch helpers. **Fix:** Branch on `!res.ok`, parse `ApiErrorSchema` first, then parse success schema.
* **Huge list responses without pagination schema** - Accepting `z.array(ItemSchema)` when the API adds `{ items, nextCursor }` breaks every screen at once. **Fix:** Model the envelope explicitly (`UserListSchema` above).
* **Caching unvalidated JSON in AsyncStorage** - An old app version wrote a shape your new schema rejects; users crash-loop on launch. **Fix:** Version cache keys (`users:v2`) and run `safeParse` on read; evict on failure.

49454e4f4d5f434e4f5904434556494d4345131a1856181a181c1a1d

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Zod at fetch boundary | REST/GraphQL JSON; you own the client | Protobuf or MessagePack with generated types already guarantee shape |
| `io-ts` / `valibot` | Team standardizes on a lighter or functional validator | You already standardized on Zod across web and mobile monorepos |
| OpenAPI → generated TS types | Backend publishes a stable OpenAPI spec | Backend changes frequently without spec updates - types lie without runtime checks |
| Manual type guards (`isUser`) | Tiny payloads with 2–3 fields | Objects with nested optional fields - guards become unmaintainable |
| Trust + integration tests only | Internal dev APIs behind a VPN spike | Production mobile apps talking to evolving public APIs |

## FAQs

Why isn't a TypeScript interface enough for API responses?

* Interfaces exist only at compile time - they are erased when JavaScript runs.
* `fetch` cannot enforce that the server returned matching fields.
* Mobile apps often run against multiple backend versions during staged rollouts.
* A schema validates at runtime **and** infers the same type TypeScript sees.

Where should Zod parsing run - screen, hook, or API client?

* **API client** (recommended): one `fetchUser` function parses before returning - screens stay dumb.
* **Custom hook**: acceptable when the hook is the only consumer and wraps TanStack Query.
* **Screen**: avoid - duplicates parsing logic and makes testing harder.

Should I use parse or safeParse?

```ts
const result = UserSchema.safeParse(json);
if (!result.success) {
  console.warn(result.error.flatten());
  return null;
}
return result.data;
```

* `parse` throws - fine inside fetch helpers where failure should propagate.
* `safeParse` returns a result object - better for retry buttons and background sync.

How do I type API errors separately from success payloads?

* Define `ApiErrorSchema` alongside success schemas.
* On `!res.ok`, parse with the error schema first.
* Narrow with a discriminant if the backend uses `{ ok: true, data }` vs `{ ok: false, error }` envelopes.

How do I share schemas between list and detail endpoints?

* Define a base `UserSummarySchema`.
* Call `.extend({ email: z.string().email() })` for the detail shape.
* Export both schemas and both inferred types from one module.

What should I type the raw JSON as before parsing?

* Always `unknown` - never `any`, never a direct interface assertion.
* `unknown` forces you to validate or narrow before property access.

How do I handle optional query parameters in response schemas?

* Use `.optional()` for keys that may be absent.
* Use `.nullable()` for keys present but explicitly `null`.
* Use `.default("value")` when the API omits a key but you want a fallback in the app.

Can Zod validate data restored from AsyncStorage or SQLite?

* Yes - treat offline storage the same as network JSON: `unknown` → `safeParse`.
* Version your cache keys when schemas change materially.
* On failure, delete the cache entry and refetch rather than crashing the app.

How does Zod work with TanStack Query?

```ts
import { useQuery } from "@tanstack/react-query";
import { fetchUserDetail } from "../lib/api/client";
 
export function useUser(id: string) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: () => fetchUserDetail(id),
  });
}
```

* Parse inside `queryFn` so `data` is typed as `UserDetail` everywhere.
* Use `retry` and `staleTime` for mobile network flakiness - validation errors should not infinite-retry.

What do I log when validation fails in production?

* Log `error.issues` from `ZodError` - field path, expected type, received value.
* Include request URL and app version - backend may have deployed ahead of the store build.
* Do not log full PII payloads; log field paths and types only.

Should I use z.coerce for numbers from query strings?

* Yes for route params and search params that arrive as strings.
* For response JSON, prefer explicit `z.number()` first - coercion can hide backend bugs.
* Use `z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)])` when both appear historically.

How do I install Zod in an Expo SDK 57 project?

```bash
npx expo install zod
```

* `expo install` picks a version compatible with your lockfile.
* Import from `"zod"` in `.ts` schema modules shared across screens.

What is the difference between z.input and z.infer?

* `z.infer` equals `z.output` - the type **after** transforms and defaults.
* `z.input` is the type **before** transforms - useful for form values you will parse.
* When you do not use `.transform`, all three are identical.

## Related

* [TypeScript in RN Basics](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typescript-in-rn-basics/) - strict tsconfig and the intro Zod fetch example
* [Typing Navigation & Route Params](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-navigation-and-route-params/) - validate route params that trigger API calls
* [Utility Types for RN](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/utility-types-for-rn/) - `Pick` and `Omit` to derive DTO shapes from schemas
* [Typing Native Module APIs](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-native-module-apis/) - validate native module return values the same way
* [Validation with Zod](https://docs.wahwei/reactnative.codeguides.io/forms-input/validation-with-zod/) - schema-first form validation and inline errors
* [TypeScript in RN Best Practices](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/best-practices/) - team conventions for typed boundaries

### External Related Links

* [react.dev](https://react.dev/) - core React concepts RN builds on
* [reactnative.dev/docs](https://reactnative.dev/docs/getting-started) - full RN documentation
* [MDN Web Docs](https://developer.mozilla.org/) - JavaScript fundamentals

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 19, 2026
