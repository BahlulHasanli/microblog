<script lang="ts">
  import { onMount } from 'svelte';
  import { subDays, isAfter } from 'date-fns';
  import PostsTab from './PostsTab.svelte';
  import UsersTab from './UsersTab.svelte';
  import SettingsTab from './SettingsTab.svelte';
  import CommentsTab from './CommentsTab.svelte';

  export let user: any;

  let activeTab: 'posts' | 'users' | 'comments' | 'settings' = 'posts';
  
  // Moderator yalnız Posts tabını görə bilər
  $: isAdmin = user?.is_admin === true;
  $: isModerator = user?.is_moderator === true;
  $: canViewUsers = isAdmin;
  $: canViewComments = isAdmin;
  $: canViewSettings = isAdmin;
  let stats = {
    totalPosts: 0,
    pendingPosts: 0,
    totalUsers: 0,
    newUsers: 0,
    totalComments: 0,
    parentComments: 0,
    replyComments: 0,
  };

  onMount(() => {
    loadStats();
  });

  async function loadStats() {
    try {
      // Postları yüklə
      const postsResponse = await fetch("/api/admin/posts/list?status=all");
      const postsData = await postsResponse.json();

      // İstifadəçiləri yüklə
      let usersData = { success: false, users: [] };
      try {
        const usersResponse = await fetch("/api/admin/users/list");
        if (usersResponse.ok) {
          usersData = await usersResponse.json();
        }
      } catch (e) {
        // Moderator üçün xəta olacaq, amma stats yüklənməyə davam edəcək
      }

      // Şərhləri yüklə
      let commentsData = { success: false, comments: [] };
      try {
        const commentsResponse = await fetch("/api/admin/comments/list");
        if (commentsResponse.ok) {
          commentsData = await commentsResponse.json();
        }
      } catch (e) {
        // Moderator üçün xəta olacaq, amma stats yüklənməyə davam edəcək
      }

      if (postsData.success) {
        const pending = postsData.posts.filter(
          (p: any) => p.status === "pending"
        ).length;

        // Son 7 gündə qeydiyyatdan keçmiş istifadəçilər
        const sevenDaysAgo = subDays(new Date(), 7);
        const newUsers = usersData.success ? usersData.users.filter(
          (u: any) => isAfter(new Date(u.created_at), sevenDaysAgo)
        ).length : 0;

        // Şərh statistikaları
        const parentComments = commentsData.success ? commentsData.comments.filter(
          (c: any) => c.parent_id === null
        ).length : 0;
        const replyComments = commentsData.success ? commentsData.comments.filter(
          (c: any) => c.parent_id !== null
        ).length : 0;

        stats = {
          totalPosts: postsData.posts.length,
          pendingPosts: pending,
          totalUsers: usersData.success ? usersData.users.length : 0,
          newUsers: newUsers,
          totalComments: commentsData.success ? commentsData.comments.length : 0,
          parentComments: parentComments,
          replyComments: replyComments,
        };
      }
    } catch (error) {
      console.error("Stats yüklənərkən xəta:", error);
    }
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-base-50 to-white">
  <!-- Header -->
  <header class="bg-white/80 backdrop-blur-sm border-b border-base-200/50 sticky top-0 z-10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div class="flex items-center gap-3 sm:gap-4">
          <div class="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-slate-900 to-slate-700 rounded-lg flex items-center justify-center">
            <svg
              class="w-5 h-5 sm:w-6 sm:h-6 text-white"
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
          </div>
          <div>
            <h1 class="text-xl sm:text-2xl font-nouvelr-bold text-slate-900">
              {isAdmin ? 'Admin Panel' : isModerator ? 'Moderator Panel' : 'Panel'}
            </h1>
            <p class="text-xs text-base-500 hidden sm:block">{isAdmin ? 'Admin idarəetmə paneli' : isModerator ? 'Moderator idarəetmə paneli' : 'İdarəetmə paneli'}</p>
          </div>
        </div>
        <div class="flex items-center gap-3 sm:gap-6 w-full sm:w-auto">
          <div class="flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 bg-base-50 rounded-lg flex-1 sm:flex-initial">
            <img
              src={user?.avatar}
              alt={user?.fullname}
              class="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-white"
            />
            <div class="flex flex-col min-w-0">
              <span class="text-xs sm:text-sm font-medium text-slate-900 truncate">
                {user?.fullname}
              </span>
              <span class="text-xs text-base-500">{isAdmin ? 'Admin' : isModerator ? 'Moderator' : 'İstifadəçi'}</span>
            </div>
          </div>
          <a
            href="/"
            class="inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-base-700 hover:text-slate-900 bg-white border border-base-200 rounded-lg hover:bg-base-50 transition-all"
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
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span class="hidden sm:inline">Ana səhifə</span>
          </a>
        </div>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
    <!-- Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
      <!-- Postlar Bloku -->
      <div class="bg-white rounded-xl p-4 sm:p-6 border border-base-100">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 class="text-sm font-semibold text-slate-900">Postlar</h3>
        </div>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-base-600">Ümumi</span>
            <span class="text-xl font-medium text-slate-900">{stats.totalPosts}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-base-600">Gözləyən</span>
            <span class="text-xl font-medium text-slate-900">{stats.pendingPosts}</span>
          </div>
        </div>
      </div>

      <!-- İstifadəçilər Bloku -->
      <div class="bg-white rounded-xl p-4 sm:p-6 border border-base-100">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 class="text-sm font-semibold text-slate-900">İstifadəçilər</h3>
        </div>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-base-600">Ümumi</span>
            <span class="text-xl font-medium text-slate-900">{stats.totalUsers}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-base-600">Yeni (7 gün)</span>
            <span class="text-xl font-medium text-slate-900">{stats.newUsers}</span>
          </div>
        </div>
      </div>

      <!-- Şərhlər Bloku -->
      <div class="bg-white rounded-xl p-4 sm:p-6 border border-base-100">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 class="text-sm font-semibold text-slate-900">Şərhlər</h3>
        </div>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-base-600">Ümumi</span>
            <span class="text-xl font-medium text-slate-900">{stats.totalComments}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-base-600">Əsas / Cavab</span>
            <span class="text-xl font-medium text-slate-900">{stats.parentComments} / {stats.replyComments}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="bg-white rounded-xl border border-base-100 overflow-hidden">
      <div class="border-b border-base-100 bg-base-50/50">
        <nav class="flex px-4 sm:px-6 overflow-x-auto">
          <button
            on:click={() => activeTab = 'posts'}
            class="cursor-pointer relative px-4 sm:px-6 py-3 sm:py-4 font-medium text-xs sm:text-sm transition-all whitespace-nowrap {activeTab === 'posts' ? 'text-slate-900' : 'text-base-600 hover:text-slate-900'}"
          >
            <span class="relative z-10 flex items-center gap-1.5 sm:gap-2">
              <svg
                class="w-3.5 h-3.5 sm:w-4 sm:h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Postlar
            </span>
            {#if activeTab === 'posts'}
              <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900"></div>
            {/if}
          </button>
          {#if canViewUsers}
            <button
              on:click={() => activeTab = 'users'}
              class="cursor-pointer relative px-4 sm:px-6 py-3 sm:py-4 font-medium text-xs sm:text-sm transition-all whitespace-nowrap {activeTab === 'users' ? 'text-slate-900' : 'text-base-600 hover:text-slate-900'}"
            >
              <span class="relative z-10 flex items-center gap-1.5 sm:gap-2">
                <svg
                  class="w-3.5 h-3.5 sm:w-4 sm:h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                İstifadəçilər
              </span>
              {#if activeTab === 'users'}
                <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900"></div>
              {/if}
            </button>
          {/if}
          {#if canViewComments}
            <button
              on:click={() => activeTab = 'comments'}
              class="cursor-pointer relative px-4 sm:px-6 py-3 sm:py-4 font-medium text-xs sm:text-sm transition-all whitespace-nowrap {activeTab === 'comments' ? 'text-slate-900' : 'text-base-600 hover:text-slate-900'}"
            >
              <span class="relative z-10 flex items-center gap-1.5 sm:gap-2">
                <svg
                  class="w-3.5 h-3.5 sm:w-4 sm:h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                Şərhlər
              </span>
              {#if activeTab === 'comments'}
                <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900"></div>
              {/if}
            </button>
          {/if}
          {#if canViewSettings}
            <button
              on:click={() => activeTab = 'settings'}
              class="cursor-pointer relative px-4 sm:px-6 py-3 sm:py-4 font-medium text-xs sm:text-sm transition-all whitespace-nowrap {activeTab === 'settings' ? 'text-slate-900' : 'text-base-600 hover:text-slate-900'}"
            >
              <span class="relative z-10 flex items-center gap-1.5 sm:gap-2">
                <svg
                  class="w-3.5 h-3.5 sm:w-4 sm:h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Nizamlamalar
              </span>
              {#if activeTab === 'settings'}
                <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900"></div>
              {/if}
            </button>
          {/if}
        </nav>
      </div>

      <!-- Tab Content -->
      <div>
        {#if activeTab === 'posts'}
          <PostsTab />
        {:else if activeTab === 'users'}
          <UsersTab />
        {:else if activeTab === 'comments'}
          <CommentsTab />
        {:else}
          <SettingsTab />
        {/if}
      </div>
    </div>
  </div>
</div>
