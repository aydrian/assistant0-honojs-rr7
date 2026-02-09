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
  const baseURL = cloudflare.env.OPENAI_BASE_URL;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY environment variable is not set. Please configure it in .dev.vars or Cloudflare Workers secrets.",
    );
  }

  // Create OpenAI client with API key and optional custom base URL
  const openai = createOpenAI({
    apiKey,
    baseURL: baseURL || undefined,
  });

  // Use GPT-4 Turbo (faster, cheaper than GPT-4, better than GPT-3.5)
  return openai("gpt-4-turbo");
}

/**
 * System prompt for Assistant0
 */
export const ASSISTANT_SYSTEM_PROMPT = `You are Assistant0, a helpful AI assistant. You provide clear, accurate, and friendly responses to user questions. You can help with a wide variety of tasks including:

- Answering questions and providing information
- Helping with writing and editing
- Explaining complex topics
- Problem-solving and brainstorming
- General conversation

Be concise but thorough in your responses. If you're not sure about something, say so honestly.`;
