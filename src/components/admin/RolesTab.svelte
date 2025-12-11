<script lang="ts">
  import { onMount } from 'svelte';
  import AlertModal from './AlertModal.svelte';
  import ConfirmModal from './ConfirmModal.svelte';
  import { getCategoryDisplayName, getPermissionDisplayName } from '@/utils/permissions';

  interface Props {
    canEdit?: boolean;
  }

  const { canEdit = false }: Props = $props();

  interface Role {
    id: number;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
  }

  interface Permission {
    id: number;
    name: string;
    description: string;
    category: string;
  }

  // Rol helper funksiyaları
  // 1 = Admin, 2 = Moderator, 3 = Editor, 4 = User
  function getRoleBadgeColor(roleId: number): string {
    switch (roleId) {
      case 1: return 'bg-red-100 text-red-800';
      case 2: return 'bg-yellow-100 text-yellow-800';
      case 3: return 'bg-green-100 text-green-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  }


  function getRoleTypeName(roleId: number): string {
    switch (roleId) {
      case 1: return 'Admin';
      case 2: return 'Moderator';
      case 3: return 'Redaktor';
      default: return 'İstifadəçi';
    }
  }

  let roles: Role[] = $state([]);
  let permissions: Permission[] = $state([]);
  let rolePermissions: Record<number, number[]> = $state({});
  let loading = $state(true);
  let loadingPermissions = $state(false);
  let error = $state('');
  let success = $state('');
  let editingRole: Role | null = $state(null);
  let showEditModal = $state(false);
  let showPermissionsModal = $state(false);
  let editingPermissionsRole: Role | null = $state(null);
  let selectedPermissions: number[] = $state([]);
  let savingPermissions = $state(false);
  let showDeleteConfirm = $state(false);
  let roleToDelete: Role | null = $state(null);
  let formData = $state({
    name: '',
    description: '',
  });

  onMount(() => {
    loadRoles();
    loadPermissions();
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

  async function loadPermissions() {
    try {
      loadingPermissions = true;
      // Bütün icazələri yüklə
      const permResponse = await fetch('/api/admin/permissions/list');
      const permData = await permResponse.json();
      if (permData.success && permData.permissions) {
        permissions = permData.permissions;
      }

      // Rol icazələrini yüklə
      const rolePermResponse = await fetch('/api/admin/permissions/role-permissions');
      const rolePermData = await rolePermResponse.json();
      if (rolePermData.success && rolePermData.rolePermissions) {
        // rolePermissions-u permission id-lərinə çevir
        const permMap: Record<number, number[]> = {};
        for (const [roleId, permNames] of Object.entries(rolePermData.rolePermissions)) {
          const permIds = (permNames as string[]).map(name => {
            const perm = permissions.find(p => p.name === name);
            return perm?.id;
          }).filter(Boolean) as number[];
          permMap[Number(roleId)] = permIds;
        }
        rolePermissions = permMap;
      }
    } catch (err) {
      console.error('Permissions yüklənərkən xəta:', err);
    } finally {
      loadingPermissions = false;
    }
  }

  function openPermissionsModal(role: Role) {
    editingPermissionsRole = role;
    selectedPermissions = rolePermissions[role.id] || [];
    showPermissionsModal = true;
    // Modal açıldıqdan sonra permission-ləri yüklə (gecikmə olmadan)
    loadPermissions();
  }

  function closePermissionsModal() {
    showPermissionsModal = false;
    editingPermissionsRole = null;
    selectedPermissions = [];
  }

  function togglePermission(permId: number) {
    if (selectedPermissions.includes(permId)) {
      selectedPermissions = selectedPermissions.filter(id => id !== permId);
    } else {
      selectedPermissions = [...selectedPermissions, permId];
    }
  }

  async function savePermissions() {
    if (!editingPermissionsRole) return;

    try {
      savingPermissions = true;
      const response = await fetch('/api/admin/permissions/role-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_id: editingPermissionsRole.id,
          permission_ids: selectedPermissions,
        }),
      });

      const data = await response.json();

      if (data.success) {
        success = 'İcazələr uğurla yeniləndi';
        rolePermissions[editingPermissionsRole.id] = [...selectedPermissions];
        closePermissionsModal();
        // AdminPanel-ə permission-ləri yenilə siqnalı göndər
        window.dispatchEvent(new Event('permissions-updated'));
        setTimeout(() => (success = ''), 3000);
      } else {
        error = data.message || 'İcazələr yenilənərkən xəta baş verdi';
      }
    } catch (err) {
      error = 'İcazələr yenilənərkən xəta baş verdi';
      console.error(err);
    } finally {
      savingPermissions = false;
    }
  }

  // Permissions-ı kateqoriyaya görə qruplaşdır
  function groupPermissionsByCategory(perms: Permission[]): Record<string, Permission[]> {
    return perms.reduce((acc, perm) => {
      if (!acc[perm.category]) {
        acc[perm.category] = [];
      }
      acc[perm.category].push(perm);
      return acc;
    }, {} as Record<string, Permission[]>);
  }

  function openEditModal(role: Role) {
    editingRole = role;
    formData = {
      name: role.name,
      description: role.description,
    };
    showEditModal = true;
  }

  function closeEditModal() {
    showEditModal = false;
    editingRole = null;
    formData = {
      name: '',
      description: '',
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

</script>

<div class="p-6">
  <!-- Header -->
  <div class="mb-6">
    <h2 class="text-xl font-semibold text-slate-900 mb-2">Rollar idarəetməsi</h2>
    <p class="text-sm text-base-600">Sistem rollarını və icazələrini idarə edin</p>
  </div>

  <!-- Alert Messages -->
  {#if error}
    <AlertModal
      isOpen={true}
      variant="error"
      message={error}
      onClose={() => (error = '')}
    />
  {/if}

  {#if success}
    <AlertModal
      isOpen={true}
      variant="success"
      message={success}
      onClose={() => (success = '')}
    />
  {/if}

  <!-- Loading State -->
  {#if loading}
    <div class="flex items-center justify-center py-16">
      <div class="flex flex-col items-center gap-3">
        <div class="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm text-base-600">Yüklənir...</p>
      </div>
    </div>
  {:else if roles.length === 0}
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
          d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
        />
      </svg>
      <p class="text-base-500 font-medium">Heç bir rol tapılmadı</p>
    </div>
  {:else}
    <!-- Roles Table -->
    <div class="overflow-x-auto -mx-6 sm:-mx-8">
      <div class="inline-block min-w-full align-middle">
        <table class="min-w-full divide-y divide-base-200">
          <thead class="bg-base-50">
            <tr>
              <th class="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
                Rol
              </th>
              <th class="hidden md:table-cell px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
                Təsvir
              </th>
              <th class="hidden lg:table-cell px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
                Rol ID
              </th>
              <th class="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-base-600 uppercase tracking-wide">
                Əməliyyatlar
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-base-100">
            {#each roles as role (role.id)}
              <tr class="hover:bg-base-50 transition-all duration-200">
                <td class="px-4 sm:px-6 py-4 sm:py-5">
                  <div class="flex items-center gap-3">
                    <div>
                      <div class="text-sm font-medium text-slate-900">
                        {role.name}
                      </div>
                      <div class="md:hidden text-xs text-base-600 mt-0.5">
                        {role.description}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="hidden md:table-cell px-4 sm:px-6 py-4 sm:py-5 text-sm text-base-600">
                  {role.description}
                </td>
                <td class="hidden lg:table-cell px-4 sm:px-6 py-4 sm:py-5 whitespace-nowrap">
                  <span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(role.id)}`}>
                    {getRoleTypeName(role.id)}
                  </span>
                </td>
                <td class="px-4 sm:px-6 py-4 sm:py-5">
                  <div class="flex flex-row flex-wrap items-center gap-2">
                    {#if canEdit}
                      <button
                        onclick={() => openPermissionsModal(role)}
                        class="cursor-pointer inline-flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2 sm:py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-md hover:bg-purple-100 transition-colors whitespace-nowrap"
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
                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                          />
                        </svg>
                        <span class="hidden sm:inline">İcazələr</span>
                      </button>
                      <button
                        onclick={() => openEditModal(role)}
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
                      {#if role.name !== 'Sadə istifadəçi'}
                        <button
                          onclick={() => openDeleteConfirm(role)}
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
  {#if showEditModal && editingRole}
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div class="relative mx-auto p-6 sm:p-8 border border-base-200 w-full max-w-lg rounded-xl bg-white">
        <div class="flex items-center justify-between mb-5 sm:mb-6">
          <div>
            <h3 class="text-lg sm:text-xl font-nouvelr-bold text-slate-900">
              Rolu redaktə et
            </h3>
            <p class="text-xs sm:text-sm text-base-500 mt-1">
              Rol məlumatlarını dəyişdirin
            </p>
          </div>
          <button
            onclick={closeEditModal}
            aria-label="Close"
            class="cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-base-100 transition-colors"
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
            <label for="role-name" class="block text-sm font-medium text-base-700 mb-2">
              Rol Adı
            </label>
            <input
              id="role-name"
              type="text"
              bind:value={formData.name}
              class="block w-full border border-base-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label for="role-description" class="block text-sm font-medium text-base-700 mb-2">
              Təsvir
            </label>
            <textarea
              id="role-description"
              bind:value={formData.description}
              rows="3"
              class="block w-full border border-base-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
            ></textarea>
          </div>

          <div class="p-3 bg-base-50 rounded-lg">
            <p class="text-xs text-base-600">Rol ID: <span class="font-medium text-slate-900">{editingRole?.id}</span></p>
            <p class="text-xs text-base-500 mt-1">Rol ID dəyişdirilə bilməz. Yeni rol yaratmaq lazımdırsa, verilənlər bazasında əlavə edin.</p>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-base-200">
          <button
            onclick={closeEditModal}
            class="cursor-pointer flex-1 bg-transparent border border-base-300 text-base-700 px-4 py-2.5 rounded-lg font-medium hover:bg-base-100 transition-colors"
          >
            Ləğv et
          </button>
          <button
            onclick={saveRole}
            class="cursor-pointer flex-1 inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors"
          >
            Yadda saxla
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Delete Confirm Modal -->
  {#if showDeleteConfirm && roleToDelete}
    <ConfirmModal
      isOpen={showDeleteConfirm}
      title="Rolu Sil"
      message={`"${roleToDelete.name}" rolunu silmək istədiyinizə əminsiniz?`}
      confirmVariant="danger"
      onConfirm={deleteRole}
      onCancel={() => {
        showDeleteConfirm = false;
        roleToDelete = null;
      }}
    />
  {/if}

  <!-- Permissions Modal -->
  {#if showPermissionsModal && editingPermissionsRole}
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div class="relative mx-auto p-6 sm:p-8 border border-base-200 w-full max-w-2xl rounded-xl bg-white max-h-[90vh] overflow-hidden flex flex-col">
        <div class="flex items-center justify-between mb-5 sm:mb-6">
          <div>
            <h3 class="text-lg sm:text-xl font-nouvelr-bold text-slate-900">
              İcazələri idarə et
            </h3>
            <p class="text-xs sm:text-sm text-base-500 mt-1">
              <span class="font-medium text-slate-700">{editingPermissionsRole.name}</span> rolu üçün icazələr
            </p>
          </div>
          <button
            onclick={closePermissionsModal}
            aria-label="Close"
            class="cursor-pointer w-8 h-8 flex items-center justify-center rounded-lg hover:bg-base-100 transition-colors"
          >
            <svg class="w-5 h-5 text-base-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto space-y-6 pr-2">
          {#if loadingPermissions}
            <!-- Skeleton Loading -->
            {#each [1, 2, 3, 4, 5] as _}
              <div class="border border-base-200 rounded-lg overflow-hidden animate-pulse">
                <div class="bg-base-100 px-4 py-3 border-b border-base-200">
                  <div class="h-4 bg-base-200 rounded w-24"></div>
                </div>
                <div class="p-4 space-y-3">
                  {#each [1, 2, 3] as _}
                    <div class="flex items-start gap-3">
                      <div class="w-4 h-4 bg-base-200 rounded mt-0.5 flex-shrink-0"></div>
                      <div class="flex-1 space-y-2">
                        <div class="h-4 bg-base-200 rounded w-32"></div>
                        <div class="h-3 bg-base-100 rounded w-48"></div>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          {:else}
            {#each Object.entries(groupPermissionsByCategory(permissions)) as [category, categoryPermissions]}
              <div class="border border-base-200 rounded-lg overflow-hidden">
                <div class="bg-base-50 px-4 py-3 border-b border-base-200">
                  <h4 class="text-sm font-medium text-slate-900">{getCategoryDisplayName(category)}</h4>
                </div>
                <div class="p-4 space-y-3">
                  {#each categoryPermissions as permission}
                    <label class="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(permission.id)}
                        onchange={() => togglePermission(permission.id)}
                        class="mt-0.5 w-4 h-4 text-slate-900 border-base-300 rounded focus:ring-slate-900 cursor-pointer"
                      />
                      <div class="flex-1">
                        <span class="text-sm font-medium text-slate-900 group-hover:text-slate-700">
                          {getPermissionDisplayName(permission.name)}
                        </span>
                        <p class="text-xs text-base-500 mt-0.5">{permission.description}</p>
                      </div>
                    </label>
                  {/each}
                </div>
              </div>
            {/each}
          {/if}
        </div>

        <div class="flex flex-col sm:flex-row gap-3 mt-6 pt-5 border-t border-base-200">
          <button
            onclick={closePermissionsModal}
            class="cursor-pointer flex-1 bg-transparent border border-base-300 text-base-700 px-4 py-2.5 rounded-lg font-medium hover:bg-base-100 transition-colors"
          >
            Ləğv et
          </button>
          <button
            onclick={savePermissions}
            disabled={savingPermissions}
            class="cursor-pointer flex-1 inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {#if savingPermissions}
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Saxlanılır...
            {:else}
              Yadda saxla
            {/if}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

