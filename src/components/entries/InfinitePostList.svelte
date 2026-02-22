<script lang="ts">
  import { onMount } from 'svelte';
  import { decode } from 'blurhash';

  // Blurhash-ı kiçik BMP data URL-ə çevirir (instant placeholder üçün)
  function blurhashToDataURL(hash: string | null | undefined, w: number = 4, h: number = 3): string {
    if (!hash) return '';
    try {
      const pixels = decode(hash, w, h);
      const rowSize = Math.ceil(w * 3 / 4) * 4;
      const pixelDataSize = rowSize * h;
      const fileSize = 54 + pixelDataSize;
      const buffer = new Uint8Array(fileSize);
      const view = new DataView(buffer.buffer);
      buffer[0] = 0x42; buffer[1] = 0x4D;
      view.setUint32(2, fileSize, true);
      view.setUint32(10, 54, true);
      view.setUint32(14, 40, true);
      view.setInt32(18, w, true);
      view.setInt32(22, -h, true);
      view.setUint16(26, 1, true);
      view.setUint16(28, 24, true);
      view.setUint32(30, 0, true);
      view.setUint32(34, pixelDataSize, true);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const si = (y * w + x) * 4;
          const di = 54 + y * rowSize + x * 3;
          buffer[di] = pixels[si + 2];
          buffer[di + 1] = pixels[si + 1];
          buffer[di + 2] = pixels[si];
        }
      }
      let binary = '';
      for (let i = 0; i < buffer.length; i++) binary += String.fromCharCode(buffer[i]);
      return `data:image/bmp;base64,${btoa(binary)}`;
    } catch { return ''; }
  }

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

  // Şəkil optimizasiyası funksiyaları - WASM endpoint istifadə edir
  function generateBunnyCDNUrl(src: string, width?: number, quality: number = 80, format: string = 'webp'): string {
    if (!src || !src.includes('b-cdn.net')) return src;
    try {
      const params = new URLSearchParams();
      params.set('url', src);
      if (width) params.set('w', width.toString());
      params.set('q', quality.toString());
      params.set('f', format);
      return `/api/image-optimize?${params.toString()}`;
    } catch {
      return src;
    }
  }

  function generateSrcset(src: string, maxWidth: number = 800, quality: number = 80): string {
    if (!src || !src.includes('b-cdn.net')) return src;
    const widths = [320, 480, 640, 800].filter(w => w <= maxWidth);
    if (widths[widths.length - 1] < maxWidth) widths.push(maxWidth);
    return widths.map(w => `${generateBunnyCDNUrl(src, w, quality)} ${w}w`).join(', ');
  }

  const cardSizes = '(max-width: 640px) calc(100vw - 32px), (max-width: 768px) calc(50vw - 24px), 400px';
  const heroSizes = '(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 800px';
  const avatarSizes = '(max-width: 640px) 40px, 56px';

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
    if (viewCountElements.length === 0) return;
    
    // Bütün post ID-lərini topla.
    const postIds: string[] = [];
    viewCountElements.forEach(element => {
      const postId = element.getAttribute('data-post-id');
      if (postId && element.textContent === '0') {
        postIds.push(postId);
      }
    });
    
    if (postIds.length === 0) return;
    
    try {
      // Batch sorğu - birdəfəyə bütün view count-ları al
      const response = await fetch(`/api/posts/views?postIds=${postIds.join(',')}`);
      if (response.ok) {
        const data = await response.json();
        if (data.viewCounts) {
          viewCountElements.forEach(element => {
            const postId = element.getAttribute('data-post-id');
            if (postId && data.viewCounts[postId] !== undefined) {
              element.textContent = data.viewCounts[postId];
            }
          });
        }
      }
    } catch (error) {
      console.error('Oxunma sayları yüklənərkən xəta:', error);
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
          window.location.href = `/@${username}`;
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
  // Postları yenidən sırala: icmal postları boşluq yaratmasın
  // İcmal postları 2 sütun tutur, ona görə onları cüt pozisiyalarda yerləşdirmək lazımdır
  $: organizedPosts = (() => {
    const icmalPosts = posts.filter(p => p.data.categories?.includes('icmal'));
    const normalPosts = posts.filter(p => !p.data.categories?.includes('icmal'));
    
    const result: any[] = [];
    let normalIndex = 0;
    let icmalIndex = 0;
    let gridPosition = 0; // Cari grid pozisiyası (0-based, hər sütun 1)
    
    // Postları orijinal sıra ilə gəz
    for (const post of posts) {
      const isIcmal = post.data.categories?.includes('icmal');
      
      if (isIcmal) {
        // İcmal postu əlavə etməzdən əvvəl, əgər tək pozisiyadadırsa, normal post əlavə et
        if (gridPosition % 2 === 1 && normalIndex < normalPosts.length) {
          // Tək pozisiyada - əvvəlcə normal post əlavə et
          // Bu artıq result-da olmayan növbəti normal postu tap
          const remainingNormals = normalPosts.filter(np => !result.includes(np));
          if (remainingNormals.length > 0) {
            result.push(remainingNormals[0]);
            gridPosition += 1;
          }
        }
        result.push(post);
        gridPosition += 2; // İcmal 2 sütun tutur
      } else {
        // Normal post - əgər artıq əlavə edilməyibsə
        if (!result.includes(post)) {
          result.push(post);
          gridPosition += 1;
        }
      }
    }
    
    return result;
  })();
</script>

<div class="grid grid-cols-1 gap-6 sm:gap-8 gap-y-16 sm:gap-y-16 sm:grid-cols-2">
  {#each organizedPosts as post, index}
    {@const isIcmal = post.data.categories?.includes('icmal') || false}
    {@const banner = getSponsorBanner(index)}
    
    {#if isIcmal}
      <!-- İcmal Post - Full Width -->
      <div class="sm:col-span-2">
        <article class="relative w-full rounded-2xl overflow-hidden group min-h-[450px] sm:min-h-[500px] lg:min-h-[600px] flex items-center">
          <a href={`/posts/${post.slug}`} title={post.data.title} class="block absolute inset-0 z-0">
            <div class="absolute inset-0 blurhash-container bg-black" data-blurhash={post.data.blurhash} style={post.data.blurhash ? `background-image:url(${blurhashToDataURL(post.data.blurhash)});background-size:cover;` : ''}>
              {#if post.data.blurhash}
                <canvas 
                  class="blurhash-canvas absolute inset-0 w-full h-full object-cover" 
                  aria-hidden="true"
                ></canvas>
              {/if}
              <img
                src={generateBunnyCDNUrl(post.data.image.url, 1200)}
                srcset={generateSrcset(post.data.image.url, 1200)}
                sizes={heroSizes}
                alt={post.data.title}
                loading="lazy"
                class="blurhash-img w-full h-full object-cover object-[25%_center] opacity-0 transition-opacity duration-300"
              />
            </div>
            <!-- Overlay -> No gradient, purely dark solid with opacity -->
            <div class="absolute inset-0 bg-black/50 group-hover:bg-black/60 transition-colors duration-500"></div>
          </a>

          {#if post.data.hasAudio}
            <div class="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 bg-black/60 text-white border border-white/10 px-3 py-1.5 rounded-full pointer-events-none flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4">
                <path d="M12 1.5C6.2 1.5 1.5 6.2 1.5 12V17C1.5 20 4 22.5 7 22.5H7.5V20.9C8.4 20.7 9 19.9 9 19V15C9 14.1 8.4 13.3 7.5 13.1V11.5H7C5.1 11.5 3.5 12.4 2.5 13.8V12C2.5 6.8 6.8 2.5 12 2.5C17.2 2.5 21.5 6.8 21.5 12V13.8C20.5 12.4 18.9 11.5 17 11.5H16.5V13.1C15.6 13.3 15 14.1 15 15V19C15 19.9 15.6 20.7 16.5 20.9V22.5H17C20 22.5 22.5 20 22.5 17V12C22.5 6.2 17.8 1.5 12 1.5ZM6.5 12.5V21.5C4.3 21.3 2.5 19.3 2.5 17C2.5 14.7 4.3 12.8 6.5 12.5ZM17.5 21.5V12.5C19.7 12.7 21.5 14.7 21.5 17C21.5 19.3 19.7 21.2 17.5 21.5Z" fill="currentColor"></path>
              </svg>
              <span class="text-[11px] font-bold tracking-wider uppercase pt-[1px]">Dinlə</span>
            </div>
          {/if}

          <!-- Content align left with centered text -->
          <div class="relative z-10 w-full h-full flex items-center justify-center sm:justify-start p-6 sm:p-12 md:p-16 lg:p-20 pointer-events-none">
            <div class="w-full sm:w-11/12 md:w-10/12 lg:w-9/12 xl:w-8/12 text-center pointer-events-auto flex flex-col items-center">
              <span class="text-white/90 tracking-[0.2em] text-[10px] sm:text-xs font-semibold uppercase mb-3 sm:mb-4">
                İcmal
              </span>
              <a href={`/posts/${post.slug}`} class="block w-full">
                <h3 class="text-white font-big-shoulders text-2xl sm:text-2xl md:text-3xl lg:text-4xl font-bold uppercase leading-tight text-balance mb-4 sm:mb-5 hover:opacity-80 transition-opacity">
                  {post.data.title}
                </h3>
              </a>
              <p class="text-white/90 text-[14px] sm:text-[15px] md:text-[14px] font-display leading-relaxed text-balance mb-6 sm:mb-8 line-clamp-4 max-w-3xl mx-auto">
                {post.data.description}
              </p>
              <a href={`/@${post.data.author?.username}`} class="text-white font-display text-xs sm:text-sm hover:text-white/80 transition-colors">
                Müəllif: <span class="font-bold">{post.data.author?.fullname}</span>
              </a>
            </div>
          </div>
        </article>
      </div>
    {:else}
      <!-- Normal Post -->
      <div>
        <article class="flex flex-col flex-1 h-full group">
          <a href={`/posts/${post.slug}`} title={post.data.title} class="block relative group-hover:opacity-90 transition-opacity">
            {#if post.data.hasAudio}
              <div class="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 bg-black/60 backdrop-blur-md text-white border border-white/10 px-3 py-1.5 rounded-full pointer-events-none flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4">
                  <path d="M12 1.5C6.2 1.5 1.5 6.2 1.5 12V17C1.5 20 4 22.5 7 22.5H7.5V20.9C8.4 20.7 9 19.9 9 19V15C9 14.1 8.4 13.3 7.5 13.1V11.5H7C5.1 11.5 3.5 12.4 2.5 13.8V12C2.5 6.8 6.8 2.5 12 2.5C17.2 2.5 21.5 6.8 21.5 12V13.8C20.5 12.4 18.9 11.5 17 11.5H16.5V13.1C15.6 13.3 15 14.1 15 15V19C15 19.9 15.6 20.7 16.5 20.9V22.5H17C20 22.5 22.5 20 22.5 17V12C22.5 6.2 17.8 1.5 12 1.5ZM6.5 12.5V21.5C4.3 21.3 2.5 19.3 2.5 17C2.5 14.7 4.3 12.8 6.5 12.5ZM17.5 21.5V12.5C19.7 12.7 21.5 14.7 21.5 17C21.5 19.3 19.7 21.2 17.5 21.5Z" fill="currentColor"></path>
                </svg>
                <span class="text-[11px] font-bold tracking-wider uppercase pt-[1px]">Dinlə</span>
              </div>
            {/if}
            <div class="block w-full lg:col-span-2 blurhash-container relative overflow-hidden rounded-xl" data-blurhash={post.data.blurhash}
                 style={post.data.blurhash ? `background-image:url(${blurhashToDataURL(post.data.blurhash)});background-size:cover;` : ''}>
              {#if post.data.blurhash}
                <canvas 
                  class="blurhash-canvas absolute inset-0 w-full h-full object-cover rounded-xl" 
                  aria-hidden="true"
                ></canvas>
              {/if}
              <img
                width="400"
                height="267"
                src={generateBunnyCDNUrl(post.data.image.url, 400)}
                srcset={generateSrcset(post.data.image.url, 640)}
                sizes={cardSizes}
                alt={post.data.title}
                loading="lazy"
                class="blurhash-img object-cover w-full h-full bg-center aspect-12/8 rounded-xl opacity-0 transition-opacity duration-300"
              />
            </div>
          </a>

          <div class="mt-3 sm:mt-5">
            <div class="flex items-center gap-1 sm:gap-2 text-xs text-base-600 dark:text-base-400 flex-wrap">
              <button type="button" class="user-avatar overflow-hidden size-10! sm:size-14! squircle cursor-pointer shrink-0" data-username={post.data.author?.username} aria-label="{post.data.author?.fullname} profilinə keç">
                <img 
                    src={generateBunnyCDNUrl(post.data.author?.avatar, 56)}
                    srcset={`${generateBunnyCDNUrl(post.data.author?.avatar, 40)} 40w, ${generateBunnyCDNUrl(post.data.author?.avatar, 56)} 56w, ${generateBunnyCDNUrl(post.data.author?.avatar, 112)} 112w`}
                    sizes={avatarSizes}
                    alt=""
                    class="w-full h-full object-cover"
                />
              </button>
              <a href={`/@${post.data.author?.username}`} class="font-medium hover:text-rose-600 dark:text-base-300 dark:hover:text-rose-400 transition-colors truncate">
                {post.data.author?.fullname}
              </a>
              {#if post.data.categories && post.data.categories.length > 0}
                <span aria-hidden="true">&middot;</span>
                <span>
                  {#each post.data.categories as categorySlug, i}
                    <a href={`/category/${categorySlug}`} class="text-yellow-700 dark:text-yellow-500">
                      {getCategoryName(categorySlug)}{i < post.data.categories.length - 1 ? ',' : ''}
                    </a>
                    {#if i < post.data.categories.length - 1}
                      {' '}
                    {/if}
                  {/each}
                </span>
              {/if}
            </div>

            <h3 class="mt-4 text-base text-base-900 dark:text-base-50 text-balance">
              <a href={`/posts/${post.slug}`} class="group-hover:underline group-hover:decoration-1 group-hover:decoration-wavy">
                {post.data.title}
              </a>
            </h3>

            <p class="mt-1 text-sm text-base-600 dark:text-base-400 line-clamp-2">{post.data.description}</p>

            {#if post.data.pubDate}
              <div class="flex items-center gap-2 mt-3 text-xs text-base-600 dark:text-base-400">
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
                src={generateBunnyCDNUrl(banner.image_url, 400)}
                srcset={generateSrcset(banner.image_url, 640)}
                sizes={cardSizes}
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

            <h3 class="text-base text-base-900 dark:text-base-50 text-balance">
              <a href={banner.banner_url} target="_blank" rel="noopener noreferrer" class="group-hover:underline group-hover:decoration-1 group-hover:decoration-wavy">
                {banner.title}
              </a>
            </h3>

            <p class="mt-1 text-sm text-base-600 dark:text-base-400 line-clamp-2">{banner.description}</p>
          </div>
        </article>
      </div>
    {/if}
  {/each}
</div>

<!-- Loading trigger -->
<div bind:this={loadMoreTrigger} class="w-full py-8 flex justify-center sm:col-span-2">
  {#if loading}
    <div class="flex items-center gap-3 text-base-600 dark:text-base-400">
      <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span class="text-sm">Yüklənir...</span>
    </div>
  {:else if !hasMore}
    <div class="text-sm text-base-600 dark:text-base-400">
      Bütün postlar yükləndi
    </div>
  {/if}
</div>

<style>
  .blurhash-canvas {
    transition: opacity 0.3s ease-out;
  }
</style>
