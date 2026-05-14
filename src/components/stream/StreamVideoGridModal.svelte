<script lang="ts">
  import type { WindowsVideo } from "@/lib/bunny-stream-videos";

  let {
    videos = [],
    anchorScroll = false,
    showViewCount = false,
  }: {
    videos: WindowsVideo[];
    /** /windows üçün #video-guid ilə scroll */
    anchorScroll?: boolean;
    /** Baxış sayı — yalnız admin */
    showViewCount?: boolean;
  } = $props();

  let hoveredGuid = $state<string | null>(null);

  function formatViewCount(n: number | null | undefined): string | null {
    if (n == null || !Number.isFinite(n) || n < 0) return null;
    return new Intl.NumberFormat("az-AZ").format(Math.floor(n));
  }

  function siteViewCountFor(video: WindowsVideo): number {
    return video.siteViewCount ?? 0;
  }
</script>

{#if videos.length > 0}
  <ul class="stream-video-card-grid grid list-none grid-cols-1 gap-6 p-0 md:grid-cols-2 lg:grid-cols-4">
    {#each videos as video (video.guid)}
      <li id={anchorScroll ? video.guid : undefined} class={anchorScroll ? "scroll-mt-24" : ""}>
        <a
          href={`/windows/${video.guid}`}
          class="group relative block w-full overflow-hidden rounded-lg text-left outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-base-200 dark:ring-offset-base-950"
          onmouseenter={() => (hoveredGuid = video.guid)}
          onmouseleave={() => (hoveredGuid = null)}
        >
          <div class="relative h-[min(70vh,420px)] w-full sm:h-[480px] lg:h-[500px]">
            <img
              src={video.thumbnail}
              alt={video.title}
              width="800"
              height="1000"
              loading="lazy"
              decoding="async"
              class="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
              style:opacity={hoveredGuid === video.guid ? 0 : 1}
            />
            {#if video.previewUrl}
              <img
                src={video.previewUrl}
                alt=""
                aria-hidden="true"
                width="800"
                height="1000"
                loading="lazy"
                decoding="async"
                class="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
                style:opacity={hoveredGuid === video.guid ? 1 : 0}
              />
            {/if}

            <div
              class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/30 transition-all duration-200 ease-in-out group-hover:bg-black/50"
              aria-hidden="true"
            >
              <svg class="h-14 w-14 sm:h-16 sm:w-16 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 4v16l13-8L7 4z" />
              </svg>
            </div>

            <div
              class="pointer-events-none absolute bottom-0 left-0 right-0 z-20 rounded-b-lg bg-linear-to-t from-black/80 to-transparent p-4 pr-16 text-white"
            >
              <div class="mb-1 text-sm text-white/95 font-nouvelr line-clamp-2">{video.category}</div>
              <h3 class="mb-2 text-base font-bold leading-snug font-nouvelr-semibold line-clamp-3 m-0">
                {video.title}
              </h3>
              <div class="flex items-center gap-[10px] min-w-0 mt-0.5">
                {#if video.authorAvatar?.trim()}
                  <div class="stream-video-card-avatar-wrap squircle">
                    <img
                      src={video.authorAvatar}
                      alt=""
                      class="stream-video-card-avatar-img"
                    />
                  </div>
                {:else}
                  <div
                    class="stream-video-card-avatar-wrap stream-video-card-avatar-placeholder squircle flex items-center justify-center text-[11px] font-nouvelr-semibold text-white"
                    aria-hidden="true"
                  >
                    {video.authorName.charAt(0).toUpperCase() || "?"}
                  </div>
                {/if}
                <span class="min-w-0 truncate text-sm font-medium text-white/90 font-nouvelr">{video.authorName}</span>
              </div>
            </div>

            {#if showViewCount}
              {#if video.streamVideoId}
                <div
                  class="pointer-events-none absolute top-4 right-4 z-30 flex max-w-[min(55%,11rem)] flex-col items-end gap-0.5 rounded bg-black/60 px-2 py-1 text-xs text-white tabular-nums font-nouvelr"
                  aria-label="Video baxışı"
                >
                  <span class="flex items-center gap-1">
                    <svg class="size-3.5 shrink-0 opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                    {formatViewCount(siteViewCountFor(video))}
                  </span>
                </div>
              {:else if formatViewCount(video.viewCount)}
                <div
                  class="pointer-events-none absolute top-4 right-4 z-30 flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-xs text-white tabular-nums font-nouvelr"
                  aria-label="Baxış sayı"
                >
                  <svg class="size-3.5 shrink-0 opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                  {formatViewCount(video.viewCount)}
                </div>
              {/if}
            {/if}

            <div
              class="pointer-events-none absolute bottom-4 right-4 z-30 rounded bg-black/60 px-2 py-1 text-sm text-white tabular-nums font-nouvelr"
            >
              {video.duration}
            </div>
          </div>
        </a>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .stream-video-card-avatar-wrap {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    overflow: hidden;
  }

  .stream-video-card-avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  :global(.stream-video-card-avatar-placeholder.squircle) {
    background: rgba(255, 255, 255, 0.2) !important;
  }
</style>
