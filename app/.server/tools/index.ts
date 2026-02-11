/**
 * Tool registry for the Assistant0 agent
 * Creates tools dynamically based on available API keys and configuration
 */

import type { RouterContextProvider } from "react-router";
import { createSerpApiTool } from "./serpapi";
import { createDocumentSearchTool } from "./document-rag";
import type { AIContext } from "../ai/context";

/**
 * Create all available tools based on current context and configuration
 * Tools with missing API keys will be excluded automatically
 *
 * @param context - React Router context provider for accessing Cloudflare bindings
 * @param aiContext - Optional AI context with threadID for Auth0 AI features
 * @returns Object containing all configured tools
 */
export function createAllTools(
  context: Readonly<RouterContextProvider>,
  aiContext?: AIContext
) {
  const serpApiTool = createSerpApiTool(context, aiContext);
  const documentSearchTool = createDocumentSearchTool(context, aiContext);

  return {
    ...(serpApiTool ? { serpApiTool } : {}),
    ...(documentSearchTool ? { searchDocuments: documentSearchTool } : {}),
    // Future tools will be added here:
    // ...(gmailTool ? { list_emails: gmailTool } : {}),
    // ...(calendarTool ? { list_calendar: calendarTool } : {}),
  };
}

// Export types
export type { ToolCallInfo, SearchResult, WebSearchResult } from "./types";
export type { DocumentSearchResult } from "./document-rag";
