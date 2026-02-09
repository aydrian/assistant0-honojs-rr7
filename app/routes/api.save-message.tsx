import { getAuth0 } from "@auth0/auth0-react-router";
import type { Route } from "./+types/api.save-message";
import { getDb } from "~/.server/db/client";
import { createMessage } from "~/.server/db/messages";

export async function action({ request, context }: Route.ActionArgs) {
  const { user } = getAuth0(context);

  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const body = (await request.json()) as {
    conversationId?: string;
    role?: "user" | "assistant" | "system";
    content?: string;
  };
  const { conversationId, role, content } = body;

  if (!conversationId || !role || !content) {
    throw new Response("Bad Request: Missing required fields", {
      status: 400,
    });
  }

  const db = getDb(context);

  await createMessage(db, {
    id: crypto.randomUUID(),
    conversation_id: conversationId,
    role,
    content,
  });

  return new Response(null, { status: 204 });
}
