<script lang="ts">
  import { onMount } from 'svelte';
  import { format } from 'date-fns';
  import ConfirmModal from './ConfirmModal.svelte';
  import AlertModal from './AlertModal.svelte';

  interface Comment {
    id: number;
    content: string;
    created_at: string;
    user_id: string;
    user_email: string;
    user_name: string;
    user_fullname?: string;
    user_avatar?: string;
    post_slug: string;
    parent_id: number | null;
    reply_count?: number;
  }

  interface GroupedComment extends Comment {
    replies?: Comment[];
  }

  let comments: Comment[] = $state([]);
  let filteredComments: GroupedComment[] = $state([]);
  let loading = $state(true);
  let searchQuery = $state('');
  let filterType = $state<'all' | 'parent' | 'replies'>('all');
  let expandedComments = $state<Set<number>>(new Set());

  // Modal states
  let showDeleteModal = $state(false);
  let showAlertModal = $state(false);
  let alertMessage = $state('');
  let alertType: 'success' | 'error' = $state('success');
  let selectedComment: Comment | null = $state(null);

  onMount(() => {
    loadComments();
  });

  async function loadComments() {
    loading = true;
    try {
      const response = await fetch('/api/admin/comments/list');
      const data = await response.json();

      if (data.success) {
        comments = data.comments;
        applyFilters();
      }
    } catch (error) {
      console.error('Şərhlər yüklənərkən xəta:', error);
      showAlert('Şərhlər yüklənərkən xəta baş verdi', 'error');
    } finally {
      loading = false;
    }
  }

  function getAllReplies(parentId: number): Comment[] {
    // Birbaşa cavabları tap
    const directReplies = comments.filter(c => c.parent_id === parentId);
    
    // Hər cavab üçün onun alt-cavablarını da tap (rekursiv)
    const allReplies: Comment[] = [];
    for (const reply of directReplies) {
      allReplies.push(reply);
      // Alt-cavabları da əlavə et
      const subReplies = getAllReplies(reply.id);
      allReplies.push(...subReplies);
    }
    
    return allReplies;
  }

  function applyFilters() {
    // Əsas şərhləri ayır
    const parentComments = comments.filter(c => c.parent_id === null);
    
    // Hər əsas şərh üçün bütün cavabları (və sub-cavabları) əlavə et
    let grouped: GroupedComment[] = parentComments.map(parent => {
      const allReplies = getAllReplies(parent.id);
      return {
        ...parent,
        replies: allReplies.length > 0 ? allReplies : undefined
      };
    });

    // Filter by type
    if (filterType === 'parent') {
      // Yalnız əsas şərhləri göstər (cavabsız)
      grouped = grouped.map(g => ({ ...g, replies: undefined }));
    } else if (filterType === 'replies') {
      // Yalnız cavabları olan şərhləri göstər
      grouped = grouped.filter(g => g.replies && g.replies.length > 0);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const newExpanded = new Set<number>();
      
      grouped = grouped.filter(g => {
        // Əsas şərhdə axtar
        const parentMatch = 
          g.content.toLowerCase().includes(query) ||
          g.user_name.toLowerCase().includes(query) ||
          g.user_email.toLowerCase().includes(query) ||
          g.post_slug.toLowerCase().includes(query);
        
        // Cavablarda axtar (indi bütün sub-cavablarda da axtarır)
        const replyMatch = g.replies?.some(r =>
          r.content.toLowerCase().includes(query) ||
          r.user_name.toLowerCase().includes(query) ||
          r.user_email.toLowerCase().includes(query)
        );

        // Əgər cavabda tapılıbsa, əsas şərhi aç
        if (replyMatch && !parentMatch) {
          newExpanded.add(g.id);
        }

        return parentMatch || replyMatch;
      });
      
      expandedComments = newExpanded;
    }

    filteredComments = grouped;
  }

  $effect(() => {
    searchQuery;
    filterType;
    applyFilters();
  });

  function confirmDelete(comment: Comment) {
    selectedComment = comment;
    showDeleteModal = true;
  }

  async function handleDelete() {
    if (!selectedComment) return;

    try {
      const response = await fetch('/api/admin/comments/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId: selectedComment.id })
      });

      const data = await response.json();

      if (data.success) {
        showAlert('Şərh uğurla silindi', 'success');
        await loadComments();
      } else {
        showAlert(data.message || 'Şərh silinərkən xəta baş verdi', 'error');
      }
    } catch (error) {
      console.error('Şərh silinərkən xəta:', error);
      showAlert('Şərh silinərkən xəta baş verdi', 'error');
    } finally {
      showDeleteModal = false;
      selectedComment = null;
    }
  }

  function showAlert(message: string, type: 'success' | 'error') {
    alertMessage = message;
    alertType = type;
    showAlertModal = true;
  }

  function formatDate(dateString: string) {
    return format(new Date(dateString), 'd MMM yyyy, HH:mm');
  }

  function truncateText(text: string, maxLength: number = 100) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  function highlightText(text: string): string {
    if (!searchQuery.trim()) return text;
    
    const query = searchQuery.trim();
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 px-0.5 rounded">$1</mark>');
  }

  function toggleComment(commentId: number) {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    expandedComments = newExpanded;
  }

  function isExpanded(commentId: number): boolean {
    return expandedComments.has(commentId);
  }
</script>

<div class="p-4 sm:p-6 lg:p-8">
  <!-- Header & Filters -->
  <div class="mb-6 space-y-4">
    <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <h2 class="text-xl font-nouvelr-bold text-slate-900">Şərhlər</h2>
      <button
        onclick={loadComments}
        class="inline-flex cursor-pointer items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Yenilə
      </button>
    </div>

    <!-- Search & Filter -->
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="flex-1">
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Şərh, istifadəçi və ya post axtar..."
          class="w-full px-3 py-2 text-sm border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
        />
      </div>
      <select
        bind:value={filterType}
        class="px-3 cursor-pointer py-2 w-[100px] text-sm border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
      >
        <option value="all">Bütün</option>
        <option value="parent">Əsas</option>
        <option value="replies">Cavab</option>
      </select>
    </div>
  </div>

  <!-- Comments List -->
  {#if loading}
    <div class="flex items-center justify-center py-16">
      <div class="flex flex-col items-center gap-3">
        <div class="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm text-base-600">Yüklənir...</p>
      </div>
    </div>
  {:else if filteredComments.length === 0}
    <div class="flex flex-col items-center justify-center py-16">
      <svg
        class="w-16 h-16 text-base-300 mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width={1.5}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
      <p class="text-base-500 font-medium">Şərh tapılmadı</p>
    </div>
  {:else}
    <div class="overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8">
      <div class="inline-block min-w-full align-middle">
        <table class="min-w-full divide-y divide-base-200">
          <thead class="bg-base-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-base-600 uppercase tracking-wider">
                İstifadəçi
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-base-600 uppercase tracking-wider">
                Şərh
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-base-600 uppercase tracking-wider">
                Post
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-base-600 uppercase tracking-wider">
                Tarix
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-base-600 uppercase tracking-wider">
                Tip
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-base-600 uppercase tracking-wider">
                Əməliyyatlar
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-base-200">
            {#each filteredComments as comment (comment.id)}
              <!-- Əsas şərh -->
              <tr 
                class="hover:bg-base-50 transition-colors bg-green-50/30 {comment.replies && comment.replies.length > 0 ? 'cursor-pointer' : ''}"
                onclick={() => comment.replies && comment.replies.length > 0 && toggleComment(comment.id)}
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    {#if comment.replies && comment.replies.length > 0}
                      <button
                        onclick={(e) => { e.stopPropagation(); toggleComment(comment.id); }}
                        class="mr-2 p-1 hover:bg-base-200 rounded transition-colors"
                        title={isExpanded(comment.id) ? 'Bağla' : 'Aç'}
                      >
                        <svg
                          class="w-4 h-4 text-base-600 transition-transform {isExpanded(comment.id) ? 'rotate-90' : ''}"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    {:else}
                      <div class="w-6 mr-2"></div>
                    {/if}
                    <div class="shrink-0 h-10 w-10">
                      {#if comment.user_avatar}
                        <img
                          src={comment.user_avatar}
                          alt={comment.user_name}
                          class="h-10 w-10 rounded-full object-cover"
                        />
                      {:else}
                        <div class="h-10 w-10 rounded-full bg-base-100 flex items-center justify-center text-base-700 font-semibold">
                          {comment.user_name.charAt(0).toUpperCase()}
                        </div>
                      {/if}
                    </div>
                    <div class="ml-3">
                      <p class="text-sm font-medium text-slate-900">
                        {comment.user_fullname || comment.user_name}
                      </p>
                      <p class="text-xs text-base-500">@{comment.user_name}</p>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <p class="text-sm text-base-900 max-w-md">
                    {@html highlightText(truncateText(comment.content))}
                  </p>
                  {#if comment.replies && comment.replies.length > 0}
                    <span class="inline-flex items-center gap-1 mt-2 text-xs text-purple-600 font-medium">
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      {comment.replies.length} cavab
                    </span>
                  {/if}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <a
                    href={`/posts/${comment.post_slug}`}
                    target="_blank"
                    onclick={(e) => e.stopPropagation()}
                    class="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {comment.post_slug}
                  </a>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-base-500">
                  {formatDate(comment.created_at)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    Əsas
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex items-center justify-end gap-2">
                    <a
                      href={`/posts/comment/${comment.post_slug}/${comment.id}`}
                      target="_blank"
                      onclick={(e) => e.stopPropagation()}
                      class="text-blue-600 hover:text-blue-900"
                      title="Bax"
                    >
                      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </a>
                    <button
                      onclick={(e) => { e.stopPropagation(); confirmDelete(comment); }}
                      class="text-red-600 hover:text-red-900"
                      title="Sil"
                    >
                      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>

              <!-- Cavablar -->
              {#if comment.replies && comment.replies.length > 0 && isExpanded(comment.id)}
                {#each comment.replies as reply (reply.id)}
                  <tr class="hover:bg-base-50 transition-colors bg-purple-50/20">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center pl-8">
                        <svg class="w-4 h-4 text-purple-400 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        <div class="flex items-center">
                          <div class="flex-shrink-0 h-8 w-8">
                            {#if reply.user_avatar}
                              <img
                                src={reply.user_avatar}
                                alt={reply.user_name}
                                class="h-8 w-8 rounded-full object-cover"
                              />
                            {:else}
                              <div class="h-8 w-8 rounded-full bg-base-100 flex items-center justify-center text-base-700 text-xs font-semibold">
                                {reply.user_name.charAt(0).toUpperCase()}
                              </div>
                            {/if}
                          </div>
                          <div class="ml-2">
                            <p class="text-xs font-medium text-slate-900">
                              {reply.user_fullname || reply.user_name}
                            </p>
                            <p class="text-xs text-base-500">@{reply.user_name}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <p class="text-sm text-base-700 max-w-md pl-6">
                        {@html highlightText(truncateText(reply.content))}
                      </p>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="text-xs text-base-400">—</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-base-500">
                      {formatDate(reply.created_at)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                        Cavab
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div class="flex items-center justify-end gap-2">
                        <a
                          href={`/posts/comment/${reply.post_slug}/${comment.id}`}
                          target="_blank"
                          class="text-blue-600 hover:text-blue-900"
                          title="Bax"
                        >
                          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </a>
                        <button
                          onclick={() => confirmDelete(reply)}
                          class="text-red-600 hover:text-red-900"
                          title="Sil"
                        >
                          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                {/each}
              {/if}
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>

<!-- Delete Confirmation Modal -->
<ConfirmModal
  bind:isOpen={showDeleteModal}
  title="Şərhi sil"
  message="Bu şərhi silmək istədiyinizdən əminsiniz? Bu əməliyyat geri alına bilməz."
  confirmText="Sil"
  cancelText="Ləğv et"
  confirmVariant="danger"
  onConfirm={handleDelete}
  onCancel={() => {
    showDeleteModal = false;
    selectedComment = null;
  }}
/>

<!-- Alert Modal -->
<AlertModal
  bind:isOpen={showAlertModal}
  message={alertMessage}
  variant={alertType}
  onClose={() => showAlertModal = false}
/>
