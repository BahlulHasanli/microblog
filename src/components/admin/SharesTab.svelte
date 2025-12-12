<script lang="ts">
  import { onMount } from 'svelte';

  interface Share {
    id: number;
    content: string;
    created_at: string;
    user_id: number;
    users?: {
      id: number;
      fullname: string;
      avatar: string;
    };
  }

  interface ShareWithStats extends Share {
    commentsCount: number;
    likesCount: number;
    likedBy: Array<{ avatar: string }>;
  }

  let shares: ShareWithStats[] = $state([]);
  let loading = $state(true);
  let selectedShare: ShareWithStats | null = $state(null);
  let modalOpen = $state(false);
  let currentPage = $state(1);
  const itemsPerPage = 5;
  let totalPages = $state(1);
  let totalCount = $state(0);
  let deleteLoading = $state(false);
  let deleteConfirmOpen = $state(false);
  let shareToDelete: ShareWithStats | null = $state(null);

  $effect(() => {
    loadShares();
  });

  function textClip(text: string) {
    return text.length > 50 ? text.substring(0, 50) + '...' : text;
  }

  function openModal(share: ShareWithStats) {
    selectedShare = share;
    modalOpen = true;
  }

  function closeModal() {
    modalOpen = false;
    selectedShare = null;
  }

  function openDeleteConfirm(share: ShareWithStats) {
    shareToDelete = share;
    deleteConfirmOpen = true;
  }

  function closeDeleteConfirm() {
    deleteConfirmOpen = false;
    shareToDelete = null;
  }

  async function deleteShare() {
    if (!shareToDelete) return;

    try {
      deleteLoading = true;
      const response = await fetch('/api/admin/shares/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ shareId: shareToDelete.id })
      });

      const data = await response.json();

      if (data.success) {
        // Paylaşımı siyahıdan sil
        shares = shares.filter(s => s.id !== shareToDelete!.id);
        totalCount--;
        
        // Modal açıqsa bağla
        if (modalOpen && selectedShare?.id === shareToDelete.id) {
          closeModal();
        }
        
        closeDeleteConfirm();
      } else {
        alert('Silmə xətası: ' + (data.message || 'Bilinməyən xəta'));
      }
    } catch (err) {
      console.error('Paylaşım silərkən xəta:', err);
      alert('Silmə xətası baş verdi');
    } finally {
      deleteLoading = false;
    }
  }

  onMount(() => {
    loadShares();
  });

  async function loadShares() {
    try {
      loading = true;
      const response = await fetch(`/api/admin/shares/list?page=${currentPage}&limit=${itemsPerPage}`);
      const data = await response.json();

      if (data.success && data.shares) {
        // Pagination məlumatını al
        if (data.pagination) {
          totalPages = data.pagination.totalPages;
          totalCount = data.pagination.totalCount;
        }

        // Bütün şərhlər və likləri bir dəfə yüklə
        const [commentsResponse, likesResponse] = await Promise.all([
          fetch(`/api/admin/share-comments/list`),
          fetch(`/api/admin/share-likes/list`)
        ]);

        const commentsData = await commentsResponse.json();
        const likesData = await likesResponse.json();

        const allComments = commentsData.success && Array.isArray(commentsData.shareComments)
          ? commentsData.shareComments
          : [];
        const allLikes = likesData.success && Array.isArray(likesData.likes)
          ? likesData.likes
          : [];

        // Paylaşımları stats ilə birləşdir
        const sharesWithStats = data.shares.map((share: Share) => {
          const commentsCount = allComments.filter((c: any) => c.share_id === share.id).length;
          const shareLikes = allLikes.filter((l: any) => l.share_id === share.id);
          const likesCount = shareLikes.length;
          const likedBy = shareLikes.slice(0, 3).map((like: any) => ({ avatar: like.users?.avatar || '' }));

          return {
            ...share,
            commentsCount,
            likesCount,
            likedBy
          };
        });

        shares = sharesWithStats;
      }
    } catch (err) {
      console.error('Paylaşımlar yüklənərkən xəta:', err);
    } finally {
      loading = false;
    }
  }
</script>

<div class="p-4 sm:p-6 lg:p-8">
  <!-- Header -->
  <div class="mb-6">
    <h2 class="text-xl font-semibold text-slate-900 mb-2">Paylaşımlar idarəetməsi</h2>
    <p class="text-sm text-base-600">Paylaşımlarının idarə etməsi</p>
  </div>

  <!-- Shares Table -->
  {#if loading}
    <div class="flex items-center justify-center py-16">
      <div class="flex flex-col items-center gap-3">
        <div class="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm text-base-600">Yüklənir...</p>
      </div>
    </div>
  {:else if shares.length === 0}
    <div class="flex flex-col items-center justify-center py-16">
      <p class="text-base-500 font-medium">Paylaşım tapılmadı</p>
    </div>
  {:else}
    <div class="overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8">
      <div class="inline-block min-w-full align-middle">
        <table class="min-w-full divide-y divide-base-200">
          <thead class="bg-base-50">
            <tr>
              <th class="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
                Müəllif
              </th>
              <th class="hidden md:table-cell px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
                Məzmun
              </th>
              <th class="hidden lg:table-cell px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
                Şərhlər
              </th>
              <th class="hidden lg:table-cell px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
                Bəyənmələr
              </th>
              <th class="hidden xl:table-cell px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
                Tarix
              </th>
              <th class="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
                Əməliyyatlar
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-base-100">
            {#each shares as share (share.id)}
              <tr class="hover:bg-base-50 transition-all duration-200">
                <!-- Müəllif -->
                <td class="px-4 sm:px-6 py-4 sm:py-5">
                  <div class="flex flex-col gap-2">
                    <div class="flex items-center gap-3">
                      <img
                        class="h-9 w-9 sm:h-10 sm:w-10 rounded-full object-cover ring-2 ring-base-100"
                        src={share.users?.avatar || '/default-avatar.png'}
                        alt={share.users?.fullname}
                      />
                      <div>
                        <div class="text-sm font-medium text-slate-900">
                          {share.users?.fullname || 'Bilinməyən'}
                        </div>
                        <div class="md:hidden text-xs text-base-600 mt-0.5">
                          {textClip(share.content)}
                        </div>
                      </div>
                    </div>
                    <!-- Mobil üçün əlavə məlumat -->
                    <div class="flex lg:hidden items-center gap-3 text-xs">
                      <div class="flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-base-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span class="font-medium text-base-700">{share.commentsCount}</span>
                      </div>
                      <div class="flex items-center gap-1.5">
                        <svg class="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <span class="font-medium text-red-700">{share.likesCount}</span>
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Məzmun -->
                <td class="hidden md:table-cell px-4 sm:px-6 py-4 sm:py-5 text-sm text-base-700">
                  {textClip(share.content)}
                </td>

                <!-- Şərhlər -->
                <td class="hidden lg:table-cell px-4 sm:px-6 py-4 sm:py-5 whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-base-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span class="text-xs font-medium text-base-700">{share.commentsCount}</span>
                  </div>
                </td>

                <!-- Bəyənmələr -->
                <td class="hidden lg:table-cell px-4 sm:px-6 py-4 sm:py-5 whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span class="text-xs font-medium text-red-700">{share.likesCount}</span>
                  </div>
                </td>

                <!-- Tarix -->
                <td class="hidden xl:table-cell px-4 sm:px-6 py-4 sm:py-5 whitespace-nowrap text-xs text-base-500">
                  {new Date(share.created_at).toLocaleDateString('az-AZ', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                  })}
                </td>

                <!-- Əməliyyatlar -->
                <td class="px-4 sm:px-6 py-4 sm:py-5">
                  <div class="flex items-center gap-2">
                    <button
                      onclick={() => openModal(share)}
                      class="cursor-pointer inline-flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 sm:py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors whitespace-nowrap"
                      title="Ətraflı məlumat"
                    >
                      <svg
                        class="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                      <span class="hidden sm:inline">Bax</span>
                    </button>
                    <button
                      onclick={() => openDeleteConfirm(share)}
                      disabled={deleteLoading}
                      class="cursor-pointer inline-flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 sm:py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      title="Sil"
                    >
                      <svg
                        class="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      <span class="hidden sm:inline">Sil</span>
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="flex items-center justify-between mt-6 px-4 sm:px-6">
        <div class="text-sm text-base-600">
          Səhifə <span class="font-medium text-slate-900">{currentPage}</span> / <span class="font-medium text-slate-900">{totalPages}</span>
          <span class="text-base-500 ml-2">({totalCount} cəmi)</span>
        </div>
        <div class="flex items-center gap-2">
          <button
            onclick={() => {
              if (currentPage > 1) {
                currentPage = currentPage - 1;
              }
            }}
            disabled={currentPage === 1}
            class="cursor-pointer inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-slate-900 bg-base-100 rounded-md hover:bg-base-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            title="Əvvəlki səhifə"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {#each Array.from({ length: totalPages }, (_, i) => i + 1) as page}
            <button
              onclick={() => {
                currentPage = page;
              }}
              class="cursor-pointer inline-flex items-center justify-center px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap {currentPage === page ? 'bg-slate-900 text-white' : 'text-slate-900 bg-base-100 hover:bg-base-200'}"
            >
              {page}
            </button>
          {/each}

          <button
            onclick={() => {
              if (currentPage < totalPages) {
                currentPage = currentPage + 1;
              }
            }}
            disabled={currentPage === totalPages}
            class="cursor-pointer inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-slate-900 bg-base-100 rounded-md hover:bg-base-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            title="Sonrakı səhifə"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div>
 
<!-- Modal -->
{#if modalOpen && selectedShare}
  <div 
    class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
    onclick={(e) => {
      if (e.target === e.currentTarget) {
        closeModal();
      }
    }}
    onkeydown={(e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    }}
    role="dialog"
    aria-modal="true"
    tabindex="0"
  >
    <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl transform transition-all animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
      <!-- Modal Header -->
      <div class="sticky top-0 bg-white border-b border-base-200 px-6 pt-6 pb-4 flex items-start justify-between gap-4">
        <div class="flex items-start gap-4 flex-1">
          <img
            src={selectedShare.users?.avatar || '/default-avatar.png'}
            alt={selectedShare.users?.fullname}
            class="h-10 w-10 rounded-full object-cover ring-2 ring-base-100 shrink-0"
          />
          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-semibold text-slate-900">{selectedShare.users?.fullname || 'Bilinməyən'}</h3>
            <p class="text-xs text-base-500 mt-0.5">
              {new Date(selectedShare.created_at).toLocaleDateString('az-AZ', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
              })}
            </p>
          </div>
        </div>
    
      </div>

      <!-- Modal Content -->
      <div class="px-6 py-4 space-y-4">
        <!-- Məzmun -->
        <div>
          <h4 class="text-xs font-semibold text-base-600 uppercase tracking-wider mb-2">Məzmun</h4>
          <p class="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedShare.content}</p>
        </div>

        <!-- Statistika -->
        <div class="grid grid-cols-3 gap-2 pt-4 border-t border-base-200">
          <div class="p-2 bg-base-50 rounded-md">
            <div class="flex items-center justify-center gap-1 mb-1">
              <svg class="w-3.5 h-3.5 text-base-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span class="text-sm font-semibold text-slate-900">{selectedShare.commentsCount}</span>
            </div>
            <p class="text-xs text-base-600 text-center">Şərh</p>
          </div>
          <div class="p-2 bg-base-50 rounded-md">
            <div class="flex items-center justify-center gap-1 mb-1">
              <svg class="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span class="text-sm font-semibold text-slate-900">{selectedShare.likesCount}</span>
            </div>
            <p class="text-xs text-base-600 text-center">Bəyənmə</p>
          </div>
          <div class="p-2 bg-base-50 rounded-md">
            <div class="text-sm font-semibold text-slate-900 text-center mb-1">
              {new Date(selectedShare.created_at).toLocaleDateString('az-AZ', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
              })}
            </div>
            <p class="text-xs text-base-600 text-center">Tarix</p>
          </div>
        </div>

        <!-- Bəyənənlər -->
        {#if selectedShare.likedBy.length > 0}
          <div class="pt-4 border-t border-base-200">
            <h4 class="text-xs font-semibold text-base-600 uppercase tracking-wider mb-2">Bəyənənlər</h4>
            <div class="flex flex-wrap gap-1.5">
              {#each selectedShare.likedBy as liker (liker.avatar)}
                <img
                  src={liker.avatar || '/default-avatar.png'}
                  alt="Bəyənən"
                  class="h-7 w-7 rounded-full border border-base-200 object-cover hover:ring-2 hover:ring-blue-400 transition-all"
                  title="Bəyənən istifadəçi"
                />
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<!-- Delete Confirm Modal -->
{#if deleteConfirmOpen && shareToDelete}
  <div 
    class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
    onclick={(e) => {
      if (e.target === e.currentTarget && !deleteLoading) {
        closeDeleteConfirm();
      }
    }}
    onkeydown={(e) => {
      if (e.key === 'Escape' && !deleteLoading) {
        closeDeleteConfirm();
      }
    }}
    role="dialog"
    aria-modal="true"
    tabindex="0"
  >
    <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all animate-in zoom-in-95 duration-200">
      <!-- Modal Header -->
      <div class="px-6 pt-6 pb-4">
        <div class="flex items-start gap-4">
          <div class="shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-red-100">
            <svg class="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-lg font-semibold text-slate-900">Paylaşımı sil?</h3>
            <p class="text-sm text-base-600 mt-1">Bu əməliyyat geri alına bilməz. Paylaşım və bütün şərhlər silinəcəkdir.</p>
          </div>
        </div>
      </div>

      <!-- Modal Content -->
      <div class="px-6 py-4 border-t border-base-200">
        <div class="bg-base-50 rounded-lg p-3">
          <p class="text-sm text-slate-700 line-clamp-3">{shareToDelete.content}</p>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="bg-base-50 border-t border-base-200 px-6 py-4 flex justify-end gap-2 rounded-b-xl">
        <button
          onclick={closeDeleteConfirm}
          disabled={deleteLoading}
          class="cursor-pointer inline-flex items-center justify-center px-4 py-2 text-xs font-medium text-slate-900 bg-white border border-base-200 rounded-lg hover:bg-base-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          Ləğv et
        </button>
        <button
          onclick={deleteShare}
          disabled={deleteLoading}
          class="cursor-pointer inline-flex items-center justify-center px-4 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {#if deleteLoading}
            <svg class="w-4 h-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          {/if}
          Sil
        </button>
      </div>
    </div>
  </div>
{/if}
