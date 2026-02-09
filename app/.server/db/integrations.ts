import type { Client } from "./client";

export interface Integration {
  id: string;
  user_id: string;
  provider: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: number | null;
  scopes: string;
  created_at: number;
  updated_at: number;
}

/**
 * Create a new integration (OAuth connection)
 * Note: In Stage 2, tokens are stored as plaintext. Stage 6 will add encryption.
 */
export async function createIntegration(
  db: Client,
  data: {
    id: string;
    user_id: string;
    provider: string;
    access_token: string;
    refresh_token?: string;
    token_expires_at?: number;
    scopes: string;
  },
): Promise<Integration> {
  const now = Math.floor(Date.now() / 1000);

  const result = await db.execute({
    sql: `INSERT INTO integrations (id, user_id, provider, access_token, refresh_token, token_expires_at, scopes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING *`,
    args: [
      data.id,
      data.user_id,
      data.provider,
      data.access_token,
      data.refresh_token || null,
      data.token_expires_at || null,
      data.scopes,
      now,
      now,
    ],
  });

  if (!result.rows[0]) {
    throw new Error("Failed to create integration");
  }

  return result.rows[0] as unknown as Integration;
}

/**
 * Get an integration for a user and provider
 */
export async function getIntegration(
  db: Client,
  userId: string,
  provider: string,
): Promise<Integration | null> {
  const result = await db.execute({
    sql: "SELECT * FROM integrations WHERE user_id = ? AND provider = ?",
    args: [userId, provider],
  });

  if (!result.rows[0]) {
    return null;
  }

  return result.rows[0] as unknown as Integration;
}

/**
 * Update integration tokens (e.g., after token refresh)
 */
export async function updateIntegrationTokens(
  db: Client,
  id: string,
  data: {
    access_token: string;
    refresh_token?: string;
    token_expires_at?: number;
  },
): Promise<Integration> {
  const now = Math.floor(Date.now() / 1000);

  const result = await db.execute({
    sql: `UPDATE integrations
          SET access_token = ?,
              refresh_token = COALESCE(?, refresh_token),
              token_expires_at = COALESCE(?, token_expires_at),
              updated_at = ?
          WHERE id = ?
          RETURNING *`,
    args: [
      data.access_token,
      data.refresh_token || null,
      data.token_expires_at || null,
      now,
      id,
    ],
  });

  if (!result.rows[0]) {
    throw new Error("Integration not found");
  }

  return result.rows[0] as unknown as Integration;
}

/**
 * Delete an integration (disconnect a service)
 */
export async function deleteIntegration(
  db: Client,
  userId: string,
  provider: string,
): Promise<void> {
  await db.execute({
    sql: "DELETE FROM integrations WHERE user_id = ? AND provider = ?",
    args: [userId, provider],
  });
}

/**
 * List all integrations for a user
 */
export async function listIntegrationsByUser(
  db: Client,
  userId: string,
): Promise<Integration[]> {
  const result = await db.execute({
    sql: "SELECT * FROM integrations WHERE user_id = ? ORDER BY created_at DESC",
    args: [userId],
  });

  return result.rows as unknown as Integration[];
}
