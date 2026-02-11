import { eq, desc, inArray, and } from "drizzle-orm";
import { documents, type Document, type NewDocument } from "./schema";
import type { Database } from "./client";

// Re-export types for convenience
export type { Document, NewDocument };

/**
 * Create a new document
 * Note: Embeddings are stored in Cloudflare Vectorize, not in D1
 */
export async function createDocument(
  db: Database,
  data: Omit<NewDocument, "created_at" | "updated_at">
): Promise<Document> {
  const now = Math.floor(Date.now() / 1000);

  const result = await db
    .insert(documents)
    .values({
      ...data,
      created_at: now,
      updated_at: now,
    })
    .returning()
    .get();

  if (!result) {
    throw new Error("Failed to create document");
  }

  return result;
}

/**
 * Get a document by ID
 */
export async function getDocumentById(
  db: Database,
  id: string
): Promise<Document | null> {
  const result = await db
    .select()
    .from(documents)
    .where(eq(documents.id, id))
    .get();

  return result ?? null;
}

/**
 * Get multiple documents by their IDs
 * Used for fetching documents after Vectorize similarity search
 */
export async function getDocumentsByIds(
  db: Database,
  ids: string[]
): Promise<Document[]> {
  if (ids.length === 0) {
    return [];
  }

  const results = await db
    .select()
    .from(documents)
    .where(inArray(documents.id, ids))
    .all();

  // Preserve the order of the input IDs (important for relevance ranking)
  const documentMap = new Map(results.map((doc) => [doc.id, doc]));
  return ids.map((id) => documentMap.get(id)).filter(Boolean) as Document[];
}

/**
 * List all documents for a user
 */
export async function listDocumentsByUser(
  db: Database,
  userId: string
): Promise<Document[]> {
  return db
    .select()
    .from(documents)
    .where(eq(documents.user_id, userId))
    .orderBy(desc(documents.created_at))
    .all();
}

/**
 * Update a document
 */
export async function updateDocument(
  db: Database,
  id: string,
  data: {
    title?: string;
    content?: string;
  }
): Promise<Document> {
  const now = Math.floor(Date.now() / 1000);

  const result = await db
    .update(documents)
    .set({
      ...data,
      updated_at: now,
    })
    .where(eq(documents.id, id))
    .returning()
    .get();

  if (!result) {
    throw new Error("Document not found");
  }

  return result;
}

/**
 * Delete a document
 * Note: Also delete the corresponding vector from Vectorize separately
 */
export async function deleteDocument(db: Database, id: string): Promise<void> {
  await db.delete(documents).where(eq(documents.id, id)).run();
}

/**
 * Check if a document exists and belongs to a user
 */
export async function documentBelongsToUser(
  db: Database,
  documentId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.user_id, userId)))
    .get();

  return result !== undefined;
}
