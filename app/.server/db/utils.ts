/**
 * Database utility functions shared across all database query files
 */

/**
 * Convert a Turso Row to a plain JavaScript object
 *
 * Turso/libSQL returns Row objects with special property accessors that don't
 * work with standard object access patterns. This helper explicitly converts
 * Row objects to plain objects by iterating through columns and copying values.
 *
 * @param row - The Turso Row object from query result
 * @param columns - Array of column names from result.columns
 * @returns Plain JavaScript object with all column properties accessible
 *
 * @example
 * const result = await db.execute({ sql: "SELECT * FROM users WHERE id = ?", args: [id] });
 * const user = rowToObject<User>(result.rows[0], result.columns);
 */
export function rowToObject<T>(row: any, columns: string[]): T {
  const obj: any = {};
  for (const col of columns) {
    obj[col] = row[col];
  }
  return obj as T;
}
