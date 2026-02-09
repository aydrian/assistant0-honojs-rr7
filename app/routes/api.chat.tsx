import { streamText } from "ai";
import { getAuth0 } from "@auth0/auth0-react-router";
import type { Route } from "./+types/api.chat";
import { getDb } from "~/.server/db/client";
import { createMessage } from "~/.server/db/messages";
import { getAIModel, ASSISTANT_SYSTEM_PROMPT } from "~/.server/ai/client";

export async function action({ request, context }: Route.ActionArgs) {
  const { user } = getAuth0(context);

  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const body = (await request.json()) as {
    messages?: Array<{ role: string; content: string }>;
    conversationId?: string;
  };
  const { messages, conversationId } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new Response("Bad Request: Missing or empty messages array", {
      status: 400,
    });
  }

  if (!conversationId) {
    throw new Response("Bad Request: Missing conversationId", {
      status: 400,
    });
  }

  const db = getDb(context);

  // Save the new user message (last message in the array) to database
  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role === "user") {
    await createMessage(db, {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      role: "user",
      content: lastMessage.content,
    });
  }

  // Use the messages from the request (which includes the new user message)
  const aiMessages = messages.map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
  }));

  // Stream response from OpenAI
  const model = getAIModel(context);

  const result = streamText({
    model,
    messages: aiMessages,
    system: ASSISTANT_SYSTEM_PROMPT,
    async onFinish({ text }) {
      // Save assistant response after streaming completes
      await createMessage(db, {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        role: "assistant",
        content: text,
      });
    },
  });

  // This is OK here because it's not a form action - it's a dedicated API route
  return result.toTextStreamResponse();
}
