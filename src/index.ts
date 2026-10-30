#!/usr/bin/env node

import { loadConfig } from "./config.js";
import { DocLoader } from "./doc-loader.js";
import { SearchEngine } from "./search.js";
import {
  ToolRegistry,
  createSearchDocsTool,
  createGetSectionTool,
  createListSectionsTool,
} from "./tools.js";
import { MedusaDocsServer } from "./server.js";

const config = loadConfig();
const docLoader = new DocLoader(config);
const sections = docLoader.loadSections();
const searchEngine = new SearchEngine(sections, config);

const toolRegistry = new ToolRegistry();
toolRegistry.register(createSearchDocsTool(searchEngine, config));
toolRegistry.register(createGetSectionTool(sections));
toolRegistry.register(createListSectionsTool(sections, config));

const server = new MedusaDocsServer(config, toolRegistry);
server.start().catch(console.error);
