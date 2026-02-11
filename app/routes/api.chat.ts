/**
 * Chat action endpoint using Vercel AI SDK with Auth0 AI interruptions
 *
 * This route handles chat messages using createUIMessageStream pattern:
 * 1. Receives messages array from useChat hook
 * 2. Uses withInterruptions for multi-step tool execution
 * 3. Streams AI response with tools using streamText()
 * 4. Returns createUIMessageStreamResponse for client consumption
 */

import {
  streamText,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { withInterruptions, errorSerializer } from "@auth0/ai-vercel/interrupts";
import {
  setRequestAIContext,
  clearRequestAIContext,
  type AIContext,
} from "~/.server/ai/context";
import { getAuth0 } from "@auth0/auth0-react-router";
import type { Route } from "./+types/api.chat";
import { getAIModel, getSystemPrompt } from "~/.server/ai/client";
import { createAllTools } from "~/.server/tools";

export async function action({ request, context }: Route.ActionArgs) {
  const { user, isAuthenticated } = getAuth0(context);

  if (!isAuthenticated || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Get messages and chat ID from request (standard useChat format)
  const body = await request.json() as { id?: string; messages?: unknown };
  const { id, messages } = body;

  if (!messages || !Array.isArray(messages)) {
    return new Response("Invalid request: messages array required", {
      status: 400,
    });
  }

  // Set AI context for withInterruptions to track conversation (Cloudflare-compatible)
  const aiContext: AIContext | undefined = id ? { threadID: id } : undefined;
  if (aiContext) {
    setRequestAIContext(aiContext);
  }

  // Create AI model
  const model = getAIModel(context);

  // Load tools with AI context for future Auth0 AI features
  const tools = createAllTools(context, aiContext);

  // Convert messages for AI model
  const modelMessages = await convertToModelMessages(messages);

  try {
    // Create UI message stream with withInterruptions for multi-step tool execution
    const stream = createUIMessageStream({
      originalMessages: messages as UIMessage[],
      execute: withInterruptions(
        async ({ writer }) => {
          const result = streamText({
            model,
            system: getSystemPrompt(),
            messages: modelMessages,
            tools,
            // Messages are kept in client state only - no server persistence
          });

          // Merge streamText result into UI message stream
          writer.merge(result.toUIMessageStream({ sendReasoning: true }));
        },
        { messages: messages as UIMessage[], tools }
      ),
      onError: errorSerializer((err) => {
        console.error("Stream error:", err);
        return `An error occurred: ${(err as Error).message}`;
      }),
    });

    // Return UI message stream response
    return createUIMessageStreamResponse({ stream });
  } finally {
    // Clean up AI context after request
    clearRequestAIContext();
  }
}
