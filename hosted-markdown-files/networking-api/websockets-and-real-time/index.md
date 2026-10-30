# WebSockets & Real-Time

Reconnect strategies and battery-aware polling fallbacks for live data on Expo SDK 57 without draining battery in background.

Highlights / WebSockets & Real-Time

* WebSockets stay open - iOS and Android will suspend them in background without a keepalive strategy
* Exponential reconnect backoff prevents reconnect storms when towers recover
* Fall back to polling when backgrounded or on metered networks to save battery
* AppState drives connect/disconnect - do not leave sockets open when inactive
* Pair real-time updates with TanStack Query cache patches - avoid duplicate sources of truth

## Recipe

> Quick-reference recipe card - copy-paste ready.

```ts
// src/realtime/useReconnectingSocket.ts
import { useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
 
type Options = {
  url: string;
  onMessage: (data: unknown) => void;
  maxBackoffMs?: number;
};
 
export function useReconnectingSocket({ url, onMessage, maxBackoffMs = 30_000 }: Options) {
  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const [connected, setConnected] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);
 
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;
 
    function connect() {
      if (closed || appState.current !== "active") return;
 
      const ws = new WebSocket(url);
      wsRef.current = ws;
 
      ws.onopen = () => {
        attemptRef.current = 0;
        setConnected(true);
      };
 
      ws.onmessage = (event) => {
        try {
          onMessage(JSON.parse(String(event.data)));
        } catch {
          onMessage(event.data);
        }
      };
 
      ws.onclose = () => {
        setConnected(false);
        if (closed || appState.current !== "active") return;
        const delay = Math.min(1000 * 2 ** attemptRef.current, maxBackoffMs);
        attemptRef.current += 1;
        timer = setTimeout(connect, delay * (0.5 + Math.random() * 0.5));
      };
 
      ws.onerror = () => ws.close();
    }
 
    const sub = AppState.addEventListener("change", (next) => {
      appState.current = next;
      if (next === "active") {
        connect();
      } else {
        wsRef.current?.close();
        wsRef.current = null;
        setConnected(false);
      }
    });
 
    connect();
 
    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      wsRef.current?.close();
      sub.remove();
    };
  }, [url, maxBackoffMs, onMessage]);
 
  return { connected };
}
```

**When to reach for this:**

* Chat, live scores, collaborative cursors, or order-status streams.
* Foreground-first experiences where sub-second latency matters.
* Apps that can **degrade to polling** when backgrounded.

## Working Example

```tsx
import NetInfo from "@react-native-community/netinfo";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, FlatList, StyleSheet, Text, View } from "react-native";
 
type Message = { id: string; text: string; ts: number };
 
const WS_URL = "wss://echo.websocket.events"; // replace with your gateway
const POLL_MS_FOREGROUND = 15_000;
const POLL_MS_BACKGROUND = 120_000;
 
export function ChatScreen() {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [mode, setMode] = useState<"socket" | "poll">("socket");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
 
  const appendMessage = useCallback(
    (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
      queryClient.setQueryData<Message[]>(["inbox"], (old = []) => [...old, msg]);
    },
    [queryClient]
  );
 
  // WebSocket path (foreground)
  useEffect(() => {
    if (mode !== "socket") return;
 
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let disposed = false;
 
    function connect() {
      if (disposed || AppState.currentState !== "active") return;
      ws = new WebSocket(WS_URL);
 
      ws.onopen = () => {
        attempt = 0;
      };
 
      ws.onmessage = (e) => {
        appendMessage({
          id: String(Date.now()),
          text: String(e.data),
          ts: Date.now(),
        });
      };
 
      ws.onclose = () => {
        if (disposed) return;
        const delay = Math.min(1000 * 2 ** attempt++, 20_000);
        reconnectTimer = setTimeout(connect, delay);
      };
    }
 
    connect();
 
    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [mode, appendMessage]);
 
  // Battery-aware fallback: polling when backgrounded or on cellular policy
  useEffect(() => {
    async function pickMode() {
      const net = await NetInfo.fetch();
      const background = AppState.currentState !== "active";
      const expensive = net.type === "cellular";
 
      if (background || expensive) {
        setMode("poll");
      } else {
        setMode("socket");
      }
    }
 
    void pickMode();
 
    const appSub = AppState.addEventListener("change", () => void pickMode());
    const netSub = NetInfo.addEventListener(() => void pickMode());
 
    return () => {
      appSub.remove();
      netSub.remove();
    };
  }, []);
 
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
 
    if (mode !== "poll") return;
 
    const interval =
      AppState.currentState === "active" ? POLL_MS_FOREGROUND : POLL_MS_BACKGROUND;
 
    pollRef.current = setInterval(async () => {
      // Replace with your REST delta endpoint
      const res = await fetch("https://jsonplaceholder.typicode.com/comments?_limit=1");
      if (!res.ok) return;
      const data = await res.json();
      appendMessage({
        id: `poll-${Date.now()}`,
        text: data[0]?.body ?? "poll tick",
        ts: Date.now(),
      });
    }, interval);
 
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [mode, appendMessage]);
 
  return (
    <View style={styles.screen}>
      <Text style={styles.badge}>
        Transport: {mode === "socket" ? "WebSocket" : "polling"} ({mode === "poll" ? "battery-aware" : "live"})
      </Text>
      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <Text style={styles.row}>{item.text}</Text>}
      />
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, backgroundColor: "#fff" },
  badge: { fontSize: 12, color: "#64748b", marginBottom: 8 },
  row: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#e2e8f0" },
});
```

```bash
npx expo install @react-native-community/netinfo @tanstack/react-query
```

**What this demonstrates:**

* **Reconnect with exponential backoff** when the socket drops on LTE handoff.
* **AppState disconnect** in background - avoids iOS watchdog kills and wasted radio time.
* **Polling fallback** with slower interval when backgrounded or on cellular - battery-aware degradation.
* **TanStack Query cache patch** via `setQueryData` - one inbox source for list screens.
* **NetInfo policy** toggles transport mode - product decision, not one-size-fits-all.

## Deep Dive

### Reconnect Strategy

| Phase | Action |
| --- | --- |
| `onclose` / `onerror` | Close socket, schedule reconnect |
| Backoff | `min(1000 * 2^attempt, 30s)` + jitter |
| App background | Cancel reconnect timer; close socket |
| App foreground | Reset attempt counter optional; connect immediately |
| Auth expiry | Send refresh token over REST first - see [Auth Session](https://docs.wahwei/reactnative.codeguides.io/auth-session/auth-session-lifecycle/) |

```ts
// Heartbeat - detect half-open connections
const ping = setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
}, 25_000);
```

* Servers should respond to **ping/pong** or close idle connections
* **Do not heartbeat in background** if you disconnected intentionally

### Battery-Aware Polling Fallback

| State | Suggested interval | Transport |
| --- | --- | --- |
| Foreground + Wi‑Fi | WebSocket or 10–15 s poll | Real-time |
| Foreground + cellular | WebSocket or 30 s poll | Product choice |
| Background | 60–300 s poll or none | Polling only if business requires |
| Offline | Stop both | Queue events locally |

* **iOS suspends JS timers** in background - use push notifications for must-deliver events
* **Android Doze** delays network - do not assume socket survival overnight
* For must-sync offline events, use [Background Sync](https://docs.wahwei/reactnative.codeguides.io/data-offline/background-sync-and-taskmanager/)

### Server- Sent Events and Socket.io

| Technology | RN support | Notes |
| --- | --- | --- |
| Native WebSocket | ✅ Built-in | Lowest overhead |
| Socket.io client | ✅ JS client | Extra protocol + bundle; match server |
| SSE (`EventSource`) | ⚠️ Limited | Often polyfilled; WS is simpler on RN |
| Firebase / Supabase realtime | ✅ SDKs | Managed reconnect; vendor lock-in |

### Merge Real-Time into Cached State

```tsx
queryClient.setQueryData<Thread>(["thread", id], (old) => {
  if (!old) return old;
  return { ...old, messages: [...old.messages, incoming] };
});
```

* **Invalidate** on reconnect gap: `refetchQueries` after `onopen` to backfill missed events
* **Version vectors** or `since=cursor` query params close the gap - document with backend
* Avoid maintaining parallel `useState` and Query cache - pick Query as source of truth

## Gotchas

* **Leaving WebSocket open in background** - Battery drain and iOS kill. **Fix:** Close on `background`; poll or push instead.
* **Reconnect without backoff** - Thundering herd on tower recovery. **Fix:** Exponential delay + jitter.
* **No gap fill after reconnect** - Missed messages while disconnected. **Fix:** REST delta with `since` cursor on `onopen`.
* **Duplicate messages** - Server replay + client append. **Fix:** Dedupe by `message.id`.
* **Ignoring auth token expiry on WS** - Silent disconnect loops. **Fix:** Refresh session before reconnect.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| WebSocket + reconnect hook | Chat, live dashboards | Rare updates - polling is simpler |
| Long polling | Corporate proxies block WS | You need sub-second latency |
| FCM / APNs push | Background must-know events | In-app typing indicators |
| TanStack Query refetch interval | Low-frequency stock prices | High-frequency streams |

## FAQs

Does React Native support WebSocket?

Yes - global `WebSocket` is available in Hermes. Use `wss://` in production; avoid cleartext `ws://` except local dev.

Should I use WebSockets on cellular?

Often yes for foreground chat. For background or metered-only features, degrade to slower polling or push notifications.

How do I authenticate a WebSocket?

Pass a short-lived token in query string (`wss://api.example.com/ws?token=`) or send an auth frame immediately after `onopen`. Refresh via REST before reconnect - [Mobile Auth Basics](https://docs.wahwei/reactnative.codeguides.io/auth-session/mobile-auth-basics/).

What interval for polling fallback?

Foreground: **15–30 s**. Background: **2–5 min** or stop entirely and rely on push. Measure battery with profiling tools on mid-tier Android.

Can Expo Go test WebSockets?

Yes for `wss` endpoints. Production auth and custom native gateways need dev-client builds - same as REST.

## Related

* [TanStack Query on Mobile](https://docs.wahwei/reactnative.codeguides.io/networking-api/tanstack-query-on-mobile/) - cache updates from socket events
* [Retries, Backoff & Idempotency](https://docs.wahwei/reactnative.codeguides.io/networking-api/retries-backoff-and-idempotency/) - backoff shared with HTTP
* [Background Sync](https://docs.wahwei/reactnative.codeguides.io/data-offline/background-sync-and-taskmanager/) - defer work when socket unavailable
* [Network Failure UX](https://docs.wahwei/reactnative.codeguides.io/error-resilience/network-failure-ux/) - offline banners during reconnect
* [Networking Best Practices](https://docs.wahwei/reactnative.codeguides.io/networking-api/best-practices/) - section summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
