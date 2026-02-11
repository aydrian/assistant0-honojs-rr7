/**
 * Message bubble component for AI SDK v6 UIMessage
 *
 * Displays messages with text content
 * Note: Tool invocations execute server-side but are not rendered in UI yet
 */

import type { UIMessage } from "ai";
import { cn } from "~/lib/utils";
import { Markdown } from "~/lib/markdown";

export interface MessageBubbleProps {
  message: UIMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  // Don't render system messages in the UI
  if (isSystem) {
    return null;
  }

  // Extract text content from parts
  const textParts = message.parts.filter((part) => part.type === "text");
  const content = textParts.map((part) => part.text).join("");

  // Skip empty messages
  if (!content) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex w-full mb-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-3",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {isUser ? (
          <div className="text-sm whitespace-pre-wrap">{content}</div>
        ) : (
          <Markdown content={content} className="text-sm" />
        )}
      </div>
    </div>
  );
}
