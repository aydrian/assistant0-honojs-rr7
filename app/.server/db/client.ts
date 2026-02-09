import { createClient, type Client } from "@tursodatabase/serverless/compat";
import type { RouterContextProvider } from "react-router";
import { cloudflareContext } from "../../../workers/app";

/**
 * Get database client for the current request
 * Uses Cloudflare environment bindings via React Router context
 */
export function getDb(context: Readonly<RouterContextProvider>): Client {
  // Extract Cloudflare bindings using the context provider pattern
  const cloudflare = context.get(cloudflareContext);

  return createClient({
    url: cloudflare.env.TURSO_DATABASE_URL!,
    authToken: cloudflare.env.TURSO_AUTH_TOKEN!,
  });
}

export type { Client };
