import { useEffect, useState, useRef } from "react";
import { supabase } from "@/db/supabase";
import { useShare } from "@/context/ShareContext";
import ShareCard from "./ShareCard";

interface Share {
  id: string;
  user_id: string;
  content: string;
  image_urls?: string[] | null;
  created_at: string;
  updated_at: string;
  likes_count: number;
  replies_count: number;
  user?: {
    fullname: string;
    username: string;
    avatar: string;
  };
}

interface ShareTimelineProps {
  refreshTrigger?: number;
}

export default function ShareTimeline({
  refreshTrigger = 0,
}: ShareTimelineProps) {
  const { refreshTrigger: contextRefreshTrigger } = useShare();
  const [shares, setShares] = useState<Share[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const LIMIT = 10;

  const fetchShares = async (isLoadMore = false) => {
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else if (isInitialLoad) {
      setIsLoading(true);
    }
    setError("");

    try {
      const currentOffset = isLoadMore ? offset : 0;
      const { data, error: fetchError } = await supabase
        .from("shares")
        .select("*, share_likes(id, user_id)")
        .order("created_at", { ascending: false })
        .range(currentOffset, currentOffset + LIMIT - 1);

      if (fetchError) {
        setError("Paylaşımlar yüklənərkən xəta: " + fetchError.message);
        console.error(fetchError);
        return;
      }

      // Get user data for each share
      if (data && data.length > 0) {
        const sharesWithUsers = await Promise.all(
          data.map(async (share) => {
            const { data: userData } = await supabase
              .from("users")
              .select("fullname, username, avatar")
              .eq("id", share.user_id)
              .single();

            return {
              ...share,
              user: userData,
            };
          })
        );

        if (isLoadMore) {
          setShares((prev) => [...prev, ...sharesWithUsers]);
          setOffset((prev) => prev + LIMIT);
        } else {
          setShares(sharesWithUsers);
          setOffset(LIMIT);
        }

        // Daha az məlumat varsa, daha çox yoxdur
        if (data.length < LIMIT) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      } else {
        if (!isLoadMore) {
          setShares([]);
        }
        setHasMore(false);
      }
    } catch (err) {
      setError("Xəta baş verdi");
      console.error(err);
    } finally {
      if (isInitialLoad && !isLoadMore) {
        setIsLoading(false);
        setIsInitialLoad(false);
      }
      if (isLoadMore) {
        setIsLoadingMore(false);
      }
    }
  };

  const handleLikeChange = (shareId: string, isLiked: boolean) => {
    // Like sayını update et - bu funksiya ShareCard tərəfindən çağırılır
    // Actual update API tərəfindən edilir
  };

  const handleScroll = () => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const isNearBottom = documentHeight - scrollTop - windowHeight < 500;

      if (isNearBottom && hasMore && !isLoadingMore && !isLoading) {
        fetchShares(true);
      }
    }, 150);
  };

  useEffect(() => {
    fetchShares();
  }, [refreshTrigger, contextRefreshTrigger]);

  // Window scroll listener
  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [hasMore, isLoadingMore, isLoading]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("public:shares", {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shares",
        },
        (payload) => {
          console.log("Real-time update:", payload);
          fetchShares();
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="w-full py-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500">Paylaşımlar yüklənir...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full py-8 px-4">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-sm">
          <p className="font-medium mb-1">Xəta baş verdi</p>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (shares.length === 0) {
    return (
      <div className="w-full py-16 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-flex p-3 rounded-xl bg-slate-50">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              className="size-6 text-slate-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
              />
            </svg>
          </div>
          <p className="text-slate-900 font-nouvelr-semibold text-base mb-1">
            Paylaşım yoxdur
          </p>
          <p className="text-slate-500 text-sm">
            Redaktorlar tərəfindən paylaşım edilməyib
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {shares.map((share) => (
        <ShareCard key={share.id} share={share} />
      ))}

      {/* Loading more indicator */}
      {isLoadingMore && (
        <div className="w-full py-4 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500">
              Daha çox paylaşım yüklənir...
            </p>
          </div>
        </div>
      )}

      {/* End of list */}
      {!hasMore && shares.length > 0 && (
        <div className="w-full py-4 flex items-center justify-center">
          <p className="text-xs text-slate-400">Daha çox paylaşım yoxdur</p>
        </div>
      )}
    </div>
  );
}
