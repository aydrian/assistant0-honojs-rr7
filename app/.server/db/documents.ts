import type { Client } from "./client";

export interface Document {
  id: string;
  user_id: string;
  title: string;
  content: string;
  file_type: string;
  file_size: number;
  embedding: Uint8Array | null;
  created_at: number;
  updated_at: number;
}

/**
 * Create a new document
 */
export async function createDocument(
  db: Client,
  data: {
    id: string;
    user_id: string;
    title: string;
    content: string;
    file_type: string;
    file_size: number;
    embedding?: Float32Array;
  },
): Promise<Document> {
  const now = Math.floor(Date.now() / 1000);

  // Convert Float32Array to Uint8Array for BLOB storage
  let embeddingBlob: Uint8Array | null = null;
  if (data.embedding) {
    embeddingBlob = new Uint8Array(data.embedding.buffer);
  }

  const result = await db.execute({
    sql: `INSERT INTO documents (id, user_id, title, content, file_type, file_size, embedding, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING *`,
    args: [
      data.id,
      data.user_id,
      data.title,
      data.content,
      data.file_type,
      data.file_size,
      embeddingBlob,
      now,
      now,
    ],
  });

  if (!result.rows[0]) {
    throw new Error("Failed to create document");
  }

  return result.rows[0] as unknown as Document;
}

/**
 * Get a document by ID
 */
export async function getDocumentById(
  db: Client,
  id: string,
): Promise<Document | null> {
  const result = await db.execute({
    sql: "SELECT * FROM documents WHERE id = ?",
    args: [id],
  });

  if (!result.rows[0]) {
    return null;
  }

  return result.rows[0] as unknown as Document;
}

/**
 * List all documents for a user
 */
export async function listDocumentsByUser(
  db: Client,
  userId: string,
): Promise<Document[]> {
  const result = await db.execute({
    sql: "SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC",
    args: [userId],
  });

  return result.rows as unknown as Document[];
}

/**
 * Update a document
 */
export async function updateDocument(
  db: Client,
  id: string,
  data: {
    title?: string;
    content?: string;
    embedding?: Float32Array;
  },
): Promise<Document> {
  const now = Math.floor(Date.now() / 1000);

  // Build dynamic update query
  const updates: string[] = ["updated_at = ?"];
  const args: (string | number | Uint8Array)[] = [now];

  if (data.title !== undefined) {
    updates.push("title = ?");
    args.push(data.title);
  }
  if (data.content !== undefined) {
    updates.push("content = ?");
    args.push(data.content);
  }
  if (data.embedding !== undefined) {
    updates.push("embedding = ?");
    args.push(new Uint8Array(data.embedding.buffer));
  }

  args.push(id);

  const result = await db.execute({
    sql: `UPDATE documents SET ${updates.join(", ")} WHERE id = ? RETURNING *`,
    args,
  });

  if (!result.rows[0]) {
    throw new Error("Document not found");
  }

  return result.rows[0] as unknown as Document;
}

/**
 * Delete a document
 */
export async function deleteDocument(db: Client, id: string): Promise<void> {
  await db.execute({
    sql: "DELETE FROM documents WHERE id = ?",
    args: [id],
  });
}

/**
 * Search documents by embedding similarity
 * Note: This is a placeholder implementation. Full vector search will be implemented in Stage 5
 * with proper cosine similarity calculation.
 */
export async function searchDocumentsByEmbedding(
  db: Client,
  userId: string,
  queryEmbedding: Float32Array,
  limit: number = 3,
): Promise<Document[]> {
  // For now, just return all user documents
  // TODO Stage 5: Implement cosine similarity search
  const result = await db.execute({
    sql: "SELECT * FROM documents WHERE user_id = ? AND embedding IS NOT NULL LIMIT ?",
    args: [userId, limit],
  });

  return result.rows as unknown as Document[];
}
