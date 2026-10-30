# 🚀 Medusa.js Documentation MCP Server

A powerful **Model Context Protocol (MCP) server** that gives your AI assistants instant access to **comprehensive Medusa.js v2 documentation** with smart search capabilities and real-time assistance for enhanced development workflow.

> 📅 **Latest Documentation**: September 2025 | 📊 **Coverage**: 2,105+ sections | 📦 **Size**: 4.7MB

## ✨ Key Features

| 🎯 Feature | 📝 Description | 🚀 Benefits |
|------------|----------------|-------------|
| **🔍 Smart Search** | Fuzzy search through 2,105+ documentation sections | Find answers even with partial or inexact queries |
| **📖 Precise Retrieval** | Get exact sections by title or path | Access specific documentation instantly |
| **📋 Complete Browsing** | List all available sections with filtering | Discover new features and capabilities |
| **⚡ Lightning Fast** | TypeScript-powered with optimized performance | Instant responses, no delays |
| **📦 Zero Setup** | Documentation included, no external dependencies | Works out-of-the-box |
| **🔄 Real-time** | Always up-to-date Medusa v2 documentation | Latest features and best practices |

## 📋 Prerequisites

- **Node.js** 18+
- **npm** or **yarn**
- **AI Assistant** with MCP support:
  - [Claude Code (CLI)](https://claude.ai/code) ✅ **Tested & Working**
  - [Kilo Code](https://kilocode.ai/) ✅ **Tested & Working**
  - [Cursor](https://cursor.sh/)
  - [Windsurf](https://codeium.com/windsurf)
  - Or any MCP-compatible client

## 🛠 Installation

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/Alexcs24/Medusa.js-Documentation-MCP-Server
cd Medusa.js-Documentation-MCP-Server

# Install dependencies
npm install

# Build the TypeScript code
npm run build
```

### 2. Documentation Ready!

✅ **No additional setup needed!** The repository includes comprehensive Medusa.js v2 documentation (4.7MB, September 2025) located at `./docs/medusa-docs.txt`.

**Optional**: Use your own documentation file:
```bash
# Replace with your own documentation if needed
export LLM_DOCS_PATH="/absolute/path/to/your/custom-docs.txt"
```

### 3. Configure Your AI Assistant

#### 🟢 Claude Code CLI ✅ **Tested & Working**

**Global Configuration** (recommended):
```bash
# Create or edit global config
nano ~/.claude/claude_code_config.json
```

Add this configuration:
```json
{
  "mcpServers": {
    "medusa-docs": {
      "command": "node",
      "args": ["/absolute/path/to/Medusa.js-Documentation-MCP-Server/dist/index.js"],
      "env": {
        "LLM_DOCS_PATH": "/absolute/path/to/Medusa.js-Documentation-MCP-Server/docs/medusa-docs.txt"
      }
    }
  }
}
```

**Project-specific Configuration**:
```bash
# In your Medusa project root
mkdir -p .claude
cp claude_code_config.json .claude/mcp.json
# Edit paths to be relative to your project
```

#### Cursor IDE

Add to your Cursor settings (`settings.json`):
```json
{
  "mcp": {
    "mcpServers": {
      "medusa-docs": {
        "command": "node",
        "args": ["/absolute/path/to/Medusa.js-Documentation-MCP-Server/dist/index.js"],
        "env": {
          "LLM_DOCS_PATH": "/absolute/path/to/docs/medusa-docs.txt"
        }
      }
    }
  }
}
```

#### Windsurf

Create or edit `windsurf-mcp-config.json`:
```json
{
  "mcpServers": {
    "medusa-docs": {
      "command": "node",
      "args": ["/absolute/path/to/Medusa.js-Documentation-MCP-Server/dist/index.js"],
      "env": {
        "LLM_DOCS_PATH": "/absolute/path/to/docs/medusa-docs.txt"
      }
    }
  }
}
```


## 🎯 Usage & Natural Language Examples

After configuration, restart your AI assistant and interact using **natural language**:

### 🔍 **Smart Search Examples**
```bash
💬 "Search Medusa docs for payment providers"
💬 "Find information about workflows in Medusa"
💬 "Look up cart module documentation"
💬 "How do I implement custom shipping methods?"
💬 "Show me authentication examples"
```

### 📖 **Specific Section Retrieval**
```bash
💬 "Get the section about API routes"
💬 "Show me the modules documentation"
💬 "Retrieve workflow examples"
💬 "I need the admin customization guide"
💬 "Display the product catalog setup"
```

### 📋 **Browse Available Content**
```bash
💬 "List all available documentation sections"
💬 "Show me categories in the docs"
💬 "What documentation sections are available?"
💬 "Browse workflow-related documentation"
💬 "What payment integrations are documented?"
```

### 🌟 **Advanced Usage Patterns**
```bash
💬 "Compare different payment providers in Medusa"
💬 "Walk me through setting up a complete e-commerce store"
💬 "What's the difference between modules and plugins?"
💬 "Show me step-by-step workflow implementation"
```

## 🔧 Available MCP Tools

The MCP server provides **3 powerful tools** to access Medusa.js documentation:

### 🔍 **1. `search_docs`** - Smart Documentation Search
**What it does**: Intelligently searches through 2,105+ documentation sections using fuzzy matching
**Perfect for**: Finding relevant information when you don't know the exact section name

**Parameters:**
- `query` (string, **required**): Your search query
- `limit` (number, optional): Maximum results to return (default: 5)

**✨ Example Usage:**
```json
{
  "name": "search_docs",
  "arguments": {
    "query": "workflow payment providers",
    "limit": 3
  }
}
```
**Returns**: Workflow Engine Module, timeout configurations, and In-Memory workflow setup

---

### 📖 **2. `get_section`** - Precise Section Retrieval
**What it does**: Fetches exact documentation sections by title or path
**Perfect for**: Getting detailed information about a specific topic you know exists

**Parameters:**
- `identifier` (string, **required**): Exact section title or path

**✨ Example Usage:**
```json
{
  "name": "get_section",
  "arguments": {
    "identifier": "Debug Workflows"
  }
}
```
**Returns**: Complete section content with debugging approaches and techniques

---

### 📋 **3. `list_sections`** - Browse All Available Content
**What it does**: Lists all 2,105+ available documentation sections
**Perfect for**: Discovering what documentation is available or browsing by category

**Parameters:**
- `category` (string, optional): Filter sections by specific category

**✨ Example Usage:**
```json
{
  "name": "list_sections",
  "arguments": {
    "category": "workflows"
  }
}
```
**Returns**: Complete list of workflow-related documentation sections

---

### 🚀 **Real-World Usage Examples**

**Scenario 1**: *"How do I set up payments in Medusa?"*
1. Use `search_docs` with query `"payment setup"`
2. Get relevant sections about payment modules and providers
3. Use `get_section` to dive deep into specific payment provider setup

**Scenario 2**: *"What workflow features are available?"*
1. Use `list_sections` with category `"workflows"`
2. Browse available workflow documentation
3. Use `get_section` to read specific workflow implementation guides

**Scenario 3**: *"I need help with cart functionality"*
1. Use `search_docs` with query `"cart module"`
2. Find cart-related sections and APIs
3. Access detailed cart implementation examples

## 🚧 Development

### Scripts

```bash
# Development server with hot reload
npm run dev

# Watch mode (auto-restart on changes)
npm run watch

# Build TypeScript
npm run build

# Start production server
npm run start
```

### Testing

Test the MCP server manually:
```bash
# Start the server
node dist/index.js

# In another terminal, send MCP requests
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node dist/index.js
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=1 node dist/index.js

# Or with environment variables
LLM_DOCS_PATH="/path/to/docs.txt" DEBUG=1 node dist/index.js
```

## 📁 Project Structure

```
Medusa.js-Documentation-MCP-Server/
├── src/
│   └── index.ts              # Main MCP server implementation
├── dist/                     # Compiled JavaScript (auto-generated)
├── docs/
│   └── medusa-docs.txt       # Complete Medusa v2 docs (4.7MB, Sep 2025)
├── config.json               # Server configuration settings
├── example-docs.txt          # Example documentation format
├── claude_code_config.json   # Example Claude Code config
├── package.json              # Node.js dependencies
├── tsconfig.json            # TypeScript configuration
├── .gitignore               # Git ignore rules
├── LICENSE                  # MIT License
└── README.md                # This file
```

## ⚙️ Configuration

All server settings can be customized in `config.json`:

```json
{
  "searchDefaults": {
    "maxResults": 5,           // Default number of search results
    "threshold": 0.4,          // Search sensitivity (0-1, lower = more strict)
    "minMatchCharLength": 3    // Minimum characters for search matching
  },
  "listDefaults": {
    "maxSections": 50          // Maximum sections shown in list_sections
  },
  "server": {
    "name": "medusa-docs-mcp",
    "version": "1.0.0"
  },
  "documentation": {
    "previewLength": 500,      // Length of content preview in search results
    "fallbackPaths": [         // Paths to search for documentation file
      "docs/medusa-docs.txt",
      "llms-full.txt",
      "../llms-full.txt",
      "../../llms-full.txt",
      "/home/claude/llms-full.txt"
    ]
  }
}
```

### 🔧 **Customize Your Settings**

- **More search results**: Increase `searchDefaults.maxResults`
- **Stricter search**: Lower `searchDefaults.threshold` (0.2 = very strict, 0.8 = very loose)
- **Longer previews**: Increase `documentation.previewLength`
- **More list items**: Increase `listDefaults.maxSections`

## 🔒 Environment Variables

- `LLM_DOCS_PATH`: Absolute path to your documentation file
- `DEBUG`: Enable debug logging (set to `1` or `true`)

## 🐛 Troubleshooting

### Server not found
1. Restart your AI assistant after configuration changes
2. Check that file paths are absolute, not relative
3. Verify the `dist/index.js` file exists (run `npm run build`)

### Documentation not loading
1. Verify `LLM_DOCS_PATH` points to the correct file
2. Check file permissions (should be readable)
3. Ensure the file exists and is not empty

### Permission errors
```bash
# Fix file permissions
chmod 644 /path/to/docs/medusa-docs.txt
chmod +x /path/to/Medusa.js-Documentation-MCP-Server/dist/index.js
```

### Debug connection issues
```bash
# Test MCP server manually
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | LLM_DOCS_PATH="/path/to/docs.txt" node dist/index.js
```

Check your AI assistant's MCP logs:
- **Claude Code CLI**: View → Output → MCP logs
- **Cursor IDE**: Developer Tools → Console
- **Windsurf**: Check extension logs in developer tools

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Update configuration in `config.json` if needed
5. Build and test (`npm run build`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic
- [Medusa.js](https://medusajs.com/) commerce platform
- [Fuse.js](https://fusejs.io/) for fuzzy search functionality

## 📞 Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/Alexcs24/Medusa.js-Documentation-MCP-Server/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/Alexcs24/Medusa.js-Documentation-MCP-Server/discussions)
- 📧 **Email**: Contact through GitHub

---

**⭐ Star this repo if it helps your Medusa development workflow!**