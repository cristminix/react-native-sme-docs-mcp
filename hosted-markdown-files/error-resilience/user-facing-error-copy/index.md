# User-Facing Error Copy

Actionable messages vs opaque stack traces on mobile.

Highlights / User-Facing Error Copy

* Users need what happened, what is safe, and what to do next - not a stack trace
* Map internal errors to a small set of user messages at the network and boundary edges
* Primary action first: Retry, Check connection, or Contact support - one clear CTA
* accessibilityLiveRegion announces errors without moving focus away from the task
* \_\_DEV\_\_ shows diagnostics; production shows the same calm copy on every screen
* Never echo raw API bodies - 'Request failed with status 500' is not actionable

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
// src/errors/userMessages.ts
export type UserFacingError = {
  title: string;
  body: string;
  action: "retry" | "settings" | "support" | "dismiss";
  actionLabel: string;
};
 
const NETWORK: UserFacingError = {
  title: "You're offline",
  body: "Check your connection and try again. Your changes are saved on this device.",
  action: "retry",
  actionLabel: "Try again",
};
 
const UNKNOWN: UserFacingError = {
  title: "Something went wrong",
  body: "We could not complete that. Try again in a moment.",
  action: "retry",
  actionLabel: "Try again",
};
 
export function toUserFacingError(error: unknown): UserFacingError {
  if (error instanceof TypeError && /network/i.test(error.message)) {
    return NETWORK;
  }
  if (isHttpError(error, 401)) {
    return {
      title: "Session expired",
      body: "Sign in again to continue.",
      action: "dismiss",
      actionLabel: "Sign in",
    };
  }
  if (isHttpError(error, 503)) {
    return {
      title: "Service busy",
      body: "Our servers are temporarily overloaded. Wait a few seconds and retry.",
      action: "retry",
      actionLabel: "Try again",
    };
  }
  return UNKNOWN;
}
 
function isHttpError(error: unknown, status: number): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status: number }).status === status
  );
}
```

```tsx
// src/components/ErrorCallout.tsx
import { Button, StyleSheet, Text, View } from "react-native";
import type { UserFacingError } from "@/errors/userMessages";
 
type Props = {
  error: UserFacingError;
  onAction: () => void;
};
 
export function ErrorCallout({ error, onAction }: Props) {
  return (
    <View
      style={styles.box}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.title}>{error.title}</Text>
      <Text style={styles.body}>{error.body}</Text>
      <Button title={error.actionLabel} onPress={onAction} />
    </View>
  );
}
 
const styles = StyleSheet.create({
  box: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#fecaca",
    gap: 8,
  },
  title: { fontSize: 16, fontWeight: "700", color: "#991b1b" },
  body: { color: "#7f1d1d", lineHeight: 20 },
});
```

**When to reach for this:**

* Any catch block, error boundary fallback, or failed fetch that would otherwise show `error.message` or a redbox.
* Offline and timeout states where the user can fix the problem without contacting support.
* Form submission failures where retry is safe and duplicate side effects are prevented.
* Empty states after errors - replace spinners that never resolve with honest copy.

## Working Example

```tsx
// src/errors/reportError.ts
import type { UserFacingError } from "./userMessages";
 
export function reportError(
  scope: string,
  cause: unknown,
  user: UserFacingError,
): void {
  if (__DEV__) {
    console.group(`[${scope}]`);
    console.error(cause);
    console.log("User copy:", user);
    console.groupEnd();
    return;
  }
  // Production: Sentry/Crashlytics with scope + cause; never attach user.title to analytics PII
}
 
// src/screens/ProfileScreen.tsx
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ErrorCallout } from "@/components/ErrorCallout";
import { reportError } from "@/errors/reportError";
import { toUserFacingError } from "@/errors/userMessages";
 
async function fetchProfile(): Promise<{ name: string }> {
  const response = await fetch("https://api.example.com/me");
  if (!response.ok) {
    throw { status: response.status, message: await response.text() };
  }
  return (await response.json()) as { name: string };
}
 
export function ProfileScreen() {
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userError, setUserError] = useState<ReturnType<
    typeof toUserFacingError
  > | null>(null);
 
  const load = useCallback(async () => {
    setLoading(true);
    setUserError(null);
    try {
      const data = await fetchProfile();
      setName(data.name);
    } catch (cause) {
      const user = toUserFacingError(cause);
      setUserError(user);
      reportError("ProfileScreen.load", cause, user);
    } finally {
      setLoading(false);
    }
  }, []);
 
  useEffect(() => {
    void load();
  }, [load]);
 
  if (loading) {
    return <ActivityIndicator accessibilityLabel="Loading profile" />;
  }
 
  if (userError) {
    return (
      <View style={styles.screen}>
        <ErrorCallout
          error={userError}
          onAction={() => {
            if (userError.action === "retry") void load();
            // wire sign-in / support / settings per action enum
          }}
        />
      </View>
    );
  }
 
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Hello, {name}</Text>
      <Button title="Refresh" onPress={() => void load()} />
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, justifyContent: "center", gap: 12 },
  title: { fontSize: 22, fontWeight: "700" },
});
 
// src/components/ScreenErrorBoundary.tsx - boundary copy matches the same tone
import { Component, type ReactNode } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
 
type Props = { children: ReactNode };
type State = { hasError: boolean };
 
export class ScreenErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
 
  static getDerivedStateFromError(): State {
    return { hasError: true };
  }
 
  componentDidCatch(error: Error) {
    if (__DEV__) console.error(error);
    // report to crash service in production
  }
 
  render() {
    if (this.state.hasError) {
      return (
        <View style={boundaryStyles.wrap} accessibilityRole="alert">
          <Text style={boundaryStyles.title}>This screen hit a snag</Text>
          <Text style={boundaryStyles.body}>
            The rest of the app still works. Try again or go back.
          </Text>
          <Button
            title="Try again"
            onPress={() => this.setState({ hasError: false })}
          />
        </View>
      );
    }
    return this.props.children;
  }
}
 
const boundaryStyles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 18, fontWeight: "700" },
  body: { color: "#64748b", lineHeight: 22 },
});
```

**What this demonstrates:**

* `toUserFacingError` maps messy internals to a fixed vocabulary of titles, bodies, and actions.
* `reportError` logs full detail in `__DEV__` only - production users never see stack traces.
* `ErrorCallout` uses `accessibilityRole="alert"` and `accessibilityLiveRegion` for VoiceOver/TalkBack.
* Error boundary copy matches fetch-error copy - same calm tone, same "Try again" pattern.

## Deep Dive

### How It Works

* **Single mapping layer** - Screens call `toUserFacingError(cause)` once; they never branch on `error.message` in JSX.
* **Structured user object** - `title`, `body`, `action`, `actionLabel` drive UI and analytics without leaking internals.
* **Separate reporting** - Crash reporters and log pipelines receive the raw `cause`; the UI receives only `UserFacingError`.
* **Action enum** - One primary CTA per error - retry, open settings, contact support, or dismiss. Secondary actions go in body copy as text links.
* **Consistent voice** - Short sentences, active voice, no blame ("Check your connection" not "You failed to connect").

### Message Formula

| Part | Guideline | Example |
| --- | --- | --- |
| Title | 3–6 words, no jargon | "You're offline" |
| Body | What happened + what is safe + hint | "Check your connection. Your draft is saved." |
| Action | One verb, matches recovery | "Try again" |
| Avoid | Status codes, exception names, URLs | Not "HTTP 503" or "TypeError: undefined" |

### Error Categories on Mobile

| Category | User title | Action |
| --- | --- | --- |
| Offline / timeout | You're offline | Retry |
| Auth expired | Session expired | Sign in |
| Server 5xx | Service busy | Retry |
| Permission denied | Permission needed | Open settings |
| Validation | Check highlighted fields | Dismiss |
| Unknown | Something went wrong | Retry or support |

### Dev vs Production

```tsx
export function DevDiagnostics({ error }: { error: unknown }) {
  if (!__DEV__) return null;
  return (
    <Text style={{ fontFamily: "monospace", fontSize: 11 }}>
      {error instanceof Error ? error.stack : String(error)}
    </Text>
  );
}
```

Render `DevDiagnostics` below `ErrorCallout` in development builds only. Strip it from release binaries - `__DEV__` is false in production.

### TypeScript Notes

```tsx
// Keep action handling exhaustive
function handleErrorAction(
  user: UserFacingError,
  handlers: Record<UserFacingError["action"], () => void>,
) {
  handlers[user.action]();
}
```

## Gotchas

* **Showing `error.message` from fetch** - Often `"Network request failed"` or raw HTML. **Fix:** Map to `UserFacingError`; log raw body in `reportError` only.
* **Stack traces in Alert.alert** - Common debug habit left in production. **Fix:** `Alert` gets `user.title` and `user.body` only.
* **Blaming the user** - "You entered invalid data" feels accusatory. **Fix:** "Check the highlighted fields" or "Use a valid email address."
* **Two competing CTAs** - "Retry" and "Contact support" with equal weight paralyzes mobile users. **Fix:** One primary `Button`; support as tertiary text link.
* **Silent failures** - Spinner stops with no message. **Fix:** Every failed async path sets `userError` or an inline field error.
* **Announcing errors aggressively** - `accessibilityLiveRegion="assertive"` on every keystroke validation interrupts screen readers. **Fix:** `polite` for form errors; `assertive` only for blocking screen-level failures.
* **Localized strings inline** - Hard-coded English in mappers blocks i18n. **Fix:** Return message keys (`errors.offline.title`) and resolve with `i18n.t` in the component.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Centralized mapper (this page) | Most app errors share a small vocabulary | Highly domain-specific errors needing unique UX per screen |
| Toast-only errors | Non-blocking background sync failures | Blocking errors - toasts disappear before users read them |
| Raw API `message` field | Backend owns trusted, user-tested copy end-to-end | Third-party APIs or verbose developer messages |
| Error codes in UI ("E1042") | Support-heavy B2B with trained agents | Consumer apps - codes feel like blame |
| Redbox / LogBox in production | Never | Development only - redboxes are not user-facing copy |

## FAQs

Should I ever show technical details to users?

No in production. In `__DEV__`, show stacks below the friendly callout for engineers. Support staff can look up incidents by timestamp/user ID in your dashboard - users do not need a fault code on screen.

How long should error body copy be?

One or two short sentences (roughly 120 characters). Mobile screens are narrow; long apologies push the action button below the fold.

What tone should error copy use?

Calm, direct, and helpful. Acknowledge the problem, state what is preserved ("your draft is saved"), and give one next step. Avoid humor for payment, health, or auth errors.

How do error boundaries differ from fetch error copy?

Boundaries catch render errors - copy should reassure that the **rest of the app works** and offer "Try again" or navigation back. Fetch errors are **operation** failures - copy can be specific (offline, session expired).

Should retry buttons auto-retry?

Let the user tap retry - auto-retry loops frustrate users on airplane mode and waste battery. Exception: background sync with exponential backoff, invisible to the user.

How do I handle form field errors?

Inline under the field for validation ("Enter a valid email"). Screen-level `ErrorCallout` for submit failures (server rejected the form). Do not duplicate the same message in both places.

What about i18n?

Store translation keys in the mapper, not literal strings, before the app ships multiple locales. Keep English strings as defaults for early-stage apps.

Should I include a support link on every error?

Reserve support for `UNKNOWN` or repeated failures after retry. Offline and session-expired errors are user-fixable - support links add noise.

How does this relate to network failure UX?

Network failure UX covers banners, queues, and stale-while-revalidate. User-facing copy is the **wording layer** inside those patterns - same tone whether in a banner or a full-screen error.

Can I use the API error message if it is user-friendly?

Only if you control the API and test the strings. Wrap even trusted messages in a whitelist map - unexpected deploys can leak SQL fragments or internal service names.

What accessibility props matter most?

`accessibilityRole="alert"`, `accessibilityLiveRegion="polite"` (or `assertive` for critical blockers), and a visible focus order that lands on the action button after announcement.

How do global error handlers fit in?

`ErrorUtils.setGlobalHandler` catches unhandled native/JS fatals - pair with a generic "Something went wrong" screen and restart prompt. See [Global Error Handlers](https://docs.wahwei/reactnative.codeguides.io/error-resilience/global-error-handlers/) for wiring; this page owns the copy.

## Related

* [Network Failure UX](https://docs.wahwei/reactnative.codeguides.io/error-resilience/network-failure-ux/) - offline banners and retry queues that use this copy layer
* [Error Boundaries in RN](https://docs.wahwei/reactnative.codeguides.io/error-resilience/error-boundaries-in-rn/) - where screen-level fallback UI appears
* [Global Error Handlers](https://docs.wahwei/reactnative.codeguides.io/error-resilience/global-error-handlers/) - last-resort fatals after boundaries miss
* [Error Handling Basics](https://docs.wahwei/reactnative.codeguides.io/error-resilience/error-handling-basics/) - where to catch vs where to boundary
* [Graceful Degradation Patterns](https://docs.wahwei/reactnative.codeguides.io/error-resilience/graceful-degradation-patterns/) - copy for degraded and unavailable tiers
* [Feature Flags for Safe Rollout](https://docs.wahwei/reactnative.codeguides.io/error-resilience/feature-flags-for-safe-rollout/) - fallback messaging when a feature is disabled

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
