import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import svelte from "@astrojs/svelte";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  site: "https://the99.az",
  output: "server",
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Svelte runtime-ı bir chunk-da birləşdir
            "svelte-runtime": [
              "svelte",
              "svelte/internal",
              "svelte/store",
              "svelte/transition",
              "svelte/animate",
              "svelte/easing",
            ],
            // Blurhash ayrı chunk
            blurhash: ["blurhash"],
          },
        },
      },
      // Chunk ölçüsü xəbərdarlığını artır
      chunkSizeWarningLimit: 500,
    },
  },
  markdown: {
    drafts: true,
    shikiConfig: {
      theme: "css-variables",
    },
  },
  shikiConfig: {
    wrap: true,
    skipInline: false,
    drafts: true,
  },
  integrations: [
    sitemap({
      changefreq: "weekly",
      priority: 0.7,
      lastmod: new Date(),
      i18n: {
        defaultLocale: "az",
        locales: {
          az: "az-AZ",
          en: "en-US",
        },
      },
    }),
    react(),
    svelte(),
  ],
  adapter: cloudflare(),
});
