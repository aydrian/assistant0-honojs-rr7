import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "./utils";

interface MarkdownProps {
  content: string;
  className?: string;
}

/**
 * Markdown renderer for chat messages
 * Uses react-markdown with GitHub Flavored Markdown support
 */
export function Markdown({ content, className }: MarkdownProps) {
  return (
    <div className={cn("prose prose-sm max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        // Style links
        a: ({ node, ...props }) => (
          <a
            {...props}
            className="text-primary underline hover:no-underline"
            target="_blank"
            rel="noopener noreferrer"
          />
        ),
        // Style code blocks
        code: ({ node, className, children, ...props }) => {
          const isInline = !className;
          return isInline ? (
            <code
              {...props}
              className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono"
            >
              {children}
            </code>
          ) : (
            <code
              {...props}
              className={cn(
                "block bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono",
                className,
              )}
            >
              {children}
            </code>
          );
        },
        // Style pre blocks
        pre: ({ node, ...props }) => (
          <pre
            {...props}
            className="bg-muted p-4 rounded-lg overflow-x-auto my-4"
          />
        ),
        // Style lists
        ul: ({ node, ...props }) => (
          <ul {...props} className="list-disc list-inside my-2 space-y-1" />
        ),
        ol: ({ node, ...props }) => (
          <ol
            {...props}
            className="list-decimal list-inside my-2 space-y-1"
          />
        ),
        // Style headings
        h1: ({ node, ...props }) => (
          <h1 {...props} className="text-xl font-bold my-3" />
        ),
        h2: ({ node, ...props }) => (
          <h2 {...props} className="text-lg font-bold my-2" />
        ),
        h3: ({ node, ...props }) => (
          <h3 {...props} className="text-base font-bold my-2" />
        ),
        // Style blockquotes
        blockquote: ({ node, ...props }) => (
          <blockquote
            {...props}
            className="border-l-4 border-muted-foreground/30 pl-4 italic my-2"
          />
        ),
        // Style paragraphs
        p: ({ node, ...props }) => <p {...props} className="my-2" />,
        // Style strong/bold text
        strong: ({ node, ...props }) => (
          <strong {...props} className="font-semibold" />
        ),
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
