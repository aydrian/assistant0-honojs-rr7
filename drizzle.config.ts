import type { Config } from "drizzle-kit";

export default {
  out: "./migrations",
  schema: "./app/.server/db/schema/**.sql.ts",
  dialect: "sqlite",
  driver: "d1-http",
} satisfies Config;
