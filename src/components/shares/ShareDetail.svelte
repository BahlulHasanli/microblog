<script lang="ts">
  import { formatDistanceToNow } from "date-fns";
  import { az } from "date-fns/locale";
  import { Heart, ArrowLeft, MessageCircle } from "lucide-svelte";
  import ImageGallery from "./ImageGallery.svelte";
  import { supabase } from "@/db/supabase";
  import { onMount } from "svelte";

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

  interface Props {
    share: Share;
    comments: Comment[];
  }

  let { share, comments: initialComments }: Props = $props();

  const user = typeof share.user_id === "object" ? share.user_id : null;
  let isLiked = $state(false);
  let likesCount = $state(0);
  let isLoading = $state(false);
  let currentUserId: string | null = $state(null);
  let showCommentForm = $state(false);
  let commentText = $state("");
  let isCommentLoading = $state(false);
  let isAuthenticated = $state(false);
  let allComments = $state<Comment[]>(initialComments);
  let currentUserAvatar = $state("");
  let currentUser: User | null = $state(null);
  let likedComments = $state<Set<string>>(new Set());
  let commentLikesCounts = $state<Map<string, number>>(
    new Map(initialComments.map((c) => [c.id, c.likes_count || 0]))
  );

  onMount(() => {
    // Like sayını hesabla
    const likes = share.share_likes || [];
    likesCount = likes.length;

    // Cari istifadəçinin like etib-etmədiğini yoxla
    const checkCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) {
          isAuthenticated = false;
          return;
        }
        const data = await response.json();
        if (data.user) {
          currentUserId = data.user.id;
          currentUserAvatar = data.user.avatar || "";
          currentUser = {
            id: data.user.id,
            fullname: data.user.fullname,
            username: data.user.username,
            avatar: data.user.avatar,
          };
          isAuthenticated = true;
          const userLiked = likes.some((like) => like.user_id === data.user.id);
          isLiked = userLiked;

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
            likedComments = likedIds;
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
            commentLikesCounts = counts;
          }
        } else {
          isAuthenticated = false;
        }
      } catch (error) {
        console.error("User məlumatı alınarkən xəta:", error);
        isAuthenticated = false;
      }
    };

    checkCurrentUser();
  });

  const createdDate = new Date(share.created_at);
  const timeAgo = formatDistanceToNow(createdDate, {
    locale: az,
    addSuffix: true,
  });

  // Parse image_urls əgər string olarsa
  let imageUrls = $state<string[]>([]);
  
  $effect(() => {
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
    } else {
      imageUrls = [];
    }
  });

  const handleLike = async () => {
    if (isLoading) return;

    isLoading = true;
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
        isLiked = newIsLiked;
        likesCount = newIsLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
      }
    } catch (error) {
      console.error("Like xətası:", error);
    } finally {
      isLoading = false;
    }
  };

  const handleCommentLike = async (commentId: string) => {
    try {
      const wasLiked = likedComments.has(commentId);

      // UI-ı dərhal güncəllə
      likedComments = new Set(
        wasLiked
          ? [...likedComments].filter((id) => id !== commentId)
          : [...likedComments, commentId]
      );

      // Like count-u güncəllə
      const newCounts = new Map(commentLikesCounts);
      const currentCount = newCounts.get(commentId) || 0;
      newCounts.set(commentId, wasLiked ? currentCount - 1 : currentCount + 1);
      commentLikesCounts = newCounts;

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
        likedComments = new Set(
          wasLiked
            ? [...likedComments, commentId]
            : [...likedComments].filter((id) => id !== commentId)
        );

        const revertCounts = new Map(commentLikesCounts);
        const revertCount = revertCounts.get(commentId) || 0;
        revertCounts.set(commentId, wasLiked ? revertCount + 1 : revertCount - 1);
        commentLikesCounts = revertCounts;
      }
    } catch (error) {
      console.error("Comment like xətası:", error);
      // Xəta varsa, toggle-u geri al
      likedComments = new Set(
        isLiked
          ? [...likedComments, commentId]
          : [...likedComments].filter((id) => id !== commentId)
      );

      const revertCounts = new Map(commentLikesCounts);
      const revertCount = revertCounts.get(commentId) || 0;
      const wasLikedAgain = likedComments.has(commentId);
      revertCounts.set(commentId, wasLikedAgain ? revertCount + 1 : revertCount - 1);
      commentLikesCounts = revertCounts;
    }
  };

  const handleCommentSubmit = async (e: Event) => {
    e.preventDefault();

    if (!commentText.trim() || !isAuthenticated) {
      return;
    }

    isCommentLoading = true;
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
        allComments = [...allComments, newComment];
        commentText = "";
      } else {
        console.error("Comment xətası:", data.message);
      }
    } catch (error) {
      console.error("Comment göndərmə xətası:", error);
    } finally {
      isCommentLoading = false;
    }
  };

  // Parent comments-ləri filter et
  const parentComments = $derived(allComments.filter((c) => !c.parent_id));

  // Hər comment üçün replies-ləri tap
  const getReplies = (commentId: string) => {
    return allComments.filter((c) => c.parent_id === commentId);
  };

  // Recursive comment render
  const renderCommentThread = (comment: Comment, depth: number = 0) => {
    const commentUser =
      typeof comment.user_id === "object" ? comment.user_id : null;
    const replies = getReplies(comment.id);

    return {
      commentUser,
      replies,
      isNested: depth > 0,
    };
  };
</script>

<div>
  <!-- Back Button -->
  <a
    href="/"
    class="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
  >
    <ArrowLeft size={18} />
    <span class="text-sm font-medium">Geri qayıt</span>
  </a>

  <!-- Share Detail -->
  <div class="border border-slate-200 rounded-lg overflow-hidden">
    <div class="p-4 sm:p-6">
      <div class="flex gap-3 sm:gap-4">
        <!-- Avatar -->
        <div class="shrink-0">
          <img
            src={user?.avatar}
            alt={user?.fullname}
            class="squircle w-12! h-12! object-cover"
          />
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <!-- Header -->
          <div class="flex items-baseline gap-2 flex-wrap">
            <a
              href={`/user/@${user?.username}`}
              class="font-semibold text-slate-900 hover:underline text-[14px]"
            >
              {user?.fullname}
            </a>
            <span class="text-slate-500 text-[13px]">
              @{user?.username}
            </span>
            <span class="text-slate-500 text-[13px]">·</span>
            <span class="text-slate-500 text-[13px]">{timeAgo}</span>
          </div>

          <!-- Share Content -->
          <p class="mt-2 text-slate-900 text-[14px] wrap-break-word whitespace-pre-wrap">
            {share.content}
          </p>

          <!-- Share Images -->
          {#if imageUrls.length > 0}
            <ImageGallery images={imageUrls} />
          {/if}

          <!-- YouTube Video -->
          {#if share.youtube_video_id}
            <div class="mt-3 aspect-video bg-slate-900 rounded-lg overflow-hidden">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${share.youtube_video_id}`}
                title="YouTube video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
              ></iframe>
            </div>
          {/if}

          <!-- Actions -->
          <div class="mt-4 pt-4 border-t border-slate-200 flex justify-between text-slate-500 text-sm">
            <button class="cursor-pointer flex items-center gap-2 hover:text-blue-500 transition-colors">
              <MessageCircle size={16} />
              <span>{allComments.length}</span>
            </button>
            <button
              onclick={handleLike}
              disabled={isLoading}
              class={`cursor-pointer flex items-center gap-2 transition-colors ${
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

  <!-- Comments Section -->
  <div class="mt-6">
    <!-- Comment Form -->
    {#if isAuthenticated}
      <form onsubmit={handleCommentSubmit} class="mb-6">
        <div class="flex gap-3 sm:gap-4">
          <img
            src={currentUserAvatar}
            alt="Your avatar"
            class="squircle w-12! h-12! object-cover shrink-0"
          />
          <div class="flex-1 min-w-0">
            <textarea
              bind:value={commentText}
              placeholder="Cavab yaz..."
              class="w-full p-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
              rows={3}
              disabled={isCommentLoading}
            ></textarea>
            <div class="flex gap-2 mt-2 justify-end">
              <button
                type="submit"
                disabled={isCommentLoading || !commentText.trim()}
                class="px-3 py-1.5 text-sm bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCommentLoading ? "Göndərilir..." : "Göndər"}
              </button>
            </div>
          </div>
        </div>
      </form>
    {:else}
      <div class="p-3 bg-slate-50 rounded-lg text-center text-sm text-slate-600 mb-6">
        Şərh yazmaq üçün
        <a href="/signin" class="text-blue-600 hover:underline">
          daxil olun
        </a>
      </div>
    {/if}

    <!-- Comments List -->
    <div class="space-y-6">
      {#if parentComments.length === 0}
        <div class="text-center py-8 text-slate-500 text-[13px]">
          Hələ şərh yoxdur
        </div>
      {:else}
        <div class="border border-slate-200 rounded-lg p-4 sm:p-6 space-y-4">
          {#each parentComments as comment (comment.id)}
            {@const { commentUser, replies, isNested } = renderCommentThread(comment, 0)}
            <div>
              <div class="flex gap-3">
                <img
                  src={commentUser?.avatar}
                  alt={commentUser?.fullname}
                  class="squircle object-cover shrink-0 w-12! h-12!"
                />
                <div class="flex-1 min-w-0">
                  <div class="flex items-baseline gap-2 flex-wrap">
                    <a
                      href={`/user/@${commentUser?.username}`}
                      class="font-semibold text-slate-900 hover:underline text-[14px]"
                    >
                      {commentUser?.fullname}
                    </a>
                    <span class="text-slate-500 text-[13px]">
                      @{commentUser?.username}
                    </span>
                    <span class="text-slate-500 text-[13px]">·</span>
                    <a
                      href={`/shares/${share.id}/comment/${comment.id}`}
                      class="text-slate-500 hover:text-slate-900 text-[13px]"
                    >
                      {formatDistanceToNow(new Date(comment.created_at), {
                        locale: az,
                        addSuffix: true,
                      })}
                    </a>
                  </div>
                  <p class="mt-1 text-slate-900 whitespace-pre-wrap text-sm">
                    {comment.content}
                  </p>
                  <div class="mt-4 pt-2 border-t border-slate-200 flex justify-between text-slate-500 text-sm">
                    <a
                      href={`/shares/${share.id}/comment/${comment.id}`}
                      class="hover:text-blue-500 transition-colors inline-flex items-center gap-1"
                    >
                      <MessageCircle size={16} />
                      <span>{replies.length || 0}</span>
                    </a>
                    <button
                      onclick={() => handleCommentLike(comment.id)}
                      class={`transition-colors inline-flex items-center gap-1 ${
                        likedComments.has(comment.id)
                          ? "text-red-500"
                          : "hover:text-red-500"
                      }`}
                    >
                      <Heart
                        size={16}
                        fill={likedComments.has(comment.id) ? "currentColor" : "none"}
                      />
                      <span>{commentLikesCounts.get(comment.id) || 0}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
