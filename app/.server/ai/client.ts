import { createOpenAI } from "@ai-sdk/openai";
import type { RouterContextProvider } from "react-router";
import { cloudflareContext } from "../../../workers/app";

/**
 * Get the configured OpenAI model for chat
 * Uses GPT-4 Turbo by default
 */
export function getAIModel(context: Readonly<RouterContextProvider>) {
  // Extract Cloudflare bindings using the context provider pattern
  const cloudflare = context.get(cloudflareContext);
  const apiKey = cloudflare.env.OPENAI_API_KEY;
  // OPENAI_BASE_URL is optional and may not be defined in all environments
  const baseURL = (cloudflare.env as unknown as Record<string, string>)
    .OPENAI_BASE_URL;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY environment variable is not set. Please configure it in .dev.vars or Cloudflare Workers secrets."
    );
  }

  // Create OpenAI client with API key and optional custom base URL
  const openai = createOpenAI({
    apiKey,
    baseURL: baseURL || undefined,
  });

  // Use Chat Completions API (not Responses API) for ZDR organization compatibility
  return openai.chat("gpt-4o-mini");
}

/**
 * Generate the system prompt with current date/time
 * Matches the reference application format
 */
export function getSystemPrompt(): string {
  const date = new Date().toISOString();

  return `You are a personal assistant named Assistant0. You are a helpful assistant that can answer questions and help with tasks.
You have access to a set of tools. When using tools, you MUST provide valid JSON arguments. Always format tool call arguments as proper JSON objects.
For example, when calling shop_online tool, format like this:
{"product": "iPhone", "qty": 1, "priceLimit": 1000}
Use the tools as needed to answer the user's question. Render the email body as a markdown block, do not wrap it in code blocks. The current date and time is ${date}.`;
}
