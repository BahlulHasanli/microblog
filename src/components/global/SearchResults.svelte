<script lang="ts">
  import { Search, FileText, User, MessageSquare, Loader2, ArrowLeft } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { blurhashToDataURL, formatSimpleDate } from '@/utils/blurhash';

  interface Props {
    initialQuery: string;
  }

  const { initialQuery }: Props = $props();

  let query = $state('');
  $effect(() => { query = initialQuery; });
  let activeFilter: 'all' | 'posts' | 'users' | 'shares' = $state('all');
  let results = $state<any>({ posts: [], users: [], shares: [] });
  let isLoading = $state(false);
  let totalCount = $state(0);
  let hasSearched = $state(false);

  onMount(() => {
    if (query.trim().length >= 2) {
      performSearch();
    }
  });

  async function performSearch() {
    if (query.trim().length < 2) return;

    isLoading = true;
    hasSearched = true;

    try {
      const params = new URLSearchParams({
        q: query.trim(),
        type: activeFilter,
        limit: '30',
      });

      const response = await fetch(`/api/search?${params}`);
      const data = await response.json();

      if (data.success) {
        results = data.results;
        totalCount = data.totalCount;
      }
    } catch (e) {
      console.error('Axtarış xətası:', e);
    } finally {
      isLoading = false;
    }

    // URL-ni yenilə
    const url = new URL(window.location.href);
    url.searchParams.set('q', query.trim());
    window.history.replaceState({}, '', url.toString());
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    performSearch();
  }

  function switchFilter(filter: 'all' | 'posts' | 'users' | 'shares') {
    activeFilter = filter;
    if (hasSearched) {
      performSearch();
    }
  }

  function highlightMatch(text: string, q: string): string {
    if (!text || !q) return text || '';
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-amber-200/60 dark:bg-amber-500/30 text-inherit rounded-sm px-0.5">$1</mark>');
  }



  function truncate(text: string, maxLen: number): string {
    if (!text) return '';
    return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
  }

  const filters = [
    { key: 'all' as const, label: 'Hamısı', icon: Search },
    { key: 'posts' as const, label: 'Məqalələr', icon: FileText },
    { key: 'users' as const, label: 'İstifadəçilər', icon: User },
    { key: 'shares' as const, label: 'Paylaşımlar', icon: MessageSquare },
  ];
</script>

<!-- Header -->
<div class="mb-8">
  <a
    href="/"
    class="inline-flex items-center gap-1.5 text-sm text-base-500 dark:text-base-400 hover:text-base-900 dark:hover:text-base-100 transition-colors mb-4"
  >
    <ArrowLeft class="w-4 h-4" />
    Ana səhifə
  </a>

  <h1 class="text-2xl sm:text-3xl font-nouvelr-bold text-base-900 dark:text-base-50 mb-2">
    Axtarış
  </h1>
  {#if query && hasSearched}
    <p class="text-sm text-base-500 dark:text-base-400">
      "<span class="font-medium text-base-700 dark:text-base-300">{query}</span>" üçün
      {#if isLoading}
        axtarılır...
      {:else}
        {totalCount} nəticə tapıldı
      {/if}
    </p>
  {/if}
</div>

<!-- Axtarış forması -->
<form onsubmit={handleSubmit} class="mb-6">
  <div class="flex items-center gap-3 bg-white dark:bg-base-900 rounded-xl border border-base-200 dark:border-base-700 px-4 py-3 focus-within:border-blue-400 dark:focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/30 transition-all">
    <Search class="w-5 h-5 text-base-400 dark:text-base-500 shrink-0" />
    <input
      bind:value={query}
      type="text"
      placeholder="Nə axtarırsınız?"
      class="flex-1 bg-transparent text-base rounded-lg text-base-900 dark:text-base-50 placeholder-base-400 dark:placeholder-base-500 outline-none"
    />
    <button
      type="submit"
      disabled={query.trim().length < 2}
      class="px-4 py-1.5 text-sm font-medium bg-base-900 dark:bg-base-100 text-white dark:text-base-900 rounded-lg hover:bg-base-800 dark:hover:bg-base-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
    >
      Axtar
    </button>
  </div>
</form>

<!-- Filtrlər -->
<div class="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
  {#each filters as filter}
    <button
      onclick={() => switchFilter(filter.key)}
      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer
        {activeFilter === filter.key
          ? 'bg-base-900 dark:bg-base-100 text-white dark:text-base-900'
          : 'text-base-600 dark:text-base-400 hover:bg-base-100 dark:hover:bg-base-800 hover:text-base-900 dark:hover:text-base-100'}"
    >
      {#if filter.key === 'all'}
        <Search class="w-3.5 h-3.5" />
      {:else if filter.key === 'posts'}
        <FileText class="w-3.5 h-3.5" />
      {:else if filter.key === 'users'}
        <User class="w-3.5 h-3.5" />
      {:else if filter.key === 'shares'}
        <MessageSquare class="w-3.5 h-3.5" />
      {/if}
      {filter.label}
    </button>
  {/each}
</div>

<!-- Nəticələr -->
{#if isLoading}
  <div class="flex flex-col items-center justify-center py-16">
    <Loader2 class="w-8 h-8 text-base-400 animate-spin mb-3" />
    <p class="text-sm text-base-500 dark:text-base-400">Axtarılır...</p>
  </div>
{:else if hasSearched && totalCount === 0}
  <div class="flex flex-col items-center justify-center py-16 text-center">
    <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-base-100 dark:bg-base-800 mb-4">
      <Search class="w-7 h-7 text-base-400" />
    </div>
    <h3 class="text-lg font-medium text-base-900 dark:text-base-100 mb-1">Nəticə tapılmadı</h3>
    <p class="text-sm text-base-500 dark:text-base-400 max-w-sm">
      "<span class="font-medium">{query}</span>" üçün heç bir nəticə tapılmadı. Başqa açar sözlər sınayın.
    </p>
  </div>
{:else}
  <!-- Postlar -->
  {#if results.posts?.length > 0 && (activeFilter === 'all' || activeFilter === 'posts')}
    <div class="mb-8">
      <div class="flex items-center gap-2 mb-4">
        <FileText class="w-4 h-4 text-blue-500" />
        <h2 class="text-sm font-semibold text-base-900 dark:text-base-100">Məqalələr</h2>
        <span class="text-xs text-base-400 dark:text-base-500 bg-base-100 dark:bg-base-800 px-2 py-0.5 rounded-full">{results.posts.length}</span>
      </div>
      <div class="space-y-3">
        {#each results.posts as post}
          <a
            href={`/posts/${post.slug}`}
            class="flex items-start gap-4 p-4 bg-white dark:bg-base-900 rounded-xl border border-base-100 dark:border-base-800 hover:border-base-300 dark:hover:border-base-600 transition-all group"
          >
            {#if post.image}
              <div class="w-20 h-16 sm:w-24 sm:h-18 rounded-lg overflow-hidden shrink-0 relative"
                   style={post.blurhash ? `background-image:url(${blurhashToDataURL(post.blurhash)});background-size:cover;` : ''}>
                <img
                  src={post.image}
                  alt={post.title}
                  class="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            {:else}
              <div class="w-20 h-16 sm:w-24 sm:h-18 rounded-lg bg-base-100 dark:bg-base-800 flex items-center justify-center shrink-0">
                <FileText class="w-6 h-6 text-base-400" />
              </div>
            {/if}
            <div class="flex-1 min-w-0">
              <h3 class="text-base font-medium text-base-900 dark:text-base-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1 mb-1">
                {@html highlightMatch(post.title, query)}
              </h3>
              <p class="text-sm text-base-500 dark:text-base-400 line-clamp-2 mb-2">
                {@html highlightMatch(truncate(post.description, 150), query)}
              </p>
              <div class="flex items-center gap-2">
                {#if post.author}
                  <div class="flex items-center gap-1.5">
                    <!-- {#if post.author.avatar}
                      <button type="button" class="user-avatar overflow-hidden size-10! sm:size-14! squircle cursor-pointer shrink-0 relative bg-base-100 dark:bg-base-800">
                        <img src={post.author.avatar} alt={post.author.fullname} class="size-14! object-cover" />
                      </button>
                    {/if} -->
                    <span class="text-xs text-base-500 dark:text-base-400">{post.author.fullname}</span>
                  </div>
                {/if}
                {#if post.date}
                  <span class="text-xs text-base-400 dark:text-base-500">·</span>
                  <div class="flex items-center gap-1">
                    <span class="text-xs text-base-400 dark:text-base-500">{formatSimpleDate(post.date)}</span>
                  </div>
                {/if}
              </div>
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/if}

  <!-- İstifadəçilər -->
  {#if results.users?.length > 0 && (activeFilter === 'all' || activeFilter === 'users')}
    <div class="mb-8">
      <div class="flex items-center gap-2 mb-4"> 
        <User class="w-4 h-4 text-green-500" />
        <h2 class="text-sm font-semibold text-base-900 dark:text-base-100">İstifadəçilər</h2>
        <span class="text-xs text-base-400 dark:text-base-500 bg-base-100 dark:bg-base-800 px-2 py-0.5 rounded-full">{results.users.length}</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {#each results.users as user}
          <a
            href={`/${user.username}`}
            class="flex items-center gap-3 p-4 bg-white dark:bg-base-900 rounded-xl border border-base-100 dark:border-base-800 hover:border-base-300 dark:hover:border-base-600 transition-all group"
          >
            {#if user.avatar}
              <!-- <div class="overflow-hidden size-12 rounded-[30%] shrink-0 ring-2 ring-base-100 dark:ring-base-700">
                <img
                  src={user.avatar}
                  alt={user.fullname}
                  class="w-full h-full object-cover"
                />
              </div> -->
            {:else}
              <div class="w-12 h-12 rounded-full bg-base-100 dark:bg-base-800 flex items-center justify-center shrink-0">
                <User class="w-5 h-5 text-base-400" />
              </div>
            {/if}
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-base-900 dark:text-base-100 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                {@html highlightMatch(user.fullname, query)}
              </p>
              <p class="text-xs text-base-500 dark:text-base-400">
                @{@html highlightMatch(user.username, query)}
              </p>
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Paylaşımlar -->
  {#if results.shares?.length > 0 && (activeFilter === 'all' || activeFilter === 'shares')}
    <div class="mb-8">
      <div class="flex items-center gap-2 mb-4">
        <MessageSquare class="w-4 h-4 text-orange-500" />
        <h2 class="text-sm font-semibold text-base-900 dark:text-base-100">Paylaşımlar</h2>
        <span class="text-xs text-base-400 dark:text-base-500 bg-base-100 dark:bg-base-800 px-2 py-0.5 rounded-full">{results.shares.length}</span>
      </div>
      <div class="space-y-3">
        {#each results.shares as share}
          <a
            href={`/shares/${share.id}`}
            class="block p-4 bg-white dark:bg-base-900 rounded-xl border border-base-100 dark:border-base-800 hover:border-base-300 dark:hover:border-base-600 transition-all group"
          >
            <div class="flex items-center gap-2 mb-2">
              <!-- {#if share.author?.avatar}
                <div class="user-avatar overflow-hidden w-6! h-6! squircle shrink-0 relative bg-base-100 dark:bg-base-800">
                  <img
                    src={share.author.avatar}
                    alt={share.author.fullname}
                    class="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
              {/if} -->
              <span class="text-xs font-medium text-base-700 dark:text-base-300">{share.author?.fullname || 'Anonim'}</span>
              <span class="text-xs text-base-400 dark:text-base-500">· {formatSimpleDate(share.date)}</span>
            </div>
            <p class="text-sm text-base-700 dark:text-base-300 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-3">
              {@html highlightMatch(share.content, query)}
            </p>
          </a>
        {/each}
      </div>
    </div>
  {/if}
{/if}

<style>
  .line-clamp-1 {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
