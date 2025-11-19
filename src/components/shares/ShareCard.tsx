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
  created_at: string;
  updated_at: string;
  likes_count: number;
  replies_count: number;
  user?: User;
}

interface ShareCardProps {
  share: Share;
}

export default function ShareCard({ share }: ShareCardProps) {
  const user = share.user;
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

          {/* Actions */}
          <div className="mt-3 flex justify-between text-slate-500 text-sm  transition-opacity">
            <button className="cursor-pointer flex items-center gap-2 hover:text-blue-500 transition-colors">
              <MessageCircle size={16} />
              <span>{share.replies_count}</span>
            </button>
            <button className="cursor-pointer flex items-center gap-2 hover:text-green-500 transition-colors">
              <Share2 size={16} />
            </button>
            <button className="cursor-pointer flex items-center gap-2 hover:text-red-500 transition-colors">
              <Heart size={16} />
              <span>{share.likes_count}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
