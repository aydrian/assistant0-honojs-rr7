import { getAuth0 } from "@auth0/auth0-react-router";
import type { Route } from "./+types/_index";
import { Button } from "~/components/ui/button";

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
    return { user: null, requiresAuth: true };
  }

  // TODO Stage 3: Load conversation history from database
  return { user, requiresAuth: false };
}

export default function ChatPage({ loaderData }: Route.ComponentProps) {
  const { user, requiresAuth } = loaderData;

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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Chat</h1>
      <p className="text-muted-foreground">
        Welcome, {user?.name || user?.email}!
      </p>
      <p className="text-sm text-muted-foreground mt-2">
        Chat UI will be implemented in Stage 3
      </p>
    </div>
  );
}
