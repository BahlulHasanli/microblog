import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { az } from "date-fns/locale";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import ImageGallery from "./ImageGallery";

interface User {
  fullname: string;
  username: string;
  avatar: string;
}

interface Share {
  id: string;
  user_id: string;
  content: string;
  image_urls?: string[] | null;
  youtube_video_id?: string | null;
  created_at: string;
  updated_at: string;
  replies_count: number;
  user?: User;
  share_likes?: Array<{ id: string; user_id: string }>;
}

interface ShareCardProps {
  share: Share;
  onLikeChange?: (shareId: string, isLiked: boolean) => void;
}

export default function ShareCard({ share, onLikeChange }: ShareCardProps) {
  const user = share.user;
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // Like sayını hesabla
    const likes = share.share_likes || [];
    setLikesCount(likes.length);

    // Cari istifadəçinin like etib-etmədiğini yoxla
    const checkCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();
        if (data.success && data.user) {
          setCurrentUserId(data.user.id);
          const userLiked = likes.some((like) => like.user_id === data.user.id);
          setIsLiked(userLiked);
        }
      } catch (error) {
        console.error("User məlumatı alınarkən xəta:", error);
      }
    };

    checkCurrentUser();
  }, [share.share_likes]);

  const createdDate = new Date(share.created_at);
  const timeAgo = formatDistanceToNow(createdDate, {
    locale: az,
    addSuffix: true,
  });

  // Parse image_urls əgər string olarsa
  let imageUrls: string[] = [];
  if (share.image_urls) {
    if (typeof share.image_urls === "string") {
      try {
        imageUrls = JSON.parse(share.image_urls);
      } catch {
        imageUrls = [];
      }
    } else if (Array.isArray(share.image_urls)) {
      imageUrls = share.image_urls;
    }
  }

  const handleLike = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/shares/toggle-like", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shareId: share.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const newIsLiked = data.action === "added";
        setIsLiked(newIsLiked);
        setLikesCount(
          newIsLiked ? likesCount + 1 : Math.max(0, likesCount - 1)
        );

        if (onLikeChange) {
          onLikeChange(share.id, newIsLiked);
        }
      }
    } catch (error) {
      console.error("Like xətası:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex gap-3 sm:gap-4">
        {/* Avatar */}
        <div className="shrink-0">
          <img
            src={user?.avatar}
            alt={user?.fullname}
            className="squircle w-10! sm:w-12! h-10! sm:h-12! object-cover"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <a
              href={`/user/@${user?.username}`}
              className="font-semibold text-slate-900 hover:underline"
            >
              {user?.fullname}
            </a>
            <span className="text-slate-500 text-sm">@{user?.username}</span>
            <span className="text-slate-500 text-sm">·</span>
            <span className="text-slate-500 text-sm">{timeAgo}</span>
          </div>

          {/* Share Content */}
          <p className="mt-2 text-slate-900 text-sm sm:text-base wrap-break-word whitespace-pre-wrap">
            {share.content}
          </p>

          {/* Share Images */}
          {imageUrls.length > 0 && <ImageGallery images={imageUrls} />}

          {/* YouTube Video */}
          {share.youtube_video_id && (
            <div className="mt-3 aspect-video bg-slate-900 rounded-lg overflow-hidden">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${share.youtube_video_id}`}
                title="YouTube video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {/* Actions */}
          <div className="mt-3 flex justify-between text-slate-500 text-sm  transition-opacity">
            <button className="cursor-pointer flex items-center gap-2 hover:text-blue-500 transition-colors">
              <MessageCircle size={16} />
              <span>{share.replies_count}</span>
            </button>
            <button className="cursor-pointer flex items-center gap-2 hover:text-green-500 transition-colors">
              <Share2 size={16} />
            </button>
            <button
              onClick={handleLike}
              disabled={isLoading}
              className={`cursor-pointer flex items-center gap-2 transition-colors ${
                isLiked ? "text-red-500" : "hover:text-red-500"
              } disabled:opacity-50`}
            >
              <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
              <span>{likesCount}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
