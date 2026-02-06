# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development

```bash
bun dev              # Start development server with HMR on http://localhost:5173
bun preview          # Preview production build locally
bun typecheck        # Generate types and run TypeScript type checking
```

### Production

```bash
bun build            # Build production bundle
bun run build && wrangler deploy  # Build and deploy to Cloudflare Workers
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
const app = new Hono<{ Bindings: Env }>();

app.get("*", (c) => {
  const requestHandler = createRequestHandler(
    () => import("virtual:react-router/server-build"),
    import.meta.env.MODE
  );

  return requestHandler(c.req.raw, {
    cloudflare: { env: c.env, ctx: c.executionCtx },
  });
});
```

The Hono server catches all routes (`app.get("*", ...)`) and delegates them to React Router's request handler. React Router handles routing, data loading, and server-side rendering.

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

### AppLoadContext Extension

The Hono server extends React Router's `AppLoadContext` to include Cloudflare bindings:

```typescript
declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env; // Environment variables and bindings
      ctx: ExecutionContext; // Cloudflare execution context
    };
  }
}
```

This allows route loaders to access Cloudflare resources (env vars, KV, D1, R2, etc.) without a separate API layer.

## Data Loading Pattern

Access Cloudflare context in any React Router loader:

```typescript
import type { LoaderFunctionArgs } from "react-router";

export async function loader({ context }: LoaderFunctionArgs) {
  // Access environment variables
  const value = context.cloudflare.env.VALUE_FROM_CLOUDFLARE;

  // Access Cloudflare bindings (when configured)
  // const db = context.cloudflare.env.DB;        // D1 database
  // const kv = context.cloudflare.env.KV;        // KV namespace
  // const bucket = context.cloudflare.env.BUCKET; // R2 bucket

  return { value };
}
```

All Cloudflare resources are accessed through `context.cloudflare.env` - there's no need for a separate API layer or backend routes.

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
├── components/         # React components
│   └── ui/             # shadcn/ui components (auto-generated)
├── lib/                # Utility functions
│   └── utils.ts        # cn() utility for className merging
├── routes/             # Route components (file-based routing)
├── routes.ts           # Route configuration
├── root.tsx            # Root layout with error boundary
├── entry.server.tsx    # Server-side rendering entry point
└── app.css             # Global styles with shadcn/ui theme variables

/workers                # Cloudflare Workers backend
└── app.ts              # Hono server with React Router integration

/public                 # Static assets
/.react-router          # Generated types (auto-generated)
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

## References

- [React Router v7 Documentation](https://reactrouter.com)
- [Hono Documentation](https://hono.dev)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [TailwindCSS Documentation](https://tailwindcss.com)
- [shadcn/ui Documentation](https://ui.shadcn.com)
