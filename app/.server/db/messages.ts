import type { Client } from "./client";

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tool_calls: string | null; // JSON string
  created_at: number;
}

/**
 * Create a new message
 */
export async function createMessage(
  db: Client,
  data: {
    id: string;
    conversation_id: string;
    role: "user" | "assistant" | "system";
    content: string;
    tool_calls?: object[];
  },
): Promise<Message> {
  const now = Math.floor(Date.now() / 1000);

  // Serialize tool_calls to JSON string if provided
  const toolCallsJson = data.tool_calls
    ? JSON.stringify(data.tool_calls)
    : null;

  const result = await db.execute({
    sql: `INSERT INTO messages (id, conversation_id, role, content, tool_calls, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
          RETURNING *`,
    args: [
      data.id,
      data.conversation_id,
      data.role,
      data.content,
      toolCallsJson,
      now,
    ],
  });

  if (!result.rows[0]) {
    throw new Error("Failed to create message");
  }

  return result.rows[0] as unknown as Message;
}

/**
 * Get a message by ID
 */
export async function getMessageById(
  db: Client,
  id: string,
): Promise<Message | null> {
  const result = await db.execute({
    sql: "SELECT * FROM messages WHERE id = ?",
    args: [id],
  });

  if (!result.rows[0]) {
    return null;
  }

  return result.rows[0] as unknown as Message;
}

/**
 * List all messages in a conversation, ordered chronologically
 */
export async function listMessagesByConversation(
  db: Client,
  conversationId: string,
): Promise<Message[]> {
  const result = await db.execute({
    sql: "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
    args: [conversationId],
  });

  return result.rows as unknown as Message[];
}

/**
 * Delete a message
 */
export async function deleteMessage(db: Client, id: string): Promise<void> {
  await db.execute({
    sql: "DELETE FROM messages WHERE id = ?",
    args: [id],
  });
}
