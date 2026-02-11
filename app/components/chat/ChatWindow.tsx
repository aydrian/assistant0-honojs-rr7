/**
 * Chat window component for AI SDK v6
 *
 * Features:
 * - Displays messages from useChat hook
 * - Handles streaming state
 * - Shows tool invocations
 */

import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";
import { MessageBubble } from "./MessageBubble";

export interface ChatWindowProps {
  messages: UIMessage[];
  isLoading: boolean;
}

export function ChatWindow({ messages, isLoading }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="container max-w-4xl mx-auto px-4 py-6">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="text-4xl">💬</div>
            <h2 className="text-2xl font-semibold">Start a conversation</h2>
            <p className="text-muted-foreground max-w-md">
              Ask me anything! I can help with questions, writing, problem
              solving, and more.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {/* Show typing indicator when loading */}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="bg-muted text-muted-foreground rounded-lg px-4 py-3">
                  <div className="flex gap-1">
                    <span className="animate-bounce">●</span>
                    <span
                      className="animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    >
                      ●
                    </span>
                    <span
                      className="animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    >
                      ●
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
    </div>
  );
}
