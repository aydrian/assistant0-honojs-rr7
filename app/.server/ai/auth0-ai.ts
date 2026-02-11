import { Auth0AI } from "@auth0/ai-vercel";
import type { RouterContextProvider } from "react-router";
import { cloudflareContext } from "../../../workers/app";

/**
 * Create Auth0 AI SDK instance with Cloudflare environment variables
 *
 * This solves the OpenAI Zero Data Retention issue by storing
 * conversation state in Auth0's infrastructure instead of relying
 * on OpenAI to remember tool call IDs between API requests.
 *
 * This must be called per-request to access Cloudflare bindings.
 * Follows the same pattern as getAIModel() in client.ts.
 *
 * Only needed for advanced features like Token Vault, CIBA, or Device Flow.
 * Basic Auth0 AI functionality (runWithAIContext, withInterruptions) works standalone.
 */
export function getAuth0AI(context: Readonly<RouterContextProvider>): Auth0AI {
  const cloudflare = context.get(cloudflareContext);

  return new Auth0AI({
    auth0: {
      domain: cloudflare.env.AUTH0_DOMAIN,
      clientId: cloudflare.env.AUTH0_CLIENT_ID,
      clientSecret: cloudflare.env.AUTH0_CLIENT_SECRET,
    },
  });
}
