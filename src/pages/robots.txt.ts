import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async () => {
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /studio
Disallow: /api
Disallow: /private
Disallow: /*.json$
Disallow: /*?*sort=
Disallow: /*?*filter=

Crawl-delay: 1

# AI Bots
User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: ClaudeBot
Disallow: /

Sitemap: https://the99.az/sitemap.xml
`;

  return new Response(robotsTxt, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
};
