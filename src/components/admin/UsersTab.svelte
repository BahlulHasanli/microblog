<script lang="ts">
  import { onMount } from 'svelte';
  import { formatFullDate } from '@/utils/date';
  import ConfirmModal from './ConfirmModal.svelte';
  import AlertModal from './AlertModal.svelte';

  interface Props {
    canEdit?: boolean;
    canDelete?: boolean;
  }

  const { canEdit = false, canDelete = false }: Props = $props();

  interface User {
    id: string;
    email: string;
    fullname: string;
    username: string;
    avatar: string;
    role_id: number;
    created_at: string;
  }

  // Rol helper funksiyaları
  // 1 = Admin, 2 = Moderator, 3 = Editor, 4 = User
  function getRoleName(roleId: number): string {
    switch (roleId) {
      case 1: return 'Admin';
      case 2: return 'Moderator';
      case 3: return 'Redaktor';
      default: return 'İstifadəçi';
    }
  }

  function getRoleDotColor(roleId: number): string {
    switch (roleId) {
      case 1: return 'bg-red-500';
      case 2: return 'bg-yellow-500';
      case 3: return 'bg-green-500';
      default: return 'bg-base-300';
    }
  }

  function getRoleTextColor(roleId: number): string {
    switch (roleId) {
      case 1: return 'text-red-700';
      case 2: return 'text-yellow-700';
      case 3: return 'text-green-700';
      default: return 'text-base-600';
    }
  }

  let users: User[] = $state([]);
  let loading = $state(true);
  let editingUser: User | null = $state(null);

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

  onMount(() => {
    loadUsers();
  });

  async function loadUsers() {
    try {
      loading = true;
      const response = await fetch("/api/admin/users/list");
      const data = await response.json();

      if (data.success) {
        users = data.users;
      }
    } catch (error) {
      console.error("İstifadəçilər yüklənərkən xəta:", error);
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

  async function handleDelete(userId: string) {
    confirmCallback = async () => {
      try {
        const response = await fetch("/api/admin/users/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });

        const data = await response.json();

        if (data.success) {
          showAlert("İstifadəçi uğurla silindi", 'success', 'Uğurlu');
          loadUsers();
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
      title: 'İstifadəçi silinməsi',
      message: "Bu istifadəçini silmək istədiyinizə əminsiniz? Bu əməliyyat geri alına bilməz.",
      confirmText: 'Sil',
      variant: 'danger'
    };
  }

  async function handleUpdate() {
    if (!editingUser) return;

    try {
      const response = await fetch("/api/admin/users/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingUser.id,
          fullname: editingUser.fullname,
          email: editingUser.email,
          username: editingUser.username,
          role_id: editingUser.role_id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showAlert("İstifadəçi məlumatları uğurla yeniləndi", 'success', 'Uğurlu');
        editingUser = null;
        loadUsers();
      } else {
        showAlert(data.message || "Xəta baş verdi", 'error', 'Xəta');
      }
    } catch (error) {
      console.error("Yeniləmə xətası:", error);
      showAlert("Xəta baş verdi", 'error', 'Xəta');
    }
  }
</script>

<div class="p-4 sm:p-6 lg:p-8">
    <!-- Header -->
  <div class="mb-6">
    <h2 class="text-xl font-semibold text-slate-900 mb-2">İstifadəçilər idarəetməsi</h2>
    <p class="text-sm text-base-600">Sistem istifadəçilərinin idarə etməsi</p>
  </div>

  <!-- Users Table -->
  {#if loading}
    <div class="flex items-center justify-center py-16">
      <div class="flex flex-col items-center gap-3">
        <div class="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm text-base-600">Yüklənir...</p>
      </div>
    </div>
  {:else if users.length === 0}
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
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
      <p class="text-base-500 font-medium">İstifadəçi tapılmadı</p>
    </div>
  {:else}
    <div class="overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8">
      <div class="inline-block min-w-full align-middle">
      <table class="min-w-full divide-y divide-base-200">
        <thead class="bg-base-50">
          <tr>
            <th class="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
              İstifadəçi
            </th>
            <th class="hidden md:table-cell px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
              Email
            </th>
            <th class="hidden lg:table-cell px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
              İstifadəçi adı
            </th>
            <th class="hidden lg:table-cell px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
              Admin
            </th>
            <th class="hidden xl:table-cell px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
              Qeydiyyat tarixi
            </th>
            <th class="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
              Əməliyyatlar
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-base-100">
          {#each users as user (user.id)}
            <tr class="hover:bg-base-50 transition-all duration-200">
              <td class="px-4 sm:px-6 py-4 sm:py-5">
                <div class="flex flex-col gap-2">
                  <div class="flex items-center gap-3">
                    <img
                      class="h-9 w-9 sm:h-10 sm:w-10 rounded-full object-cover ring-2 ring-base-100"
                      src={user.avatar}
                      alt={user.fullname}
                    />
                    <div>
                      <div class="text-sm font-medium text-slate-900">
                        {user.fullname}
                      </div>
                      <div class="md:hidden text-xs text-base-600 mt-0.5">
                        {user.email}
                      </div>
                    </div>
                  </div>
                  <!-- Mobil üçün əlavə məlumat -->
                  <div class="flex lg:hidden items-center gap-3 text-xs">
                    <span class="text-base-700 font-medium">@{user.username}</span>
                    <div class="flex items-center gap-1.5">
                      <div class="w-1.5 h-1.5 rounded-full {getRoleDotColor(user.role_id)}"></div>
                      <span class="font-medium {getRoleTextColor(user.role_id)}">{getRoleName(user.role_id)}</span>
                    </div>
                  </div>
                </div>
              </td>
              <td class="hidden md:table-cell px-4 sm:px-6 py-4 sm:py-5 whitespace-nowrap text-sm text-base-600">
                {user.email}
              </td>
              <td class="hidden lg:table-cell px-4 sm:px-6 py-4 sm:py-5 whitespace-nowrap text-sm text-base-700">
                <span class="font-medium">@{user.username}</span>
              </td>
              <td class="hidden lg:table-cell px-4 sm:px-6 py-4 sm:py-5 whitespace-nowrap">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full {getRoleDotColor(user.role_id)}"></div>
                  <span class="text-xs font-medium {getRoleTextColor(user.role_id)}">
                    {getRoleName(user.role_id)}
                  </span>
                </div>
              </td>
              <td class="hidden xl:table-cell px-4 sm:px-6 py-4 sm:py-5 whitespace-nowrap text-xs text-base-500">
                {formatFullDate(user.created_at)}
              </td>
              <td class="px-4 sm:px-6 py-4 sm:py-5">
                <div class="flex flex-row flex-wrap items-center gap-2">
                  {#if canEdit}
                    <button
                      onclick={() => editingUser = user}
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
                      onclick={() => handleDelete(user.id)}
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

  <!-- Edit Modal -->
  {#if editingUser}
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div class="relative mx-auto p-6 sm:p-8 border border-base-200 w-full max-w-lg rounded-xl bg-white">
        <div class="flex items-center justify-between mb-5 sm:mb-6">
          <div>
            <h3 class="text-lg sm:text-xl font-nouvelr-bold text-slate-900">
              İstifadəçini redaktə et
            </h3>
            <p class="text-xs sm:text-sm text-base-500 mt-1">
              Məlumatları dəyişdirin
            </p>
          </div>
          <button
            onclick={() => editingUser = null}
            aria-label="Close"
            class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-base-100 transition-colors"
          >
            <svg
              class="w-5 h-5 text-base-600"
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
          </button>
        </div>

        <div class="space-y-4 sm:space-y-5">
          <div>
            <label for="fullname" class="block text-sm font-medium text-base-700 mb-2">
              Ad Soyad
            </label>
            <input
              type="text"
              bind:value={editingUser.fullname}
              class="block w-full border border-base-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label for="email" class="block text-sm font-medium text-base-700 mb-2">
              Email
            </label>
            <input
              type="email"
              bind:value={editingUser.email}
              class="block w-full border border-base-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label for="username" class="block text-sm font-medium text-base-700 mb-2">
              İstifadəçi adı
            </label>
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-base-500">
                @
              </span>
              <input
                type="text"
                bind:value={editingUser.username}
                class="block w-full border border-base-300 rounded-lg pl-8 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              />
            </div>
          </div>
          <div class="pt-4 pb-2">
            <label for="role_id" class="block text-sm font-medium text-base-700 mb-2">
              Rol
            </label>
            <select
              bind:value={editingUser.role_id}
              class="block w-full border border-base-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
            >
              <option value={4}>Sadə istifadəçi</option>
              <option value={3}>Redator</option>
              <option value={2}>Moderator</option>
              <option value={1}>Admin</option>
            </select>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-base-200">
          <button
            onclick={handleUpdate}
            class="flex-1 inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors"
          >
            <svg
              class="w-4 h-4"
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
            Yadda saxla
          </button>
          <button
            onclick={() => editingUser = null}
            class="flex-1 bg-transparent border border-base-300 text-base-700 px-4 py-2.5 rounded-lg font-medium hover:bg-base-100 transition-colors"
          >
            Ləğv et
          </button>
        </div>
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
