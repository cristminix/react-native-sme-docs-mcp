# Background Sync & TaskManager

`expo-background-task` and `expo-task-manager` for deferred uploads. Mobile OSes **kill foreground network work** when users switch apps. Register a background worker to flush SQLite outboxes, upload attachments, and pull deltas - within strict battery and scheduling limits.

Highlights / Background Sync & TaskManager

* TaskManager.defineTask must run in global scope - before React mounts
* expo-background-task schedules deferrable work via WorkManager (Android) and BGTaskScheduler (iOS)
* Minimum interval is 15 minutes - not real-time; foreground flush still required
* Return BackgroundTaskResult.Success or Failed - failed tasks may retry per OS policy
* iOS background tasks require a physical device - simulators do not run BGTaskScheduler
* Use for outbox flush and attachment upload - not user-visible latency-critical paths

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install expo-background-task expo-task-manager
```

```ts
// src/background/syncTask.ts - import this file at app entry (global scope)
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
 
export const SYNC_TASK = "offline-sync-worker";
 
TaskManager.defineTask(SYNC_TASK, async () => {
  try {
    // Open DB, flush outbox, upload files - keep work short
    console.log("[sync] background worker ran");
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.error("[sync] background worker failed", error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});
```

```ts
// src/background/registerSyncTask.ts
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { SYNC_TASK } from "./syncTask";
 
export async function registerSyncTask() {
  const status = await BackgroundTask.getStatusAsync();
  if (status === BackgroundTask.BackgroundTaskStatus.Restricted) return;
 
  const registered = await TaskManager.isTaskRegisteredAsync(SYNC_TASK);
  if (!registered) {
    await BackgroundTask.registerTaskAsync(SYNC_TASK, {
      minimumInterval: 15, // minutes - OS may delay further
    });
  }
}
```

```ts
// index.ts or app/_layout.tsx - side-effect import at top
import "@/background/syncTask";
```

**When to reach for this:**

* Flushing pending SQLite / AsyncStorage outbox when app is backgrounded
* Uploading inspection photos after field capture
* Incremental catalog pull that should not block foreground UX

**When to avoid:**

* User waiting for immediate confirmation - flush on reconnect in foreground
* Sub-minute polling - OS will not honor it; use push notifications or foreground refetch

## Working Example

Deferred outbox flush with expo-sqlite and development-build testing hook.

```bash
npx expo install expo-background-task expo-task-manager expo-sqlite
```

```ts
// src/background/syncTask.ts
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import * as SQLite from "expo-sqlite";
import { flushWorkOrders } from "@/sync/flushOutbox";
 
export const SYNC_TASK = "offline-sync-worker";
 
TaskManager.defineTask(SYNC_TASK, async () => {
  try {
    const db = await SQLite.openDatabaseAsync("field.db");
    // flushWorkOrders without QueryClient - background has no React tree
    await flushWorkOrders(db, null);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.error("[sync] failed", error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});
```

```ts
// src/sync/flushOutbox.ts (excerpt) - tolerate null queryClient in background
export async function flushWorkOrders(
  db: SQLiteDatabase,
  queryClient: QueryClient | null
) {
  // ... push pending rows ...
  if (queryClient) {
    await queryClient.invalidateQueries({ queryKey: ["work-orders"] });
  }
}
```

```tsx
// app/_layout.tsx
import "@/background/syncTask"; // global defineTask side effect
 
import { Stack } from "expo-router";
import { useEffect } from "react";
import * as BackgroundTask from "expo-background-task";
import { registerSyncTask } from "@/background/registerSyncTask";
import { setupMobileQuery } from "@/lib/setupMobileQuery";
 
export default function RootLayout() {
  useEffect(() => {
    setupMobileQuery();
    registerSyncTask();
  }, []);
 
  return <Stack />;
}
```

```tsx
// src/dev/TriggerBackgroundSync.tsx - development only
import * as BackgroundTask from "expo-background-task";
import { Button } from "react-native";
 
export function TriggerBackgroundSync() {
  if (!__DEV__) return null;
 
  return (
    <Button
      title="Test background sync"
      onPress={() => BackgroundTask.triggerTaskWorkerForTestingAsync()}
    />
  );
}
```

```ts
// app.config.ts (excerpt) - CNG applies iOS BGTaskScheduler keys automatically
export default {
  expo: {
    name: "FieldApp",
    plugins: [
      "expo-router",
      // expo-background-task config plugin applies UIBackgroundModes + BGTaskSchedulerPermittedIdentifiers
    ],
  },
};
```

## Deep Dive

### Global task registration

`TaskManager.defineTask` **must execute in global scope** - not inside a React component body. Pattern:

```text
src/background/syncTask.ts   ← defineTask here
app/_layout.tsx              ← import "@/background/syncTask" as first side effect
```

If the task is undefined when the OS wakes your app, the worker crashes silently or logs a TaskManager error.

### Registration vs definition

| Step | API | Where |
| --- | --- | --- |
| Define handler | `TaskManager.defineTask(name, fn)` | Global module |
| Schedule with OS | `BackgroundTask.registerTaskAsync(name, options)` | After user consent / login |
| Unregister | `BackgroundTask.unregisterTaskAsync(name)` | Logout or opt-out |

`registerTaskAsync` persists across app restarts - check `isTaskRegisteredAsync` before re-registering.

### iOS configuration

Background processing requires:

* `UIBackgroundModes` → `processing`
* `BGTaskSchedulerPermittedIdentifiers` → `com.expo.modules.backgroundtask.processing`

Expo **prebuild / CNG** applies these via the `expo-background-task` plugin. Bare projects must edit `Info.plist` manually. **Simulators do not run BGTaskScheduler** - test on device.

### Android WorkManager

`minimumInterval: 15` is the floor in minutes. WorkManager also expects network + battery constraints - your task runs when conditions align, not exactly at T+15.

Inspect scheduled jobs:

```bash
adb shell dumpsys jobscheduler | grep -A 40 -m 1 -E "JOB #.* "
```

### Expiration on iOS

```ts
BackgroundTask.addExpirationListener(() => {
  // Persist partial progress; return quickly from defineTask
});
```

iOS may stop long uploads - checkpoint file uploads and resume in the next run.

### Attachment upload worker

```ts
TaskManager.defineTask(UPLOAD_TASK, async () => {
  const pending = await listPendingUploads(); // SQLite: uploaded = 0
  for (const file of pending) {
    await uploadChunked(file); // short batches
  }
  return BackgroundTask.BackgroundTaskResult.Success;
});
```

Store **local file URI + remote URL** in SQLite - never pass multi-MB blobs through JS on every wake.

### Foreground + background hybrid

```text
Recommended sync stack:
 
1. Optimistic UI + outbox on user action (foreground)
2. NetInfo reconnect → immediate flush (foreground)
3. BackgroundTask → flush remainder when app backgrounded
4. Manual "Sync now" for field supervisors
```

Background is a **safety net** - not the primary delivery path.

## Gotchas

* **`defineTask` inside a component** - Task undefined on cold start from OS. **Fix:** Global module import at entry.
* **Expecting immediate execution** - First run may be hours later on iOS. **Fix:** Foreground flush on reconnect; background for leftovers.
* **Testing only on iOS Simulator** - BG tasks never fire. **Fix:** Physical device + `triggerTaskWorkerForTestingAsync` in `__DEV__`.
* **Long synchronous work in defineTask** - iOS kills tasks that exceed budget. **Fix:** Batch uploads; listen for expiration; return `Success` early.
* **Using React hooks inside defineTask** - No React tree in background entry. **Fix:** Open SQLite / AsyncStorage directly; no `useQueryClient`.
* **Forgetting prebuild after adding plugin** - Console: `No task request with identifier … scheduled`. **Fix:** `npx expo prebuild` or EAS build with updated native config.
* **Multiple registered tasks** - Expo uses a **single native worker** - last registration wins minimum interval. **Fix:** One `defineTask` orchestrating all deferrable work.

49454e4f4d5f434e4f5904434556494d4345131d1c56181a181c1a1d

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `expo-background-task` | Deferrable sync, uploads, prefetch | Real-time chat delivery |
| Foreground NetInfo flush | User expects immediate sync on reconnect | Large backlog only addressable while backgrounded |
| Push notification (silent) | Server-triggered pull with APNs/FCM | Android OEM background restrictions without fallback |
| `expo-background-fetch` (legacy) | Maintaining older SDK apps | New SDK 57 projects - prefer `expo-background-task` |
| User-initiated "Sync now" | Supervisors need control | Fully automated field capture |

## FAQs

How do I install background task packages on SDK 57?

```bash
npx expo install expo-background-task expo-task-manager
```

Requires a **development build** for full native behavior - verify on device after `npx expo prebuild`.

Why must defineTask be global?

When iOS/Android wakes your app for a background event, React may not be mounted. The native runtime looks up the task by name in TaskManager's global registry - registration inside a component runs too late or not at all.

What minimumInterval should I use?

Start with **15** (minutes) - the platform minimum. iOS may still defer to overnight windows. Do not use background tasks for sub-15-minute freshness requirements.

How do I test without waiting hours?

```ts
await BackgroundTask.triggerTaskWorkerForTestingAsync();
```

Development builds only. Move app to background on Android before forcing job run via `adb` (see Expo docs).

Does background sync run when the app is force-quit?

* **iOS:** Swiping away in app switcher **terminates** the app - scheduled tasks resume after next user launch registers them again.
* **Android:** Behavior varies by OEM - see [dontkillmyapp.com](https://dontkillmyapp.com/).

Design for **resume on next open** + outbox durability in SQLite.

Can I use TanStack Query in the background task?

Not directly - no provider in the background entry. Flush data in imperative code; invalidate Query cache next time the user opens the app foreground.

What return value should defineTask use?

Return `BackgroundTask.BackgroundTaskResult.Success` when work completed or nothing was pending. Return `Failed` when data is still pending and you want the OS to consider retry - pair with idempotent flush logic.

How does this relate to expo-task-manager location tasks?

Same `TaskManager.defineTask` API - different trigger sources. Background sync uses `expo-background-task` scheduling; location uses `expo-location` APIs. Keep task names unique per worker type.

## Related

* [Sync Strategies](https://docs.wahwei/reactnative.codeguides.io/data-offline/sync-strategies/) - idempotent flush and reconciliation
* [expo-sqlite](https://docs.wahwei/reactnative.codeguides.io/data-offline/expo-sqlite/) - durable outbox tables
* [AsyncStorage Patterns](https://docs.wahwei/reactnative.codeguides.io/data-offline/asyncstorage-patterns/) - lightweight outbox queue
* [Optimistic UI](https://docs.wahwei/reactnative.codeguides.io/data-offline/optimistic-ui/) - foreground mutations before background flush
* [Offline-First Basics](https://docs.wahwei/reactnative.codeguides.io/data-offline/offline-first-basics/) - connectivity and UX contracts
* [../state-management/tanstack-query/tanstack-query.md](https://docs.wahwei/reactnative.codeguides.io/state-management/tanstack-query/) - invalidate cache after foreground resume
* [Data Layer Best Practices](https://docs.wahwei/reactnative.codeguides.io/data-offline/best-practices/) - section summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 19, 2026
