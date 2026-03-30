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

/** RPC / server-only əməliyyatlar (məs. record-view) üçün service role vacibdir */
export const hasSupabaseServiceRole = Boolean(supabaseServiceKey);

// Admin əməliyyatları üçün service role client (RLS-i bypass edir)
if (!supabaseServiceKey) {
  console.warn(
    "⚠️ SUPABASE_SERVICE_ROLE_KEY tapılmadı! Admin əməliyyatları və video sayğacı (record-view) işləməyə bilər. .env faylında SUPABASE_SERVICE_ROLE_KEY əlavə edin.",
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
