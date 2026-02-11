import { embed } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

/**
 * Generate an embedding vector for the given text
 * Uses OpenAI's text-embedding-3-small model (1536 dimensions)
 *
 * @param text - The text to generate an embedding for
 * @param env - Cloudflare environment bindings containing OPENAI_API_KEY
 * @returns Array of numbers representing the embedding vector
 */
export async function generateEmbedding(
  text: string,
  env: Env
): Promise<number[]> {
  const openai = createOpenAI({
    apiKey: env.OPENAI_API_KEY,
  });

  const { embedding } = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value: text,
  });

  return embedding;
}

/**
 * Truncate text to fit within the embedding model's context window
 * text-embedding-3-small has a context window of 8191 tokens
 * We use a conservative character limit to stay within bounds
 *
 * @param text - The text to truncate
 * @param maxChars - Maximum characters (default: 24000, roughly 6000 tokens)
 * @returns Truncated text
 */
export function truncateForEmbedding(
  text: string,
  maxChars: number = 24000
): string {
  if (text.length <= maxChars) {
    return text;
  }
  return text.slice(0, maxChars);
}
