/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_KEY: string;
  /** Server-only; Cloudflare-da çox vaxt yalnız runtime env-də olur */
  readonly SUPABASE_SERVICE_ROLE_KEY?: string;
  
  readonly BUNNY_API_KEY: string;
  readonly BUNNY_STORAGE_ZONE: string;
  readonly BUNNY_PULL_ZONE: string;

  /** Bunny Stream (video library) — https://docs.bunny.net/api-reference/stream */
  readonly BUNNY_STREAM_API_KEY?: string;
  readonly BUNNY_STREAM_LIBRARY_ID?: string;
  readonly BUNNY_STREAM_CDN_HOSTNAME?: string;
  readonly BUNNY_STREAM_COLLECTION_NAME?: string;
  /** Kolleksiya GUID (verilərsə, ada görə axtarış atlanır) */
  readonly BUNNY_STREAM_COLLECTION_ID?: string;
  /** "1" / "true" — yalnız seçilmiş kolleksiya; boşdursa kitabxana fallback olmur */
  readonly BUNNY_STREAM_STRICT_COLLECTION?: string;
  /** Bunny video meta (thumbnail, müddət) yenidən sorğusu aralığı (ms). 0 = hər dəfə. Default ~60000 */
  readonly BUNNY_STREAM_META_TTL_MS?: string;
  
  readonly RESEND_API_KEY: string;

  readonly GOOGLE_CLIENT_ID: string;
  readonly GOOGLE_CLIENT_SECRET: string;

  readonly POLAR_ACCESS_TOKEN: string;
  readonly POLAR_SUCCESS_URL: string;
  readonly PUBLIC_POLAR_PRODUCT_ID: string;

  readonly PUBLIC_POLAR_PRODUCT_ID_TEST: string;
  readonly POLAR_ACCESS_TOKEN_TEST: string;
  readonly POLAR_SUCCESS_URL_TEST: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    runtime?: {
      env?: Record<string, string | undefined>;
    };
  }
}
