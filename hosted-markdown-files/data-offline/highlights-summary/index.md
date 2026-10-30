# Data & Offline-First Highlights Summary

Every highlight bullet from the 8 pages in this section, gathered on one page and grouped by the page it came from.

Highlights / Data & Offline-First Highlights Summary

* Assume the network is unreliable - design reads from local storage first
* Use @react-native-async-storage/async-storage for small JSON blobs - not relational data
* openDatabaseAsync + WAL mode for durable offline relational storage
* react-native-mmkv offers synchronous mmap reads - orders of magnitude faster than AsyncStorage
* Pick a conflict strategy before shipping offline writes - retrofitting is expensive
* Optimistic UI updates the cache before the server ack - users feel zero latency

## [Offline-First Basics](https://docs.wahwei/reactnative.codeguides.io/data-offline/offline-first-basics/)

* Assume the network is unreliable - design reads from local storage first
* Publish a UX contract: what users see offline, stale, syncing, and failed
* NetInfo drives banners and TanStack Query onlineManager - not one-time fetch probes
* Stale-while-revalidate: show cached data with a last-updated label
* Distinguish offline from server errors - different copy and retry behavior
* Queue mutations locally when disconnected; replay with idempotency on reconnect
* Pick storage by shape: AsyncStorage for small JSON, SQLite for relational, MMKV for hot paths

## [AsyncStorage Patterns](https://docs.wahwei/reactnative.codeguides.io/data-offline/asyncstorage-patterns/)

* Use @react-native-async-storage/async-storage for small JSON blobs - not relational data
* Version every persisted schema with a meta key and stepwise migrations
* Wrap read/write in try/catch - corrupted JSON should reset to defaults, not crash boot
* Namespace keys by domain: prefs:v1, sync:outbox:v1 - never one global dump
* Pair with TanStack Query persister for server-state hydration on cold start
* AsyncStorage is async and relatively slow - batch writes and avoid hot-path reads

## [expo-sqlite](https://docs.wahwei/reactnative.codeguides.io/data-offline/expo-sqlite/)

* openDatabaseAsync + WAL mode for durable offline relational storage
* PRAGMA user\_version drives stepwise SQL migrations at boot
* Prepared statements and db.sql tagged templates prevent SQL injection
* SQLiteProvider + useSQLiteContext integrate the DB into React trees
* withExclusiveTransactionAsync for writes that must not interleave
* Use for field forms, inspection lists, and Query persisters too large for AsyncStorage

## [MMKV & High-Performance KV](https://docs.wahwei/reactnative.codeguides.io/data-offline/mmkv-and-high-performance-kv/)

* react-native-mmkv offers synchronous mmap reads - orders of magnitude faster than AsyncStorage
* Use for feature flags, draft snippets, UI toggles, and high-frequency read paths
* Requires a development build - not available in stock Expo Go
* Multiple named instances isolate domains: user, cache, experiments
* Optional encryption with a key stored in expo-secure-store
* Still not a database - no queries, joins, or migration SQL

## [Sync Strategies](https://docs.wahwei/reactnative.codeguides.io/data-offline/sync-strategies/)

* Pick a conflict strategy before shipping offline writes - retrofitting is expensive
* Last-write-wins (LWW) needs server clocks or hybrid logical clocks - not device Date.now alone
* Server-authoritative reconciliation is the default for regulated and commerce data
* CRDTs enable merge-without-conflict for text and counters - server must understand the model
* Idempotency-Key headers make outbox replay safe after reconnect
* TanStack Query invalidateQueries after sync - local SQLite remains source of truth until flush

## [Optimistic UI](https://docs.wahwei/reactnative.codeguides.io/data-offline/optimistic-ui/)

* Optimistic UI updates the cache before the server ack - users feel zero latency
* TanStack Query onMutate snapshots prior cache for automatic rollback on error
* Always pair optimistic mutations with offline outbox when network is flaky
* Show pending state per row - not only global spinners
* Rollback must restore exact prior cache - including pagination cursors
* Conflict after optimistic success needs reconcile UX, not silent overwrite

## [Background Sync & TaskManager](https://docs.wahwei/reactnative.codeguides.io/data-offline/background-sync-and-taskmanager/)

* TaskManager.defineTask must run in global scope - before React mounts
* expo-background-task schedules deferrable work via WorkManager (Android) and BGTaskScheduler (iOS)
* Minimum interval is 15 minutes - not real-time; foreground flush still required
* Return BackgroundTaskResult.Success or Failed - failed tasks may retry per OS policy
* iOS background tasks require a physical device - simulators do not run BGTaskScheduler
* Use for outbox flush and attachment upload - not user-visible latency-critical paths

## [Data Layer Best Practices](https://docs.wahwei/reactnative.codeguides.io/data-offline/best-practices/)

* Treat connectivity as a feature state - publish a four-state UX contract
* Version every local schema: AsyncStorage meta, SQLite user\_version, MMKV meta keys
* Server-authoritative sync is the safest default for regulated data
* Idempotency-Key on every outbox replay - reconnect must not duplicate rows
* TanStack Query for server snapshots; SQLite for offline-created relational rows
* Background tasks supplement foreground flush - they do not replace NetInfo reconnect

Reviewed by Chris St. John·Last updated Jul 18, 2026
