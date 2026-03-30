import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_KEY;
const supabaseServiceKey =
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY ||
  (typeof process !== "undefined"
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : undefined);

const SUPABASE_URL = "https://upegfchzvcnmoxfwamod.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwZWdmY2h6dmNubW94ZndhbW9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzODMxNzAsImV4cCI6MjA2OTk1OTE3MH0.SJKn6b9823OIpJbmaIe4lP45WO1zwM6ZMxnSmFahYms";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Server/API-də `setSession` üçün — paylaşılan `supabase` singleton-da sessiya
 * qurmaq paralel sorğularda (məs. CF Worker) qarışıqlığa səbəb ola bilər.
 */
export function createEphemeralSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/** Admin / server-only əməliyyatlar üçün service role */
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
