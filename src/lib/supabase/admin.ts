import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "@/lib/env";

/**
 * Service-role client for server-only work that has no signed-in user (provider webhooks, applying verified provider results).
 * The key is read from the server environment and never reaches the browser.
 */
export function createAdminClient() {
  const env = getSupabasePublicEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env || !key) throw new Error("Server payment configuration is incomplete");
  return createClient(env.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
