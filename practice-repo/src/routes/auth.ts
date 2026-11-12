import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";

export const authRouter = Router();

const devLoginSchema = z.object({
  email: z.string().email()
});

interface UserRow {
  id: string;
  email: string;
  createdAt: string;
}

/**
 * Development login. It returns a fake token so the frontend can complete
 * a flow, but the protected routes currently use x-user-id instead.
 */
authRouter.post("/dev-login", (req, res) => {
  const parsed = devLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
    return;
  }

  const email = parsed.data.email;
  let user = db
    .prepare("SELECT id, email, created_at AS createdAt FROM users WHERE email = ?")
    .get(email) as UserRow | undefined;

  if (!user) {
    const id = randomUUID();
    db.prepare("INSERT INTO users (id, email) VALUES (?, ?)").run(id, email);
    user = { id, email, createdAt: new Date().toISOString() };
  }

  res.json({
    userId: user.id,
    token: `dev-${user.id}`,
    note: "Development token only. Protected routes use x-user-id."
  });
});
