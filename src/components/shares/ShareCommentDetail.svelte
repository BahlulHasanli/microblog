<script lang="ts">
  import { formatDistanceToNow } from "date-fns";
  import { az } from "date-fns/locale";
  import { ArrowLeft, MessageCircle, Heart } from "lucide-svelte";
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
    likes_count?: number;
  }

  interface Props {
    share: Share;
    comment: Comment;
    replies: Comment[];
  }

  let { share, comment, replies: initialReplies }: Props = $props();

  let replyText = $state("");
  let isCommentLoading = $state(false);
  let isAuthenticated = $state(false);
  let currentUser: User | null = $state(null);
  let currentUserAvatar = $state("");
  let allReplies = $state<Comment[]>(initialReplies);
  let likedReplies = $state<Set<string>>(new Set());
  let isParentCommentLiked = $state(false);
  let parentCommentLikesCount = $state(comment.likes_count || 0);
  let replyLikesCounts = $state<Map<string, number>>(
    new Map(initialReplies.map((r) => [r.id, r.likes_count || 0]))
  );
  let displayLimit = $state(10);
  let isLoadingMore = $state(false);
  let repliesContainer: HTMLDivElement | undefined = $state();

  onMount(() => {
    const checkCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) {
          isAuthenticated = false;
          return;
        }
        const data = await response.json();
        if (data.user) {
          currentUserAvatar = data.user.avatar || "";
          currentUser = {
            id: data.user.id,
            fullname: data.user.fullname,
            username: data.user.username,
            avatar: data.user.avatar,
          };
          isAuthenticated = true;

          // Cari istifadəçinin like etdiyi comment-ləri yoxla
          const { data: likedCommentIds } = await supabase
            .from("share_comment_likes")
            .select("comment_id")
            .eq("user_id", data.user.id)
            .in("comment_id", [comment.id, ...allReplies.map((r) => r.id)]);

          if (likedCommentIds) {
            const likedIds = new Set(
              likedCommentIds.map((like: any) => like.comment_id)
            );
            if (likedIds.has(comment.id)) {
              isParentCommentLiked = true;
            }
            likedReplies = new Set(
              allReplies.filter((r) => likedIds.has(r.id)).map((r) => r.id)
            );
          }

          // Bütün comment-lərin like count-larını fetch et
          const { data: allLikeCounts } = await supabase
            .from("share_comment_likes")
            .select("comment_id")
            .in("comment_id", [comment.id, ...allReplies.map((r) => r.id)]);

          if (allLikeCounts) {
            // Parent comment like count
            const parentLikeCount = allLikeCounts.filter(
              (like: any) => like.comment_id === comment.id
            ).length;
            parentCommentLikesCount = parentLikeCount;

            // Replies like counts
            const replyCounts = new Map<string, number>();
            allReplies.forEach((reply) => {
              const count = allLikeCounts.filter(
                (like: any) => like.comment_id === reply.id
              ).length;
              replyCounts.set(reply.id, count);
            });
            replyLikesCounts = replyCounts;
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

  const commentUser =
    typeof comment.user_id === "object" ? comment.user_id : null;

  const handleReplySubmit = async (e: Event) => {
    e.preventDefault();

    if (!replyText.trim() || !isAuthenticated) {
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
        allReplies = [...allReplies, newReply];
        replyText = "";
      } else {
        console.error("Reply xətası:", data.message);
      }
    } catch (error) {
      console.error("Reply göndərmə xətası:", error);
    } finally {
      isCommentLoading = false;
    }
  };

  // Hər reply üçün nested replies-ləri tap
  const getNestedReplies = (replyId: string) => {
    return allReplies.filter((r) => r.parent_id === replyId);
  };

  const handleReplyLike = async (replyId: string) => {
    const wasLiked = likedReplies.has(replyId);
    
    try {
      // Əvvəlcə UI-ı güncəllə
      likedReplies = new Set(
        wasLiked
          ? [...likedReplies].filter((id) => id !== replyId)
          : [...likedReplies, replyId]
      );

      // Like count-u güncəllə
      const newCounts = new Map(replyLikesCounts);
      const currentCount = newCounts.get(replyId) || 0;
      newCounts.set(replyId, wasLiked ? currentCount - 1 : currentCount + 1);
      replyLikesCounts = newCounts;

      // Sonra API-yə göndər
      const response = await fetch("/api/shares/toggle-comment-like", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          commentId: replyId,
        }),
      });

      const data = await response.json();
      console.log("Like response:", data);

      if (!data.success) {
        console.error("Like failed:", data.message);
        // API xətası varsa, toggle-u geri al
        likedReplies = new Set(
          wasLiked
            ? [...likedReplies, replyId]
            : [...likedReplies].filter((id) => id !== replyId)
        );

        const revertCounts = new Map(replyLikesCounts);
        const revertCount = revertCounts.get(replyId) || 0;
        revertCounts.set(replyId, wasLiked ? revertCount + 1 : revertCount - 1);
        replyLikesCounts = revertCounts;
      }
    } catch (error) {
      console.error("Like xətası:", error);
      // Xəta varsa, toggle-u geri al
      likedReplies = new Set(
        wasLiked
          ? [...likedReplies, replyId]
          : [...likedReplies].filter((id) => id !== replyId)
      );

      const revertCounts = new Map(replyLikesCounts);
      const revertCount = revertCounts.get(replyId) || 0;
      const wasLikedAgain = likedReplies.has(replyId);
      revertCounts.set(replyId, wasLikedAgain ? revertCount + 1 : revertCount - 1);
      replyLikesCounts = revertCounts;
    }
  };

  const handleParentCommentLike = async () => {
    try {
      const isLiked = isParentCommentLiked;

      // Əvvəlcə UI-ı güncəllə
      isParentCommentLiked = !isParentCommentLiked;

      // Like count-u güncəllə
      parentCommentLikesCount = isLiked ? parentCommentLikesCount - 1 : parentCommentLikesCount + 1;

      // Sonra API-yə göndər
      const response = await fetch("/api/shares/toggle-comment-like", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          commentId: comment.id,
        }),
      });

      const data = await response.json();
      console.log("Parent comment like response:", data);

      if (!data.success) {
        console.error("Parent comment like failed:", data.message);
        // API xətası varsa, toggle-u geri al
        isParentCommentLiked = !isParentCommentLiked;
        parentCommentLikesCount = isLiked ? parentCommentLikesCount + 1 : parentCommentLikesCount - 1;
      }
    } catch (error) {
      console.error("Parent comment like xətası:", error);
      // Xəta varsa, toggle-u geri al
      isParentCommentLiked = !isParentCommentLiked;
      parentCommentLikesCount = isParentCommentLiked ? parentCommentLikesCount + 1 : parentCommentLikesCount - 1;
    }
  };

  // Infinity scroll handler
  const handleLoadMore = () => {
    if (isLoadingMore || displayLimit >= allReplies.length) return;
    isLoadingMore = true;
    
    // Simulate loading delay
    setTimeout(() => {
      displayLimit += 10;
      isLoadingMore = false;
    }, 300);
  };

  // Intersection Observer for infinite scroll
  $effect(() => {
    if (!repliesContainer) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayLimit < allReplies.length) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    const sentinel = repliesContainer.querySelector('[data-sentinel]');
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => {
      observer.disconnect();
    };
  });
</script>

<div>
  <!-- Back Button -->
  <a
    href={`/shares/${share.id}`}
    class="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
  >
    <ArrowLeft size={18} />
    <span class="text-sm font-medium">Geri qayıt</span>
  </a>

  <!-- Parent Comment -->
  <div class="p-4 sm:p-6 border-b border-slate-100">
    <div class="flex gap-3 sm:gap-4">
      <img
        src={commentUser?.avatar}
        alt={commentUser?.fullname}
        class="squircle w-10! sm:w-12! h-10! sm:h-12! object-cover shrink-0"
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
          <span class="text-slate-500 text-[13px]">
            {formatDistanceToNow(new Date(comment.created_at), {
              locale: az,
              addSuffix: true,
            })}
          </span>
        </div>
        <p class="mt-2 text-slate-900 text-[13px] whitespace-pre-wrap">
          {comment.content}
        </p>
        <div class="mt-3 flex justify-between text-slate-500 text-sm transition-opacity">
          <button class="hover:text-blue-500 transition-colors inline-flex items-center gap-1">
            <MessageCircle size={16} />
            <span>{comment.reply_count || 0}</span>
          </button>
          {#if isAuthenticated}
            <button
              onclick={handleParentCommentLike}
              class={`transition-colors inline-flex items-center gap-1 ${
                isParentCommentLiked ? "text-red-500" : "hover:text-red-500"
              }`}
            >
              <Heart
                size={16}
                fill={isParentCommentLiked ? "currentColor" : "none"}
              />
              <span>{parentCommentLikesCount}</span>
            </button>
          {:else}
            <div class="inline-flex items-center gap-1 text-slate-400 cursor-not-allowed" title="Like etmək üçün daxil olun">
              <Heart size={16} />
              <span>{parentCommentLikesCount}</span>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>

  <!-- Reply Form -->
  {#if isAuthenticated}
    <form onsubmit={handleReplySubmit} class="mt-6">
      <div class="flex gap-3 sm:gap-4">
        <img
          src={currentUserAvatar}
          alt="Your avatar"
          class="squircle w-12! h-12! object-cover shrink-0"
        />
        <div class="flex-1 min-w-0">
          <textarea
            bind:value={replyText}
            placeholder="Cavab yaz..."
            class="w-full p-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
            rows={3}
            disabled={isCommentLoading}
          ></textarea>
          <div class="flex gap-2 mt-2 justify-end">
            <button
              type="submit"
              disabled={isCommentLoading || !replyText.trim()}
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
      Cavab yazmaq üçün
      <a href="/signin" class="text-blue-600 hover:underline">
        daxil olun
      </a>
    </div>
  {/if}

  <!-- Replies List -->
  <div class="space-y-6" bind:this={repliesContainer}>
    {#if allReplies.length === 0}
      <div class="text-center text-[13px] py-8 text-slate-500">
        Hələ cavab yoxdur
      </div>
    {:else}
      {#each allReplies.slice(0, displayLimit) as reply (reply.id)}
        {@const replyUser = typeof reply.user_id === "object" ? reply.user_id : null}
        <div class="p-4 sm:p-6 border-b border-slate-100 last:border-b-0!">
          <div class="flex gap-3 sm:gap-4">
            <img
              src={replyUser?.avatar}
              alt={replyUser?.fullname}
              class="squircle w-10! sm:w-12! h-10! sm:h-12! object-cover shrink-0"
            />
            <div class="flex-1 min-w-0">
              <div class="flex items-baseline gap-2 flex-wrap">
                <a
                  href={`/user/@${replyUser?.username}`}
                  class="font-semibold text-slate-900 hover:underline text-[14px]"
                >
                  {replyUser?.fullname}
                </a>
                <span class="text-slate-500 text-[13px]">
                  @{replyUser?.username}
                </span>
                <span class="text-slate-500 text-[13px]">·</span>
                <span class="text-slate-500 text-[13px]">
                  {formatDistanceToNow(new Date(reply.created_at), {
                    locale: az,
                    addSuffix: true,
                  })}
                </span>
              </div>
              <p class="mt-2 text-slate-900 text-[13px] whitespace-pre-wrap">
                {reply.content}
              </p>
              <div class="mt-3 flex justify-between text-slate-500 text-sm transition-opacity">
                <a
                  href={`/shares/${share.id}/comment/${reply.id}`}
                  class="hover:text-blue-500 transition-colors inline-flex items-center gap-1"
                >
                  <MessageCircle size={16} />
                  <span>{reply.nested_replies_count || 0}</span>
                </a>
                {#if isAuthenticated}
                  <button
                    onclick={() => handleReplyLike(reply.id)}
                    class={`transition-colors inline-flex items-center gap-1 ${
                      likedReplies.has(reply.id)
                        ? "text-red-500"
                        : "hover:text-red-500"
                    }`}
                  >
                    <Heart
                      size={16}
                      fill={
                        likedReplies.has(reply.id) ? "currentColor" : "none"
                      }
                    />
                    <span>{replyLikesCounts.get(reply.id) || 0}</span>
                  </button>
                {:else}
                  <div class="inline-flex items-center gap-1 text-slate-400 cursor-not-allowed" title="Like etmək üçün daxil olun">
                    <Heart size={16} />
                    <span>{replyLikesCounts.get(reply.id) || 0}</span>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        </div>
      {/each}

      <!-- Loading indicator -->
      {#if isLoadingMore}
        <div class="text-center py-4">
          <div class="inline-block">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900"></div>
          </div>
        </div>
      {/if}

      <!-- Sentinel for infinite scroll -->
      {#if displayLimit < allReplies.length}
        <div data-sentinel class="h-4"></div>
      {/if}
    {/if}
  </div>
</div>
