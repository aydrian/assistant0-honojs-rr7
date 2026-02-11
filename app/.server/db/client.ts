import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import type { RouterContextProvider } from "react-router";
import { cloudflareContext } from "../../../workers/app";

/**
 * Get Drizzle database client for the current request
 * Uses Cloudflare D1 bindings via React Router context
 */
export function getDb(context: Readonly<RouterContextProvider>) {
  const cloudflare = context.get(cloudflareContext);
  return drizzle(cloudflare.env.DB, { schema });
}

export type Database = ReturnType<typeof getDb>;
