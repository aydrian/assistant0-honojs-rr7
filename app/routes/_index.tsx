import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useInterruptions } from "@auth0/ai-vercel/react";
import { getAuth0 } from "@auth0/auth0-react-router";
import type { Route } from "./+types/_index";
import { Button } from "~/components/ui/button";
import { ChatWindow } from "~/components/chat/ChatWindow";
import { ChatInput } from "~/components/chat/ChatInput";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Assistant0 - AI Chat" },
    { name: "description", content: "Chat with your AI assistant" },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  const { user, isAuthenticated } = getAuth0(context);
  return { user, isAuthenticated };
}

export default function ChatPage({ loaderData }: Route.ComponentProps) {
  const { isAuthenticated } = loaderData;
  const [input, setInput] = useState("");

  // Use the AI SDK v6 chat hook with HTTP transport
  // Wrapped with useInterruptions for Auth0 AI authorization flows
  // sendAutomaticallyWhen enables client-side multi-step tool calling
  const { messages, sendMessage, status, toolInterrupt: _toolInterrupt } = useInterruptions(
    (handler) =>
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useChat({
        transport: new DefaultChatTransport({
          api: "/api/chat",
        }),
        onError: handler((error: Error) => console.error("Chat error:", error)),
        sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
      })
  );

  const handleSubmit = () => {
    if (!input.trim()) return;

    // Send message using AI SDK v6 API
    sendMessage({ text: input });
    setInput(""); // Clear input after sending
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const isLoading = status === "streaming" || status === "submitted";

  if (!isAuthenticated) {
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
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-hidden">
        <ChatWindow messages={messages} isLoading={isLoading} />
      </div>

      <div className="border-t p-4">
        <ChatInput
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
