import { Hono } from "hono";
import {
  createRequestHandler,
  createContext,
  RouterContextProvider,
} from "react-router";

// Create contexts for Cloudflare bindings
export const cloudflareContext = createContext<{
  env: Env;
  ctx: ExecutionContext;
}>();

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

const app = new Hono<{ Bindings: Env }>();

app.get("*", (c) => {
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

export default app;
