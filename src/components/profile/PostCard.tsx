import { formatSimpleDate } from "@/utils/date";
import { categories as CATEGORIES } from "@/data/categories";

interface Post {
  id: string;
  title: string;
  description: string;
  slug: string;
  image: string;
  created_at: string;
  categories?: string[];
  approved?: boolean;
}

interface PostCardProps {
  post: Post;
  isOwner?: boolean;
}

export default function PostCard({ post, isOwner = false }: PostCardProps) {
  return (
    <article className="flex flex-col h-full group relative">
      {/* Gözləmə rejimi göstəricisi */}
      {!post.approved && isOwner && (
        <div className="absolute top-3 right-3 z-10 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="size-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          Gözləmədə
        </div>
      )}

      <a
        href={`/posts/${post.slug}`}
        title={post.title}
        className="block overflow-hidden rounded-xl border border-base-200 hover:border-base-300 transition-colors"
      >
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-base-100">
          <img
            src={post.image}
            alt={post.title}
            className="object-cover w-full h-full"
          />
        </div>
      </a>

      <div className="mt-4">
        {post.categories && post.categories.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-base-500 mb-3 flex-wrap">
            {post.categories.map((categorySlug, index) => {
              const categoryObj = CATEGORIES.find(
                (cat) => cat.slug === categorySlug
              );
              return (
                <a
                  key={categorySlug}
                  href={`/category/${categorySlug}`}
                  className="text-yellow-700 hover:text-yellow-800 transition-colors"
                >
                  {categoryObj ? categoryObj.name : categorySlug}
                  {index < post.categories!.length - 1 && ","}
                </a>
              );
            })}
          </div>
        )}

        <h3 className="text-base font-semibold text-base-900 text-balance mb-2 leading-snug line-clamp-2">
          <a
            href={`/posts/${post.slug}`}
            className="hover:text-rose-600 transition-colors"
          >
            {post.title}
          </a>
        </h3>

        <p className="text-xs text-base-600 line-clamp-2 leading-relaxed mb-3">
          {post.description}
        </p>

        <div className="flex items-center gap-2 text-xs text-base-500">
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
          <span className="font-medium" suppressHydrationWarning>
            {formatSimpleDate(post.created_at)}
          </span>
        </div>
      </div>
    </article>
  );
}
