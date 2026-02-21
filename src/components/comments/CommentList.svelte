<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '@/db/supabase';
  import CommentForm from './CommentForm.svelte';
  import { navigate } from "astro:transitions/client";
  import { formatSimpleDate } from "@/utils/date";

  let {postSlug, user} = $props();

  interface Comment {
    id: number;
    content: string;
    created_at: string;
    updated_at: string;
    user_id: string;
    post_slug: string;
    parent_id: number | null;
    user_email: string;
    user_name: string;
    user_fullname?: string;
    user_avatar?: string;
    reply_count?: number;
  }

  let comments: Comment[] = $state([]);
  let loading = $state(true);
  let error = $state('');

  // Only show parent comments (no parent_id)
  const parentComments = $derived(comments.filter(comment => comment.parent_id === null));

  async function fetchComments() {
    loading = true;

    try {
      // Fetch only parent comments
      const { data, error: supabaseError } = await supabase
        .from('comments')
        .select(`
          *,
          users:user_id (avatar, fullname)
        `)
        .eq('post_slug', postSlug)
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (supabaseError) throw supabaseError;

      // Get reply counts for each comment
      const commentsWithCounts = await Promise.all(
        (data || []).map(async (comment) => {
          const { count } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('parent_id', comment.id);

          return {
            ...comment,
            user_avatar: comment.users?.avatar || null,
            user_fullname: comment.users?.fullname || comment.user_name,
            reply_count: count || 0
          };
        })
      );

      comments = commentsWithCounts;
    } catch (err) {
      console.error('Error fetching comments:', err);
      error = 'Şərhlər yüklənərkən xəta baş verdi';
    } finally {
      loading = false;
    }
  }

  function navigateToComment(commentId: number) {
    navigate(`/posts/comment/${postSlug}/${commentId}`);
  }

  function navigateToProfile(username: string) {
    navigate(`/@${username}`);
  }

  onMount(() => {
    fetchComments();
  });
</script>

  <CommentForm
    {postSlug}
    {user}
    onCommentAdded={fetchComments}
  />

  {#if loading}
    <div class="py-6 text-center font-display">
      <span class="shimmer-text">Şərhlər yüklənir</span>
    </div>
  {:else if error}
    <div class="py-4 text-center text-red-600 font-display">{error}</div>
  {:else if parentComments.length === 0}
    <div class="py-6 text-center text-zinc-500 font-display">İlk şərh yazan sən ol!</div>
  {:else}
    <div class="border-t border-zinc-100 pt-2">
      {#each parentComments as comment (comment.id)}
        <div class="w-full text-left mt-6">
          <div class="flex items-start gap-3">
            <div class="flex-shrink-0">
              {#if comment.user_id && comment.user_avatar}
                <button
                  type="button"
                  onclick={(e) => {
                    e.stopPropagation();
                    navigateToProfile(comment.user_name);
                  }}
                  class="cursor-pointer overflow-hidden !size-10 squircle hover:opacity-80 transition-opacity"
                >
                  <img
                    src={comment.user_avatar}
                    alt={comment.user_name}
                    class="w-full h-full object-cover"
                  />
                </button>
              {:else if comment.user_id}
                <button
                  type="button"
                  onclick={(e) => {
                    e.stopPropagation();
                    navigateToProfile(comment.user_name);
                  }}
                  class="w-10 h-10 rounded-xl flex items-center justify-center bg-zinc-100 text-zinc-700 font-nouvelr-semibold cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {(comment.user_fullname || comment.user_name).charAt(0).toUpperCase()}
                </button>
              {:else}
                <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-zinc-100 text-zinc-700 font-nouvelr-semibold">
                  {(comment.user_fullname || 'Q').charAt(0).toUpperCase()}
                </div>
              {/if}
            </div>
            <div class="flex-grow">
              <div class="flex justify-between items-start">
                <div>
                  {#if comment.user_id}
                    <button
                      type="button"
                      onclick={(e) => {
                        e.stopPropagation();
                        navigateToProfile(comment.user_name);
                      }}
                      class="cursor-pointer hover:text-blue-600 transition-colors text-left block w-full"
                    >
                      <h4 class="font-nouvelr-semibold text-base-800">{comment.user_fullname}</h4>
                    </button>
                    <button
                      type="button"
                      onclick={(e) => {
                        e.stopPropagation();
                        navigateToProfile(comment.user_name);
                      }}
                      class="block w-full text-xs text-zinc-500 font-nouvelr cursor-pointer hover:text-blue-600 transition-colors text-left"
                    >
                      @{comment.user_name}
                    </button>
                  {:else}
                    <div class="text-left">
                      <h4 class="font-nouvelr-semibold text-base-800">{comment.user_fullname}</h4>
                      <span class="text-xs text-zinc-500 font-nouvelr block w-full">Qonaq</span>
                    </div>
                  {/if}
                </div>
                <span class="text-xs text-zinc-400 font-nouvelr">{formatSimpleDate(comment.created_at)}</span>
              </div>
              <button
                type="button"
                onclick={() => navigateToComment(comment.id)}
                class="w-full text-left cursor-pointer"
              >
                <p class="mt-2 text-base-700 font-display text-[14px] line-clamp-3">{comment.content}</p>
              </button>

               <div class="flex items-center gap-5">
                <button
                  type="button"
                  onclick={() => navigateToComment(comment.id)}
                  class="mt-3 flex items-center gap-2 text-xs text-blue-600 font-display hover:text-blue-300 cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                  </svg>

                  Cavab
                </button>

                <button
                  type="button"
                  onclick={() => navigateToComment(comment.id)}
                  class="mt-3 flex items-center gap-1 text-xs text-blue-600 font-display hover:text-blue-300 cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
                  </svg>
                  {comment.reply_count}
                </button>
               </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}

<style lang="css">
  .shimmer-text {
    display: inline-block;
    color: transparent;
    background: linear-gradient(90deg, #cccccc 25%, #b4b4b4 50%, #9b9b9b 75%);
    background-size: 200% 100%;
    background-clip: text;
    -webkit-background-clip: text;
    animation: shimmer 2s infinite linear;
    font-size: 1.1rem;
    font-weight: 500;
  }

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
</style>
