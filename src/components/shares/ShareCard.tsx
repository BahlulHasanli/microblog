import { formatDistanceToNow } from "date-fns";
import { az } from "date-fns/locale";
import { Heart, MessageCircle, Share2 } from "lucide-react";

interface User {
  fullname: string;
  username: string;
  avatar: string;
}

interface Share {
  id: string;
  author_email: string;
  content: string;
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

  return (
    <div className="p-4 sm:p-6">
      <div className="flex gap-3 sm:gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <img
            src={user?.avatar || "/default-avatar.png"}
            alt={user?.fullname || "User"}
            className="w-10 sm:w-12 h-10 sm:h-12 rounded-full object-cover"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <a
              href={`/user/@${user?.username || "unknown"}`}
              className="font-semibold text-slate-900 hover:underline"
            >
              {user?.fullname || "Unknown"}
            </a>
            <span className="text-slate-500 text-sm">
              @{user?.username || "unknown"}
            </span>
            <span className="text-slate-500 text-sm">·</span>
            <span className="text-slate-500 text-sm">{timeAgo}</span>
          </div>

          {/* Share Content */}
          <p className="mt-2 text-slate-900 text-sm sm:text-base break-words whitespace-pre-wrap">
            {share.content}
          </p>

          {/* Actions */}
          <div className="mt-3 flex justify-between text-slate-500 max-w-xs text-sm  transition-opacity">
            <button className="flex items-center gap-2 hover:text-blue-500 transition-colors">
              <MessageCircle size={16} />
              <span>{share.replies_count}</span>
            </button>
            <button className="flex items-center gap-2 hover:text-green-500 transition-colors">
              <Share2 size={16} />
            </button>
            <button className="flex items-center gap-2 hover:text-red-500 transition-colors">
              <Heart size={16} />
              <span>{share.likes_count}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
