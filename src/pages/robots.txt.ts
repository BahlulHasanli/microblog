import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async () => {
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /studio
Disallow: /api
Disallow: /private
Disallow: /*.json

Crawl-delay: 1

Sitemap: https://the99.az/sitemap.xml
`;

  return new Response(robotsTxt, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "CDN-Cache-Control": "no-store",
      "Cloudflare-CDN-Cache-Control": "no-store",
    },
  });
};
