import { useState, type ReactNode } from "react";
import type { SearchResult } from "~/.server/tools";

interface ToolCallBadgeProps {
  toolName: string;
  args?: Record<string, unknown>;
  result?: unknown;
}

/**
 * Display tool call information with collapsible results
 */
export function ToolCallBadge({ toolName, args, result }: ToolCallBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get tool icon and display name
  const getToolInfo = (name: string): { icon: string; displayName: string } => {
    switch (name) {
      case "serpApiTool":
      case "web_search":
        return { icon: "🔍", displayName: "Web Search" };
      case "search_documents":
        return { icon: "📄", displayName: "Document Search" };
      case "list_emails":
        return { icon: "📧", displayName: "Gmail" };
      case "list_calendar":
        return { icon: "📅", displayName: "Calendar" };
      default:
        return { icon: "🔧", displayName: name };
    }
  };

  const { icon, displayName } = getToolInfo(toolName);

  // Format arguments for display
  const formatArgs = (): string => {
    if (!args || Object.keys(args).length === 0) {
      return "";
    }
    return Object.entries(args)
      .map(([key, value]) => `${key}: "${String(value)}"`)
      .join(", ");
  };

  // Render search results
  const renderSearchResults = (): ReactNode => {
    if (
      !result ||
      typeof result !== "object" ||
      !("results" in result) ||
      !Array.isArray((result as { results: unknown[] }).results)
    ) {
      return <div className="text-sm text-muted-foreground italic">Invalid search results</div>;
    }

    const searchResult = result as { results: SearchResult[]; query?: string };
    const results = searchResult.results;

    if (results.length === 0) {
      return (
        <div className="text-sm text-muted-foreground italic">
          No results found
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {results.slice(0, 5).map((item, index) => (
          <div key={index} className="border-l-2 border-muted pl-3">
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary hover:underline block"
            >
              {item.title}
            </a>
            <p className="text-xs text-muted-foreground mt-1">
              {item.snippet}
            </p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="mb-3 border rounded-lg bg-muted/50 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-muted/70 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="font-medium text-sm">{displayName}</span>
          <span className="text-xs text-muted-foreground">
            {formatArgs()}
          </span>
        </div>
        <span className="text-muted-foreground text-xs">
          {isExpanded ? "▲" : "▼"}
        </span>
      </button>

      {/* Expandable results */}
      {isExpanded && result ? (
        <>
          {(toolName === "serpApiTool" || toolName === "web_search") ? (
            <div className="px-4 py-3 border-t bg-background">
              {renderSearchResults()}
            </div>
          ) : (
            <div className="px-4 py-3 border-t bg-background">
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
