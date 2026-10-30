# Storage and Secure Data

Persistence options from simple key-value to secure tokens and local files/databases.

Highlights / Storage and Secure Data

* AsyncStorage Get Set
* SecureStore Token
* FileSystem Document Dir
* SQLite Open Database
* JSON Parse Guard

#### AsyncStorage Get Set

Unencrypted key-value storage for preferences and non-secret caches. Prefer `@react-native-async-storage/async-storage` (Expo-compatible).

```tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
 
await AsyncStorage.setItem("theme", "dark");
const theme = await AsyncStorage.getItem("theme");
```

#### AsyncStorage Multi

Batch reads/writes to reduce bridge round-trips.

```tsx
await AsyncStorage.multiSet([
  ["onboarding.done", "1"],
  ["locale", "en"],
]);
const pairs = await AsyncStorage.multiGet(["onboarding.done", "locale"]);
```

#### SecureStore Token

Store secrets (session tokens, refresh tokens) in the platform keychain/keystore via `expo-secure-store`.

```tsx
import * as SecureStore from "expo-secure-store";
 
await SecureStore.setItemAsync("accessToken", token);
const token = await SecureStore.getItemAsync("accessToken");
```

#### SecureStore Delete

Clear credentials on logout.

```tsx
await SecureStore.deleteItemAsync("accessToken");
await SecureStore.deleteItemAsync("refreshToken");
```

#### FileSystem Document Dir

App document directory paths for durable user files with `expo-file-system`.

```tsx
import * as FileSystem from "expo-file-system";
 
const dir = FileSystem.documentDirectory; // string | null
const path = `${dir}notes.txt`;
```

#### Write Read Text File

Simple text file IO for exports and offline drafts.

```tsx
await FileSystem.writeAsStringAsync(path, contents, {
  encoding: FileSystem.EncodingType.UTF8,
});
const text = await FileSystem.readAsStringAsync(path);
```

#### Cache Directory Temp

Put disposable downloads in the cache directory so the OS may reclaim space.

```tsx
const cachePath = `${FileSystem.cacheDirectory}avatar-tmp.jpg`;
```

#### SQLite Open Database

Local relational storage with `expo-sqlite` for structured offline data.

```tsx
import * as SQLite from "expo-sqlite";
 
const db = await SQLite.openDatabaseAsync("app.db");
await db.execAsync("CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, body TEXT);");
```

#### MMKV Mental Model

MMKV (community module) is a fast synchronous key-value store often used with Zustand. Requires native code - fine in dev builds; not pure Expo Go unless supported by your workflow.

```tsx
// Conceptual: storage.set("key", value); const v = storage.getString("key");
```

#### Persist Zustand Slice

Sketch of persisting a slice - wire your storage engine in `persist` middleware.

```tsx
// persist( (set) => ({ token: null, setToken: (t) => set({ token: t }) }),
//   { name: "auth", storage: createJSONStorage(() => asyncStorage) } )
```

#### Clear on Logout

Namespace user keys and wipe them on logout so the next account never sees stale data.

```tsx
async function clearUserData() {
  await AsyncStorage.multiRemove(["user.profile", "user.prefs"]);
  await SecureStore.deleteItemAsync("accessToken");
}
```

#### JSON Parse Guard

Stored JSON can be corrupt - parse behind try/catch and fall back to defaults.

```tsx
function readJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
```

#### Migration Version Key

Keep a schema version next to persisted state and run migrations when it changes.

```tsx
const VERSION = "2";
const v = await AsyncStorage.getItem("storage.version");
if (v !== VERSION) {
  await migrate(v);
  await AsyncStorage.setItem("storage.version", VERSION);
}
```

#### expo-crypto Random

Generate opaque ids with `expo-crypto` instead of weak `Math.random`.

```tsx
import * as Crypto from "expo-crypto";
 
const id = Crypto.randomUUID();
```

#### Keychain Availability

SecureStore can fail on restricted devices - catch errors and degrade gracefully (re-auth, in-memory session).

```tsx
try {
  await SecureStore.setItemAsync("accessToken", token);
} catch {
  // Fall back: keep token in memory only for this session
  memorySession.token = token;
}
```

## Related

* [Networking Images Media](https://docs.wahwei/reactnative.codeguides.io/code-reference/networking-images-media/) - tokens used on API calls
* [App State and Hooks](https://docs.wahwei/reactnative.codeguides.io/code-reference/app-state-and-hooks/) - load storage on focus/active
* [Platform Linking and Share](https://docs.wahwei/reactnative.codeguides.io/code-reference/platform-linking-and-share/) - export paths and share

### External Related Links

* [reactnative.directory](https://reactnative.directory/) - community library directory (compatibility, New Architecture flags)
* [docs.expo.dev](https://docs.expo.dev/) - official Expo docs (recommended framework)
* [reactnative.dev](https://reactnative.dev/) - official React Native site

> **Stack versions:** React 19.2.3 · React Native 0.86.0 · Expo SDK 57

Reviewed by Chris St. John·Last updated Jul 18, 2026
