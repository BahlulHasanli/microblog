import { useState, useEffect } from "react";

interface ReactionCounts {
  like: number;
  love: number;
  celebrate: number;
  insightful: number;
  curious: number;
}

interface ReactionPreviewProps {
  postId: number;
}

const reactionIcons = {
  like: "/icons/like.png",
  love: "/icons/heart.png",
  celebrate: "/icons/gift.png",
  insightful: "/icons/target.png",
  curious: "/icons/trophy.png",
};

export default function ReactionPreview({ postId }: ReactionPreviewProps) {
  const [counts, setCounts] = useState<ReactionCounts>({
    like: 0,
    love: 0,
    celebrate: 0,
    insightful: 0,
    curious: 0,
  });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReactions = async () => {
      try {
        const response = await fetch(`/api/reactions/get?postId=${postId}`);
        const data = await response.json();

        if (data.success) {
          setCounts(data.counts);
          setTotal(data.total);
        }
      } catch (error) {
        console.error("Reaction yükləmə xətası:", error);
      } finally {
        setLoading(false);
      }
    };

    loadReactions();
  }, [postId]);

  if (loading || total === 0) {
    return null;
  }

  // Ən çox olan 3 reaction-ı göstər
  const topReactions = Object.entries(counts)
    .filter(([_, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <div className="inline-flex items-center gap-1 text-xs text-zinc-500 font-nouvelr">
      <div className="flex items-center -space-x-1">
        {topReactions.map(([type, count]) => (
          <img
            key={type}
            src={reactionIcons[type as keyof typeof reactionIcons]}
            alt=""
            className="w-5 h-5 object-contain opacity-80"
            title={`${count} reaction`}
          />
        ))}
      </div>
      <span className="font-medium text-zinc-600 tabular-nums ml-1 text-sm">
        {total}
      </span>
    </div>
  );
}
