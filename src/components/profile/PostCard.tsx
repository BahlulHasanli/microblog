import { formatSimpleDate } from "@/utils/date";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface Post {
  id: string;
  title: string;
  description: string;
  slug: string;
  image: string;
  created_at: string;
}

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  return (
    <article className="flex flex-col h-full group">
      <a
        href={`/posts/${post.slug}`}
        title={post.title}
        className="block overflow-hidden rounded-xl border border-base-200 hover:border-base-300 transition-colors"
      >
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-base-100">
          <img
            src={post.image}
            alt={post.title}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      </a>

      <div className="mt-4">
        <div className="flex items-center gap-2 text-xs text-base-500 mb-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-3.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
            />
          </svg>
          <span className="font-medium">
            {formatSimpleDate(post.created_at)}
          </span>
        </div>

        <h3 className="text-lg font-semibold text-base-900 text-balance mb-2 leading-snug">
          <a
            href={`/posts/${post.slug}`}
            className="hover:text-rose-600 transition-colors"
          >
            {post.title}
          </a>
        </h3>

        <p className="text-sm text-base-600 line-clamp-2 leading-relaxed">
          {post.description}
        </p>
      </div>
    </article>
  );
}
