import { useState } from "react";
import { formatSimpleDate } from "@/utils/date";
import { confirmDialog, alertDialog } from "@/dialogs";

interface Post {
  id: string;
  title: string;
  description: string;
  slug: string;
  image: string;
  created_at: string;
  categories?: string[];
  approved?: boolean;
  isDraft?: boolean;
}

interface PostCardProps {
  post: Post;
  isOwner?: boolean;
  allCategories?: { slug: string; name: string }[];
  onDeleted?: (slug: string) => void;
}

export default function PostCard({
  post,
  isOwner = false,
  allCategories = [],
  onDeleted,
}: PostCardProps) {
  const CATEGORIES = allCategories;
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = await confirmDialog({
      title: "Məqaləni sil?",
      message:
        "Bu əməliyyat geri alına bilməz. Yazı və əsas media faylları silinəcək.",
      variant: "danger",
      confirmLabel: "Sil",
      cancelLabel: "Ləğv et",
    });
    if (!ok) return;
    setDeleteLoading(true);
    try {
      const response = await fetch("/api/posts/delete-own", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: post.slug }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.message || "Silmə uğursuz oldu");
      onDeleted?.(post.slug);
    } catch (err) {
      await alertDialog({
        title: "Silmə alınmadı",
        message: err instanceof Error ? err.message : "Silmə xətası",
        variant: "danger",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <article className="group relative bg-white dark:bg-base-900 rounded-xl border border-base-100 dark:border-base-800 overflow-hidden hover:border-base-200 dark:hover:border-base-700 transition-colors duration-200">
      {post.isDraft && isOwner && (
        <div className="absolute top-3 left-3 z-10 bg-violet-50 dark:bg-violet-950/35 text-violet-800 dark:text-violet-200 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-violet-200 dark:border-violet-800/50">
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
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12h5.625a1.125 1.125 0 001.125-1.125V11.25a9 9 0 00-9-9m0 0V5.25A2.25 2.25 0 015.25 3h5.25m-5.25 0v12.75c0 .621.504 1.125 1.125 1.125h5.25a1.125 1.125 0 001.125-1.125V9.75a1.125 1.125 0 00-1.125-1.125H8.25z"
            />
          </svg>
          Qaralama
        </div>
      )}

      {!post.isDraft && !post.approved && isOwner && (
        <div className="absolute top-3 left-3 z-10 bg-amber-50 dark:bg-amber-900/20 text-rose-700 dark:text-rose-400 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-amber-200 dark:border-amber-900/50">
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

      {isOwner && (
        <div className="absolute top-3 right-3 z-10 flex gap-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteLoading}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-medium px-2.5 py-1 rounded-lg shadow-sm"
          >
            {deleteLoading ? "…" : "Sil"}
          </button>
        </div>
      )}

      <a
        href={post.isDraft ? `/edit-post/${post.slug}` : `/posts/${post.slug}`}
        title={post.title}
        className="flex flex-row gap-4 p-3 sm:p-4"
      >
        {/* Thumbnail */}
        <div className="relative shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-base-100 dark:bg-base-800">
          {post.image ? (
            <img
              src={post.image}
              alt={post.title}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-base-400 dark:text-base-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-10 opacity-50"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008H12V8.25z"
                />
              </svg>
            </div>
          )}
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
