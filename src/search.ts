import Fuse from "fuse.js";
import type {
  AppConfig,
  DocSection,
  ISearchEngine,
  SearchResult,
} from "./types.js";

export class SearchEngine implements ISearchEngine {
  private fuse: Fuse<DocSection>;

  constructor(sections: DocSection[], config: AppConfig) {
    this.fuse = new Fuse(sections, {
      keys: ["title", "content", "path"],
      threshold: config.searchDefaults.threshold,
      includeScore: true,
      minMatchCharLength: config.searchDefaults.minMatchCharLength,
      shouldSort: true,
      findAllMatches: false,
      ignoreLocation: true,
    });
  }

  search(query: string, limit: number): SearchResult[] {
    return this.fuse.search(query, { limit });
  }
}
