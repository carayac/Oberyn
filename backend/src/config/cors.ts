import cors from "cors";
import { env } from "./env.js";

export const corsMiddleware = cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  allowedHeaders: ["Authorization", "Content-Type", "x-organization-id"],
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
});
