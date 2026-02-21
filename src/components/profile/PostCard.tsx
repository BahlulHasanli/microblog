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
    <article className="group relative bg-white dark:bg-base-900 rounded-xl border border-base-100 dark:border-base-800 overflow-hidden hover:border-base-200 dark:hover:border-base-700 transition-colors duration-200">
      {/* Gözləmə rejimi göstəricisi */}
      {!post.approved && isOwner && (
        <div className="absolute top-3 right-3 z-10 bg-amber-50 dark:bg-amber-900/20 text-rose-700 dark:text-rose-400 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-amber-200 dark:border-amber-900/50">
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
        className="flex flex-row gap-4 p-3 sm:p-4"
      >
        {/* Thumbnail */}
        <div className="relative shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-base-100 dark:bg-base-800">
          <img
            src={post.image}
            alt={post.title}
            className="object-cover w-full h-full"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            {post.categories && post.categories.length > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] mb-1.5 flex-wrap">
                {post.categories.map((categorySlug, index) => {
                  const categoryObj = CATEGORIES.find(
                    (cat) => cat.slug === categorySlug,
                  );
                  return (
                    <span
                      key={categorySlug}
                      className="text-rose-500 font-medium"
                    >
                      {categoryObj ? categoryObj.name : categorySlug}
                      {index < post.categories!.length - 1 && ","}
                    </span>
                  );
                })}
              </div>
            )}

            <h3 className="text-sm font-semibold text-base-900 dark:text-base-50 leading-snug line-clamp-2 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors duration-200">
              {post.title}
            </h3>

            <p className="text-[12px] text-base-400 dark:text-base-500 line-clamp-2 leading-relaxed mt-1 hidden sm:block">
              {post.description}
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-base-400 dark:text-base-500 mt-auto">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-3"
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
      </a>
    </article>
  );
}
