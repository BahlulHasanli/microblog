import { useEffect, useState } from "react";
import { supabase } from "@/db/supabase";
import { useShare } from "@/context/ShareContext";
import ShareCard from "./ShareCard";

interface Share {
  id: string;
  author_email: string;
  content: string;
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
  const [error, setError] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const fetchShares = async () => {
    if (isInitialLoad) {
      setIsLoading(true);
    }
    setError("");

    try {
      const { data, error: fetchError } = await supabase
        .from("shares")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

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
              .eq("email", share.author_email)
              .single();

            return {
              ...share,
              user: userData || {
                fullname: "Unknown",
                username: "unknown",
                avatar: "/default-avatar.png",
              },
            };
          })
        );
        setShares(sharesWithUsers);
      } else {
        setShares([]);
      }
    } catch (err) {
      setError("Xəta baş verdi");
      console.error(err);
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
        setIsInitialLoad(false);
      }
    }
  };

  useEffect(() => {
    fetchShares();
  }, [refreshTrigger, contextRefreshTrigger]);

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
      <div className="w-full py-8 text-center text-slate-500">
        Paylaşımlar yüklənir...
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        {error}
      </div>
    );
  }

  if (shares.length === 0) {
    return (
      <div className="w-full py-12 text-center text-slate-400">
        <p className="text-lg">Hələ paylaşım yoxdur</p>
        <p className="text-sm mt-2">Birinci paylaşımı sən et!</p>
      </div>
    );
  }

  return (
    <div className="w-full divide-y divide-slate-200">
      {shares.map((share) => (
        <ShareCard key={share.id} share={share} />
      ))}
    </div>
  );
}
