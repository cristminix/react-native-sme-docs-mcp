import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { AppConfig } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const configPath = join(__dirname, "..", "config.json");

export function loadConfig(): AppConfig {
  const raw = readFileSync(configPath, "utf-8");
  return JSON.parse(raw) as AppConfig;
}
