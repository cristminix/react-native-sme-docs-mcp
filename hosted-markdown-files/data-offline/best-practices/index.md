# Data Layer Best Practices

A condensed summary of the 25 most important best practices drawn from every page in this section.

Highlights / Data Layer Best Practices

* Treat connectivity as a feature state - publish a four-state UX contract
* Version every local schema: AsyncStorage meta, SQLite user\_version, MMKV meta keys
* Server-authoritative sync is the safest default for regulated data
* Idempotency-Key on every outbox replay - reconnect must not duplicate rows
* TanStack Query for server snapshots; SQLite for offline-created relational rows
* Background tasks supplement foreground flush - they do not replace NetInfo reconnect

1. **Assume the network is unreliable:** Design reads from local cache first and writes as async reconciliation - not as blocking `fetch` gates on every screen.
2. **Publish a UX contract:** Users must always know whether data is live, stale, syncing, or unavailable - agree on copy with design before implementation.
3. **Use NetInfo for connectivity - not fetch probes:** `@react-native-community/netinfo` reflects ongoing reachability; a one-time HTTP ping on mount lies in captive portals.
4. **Hide the offline banner during unknown reachability:** `isInternetReachable === null` on cold start is not offline - wait for a definitive false before alerting.
5. **Wire `onlineManager` to NetInfo at bootstrap:** TanStack Query should pause retries offline - uncapped retries on airplane mode drain battery and spam logs.
6. **Wire `focusManager` to AppState:** Refetch policies should respect mobile foreground/background - not desktop `window.focus` assumptions.
7. **Stale-while-revalidate by default:** Show cached Query data with a `dataUpdatedAt` label - full-screen spinners only when `isPending && !data`.
8. **Distinguish offline from server errors:** Different headlines, retry paths, and analytics - a 500 with cached data is not the same as airplane mode.
9. **Accept local writes offline:** Enqueue mutations with `idempotencyKey` - users should not lose form submits in a tunnel.
10. **Pick storage by data shape:** AsyncStorage for small JSON; SQLite for relational rows; MMKV for synchronous hot-path reads - not one store for everything.
11. **Version every persisted schema:** `app:storage:meta:v1` for AsyncStorage, `PRAGMA user_version` for SQLite, `meta:schemaVersion` for MMKV - ship migrations before new shapes reach production.
12. **Run migrations before first screen render:** Boot gate in root `_layout` - screens must never read unmigrated keys or tables.
13. **Recover from corruption without white-screening:** `safeParse` + scoped key reset - quarantine outbox before `clear()` in field apps.
14. **Namespace storage keys by domain:** `sync:outbox:v1`, `user:preferences:v1` - avoids accidental cross-feature wipes and eases logout scoping.
15. **Enable SQLite WAL and foreign keys on create:** `PRAGMA journal_mode = WAL` and `foreign_keys = ON` on every new database - performance and referential integrity from day one.
16. **Use prepared statements or `db.sql` templates:** Never concatenate user input into `execAsync` - SQL injection applies on device too.
17. **Use `withExclusiveTransactionAsync` for multi-write bundles:** Default `withTransactionAsync` can interleave concurrent queries - exclusive scope for inspection saves.
18. **Add `synced`, `updated_at`, and tombstones to sync tables:** Deletes must replicate - soft-delete flags beat hard removal for offline sync.
19. **Default to server-authoritative reconciliation:** Money, inventory, and compliance data should not use naive last-write-wins - document discarded edits in UX.
20. **Pair LWW with server timestamps:** Client `Date.now()` alone loses concurrent offline edits - replace `updated_at` with server value on every ack.
21. **Implement optimistic UI with rollback:** TanStack Query `onMutate` snapshots prior cache; `onError` restores it - per-row `pending` flags beat global spinners.
22. **Persist failed mutations - optimistic UI without a queue loses creates:** AsyncStorage or SQLite outbox replays on reconnect with the same idempotency key.
23. **Register background sync in global scope:** `TaskManager.defineTask` before React mounts; `registerTaskAsync` after login - flush outbox in OS deferrable windows.
24. **Treat background tasks as a safety net:** Foreground flush on NetInfo reconnect is primary - `minimumInterval: 15` minutes is not real-time delivery.
25. **Logout clears all layers:** `queryClient.clear()`, session AsyncStorage keys, MMKV user instance, and SQLite user tables - stale cache is a security defect.

## FAQs

What is the default greenfield offline stack?

TanStack Query + NetInfo + AsyncStorage (prefs/outbox) + expo-sqlite (relational offline data). Add MMKV when profiling proves AsyncStorage is on the hot path. Add `expo-background-task` when field apps need deferred flush.

AsyncStorage or SQLite for the mutation outbox?

AsyncStorage queue for dozens of small JSON patches. SQLite when the outbox references relational rows, attachments, or thousands of pending items - see [AsyncStorage Patterns](https://docs.wahwei/reactnative.codeguides.io/data-offline/asyncstorage-patterns/) and [expo-sqlite](https://docs.wahwei/reactnative.codeguides.io/data-offline/expo-sqlite/).

Do I need CRDTs?

Rarely for single-device field capture. Adopt when true multi-user simultaneous editing is a product requirement - see [Sync Strategies](https://docs.wahwei/reactnative.codeguides.io/data-offline/sync-strategies/).

How does this section relate to TanStack Query docs?

Query owns **server-state cache and optimistic mutations**. This section owns **durability, sync, and OS lifecycle** - cross-read [../state-management/tanstack-query/tanstack-query.md](https://docs.wahwei/reactnative.codeguides.io/state-management/tanstack-query/).

## Related

* [Offline-First Basics](https://docs.wahwei/reactnative.codeguides.io/data-offline/offline-first-basics/) - connectivity assumptions and SWR
* [AsyncStorage Patterns](https://docs.wahwei/reactnative.codeguides.io/data-offline/asyncstorage-patterns/) - KV versioning and migrations
* [expo-sqlite](https://docs.wahwei/reactnative.codeguides.io/data-offline/expo-sqlite/) - relational offline storage
* [MMKV & High-Performance KV](https://docs.wahwei/reactnative.codeguides.io/data-offline/mmkv-and-high-performance-kv/) - synchronous hot paths
* [Sync Strategies](https://docs.wahwei/reactnative.codeguides.io/data-offline/sync-strategies/) - conflict resolution
* [Optimistic UI](https://docs.wahwei/reactnative.codeguides.io/data-offline/optimistic-ui/) - rollback and pending states
* [Background Sync & TaskManager](https://docs.wahwei/reactnative.codeguides.io/data-offline/background-sync-and-taskmanager/) - deferred uploads
* [../state-management/tanstack-query/tanstack-query.md](https://docs.wahwei/reactnative.codeguides.io/state-management/tanstack-query/) - server-state cache layer
* [../error-resilience/network-failure-ux/network-failure-ux.md](https://docs.wahwei/reactnative.codeguides.io/error-resilience/network-failure-ux/) - banners and retry UX

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4). cGJxcnRodnFyZi52YnxwdHZiOTQ2fDIwMjYwNw==

Reviewed by Chris St. John·Last updated Jul 19, 2026
