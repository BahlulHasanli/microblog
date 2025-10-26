<script lang="ts">
  import { onMount } from 'svelte';
  import { formatDate as formatDateUtil } from '@/utils/date';
  import { supabase } from '@/db/supabase';
  import CommentForm from './CommentForm.svelte';
  import { categories, slugifyCategory } from '@/data/categories';
  import { formatSimpleDate } from '@/utils/date';
  import { navigate } from "astro:transitions/client";

  let { postSlug, commentId, initialComment, initialReplies, initialUser, backUrl, postTitle, postDescription, postImage, postImageAlt, postCategories } = $props();
  
  // Get category name from slug
  function getCategoryName(categorySlug: string): string {
    const category = categories.find(cat => cat.slug === categorySlug);
    return category ? category.name : categorySlug;
  }

  interface Comment {
    id: number;
    content: string;
    created_at: string;
    user_id: string;
    post_slug: string;
    parent_id: number | null;
    user_name: string;
    user_fullname?: string;
    user_avatar?: string;
    reply_count?: number;
  }

  let comment: Comment = $state(initialComment);
  let replies: Comment[] = $state(initialReplies);
  let user = $state(initialUser);
  let loading = $state(false);

  async function fetchReplies() {
    loading = true;
    try {
      const { data, error: repliesError } = await supabase
        .from('comments')
        .select('*')
        .eq('parent_id', commentId)
        .order('created_at', { ascending: true });

      if (repliesError) throw repliesError;

      // Get reply counts and user info for each reply
      const processedReplies = await Promise.all(
        (data || []).map(async (reply) => {
          // Get reply count
          const { count } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('parent_id', reply.id);

          // Get user info
          const { data: userData } = await supabase
            .from('users')
            .select('avatar, fullname')
            .eq('id', reply.user_id)
            .single();

          return {
            ...reply,
            user_avatar: userData?.avatar || null,
            user_fullname: userData?.fullname || reply.user_name,
            reply_count: count || 0
          };
        })
      );

      replies = processedReplies;
    } catch (err) {
      console.error('Error fetching replies:', err);
    } finally {
      loading = false;
    }
  }

  function handleCommentAdded() {
    fetchReplies();
  }

  function navigateToProfile(username: string) {
    navigate(`/user/@${username}`);
  }
</script>

<div class="max-w-2xl mx-auto px-4 py-8">
  <!-- Post info -->
  {#if postTitle}
    <div class="mb-6 pb-6 border-b border-zinc-100">
      <div class="flex gap-4">
        {#if postImage}
          <a 
            href={`/posts/${postSlug}`}
            class="flex-shrink-0 w-24 h-24 overflow-hidden rounded-xl"
          >
            <img 
              src={postImage} 
              alt={postImageAlt || postTitle}
              class="w-full h-full object-cover"
            />
          </a>
        {/if}
        <div class="flex-grow">
          <a href={`/posts/${postSlug}`} class="group">
            <h2 class="text-lg font-nouvelr-semibold text-base-800 group-hover:text-rose-600 transition-colors">
              {postTitle}
            </h2>
            {#if postDescription}
              <p class="text-sm text-zinc-600 font-nouvelr mt-2 line-clamp-2">
                {postDescription}
              </p>
            {/if}
          </a>
          {#if postCategories && postCategories.length > 0}
            <div class="flex flex-wrap gap-2 mt-3">
              {#each postCategories.slice(0, 3) as categorySlug}
                <a 
                  href={`/category/${categorySlug}`}
                  class="inline-flex items-center text-xs font-nouvelr text-yellow-700 hover:text-yellow-900 hover:underline transition-colors"
                >
                  {getCategoryName(categorySlug)}
                </a>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <!-- Back button -->
  <a 
    href={backUrl}
    class="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 mb-6 font-nouvelr"
  >
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
      <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
    Geri qayıt
  </a>

  <!-- Main Comment -->
  <div class="border-b border-zinc-100 pb-6">
    <div class="flex items-start gap-3">
      <div class="flex-shrink-0">
        {#if comment.user_avatar}
          <button
            type="button"
            onclick={() => navigateToProfile(comment.user_name)}
            class="cursor-pointer hover:opacity-80 transition-opacity"
          >
            <img
              src={comment.user_avatar}
              alt={comment.user_name}
              class="w-[48px] h-[48px] rounded-2xl object-cover"
            />
          </button>
    
        {/if}
      </div>
      <div class="flex-grow">
        <div class="flex justify-between items-start">
          <div>
            <button
              type="button"
              onclick={() => navigateToProfile(comment.user_name)}
              class="cursor-pointer hover:text-blue-600 transition-colors text-left"
            >
              <h4 class="font-nouvelr-semibold text-base-800 text-lg">{comment.user_fullname || comment.user_name}</h4>
            </button>
            <button
              type="button"
              onclick={() => navigateToProfile(comment.user_name)}
              class="text-sm text-zinc-500 font-nouvelr cursor-pointer hover:text-blue-600 transition-colors text-left"
            >
              @{comment.user_name}
            </button>
          </div>
          <span class="text-sm text-zinc-400 font-nouvelr">{formatSimpleDate(comment.created_at)}</span>
        </div>
        <p class="mt-3 text-base-700 font-display text-[14px]">{comment.content}</p>
      </div>
    </div> 
  </div>
  
  {#if user}
  <!-- Reply Form -->
    <div class="mt-6 border-b border-zinc-100 pb-6">
        <CommentForm 
          {postSlug} 
          {user}
          parentId={parseInt(commentId)}
          onCommentAdded={handleCommentAdded}
        />
    </div>
  {/if}

  <!-- Replies -->
  {#if replies.length > 0}
    <div class="mt-6">
      <h3 class="text-sm font-nouvelr-semibold text-zinc-700 mb-4">
        Cavablar ({replies.length})
      </h3>
      <div class="space-y-4">
        {#each replies as reply (reply.id)}
          <div class="mt-6">
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0">
                {#if reply.user_avatar}
                  <button
                    type="button"
                    onclick={(e) => {
                      e.stopPropagation();
                      navigateToProfile(reply.user_name);
                    }}
                    class="cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={reply.user_avatar}
                      alt={reply.user_name}
                      class="w-[36px] h-[36px] rounded-xl object-cover"
                    />
                  </button>
                {:else}
                  <div class="w-[36px] h-[36px] rounded-xl flex items-center justify-center bg-base-100 text-base-700 font-nouvelr-semibold">
                    {reply.user_name.charAt(0).toUpperCase()}
                  </div>
                {/if}
              </div>
              <div class="flex-grow">
                <div class="flex justify-between items-start">
                  <div>
                    <button
                      type="button"
                      onclick={(e) => {
                        e.stopPropagation();
                        navigateToProfile(reply.user_name);
                      }}
                      class="cursor-pointer hover:text-blue-600 transition-colors text-left"
                    >
                      <h4 class="font-nouvelr-semibold text-base-800">{reply.user_fullname || reply.user_name}</h4>
                    </button>
                    <button
                      type="button"
                      onclick={(e) => {
                        e.stopPropagation();
                        navigateToProfile(reply.user_name);
                      }}
                      class="text-xs text-zinc-500 font-nouvelr cursor-pointer hover:text-blue-600 transition-colors text-left"
                    >
                      @{reply.user_name}
                    </button>
                  </div>
                  <span class="text-xs text-zinc-400 font-nouvelr">{formatSimpleDate(reply.created_at)}</span>
                </div>
                <button
                  type="button"
                  onclick={() => navigate(`/posts/comment/${postSlug}/${reply.id}`)}
                  class="w-full text-left cursor-pointer hover:bg-zinc-50 transition-colors rounded p-2 -ml-2"
                >
                  <p class="mt-2 text-base-700 font-display text-[14px]">{reply.content}</p>
                </button>

                <div class="flex items-center gap-5">
                  <button
                    type="button"
                    onclick={() => navigate(`/posts/comment/${postSlug}/${reply.id}`)}
                    class="mt-3 flex items-center gap-2 text-xs text-blue-600 font-display hover:text-blue-300 cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                    </svg>
                    
                    Cavab
                  </button>
  
                  <button
                    type="button"
                    onclick={() => navigate(`/posts/comment/${postSlug}/${reply.id}`)}
                    class="mt-3 flex items-center gap-1 text-xs text-blue-600 font-display hover:text-blue-300 cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
                    </svg>
                    {reply.reply_count}
                  </button>
                 </div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
