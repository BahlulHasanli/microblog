<script lang="ts">
  import { Search, X, FileText, User, MessageSquare, Loader2 } from 'lucide-svelte';
  import { blurhashToDataURL, formatSimpleDate } from '@/utils/blurhash';

  let isOpen = $state(false);
  let query = $state('');
  let results = $state<any>({ posts: [], users: [], shares: [] });
  let isLoading = $state(false);
  let totalCount = $state(0);
  let searchTimeout: ReturnType<typeof setTimeout>;
  let inputRef: HTMLInputElement = $state(null!);

  function openSearch() {
    isOpen = true;
    setTimeout(() => inputRef?.focus(), 100);
  }

  function closeSearch() {
    isOpen = false;
    query = '';
    results = { posts: [], users: [], shares: [] };
    totalCount = 0;
  }

  function onKeydown(e: KeyboardEvent) {
    // Ctrl+K / Cmd+K ilə axtarışı aç
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (isOpen) {
        closeSearch();
      } else {
        openSearch();
      }
    }
    // Escape ilə bağla
    if (e.key === 'Escape' && isOpen) {
      closeSearch();
    }
  }

  async function performSearch(searchQuery: string) {
    if (searchQuery.trim().length < 2) {
      results = { posts: [], users: [], shares: [] };
      totalCount = 0;
      return;
    }

    isLoading = true;
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}&limit=6`);
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
  }

  function handleInput() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      performSearch(query);
    }, 300);
  }

  function goToSearchPage() {
    if (query.trim().length >= 2) {
      window.location.href = `/search?q=${encodeURIComponent(query.trim())}`;
    }
  }

  function handleSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      goToSearchPage();
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
</script>

<svelte:window onkeydown={onKeydown} />

<!-- Axtarış düyməsi / trigger -->
<button
  onclick={openSearch}
  class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-base-500 dark:text-base-400 bg-base-100 dark:bg-base-800 hover:bg-base-200 dark:hover:bg-base-700 rounded-full transition-all duration-200 cursor-pointer border border-transparent hover:border-base-300 dark:hover:border-base-600"
  title="Axtar (Ctrl+K)"
  aria-label="Axtarış"
>
  <Search class="w-3.5 h-3.5" />
  <span class="hidden sm:inline">Axtar</span>
  <kbd class="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-base-400 dark:text-base-500 bg-white dark:bg-base-900 rounded border border-base-200 dark:border-base-700 ml-1">
    ⌘K
  </kbd>
</button>

<!-- Overlay + Modal -->
{#if isOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-999 flex items-start justify-center pt-[10vh] sm:pt-[15vh]"
    onkeydown={() => {}}
  >
    <!-- Backdrop -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fadeIn"
      onclick={closeSearch}
      onkeydown={() => {}}
    ></div>

    <!-- Modal -->
    <div class="relative w-full max-w-xl mx-4 bg-white dark:bg-base-900 rounded-2xl shadow-2xl border border-base-200 dark:border-base-700 overflow-hidden animate-slideDown">
      <!-- Axtarış inputu -->
      <div class="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-base-100 dark:border-base-800">
        <Search class="w-5 h-5 text-base-400 dark:text-base-500 shrink-0" />
        <input
          bind:this={inputRef}
          bind:value={query}
          oninput={handleInput}
          onkeydown={handleSearchKeydown}
          type="text"
          placeholder="Məqalə, istifadəçi və ya paylaşım axtar..."
          class="flex-1 rounded-lg bg-transparent text-sm sm:text-base text-base-900 dark:text-base-50 placeholder-base-400 dark:placeholder-base-500 outline-none"
        />
        {#if isLoading}
          <Loader2 class="w-4 h-4 text-base-400 animate-spin shrink-0" />
        {:else if query.length > 0}
          <button
            onclick={() => { query = ''; results = { posts: [], users: [], shares: [] }; totalCount = 0; inputRef?.focus(); }}
            class="p-1 rounded-md hover:bg-base-100 dark:hover:bg-base-800 transition-colors cursor-pointer"
          >
            <X class="w-4 h-4 text-base-400" />
          </button>
        {/if}
      </div>

      <!-- Nəticələr -->
      <div class="max-h-[50vh] overflow-y-auto">
        {#if query.length >= 2 && !isLoading && totalCount === 0}
          <div class="px-5 py-10 text-center">
            <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-base-100 dark:bg-base-800 mb-3">
              <Search class="w-5 h-5 text-base-400" />
            </div>
            <p class="text-sm text-base-500 dark:text-base-400">
              "<span class="font-medium text-base-700 dark:text-base-300">{query}</span>" üçün nəticə tapılmadı
            </p>
          </div>
        {/if}

        <!-- Postlar -->
        {#if results.posts?.length > 0}
          <div class="px-3 pt-3 pb-1">
            <div class="flex items-center gap-2 px-2 mb-1.5">
              <FileText class="w-3.5 h-3.5 text-blue-500" />
              <span class="text-[11px] font-semibold text-base-400 dark:text-base-500 uppercase tracking-wider">Məqalələr</span>
              <span class="text-[10px] text-base-400 dark:text-base-600 bg-base-100 dark:bg-base-800 px-1.5 py-0.5 rounded-full">{results.posts.length}</span>
            </div>
            {#each results.posts as post}
              <a
                href={`/posts/${post.slug}`}
                class="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-base-50 dark:hover:bg-base-800/60 transition-colors group"
                onclick={closeSearch}
              >
                {#if post.image}
                  <div class="w-12 h-12 rounded-lg overflow-hidden shrink-0 ring-1 ring-base-200 dark:ring-base-700 relative"
                       style={post.blurhash ? `background-image:url(${blurhashToDataURL(post.blurhash)});background-size:cover;` : ''}>
                    <img
                      src={post.image}
                      alt={post.title}
                      class="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                {:else}
                  <div class="w-12 h-12 rounded-lg bg-base-100 dark:bg-base-800 flex items-center justify-center shrink-0">
                    <FileText class="w-5 h-5 text-base-400" />
                  </div>
                {/if}
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-base-900 dark:text-base-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                    {@html highlightMatch(post.title, query)}
                  </p>
                  <p class="text-xs text-base-500 dark:text-base-400 line-clamp-1 mt-0.5">
                    {@html highlightMatch(truncate(post.description, 80), query)}
                  </p>
                  <div class="flex items-center gap-2 mt-1">
                    {#if post.author}
                      <div class="overflow-hidden size-4 rounded-[30%] shrink-0">
                        <img src={post.author.avatar} alt="" class="w-full h-full object-cover" />
                      </div>
                      <span class="text-[11px] text-base-400 dark:text-base-500">{post.author.fullname}</span>
                    {/if}
                    {#if post.date}
                      <span class="text-[11px] text-base-400 dark:text-base-500">· {formatSimpleDate(post.date)}</span>
                    {/if}
                  </div>
                </div>
              </a>
            {/each}
          </div>
        {/if}

        <!-- İstifadəçilər -->
        {#if results.users?.length > 0}
          <div class="px-3 pt-3 pb-1">
            <div class="flex items-center gap-2 px-2 mb-1.5">
              <User class="w-3.5 h-3.5 text-green-500" />
              <span class="text-[11px] font-semibold text-base-400 dark:text-base-500 uppercase tracking-wider">İstifadəçilər</span>
              <span class="text-[10px] text-base-400 dark:text-base-600 bg-base-100 dark:bg-base-800 px-1.5 py-0.5 rounded-full">{results.users.length}</span>
            </div>
            {#each results.users as user}
              <a
                href={`/${user.username}`}
                class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-base-50 dark:hover:bg-base-800/60 transition-colors group"
                onclick={closeSearch}
              >
                {#if user.avatar}
                  <div class="overflow-hidden size-10 rounded-[30%] shrink-0 ring-1 ring-base-200 dark:ring-base-700">
                    <img
                      src={user.avatar}
                      alt={user.fullname}
                      class="w-full h-full object-cover"
                    />
                  </div>
                {:else}
                  <div class="w-10 h-10 rounded-full bg-base-100 dark:bg-base-800 flex items-center justify-center shrink-0">
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
        {/if}

        <!-- Paylaşımlar -->
        {#if results.shares?.length > 0}
          <div class="px-3 pt-3 pb-1">
            <div class="flex items-center gap-2 px-2 mb-1.5">
              <MessageSquare class="w-3.5 h-3.5 text-orange-500" />
              <span class="text-[11px] font-semibold text-base-400 dark:text-base-500 uppercase tracking-wider">Paylaşımlar</span>
              <span class="text-[10px] text-base-400 dark:text-base-600 bg-base-100 dark:bg-base-800 px-1.5 py-0.5 rounded-full">{results.shares.length}</span>
            </div>
            {#each results.shares as share}
              <a
                href={`/shares/${share.id}`}
                class="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-base-50 dark:hover:bg-base-800/60 transition-colors group"
                onclick={closeSearch}
              >
                {#if share.author?.avatar}
                  <img
                    src={share.author.avatar}
                    alt={share.author.fullname}
                    class="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-base-200 dark:ring-base-700 mt-0.5"
                  />
                {:else}
                  <div class="w-8 h-8 rounded-full bg-base-100 dark:bg-base-800 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare class="w-4 h-4 text-base-400" />
                  </div>
                {/if}
                <div class="flex-1 min-w-0">
                  <p class="text-xs text-base-500 dark:text-base-400 mb-0.5">
                    {share.author?.fullname || 'Anonim'} · {formatSimpleDate(share.date)}
                  </p>
                  <p class="text-sm text-base-700 dark:text-base-300 line-clamp-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    {@html highlightMatch(truncate(share.content, 120), query)}
                  </p>
                </div>
              </a>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Footer -->
      {#if query.length >= 2 && totalCount > 0}
        <div class="px-4 py-3 border-t border-base-100 dark:border-base-800 bg-base-50/50 dark:bg-base-800/30">
          <button
            onclick={goToSearchPage}
            class="w-full text-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer py-1"
          >
            Bütün nəticələri gör →
          </button>
        </div>
      {/if}

      <!-- Keyboard hint -->
      <div class="flex items-center justify-between px-4 py-2 bg-base-50 dark:bg-base-800/50 border-t border-base-100 dark:border-base-800 text-[11px] text-base-400 dark:text-base-500">
        <div class="flex items-center gap-3">
          <span class="flex items-center gap-1">
            <kbd class="px-1 py-0.5 bg-white dark:bg-base-900 rounded border border-base-200 dark:border-base-700 text-[10px] font-mono">↵</kbd>
            tam axtarış
          </span>
          <span class="flex items-center gap-1">
            <kbd class="px-1 py-0.5 bg-white dark:bg-base-900 rounded border border-base-200 dark:border-base-700 text-[10px] font-mono">esc</kbd>
            bağla
          </span>
        </div>
        <span>{totalCount} nəticə</span>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-12px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .animate-fadeIn {
    animation: fadeIn 0.15s ease-out;
  }

  .animate-slideDown {
    animation: slideDown 0.2s ease-out;
  }

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
</style>
