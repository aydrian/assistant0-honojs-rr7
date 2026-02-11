import type { Client } from "./client";
import { rowToObject } from "./utils";

export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: number;
  updated_at: number;
}

/**
 * Create a new conversation
 */
export async function createConversation(
  db: Client,
  data: {
    id: string;
    user_id: string;
    title?: string;
  },
): Promise<Conversation> {
  const now = Math.floor(Date.now() / 1000);

  const result = await db.execute({
    sql: `INSERT INTO conversations (id, user_id, title, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
          RETURNING *`,
    args: [data.id, data.user_id, data.title || null, now, now],
  });

  if (!result.rows[0]) {
    throw new Error("Failed to create conversation");
  }

  return rowToObject<Conversation>(result.rows[0], result.columns);
}

/**
 * Get a conversation by ID
 */
export async function getConversationById(
  db: Client,
  id: string,
): Promise<Conversation | null> {
  const result = await db.execute({
    sql: "SELECT * FROM conversations WHERE id = ?",
    args: [id],
  });

  if (!result.rows[0]) {
    return null;
  }

  return rowToObject<Conversation>(result.rows[0], result.columns);
}

/**
 * List conversations for a user
 */
export async function listConversationsByUser(
  db: Client,
  userId: string,
  limit: number = 50,
): Promise<Conversation[]> {
  const result = await db.execute({
    sql: "SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?",
    args: [userId, limit],
  });

  return result.rows.map((row) =>
    rowToObject<Conversation>(row, result.columns),
  );
}

/**
 * Update a conversation's title
 */
export async function updateConversationTitle(
  db: Client,
  id: string,
  title: string,
): Promise<Conversation> {
  const now = Math.floor(Date.now() / 1000);

  const result = await db.execute({
    sql: `UPDATE conversations SET title = ?, updated_at = ? WHERE id = ? RETURNING *`,
    args: [title, now, id],
  });

  if (!result.rows[0]) {
    throw new Error("Conversation not found");
  }

  return rowToObject<Conversation>(result.rows[0], result.columns);
}

/**
 * Delete a conversation
 * Note: This will cascade delete all messages in the conversation
 */
export async function deleteConversation(db: Client, id: string): Promise<void> {
  await db.execute({
    sql: "DELETE FROM conversations WHERE id = ?",
    args: [id],
  });
}
