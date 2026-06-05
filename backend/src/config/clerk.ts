import { clerkMiddleware } from "@clerk/express";
import { env } from "./env.js";

export const clerkRequestMiddleware = clerkMiddleware({
  secretKey: env.CLERK_SECRET_KEY,
});
