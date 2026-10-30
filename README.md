# 🚀 React Native SME Documentation MCP Server

A powerful **Model Context Protocol (MCP) server** that gives your AI assistants instant access to **comprehensive React Native SME documentation** with smart fuzzy search capabilities and fast retrieval for an enhanced mobile development workflow.

> 📊 **Coverage**: 3,090+ sections | 📦 **Documentation Source**: Local `docs/llms-full.txt` (3.9MB)

---

## ✨ Key Features

| 🎯 Feature | 📝 Description | 🚀 Benefits |
|------------|----------------|-------------|
| **🔍 Smart Search** | Fuzzy search through 3,090+ documentation sections powered by Fuse.js | Find solutions, components, hooks, and guides even with partial queries |
| **📖 Precise Retrieval** | Retrieve exact sections by title or path identifier | Get targeted documentation without cluttering AI context |
| **📋 Section Listing** | List available sections with optional category filtering | Explore topics, modules, and architecture guides |
| **⚡ Fast & Lightweight** | TypeScript-powered running over stdio | Zero-lag responses for AI code assistants |
| **📦 Zero External Dependency** | Bundled with local documentation | Operates completely offline without external API keys |

---

## 📋 Prerequisites

- **Node.js** 18+
- **Yarn** (v4) or **npm**
- **AI Assistant** with MCP support:
  - [Claude Code (CLI)](https://claude.ai/code)
  - [Cursor](https://cursor.sh/)
  - [Windsurf](https://codeium.com/windsurf)
  - [Antigravity / Gemini CLI](https://github.com/google)
  - Or any MCP-compatible client

---

## 🛠 Installation & Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/cristminix/react-native-sme-docs-mcp.git
cd react-native-sme-docs-mcp

# Install dependencies using Yarn
yarn install

# Build the TypeScript code
yarn build
```

### 2. Documentation

Documentation files are located in `./docs/`:
- `docs/llms-full.txt` (default full documentation, ~3.9MB, 3,090+ sections)
- `docs/llms.txt` (summary documentation)

**Optional**: Point to a custom documentation file using an environment variable:
```bash
export LLM_DOCS_PATH="/absolute/path/to/your/documentation.txt"
```

---

## ⚙️ Configuration for AI Assistants

Replace `/absolute/path/to/react-native-sme-docs-mcp` with your actual project location.

### 🟢 Claude Code CLI

Add to your `~/.claude/claude_code_config.json` or project-level `.claude/mcp.json`:

```json
{
  "mcpServers": {
    "react-native-sme-docs": {
      "command": "node",
      "args": ["/absolute/path/to/react-native-sme-docs-mcp/dist/index.js"],
      "env": {
        "LLM_DOCS_PATH": "/absolute/path/to/react-native-sme-docs-mcp/docs/llms-full.txt"
      }
    }
  }
}
```

### 🔷 Cursor IDE

Add to your Cursor settings (`settings.json`):

```json
{
  "mcp": {
    "mcpServers": {
      "react-native-sme-docs": {
        "command": "node",
        "args": ["/absolute/path/to/react-native-sme-docs-mcp/dist/index.js"],
        "env": {
          "LLM_DOCS_PATH": "/absolute/path/to/react-native-sme-docs-mcp/docs/llms-full.txt"
        }
      }
    }
  }
}
```

### 🌊 Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "react-native-sme-docs": {
      "command": "node",
      "args": ["/absolute/path/to/react-native-sme-docs-mcp/dist/index.js"],
      "env": {
        "LLM_DOCS_PATH": "/absolute/path/to/react-native-sme-docs-mcp/docs/llms-full.txt"
      }
    }
  }
}
```

---

## 🔧 Available MCP Tools

This MCP server provides **3 core tools**:

### 🔍 **1. `search_docs`** - Fuzzy Documentation Search
Searches documentation sections using fuzzy matching.

**Parameters:**
- `query` (string, **required**): The search query (e.g. `"navigation"`, `"flatlist performance"`, `"reanimated"`)
- `limit` (number, optional): Maximum results to return (default: `5`)

**Example Input:**
```json
{
  "name": "search_docs",
  "arguments": {
    "query": "state management hooks",
    "limit": 3
  }
}
```

---

### 📖 **2. `get_section`** - Precise Section Retrieval
Retrieves the full content of a specific documentation section matching the title or path identifier.

**Parameters:**
- `identifier` (string, **required**): Section title or path identifier

**Example Input:**
```json
{
  "name": "get_section",
  "arguments": {
    "identifier": "Performance Optimization"
  }
}
```

---

### 📋 **3. `list_sections`** - Browse Documentation Sections
Lists available sections, optionally filtered by keyword or category.

**Parameters:**
- `category` (string, optional): Filter sections by specific keyword or path prefix

**Example Input:**
```json
{
  "name": "list_sections",
  "arguments": {
    "category": "components"
  }
}
```

---

## 🎯 Natural Language Prompts for AI

After configuring the MCP server, you can ask your AI assistant questions naturally:

- 💬 *"Search React Native SME docs for FlatList performance optimization techniques."*
- 💬 *"Look up best practices for custom hooks in React Native."*
- 💬 *"Get the documentation section for deep linking and navigation."*
- 💬 *"List all documentation sections related to state management."*

---

## 📁 Project Structure

```
react-native-sme-docs-mcp/
├── .agents/plugins/          # Agent plugin configuration
├── docs/
│   ├── llms-full.txt         # Complete React Native documentation (3,090+ sections)
│   └── llms.txt              # Documentation overview
├── mcp-config-files/         # MCP sample configuration templates
├── src/
│   ├── config.ts             # Configuration loader
│   ├── doc-loader.ts         # Markdown & txt documentation parser
│   ├── index.ts              # Entrypoint
│   ├── search.ts             # Fuse.js search engine
│   ├── server.ts             # MCP server setup & lifecycle
│   ├── tools.ts              # MCP tool definitions & handlers
│   └── types.ts              # TypeScript interfaces & types
├── config.json               # Server configuration defaults
├── package.json              # Project dependencies & scripts
├── tsconfig.json             # TypeScript compiler settings
├── LICENSE                   # License file
└── README.md                 # Project documentation
```

---

## ⚙️ Configuration (`config.json`)

Customize server behavior via `config.json`:

```json
{
  "searchDefaults": {
    "maxResults": 5,
    "threshold": 0.4,
    "minMatchCharLength": 3
  },
  "listDefaults": {
    "maxSections": 50
  },
  "server": {
    "name": "react-native-sme-docs-mcp",
    "version": "1.0.0"
  },
  "documentation": {
    "previewLength": 500,
    "fallbackPaths": [
      "docs/llms-full.txt",
      "docs/llms.txt"
    ]
  }
}
```

---

## 🚧 Development

```bash
# Run in development mode
yarn dev

# Run in watch mode (auto-reload on changes)
yarn watch

# Build TypeScript to dist/
yarn build

# Test MCP server manually via stdin
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node dist/index.js
```

---

## 📝 License

This project is licensed under the [MIT License](LICENSE).
