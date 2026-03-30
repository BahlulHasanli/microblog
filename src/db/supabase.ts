import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://upegfchzvcnmoxfwamod.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwZWdmY2h6dmNubW94ZndhbW9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzODMxNzAsImV4cCI6MjA2OTk1OTE3MH0.SJKn6b9823OIpJbmaIe4lP45WO1zwM6ZMxnSmFahYms";

/** Cloudflare Pages / Workers — `locals.runtime.env` */
export type SupabaseServiceRoleSource = {
  locals?: { runtime?: { env?: Record<string, string | undefined> } };
  /** Astro səhifələrində `Astro.locals.runtime?.env` eyni obyekti ötürür */
  runtimeEnv?: Record<string, string | undefined>;
};

function trimEnv(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s.length > 0 ? s : undefined;
}

/**
 * Service role açarı: əvvəlcə Cloudflare runtime, sonra .env / build mühiti.
 * Modul yüklənəndə `locals` olmadığı üçün prod-da yalnız `getSupabaseAdmin({ locals })` etibarlıdır.
 */
export function resolveServiceRoleKey(opts?: SupabaseServiceRoleSource): string | undefined {
  const fromCf = trimEnv(opts?.locals?.runtime?.env?.SUPABASE_SERVICE_ROLE_KEY);
  if (fromCf) return fromCf;
  const fromRuntime = trimEnv(opts?.runtimeEnv?.SUPABASE_SERVICE_ROLE_KEY);
  if (fromRuntime) return fromRuntime;
  return trimEnv(
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY ||
      (typeof process !== "undefined" ? process.env.SUPABASE_SERVICE_ROLE_KEY : undefined),
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function getSupabaseAdmin(opts?: SupabaseServiceRoleSource): SupabaseClient {
  const key = resolveServiceRoleKey(opts);
  if (!key) return supabase;
  return createClient(SUPABASE_URL, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

const supabaseServiceKey = resolveServiceRoleKey(undefined);

/** Yalnız lokal / build zamanı açar varsa true; Cloudflare-da false ola bilər, runtime-da açar yenə də ola bilər */
export const hasSupabaseServiceRole = Boolean(supabaseServiceKey);

if (!supabaseServiceKey) {
  console.warn(
    "⚠️ SUPABASE_SERVICE_ROLE_KEY modul yüklənəndə tapılmadı (lokal .env və ya build env). Cloudflare Pages-də Settings → Environment variables-da təyin edin; API route-lar runtime.env ilə oxuyur.",
  );
}

/** Lokal və ya build zamanı açar varsa service client; yoxdursa anon (CF-da `getSupabaseAdmin({ locals })` üstünlüklüdür) */
export const supabaseAdmin = supabaseServiceKey
  ? createClient(SUPABASE_URL, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : supabase;
