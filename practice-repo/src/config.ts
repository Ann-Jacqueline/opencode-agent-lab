import path from "node:path";

const port = Number(process.env.PORT ?? 3000);

export const config = {
  port,
  databaseUrl: process.env.DATABASE_URL ?? path.join(process.cwd(), "data", "habits.db"),
  sessionSecret: process.env.SESSION_SECRET ?? "dev-secret-do-not-use-in-production"
};

if (config.sessionSecret === "dev-secret-do-not-use-in-production") {
  console.warn("[config] Using the development SESSION_SECRET. Set a real secret before deploying.");
}
