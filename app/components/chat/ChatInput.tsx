import { useState } from "react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export interface ChatInputProps {
  conversationId: string;
  onSubmit?: () => void;
  isSubmitting?: boolean;
}

export function ChatInput({
  conversationId,
  onSubmit,
  isSubmitting = false,
}: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    if (isSubmitting || !message.trim()) {
      e.preventDefault();
      return;
    }

    // Clear the input immediately for better UX
    setMessage("");

    // Call the optional onSubmit callback
    onSubmit?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form && !isSubmitting && message.trim()) {
        form.requestSubmit();
      }
    }
  };

  return (
    <form
      method="post"
      onSubmit={handleSubmit}
      className="border-t bg-background p-4"
    >
      <input type="hidden" name="conversationId" value={conversationId} />
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <textarea
            name="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
            disabled={isSubmitting}
            rows={1}
            className={cn(
              "w-full resize-none rounded-md border border-input bg-background px-3 py-2",
              "text-sm placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "min-h-10 max-h-50"
            )}
            style={{
              height: "auto",
              overflowY: message.split("\n").length > 3 ? "auto" : "hidden",
            }}
          />
        </div>
        <Button
          type="submit"
          disabled={isSubmitting || !message.trim()}
          size="default"
        >
          {isSubmitting ? "Sending..." : "Send"}
        </Button>
      </div>
    </form>
  );
}
