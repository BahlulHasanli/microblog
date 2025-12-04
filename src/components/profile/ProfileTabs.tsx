import { useState, useEffect, useRef, useCallback } from "react";
import PostCard from "./PostCard";
import ProfileShareCard from "./ProfileShareCard";
import { supabase } from "@/db/supabase";

const SHARES_LIMIT = 10;

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

interface Share {
  id: string;
  user_id: string;
  content: string;
  image_urls?: string[] | null;
  youtube_video_id?: string | null;
  created_at: string;
  comments_count?: number;
  likes_count?: number;
  share_likes?: Array<{ id: string; user_id: string }>;
}

interface ProfileTabsProps {
  posts: Post[];
  userId: string;
  isOwner?: boolean;
  currentUserId?: string;
}

export default function ProfileTabs({
  posts,
  userId,
  isOwner = false,
  currentUserId,
}: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState("shares");
  const [shares, setShares] = useState<Share[]>([]);
  const [sharesLoading, setSharesLoading] = useState(true);
  const [sharesLoadingMore, setSharesLoadingMore] = useState(false);
  const [hasMoreShares, setHasMoreShares] = useState(true);
  const [sharesOffset, setSharesOffset] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastShareRef = useRef<HTMLDivElement | null>(null);

  // Fetch user shares
  const fetchShares = useCallback(
    async (isLoadMore = false) => {
      if (isLoadMore) {
        setSharesLoadingMore(true);
      } else {
        setSharesLoading(true);
      }

      try {
        const currentOffset = isLoadMore ? sharesOffset : 0;
        const { data, error } = await supabase
          .from("shares")
          .select("*, share_likes(id, user_id), share_comments(id)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .range(currentOffset, currentOffset + SHARES_LIMIT - 1);

        if (error) {
          console.error("Shares yüklənərkən xəta:", error);
          return;
        }

        const sharesWithCounts = (data || []).map((share: any) => ({
          ...share,
          likes_count: share.share_likes?.length || 0,
          comments_count: share.share_comments?.length || 0,
          share_likes: share.share_likes || [],
        }));

        if (isLoadMore) {
          setShares((prev) => [...prev, ...sharesWithCounts]);
          setSharesOffset((prev) => prev + SHARES_LIMIT);
        } else {
          setShares(sharesWithCounts);
          setSharesOffset(SHARES_LIMIT);
        }

        setHasMoreShares((data?.length || 0) >= SHARES_LIMIT);
      } catch (err) {
        console.error("Shares fetch xətası:", err);
      } finally {
        setSharesLoading(false);
        setSharesLoadingMore(false);
      }
    },
    [userId, sharesOffset]
  );

  useEffect(() => {
    fetchShares();
  }, [userId]);

  // Handle like change from child component
  const handleLikeChange = useCallback(
    (shareId: string, isLiked: boolean) => {
      setShares((prevShares) =>
        prevShares.map((share) => {
          if (share.id === shareId) {
            if (isLiked && currentUserId) {
              // Add like
              return {
                ...share,
                likes_count: (share.likes_count || 0) + 1,
                share_likes: [
                  ...(share.share_likes || []),
                  { id: `temp-${Date.now()}`, user_id: currentUserId },
                ],
              };
            } else if (!isLiked && currentUserId) {
              // Remove like
              return {
                ...share,
                likes_count: Math.max((share.likes_count || 1) - 1, 0),
                share_likes: (share.share_likes || []).filter(
                  (like) => like.user_id !== currentUserId
                ),
              };
            }
          }
          return share;
        })
      );
    },
    [currentUserId]
  );

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMoreShares &&
          !sharesLoadingMore &&
          !sharesLoading
        ) {
          fetchShares(true);
        }
      },
      { threshold: 0.1 }
    );

    if (lastShareRef.current) {
      observerRef.current.observe(lastShareRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [shares, hasMoreShares, sharesLoadingMore, sharesLoading]);

  return (
    <div>
      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-100 p-1.5 mb-6 sm:mb-8 inline-flex gap-1">
        {/* Dedi Tab */}
        <button
          onClick={() => setActiveTab("shares")}
          className={`cursor-pointer py-2.5 px-4 sm:px-5 rounded-xl font-medium text-sm transition-all duration-200 ${
            activeTab === "shares"
              ? "bg-rose-500 text-white"
              : "text-base-500 hover:text-base-700 hover:bg-base-50"
          }`}
        >
          <span className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              className="size-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
              />
            </svg>

            <span
              className={`text-xs px-1.5 py-0.5 rounded-md ${
                activeTab === "shares" ? "bg-white/20" : "bg-base-100"
              }`}
            >
              {shares.length}
            </span>
          </span>
        </button>

        {/* Məqalələr Tab */}
        <button
          onClick={() => setActiveTab("posts")}
          className={`cursor-pointer py-2.5 px-4 sm:px-5 rounded-xl font-medium text-sm transition-all duration-200 ${
            activeTab === "posts"
              ? "bg-rose-500 text-white"
              : "text-base-500 hover:text-base-700 hover:bg-base-50"
          }`}
        >
          <span className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              className="size-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
              />
            </svg>
            <span
              className={`text-xs px-1.5 py-0.5 rounded-md ${
                activeTab === "posts" ? "bg-white/20" : "bg-base-100"
              }`}
            >
              {posts.length}
            </span>
          </span>
        </button>
      </div>

      {/* Content */}
      <div>
        {/* Shares Tab Content */}
        {activeTab === "shares" && (
          <div>
            {sharesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-base-200 border-t-rose-500 rounded-full animate-spin"></div>
              </div>
            ) : shares.length > 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-100">
                {shares.map((share, index) => (
                  <div
                    key={share.id}
                    ref={index === shares.length - 1 ? lastShareRef : null}
                  >
                    <ProfileShareCard
                      share={share}
                      isLast={index === shares.length - 1 && !hasMoreShares}
                      currentUserId={currentUserId}
                      onLikeChange={handleLikeChange}
                    />
                  </div>
                ))}

                {/* Loading more indicator */}
                {sharesLoadingMore && (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-6 h-6 border-2 border-base-200 border-t-rose-500 rounded-full animate-spin"></div>
                  </div>
                )}

                {/* End of list */}
                {!hasMoreShares && shares.length > 0 && (
                  <div className="text-center py-4 text-xs text-base-400">
                    Daha çox paylaşım yoxdur
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-base-200 p-12 text-center">
                <div className="max-w-sm mx-auto">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-base-100 mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="size-8 text-base-400"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-base-900 mb-2">
                    Heç bir paylaşım yoxdur
                  </h3>
                  <p className="text-base-600">
                    {isOwner
                      ? "Hələ heç bir paylaşım etməmisiniz"
                      : "Bu istifadəçi hələ heç bir paylaşım etməmişdir"}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Posts Tab Content */}
        {activeTab === "posts" && (
          <div>
            {posts.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} isOwner={isOwner} />
                ))}
              </div>
            ) : isOwner ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                <div className="max-w-sm mx-auto">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      className="size-8 text-slate-400"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Hələ heç bir məqalə yazmamısınız
                  </h3>
                  <p className="text-slate-600 text-[14px] mb-6">
                    İlk məqalənizi yazmaq üçün "Yeni məqalə yaz" düyməsinə
                    klikləyin
                  </p>
                  <a
                    href="/studio"
                    className="inline-flex items-center justify-center gap-2 py-3 px-6 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-xl border border-transparent focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-all duration-200"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="size-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                      />
                    </svg>
                    Yeni məqalə yaz
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-base-200 p-12 text-center">
                <div className="max-w-sm mx-auto">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-base-100 mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="size-8 text-base-400"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-base-900 mb-2">
                    Heç bir məqalə yoxdur
                  </h3>
                  <p className="text-base-600">
                    Bu istifadəçi hələ heç bir məqalə yazmamışdır
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
