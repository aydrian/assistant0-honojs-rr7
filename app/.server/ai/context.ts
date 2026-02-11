/**
 * AI Context for Cloudflare Workers
 *
 * Provides request-scoped AI context without AsyncLocalStorage.
 * This is a Cloudflare-compatible alternative to @auth0/ai-vercel's setAIContext.
 *
 * Used for:
 * - Tracking conversation threadID
 * - Future: Token Vault, CIBA, Device Flow state
 */

export interface AIContext {
  threadID: string;
  // Future fields for Auth0 AI features:
  // tokenVault?: TokenVaultState;
  // cibaState?: CIBAState;
  // deviceFlowState?: DeviceFlowState;
}

/**
 * Context holder - set per-request in the route action
 * In Cloudflare Workers, each request is isolated, so this is safe
 */
let currentContext: AIContext | null = null;

/**
 * Set the AI context for the current request
 * Call this at the start of your route action
 *
 * @param ctx - The AI context with threadID and other state
 */
export function setRequestAIContext(ctx: AIContext): void {
  currentContext = ctx;
}

/**
 * Get the current AI context
 * Use this in tools to access threadID for Token Vault, CIBA, etc.
 *
 * @returns The current AI context
 * @throws Error if context not set
 */
export function getRequestAIContext(): AIContext {
  if (!currentContext) {
    throw new Error("AI context not set - call setRequestAIContext first");
  }
  return currentContext;
}

/**
 * Check if AI context is available
 * Use this for optional context access
 *
 * @returns true if context is set
 */
export function hasRequestAIContext(): boolean {
  return currentContext !== null;
}

/**
 * Clear the AI context after request completion
 * Call this in a finally block to ensure cleanup
 */
export function clearRequestAIContext(): void {
  currentContext = null;
}
