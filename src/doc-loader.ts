import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { AppConfig, DocSection, IDocLoader } from "./types.js";

export class DocLoader implements IDocLoader {
  private sections: DocSection[] = [];

  constructor(config: AppConfig) {
    const docsPath = this.resolvePath(config);

    if (!docsPath) {
      const tried = [
        process.env.LLM_DOCS_PATH || "",
        ...config.documentation.fallbackPaths,
      ].filter(Boolean);
      console.error("Documentation file not found. Tried paths:", tried);
      console.error(
        "Please set LLM_DOCS_PATH environment variable or place llms-full.txt in the project directory"
      );
      return;
    }

    console.error(`Loading documentation from: ${docsPath}`);
    const raw = readFileSync(docsPath, "utf-8");
    this.sections = this.parse(raw);
    console.error(
      `Successfully loaded documentation: ${this.sections.length} sections parsed`
    );
  }

  loadSections(): DocSection[] {
    return this.sections;
  }

  // ── Private helpers ──────────────────────────────────────────

  private resolvePath(config: AppConfig): string {
    const possiblePaths = [
      process.env.LLM_DOCS_PATH || "",
      ...config.documentation.fallbackPaths.map((p) =>
        p.startsWith("/") ? p : join(process.cwd(), p)
      ),
    ].filter(Boolean);

    return possiblePaths.find((p) => existsSync(p)) || "";
  }

  private parse(raw: string): DocSection[] {
    const lines = raw.split("\n");
    const sections: DocSection[] = [];
    let currentSection: DocSection | null = null;
    let contentBuffer: string[] = [];

    for (const line of lines) {
      if (
        line.startsWith("# ") &&
        !line.startsWith("## ") &&
        !line.startsWith("### ")
      ) {
        if (currentSection && contentBuffer.length > 0) {
          currentSection.content = contentBuffer.join("\n").trim();
          sections.push(currentSection);
        }

        currentSection = {
          title: line.replace("# ", "").trim(),
          content: "",
          path: line.replace("# ", "").replace(/\s+/g, "_").toLowerCase(),
        };
        contentBuffer = [];
      } else if (line.startsWith("## ") && currentSection) {
        if (contentBuffer.length > 0) {
          const subSection: DocSection = {
            title: `${currentSection.title} | ${line.replace("## ", "").trim()}`,
            content: contentBuffer.join("\n").trim(),
            path: currentSection.path,
          };
          if (subSection.content) {
            sections.push(subSection);
          }
        }
        contentBuffer = [line];
      } else if (currentSection) {
        contentBuffer.push(line);
      }
    }

    if (currentSection && contentBuffer.length > 0) {
      currentSection.content = contentBuffer.join("\n").trim();
      sections.push(currentSection);
    }

    return sections;
  }
}
