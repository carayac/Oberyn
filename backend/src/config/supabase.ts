import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

const supabaseUrl = env.SUPABASE_URL || "http://localhost:54321";
const supabaseAnonKey = env.SUPABASE_ANON_KEY || "supabase-anon-key-placeholder";
const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || "supabase-service-role-key-placeholder";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
