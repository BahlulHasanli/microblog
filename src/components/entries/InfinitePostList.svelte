<script lang="ts">
  import { onMount } from 'svelte';
  import { decode } from 'blurhash';

  export let initialPosts: any[] = [];
  export let categories: any[] = [];
  export let sponsorBanners: any[] = [];
  export let initialPage: number = 1;
  export let postsPerPage: number = 10;

  let posts = [...initialPosts];
  let page = initialPage;
  let loading = false;
  let hasMore = true;
  let observer: IntersectionObserver;
  let loadMoreTrigger: HTMLElement;

  function formatSimpleDate(date: string | Date): string {
    const d = new Date(date);
    const months = [
      'Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn',
      'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'
    ];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  function getCategoryName(slug: string): string {
    const cat = categories.find((c: any) => c.slug === slug);
    return cat ? cat.name : slug;
  }

  async function loadMore() {
    if (loading || !hasMore) return;
    
    loading = true;
    try {
      const response = await fetch(`/api/posts/list?page=${page + 1}&limit=${postsPerPage}`);
      const data = await response.json();
      
      if (data.posts && data.posts.length > 0) {
        posts = [...posts, ...data.posts];
        page = data.pagination.page;
        hasMore = data.pagination.hasMore;
        
        // Yeni postlar üçün blurhash, view count və avatar click yüklə
        setTimeout(() => {
          initBlurhash();
          loadViewCounts();
          setupUserAvatarClick();
        }, 100);
      } else {
        hasMore = false;
      }
    } catch (error) {
      console.error('Postlar yüklənərkən xəta:', error);
    } finally {
      loading = false;
    }
  }

  function initBlurhash() {
    // Blurhash olmayan şəkillər üçün birbaşa göstər
    const allImages = document.querySelectorAll('.blurhash-img') as NodeListOf<HTMLImageElement>;
    allImages.forEach((img) => {
      const container = img.closest('.blurhash-container');
      const hasBlurhash = container?.getAttribute('data-blurhash');
      if (!hasBlurhash) {
        // Blurhash yoxdursa, şəkili birbaşa göstər
        if (img.complete && img.naturalWidth > 0) {
          img.classList.remove('opacity-0');
          img.classList.add('opacity-100');
        } else {
          img.addEventListener('load', () => {
            img.classList.remove('opacity-0');
            img.classList.add('opacity-100');
          });
        }
      }
    });

    const containers = document.querySelectorAll('.blurhash-container[data-blurhash]');
    
    containers.forEach((container) => {
      const blurhash = container.getAttribute('data-blurhash');
      const canvas = container.querySelector('.blurhash-canvas') as HTMLCanvasElement;
      const img = container.querySelector('.blurhash-img') as HTMLImageElement;
      
      if (!blurhash || !canvas || canvas.dataset.decoded === 'true') return;
      
      try {
        const width = 32;
        const height = 32;
        const pixels = decode(blurhash, width, height);
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          const imageData = ctx.createImageData(width, height);
          imageData.data.set(pixels);
          ctx.putImageData(imageData, 0, 0);
        }
        
        canvas.dataset.decoded = 'true';
        
        if (img) {
          if (img.complete && img.naturalWidth > 0) {
            img.classList.remove('opacity-0');
            img.classList.add('opacity-100');
            setTimeout(() => {
              canvas.style.opacity = '0';
            }, 100);
          } else {
            img.addEventListener('load', () => {
              img.classList.remove('opacity-0');
              img.classList.add('opacity-100');
              setTimeout(() => {
                canvas.style.opacity = '0';
              }, 100);
            });
          }
        }
      } catch (error) {
        console.error('Blurhash decode xətası:', error);
      }
    });
  }

  async function loadViewCounts() {
    const viewCountElements = document.querySelectorAll('.view-count[data-post-id]');
    
    for (const element of viewCountElements) {
      const postId = element.getAttribute('data-post-id');
      if (!postId || element.textContent !== '0') continue;
      
      try {
        const response = await fetch(`/api/posts/views?postId=${postId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.viewCount !== undefined) {
            element.textContent = data.viewCount;
          }
        }
      } catch (error) {
        console.error('Oxunma sayı yüklənərkən xəta:', error);
      }
    }
  }

  function getSponsorBanner(index: number) {
    const bannerIndex = Math.floor((index + 1) / 2) - 1;
    if ((index + 1) % 2 === 0 && bannerIndex < sponsorBanners.length) {
      return sponsorBanners[bannerIndex];
    }
    return null;
  }

  function setupUserAvatarClick() {
    const userAvatars = document.querySelectorAll('.user-avatar');
    userAvatars.forEach(avatar => {
      avatar.addEventListener('click', () => {
        const username = avatar.getAttribute('data-username');
        if (username) {
          window.location.href = `/user/@${username}`;
        }
      });
    });
  }

  onMount(() => {
    initBlurhash();
    loadViewCounts();
    setupUserAvatarClick();

    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );

    if (loadMoreTrigger) {
      observer.observe(loadMoreTrigger);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  });
</script>

<div class="grid grid-cols-1 gap-6 sm:gap-8 gap-y-16 sm:gap-y-16 sm:grid-cols-2">
  {#each posts as post, index}
    {@const isIcmal = post.data.categories?.includes('icmal') || false}
    {@const banner = getSponsorBanner(index)}
    
    {#if isIcmal}
      <!-- İcmal Post - Full Width -->
      <div class="sm:col-span-2">
        <article class="relative w-full rounded-xl overflow-hidden group">
          <div class="absolute inset-0">
            <img src={post.data.image.url} alt="" class="w-full h-full object-cover scale-110" />
          </div>
          <div class="absolute inset-0 backdrop-blur-3xl"></div>
          <div class="absolute inset-0 bg-black/10"></div>
          
          <div class="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-center">
            <a href={`/posts/${post.slug}`} title={post.data.title} class="block w-full sm:w-1/2 shrink-0">
              <div class="relative blurhash-container" data-blurhash={post.data.blurhash}>
                {#if post.data.blurhash}
                  <canvas 
                    class="blurhash-canvas absolute inset-0 w-full h-full object-cover rounded-2xl" 
                    aria-hidden="true"
                  ></canvas>
                {/if}
                <img
                  width="1200"
                  height="630"
                  src={post.data.image.url}
                  alt={post.data.title}
                  loading="lazy"
                  class="blurhash-img object-cover w-full aspect-video rounded-2xl opacity-0 transition-opacity duration-300"
                />
              </div>
            </a>
            
            <div class="flex-1 text-white flex flex-col justify-center">
              <div class="flex items-center gap-2 text-sm text-white/80 mb-4">
                <button type="button" class="user-avatar overflow-hidden size-8 squircle cursor-pointer shrink-0" data-username={post.data.author?.username} aria-label="{post.data.author?.fullname} profilinə keç">
                  <img src={post.data.author?.avatar}
                      alt=""
                      class="w-full h-full object-cover"
                  />
                </button>
                <a href={`/user/@${post.data.author?.username}`} class="font-medium hover:text-white transition-colors truncate">
                  {post.data.author?.fullname}
                </a>
                {#if post.data.pubDate}
                  <div class="flex items-center ml-auto gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-3.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                    </svg>
                    <span class="text-xs text-white/60">{formatSimpleDate(post.data.pubDate)}</span>
                    {#if post.id}
                      <span aria-hidden="true" class="text-white/40">&middot;</span>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-3.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.573-3.007-9.963-7.178Z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                      <span class="view-count text-xs text-white/60" data-post-id={post.id}>0</span>
                    {/if}
                  </div>
                {/if}
              </div>
              
              <h3 class="text-2xl sm:text-2xl font-bold mb-2 leading-tight text-pretty">
                <a href={`/posts/${post.slug}`} class="group-hover:underline decoration-wavy line-clamp-2">{post.data.title}</a>
              </h3>
              
              <p class="text-white/80 line-clamp-3 text-base sm:text-md my-5">{post.data.description}</p>
              
              {#if post.data.categories && post.data.categories.length > 0}
                <div class="flex flex-wrap gap-2 mb-5">
                  {#each post.data.categories as categorySlug}
                    <a 
                      href={`/category/${categorySlug}`}
                      class="bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-1 rounded-full transition-colors"
                    >
                      {getCategoryName(categorySlug)}
                    </a>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        </article>
      </div>
    {:else}
      <!-- Normal Post -->
      <div>
        <article class="flex flex-col flex-1 h-full group">
          <a href={`/posts/${post.slug}`} title={post.data.title} class="block">
            <div class="block w-full lg:col-span-2 blurhash-container relative overflow-hidden" data-blurhash={post.data.blurhash}>
              {#if post.data.blurhash}
                <canvas 
                  class="blurhash-canvas absolute inset-0 w-full h-full object-cover rounded-xl" 
                  aria-hidden="true"
                ></canvas>
              {/if}
              <img
                width="1200"
                height="630"
                src={post.data.image.url}
                alt={post.data.title}
                loading="lazy"
                class="blurhash-img object-cover w-full h-full bg-center aspect-12/8 rounded-xl opacity-0 transition-opacity duration-300"
              />
            </div>
          </a>

          <div class="mt-3 sm:mt-5">
            <div class="flex items-center gap-1 sm:gap-2 text-xs text-base-600 flex-wrap">
              <button type="button" class="user-avatar overflow-hidden size-10! sm:size-14! squircle cursor-pointer shrink-0" data-username={post.data.author?.username} aria-label="{post.data.author?.fullname} profilinə keç">
                <img src={post.data.author?.avatar}
                    alt=""
                    class="w-full h-full object-cover"
                />
              </button>
              <a href={`/user/@${post.data.author?.username}`} class="font-medium hover:text-rose-600 transition-colors truncate">
                {post.data.author?.fullname}
              </a>
              {#if post.data.categories && post.data.categories.length > 0}
                <span aria-hidden="true">&middot;</span>
                <span>
                  {#each post.data.categories as categorySlug, i}
                    <a href={`/category/${categorySlug}`} class="text-yellow-700">
                      {getCategoryName(categorySlug)}{i < post.data.categories.length - 1 ? ',' : ''}
                    </a>
                    {#if i < post.data.categories.length - 1}
                      {' '}
                    {/if}
                  {/each}
                </span>
              {/if}
            </div>

            <h3 class="mt-4 text-base text-base-900 text-balance">
              <a href={`/posts/${post.slug}`} class="group-hover:underline group-hover:decoration-1 group-hover:decoration-wavy">
                {post.data.title}
              </a>
            </h3>

            <p class="mt-1 text-sm text-base-600 line-clamp-2">{post.data.description}</p>

            {#if post.data.pubDate}
              <div class="flex items-center gap-2 mt-3 text-xs text-base-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-3.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
                <span>{formatSimpleDate(post.data.pubDate)}</span>
                {#if post.id}
                  <span aria-hidden="true">&middot;</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-3.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.573-3.007-9.963-7.178Z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                  <span class="view-count" data-post-id={post.id}>0</span>
                {/if}
              </div>
            {/if}
          </div>
        </article>
      </div>
    {/if}
    
    <!-- Sponsor Banner (hər 2 postdan sonra) -->
    {#if banner}
      <div>
        <article class="flex flex-col flex-1 h-full group">
          <a 
            href={banner.banner_url}
            target="_blank"
            rel="noopener noreferrer"
            title={banner.title}
            class="block"
            on:click={() => {
              fetch('/api/admin/sponsor-banners/track-click', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: banner.id })
              }).catch(e => console.error(e));
            }}
          >
            <div class="block w-full">
              <img
                src={banner.image_url}
                alt={banner.title}
                class="object-cover w-full h-full bg-center aspect-12/8 rounded-xl"
              />
            </div>
          </a>

          <div class="mt-3 sm:mt-5">
            <div class="flex items-center gap-1 text-xs text-rose-600 font-medium mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Sponsorlu</span>
            </div>

            <h3 class="text-base text-base-900 text-balance">
              <a href={banner.banner_url} target="_blank" rel="noopener noreferrer" class="group-hover:underline group-hover:decoration-1 group-hover:decoration-wavy">
                {banner.title}
              </a>
            </h3>

            <p class="mt-1 text-sm text-base-600 line-clamp-2">{banner.description}</p>
          </div>
        </article>
      </div>
    {/if}
  {/each}
</div>

<!-- Loading trigger -->
<div bind:this={loadMoreTrigger} class="w-full py-8 flex justify-center sm:col-span-2">
  {#if loading}
    <div class="flex items-center gap-3 text-base-600">
      <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span class="text-sm">Yüklənir...</span>
    </div>
  {:else if !hasMore}
    <div class="text-sm text-base-600">
      Bütün postlar yükləndi
    </div>
  {/if}
</div>

<style>
  .blurhash-canvas {
    transition: opacity 0.3s ease-out;
  }
</style>
