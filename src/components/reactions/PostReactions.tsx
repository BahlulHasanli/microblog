import { useState, useEffect } from "react";

interface ReactionCounts {
  like: number;
  love: number;
  celebrate: number;
  insightful: number;
  curious: number;
}

interface PostReactionsProps {
  postId: number;
  userEmail?: string;
}

const reactionIcons = {
  like: "/icons/like.png",
  love: "/icons/heart.png",
  celebrate: "/icons/gift.png",
  insightful: "/icons/target.png",
  curious: "/icons/trophy.png",
};

const reactionLabels = {
  like: "Bəyən",
  love: "Sevdim",
  celebrate: "Təbrik",
  insightful: "Faydalı",
  curious: "Maraqlı",
};

export default function PostReactions({
  postId,
  userEmail,
}: PostReactionsProps) {
  const [counts, setCounts] = useState<ReactionCounts>({
    like: 0,
    love: 0,
    celebrate: 0,
    insightful: 0,
    curious: 0,
  });
  const [userReactions, setUserReactions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Reaction-ları yüklə
  const loadReactions = async () => {
    try {
      const params = new URLSearchParams({
        postId: postId.toString(),
      });

      if (userEmail) {
        params.append("userEmail", userEmail);
      }

      const response = await fetch(`/api/reactions/get?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setCounts(data.counts);
        setUserReactions(data.userReactions || []);
      }
    } catch (error) {
      console.error("Reaction yükləmə xətası:", error);
    }
  };

  useEffect(() => {
    loadReactions();
  }, [postId, userEmail]);

  // Reaction toggle
  const handleReactionClick = async (reactionType: string) => {
    if (!userEmail) {
      alert("Reaction vermək üçün daxil olmalısınız");
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      const response = await fetch("/api/reactions/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId,
          reactionType,
          userEmail,
        }),
      });

      const data = await response.json();

      if (data.success) {
        await loadReactions();
      } else {
        console.error("Reaction toggle xətası:", data.message);
      }
    } catch (error) {
      console.error("Reaction toggle xətası:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-12 px-4">
      <div className="mt-2">
        <div className="flex flex-wrap gap-2 justify-center">
          {Object.entries(reactionIcons).map(([type, iconPath]) => {
            const isActive = userReactions.includes(type);
            const count = counts[type as keyof ReactionCounts];

            return (
              <button
                key={type}
                className={`
                  group relative inline-flex items-center gap-2 px-4 py-2.5 rounded-full
                  transition-all duration-200 font-nouvelr select-none overflow-hidden
                  ${isActive ? "bg-rose-50 text-rose-600" : "bg-zinc-50"}
                  ${
                    loading
                      ? "opacity-40 cursor-not-allowed"
                      : "cursor-pointer active:scale-95"
                  }
                `}
                onClick={() => handleReactionClick(type)}
                disabled={loading}
                title={reactionLabels[type as keyof typeof reactionLabels]}
                aria-label={`${
                  reactionLabels[type as keyof typeof reactionLabels]
                } - ${count} reaction`}
                aria-pressed={isActive}
              >
                <span
                  className="reaction-icon-wrapper"
                  data-active={isActive ? "true" : "false"}
                >
                  <img
                    src={iconPath}
                    alt={reactionLabels[type as keyof typeof reactionLabels]}
                    className={`size-11 object-contain transition-all duration-300 ${
                      isActive ? "scale-110 opacity-100" : "opacity-70"
                    }`}
                  />
                </span>
                {count > 0 && (
                  <span
                    className={`text-lg font-semibold tabular-nums ${
                      isActive ? "text-rose-600" : "text-zinc-600"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .reaction-icon-wrapper {
          display: inline-block;
        }

        .group:hover .reaction-icon-wrapper[data-active="false"] {
          animation: float 2s ease-in-out infinite;
        }

        .group:hover .reaction-icon-wrapper[data-active="false"] img {
          opacity: 1;
          transform: scale(1.1);
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px) scale(1.1);
          }
          50% {
            transform: translateY(-6px) scale(1.1);
          }
        }
      `}} suppressHydrationWarning></style>
    </div>
  );
}
