# expo-sqlite

Local relational data, migrations, and typed queries. `expo-sqlite` is the default **relational offline store** for Expo SDK 57 - inspections, job checklists, draft forms with foreign keys, and large cached datasets that do not fit AsyncStorage JSON blobs.

Highlights / expo-sqlite

* openDatabaseAsync + WAL mode for durable offline relational storage
* PRAGMA user\_version drives stepwise SQL migrations at boot
* Prepared statements and db.sql tagged templates prevent SQL injection
* SQLiteProvider + useSQLiteContext integrate the DB into React trees
* withExclusiveTransactionAsync for writes that must not interleave
* Use for field forms, inspection lists, and Query persisters too large for AsyncStorage

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install expo-sqlite
```

```tsx
// src/db/migrate.ts
import type { SQLiteDatabase } from "expo-sqlite";
 
const DATABASE_VERSION = 1;
 
export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const { user_version: current } = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version"
  );
 
  if (current >= DATABASE_VERSION) return;
 
  if (current === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE inspections (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        updated_at INTEGER NOT NULL
      );
    `);
  }
 
  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
```

```tsx
// app/_layout.tsx (excerpt)
import { SQLiteProvider } from "expo-sqlite";
import { migrateDbIfNeeded } from "@/db/migrate";
 
<SQLiteProvider databaseName="field.db" onInit={migrateDbIfNeeded}>
  <Stack />
</SQLiteProvider>
```

```tsx
// src/db/inspections.ts
import type { SQLiteDatabase } from "expo-sqlite";
 
export type Inspection = {
  id: string;
  title: string;
  status: "draft" | "submitted";
  updated_at: number;
};
 
export async function listInspections(db: SQLiteDatabase): Promise<Inspection[]> {
  return db.getAllAsync<Inspection>(
    "SELECT id, title, status, updated_at FROM inspections ORDER BY updated_at DESC"
  );
}
 
export async function upsertInspection(db: SQLiteDatabase, row: Inspection) {
  await db.runAsync(
    `INSERT INTO inspections (id, title, status, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET title = excluded.title, status = excluded.status, updated_at = excluded.updated_at`,
    row.id, row.title, row.status, row.updated_at
  );
}
```

**When to reach for this:**

* Relational models with filters, sorts, and joins (inspections → photos → answers)
* Offline-first field apps with thousands of rows
* Replacing multi-megabyte AsyncStorage JSON arrays
* Typed local cache when TanStack Query persistence outgrows KV limits

## Working Example

```bash
npx expo install expo-sqlite
```

```tsx
// app/_layout.tsx
import { Stack } from "expo-router";
import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";
import { migrateDbIfNeeded } from "@/db/migrate";
 
export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="field.db" onInit={migrateDbIfNeeded}>
      <Stack />
    </SQLiteProvider>
  );
}
```

```ts
// src/db/migrate.ts
import type { SQLiteDatabase } from "expo-sqlite";
 
const DATABASE_VERSION = 2;
 
export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  let { user_version: version } = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version"
  );
 
  if (version >= DATABASE_VERSION) return;
 
  if (version === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE inspections (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE answers (
        id TEXT PRIMARY KEY NOT NULL,
        inspection_id TEXT NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
        prompt TEXT NOT NULL,
        value TEXT,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX idx_answers_inspection ON answers(inspection_id);
    `);
    version = 1;
    await db.execAsync("PRAGMA user_version = 1");
  }
 
  if (version === 1) {
    await db.execAsync(`
      ALTER TABLE inspections ADD COLUMN synced INTEGER NOT NULL DEFAULT 0;
    `);
    version = 2;
    await db.execAsync("PRAGMA user_version = 2");
  }
}
```

```ts
// src/db/inspections.ts - typed queries with tagged template API
import type { SQLiteDatabase } from "expo-sqlite";
 
export type Inspection = {
  id: string;
  title: string;
  status: string;
  synced: number;
  updated_at: number;
};
 
export async function listUnsynced(db: SQLiteDatabase) {
  const sql = db.sql;
  return sql<Inspection>`SELECT * FROM inspections WHERE synced = 0 ORDER BY updated_at ASC`;
}
 
export async function markSynced(db: SQLiteDatabase, id: string) {
  await db.runAsync("UPDATE inspections SET synced = 1 WHERE id = ?", id);
}
```

```tsx
// app/(tabs)/inspections/index.tsx
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { listUnsynced } from "@/db/inspections";
 
export default function InspectionsScreen() {
  const db = useSQLiteContext();
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listUnsynced>>>([]);
 
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      listUnsynced(db).then((data) => {
        if (!cancelled) setRows(data);
      });
      return () => { cancelled = true; };
    }, [db])
  );
 
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontWeight: "600", marginBottom: 8 }}>
        Pending sync ({rows.length})
      </Text>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={{ paddingVertical: 8 }}>
            <Text>{item.title}</Text>
            <Text style={{ color: "#6b7280" }}>{item.status}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
```

```ts
// src/db/transactions.ts
import type { SQLiteDatabase } from "expo-sqlite";
 
export async function saveInspectionBundle(
  db: SQLiteDatabase,
  inspection: { id: string; title: string; updated_at: number },
  answers: { id: string; prompt: string; value: string }[]
) {
  await db.withExclusiveTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO inspections (id, title, status, synced, updated_at)
       VALUES (?, ?, 'draft', 0, ?)
       ON CONFLICT(id) DO UPDATE SET title = excluded.title, updated_at = excluded.updated_at`,
      inspection.id, inspection.title, inspection.updated_at
    );
    for (const a of answers) {
      await db.runAsync(
        `INSERT INTO answers (id, inspection_id, prompt, value, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        a.id, inspection.id, a.prompt, a.value, inspection.updated_at
      );
    }
  });
}
```

## Deep Dive

### Migration strategy with `PRAGMA user_version`

SQLite stores a monotonic integer **`user_version`** in the database file. Expo's recommended pattern mirrors AsyncStorage schema versioning:

```text
onInit (SQLiteProvider) or first openDatabaseAsync:
 
1. PRAGMA user_version → current
2. if current < TARGET:
     run SQL for current → current+1
     PRAGMA user_version = current+1
3. repeat until current === TARGET
```

* **`journal_mode = WAL`** improves concurrent read/write - set on v0 creation
* **`foreign_keys = ON`** must be enabled per connection - include in every fresh DB bootstrap
* Destructive migrations (drop column) often need **table rebuild** - plan downtime banner for field users

### Typed queries

Three safe patterns, in order of preference:

```ts
// 1. Tagged template (auto-escape, inferred types)
const rows = await db.sql<Inspection>`SELECT * FROM inspections WHERE status = ${"draft"}`;
 
// 2. Prepared statement (reuse + escape)
const stmt = await db.prepareAsync("SELECT * FROM inspections WHERE id = ?");
try {
  const result = await stmt.executeAsync<Inspection>([id]);
  return result.getFirstAsync();
} finally {
  await stmt.finalizeAsync();
}
 
// 3. runAsync / getAllAsync with ? placeholders
await db.runAsync("DELETE FROM inspections WHERE id = ?", id);
```

Never concatenate user input into `execAsync` strings - use placeholders or `db.sql`.

### React integration

| API | Use when |
| --- | --- |
| `SQLiteProvider` + `useSQLiteContext` | Most apps - single shared DB in the tree |
| `openDatabaseAsync` in a module singleton | Headless sync workers outside React |
| `useSuspense` on provider | Suspend until migrations finish - pair with `<Suspense>` |

Call **`migrateDbIfNeeded` in `onInit`** so no screen queries an unmigrated schema.

### Sync column pattern

Add **`synced`**, **`deleted`**, and **`updated_at`** columns locally. Background workers query `WHERE synced = 0` and push to the API - reconcile with [Sync Strategies](https://docs.wahwei/reactnative.codeguides.io/data-offline/sync-strategies/).

## Gotchas

* **Interleaved transactions** - `withTransactionAsync` includes any concurrent query until the scope finishes. **Fix:** Use `withExclusiveTransactionAsync` for multi-statement writes.
* **Forgetting `finalizeAsync`** - Leaked prepared statements exhaust native handles. **Fix:** Always `try/finally` around prepared statements.
* **Running migrations in every screen** - Race conditions on parallel `onInit`. **Fix:** Single `SQLiteProvider` at root; migrations only in `onInit`.
* **Storing blobs in SQLite without need** - Large photos belong on disk (`expo-file-system`); store paths in SQLite. **Fix:** BLOB column only for small binary payloads.
* **Assuming Expo Go covers custom SQLCipher** - `useSQLCipher` needs a dev build and config plugin. **Fix:** Default SQLite for most apps; encrypt only when compliance requires it.
* **Web alpha limitations** - `expo-sqlite` on web needs Metro wasm + COOP/COEP headers. **Fix:** Use AsyncStorage or server cache on web until web SQLite is in scope.
* **No indexes on filter columns** - `WHERE synced = 0` scans full tables at scale. **Fix:** Index foreign keys and sync flags early.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `expo-sqlite` | Relational offline data, migrations, local SQL | A handful of string prefs |
| `@react-native-async-storage/async-storage` | Tiny JSON documents | Joins, partial updates, 10k+ rows |
| `react-native-mmkv` | Hot-path KV reads | Complex queries across entities |
| `expo-sqlite/kv-store` | Drop-in AsyncStorage API backed by SQLite | You already model relations - use tables |
| Remote-only TanStack Query | Always-online catalog | Field offline mandate |

## FAQs

How do I install expo-sqlite on SDK 57?

```bash
npx expo install expo-sqlite
```

Works in Expo Go for default SQLite. SQLCipher and custom build flags require a development build with the config plugin.

Where should the database file live?

`SQLiteProvider` and `openDatabaseAsync` use the app's default database directory automatically. On iOS TV, files land in caches per platform guidelines - do not assume documents directory on all targets.

How do I inspect the database during development?

Press **Shift + M** in the Expo CLI terminal → **Open expo-sqlite** to browse tables, run SQL, and export the DB from your browser.

Can I share a database with an iOS extension?

Yes - configure an App Group in `app.config.ts`, then pass `directory` from `Paths.appleSharedContainers` to `SQLiteProvider`. See Expo SQLite docs for entitlements.

How do I type query results?

Use generics on `getAllAsync<Inspection>`, `db.sql<Inspection>`, or prepared statement `executeAsync<Inspection>`. Define row types in `src/db/types.ts` shared with API mappers.

Should I use Drizzle ORM?

Drizzle + `expo-sqlite` is a popular combo for typed schemas and migrations. Raw SQL is fine for small apps - adopt ORM when table count exceeds ~8 or multiple engineers touch schema.

How does SQLite interact with TanStack Query?

Use SQLite as the **source of truth** for offline-created rows; Query caches server snapshots. On reconnect, flush SQLite `synced = 0` rows then `invalidateQueries`. See [../state-management/tanstack-query/tanstack-query.md](https://docs.wahwei/reactnative.codeguides.io/state-management/tanstack-query/).

What about corruption recovery?

On migration failure, quarantine the DB file (rename with timestamp), create a fresh database, and trigger a server re-sync. Log `user_version` and schema hash to telemetry for support.

## Related

* [Offline-First Basics](https://docs.wahwei/reactnative.codeguides.io/data-offline/offline-first-basics/) - UX contracts and connectivity
* [AsyncStorage Patterns](https://docs.wahwei/reactnative.codeguides.io/data-offline/asyncstorage-patterns/) - small KV and Query persister
* [Sync Strategies](https://docs.wahwei/reactnative.codeguides.io/data-offline/sync-strategies/) - pushing `synced = 0` rows to the server
* [Background Sync & TaskManager](https://docs.wahwei/reactnative.codeguides.io/data-offline/background-sync-and-taskmanager/) - deferred flush workers
* [../state-management/tanstack-query/tanstack-query.md](https://docs.wahwei/reactnative.codeguides.io/state-management/tanstack-query/) - server-state cache alongside SQLite
* [Data Layer Best Practices](https://docs.wahwei/reactnative.codeguides.io/data-offline/best-practices/) - section summary

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
