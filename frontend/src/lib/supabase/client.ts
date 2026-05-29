import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn("Missing Supabase public environment variables. Supabase client will not be available.");
}

export const supabase = createClient(supabaseUrl ?? "http://localhost:54321", supabasePublishableKey ?? "supabase-publishable-key-placeholder", {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export function createSupabaseClientWithToken(token: string | null | undefined) {
  return createClient(supabaseUrl ?? "http://localhost:54321", supabasePublishableKey ?? "supabase-publishable-key-placeholder", {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : undefined,
  });
}
