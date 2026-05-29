import "dotenv/config";

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 4000),
  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:5173",
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ?? "",
  SUPABASE_URL: process.env.SUPABASE_URL ?? "",
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
};

