import type { APIRoute } from "astro";
import { supabase } from "@/db/supabase";

export const prerender = false;

export const GET: APIRoute = async () => {
  const site = "https://the99.az";

  // Statik səhifələr
  const staticPages = [
    { url: "/", priority: "1.0", changefreq: "daily" },
    { url: "/about", priority: "0.8", changefreq: "monthly" },
    { url: "/contact", priority: "0.8", changefreq: "monthly" },
    { url: "/adv", priority: "0.7", changefreq: "monthly" },
    { url: "/vacancy", priority: "0.7", changefreq: "weekly" },
    { url: "/squad", priority: "0.7", changefreq: "monthly" },
    { url: "/signin", priority: "0.5", changefreq: "monthly" },
    { url: "/signup", priority: "0.5", changefreq: "monthly" },
  ];

  // Postları al
  const { data: posts } = await supabase
    .from("posts")
    .select("slug, pub_date, updated_at")
    .eq("approved", true)
    .order("pub_date", { ascending: false });

  // Kateqoriyaları al
  const { data: categories } = await supabase
    .from("categories")
    .select("slug")
    .order("id", { ascending: true });

  // İstifadəçiləri al (public profillər üçün)
  const { data: users } = await supabase
    .from("users")
    .select("username")
    .not("username", "is", null);

  const today = new Date().toISOString().split("T")[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  // Statik səhifələr
  for (const page of staticPages) {
    xml += `  <url>
    <loc>${site}${page.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
  }

  // Postlar
  if (posts) {
    for (const post of posts) {
      const lastmod = post.updated_at || post.pub_date || today;
      const formattedDate = new Date(lastmod).toISOString().split("T")[0];
      xml += `  <url>
    <loc>${site}/posts/${post.slug}</loc>
    <lastmod>${formattedDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
`;
    }
  }

  // Kateqoriyalar
  if (categories) {
    for (const category of categories) {
      xml += `  <url>
    <loc>${site}/category/${category.slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`;
    }
  }

  // İstifadəçi profilləri
  if (users) {
    for (const user of users) {
      xml += `  <url>
    <loc>${site}/user/@${user.username}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
    }
  }

  xml += `</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
