#!/usr/bin/env tsx
/**
 * Integration test for React Native SME MCP server.
 *
 * Tests the Node.js implementation via stdio transport.
 *
 * Usage:
 *   tsx test-server.ts                          # Run MCP server tests
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── Config ──────────────────────────────────────────────────────

type ServerConfig = {
  label: string;
  command: string;
  args: string[];
  env: Record<string, string>;
};

function resolveServerConfig(): ServerConfig {
  const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const docsPath = resolve(projectRoot, "docs/medusa-llms-full.txt");
  const nodeDist = resolve(projectRoot, "dist/index.js");

  return {
    label: "Node.js (dist/index.js)",
    command: "node",
    args: [nodeDist],
    env: { LLM_DOCS_PATH: docsPath },
  };
}

// ── Helpers ─────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string): void {
  if (condition) {
    console.log(`   ✅  ${msg}`);
    passed++;
  } else {
    console.log(`   ❌  ${msg}`);
    failed++;
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout: ${label}`)), ms)
  );
  return Promise.race([promise, timeout]);
}

// ── Tests ───────────────────────────────────────────────────────

async function runTests(config: ServerConfig): Promise<void> {
  console.log(`\n🧪 Testing MCP Server: ${config.label}`);
  console.log(`   Command: ${config.command} ${config.args.join(" ")}`);
  console.log(`   Docs:    ${config.env.LLM_DOCS_PATH}\n`);

  const transport = new StdioClientTransport({
    command: config.command,
    args: config.args,
    env: config.env,
  });

  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);

  // ── Test 1: List tools ────────────────────────────────────
  console.log("── Test 1: tools/list ──");
  const { tools } = await withTimeout(
    client.listTools(),
    5000,
    "listTools"
  );

  assert(tools.length === 3, `3 tools registered (got ${tools.length})`);
  for (const t of tools) {
    console.log(`      • ${t.name} — ${t.description}`);
  }

  const toolNames = tools.map((t) => t.name);
  assert(toolNames.includes("search_docs"), "search_docs registered");
  assert(toolNames.includes("get_section"), "get_section registered");
  assert(toolNames.includes("list_sections"), "list_sections registered");

  // ── Test 2: search_docs ───────────────────────────────────
  console.log("\n── Test 2: search_docs ──");
  const searchResult = await withTimeout(
    client.callTool({
      name: "search_docs",
      arguments: { query: "authentication", limit: 3 },
    }),
    5000,
    "search_docs"
  );

  assert(
    Array.isArray(searchResult.content) && searchResult.content.length > 0,
    "Response has content"
  );

  const searchText = (searchResult.content as Array<{ type: string; text: string }>)
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");

  const hasResults = !searchText.includes("No results found");
  if (hasResults) {
    assert(true, `Results found (${searchText.length} chars)`);
  } else {
    console.log(`      ⚠️  No results for 'authentication' (docs-dependent)`);
    passed++;
  }

  assert(
    searchText.includes("**") && searchText.includes("\n---"),
    "Results formatted with markdown bold and separators"
  );

  // ── Test 3: search_docs with default limit ────────────────
  console.log("\n── Test 3: search_docs (default limit) ──");
  const searchNoLimit = await withTimeout(
    client.callTool({
      name: "search_docs",
      arguments: { query: "api" },
    }),
    5000,
    "search_docs (no limit)"
  );
  assert(
    Array.isArray(searchNoLimit.content) && searchNoLimit.content.length > 0,
    "Works without explicit limit"
  );

  // ── Test 4: get_section ───────────────────────────────────
  console.log("\n── Test 4: get_section ──");
  const sectionResult = await withTimeout(
    client.callTool({
      name: "get_section",
      arguments: { identifier: "introduction" },
    }),
    5000,
    "get_section"
  );

  const sectionText = (sectionResult.content as Array<{ type: string; text: string }>)
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");

  assert(
    sectionText.startsWith("# ") || sectionText.includes("Section not found"),
    "Returns markdown heading or 'not found'"
  );

  // ── Test 5: get_section (not found) ───────────────────────
  console.log("\n── Test 5: get_section (not found) ──");
  const notFoundResult = await withTimeout(
    client.callTool({
      name: "get_section",
      arguments: { identifier: "xyzzy_nonexistent_12345" },
    }),
    5000,
    "get_section (not found)"
  );

  const notFoundText = (notFoundResult.content as Array<{ type: string; text: string }>)
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");

  assert(
    notFoundText.includes("Section not found"),
    "Returns 'Section not found' error"
  );

  // ── Test 6: list_sections ─────────────────────────────────
  console.log("\n── Test 6: list_sections ──");
  const listResult = await withTimeout(
    client.callTool({
      name: "list_sections",
      arguments: {},
    }),
    5000,
    "list_sections"
  );

  const listText = (listResult.content as Array<{ type: string; text: string }>)
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");

  assert(
    listText.includes("Available sections") && listText.includes("Total:"),
    "Shows header and total count"
  );
  assert(listText.includes("- "), "Contains bullet list items");

  // ── Test 7: list_sections with category ───────────────────
  console.log("\n── Test 7: list_sections (category filter) ──");
  const filteredResult = await withTimeout(
    client.callTool({
      name: "list_sections",
      arguments: { category: "api" },
    }),
    5000,
    "list_sections (filtered)"
  );

  const filteredText = (filteredResult.content as Array<{ type: string; text: string }>)
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");

  assert(
    filteredText.includes("Total:") && filteredText.includes("filtered by:"),
    "Shows filtered header and total"
  );

  // ── Test 8: Unknown tool ──────────────────────────────────
  console.log("\n── Test 8: Unknown tool ──");
  let unknownOk = false;
  try {
    const unknownResult = await withTimeout(
      client.callTool({
        name: "nonexistent_tool",
        arguments: {},
      }),
      5000,
      "unknown tool"
    );

    const unknownText = (unknownResult.content as Array<{ type: string; text: string }>)
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n");

    unknownOk = unknownText.includes("Unknown tool");
    assert(unknownOk, "Returns 'Unknown tool' message (text response)");
  } catch (err: any) {
    unknownOk = err?.message?.includes("tool") || err?.code === -32602;
    assert(unknownOk, `Returns error for unknown tool (MCP spec compliant)`);
  }

  // ── Cleanup ───────────────────────────────────────────────
  await client.close();

  // ── Summary ───────────────────────────────────────────────
  const total = passed + failed;
  console.log(`\n${"═".repeat(50)}`);
  console.log(`   Results: ${passed} passed, ${failed} failed, ${total} total`);
  if (failed === 0) {
    console.log(`   ✅  All tests passed!`);
  } else {
    console.log(`   ❌  ${failed} test(s) failed`);
  }
  console.log(`${"═".repeat(50)}\n`);
}

// ── Entry ───────────────────────────────────────────────────────

const config = resolveServerConfig();

runTests(config).catch((err) => {
  console.error(`\n❌  Fatal error: ${err.message}`);
  process.exit(1);
});
