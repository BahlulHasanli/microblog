import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { az } from "date-fns/locale";
import { Heart, Share2, ArrowLeft, MessageCircle } from "lucide-react";
import ImageGallery from "./ImageGallery";
import { supabase } from "@/db/supabase";

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
  image_urls?: string[] | null;
  youtube_video_id?: string | null;
  created_at: string;
  updated_at: string;
  replies_count: number;
  users?: User;
  share_likes?: Array<{ id: string; user_id: string }>;
}

interface Comment {
  id: string;
  share_id: string;
  user_id: string | User;
  content: string;
  created_at: string;
  parent_id?: string | null;
  users?: User;
  reply_count?: number;
  likes_count?: number;
}

interface ShareDetailProps {
  share: Share;
  comments: Comment[];
}

export default function ShareDetail({ share, comments }: ShareDetailProps) {
  const user = typeof share.user_id === "object" ? share.user_id : null;
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isCommentLoading, setIsCommentLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [allComments, setAllComments] = useState<Comment[]>(comments);
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [commentLikesCounts, setCommentLikesCounts] = useState<
    Map<string, number>
  >(new Map(comments.map((c) => [c.id, c.likes_count || 0])));

  useEffect(() => {
    // Like sayını hesabla
    const likes = share.share_likes || [];
    setLikesCount(likes.length);

    // Cari istifadəçinin like etib-etmədiğini yoxla
    const checkCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) {
          setIsAuthenticated(false);
          return;
        }
        const data = await response.json();
        if (data.user) {
          setCurrentUserId(data.user.id);
          setCurrentUserAvatar(data.user.avatar || "");
          setCurrentUser({
            id: data.user.id,
            fullname: data.user.fullname,
            username: data.user.username,
            avatar: data.user.avatar,
          });
          setIsAuthenticated(true);
          const userLiked = likes.some((like) => like.user_id === data.user.id);
          setIsLiked(userLiked);

          // Cari istifadəçinin like etdiyi comment-ləri yoxla
          const { data: likedCommentIds } = await supabase
            .from("share_comment_likes")
            .select("comment_id")
            .eq("user_id", data.user.id)
            .in(
              "comment_id",
              allComments.map((c) => c.id)
            );

          if (likedCommentIds) {
            const likedIds = new Set(
              likedCommentIds.map((like: any) => like.comment_id)
            );
            setLikedComments(likedIds);
          }

          // Bütün comment-lərin like count-larını fetch et
          const { data: allLikeCounts } = await supabase
            .from("share_comment_likes")
            .select("comment_id")
            .in(
              "comment_id",
              allComments.map((c) => c.id)
            );

          if (allLikeCounts) {
            const counts = new Map<string, number>();
            allComments.forEach((comment) => {
              const count = allLikeCounts.filter(
                (like: any) => like.comment_id === comment.id
              ).length;
              counts.set(comment.id, count);
            });
            setCommentLikesCounts(counts);
          }
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
      }
    } catch (error) {
      console.error("Like xətası:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommentLike = async (commentId: string) => {
    try {
      const wasLiked = likedComments.has(commentId);

      // UI-ı dərhal güncəllə
      setLikedComments((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(commentId)) {
          newSet.delete(commentId);
        } else {
          newSet.add(commentId);
        }
        return newSet;
      });

      // Like count-u güncəllə
      setCommentLikesCounts((prev) => {
        const newMap = new Map(prev);
        const currentCount = newMap.get(commentId) || 0;
        newMap.set(commentId, wasLiked ? currentCount - 1 : currentCount + 1);
        return newMap;
      });

      // API-yə göndər
      const response = await fetch("/api/shares/toggle-comment-like", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          commentId: commentId,
        }),
      });

      const data = await response.json();
      console.log("Comment like response:", data);

      if (!data.success) {
        console.error("Comment like failed:", data.message);
        // API xətası varsa, toggle-u geri al
        setLikedComments((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(commentId)) {
            newSet.delete(commentId);
          } else {
            newSet.add(commentId);
          }
          return newSet;
        });

        setCommentLikesCounts((prev) => {
          const newMap = new Map(prev);
          const currentCount = newMap.get(commentId) || 0;
          newMap.set(commentId, wasLiked ? currentCount + 1 : currentCount - 1);
          return newMap;
        });
      }
    } catch (error) {
      console.error("Comment like xətası:", error);
      // Xəta varsa, toggle-u geri al
      setLikedComments((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(commentId)) {
          newSet.delete(commentId);
        } else {
          newSet.add(commentId);
        }
        return newSet;
      });

      setCommentLikesCounts((prev) => {
        const newMap = new Map(prev);
        const currentCount = newMap.get(commentId) || 0;
        const wasLiked = likedComments.has(commentId);
        newMap.set(commentId, wasLiked ? currentCount + 1 : currentCount - 1);
        return newMap;
      });
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!commentText.trim() || !isAuthenticated) {
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
          content: commentText.trim(),
        }),
      });

      const data = await response.json();

      if (data.success && data.data && data.data.length > 0) {
        // Yeni comment-i state-ə əlavə et
        let newComment = data.data[0];
        // Əgər user məlumatı yoxdursa, current user məlumatını əlavə et
        if (!newComment.user_id && currentUser) {
          newComment.user_id = currentUser;
        }
        setAllComments([...allComments, newComment]);
        setCommentText("");
      } else {
        console.error("Comment xətası:", data.message);
      }
    } catch (error) {
      console.error("Comment göndərmə xətası:", error);
    } finally {
      setIsCommentLoading(false);
    }
  };

  // Parent comments-ləri filter et
  const parentComments = allComments.filter((c) => !c.parent_id);

  // Hər comment üçün replies-ləri tap
  const getReplies = (commentId: string) => {
    return allComments.filter((c) => c.parent_id === commentId);
  };

  // Recursive comment render
  const renderCommentThread = (comment: Comment, depth: number = 0) => {
    const commentUser =
      typeof comment.user_id === "object" ? comment.user_id : null;
    const replies = getReplies(comment.id);
    const isNested = depth > 0;

    return (
      <div
        key={comment.id}
        className={`flex gap-3 ${isNested ? "ml-4 pl-4 border-l-2 border-slate-200" : ""}`}
      >
        <img
          src={commentUser?.avatar}
          alt={commentUser?.fullname}
          className={`squircle object-cover shrink-0 ${isNested ? "w-8 h-8" : "w-12! h-12!"}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <a
              href={`/user/@${commentUser?.username}`}
              className={`font-semibold text-slate-900 hover:underline ${isNested ? "text-xs" : "text-sm"}`}
            >
              {commentUser?.fullname}
            </a>
            <span
              className={`text-slate-500 ${isNested ? "text-xs" : "text-sm"}`}
            >
              @{commentUser?.username}
            </span>
            <span
              className={`text-slate-500 ${isNested ? "text-xs" : "text-sm"}`}
            >
              ·
            </span>
            <a
              href={`/shares/${share.id}/comment/${comment.id}`}
              className={`text-slate-500 hover:text-slate-900 ${isNested ? "text-xs" : "text-sm"}`}
            >
              {formatDistanceToNow(new Date(comment.created_at), {
                locale: az,
                addSuffix: true,
              })}
            </a>
          </div>
          <p
            className={`mt-1 text-slate-900 whitespace-pre-wrap ${isNested ? "text-xs" : "text-sm"}`}
          >
            {comment.content}
          </p>
          <div
            className={`mt-4 pt-2 border-t border-slate-200 flex justify-between text-slate-500 ${isNested ? "text-xs" : "text-sm"}`}
          >
            <a
              href={`/shares/${share.id}/comment/${comment.id}`}
              className="hover:text-blue-500 transition-colors inline-flex items-center gap-1"
            >
              <MessageCircle size={14} />
              <span>{replies.length || 0}</span>
            </a>
            <button
              onClick={() => handleCommentLike(comment.id)}
              className={`transition-colors inline-flex items-center gap-1 ${
                likedComments.has(comment.id)
                  ? "text-red-500"
                  : "hover:text-red-500"
              }`}
            >
              <Heart
                size={14}
                fill={likedComments.has(comment.id) ? "currentColor" : "none"}
              />
              <span>{commentLikesCounts.get(comment.id) || 0}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Back Button */}
      <a
        href="/"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft size={18} />
        <span className="text-sm font-medium">Geri qayıt</span>
      </a>

      {/* Share Detail */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-4 sm:p-6">
          <div className="flex gap-3 sm:gap-4">
            {/* Avatar */}
            <div className="shrink-0">
              <img
                src={user?.avatar}
                alt={user?.fullname}
                className="squircle w-12! h-12! object-cover"
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
                <span className="text-slate-500 text-sm">
                  @{user?.username}
                </span>
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
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between text-slate-500 text-sm">
                <button className="cursor-pointer flex items-center gap-2 hover:text-blue-500 transition-colors">
                  <MessageCircle size={16} />
                  <span>{allComments.length}</span>
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
      </div>

      {/* Comments Section */}
      <div className="mt-6">
        {/* Comment Form */}
        {isAuthenticated ? (
          <form onSubmit={handleCommentSubmit} className="mb-6">
            <div className="flex gap-3">
              <img
                src={currentUserAvatar}
                alt="Your avatar"
                className="squircle w-12! h-12! object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Cavab yaz..."
                  className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                  rows={3}
                  disabled={isCommentLoading}
                />
                <div className="flex gap-2 mt-2 justify-end">
                  <button
                    type="submit"
                    disabled={isCommentLoading || !commentText.trim()}
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
            Şərh yazmaq üçün{" "}
            <a href="/signin" className="text-blue-600 hover:underline">
              daxil olun
            </a>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-6">
          {parentComments.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              Hələ şərh yoxdur
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg p-4 space-y-4">
              {parentComments.map((comment) => (
                <div key={comment.id}>{renderCommentThread(comment, 0)}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
