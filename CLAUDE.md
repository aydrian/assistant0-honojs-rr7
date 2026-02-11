# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

```bash
bun dev              # Start development server with HMR on http://localhost:3000
bun preview          # Preview production build locally
bun typecheck        # Generate types and run TypeScript type checking
```

### Production

```bash
bun build            # Build production bundle
bun run build && wrangler deploy  # Build and deploy to Cloudflare Workers
```

### Database (Drizzle)

```bash
bun db:generate      # Generate migrations from schema changes
bun db:migrate       # Run pending migrations
bun db:push          # Push schema directly (dev only, bypasses migrations)
bun db:studio        # Open Drizzle Studio for data browsing
```

### Testing

**Note**: No test framework is currently configured in this project.

### Code Quality

```bash
bun lint              # Check code with ESLint
bun lint:fix          # Auto-fix linting issues
bun format            # Format code with Prettier
bun format:check      # Check code formatting
```

**Linting & Formatting**:

- **ESLint 9+** with flat config for type-aware linting
- **TypeScript ESLint** with React 19 and React Hooks support
- **Prettier** for consistent code formatting integrated with ESLint
- **EditorConfig** for cross-editor consistency

**Configuration files**:

- [eslint.config.js](eslint.config.js) - ESLint rules and plugins
- [.prettierrc.json](.prettierrc.json) - Prettier formatting rules
- [.editorconfig](.editorconfig) - Editor settings
- [.vscode/settings.json](.vscode/settings.json) - Auto-format on save enabled

Auto-generated files (`.react-router/`, `.wrangler/`, `worker-configuration.d.ts`) are automatically excluded from linting and formatting.

## Architecture Overview

This is a **full-stack React Router v7 application** with a **Hono.js backend** running on **Cloudflare Workers**. The architecture uses a unified SSR pattern with no separate API layer.

### Key Architectural Pattern

**Hono as Request Handler** ([workers/app.ts](workers/app.ts)):

```typescript
import { RouterContextProvider, createContext } from "react-router";

export const cloudflareContext = createContext<{
  env: Env;
  ctx: ExecutionContext;
}>();

const app = new Hono<{ Bindings: Env }>();

app.all("*", (c) => {
  const requestHandler = createRequestHandler(
    () => import("virtual:react-router/server-build"),
    import.meta.env.MODE
  );

  const provider = new RouterContextProvider();
  provider.set(cloudflareContext, {
    env: c.env,
    ctx: c.executionCtx,
  });

  return requestHandler(c.req.raw, provider);
});
```

The Hono server catches all routes (`app.all("*", ...)`) and delegates them to React Router's request handler. React Router handles routing, data loading, and server-side rendering.

### Request Flow

```
Request → Cloudflare Worker
    ↓
Hono Server (workers/app.ts)
    ↓
React Router Request Handler
    ↓
Route Loader (with Cloudflare context)
    ↓
Server-Side Render Component
    ↓
entry.server.tsx (renderToReadableStream)
    ↓
HTML Response (streaming, with bot detection)
```

### Context Access with Middleware

With `v8_middleware: true` enabled (required for Auth0), React Router uses the `RouterContextProvider` pattern instead of plain `AppLoadContext` objects. This requires using `context.get()` to access Cloudflare bindings:

```typescript
// In workers/app.ts - create and export the context
export const cloudflareContext = createContext<{
  env: Env; // Environment variables and bindings
  ctx: ExecutionContext; // Cloudflare execution context
}>();

// Set values in the provider
const provider = new RouterContextProvider();
provider.set(cloudflareContext, {
  env: c.env,
  ctx: c.executionCtx,
});
```

**Important**: `AppLoadContext` type extensions do NOT work when middleware is enabled. You must use the `context.get(cloudflareContext)` pattern to access Cloudflare resources in route loaders and actions.

## Data Loading Pattern

Access Cloudflare context in any React Router loader using `context.get()`:

```typescript
import type { Route } from "./+types/my-route";
import { cloudflareContext } from "../../workers/app";

export async function loader({ context }: Route.LoaderArgs) {
  // Extract Cloudflare bindings using context.get()
  const cloudflare = context.get(cloudflareContext);

  // Access environment variables
  const value = cloudflare.env.VALUE_FROM_CLOUDFLARE;

  // Access Cloudflare bindings (when configured)
  // const db = cloudflare.env.DB;        // D1 database
  // const kv = cloudflare.env.KV;        // KV namespace
  // const bucket = cloudflare.env.BUCKET; // R2 bucket

  return { value };
}
```

**Important**: With middleware enabled, you must use `context.get(cloudflareContext)` to access Cloudflare resources. Direct property access like `context.cloudflare.env` does NOT work.

## Authentication (Auth0)

This application uses **Auth0** for authentication via the `@auth0/auth0-react-router` SDK (beta). Authentication is handled entirely server-side through React Router middleware.

### Configuration

Auth0 is configured via environment variables in `.dev.vars` (local development) or Cloudflare Workers secrets (production):

```bash
AUTH0_SECRET=<generate with: openssl rand -hex 32>
APP_BASE_URL=http://localhost:3000  # or production URL
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
```

The Auth0 middleware is registered globally in [app/root.tsx](app/root.tsx):

```typescript
import { auth0Middleware } from "@auth0/auth0-react-router";

export const middleware: Route.MiddlewareFunction[] = [
  auth0Middleware({
    authorizationParams: {
      scope: "openid profile email",
    },
    loginRedirect: "/",
    logoutRedirect: "/",
  }),
];
```

**Important**: The app requires `v8_middleware: true` flag in [react-router.config.ts](react-router.config.ts) for middleware support.

### Authentication Patterns

The SDK provides two patterns for handling authentication:

#### Pattern 1: Optional Authentication (Public Routes)

Use `getAuth0()` for routes that allow both authenticated and unauthenticated access:

```typescript
import { getAuth0 } from "@auth0/auth0-react-router";

export async function loader({ context }: Route.LoaderArgs) {
  const { user, isAuthenticated } = getAuth0(context);

  if (!isAuthenticated) {
    return { user: null, showLoginPrompt: true };
  }

  return { user };
}
```

**Example**: [app/routes/_index.tsx](app/routes/_index.tsx) (chat page)

#### Pattern 2: Protected Routes

Use `requireAuth` middleware for routes that require authentication:

```typescript
import { requireAuth, getUser } from "@auth0/auth0-react-router";

export const middleware = [requireAuth];

export async function loader({ context }: Route.LoaderArgs) {
  const user = getUser(context);  // Safe - middleware ensures user exists
  return { user };
}
```

The `requireAuth` middleware automatically:
- Redirects unauthenticated users to `/auth/login?returnTo=<current-route>`
- Preserves the intended destination URL
- Returns users to their original page after login

**Examples**: [app/routes/profile.tsx](app/routes/profile.tsx), [app/routes/documents.tsx](app/routes/documents.tsx)

### Auth Routes

Authentication routes are handled by [app/routes/auth.$.ts](app/routes/auth.$.ts):

```typescript
import { authSplatLoader } from "@auth0/auth0-react-router";

export const loader = authSplatLoader;
```

This splat route handles:
- `/auth/login` - Initiates OAuth flow
- `/auth/callback` - Processes Auth0 callback
- `/auth/logout` - Clears session and logs out

### Key Functions

| Function | Usage | Returns |
|----------|-------|---------|
| `getAuth0(context)` | Optional auth routes | `{ user?, isAuthenticated, session? }` - never throws |
| `getUser(context)` | Protected routes only (with `requireAuth`) | Authenticated user object - throws 401 if no user |
| `requireAuth` middleware | Route protection | Automatic redirect to login with `returnTo` |

### RouterContextProvider Pattern

Auth0 middleware requires React Router v7's new context provider pattern. The Hono server uses `RouterContextProvider` to pass Cloudflare bindings:

```typescript
import { RouterContextProvider, createContext } from "react-router";

export const cloudflareContext = createContext<{
  env: Env;
  ctx: ExecutionContext;
}>();

const provider = new RouterContextProvider();
provider.set(cloudflareContext, {
  env: c.env,
  ctx: c.executionCtx,
});

return requestHandler(c.req.raw, provider);
```

This pattern enables type-safe context sharing between middleware and route loaders.

### File-Based Routing

The app uses `react-router-auto-routes` for automatic file-based routing:

```typescript
// app/routes.ts
import { autoRoutes } from "react-router-auto-routes";

export default autoRoutes() satisfies RouteConfig;
```

Route naming conventions:
- `_index.tsx` → `/`
- `profile.tsx` → `/profile`
- `documents.tsx` → `/documents`
- `auth.$.ts` → `/auth/*` (splat route)

## Database Integration (D1 + Drizzle)

This application uses **Cloudflare D1** (SQLite) for database storage with **Drizzle ORM**, providing type-safe database access optimized for Cloudflare Workers.

### Configuration

D1 is configured in [wrangler.jsonc](wrangler.jsonc) with a database binding:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "assistant0-db",
      "database_id": "YOUR_DATABASE_ID_HERE"
    }
  ]
}
```

Create the D1 database:

```bash
bunx wrangler d1 create assistant0-db
# Copy the database_id to wrangler.jsonc
```

### Database Commands

```bash
bun db:generate    # Generate migrations from schema changes
bun db:migrate     # Run pending migrations
bun db:push        # Push schema directly (dev only)
bun db:studio      # Open Drizzle Studio for data browsing
```

### Database Client Helper

Database access is provided through a `getDb()` helper in [app/.server/db/client.ts](app/.server/db/client.ts):

```typescript
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import type { RouterContextProvider } from "react-router";
import { cloudflareContext } from "../../../workers/app";

export function getDb(context: Readonly<RouterContextProvider>) {
  const cloudflare = context.get(cloudflareContext);
  return drizzle(cloudflare.env.DB, { schema });
}

export type Database = ReturnType<typeof getDb>;
```

**Note**: The `.server` directory prefix indicates server-only code that's excluded from client bundles (React Router convention).

### Schema Definition (Drizzle)

Schemas are defined in `app/.server/db/schema/` using Drizzle's schema builder:

```typescript
// app/.server/db/schema/documents.sql.ts
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const documents = sqliteTable(
  "documents",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    file_type: text("file_type").notNull(),
    file_size: integer("file_size").notNull(),
    created_at: integer("created_at", { mode: "number" })
      .notNull()
      .default(sql`(unixepoch())`),
    updated_at: integer("updated_at", { mode: "number" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [index("idx_documents_user_id").on(table.user_id)]
);
```

Types are automatically inferred from schemas:

```typescript
// app/.server/db/schema/index.ts
export * from "./documents.sql";
import { documents } from "./documents.sql";

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
```

### Usage in Route Loaders

Access the database with type-safe queries:

```typescript
import { getDb } from "~/.server/db/client";
import { listDocumentsByUser } from "~/.server/db/documents";

export async function loader({ context }: Route.LoaderArgs) {
  const db = getDb(context);
  const documents = await listDocumentsByUser(db, user.sub);
  return { documents };
}
```

### Query Functions

Database queries are organized by entity in `app/.server/db/`:

- [documents.ts](app/.server/db/documents.ts) - Document CRUD operations

All query functions:
- Accept a `Database` instance as the first parameter
- Use Drizzle's type-safe query builder
- Return typed TypeScript interfaces inferred from schemas
- No manual Row-to-Object conversion needed (Drizzle handles this)

Example query function:

```typescript
import { eq, desc } from "drizzle-orm";
import { documents, type Document } from "./schema";
import type { Database } from "./client";

export async function listDocumentsByUser(
  db: Database,
  userId: string
): Promise<Document[]> {
  return db
    .select()
    .from(documents)
    .where(eq(documents.user_id, userId))
    .orderBy(desc(documents.created_at))
    .all();
}
```

### Drizzle Configuration

Drizzle Kit is configured in [drizzle.config.ts](drizzle.config.ts):

```typescript
import type { Config } from "drizzle-kit";

export default {
  out: "./migrations",
  schema: "./app/.server/db/schema/**.sql.ts",
  dialect: "sqlite",
  driver: "d1-http",
} satisfies Config;
```

### Why D1 + Drizzle?

- ✅ **Native Cloudflare integration**: No external network calls, lowest latency
- ✅ **Type-safe queries**: Full TypeScript inference from schema definitions
- ✅ **Zero runtime overhead**: Drizzle compiles to optimized SQL
- ✅ **Schema migrations**: Built-in migration generation and management
- ✅ **Edge-optimized**: Designed for Cloudflare Workers environment
- ✅ **Drizzle Studio**: Visual database browser for development

## Document Management & RAG

This application supports document uploads with semantic search using **Cloudflare Vectorize** for embeddings and **OpenAI** for embedding generation.

### Configuration

Vectorize is configured in [wrangler.jsonc](wrangler.jsonc):

```jsonc
{
  "vectorize": [
    {
      "binding": "VECTORIZE",
      "index_name": "assistant0-documents"
    }
  ]
}
```

Create the Vectorize index:

```bash
bunx wrangler vectorize create assistant0-documents --dimensions=1536 --metric=cosine
```

The `OPENAI_API_KEY` environment variable is required for embedding generation.

### Embeddings Generation

Embeddings are generated using OpenAI's `text-embedding-3-small` model via [app/.server/embeddings/client.ts](app/.server/embeddings/client.ts):

```typescript
import { embed } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

export async function generateEmbedding(
  text: string,
  env: Env
): Promise<number[]> {
  const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
  const { embedding } = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value: text,
  });
  return embedding;
}

// Truncate text to fit embedding model's context window
export function truncateForEmbedding(text: string, maxChars = 24000): string {
  return text.length <= maxChars ? text : text.slice(0, maxChars);
}
```

### Vectorize Operations

Vector storage and search is handled in [app/.server/embeddings/vectorize.ts](app/.server/embeddings/vectorize.ts):

```typescript
// Insert/update a vector
export async function insertVector(
  vectorize: VectorizeIndex,
  documentId: string,
  userId: string,
  embedding: number[],
  title?: string
): Promise<void>;

// Search for similar vectors (filtered by userId for multi-tenant isolation)
export async function searchVectors(
  vectorize: VectorizeIndex,
  queryEmbedding: number[],
  userId: string,
  topK?: number
): Promise<VectorSearchResult[]>;

// Delete vectors
export async function deleteVector(vectorize: VectorizeIndex, documentId: string): Promise<void>;
export async function deleteVectors(vectorize: VectorizeIndex, documentIds: string[]): Promise<void>;
```

### Document RAG Tool

The document search tool in [app/.server/tools/document-rag.ts](app/.server/tools/document-rag.ts) enables semantic search over user documents:

```typescript
import { tool } from "ai";
import { z } from "zod";

export function createDocumentSearchTool(context, aiContext?) {
  return tool({
    description: "Search your uploaded documents for relevant information",
    inputSchema: z.object({
      query: z.string().describe("Search query to find relevant documents"),
    }),
    execute: async ({ query }) => {
      // 1. Get authenticated user
      // 2. Generate query embedding
      // 3. Search Vectorize with user filter
      // 4. Fetch document content from D1
      // 5. Return results with similarity scores
    },
  });
}
```

**Search Flow**:
1. User asks a question about their documents
2. Claude calls the `searchDocuments` tool
3. Query text is converted to embedding vector
4. Vectorize returns top 3 most similar document IDs (filtered by user)
5. Document content is fetched from D1
6. Results returned to Claude with similarity scores

### Multi-Tenant Isolation

All vector operations filter by `userId` (Auth0 `sub`) to ensure users can only search their own documents. This is enforced at the Vectorize query level:

```typescript
const results = await vectorize.query(queryEmbedding, {
  topK,
  filter: { userId },  // Metadata filter for tenant isolation
  returnMetadata: "all",
});
```

## AI Chat Agent

This application uses **Vercel AI SDK v6** with **OpenAI** for the chat agent, integrated with **Auth0 AI** for multi-step tool execution and future Token Vault support.

### Configuration

AI/LLM credentials are configured via environment variables in `.dev.vars` (local) or Cloudflare Workers secrets (production):

```bash
OPENAI_API_KEY=your-openai-api-key
OPENAI_BASE_URL=optional-custom-base-url  # For Azure OpenAI or proxies
SERPAPI_API_KEY=your-serpapi-key          # Optional: enables web search tool
```

### AI Model Setup

The AI model is configured in [app/.server/ai/client.ts](app/.server/ai/client.ts):

```typescript
import { createOpenAI } from "@ai-sdk/openai";

export function getAIModel(context: Readonly<RouterContextProvider>) {
  const cloudflare = context.get(cloudflareContext);
  const openai = createOpenAI({
    apiKey: cloudflare.env.OPENAI_API_KEY,
    baseURL: cloudflare.env.OPENAI_BASE_URL || undefined,
  });
  return openai.chat("gpt-4o-mini");
}
```

### Chat API Endpoint

The chat endpoint at [app/routes/api.chat.ts](app/routes/api.chat.ts) uses the `createUIMessageStream` pattern for streaming responses with tool support:

```typescript
import { streamText, createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { withInterruptions } from "@auth0/ai-vercel/interrupts";

export async function action({ request, context }: Route.ActionArgs) {
  const { user } = getAuth0(context);
  const { messages } = await request.json();
  const model = getAIModel(context);
  const tools = createAllTools(context);

  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: withInterruptions(
      async ({ writer }) => {
        const result = streamText({
          model,
          system: getSystemPrompt(),
          messages,
          tools,
        });
        writer.merge(result.toUIMessageStream({ sendReasoning: true }));
      },
      { messages, tools }
    ),
  });

  return createUIMessageStreamResponse({ stream });
}
```

**Key patterns**:
- `withInterruptions` enables multi-step tool calling (tool results feed back to LLM)
- `createUIMessageStream` provides structured streaming for the `useChat` hook
- Messages are client-side only (not persisted to database)

### Tool Framework

Tools are defined in [app/.server/tools/](app/.server/tools/) using Vercel AI SDK's `tool()` helper with Zod schemas:

```typescript
// app/.server/tools/serpapi.ts
import { tool } from "ai";
import { z } from "zod";

export function createSerpApiTool(context: Readonly<RouterContextProvider>) {
  const cloudflare = context.get(cloudflareContext);
  const apiKey = cloudflare.env.SERPAPI_API_KEY;

  if (!apiKey) return null;  // Conditional loading

  return tool({
    description: "Search the web for current information",
    inputSchema: z.object({
      query: z.string().describe("The search query"),
      numResults: z.number().optional(),
    }),
    execute: async ({ query, numResults = 5 }) => {
      // Implementation
      return { query, results };
    },
  });
}
```

The tool registry in [app/.server/tools/index.ts](app/.server/tools/index.ts) conditionally loads tools based on available API keys:

```typescript
export function createAllTools(context, aiContext?) {
  const serpApiTool = createSerpApiTool(context, aiContext);
  return {
    ...(serpApiTool ? { serpApiTool } : {}),
    // Future tools added here
  };
}
```

### Client-Side Chat

The chat UI uses AI SDK v6's `useChat` hook with Auth0 AI interruptions:

```typescript
// app/routes/_index.tsx
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useInterruptions } from "@auth0/ai-vercel/react";

const { messages, sendMessage, status } = useInterruptions(
  (handler) =>
    useChat({
      transport: new DefaultChatTransport({ api: "/api/chat" }),
      onError: handler((error) => console.error(error)),
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    })
);
```

**Key components**:
- [ChatWindow.tsx](app/components/chat/ChatWindow.tsx) - Message list with auto-scroll
- [ChatInput.tsx](app/components/chat/ChatInput.tsx) - Input with Enter to send
- [MessageBubble.tsx](app/components/chat/MessageBubble.tsx) - Message rendering with Markdown
- [ToolCallBadge.tsx](app/components/chat/ToolCallBadge.tsx) - Collapsible tool call display

### AI Context (Cloudflare-Compatible)

Since Cloudflare Workers don't support `AsyncLocalStorage`, request-scoped AI context is managed via [app/.server/ai/context.ts](app/.server/ai/context.ts):

```typescript
export function setRequestAIContext(ctx: AIContext): void;
export function getRequestAIContext(): AIContext;
export function clearRequestAIContext(): void;
```

This is used for tracking `threadID` for future Auth0 AI Token Vault features.

## Key Configuration Files

- **[react-router.config.ts](react-router.config.ts)** - React Router SSR configuration (`ssr: true`, Vite environment API enabled)
- **[vite.config.ts](vite.config.ts)** - Build pipeline with plugins: cloudflare, reactRouter, tailwindcss, tsconfigPaths
- **[wrangler.jsonc](wrangler.jsonc)** - Cloudflare Workers configuration (name, compatibility date, bindings, environment variables)
- **[tsconfig.cloudflare.json](tsconfig.cloudflare.json)** - TypeScript config for app and workers code
- **[workers/app.ts](workers/app.ts)** - Hono server entry point that delegates to React Router
- **[app/entry.server.tsx](app/entry.server.tsx)** - SSR rendering logic with streaming and bot detection

## Directory Structure

```
/app                    # React application code
├── .server/            # Server-only code (excluded from client bundle)
│   ├── ai/             # AI/LLM integration
│   │   ├── client.ts   # OpenAI model configuration
│   │   ├── auth0-ai.ts # Auth0 AI SDK instance
│   │   └── context.ts  # Request-scoped AI context
│   ├── db/             # Database with Drizzle ORM
│   │   ├── client.ts   # D1 Drizzle client helper
│   │   ├── schema/     # Drizzle schema definitions
│   │   │   ├── index.ts       # Schema exports and types
│   │   │   └── documents.sql.ts  # Documents table schema
│   │   └── documents.ts  # Document query functions
│   ├── embeddings/     # Vector embedding utilities
│   │   ├── index.ts    # Exports for embedding functions
│   │   ├── client.ts   # OpenAI embedding generation
│   │   └── vectorize.ts  # Cloudflare Vectorize operations
│   └── tools/          # AI tool definitions
│       ├── index.ts    # Tool registry
│       ├── serpapi.ts  # Web search tool
│       ├── document-rag.ts  # Document search tool (RAG)
│       └── types.ts    # Tool type definitions
├── components/         # React components
│   ├── chat/           # Chat UI components
│   │   ├── ChatWindow.tsx
│   │   ├── ChatInput.tsx
│   │   ├── MessageBubble.tsx
│   │   └── ToolCallBadge.tsx
│   └── ui/             # shadcn/ui components (auto-generated)
├── lib/                # Utility functions
│   ├── utils.ts        # cn() utility for className merging
│   └── markdown.tsx    # Markdown renderer component
├── routes/             # Route components (file-based routing)
│   ├── _index.tsx      # Chat page (/)
│   ├── api.chat.ts     # Chat API endpoint
│   └── ...             # Other routes
├── routes.ts           # Route configuration
├── root.tsx            # Root layout with error boundary
├── entry.server.tsx    # Server-side rendering entry point
└── app.css             # Global styles with shadcn/ui theme variables

/workers                # Cloudflare Workers backend
└── app.ts              # Hono server with React Router integration

/migrations             # D1 database migrations (generated by Drizzle Kit)
└── 0001_initial.sql    # Initial schema migration

/docs                   # Documentation
└── reference-app-ts-vercel-ai.md  # Reference implementation guide

/public                 # Static assets
/.react-router          # Generated types (auto-generated)
/drizzle.config.ts      # Drizzle Kit configuration
/components.json        # shadcn/ui configuration
```

## UI Components (shadcn/ui)

This project uses **shadcn/ui** for UI components with the **New York** style. Components are built on top of Radix UI primitives and styled with Tailwind CSS v4.

### Configuration

- **Style**: New York (sharper design with minimal shadows)
- **Path Alias**: Components use `~/components/ui/*` (not `@/components/ui/*`)
- **Theme**: Configured via CSS variables in [app/app.css](app/app.css) using Tailwind v4's `@theme` directive
- **No Config File**: Pure CSS-first approach—no `tailwind.config.ts` needed
- **SSR Compatible**: All components work with React Router v7 server-side rendering

### Adding Components

Add new shadcn/ui components using the CLI:

```bash
bun x shadcn@latest add button      # Add a single component
bun x shadcn@latest add card input  # Add multiple components
```

Components are generated in `app/components/ui/` with the correct `~/` import paths.

### Using Components

Import and use components in your routes:

```typescript
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

export default function MyRoute() {
  return (
    <Card>
      <Button variant="default">Click me</Button>
      <Button variant="outline">Secondary</Button>
    </Card>
  );
}
```

### Utility Function

The `cn()` utility in [app/lib/utils.ts](app/lib/utils.ts) merges className strings using `clsx` and `tailwind-merge`:

```typescript
import { cn } from "~/lib/utils";

// Conditionally merge classes and resolve Tailwind conflicts
className={cn("base-class", condition && "conditional-class", props.className)}
```

### Theme Customization

Theme variables are defined in [app/app.css](app/app.css) using HSL color space:

```css
@theme {
  --radius: 0.5rem;  /* Border radius for components */
}

@layer base {
  :root {
    --primary: 222.2 47.4% 11.2%;
    --secondary: 210 40% 96.1%;
    /* ... other theme variables ... */
  }
}
```

Dark mode is automatically supported via `@media (prefers-color-scheme: dark)`.

### Available Components

View all available components at [ui.shadcn.com](https://ui.shadcn.com). Popular components include:

- Form inputs: Button, Input, Textarea, Select, Checkbox, Radio
- Layout: Card, Separator, Tabs, Dialog, Sheet
- Feedback: Toast, Alert, Badge, Progress
- Navigation: Dropdown Menu, Context Menu, Navigation Menu

## Important Notes

### Package Manager

This project uses **Bun** as its package manager (recently migrated from npm). Always use `bun` commands:

- `bun install` (not `npm install`)
- `bun dev` (not `npm run dev`)
- `bun build` (not `npm run build`)

### Server-Side Rendering

- SSR is enabled by default in [react-router.config.ts](react-router.config.ts)
- Bot detection via `isbot` package - bots wait for full content load, regular users get streaming responses
- Uses React's `renderToReadableStream` for efficient streaming SSR

### Virtual Module

The server build is imported via Vite's virtual module system:

```typescript
import("virtual:react-router/server-build");
```

This virtual module contains the SSR-optimized build artifacts.

### TypeScript Configuration

- Path alias `~/*` maps to `./app/*` for clean imports
- Strict mode enabled
- Types auto-generated in `.react-router/types/` directory

## Adding Cloudflare Bindings

To add Cloudflare resources (KV, D1, R2, etc.), configure them in [wrangler.jsonc](wrangler.jsonc):

```jsonc
{
  "kv_namespaces": [{ "binding": "KV", "id": "your-kv-id" }],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "your-db",
      "database_id": "your-db-id",
    },
  ],
  "r2_buckets": [{ "binding": "BUCKET", "bucket_name": "your-bucket" }],
}
```

Then access them in loaders via `context.cloudflare.env.KV`, `context.cloudflare.env.DB`, etc.

## Reference Application

The `ts-vercel-ai` application serves as a reference implementation for AI assistant patterns. It demonstrates production-ready implementations of Auth0 AI Token Vault, RAG with vector search, fine-grained authorization (FGA), and streaming chat with tool calls.

**Documentation**: [docs/reference-app-ts-vercel-ai.md](docs/reference-app-ts-vercel-ai.md)

**Source**: `/Users/aydrian.howard/Developer/okta/auth0-assistant0/ts-vercel-ai`

## References

- [React Router v7 Documentation](https://reactrouter.com)
- [Hono Documentation](https://hono.dev)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [TailwindCSS Documentation](https://tailwindcss.com)
- [shadcn/ui Documentation](https://ui.shadcn.com)
