import { createClient, type Client } from "@tursodatabase/serverless/compat";
import type { AppLoadContext } from "react-router";

/**
 * Get database client for the current request
 * With nodejs_compat enabled, env vars are available in process.env
 */
export function getDb(_context: AppLoadContext): Client {
  // Access process.env (available with nodejs_compat)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = (globalThis as any).process?.env || {};

  return createClient({
    url: env.TURSO_DATABASE_URL!,
    authToken: env.TURSO_AUTH_TOKEN!,
  });
}

export type { Client };
