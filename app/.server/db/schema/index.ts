export * from "./documents.sql";

import { documents } from "./documents.sql";

// Inferred types
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
