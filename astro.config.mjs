import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";
import svelte from "@astrojs/svelte";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  site: "https://the99.az",
  output: "server",
  vite: {
    plugins: [tailwindcss()],
    build: {
      chunkSizeWarningLimit: 500,
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "@tiptap/react",
        "@tiptap/core",
        "@tiptap/starter-kit",
        "@tiptap/extensions",
        "@tiptap/extension-document",
        "@tiptap/extension-highlight",
        "@tiptap/extension-image",
        "@tiptap/extension-list",
        "@tiptap/extension-placeholder",
        "@tiptap/extension-subscript",
        "@tiptap/extension-superscript",
        "@tiptap/extension-text-align",
        "@tiptap/extension-typography",
        "@tiptap/extension-youtube",
      ],
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
  adapter: cloudflare({
    imageService: "compile",
    platformProxy: {
      enabled: true,
    },
  }),
});
