# Reference Application: ts-vercel-ai

This document describes the `ts-vercel-ai` reference application, a production-ready AI assistant that serves as an implementation guide for this project.

**Location**: `/Users/aydrian.howard/Developer/okta/auth0-assistant0/ts-vercel-ai`

## Overview

The reference application is a full-stack AI assistant built with:

| Technology | Purpose |
|------------|---------|
| Next.js 15 | Framework (App Router) |
| React 19 | Frontend |
| Vercel AI SDK | LLM integration & streaming |
| Auth0 | Authentication |
| Auth0 AI SDK | Token Vault for third-party OAuth |
| PostgreSQL + Drizzle ORM | Database |
| pgvector | Vector embeddings for RAG |
| Auth0 FGA | Fine-grained authorization |
| shadcn/ui (New York) | UI components |
| Tailwind CSS v4 | Styling |

## Directory Structure

```
/src
├── /app                    # Next.js app directory
│   ├── /api/chat          # Chat API endpoint
│   ├── /documents         # Document management page
│   ├── /profile           # User profile page
│   └── page.tsx           # Home/chat page
├── /components
│   ├── /auth0             # Auth0-specific components
│   ├── /auth0-ai          # TokenVault & consent popups
│   ├── /ui                # shadcn/ui components
│   ├── chat-window.tsx    # Main chat interface
│   └── chat-message-bubble.tsx  # Message display with tool calls
├── /lib
│   ├── /db                # Database client & schema (Drizzle)
│   ├── /rag               # RAG & embedding logic
│   ├── /tools             # AI tool definitions
│   ├── /fga               # Fine-grained authorization
│   ├── auth0.ts           # Auth0 client setup
│   └── auth0-ai.ts        # Token Vault connections
└── middleware.ts          # Auth0 route protection
```

## AI/LLM Integration Patterns

### Chat Endpoint Structure

The chat endpoint (`app/api/chat/route.ts`) follows this pattern:

```typescript
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

export async function POST(req: Request) {
  const { id, messages } = await req.json();

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: "You are a helpful assistant...",
    messages,
    tools: {
      // Tool definitions here
    },
  });

  return result.toDataStreamResponse();
}
```

### Tool Definition Pattern

Tools are defined using Zod schemas and wrapped with Auth0 connection handlers:

```typescript
import { tool } from "ai";
import { z } from "zod";

export const myTool = withConnection(
  tool({
    description: "What the tool does",
    parameters: z.object({
      query: z.string().describe("Search query"),
    }),
    execute: async ({ query }) => {
      // Implementation using credentials from withConnection
      return { result: "..." };
    },
  }),
);
```

### Streaming Response with Tool Calls

The frontend uses `useChat` hook with tool call visibility:

```typescript
import { useChat } from "@ai-sdk/react";

const { messages, input, handleSubmit } = useChat({
  api: "/api/chat",
  // Tool calls appear as message parts with status
});
```

## Auth0 AI Token Vault

The Token Vault manages OAuth tokens for third-party services without storing them in your database.

### Connection Wrappers

Each service integration uses a `withXXX` wrapper pattern:

```typescript
// lib/auth0-ai.ts
import { TokenVault } from "@auth0/ai";

const tokenVault = new TokenVault({
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
});

// Create connection wrappers for each service
export const withGmailRead = tokenVault.withConnection({
  connection: "google-oauth2",
  scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
});

export const withGitHubConnection = tokenVault.withConnection({
  connection: "github",
  scopes: ["repo", "read:user"],
});

export const withSlack = tokenVault.withConnection({
  connection: "slack",
  scopes: ["channels:read", "chat:write"],
});
```

### Interrupt-Driven Consent Flow

When a tool needs authorization, an interrupt is triggered:

```typescript
// In chat API
import { withInterruptions } from "@auth0/ai-vercel";

const result = withInterruptions(
  streamText({
    model: openai("gpt-4o-mini"),
    messages,
    tools: {
      gmail: withGmailRead(gmailTool),
      github: withGitHubConnection(githubTool),
    },
  }),
);
```

Frontend handles interrupts with consent popup:

```typescript
// In chat component
import { useInterruptions } from "@auth0/ai-vercel/react";
import { TokenVaultConsentPopup } from "@/components/auth0-ai";

const { interrupt, clearInterrupt } = useInterruptions();

return (
  <>
    <ChatWindow />
    {interrupt && (
      <TokenVaultConsentPopup
        interrupt={interrupt}
        onApprove={() => clearInterrupt()}
      />
    )}
  </>
);
```

## RAG & Embeddings

### Embedding Generation

```typescript
// lib/rag/embedding.ts
import { openai } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";

export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value: text,
  });
  return embedding;
}

export async function generateEmbeddings(text: string): Promise<number[][]> {
  // Chunk text first, then embed
  const chunks = chunkText(text);
  const { embeddings } = await embedMany({
    model: openai.embedding("text-embedding-3-small"),
    values: chunks,
  });
  return embeddings;
}
```

### Vector Search with pgvector

```typescript
// lib/rag/search.ts
import { cosineDistance, desc, gt, sql } from "drizzle-orm";

export async function findRelevantContent(
  query: string,
  limit: number = 5,
): Promise<SearchResult[]> {
  const queryEmbedding = await generateEmbedding(query);

  const results = await db
    .select({
      content: embeddings.content,
      similarity: sql<number>`1 - (${cosineDistance(embeddings.embedding, queryEmbedding)})`,
    })
    .from(embeddings)
    .where(gt(sql`1 - (${cosineDistance(embeddings.embedding, queryEmbedding)})`, 0.5))
    .orderBy(desc(sql`1 - (${cosineDistance(embeddings.embedding, queryEmbedding)})`))
    .limit(limit);

  return results;
}
```

### RAG Tool with FGA Filtering

```typescript
// lib/tools/context.ts
export const getContextDocumentsTool = tool({
  description: "Search user documents for relevant context",
  parameters: z.object({
    query: z.string(),
  }),
  execute: async ({ query }, { user }) => {
    // Get relevant documents
    const documents = await findRelevantContent(query);

    // Filter by FGA permissions
    const filtered = await FGAFilter.filter(documents, {
      user: `user:${user.email}`,
      relation: "can_view",
      buildObject: (doc) => `doc:${doc.id}`,
    });

    return filtered;
  },
});
```

## Fine-Grained Authorization (FGA)

### Relation Format

FGA uses a consistent format for authorization checks:

| Type | Format | Example |
|------|--------|---------|
| User | `user:{email}` | `user:john@example.com` |
| Object | `doc:{id}` | `doc:abc123` |
| Relation | Standard names | `owner`, `can_view`, `can_edit` |

### Managing Relations

```typescript
// lib/fga/fga.ts
import { OpenFgaClient } from "@openfga/sdk";

const fga = new OpenFgaClient({
  apiUrl: process.env.FGA_API_URL,
  storeId: process.env.FGA_STORE_ID,
  credentials: {
    method: "client_credentials",
    config: {
      clientId: process.env.FGA_CLIENT_ID,
      clientSecret: process.env.FGA_CLIENT_SECRET,
      apiAudience: process.env.FGA_API_AUDIENCE,
    },
  },
});

// Grant access
export async function addRelation(
  userEmail: string,
  documentId: string,
  relation: string,
) {
  await fga.write({
    writes: [
      {
        user: `user:${userEmail}`,
        relation,
        object: `doc:${documentId}`,
      },
    ],
  });
}

// Revoke access
export async function deleteRelation(
  userEmail: string,
  documentId: string,
  relation: string,
) {
  await fga.write({
    deletes: [
      {
        user: `user:${userEmail}`,
        relation,
        object: `doc:${documentId}`,
      },
    ],
  });
}

// Check access
export async function checkAccess(
  userEmail: string,
  documentId: string,
  relation: string,
): Promise<boolean> {
  const { allowed } = await fga.check({
    user: `user:${userEmail}`,
    relation,
    object: `doc:${documentId}`,
  });
  return allowed ?? false;
}
```

### Document Upload with FGA

```typescript
// When uploading a document
async function uploadDocument(file: File, user: User) {
  // 1. Parse and store document
  const doc = await db.insert(documents).values({
    fileName: file.name,
    content: await file.arrayBuffer(),
    userId: user.id,
    userEmail: user.email,
  }).returning();

  // 2. Generate and store embeddings
  const text = await parseDocument(file);
  const embeddings = await generateEmbeddings(text);
  await storeEmbeddings(doc.id, embeddings);

  // 3. Set up FGA relations
  await addRelation(user.email, doc.id, "owner");
}
```

## Key Files to Reference

| File | Purpose |
|------|---------|
| `src/app/api/chat/route.ts` | Chat endpoint with streaming and tools |
| `src/lib/auth0-ai.ts` | Token Vault connection wrappers |
| `src/lib/tools/*.ts` | Individual tool definitions |
| `src/lib/rag/embedding.ts` | Embedding generation utilities |
| `src/lib/fga/fga.ts` | FGA client and helper functions |
| `src/lib/db/schema/*.ts` | Drizzle ORM schema definitions |
| `src/components/chat-window.tsx` | Chat UI with streaming support |
| `src/components/chat-message-bubble.tsx` | Message display with tool calls |
| `src/components/auth0-ai/*.tsx` | Token Vault consent components |

## Environment Variables

```bash
# OpenAI
OPENAI_API_KEY=

# Auth0
AUTH0_SECRET=          # openssl rand -hex 32
AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
APP_BASE_URL=

# Database
DATABASE_URL=postgresql://...

# Auth0 FGA
FGA_STORE_ID=
FGA_CLIENT_ID=
FGA_CLIENT_SECRET=
FGA_API_URL=
FGA_API_AUDIENCE=
```

## Adapting Patterns for This Project

When adapting these patterns for the Hono/React Router/Turso stack:

1. **Streaming**: Use Hono's streaming response helpers instead of Next.js patterns
2. **Database**: Replace Drizzle/PostgreSQL queries with Turso/libSQL equivalents
3. **Context**: Access environment via `context.get(cloudflareContext)` pattern
4. **Vector Search**: Consider Turso's vector extension or external service (no pgvector)
5. **API Routes**: Use React Router resource routes or Hono routes instead of Next.js API routes
