/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
  readonly BUNNY_API_KEY: string;
  readonly BUNNY_STORAGE_ZONE: string;
  readonly BUNNY_STORAGE_KEY: string;
  readonly BUNNY_PULL_ZONE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
