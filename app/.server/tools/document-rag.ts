import { tool } from "ai";
import { z } from "zod";
import type { RouterContextProvider } from "react-router";
import { getUser } from "@auth0/auth0-react-router";
import { cloudflareContext } from "../../../workers/app";
import { getDb } from "../db/client";
import { getDocumentsByIds } from "../db/documents";
import { generateEmbedding, searchVectors } from "../embeddings";
import type { AIContext } from "../ai/context";

export interface DocumentSearchResult {
  title: string;
  content: string;
  similarity: number;
  fileType: string;
  documentId: string;
}

/**
 * Create document search tool for RAG
 * Searches user's uploaded documents using semantic similarity
 *
 * @param context - React Router context provider for accessing Cloudflare bindings
 * @param _aiContext - Optional AI context (for future Auth0 AI features)
 * @returns Document search tool or null if Vectorize is not configured
 */
export function createDocumentSearchTool(
  context: Readonly<RouterContextProvider>,
  _aiContext?: AIContext
) {
  const cloudflare = context.get(cloudflareContext);

  // Check if Vectorize is configured
  if (!cloudflare.env.VECTORIZE) {
    console.warn("VECTORIZE not configured - document search tool disabled");
    return null;
  }

  return tool({
    description:
      "Search your uploaded documents for relevant information. Use this when the user asks about content from their documents, files they've uploaded, or when you need to find specific information from their personal files.",
    inputSchema: z.object({
      query: z
        .string()
        .describe("Search query to find relevant documents and content"),
    }),
    execute: async ({
      query,
    }): Promise<{ results: DocumentSearchResult[]; query: string }> => {
      // 1. Get authenticated user
      const user = getUser(context);
      if (!user) {
        throw new Error("Not authenticated - cannot search documents");
      }

      // 2. Generate query embedding
      const queryEmbedding = await generateEmbedding(query, cloudflare.env);

      // 3. Search Vectorize with user filter
      const vectorResults = await searchVectors(
        cloudflare.env.VECTORIZE,
        queryEmbedding,
        user.sub,
        3 // Return top 3 results
      );

      if (vectorResults.length === 0) {
        return {
          query,
          results: [],
        };
      }

      // 4. Fetch document content from D1
      const db = getDb(context);
      const documentIds = vectorResults.map((r) => r.id);
      const documents = await getDocumentsByIds(db, documentIds);

      // 5. Build results with similarity scores
      const results: DocumentSearchResult[] = documents.map((doc) => {
        const vectorResult = vectorResults.find((r) => r.id === doc.id);
        return {
          documentId: doc.id,
          title: doc.title,
          // Return first 2000 characters to keep context manageable
          content: doc.content.slice(0, 2000),
          similarity: vectorResult?.score ?? 0,
          fileType: doc.file_type,
        };
      });

      return {
        query,
        results,
      };
    },
  });
}
