/**
 * Cloudflare Vectorize helper functions
 * Handles vector storage, search, and deletion
 */

export interface VectorMetadata {
  userId: string;
  title?: string;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata?: VectorMetadata;
}

/**
 * Insert or update a vector in the Vectorize index
 *
 * @param vectorize - Cloudflare Vectorize index binding
 * @param documentId - Unique document ID (used as vector ID)
 * @param userId - User ID for filtering in searches
 * @param embedding - Vector embedding array (1536 dimensions)
 * @param title - Optional document title for metadata
 */
export async function insertVector(
  vectorize: VectorizeIndex,
  documentId: string,
  userId: string,
  embedding: number[],
  title?: string
): Promise<void> {
  await vectorize.upsert([
    {
      id: documentId,
      values: embedding,
      metadata: {
        userId,
        ...(title && { title }),
      },
    },
  ]);
}

/**
 * Search for similar vectors in the Vectorize index
 * Filters results by userId for multi-tenant isolation
 *
 * @param vectorize - Cloudflare Vectorize index binding
 * @param queryEmbedding - Query vector to find similar documents
 * @param userId - User ID to filter results
 * @param topK - Number of results to return (default: 3)
 * @returns Array of matching document IDs with similarity scores
 */
export async function searchVectors(
  vectorize: VectorizeIndex,
  queryEmbedding: number[],
  userId: string,
  topK: number = 3
): Promise<VectorSearchResult[]> {
  const results = await vectorize.query(queryEmbedding, {
    topK,
    filter: { userId },
    returnMetadata: "all",
  });

  return results.matches.map((match) => ({
    id: match.id,
    score: match.score,
    metadata: match.metadata as VectorMetadata | undefined,
  }));
}

/**
 * Delete a vector from the Vectorize index
 *
 * @param vectorize - Cloudflare Vectorize index binding
 * @param documentId - ID of the document/vector to delete
 */
export async function deleteVector(
  vectorize: VectorizeIndex,
  documentId: string
): Promise<void> {
  await vectorize.deleteByIds([documentId]);
}

/**
 * Delete multiple vectors from the Vectorize index
 *
 * @param vectorize - Cloudflare Vectorize index binding
 * @param documentIds - Array of document/vector IDs to delete
 */
export async function deleteVectors(
  vectorize: VectorizeIndex,
  documentIds: string[]
): Promise<void> {
  if (documentIds.length === 0) return;
  await vectorize.deleteByIds(documentIds);
}
