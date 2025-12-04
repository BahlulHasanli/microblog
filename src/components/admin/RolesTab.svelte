<script lang="ts">
  import { onMount } from 'svelte';
  import AlertModal from './AlertModal.svelte';
  import ConfirmModal from './ConfirmModal.svelte';

  interface Role {
    id: number;
    name: string;
    description: string;
    is_admin: boolean;
    is_moderator: boolean;
    created_at: string;
    updated_at: string;
  }

  let roles: Role[] = [];
  let loading = true;
  let error = '';
  let success = '';
  let editingRole: Role | null = null;
  let showEditModal = false;
  let showDeleteConfirm = false;
  let roleToDelete: Role | null = null;
  let formData = {
    name: '',
    description: '',
    is_admin: false,
    is_moderator: false,
  };

  onMount(() => {
    loadRoles();
  });

  async function loadRoles() {
    try {
      loading = true;
      const response = await fetch('/api/admin/roles/list');
      const data = await response.json();

      if (data.success) {
        roles = data.roles;
        error = '';
      } else {
        error = data.message || 'Rollər yüklənərkən xəta baş verdi';
      }
    } catch (err) {
      error = 'Rollər yüklənərkən xəta baş verdi';
      console.error(err);
    } finally {
      loading = false;
    }
  }

  function openEditModal(role: Role) {
    editingRole = role;
    formData = {
      name: role.name,
      description: role.description,
      is_admin: role.is_admin,
      is_moderator: role.is_moderator,
    };
    showEditModal = true;
  }

  function closeEditModal() {
    showEditModal = false;
    editingRole = null;
    formData = {
      name: '',
      description: '',
      is_admin: false,
      is_moderator: false,
    };
  }

  async function saveRole() {
    if (!editingRole) return;

    try {
      const response = await fetch(`/api/admin/roles/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingRole.id,
          ...formData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        success = 'Rol uğurla yeniləndi';
        closeEditModal();
        await loadRoles();
        setTimeout(() => (success = ''), 3000);
      } else {
        error = data.message || 'Rol yenilənərkən xəta baş verdi';
      }
    } catch (err) {
      error = 'Rol yenilənərkən xəta baş verdi';
      console.error(err);
    }
  }

  function openDeleteConfirm(role: Role) {
    roleToDelete = role;
    showDeleteConfirm = true;
  }

  async function deleteRole() {
    if (!roleToDelete) return;

    try {
      const response = await fetch(`/api/admin/roles/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: roleToDelete.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        success = 'Rol uğurla silindi';
        showDeleteConfirm = false;
        roleToDelete = null;
        await loadRoles();
        setTimeout(() => (success = ''), 3000);
      } else {
        error = data.message || 'Rol silinərkən xəta baş verdi';
      }
    } catch (err) {
      error = 'Rol silinərkən xəta baş verdi';
      console.error(err);
    }
  }

  function getRoleBadgeColor(role: Role): string {
    if (role.is_admin) return 'bg-red-100 text-red-800';
    if (role.is_moderator) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  }

  function getRoleIcon(role: Role): string {
    if (role.is_admin) return '👑';
    if (role.is_moderator) return '🛡️';
    return '👤';
  }
</script>

<div class="p-6">
  <!-- Header -->
  <div class="mb-6">
    <h2 class="text-xl font-semibold text-slate-900 mb-2">Rollər İdarəetməsi</h2>
    <p class="text-sm text-base-600">Sistem rollarını və icazələrini idarə edin</p>
  </div>

  <!-- Alert Messages -->
  {#if error}
    <AlertModal
      type="error"
      message={error}
      onClose={() => (error = '')}
    />
  {/if}

  {#if success}
    <AlertModal
      type="success"
      message={success}
      onClose={() => (success = '')}
    />
  {/if}

  <!-- Loading State -->
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin">
        <svg class="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>
    </div>
  {:else if roles.length === 0}
    <div class="text-center py-12">
      <p class="text-base-600">Heç bir rol tapılmadı</p>
    </div>
  {:else}
    <!-- Roles Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      {#each roles as role (role.id)}
        <div class="bg-white border border-base-200 rounded-lg p-6 hover:shadow-md transition-shadow">
          <!-- Role Header -->
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="text-2xl">{getRoleIcon(role)}</div>
              <div>
                <h3 class="font-semibold text-slate-900">{role.name}</h3>
                <p class="text-sm text-base-600">{role.description}</p>
              </div>
            </div>
            <span class={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor(role)}`}>
              {#if role.is_admin}
                Admin
              {:else if role.is_moderator}
                Moderator
              {:else}
                İstifadəçi
              {/if}
            </span>
          </div>

          <!-- Permissions -->
          <div class="space-y-2 mb-6 pb-6 border-b border-base-100">
            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                checked={role.is_admin}
                disabled
                class="w-4 h-4 rounded"
              />
              <span class="text-sm text-slate-700">Admin Hüququ</span>
            </div>
            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                checked={role.is_moderator}
                disabled
                class="w-4 h-4 rounded"
              />
              <span class="text-sm text-slate-700">Moderator Hüququ</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-3">
            <button
              on:click={() => openEditModal(role)}
              class="flex-1 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
            >
              Redaktə Et
            </button>
            {#if role.name !== 'Sadə istifadəçi'}
              <button
                on:click={() => openDeleteConfirm(role)}
                class="flex-1 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
              >
                Sil
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Edit Modal -->
  {#if showEditModal && editingRole}
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-md w-full p-6">
        <h3 class="text-lg font-semibold text-slate-900 mb-4">Rol Redaktə Et</h3>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Rol Adı</label>
            <input
              type="text"
              bind:value={formData.name}
              class="w-full px-3 py-2 border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Təsvir</label>
            <textarea
              bind:value={formData.description}
              rows="3"
              class="w-full px-3 py-2 border border-base-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div class="space-y-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                bind:checked={formData.is_admin}
                class="w-4 h-4 rounded"
              />
              <span class="text-sm text-slate-700">Admin Hüququ</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                bind:checked={formData.is_moderator}
                class="w-4 h-4 rounded"
              />
              <span class="text-sm text-slate-700">Moderator Hüququ</span>
            </label>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button
            on:click={closeEditModal}
            class="flex-1 px-4 py-2 border border-base-200 text-slate-700 rounded-lg hover:bg-base-50 transition-colors"
          >
            Ləğv Et
          </button>
          <button
            on:click={saveRole}
            class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Yadda Saxla
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Delete Confirm Modal -->
  {#if showDeleteConfirm && roleToDelete}
    <ConfirmModal
      title="Rolu Sil"
      message={`"${roleToDelete.name}" rolunu silmək istədiyinizə əminsiniz?`}
      onConfirm={deleteRole}
      onCancel={() => {
        showDeleteConfirm = false;
        roleToDelete = null;
      }}
    />
  {/if}
</div>

<style>
  input[type='checkbox']:disabled {
    @apply cursor-not-allowed opacity-60;
  }
</style>
