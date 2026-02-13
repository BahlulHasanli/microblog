/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_KEY: string;
  
  readonly BUNNY_API_KEY: string;
  readonly BUNNY_STORAGE_ZONE: string;
  readonly BUNNY_PULL_ZONE: string;
  
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
