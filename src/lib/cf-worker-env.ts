/**
 * Astro v6 + @astrojs/cloudflare: `Astro.locals.runtime.env` kaldırıldı.
 * Bindings və secrets üçün `cloudflare:workers` modulundan `env` istifadə olunur.
 */
import { env } from "cloudflare:workers";

export function getCloudflareWorkerEnv(): Record<string, string | undefined> {
  return env as unknown as Record<string, string | undefined>;
}
