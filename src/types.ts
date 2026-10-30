import type {
  Tool,
  CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";

// ── Configuration ──────────────────────────────────────────────

export interface SearchConfig {
  maxResults: number;
  threshold: number;
  minMatchCharLength: number;
}

export interface ListConfig {
  maxSections: number;
}

export interface ServerConfig {
  name: string;
  version: string;
}

export interface DocConfig {
  previewLength: number;
  fallbackPaths: string[];
}

export interface AppConfig {
  searchDefaults: SearchConfig;
  listDefaults: ListConfig;
  server: ServerConfig;
  documentation: DocConfig;
}

// ── Documentation ─────────────────────────────────────────────

export interface DocSection {
  title: string;
  content: string;
  url?: string;
  category?: string;
  path?: string;
}

// ── Search ────────────────────────────────────────────────────

export interface SearchResult {
  item: DocSection;
  score?: number;
}

export interface ISearchEngine {
  search(query: string, limit: number): SearchResult[];
}

// ── Document loading ──────────────────────────────────────────

export interface IDocLoader {
  loadSections(): DocSection[];
}

// ── Tool system ───────────────────────────────────────────────

export type ToolHandler = (
  args: Record<string, unknown> | undefined
) => Promise<CallToolResult>;

export interface ToolDefinition {
  definition: Tool;
  handler: ToolHandler;
}

export interface IToolRegistry {
  register(tool: ToolDefinition): void;
  listDefinitions(): Tool[];
  execute(
    name: string,
    args: Record<string, unknown> | undefined
  ): Promise<CallToolResult>;
}
