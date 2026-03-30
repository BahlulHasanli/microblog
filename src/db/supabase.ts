import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_KEY;

const SUPABASE_URL = "https://upegfchzvcnmoxfwamod.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwZWdmY2h6dmNubW94ZndhbW9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzODMxNzAsImV4cCI6MjA2OTk1OTE3MH0.SJKn6b9823OIpJbmaIe4lP45WO1zwM6ZMxnSmFahYms";

export type SupabaseRuntimeEnv = Record<string, string | undefined>;

/**
 * Cloudflare Pages/Workers-da gizli dəyişənlər çox vaxt yalnız `locals.runtime.env`-də olur;
 * build zamanı `import.meta.env`-də boş qala bilər.
 */
export function resolveSupabaseServiceRoleKey(runtimeEnv?: SupabaseRuntimeEnv): string | undefined {
  const k =
    runtimeEnv?.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    (typeof process !== "undefined" ? process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() : undefined);
  return k || undefined;
}

const supabaseServiceKey = resolveSupabaseServiceRoleKey();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** Sorğu zamanı (məs. API route) — əvvəlcə runtime env */
export function getSupabaseAdmin(runtimeEnv?: SupabaseRuntimeEnv): SupabaseClient {
  const key = resolveSupabaseServiceRoleKey(runtimeEnv);
  if (key) {
    return createClient(SUPABASE_URL, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabase;
}

/** Admin / server-only əməliyyatlar üçün service role (build/lokal env; CF-də API üçün `getSupabaseAdmin` üstünlüklü) */
export const hasSupabaseServiceRole = Boolean(supabaseServiceKey);

if (!supabaseServiceKey) {
  console.warn(
    "⚠️ SUPABASE_SERVICE_ROLE_KEY tapılmadı! Bəzi admin əməliyyatları işləməyə bilər. .env faylında SUPABASE_SERVICE_ROLE_KEY əlavə edin.",
  );
}

export const supabaseAdmin = supabaseServiceKey
  ? createClient(SUPABASE_URL, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : supabase;
