<script lang="ts">
  import { onMount } from 'svelte';
  import AlertModal from './AlertModal.svelte';
  import ConfirmModal from './ConfirmModal.svelte';

  interface Props {
    canEdit?: boolean;
    canDelete?: boolean;
  }

  const { canEdit = false, canDelete = false }: Props = $props();

  interface Category {
    id: number;
    slug: string;
    name: string;
    parent_id: number | null;
    sort_order: number;
  }

  let categories: Category[] = $state([]);
  let loading = $state(true);

  // Modal states
  let alertModal = $state({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info' as 'success' | 'error' | 'info' | 'warning'
  });

  let confirmModal = $state({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: 'Ləğv et',
    action: () => {}
  });

  // Form states
  let isEditing = $state(false);
  let editingCategoryId = $state<number | null>(null);
  let formLoading = $state(false);
  let formContainer: HTMLDivElement | undefined = $state();
  
  let formData = $state({
    name: '',
    parent_id: '' as string | number,
    sort_order: 0
  });

  onMount(() => {
    loadCategories();
  });

  async function loadCategories() {
    try {
      loading = true;
      const response = await fetch("/api/admin/categories/list");
      const data = await response.json();

      if (data.success && data.categories) {
        categories = data.categories;
      }
    } catch (error) {
      console.error("Bölmələr yüklənərkən xəta:", error);
      showAlert("Veb serverlə əlaqə qurula bilmədi", "error", "Xəta");
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

  function showConfirm(title: string, message: string, confirmText: string, action: () => void) {
    confirmModal = {
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText: 'Ləğv et',
      action
    };
  }

  function handleEdit(category: Category) {
    isEditing = true;
    editingCategoryId = category.id;
    formData = {
      name: category.name,
      parent_id: category.parent_id === null ? '' : category.parent_id,
      sort_order: category.sort_order || 0
    };
    if (formContainer) {
      formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function handleCancelEdit() {
    isEditing = false;
    editingCategoryId = null;
    formData = {
      name: '',
      parent_id: '',
      sort_order: 0
    };
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      showAlert("Bölmə adı tələb olunur", "warning", "Xəbərdarlıq");
      return;
    }

    try {
      formLoading = true;
      const url = isEditing ? '/api/admin/categories/update' : '/api/admin/categories/create';
      const body = {
        ...(isEditing && { id: editingCategoryId }),
        name: formData.name,
        parent_id: formData.parent_id === '' ? null : Number(formData.parent_id),
        sort_order: formData.sort_order
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        showAlert(`Bölmə uğurla ${isEditing ? 'yeniləndi' : 'yaradıldı'}`, "success", "Uğurlu");
        await loadCategories();
        handleCancelEdit();
      } else {
        showAlert(data.message || "Xəta baş verdi", "error", "Xəta");
      }
    } catch (error) {
      console.error("Saxlama xətası:", error);
      showAlert("Saxlanılarkən xəta baş verdi", "error", "Xəta");
    } finally {
      formLoading = false;
    }
  }

  function requestDelete(category: Category) {
    showConfirm(
      "Bölmənı Sil",
      `"${category.name}" bölməsını silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.`,
      "Sil",
      () => handleDelete(category.id)
    );
  }

  async function handleDelete(id: number) {
    try {
      const response = await fetch('/api/admin/categories/delete', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });

      const data = await response.json();

      if (data.success) {
        showAlert("Bölmə uğurla silindi", "success", "Uğurlu");
        await loadCategories();
      } else {
        showAlert(data.message || "Xəta baş verdi", "error", "Xəta");
      }
    } catch (error) {
      console.error("Silmə xətası:", error);
      showAlert("Silinərkən xəta baş verdi", "error", "Xəta");
    }
  }

  // Parent olaraq seçilə biləcək bölmələr (özünü və alt bölmələrı çıxarmaq olar, sadə olsun deyə yalnız özü çıxarılır)
  const availableParents = $derived(categories.filter(c => c.id !== editingCategoryId));

</script>

<div class="p-4 sm:p-6 lg:p-8">
  <div class="sm:flex sm:items-center sm:justify-between mb-8">
    <div>
      <h2 class="text-xl sm:text-2xl font-nouvelr-bold text-slate-900">
        Bölmələr
      </h2>
      <p class="mt-1 text-sm text-base-500">
        Saytdakı bütün bölmələrı idarə edin.
      </p>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <!-- Form qismi -->
    {#if canEdit}
      <div class="lg:col-span-1" bind:this={formContainer}>
        <div class="bg-white rounded-xl border border-base-200 overflow-hidden shadow-sm">
          <div class="px-4 py-5 sm:p-6 border-b border-base-200 bg-base-50/50">
            <h3 class="text-base font-semibold text-slate-900">
              {isEditing ? 'Bölməni Yenilə' : 'Yeni Bölmə'}
            </h3>
          </div>
          <div class="p-4 sm:p-6 space-y-4">
            <div>
              <label for="name" class="block text-sm font-medium text-base-700 mb-1">Bölmə Adı</label>
              <input
                type="text"
                id="name"
                bind:value={formData.name}
                class="block w-full border border-base-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                placeholder="Məsələn: Texnologiya"
              />
            </div>

            <div>
              <label for="parent_id" class="block text-sm font-medium text-base-700 mb-1">Üst Bölmə</label>
              <select
                id="parent_id"
                bind:value={formData.parent_id}
                class="block w-full border border-base-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              >
                <option value="">(Heç biri)</option>
                {#each availableParents as parent}
                  <option value={parent.id}>{parent.name}</option>
                {/each}
              </select>
            </div>

            <div>
              <label for="sort_order" class="block text-sm font-medium text-base-700 mb-1">Sıralama (0. 1. 2.)</label>
              <input
                type="number"
                id="sort_order"
                bind:value={formData.sort_order}
                class="block w-full border border-base-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              />
            </div>

            <div class="pt-4 flex items-center justify-end gap-3">
              {#if isEditing}
                <button
                  type="button"
                  onclick={handleCancelEdit}
                  disabled={formLoading}
                  class="px-4 py-2 text-sm font-medium text-base-700 bg-white border border-base-300 rounded-lg hover:bg-base-50 transition-colors disabled:opacity-50"
                >
                  Ləğv et
                </button>
              {/if}
              <button
                type="button"
                onclick={handleSave}
                disabled={formLoading}
                class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-slate-900 border border-transparent rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {#if formLoading}
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saxlanılır...
                {:else}
                  {isEditing ? 'Yenilə' : 'Yarat'}
                {/if}
              </button>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Siyahı qismi -->
    <div class={canEdit ? "lg:col-span-2" : "lg:col-span-3"}>
      <div class="bg-white rounded-xl border border-base-200 overflow-hidden shadow-sm">
        {#if loading}
          <div class="flex items-center justify-center py-12">
            <div class="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          </div>
        {:else if categories.length === 0}
          <div class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-base-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-slate-900">Bölmə tapılmadı</h3>
            <p class="mt-1 text-sm text-base-500">Hazırda sistemdə heç bir bölmə yoxdur.</p>
          </div>
        {:else}
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-base-200">
              <thead class="bg-base-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-base-500 uppercase tracking-wider">
                    Ad
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-base-500 uppercase tracking-wider">
                    Slug
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-base-500 uppercase tracking-wider hidden sm:table-cell">
                    Üst Bölmə
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-base-500 uppercase tracking-wider hidden sm:table-cell">
                    Sırası
                  </th>
                  {#if canEdit || canDelete}
                    <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-base-500 uppercase tracking-wider">
                      Əməliyyatlar
                    </th>
                  {/if}
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-base-200">
                {#each categories as category}
                  <tr class="hover:bg-base-50 transition-colors" class:bg-blue-50={editingCategoryId === category.id}>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm font-medium text-slate-900">{category.name}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-base-500">
                      {category.slug}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-base-500 hidden sm:table-cell">
                      {#if category.parent_id}
                        {categories.find(c => c.id === category.parent_id)?.name || `ID: ${category.parent_id}`}
                      {:else}
                        -
                      {/if}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-base-500 hidden sm:table-cell">
                      {category.sort_order || 0}
                    </td>
                    {#if canEdit || canDelete}
                      <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex items-center justify-end gap-2 sm:gap-3">
                          {#if canEdit}
                            <button
                              onclick={() => handleEdit(category)}
                              class="text-blue-600 hover:text-blue-900 bg-blue-50 p-2 rounded-lg transition-colors cursor-pointer"
                              title="Redaktə et"
                            >
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                              </svg>
                            </button>
                          {/if}
                          {#if canDelete}
                            <button
                              onclick={() => requestDelete(category)}
                              class="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-lg transition-colors cursor-pointer"
                              title="Sil"
                            >
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                              </svg>
                            </button>
                          {/if}
                        </div>
                      </td>
                    {/if}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<!-- Modals -->
<AlertModal
  bind:isOpen={alertModal.isOpen}
  title={alertModal.title}
  message={alertModal.message}
  variant={alertModal.variant}
  onClose={() => {}}
/>

<ConfirmModal
  bind:isOpen={confirmModal.isOpen}
  title={confirmModal.title}
  message={confirmModal.message}
  confirmText={confirmModal.confirmText}
  cancelText={confirmModal.cancelText}
  onConfirm={() => {
    confirmModal.isOpen = false;
    confirmModal.action();
  }}
  onCancel={() => {
    confirmModal.isOpen = false;
  }}
/>
