import { tool } from "ai";
import { z } from "zod";
import type { RouterContextProvider } from "react-router";
import { cloudflareContext } from "../../../workers/app";
import type { SearchResult } from "./types";
import type { AIContext } from "../ai/context";

/**
 * Create SerpAPI web search tool if SERPAPI_API_KEY is configured
 * Returns null if API key is not available
 *
 * @param context - React Router context provider for accessing Cloudflare bindings
 * @param _aiContext - Optional AI context (unused for now, for future Auth0 AI features)
 * @returns SerpAPI search tool or null if API key not configured
 */
export function createSerpApiTool(
  context: Readonly<RouterContextProvider>,
  _aiContext?: AIContext
) {
  const cloudflare = context.get(cloudflareContext);
  const apiKey = cloudflare.env.SERPAPI_API_KEY;

  if (!apiKey) {
    console.warn("SERPAPI_API_KEY not configured - web search tool disabled");
    return null;
  }

  return tool({
    description:
      "Search the web for current information. Use this when you need up-to-date facts, news, or information not in your training data. Returns the top search results from Google.",
    inputSchema: z.object({
      query: z.string().describe("The search query to execute"),
      numResults: z
        .number()
        .optional()
        .describe("Number of results to return (default: 5, max: 10)"),
    }),
    execute: async ({ query, numResults = 5 }) => {
      const startTime = Date.now();

      // Limit results to max 10
      const limit = Math.min(numResults, 10);

      try {
        // Call SerpAPI
        const url = new URL("https://serpapi.com/search.json");
        url.searchParams.append("q", query);
        url.searchParams.append("num", limit.toString());
        url.searchParams.append("api_key", apiKey);
        url.searchParams.append("engine", "google");

        const response = await fetch(url.toString());

        if (!response.ok) {
          throw new Error(
            `SerpAPI error: ${response.status} ${response.statusText}`
          );
        }

        const data = (await response.json()) as {
          organic_results?: Array<{
            title: string;
            link: string;
            snippet: string;
            position: number;
          }>;
        };

        // Extract organic results
        const organicResults = data.organic_results || [];
        const results: SearchResult[] = organicResults.map((result) => ({
          title: result.title,
          link: result.link,
          snippet: result.snippet,
          position: result.position,
        }));

        const searchTime = Date.now() - startTime;

        return {
          query,
          results,
          searchTime,
        };
      } catch (error) {
        console.error("Web search error:", error);
        throw new Error(
          `Failed to perform web search: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    },
  });
}
