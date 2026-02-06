import type { Client } from "./client";

/**
 * Convert a Turso Row to a plain JavaScript object
 * Turso rows can be accessed by column name, but need explicit conversion
 */
function rowToObject<T>(row: any, columns: string[]): T {
  const obj: any = {};
  for (const col of columns) {
    obj[col] = row[col];
  }
  return obj as T;
}

export interface User {
  id: string;
  auth0_id: string;
  email: string;
  name: string | null;
  picture: string | null;
  created_at: number;
  updated_at: number;
}

/**
 * Create a new user in the database
 */
export async function createUser(
  db: Client,
  data: {
    id: string;
    auth0_id: string;
    email: string;
    name?: string;
    picture?: string;
  },
): Promise<User> {
  const now = Math.floor(Date.now() / 1000);

  const result = await db.execute({
    sql: `INSERT INTO users (id, auth0_id, email, name, picture, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          RETURNING *`,
    args: [
      data.id,
      data.auth0_id,
      data.email,
      data.name || null,
      data.picture || null,
      now,
      now,
    ],
  });

  if (!result.rows[0]) {
    throw new Error("Failed to create user");
  }

  return rowToObject<User>(result.rows[0], result.columns);
}

/**
 * Get a user by their Auth0 ID
 */
export async function getUserByAuth0Id(
  db: Client,
  auth0Id: string,
): Promise<User | null> {
  const result = await db.execute({
    sql: "SELECT * FROM users WHERE auth0_id = ?",
    args: [auth0Id],
  });

  if (!result.rows[0]) {
    return null;
  }

  return rowToObject<User>(result.rows[0], result.columns);
}

/**
 * Get a user by their database ID
 */
export async function getUserById(
  db: Client,
  id: string,
): Promise<User | null> {
  const result = await db.execute({
    sql: "SELECT * FROM users WHERE id = ?",
    args: [id],
  });

  if (!result.rows[0]) {
    return null;
  }

  return rowToObject<User>(result.rows[0], result.columns);
}

/**
 * Update a user's profile information
 */
export async function updateUser(
  db: Client,
  id: string,
  data: {
    name?: string;
    picture?: string;
    email?: string;
  },
): Promise<User> {
  const now = Math.floor(Date.now() / 1000);

  // Build dynamic update query based on provided fields
  const updates: string[] = ["updated_at = ?"];
  const args: (string | number)[] = [now];

  if (data.name !== undefined) {
    updates.push("name = ?");
    args.push(data.name);
  }
  if (data.picture !== undefined) {
    updates.push("picture = ?");
    args.push(data.picture);
  }
  if (data.email !== undefined) {
    updates.push("email = ?");
    args.push(data.email);
  }

  args.push(id);

  const result = await db.execute({
    sql: `UPDATE users SET ${updates.join(", ")} WHERE id = ? RETURNING *`,
    args,
  });

  if (!result.rows[0]) {
    throw new Error("User not found");
  }

  return rowToObject<User>(result.rows[0], result.columns);
}

/**
 * Delete a user from the database
 * Note: This will cascade delete all related data (documents, conversations, etc.)
 */
export async function deleteUser(db: Client, id: string): Promise<void> {
  await db.execute({
    sql: "DELETE FROM users WHERE id = ?",
    args: [id],
  });
}
