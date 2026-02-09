import { getAuth0 } from "@auth0/auth0-react-router";
import type { Route } from "./+types/_index";
import { Button } from "~/components/ui/button";
import { getDb } from "~/.server/db/client";
import {
  createConversation,
  listConversationsByUser,
} from "~/.server/db/conversations";
import { listMessagesByConversation } from "~/.server/db/messages";
import { getUserByAuth0Id, createUser } from "~/.server/db/users";
import { ChatWindow } from "~/components/chat/ChatWindow";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Assistant0 - AI Chat" },
    { name: "description", content: "Chat with your AI assistant" },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  const { user, isAuthenticated } = getAuth0(context);

  // Allow unauthenticated access but show login prompt
  if (!isAuthenticated) {
    return { user: null, requiresAuth: true, conversationId: "", messages: [] };
  }

  const db = getDb(context);

  // Get or create database user (same pattern as profile route)
  let dbUser = await getUserByAuth0Id(db, user.sub);
  if (!dbUser) {
    dbUser = await createUser(db, {
      id: crypto.randomUUID(),
      auth0_id: user.sub,
      email: user.email!,
      name: user.name,
      picture: user.picture,
    });
  }

  // Get or create default conversation for user (using database user ID)
  let conversations = await listConversationsByUser(db, dbUser.id, 1);

  if (conversations.length === 0) {
    const newConv = await createConversation(db, {
      id: crypto.randomUUID(),
      user_id: dbUser.id,
      title: "New Chat",
    });
    conversations = [newConv];
  }

  // Load messages from most recent conversation
  const messages = await listMessagesByConversation(db, conversations[0].id);

  return {
    user,
    requiresAuth: false,
    conversationId: conversations[0].id,
    messages,
  };
}

export default function ChatPage({ loaderData }: Route.ComponentProps) {
  const { requiresAuth, conversationId, messages } = loaderData;

  if (requiresAuth) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Assistant0</h1>
        <p className="text-muted-foreground mb-8">
          Please log in to start chatting with your AI assistant
        </p>
        <Button asChild size="lg">
          <a href="/auth/login">Login with Auth0</a>
        </Button>
      </div>
    );
  }

  return (
    <ChatWindow conversationId={conversationId} initialMessages={messages} />
  );
}
