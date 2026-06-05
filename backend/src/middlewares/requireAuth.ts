import { verifyToken } from "@clerk/backend";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

function getBearerToken(req: Request) {
  const header = req.header("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getBearerToken(req);
  if (!token || !env.CLERK_SECRET_KEY) {
    return res.status(401).json({ success: false, error: { message: "Authentication required" } });
  }

  try {
    const payload = await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
      clockSkewInMs: 60_000,
    });

    if (!payload.sub) {
      return res.status(401).json({ success: false, error: { message: "Authentication required" } });
    }

    res.locals.userId = payload.sub;
    return next();
  } catch {
    return res.status(401).json({ success: false, error: { message: "Sesión inválida. Cerrá sesión e iniciá de nuevo." } });
  }
}
