import { defineCollection, z } from "astro:content";

const postsCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    description: z.string(),
    author: z.object({
      name: z.string(),
      avatar: z.string(),
    }),
    image: z.object({
      url: z.string(),
      alt: z.string(),
    }),
    categories: z.array(z.string()),
    approved: z.boolean().default(false),
  }),
});

export const collections = {
  posts: postsCollection,
};
