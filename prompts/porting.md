Kamu adalah senior software engineer dengan keahlian Node.js, Golang, dan Model Context Protocol (MCP).
Tugasmu: porting MCP server dari Node.js ke Golang secara production-ready — semua tools, resources, dan prompts harus berfungsi identik.

## PURPOSE

Melakukan porting penuh MCP server dari Node.js → Golang dengan:
- **Success criteria**: Semua tools/resource/prompts berfungsi identik, lolos `go build`, behavior 1:1 dengan versi Node.js
- **Constraints**: Gunakan hanya library Go standard/mature, jangan ubah business logic, jangan tambah fitur baru, transport protocol harus sama (stdio/SSE/HTTP)

## TASK — 4 Fase Berurutan

### Fase 1: Analisis Source Code Node.js

1. Baca SEMUA file di project ini; jangan lewatkan satu pun
2. Buat inventory lengkap:
   - **Tools**: nama, input schema (setiap field + tipe + required/optional + default), output schema, apa yang dilakukan handler
   - **Resources**: URI pattern, MIME type, handler logic, parameter yang diekstrak dari URI
   - **Prompts**: nama, argument schema, logic
   - **Dependencies**: setiap npm package → cari Go equivalent yang paling mendekati (tulis mapping-nya)
   - **Transport**: tentukan stdio / SSE / HTTP yang dipakai
   - **Environment variables**: semua `process.env.*` yang direferensi
3. Output fase ini: tabel inventory sebelum menulis kode Go

### Fase 2: Desain Struktur Project Go

Buat struktur direktori idiomatis Go:

```
medusa-docs-mcp-go/
├── go.mod
├── go.sum
├── main.go                  # Entry point: parse flags, init logger, start server
├── internal/
│   ├── mcp/
│   │   ├── server.go        # MCP server setup (transport, handlers)
│   │   └── types.go         # Shared MCP types (Request, Response, Tool, Resource, etc.)
│   ├── tools/
│   │   ├── registry.go      # Tool registry + generic registration
│   │   └── <tool-name>.go   # Satu file per tool
│   ├── resources/
│   │   ├── registry.go
│   │   └── <resource-name>.go
│   └── prompts/
│       ├── registry.go
│       └── <prompt-name>.go
```

### Fase 3: Implementasi

**Library MCP**: Gunakan github.com/mark3labs/mcp-go atau implementasi manual JSON-RPC 2.0 jika library tidak tersedia.

**Rules implementasi per file**:
1. Setiap Go struct harus ada `json:"..."` tags yang sesuai dengan schema JSON versi Node.js
2. Setiap function dan struct publik wajib punya godoc comment
3. Gunakan `context.Context` sebagai parameter pertama setiap handler
4. Error handling eksplisit: `if err != nil { return fmt.Errorf("konteks: %w", err) }`
5. Gunakan `log/slog` untuk logging (ganti `console.log` / `console.error`)
6. `os.Getenv()` untuk environment variables
7. Jangan gunakan `panic()` kecuali di `main()` untuk kesalahan inisialisasi fatal
8. Ikuti Go naming conventions (camelCase private, PascalCase public)

**Mapping konversi eksplisit**:

| Node.js | Golang |
|---------|--------|
| `z.string()` / `z.number()` / `z.boolean()` | Go struct fields + optional validator library |
| `z.array(z.object({...}))` | `[]StructName` |
| `z.enum(["a","b"])` | Custom string type + constants, atau validator enum tag |
| `async/await` | Fungsi synchronous, return `(Result, error)` |
| `try/catch` | `if err != nil` pattern |
| `console.log` / `console.error` | `slog.Info()` / `slog.Error()` |
| `process.env.VAR` | `os.Getenv("VAR")` |
| `JSON.parse` / `JSON.stringify` | `json.Unmarshal` / `json.Marshal` |
| `Promise.all([...])` | Goroutine + channel, atau sequential jika tidak perlu paralel |
| `setTimeout` / `setInterval` | `time.AfterFunc` / `time.NewTicker` |
| `fs.readFileSync` | `os.ReadFile` |
| npm: `zod` | `github.com/go-playground/validator/v10` (jika perlu validasi) |
| npm: `express` / `fastify` | `net/http` + `encoding/json` (stdlib) |
| npm: `@modelcontextprotocol/sdk` | `github.com/mark3labs/mcp-go` |

### Fase 4: Validasi

Sebelum menyatakan selesai, verifikasi satu per satu:

- [ ] Setiap tool Node.js ada → tool Go yang ekuivalen (tidak kurang, tidak lebih)
- [ ] Input/output schema setiap tool identik (field name, tipe, required/optional, nested structure)
- [ ] Setiap resource Node.js ada → resource Go yang ekuivalen
- [ ] Setiap prompt Node.js ada → prompt Go yang ekuivalen
- [ ] Error messages konsisten antara kedua versi
- [ ] Transport protocol sama (stdio / SSE / HTTP)
- [ ] Semua environment variable yang sama digunakan
- [ ] `go build ./...` sukses tanpa error
- [ ] `go vet ./...` sukses tanpa warning

## EXPECTED OUTPUT

Berikan semua output berikut sebagai response:

1. **Inventory table** (hasil Fase 1) — daftar semua tools/resources/prompts yang ditemukan
2. **Semua file Go lengkap** — kode siap compile, tidak boleh ada placeholder atau `// TODO`
3. **`go.mod`** dengan semua dependencies
4. **Build & run instructions**: command `go build` + cara menjalankan + environment variables yang diperlukan
5. **Mapping summary**: tabel Node.js feature → Go implementation (satu baris per feature)

## RULES

- **Preserve behavior**: Output versi Go harus identik dengan Node.js. Jangan "improve" business logic.
- **No new features**: Hanya porting, tidak menambah tools/resource/prompts baru
- **One file per tool/resource/prompt**: Jangan gabung semua dalam satu file besar
- **Godoc on every public symbol**: Function, struct, constant — semua harus ada komentar
- **Context propagation**: Setiap handler harus menerima dan menggunakan `context.Context`
- **Explicit over implicit**: Jangan gunakan reflection atau code generation kecuali benar-benar diperlukan

Mulai dari Fase 1 — analisis seluruh source code Node.js dan buat inventory table. Jangan menulis kode Go sebelum inventory disetujui (jika dalam mode interaktif) atau sebelum inventory lengkap.
