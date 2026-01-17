import rss from "@astrojs/rss";
import { supabase } from "../db/supabase";

export async function GET(context) {
  // Supabase-dən təsdiqlənmiş postları çək
  const { data: posts, error } = await supabase
    .from("posts")
    .select(
      `
      *,
      users:author_id (fullname, username)
    `,
    )
    .eq("approved", true)
    .order("pub_date", { ascending: false })
    .limit(50);

  if (error) {
    console.error("RSS feed xətası:", error);
    return new Response("RSS feed yaradıla bilmədi", { status: 500 });
  }

  return rss({
    title: "The99.az - Texnologiya, Oyun və Əyləncə",
    description:
      "Azərbaycanda texnologiya, oyun və əyləncə dünyasından ən son xəbərlər və məqalələr",
    site: context.site || "https://the99.az",
    items: (posts || []).map((post) => ({
      title: post.title,
      pubDate: new Date(post.pub_date),
      description: post.description,
      link: `/posts/${post.slug}/`,
      author: post.users?.fullname || "The99.az",
      categories: post.categories || [],
    })),
    customData: `<language>az-AZ</language>`,
  });
}
