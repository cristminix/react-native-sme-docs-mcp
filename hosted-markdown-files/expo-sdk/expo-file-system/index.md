# expo-file-system

Sandboxed paths, downloads, and migration from legacy FS API - the `expo-file-system` cookbook for Expo SDK 57 apps that cache PDFs, photos, and offline payloads on device.

Highlights / expo-file-system

* SDK 57 introduces File, Directory, and Paths - prefer over string URI juggling
* documentDirectory persists; cacheDirectory is evictable by the OS
* Never store secrets in Files - use expo-secure-store
* Legacy API lives at expo-file-system/legacy during migration
* Download with File.downloadFileAsync or createDownloadTask for progress
* Store file paths in SQLite - not multi-MB blobs in the database

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install expo-file-system
```

```ts
import { Directory, File, Paths } from "expo-file-system";
 
export function ensureDownloadDir() {
  const dir = new Directory(Paths.cache, "downloads");
  if (!dir.exists) {
    dir.create();
  }
  return dir;
}
 
export async function downloadPdf(url: string, filename: string) {
  const dir = ensureDownloadDir();
  const output = await File.downloadFileAsync(url, dir);
  return output.uri;
}
 
export function writeJsonCache(name: string, data: unknown) {
  const file = new File(Paths.cache, `${name}.json`);
  if (!file.exists) {
    file.create();
  }
  file.write(JSON.stringify(data));
}
```

**When to reach for this:**

* Caching API responses or PDFs for offline read.
* Persisting user-generated photos before background upload.
* Reading bundled assets copied to writable cache.
* Uploading files with `File.createUploadTask` progress.

**When to avoid:**

* Secrets and tokens - use [expo-secure-store](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-secure-store-and-expo-crypto/).
* Structured relational data - use SQLite; store **paths** only.
* Large streaming media playback - consider dedicated media caches/CDN.

## Working Example

Download with progress, JSON sidecar metadata, and legacy interop during migration.

```bash
npx expo install expo-file-system
```

```ts
// src/files/downloadWithProgress.ts
import { Directory, File, Paths } from "expo-file-system";
 
export async function downloadInspectionPdf(
  url: string,
  jobId: string,
  onProgress: (ratio: number) => void
) {
  const dir = new Directory(Paths.document, "inspections", jobId);
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
 
  const destination = new File(dir, "report.pdf");
  const task = File.createDownloadTask(url, destination, {
    onProgress: ({ bytesWritten, totalBytes }) => {
      if (totalBytes > 0) {
        onProgress(bytesWritten / totalBytes);
      }
    },
  });
 
  const file = await task.downloadAsync();
  if (!file) throw new Error("Download paused or cancelled");
 
  const meta = new File(dir, "meta.json");
  meta.create();
  meta.write(JSON.stringify({ url, downloadedAt: Date.now() }));
 
  return file.uri;
}
```

```ts
// src/files/listInspections.ts
import { Directory, Paths } from "expo-file-system";
 
export function listInspectionJobIds(): string[] {
  const root = new Directory(Paths.document, "inspections");
  if (!root.exists) return [];
 
  return root
    .list()
    .filter((entry) => entry instanceof Directory)
    .map((d) => d.name);
}
```

```ts
// src/files/legacyRead.ts - temporary bridge
import * as FileSystem from "expo-file-system/legacy";
import { File, Paths } from "expo-file-system";
 
export async function readLegacyManifest() {
  const file = new File(Paths.cache, "legacy-manifest.json");
  if (!file.exists) return null;
  const text = await FileSystem.readAsStringAsync(file.uri);
  return JSON.parse(text) as { version: number };
}
```

**What this demonstrates:**

* **`Paths.document`** for user-meaningful PDFs - survives cache sweeps.
* **`createDownloadTask`** with progress callback for UI bars.
* **`Directory.list()`** for enumerating job folders.
* **Legacy import** for unmigrated read paths - plan removal per release.

## Deep Dive

### Sandboxed Directories

| Path | Persistence | Typical use |
| --- | --- | --- |
| `Paths.document` | Until app uninstall | User exports, inspection PDFs |
| `Paths.cache` | OS may evict | Thumbnails, temp downloads |
| `Paths.bundle` | Read-only bundled assets | Seed files at first launch |

```ts
import { Paths } from "expo-file-system";
 
console.log(Paths.document.uri);
console.log(Paths.cache.uri);
```

* Never assume **cache** files exist after low storage events - re-download or verify `file.exists`.
* **document** is included in device backups on iOS unless excluded - do not put secrets here.

### Modern File and Directory API

```ts
const dir = new Directory(Paths.cache, "avatars");
dir.create({ intermediates: true });
 
const avatar = dir.createFile("user-42.jpg", "image/jpeg");
avatar.write(bytes);
 
const copy = new File(Paths.cache, "avatars", "user-42-copy.jpg");
avatar.copy(copy);
 
avatar.move(new Directory(Paths.document, "archive"));
```

* Constructors accept **path segments** - avoids manual `file://` string concat bugs.
* **`exists`** property before read - throws are for wrong File/Directory type on existing paths.
* **`textSync` / `bytesSync`** for small files - async variants for large payloads.

### Downloads and Uploads

```ts
// Simple one-shot download
await File.downloadFileAsync(url, new Directory(Paths.cache, "pdfs"));
 
// Upload with progress
const file = new File(Paths.document, "photo.jpg");
const task = file.createUploadTask("https://api.example.com/upload", {
  uploadType: File.UploadType?.MULTIPART ?? 1,
  onProgress: ({ bytesSent, totalBytes }) => {
    console.log(bytesSent, totalBytes);
  },
});
await task.uploadAsync();
```

* Prefer **`expo/fetch`** with `File` body for multipart when upload task options are overkill.
* See [../networking-api/fetch-vs-axios/fetch-vs-axios.md](https://docs.wahwei/reactnative.codeguides.io/networking-api/fetch-vs-axios/) for RN upload constraints.

### Legacy Migration

```ts
// Before (legacy)
import * as FileSystem from "expo-file-system/legacy";
await FileSystem.readAsStringAsync(uri);
 
// After (SDK 57)
import { File } from "expo-file-system";
const file = new File(uri);
const text = file.textSync();
```

* Import **`expo-file-system/legacy`** only at unmigrated call sites.
* Bridge period: create `File` from legacy URI strings - `new File(existingUri)`.
* Remove legacy imports when `npx expo doctor` and grep show zero `/legacy` imports.

### Config Plugin (Optional)

```json
{
  "expo": {
    "plugins": [
      [
        "expo-file-system",
        {
          "enableFileSharing": true,
          "supportsOpeningDocumentsInPlace": true
        }
      ]
    ]
  }
}
```

* Enables iOS Files app visibility for `documentDirectory` - useful for exported PDFs.

## Gotchas

* **Storing tokens in JSON cache files** - Readable on compromised devices. **Fix:** [expo-secure-store](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-secure-store-and-expo-crypto/).
* **Assuming cache paths survive reboot** - OS evicts cache. **Fix:** Persist critical files under `Paths.document`.
* **Concatenating URIs manually** - Double slashes break Android. **Fix:** `new File(Paths.cache, "a", "b.txt")`.
* **BLOB columns in SQLite for photos** - DB bloat. **Fix:** File on disk + path column.
* **Sync read of multi-MB files on UI thread** - Jank. **Fix:** async `bytes()` / streams.
* **Skipping `intermediates: true`** - Nested `create()` fails. **Fix:** `{ intermediates: true }` on deep paths.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| `File` / `Directory` API | New SDK 57 code | Maintaining SDK 54 apps without migration bandwidth |
| `expo-file-system/legacy` | Unmigrated modules | Greenfield features |
| `expo-sqlite` | Relational rows | Large binary blobs |
| `AsyncStorage` | Small JSON prefs | Files larger than a few KB |

## FAQs

How do I install expo-file-system on SDK 57?

```bash
npx expo install expo-file-system
```

Import `{ File, Directory, Paths }` from `expo-file-system` - not the default namespace alone.

When should I use cache vs document?

* **cache** - reproducible downloads, thumbnails, temp processing.
* **document** - user-created exports the app must not delete silently.

How do I check free space?

* Expo does not expose disk quota - handle write failures gracefully and surface "storage full" UX.
* Prune `Paths.cache` directories on app version upgrade or settings action.

Can I read bundled assets?

```ts
import { File, Paths } from "expo-file-system";
const seed = new File(Paths.bundle, "seed-data.json");
```

* Bundle paths are read-only - copy to cache/document before mutation.

How do I delete a job folder?

```ts
const dir = new Directory(Paths.document, "inspections", jobId);
if (dir.exists) dir.delete(); // recursive
```

## Related

* [Expo SDK Basics](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-sdk-basics/) - legacy vs modern APIs
* [expo-camera & expo-image-picker](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-camera-and-expo-image-picker/) - capture URIs
* [expo-secure-store & expo-crypto](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/expo-secure-store-and-expo-crypto/) - secrets, not files
* [../data-offline/expo-sqlite/expo-sqlite.md](https://docs.wahwei/reactnative.codeguides.io/data-offline/expo-sqlite/) - paths in DB rows
* [../networking-api/fetch-vs-axios/fetch-vs-axios.md](https://docs.wahwei/reactnative.codeguides.io/networking-api/fetch-vs-axios/) - upload progress
* [Expo SDK Packages Best Practices](https://docs.wahwei/reactnative.codeguides.io/expo-sdk/best-practices/) - storage tier rules

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
