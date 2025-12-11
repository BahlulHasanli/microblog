<script lang="ts">
  import { onMount } from 'svelte';
  import { formatFullDate } from '@/utils/date';
  import ConfirmModal from './ConfirmModal.svelte';
  import AlertModal from './AlertModal.svelte';

  interface Props {
    canEdit?: boolean;
    canDelete?: boolean;
    canPublish?: boolean;
  }

  const { canEdit = false, canDelete = false, canPublish = false }: Props = $props();

  interface Post {
    id: string;
    slug: string;
    title: string;
    description: string;
    author_name: string;
    author_avatar: string;
    status: string;
    featured: boolean;
    created_at: string;
  }

  function textClip(text: string) {
    return text.length > 25 ? text.substring(0, 25) + '...' : text;
  }

  let posts: Post[] = $state([]);
  let loading = $state(true);
  let filter: 'all' | 'pending' | 'approved' = $state('all');

  // Modal state
  let confirmModal = $state({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Təsdiq et',
    variant: 'primary' as 'danger' | 'success' | 'warning' | 'primary'
  });

  let confirmCallback: (() => void) | null = $state(null);

  let alertModal = $state({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info' as 'success' | 'error' | 'info' | 'warning'
  });

  // Filter dəyişəndə avtomatik yenidən yüklə
  $effect(() => {
    loadPosts();
  })

  async function loadPosts() {
    try {
      loading = true;
      console.log("Postlar yüklənir, filter:", filter);

      const response = await fetch(`/api/admin/posts/list?status=${filter}`);
      console.log("Response status:", response.status);

      const data = await response.json();
      console.log("Response data:", data);

      if (data.success) {
        posts = data.posts;
        console.log("Postlar yükləndi:", data.posts.length);
      } else {
        console.error("API xətası:", data.message);
      }
    } catch (error) {
      console.error("Postlar yüklənərkən xəta:", error);
    } finally {
      loading = false;
    }
  }

  function showAlert(message: string, variant: 'success' | 'error' | 'info' | 'warning' = 'info', title?: string) {
    alertModal = {
      isOpen: true,
      title: title || '',
      message,
      variant
    };
  }

  async function handleApprove(postId: string, approve: boolean = true) {
    confirmCallback = async () => {
      try {
        const response = await fetch("/api/admin/posts/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId, approve }),
        });

        const data = await response.json();

        if (data.success) {
          showAlert(data.message, 'success', 'Uğurlu');
          loadPosts();
        } else {
          showAlert(data.message || "Xəta baş verdi", 'error', 'Xəta');
        }
      } catch (error) {
        console.error("Təsdiq xətası:", error);
        showAlert("Xəta baş verdi", 'error', 'Xəta');
      }
    };

    confirmModal = {
      isOpen: true,
      title: approve ? 'Post təsdiqi' : 'Yayımdan çıxarma',
      message: approve 
        ? "Bu postu təsdiq etmək istədiyinizə əminsiniz?" 
        : "Bu postu yayımdan çıxarmaq istədiyinizə əminsiniz?",
      confirmText: approve ? 'Təsdiq et' : 'Yayımdan çıxart',
      variant: approve ? 'success' : 'warning'
    };
  }

  async function handleDelete(postId: string, slug: string) {
    confirmCallback = async () => {
      try {
        const response = await fetch("/api/admin/posts/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId, slug }),
        });
   
        const data = await response.json();

        if (data.success) {
          showAlert("Post uğurla silindi", 'success', 'Uğurlu');
          loadPosts();
        } else {
          showAlert(data.message || "Xəta baş verdi", 'error', 'Xəta');
        }
      } catch (error) {
        console.error("Silmə xətası:", error);
        showAlert("Xəta baş verdi", 'error', 'Xəta');
      }
    };

    confirmModal = {
      isOpen: true,
      title: 'Post silinməsi',
      message: "Bu postu silmək istədiyinizə əminsiniz? Bu əməliyyat geri alına bilməz.",
      confirmText: 'Sil',
      variant: 'danger'
    };
  }

  function handleEdit(slug: string) {
    window.location.href = `/edit-post/${slug}`;
  }

  async function handleFeatured(postId: string, featured: boolean) {
    confirmCallback = async () => {
      try {
        const response = await fetch("/api/admin/posts/featured", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId, featured }),
        });

        const data = await response.json();

        if (data.success) {
          showAlert(data.message, 'success', 'Uğurlu');
          loadPosts();
        } else {
          showAlert(data.message || "Xəta baş verdi", 'error', 'Xəta');
        }
      } catch (error) {
        console.error("Featured toggle xətası:", error);
        showAlert("Xəta baş verdi", 'error', 'Xəta');
      }
    };

    confirmModal = {
      isOpen: true,
      title: featured ? 'Önə çıxarma' : 'Önə çıxarmadan çıxarma',
      message: featured 
        ? "Bu postu önə çıxarmaq istədiyinizə əminsiniz?" 
        : "Bu postu önə çıxarmadan çıxarmaq istədiyinizə əminsiniz?",
      confirmText: featured ? 'Önə çıxart' : 'Çıxart',
      variant: 'primary'
    };
  }
</script>

<div class="p-4 lg:p-6">
  <!-- Filter -->
  <div class="mb-6 sm:mb-8 flex flex-wrap gap-2">
    <button
      onclick={() => filter = 'all'}
      class="cursor-pointer px-4 sm:px-6 py-2 rounded-md font-medium text-xs sm:text-sm transition-colors {filter === 'all' ? 'bg-slate-900 text-white' : 'bg-transparent text-base-600 hover:bg-base-100'}"
    >
      Hamısı
    </button>
    <button
      onclick={() => filter = 'pending'}
      class="cursor-pointer px-4 sm:px-6 py-2 rounded-md font-medium text-xs sm:text-sm transition-colors {filter === 'pending' ? 'bg-slate-900 text-white' : 'bg-transparent text-base-600 hover:bg-base-100'}"
    >
      Gözləyən
    </button>
    <button
      onclick={() => filter = 'approved'}
      class="cursor-pointer px-4 sm:px-6 py-2 rounded-md font-medium text-xs sm:text-sm transition-colors {filter === 'approved' ? 'bg-slate-900 text-white' : 'bg-transparent text-base-600 hover:bg-base-100'}"
    >
      Təsdiqlənmiş
    </button>
  </div>

  <!-- Posts Table -->
  {#if loading}
    <div class="flex items-center justify-center py-16">
      <div class="flex flex-col items-center gap-3">
        <div class="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm text-base-600">Yüklənir...</p>
      </div>
    </div>
  {:else if posts.length === 0}
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
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <p class="text-base-500 font-medium">Post tapılmadı</p>
    </div>
  {:else}
    <div class="overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8">
      <div class="inline-block min-w-full align-middle">
      <table class="min-w-full divide-y divide-base-200">
        <thead class="bg-base-50">
          <tr>
            <th class="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
              Başlıq
            </th>
            <th class="hidden md:table-cell px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
              Müəllif
            </th>
            <th class="hidden lg:table-cell px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
              Status
            </th>
            <th class="hidden lg:table-cell px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
              Tarix
            </th>
            <th class="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
              Əməliyyatlar
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-base-100">
          {#each posts as post (post.id)}
            <tr class="hover:bg-base-50 transition-all duration-200">
              <td class="px-4 sm:px-6 py-4 sm:py-5">
                <div class="flex flex-col gap-2">
                  <div class="text-sm font-medium text-slate-900">
                    {textClip(post.title)}
                  </div>
                  <div class="text-xs text-base-500">
                    {textClip(post.description)}
                  </div>
                  <!-- Mobil üçün müəllif və status -->
                  <div class="flex md:hidden items-center gap-3 mt-2">
                    <div class="flex items-center gap-2">
                      <img
                        src={post.author_avatar}
                        alt={post.author_name}
                        class="w-6 h-6 rounded-full object-cover ring-2 ring-base-100"
                      />
                      <span class="text-xs text-base-700">
                        {post.author_name}
                      </span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <div
                        class="w-1.5 h-1.5 rounded-full {post.status === 'approved' ? 'bg-green-500' : post.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'}"
                      ></div>
                      <span
                        class="text-xs font-medium {post.status === 'approved' ? 'text-green-700' : post.status === 'pending' ? 'text-yellow-700' : 'text-red-700'}"
                      >
                        {post.status === 'approved' ? 'Təsdiqləndi' : post.status === 'pending' ? 'Gözləyir' : 'Rədd edildi'}
                      </span>
                    </div>
                  </div>
                </div>
              </td>
              <td class="hidden md:table-cell px-4 sm:px-6 py-4 sm:py-5 whitespace-nowrap">
                <div class="flex items-center gap-3">
                  <img
                    src={post.author_avatar}
                    alt={post.author_name}
                    class="w-8 h-8 rounded-full object-cover ring-2 ring-base-100"
                  />
                  <span class="text-sm text-base-700">
                    {post.author_name}
                  </span>
                </div>
              </td>
              <td class="hidden lg:table-cell px-4 sm:px-6 py-4 sm:py-5 whitespace-nowrap">
                <div class="flex items-center gap-2">
                  <div
                    class="w-2 h-2 rounded-full {post.status === 'approved' ? 'bg-green-500' : post.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'}"
                  ></div>
                  <span
                    class="text-xs font-medium {post.status === 'approved' ? 'text-green-700' : post.status === 'pending' ? 'text-yellow-700' : 'text-red-700'}"
                  >
                    {post.status === 'approved' ? 'Təsdiqləndi' : post.status === 'pending' ? 'Gözləyir' : 'Rədd edildi'}
                  </span>
                </div>
              </td>
              <td class="hidden lg:table-cell px-4 sm:px-6 py-4 sm:py-5 whitespace-nowrap text-xs text-base-500">
                {formatFullDate(post.created_at)}
              </td>
              <td class="px-4 sm:px-6 py-4 sm:py-5">
                <div class="flex flex-row flex-wrap items-center gap-2">
                  {#if canPublish}
                    {#if post.status === 'pending'}
                      <button
                        onclick={() => handleApprove(post.id)}
                        class="cursor-pointer inline-flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 sm:py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100 transition-colors whitespace-nowrap"
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
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span class="hidden sm:inline">Təsdiq et</span>
                      </button>
                    {:else}
                      <button
                        onclick={() => handleApprove(post.id, false)}
                        class="cursor-pointer inline-flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 sm:py-1.5 text-xs font-medium text-yellow-700 bg-yellow-50 rounded-md hover:bg-yellow-100 transition-colors whitespace-nowrap"
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
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        <span class="hidden sm:inline">Yayımdan çıxard</span>
                      </button>
                    {/if}
                    <button
                      onclick={() => handleFeatured(post.id, !post.featured)}
                      class="cursor-pointer inline-flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 sm:py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap {post.featured ? 'text-orange-700 bg-orange-50 hover:bg-orange-100' : 'text-purple-700 bg-purple-50 hover:bg-purple-100'}"
                    >
                      <svg
                        class="w-3.5 h-3.5"
                        fill={post.featured ? 'currentColor' : 'none'}
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width={2}
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                      </svg>
                      <span class="hidden sm:inline">{post.featured ? 'Önə çıxarılıb' : 'Önə çıxart'}</span>
                    </button>
                  {/if}
                  {#if canEdit}
                    <button
                      onclick={() => handleEdit(post.slug)}
                      class="cursor-pointer inline-flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 sm:py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors whitespace-nowrap"
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
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      <span class="hidden sm:inline">Düzəliş</span>
                    </button>
                  {/if}
                  {#if canDelete}
                    <button
                      onclick={() => handleDelete(post.id, post.slug)}
                      class="cursor-pointer inline-flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 sm:py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors whitespace-nowrap"
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
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
      </div>
    </div>
  {/if}
</div>

<!-- Modals -->
<ConfirmModal
  bind:isOpen={confirmModal.isOpen}
  title={confirmModal.title}
  message={confirmModal.message}
  confirmText={confirmModal.confirmText}
  confirmVariant={confirmModal.variant}
  onConfirm={() => confirmCallback?.()}
  onCancel={() => {}}
/>

<AlertModal
  bind:isOpen={alertModal.isOpen}
  title={alertModal.title}
  message={alertModal.message}
  variant={alertModal.variant}
  onClose={() => {}}
/>
