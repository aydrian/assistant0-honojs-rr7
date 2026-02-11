/**
 * Tool-related type definitions for the Assistant0 agent
 */

export interface ToolCallInfo {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
}

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  position?: number;
}

export interface WebSearchResult {
  query: string;
  results: SearchResult[];
  searchTime?: number;
}
