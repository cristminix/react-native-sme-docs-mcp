import type { Tool, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type {
  AppConfig,
  DocSection,
  ISearchEngine,
  IToolRegistry,
  ToolDefinition,
  ToolHandler,
} from "./types.js";

// ── Shared helper ─────────────────────────────────────────────

function textResponse(text: string): CallToolResult {
  return { content: [{ type: "text" as const, text }] };
}

// ── Tool factories (OCP — add new tools without modifying existing code) ─

export function createSearchDocsTool(
  engine: ISearchEngine,
  config: AppConfig
): ToolDefinition {
  const handler: ToolHandler = async (args) => {
    const query = args?.query as string;
    const limit =
      (args?.limit as number) || config.searchDefaults.maxResults;
    const results = engine.search(query, limit);

    if (results.length === 0) {
      return textResponse(`No results found for query: "${query}"`);
    }

    const formatted = results
      .map((r, i) => {
        const { title, content } = r.item;
        const preview =
          content.substring(0, config.documentation.previewLength) +
          (content.length > config.documentation.previewLength ? "..." : "");
        return `${i + 1}. **${title}**\n${preview}\n`;
      })
      .join("\n---\n");

    return textResponse(formatted);
  };

  return {
    definition: {
      name: "search_docs",
      description: "Search React Native SME documentation for specific topics",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query for finding relevant documentation",
          },
          limit: {
            type: "number",
            description: `Maximum number of results to return (default: ${config.searchDefaults.maxResults})`,
            default: config.searchDefaults.maxResults,
          },
        },
        required: ["query"],
      },
    } as Tool,
    handler,
  };
}

export function createGetSectionTool(
  sections: DocSection[]
): ToolDefinition {
  const handler: ToolHandler = async (args) => {
    const identifier = args?.identifier as string;
    const section = sections.find(
      (s) =>
        s.title.toLowerCase().includes(identifier.toLowerCase()) ||
        (s.path && s.path.toLowerCase().includes(identifier.toLowerCase()))
    );

    if (!section) {
      return textResponse(`Section not found: "${identifier}"`);
    }

    return textResponse(`# ${section.title}\n\n${section.content}`);
  };

  return {
    definition: {
      name: "get_section",
      description: "Get a specific documentation section by title or path",
      inputSchema: {
        type: "object",
        properties: {
          identifier: {
            type: "string",
            description: "Section title or path to retrieve",
          },
        },
        required: ["identifier"],
      },
    } as Tool,
    handler,
  };
}

export function createListSectionsTool(
  sections: DocSection[],
  config: AppConfig
): ToolDefinition {
  const handler: ToolHandler = async (args) => {
    const category = args?.category as string | undefined;
    let filtered = sections;

    if (category) {
      filtered = sections.filter(
        (s) =>
          s.path?.toLowerCase().includes(category.toLowerCase()) ||
          s.title.toLowerCase().includes(category.toLowerCase())
      );
    }

    const list = filtered
      .slice(0, config.listDefaults.maxSections)
      .map((s) => `- ${s.title}`)
      .join("\n");

    const header = category
      ? `Available sections (filtered by: ${category}):`
      : "Available sections:";

    return textResponse(
      `${header}\n\n${list}\n\nTotal: ${filtered.length} sections`
    );
  };

  return {
    definition: {
      name: "list_sections",
      description: "List all available documentation sections",
      inputSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Filter sections by category (optional)",
          },
        },
      },
    } as Tool,
    handler,
  };
}

// ── Tool registry (SRP — manages tool registration and routing) ─

export class ToolRegistry implements IToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    this.tools.set(tool.definition.name, tool);
  }

  listDefinitions(): Tool[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  async execute(
    name: string,
    args: Record<string, unknown> | undefined
  ): Promise<CallToolResult> {
    const tool = this.tools.get(name);

    if (!tool) {
      return textResponse(`Unknown tool: ${name}`);
    }

    return tool.handler(args);
  }
}
