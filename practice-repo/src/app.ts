import express, { type NextFunction, type Request, type Response } from "express";
import { authRouter } from "./routes/auth.js";
import { habitsRouter } from "./routes/habits.js";

export function createApp() {
  const app = express();

  app.use(express.json({ limit: "32kb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, uptime: process.uptime() });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/habits", habitsRouter);

  app.use((req, res) => {
    res.status(404).json({ error: "not_found", path: req.path });
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[api] unhandled error", error);
    res.status(500).json({ error: "internal_error" });
  });

  return app;
}
