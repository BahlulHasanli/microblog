import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { az } from "date-fns/locale";
import { ArrowLeft, MessageCircle, Heart, Share2 } from "lucide-react";

interface User {
  id: string;
  fullname: string;
  username: string;
  avatar: string;
}

interface Share {
  id: string;
  user_id: string | User;
  content: string;
  created_at: string;
}

interface Comment {
  id: string;
  share_id: string;
  user_id: string | User;
  content: string;
  created_at: string;
  parent_id?: string | null;
  nested_replies_count?: number;
  reply_count?: number;
}

interface ShareCommentDetailProps {
  share: Share;
  comment: Comment;
  replies: Comment[];
}

export default function ShareCommentDetail({
  share,
  comment,
  replies,
}: ShareCommentDetailProps) {
  const [replyText, setReplyText] = useState("");
  const [isCommentLoading, setIsCommentLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string>("");
  const [allReplies, setAllReplies] = useState<Comment[]>(replies);
  const [likedReplies, setLikedReplies] = useState<Set<string>>(new Set());
  const [isParentCommentLiked, setIsParentCommentLiked] = useState(false);

  useEffect(() => {
    const checkCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) {
          setIsAuthenticated(false);
          return;
        }
        const data = await response.json();
        if (data.user) {
          setCurrentUserAvatar(data.user.avatar || "");
          setCurrentUser({
            id: data.user.id,
            fullname: data.user.fullname,
            username: data.user.username,
            avatar: data.user.avatar,
          });
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("User məlumatı alınarkən xəta:", error);
        setIsAuthenticated(false);
      }
    };

    checkCurrentUser();
  }, []);

  const commentUser =
    typeof comment.user_id === "object" ? comment.user_id : null;

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!replyText.trim() || !isAuthenticated) {
      return;
    }

    setIsCommentLoading(true);
    try {
      const response = await fetch("/api/shares/add-comment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shareId: share.id,
          content: replyText.trim(),
          parentId: comment.id,
        }),
      });

      const data = await response.json();

      if (data.success && data.data && data.data.length > 0) {
        let newReply = data.data[0];
        if (!newReply.user_id && currentUser) {
          newReply.user_id = currentUser;
        }
        setAllReplies([...allReplies, newReply]);
        setReplyText("");
      } else {
        console.error("Reply xətası:", data.message);
      }
    } catch (error) {
      console.error("Reply göndərmə xətası:", error);
    } finally {
      setIsCommentLoading(false);
    }
  };

  // Hər reply üçün nested replies-ləri tap
  const getNestedReplies = (replyId: string) => {
    return allReplies.filter((r) => r.parent_id === replyId);
  };

  const handleReplyLike = (replyId: string) => {
    setLikedReplies((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(replyId)) {
        newSet.delete(replyId);
      } else {
        newSet.add(replyId);
      }
      return newSet;
    });
  };

  const handleParentCommentLike = () => {
    setIsParentCommentLiked(!isParentCommentLiked);
  };

  return (
    <div>
      {/* Back Button */}
      <a
        href={
          comment.parent_id
            ? `/shares/${share.id}/comment/${comment.parent_id}`
            : `/shares/${share.id}`
        }
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft size={18} />
        <span className="text-sm font-medium">Geri qayıt</span>
      </a>

      {/* Parent Comment */}
      <div className="border border-slate-200 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <img
            src={commentUser?.avatar}
            alt={commentUser?.fullname}
            className="squircle w-12! h-12! object-cover shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <a
                href={`/user/@${commentUser?.username}`}
                className="font-semibold text-slate-900 hover:underline text-sm"
              >
                {commentUser?.fullname}
              </a>
              <span className="text-slate-500 text-sm">
                @{commentUser?.username}
              </span>
              <span className="text-slate-500 text-sm">·</span>
              <span className="text-slate-500 text-sm">
                {formatDistanceToNow(new Date(comment.created_at), {
                  locale: az,
                  addSuffix: true,
                })}
              </span>
            </div>
            <p className="mt-2 text-slate-900 text-sm whitespace-pre-wrap">
              {comment.content}
            </p>
            <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between text-slate-500 text-xs">
              <button className="hover:text-blue-500 transition-colors inline-flex items-center gap-1">
                <MessageCircle size={14} />
                <span>{comment.reply_count || 0}</span>
              </button>
              <button
                onClick={handleParentCommentLike}
                className={`transition-colors inline-flex items-center gap-1 ${
                  isParentCommentLiked ? "text-red-500" : "hover:text-red-500"
                }`}
              >
                <Heart
                  size={14}
                  fill={isParentCommentLiked ? "currentColor" : "none"}
                />
                <span>0</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reply Form */}
      {isAuthenticated ? (
        <form onSubmit={handleReplySubmit} className="mb-6">
          <div className="flex gap-3">
            <img
              src={currentUserAvatar}
              alt="Your avatar"
              className="squircle w-12! h-12! object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Cavab yaz..."
                className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                rows={3}
                disabled={isCommentLoading}
              />
              <div className="flex gap-2 mt-2 justify-end">
                <button
                  type="submit"
                  disabled={isCommentLoading || !replyText.trim()}
                  className="px-3 py-1.5 text-sm bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCommentLoading ? "Göndərilir..." : "Göndər"}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="p-3 bg-slate-50 rounded-lg text-center text-sm text-slate-600 mb-6">
          Cavab yazmaq üçün{" "}
          <a href="/signin" className="text-blue-600 hover:underline">
            daxil olun
          </a>
        </div>
      )}

      {/* Replies List */}
      <div className="space-y-4">
        {allReplies.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            Hələ cavab yoxdur
          </div>
        ) : (
          allReplies.map((reply) => {
            const replyUser =
              typeof reply.user_id === "object" ? reply.user_id : null;
            const nestedReplies = getNestedReplies(reply.id);
            return (
              <div
                key={reply.id}
                className="border border-slate-200 rounded-lg p-4"
              >
                <div className="flex gap-3">
                  <img
                    src={replyUser?.avatar}
                    alt={replyUser?.fullname}
                    className="squircle w-12! h-12! object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <a
                        href={`/user/@${replyUser?.username}`}
                        className="font-semibold text-slate-900 hover:underline text-sm"
                      >
                        {replyUser?.fullname}
                      </a>
                      <span className="text-slate-500 text-sm">
                        @{replyUser?.username}
                      </span>
                      <span className="text-slate-500 text-sm">·</span>
                      <span className="text-slate-500 text-sm">
                        {formatDistanceToNow(new Date(reply.created_at), {
                          locale: az,
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="mt-2 text-slate-900 text-sm whitespace-pre-wrap">
                      {reply.content}
                    </p>
                    <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between text-slate-500 text-xs">
                      <a
                        href={`/shares/${share.id}/comment/${reply.id}`}
                        className="hover:text-blue-500 transition-colors inline-flex items-center gap-1"
                      >
                        <MessageCircle size={14} />
                        <span>{reply.nested_replies_count || 0}</span>
                      </a>
                      <button
                        onClick={() => handleReplyLike(reply.id)}
                        className={`transition-colors inline-flex items-center gap-1 ${
                          likedReplies.has(reply.id)
                            ? "text-red-500"
                            : "hover:text-red-500"
                        }`}
                      >
                        <Heart
                          size={14}
                          fill={
                            likedReplies.has(reply.id) ? "currentColor" : "none"
                          }
                        />
                        <span>0</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
