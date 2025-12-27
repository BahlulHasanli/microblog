import { formatSimpleDate } from "@/utils/date";

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
  allCategories?: { slug: string; name: string }[];
}

export default function PostCard({
  post,
  isOwner = false,
  allCategories = [],
}: PostCardProps) {
  const CATEGORIES = allCategories;
  return (
    <article className="flex flex-col h-full group relative bg-white rounded-xl border border-base-100 overflow-hidden">
      {/* Gözləmə rejimi göstəricisi */}
      {!post.approved && isOwner && (
        <div className="absolute top-3 right-3 z-10 bg-amber-50 text-rose-700 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-amber-200">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="size-3.5"
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
        className="block overflow-hidden"
      >
        <div className="relative w-full aspect-16/10 overflow-hidden bg-base-100">
          <img
            src={post.image}
            alt={post.title}
            className="object-cover w-full h-full duration-500"
          />
        </div>
      </a>

      <div className="p-4 sm:p-5 flex flex-col flex-1">
        {post.categories && post.categories.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs mb-3 flex-wrap">
            {post.categories.map((categorySlug, index) => {
              const categoryObj = CATEGORIES.find(
                (cat) => cat.slug === categorySlug
              );
              return (
                <a
                  key={categorySlug}
                  href={`/category/${categorySlug}`}
                  className="text-rose-600 hover:text-rose-700 font-medium transition-colors"
                >
                  {categoryObj ? categoryObj.name : categorySlug}
                  {index < post.categories!.length - 1 && ","}
                </a>
              );
            })}
          </div>
        )}

        <h3 className="text-base font-semibold text-base-900 mb-2 leading-snug line-clamp-2 flex-1">
          <a
            href={`/posts/${post.slug}`}
            className="hover:text-rose-600 transition-colors text-[14px]"
          >
            {post.title}
          </a>
        </h3>

        <p className="text-[13px] text-base-500 line-clamp-2 leading-relaxed mb-4">
          {post.description}
        </p>

        <div className="flex items-center gap-2 text-xs text-base-400 pt-3 border-t border-base-100/50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
            />
          </svg>
          <span
            className="font-medium text-base-500 text-[11px]"
            suppressHydrationWarning
          >
            {formatSimpleDate(post.created_at)}
          </span>
        </div>
      </div>
    </article>
  );
}
