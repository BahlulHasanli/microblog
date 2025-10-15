<script lang="ts">
  import { onMount } from 'svelte';
  import { formatDate as formatDateUtil } from '@/utils/date';
  import { supabase } from '@/db/supabase';
  import CommentForm from './CommentForm.svelte';

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
  }

  let comments: Comment[] = $state([]);
  let loading = $state(true);
  let error = $state('');
  let replyingTo: number | null = $state(null);
  let expandedComments: Set<number> = $state(new Set());

  // Group comments by parent_id
  const parentComments = $derived(comments.filter(comment => comment.parent_id === null));
  const childComments = $derived(comments.filter(comment => comment.parent_id !== null));

  function getChildComments(parentId: number) {
    return childComments.filter(comment => comment.parent_id === parentId);
  }

  function formatDate(dateString: string) {
    return formatDateUtil(dateString, 'D MMMM YYYY, HH:mm');
  }

  async function fetchComments() {
    loading = true;

    try {
      // Fetch comments with join to get user avatars and fullname
      const { data, error: supabaseError } = await supabase
        .from('comments')
        .select(`
          *,
          users:user_id (avatar, fullname)
        `)
        .eq('post_slug', postSlug)
        .order('created_at', { ascending: false });

      if (supabaseError) throw supabaseError;

      // Process comments to include user avatars and fullname
      const processedComments = data?.map(comment => ({
        ...comment,
        user_avatar: comment.users?.avatar || null,
        user_fullname: comment.users?.fullname || comment.user_name
      })) || [];

      comments = processedComments;
    } catch (err) {
      console.error('Error fetching comments:', err);
      error = 'Şərhlər yüklənərkən xəta baş verdi';
    } finally {
      loading = false;
    }
  }

  function toggleReply(commentId: number) {
    replyingTo = replyingTo === commentId ? null : commentId;
  }

  function toggleReplies(commentId: number) {
    if (expandedComments.has(commentId)) {
      expandedComments.delete(commentId);
    } else {
      expandedComments.add(commentId);
    }
    expandedComments = new Set(expandedComments); // Trigger reactivity
  }

  function handleCommentAdded() {
    fetchComments();
    replyingTo = null;
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
        <div class="mt-6 py-3">
          <div class="flex items-start gap-3">
            <div class="flex-shrink-0">
              <div class="relative">
                <div>
                  {#if comment.user_avatar}
                    <img
                      src={comment.user_avatar}
                      alt={comment.user_name}
                      class="squircle !w-[36px] !h-[36px] object-cover"
                    />
                  {:else}
                    <div class="squircle !w-[36px] !h-[36px] flex items-center justify-center bg-base-100 text-base-700 font-nouvelr-semibold">
                      {comment.user_name.charAt(0).toUpperCase()}
                    </div>
                  {/if}
                </div>
              </div>
            </div>
            <div class="flex-grow">
              <div class="flex justify-between items-start">
                <div>
                  <h4 class="font-nouvelr-semibold text-base-800">{comment.user_fullname || comment.user_name}</h4>
                  <p class="text-xs text-zinc-500 font-nouvelr">@{comment.user_name}</p>
                </div>
                <span class="text-xs text-zinc-400 font-nouvelr">{formatDate(comment.created_at)}</span>
              </div>
              <p class="mt-2 text-base-700 font-nouvelr">{comment.content}</p>
              
              <div class="mt-3 flex gap-4">
                {#if user}
                  <button 
                    type="button"
                    onclick={() => toggleReply(comment.id)}
                    class="cursor-pointer font-medium text-xs font-display text-base-700 hover:text-rose-600"
                  >
                    {replyingTo === comment.id ? 'Ləğv et' : 'Cavab ver'}
                  </button>
                {/if}
                
                {#if getChildComments(comment.id).length > 0}
                  <button 
                    type="button"
                    onclick={() => toggleReplies(comment.id)}
                    class="cursor-pointer font-medium text-xs font-display text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    {#if expandedComments.has(comment.id)}
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3 h-3">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                      </svg>
                      Cavabları gizlət
                    {:else}
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-3 h-3">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                      {getChildComments(comment.id).length} cavabı göstər
                    {/if}
                  </button>
                {/if}
              </div>
              
              {#if replyingTo === comment.id}
                <div class="mt-4">
                  <CommentForm 
                    {postSlug} 
                    {user} 
                    parentId={comment.id}
                    onCommentAdded={handleCommentAdded}
                  />
                </div>
              {/if}
              
              {#if getChildComments(comment.id).length > 0 && expandedComments.has(comment.id)}
                <div class="mt-4">
                  {#each getChildComments(comment.id) as reply (reply.id)}
                    <div class="ml-6 mt-4 pl-4 border-l border-zinc-100 py-3">
                      <div class="flex items-start gap-3">
                        <div class="flex-shrink-0">
                          <div class="relative">
                            <div>
                              {#if reply.user_avatar}
                                <img
                                  src={reply.user_avatar}
                                  alt={reply.user_name}
                                  class="squircle !w-[36px] !h-[36px] object-cover"
                                />
                              {:else}
                                <div class="squircle !w-[36px] !h-[36px] flex items-center justify-center bg-base-100 text-base-700 font-nouvelr-semibold">
                                  {reply.user_name.charAt(0).toUpperCase()}
                                </div>
                              {/if}
                            </div>
                          </div>
                        </div>
                        <div class="flex-grow">
                          <div class="flex justify-between items-start">
                            <div>
                              <h4 class="font-nouvelr-semibold text-base-800">{reply.user_fullname || reply.user_name}</h4>
                              <p class="text-xs text-zinc-500 font-nouvelr">@{reply.user_name}</p>
                            </div>
                            <span class="text-xs text-zinc-400 font-nouvelr">{formatDate(reply.created_at)}</span>
                          </div>
                          <p class="mt-2 text-base-700 font-nouvelr">{reply.content}</p>
                          
                          {#if user}
                            <div class="mt-3 flex gap-2">
                              <button 
                                type="button"
                                onclick={() => toggleReply(reply.id)}
                                class="cursor-pointer text-xs font-nouvelr text-base-700 hover:text-rose-600"
                              >
                                {replyingTo === reply.id ? 'Ləğv et' : 'Cavab ver'}
                              </button>
                            </div>
                          {/if}
                          
                          {#if replyingTo === reply.id}
                            <div class="mt-4">
                              <CommentForm 
                                {postSlug} 
                                {user} 
                                parentId={reply.id}
                                onCommentAdded={handleCommentAdded}
                              />
                            </div>
                          {/if}
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
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

