import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import db from "@astrojs/db";

import react from "@astrojs/react";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  output: "server",
  vite: {
    plugins: [tailwindcss()],
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
  site: "http://localhost:4321",
  integrations: [db(), sitemap(), mdx(), react()],
  adapter: node({
    mode: "standalone",
  }),
});
