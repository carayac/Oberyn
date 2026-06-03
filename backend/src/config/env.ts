import "dotenv/config";

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 4000),
  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:5173",
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ?? "",
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  SUPABASE_URL: process.env.SUPABASE_URL ?? "",
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  STELLAR_NETWORK: process.env.STELLAR_NETWORK ?? "testnet",
  STELLAR_HORIZON_URL: process.env.STELLAR_HORIZON_URL ?? "https://horizon-testnet.stellar.org",
  STELLAR_SOURCE_PUBLIC_KEY: process.env.STELLAR_SOURCE_PUBLIC_KEY ?? "",
  STELLAR_SOURCE_SECRET_KEY: process.env.STELLAR_SOURCE_SECRET_KEY ?? "",
  STELLAR_EXPLORER_BASE_URL: process.env.STELLAR_EXPLORER_BASE_URL ?? "https://stellar.expert/explorer/testnet/tx",
  STELLAR_ANCHOR_BATCH_SIZE: Number(process.env.STELLAR_ANCHOR_BATCH_SIZE ?? 20),
};
