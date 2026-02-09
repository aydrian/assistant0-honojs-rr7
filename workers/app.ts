import { Hono } from "hono";
import {
  createRequestHandler,
  createContext,
  RouterContextProvider,
} from "react-router";

// Create contexts for Cloudflare bindings
// With v8_middleware enabled, use context.get(cloudflareContext) to access these values
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

export default app;
