import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const documents = sqliteTable(
  "documents",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id").notNull(), // Auth0 sub
    title: text("title").notNull(),
    content: text("content").notNull(),
    file_type: text("file_type").notNull(),
    file_size: integer("file_size").notNull(),
    created_at: integer("created_at", { mode: "number" })
      .notNull()
      .default(sql`(unixepoch())`),
    updated_at: integer("updated_at", { mode: "number" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [index("idx_documents_user_id").on(table.user_id)]
);
