import type { NextFunction, Request, Response } from "express";

export interface AuthedRequest extends Request {
  userId?: string;
}

/**
 * Development-only authentication.
 *
 * The client sends `x-user-id`; the middleware trusts it. There is no token
 * verification, session lookup, or user existence check here. This is the
 * biggest known gap in the codebase and should be replaced before production.
 */
export function requireUser(req: Request, res: Response, next: NextFunction): void {
  const userId = req.header("x-user-id");

  if (!userId) {
    res.status(401).json({
      error: "missing_user",
      message: "Send x-user-id in development."
    });
    return;
  }

  (req as AuthedRequest).userId = userId;
  next();
}

export function getUserId(req: Request): string {
  const userId = (req as AuthedRequest).userId;
  if (!userId) {
    throw new Error("getUserId called without requireUser middleware.");
  }
  return userId;
}
