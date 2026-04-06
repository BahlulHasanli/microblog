<script lang="ts">
  import type { WindowsVideo } from "@/lib/bunny-stream-videos";
  import StreamVideoGridModal from "@/components/stream/StreamVideoGridModal.svelte";

  let { videos = [] }: { videos: WindowsVideo[] } = $props();
</script>

{#if videos.length > 0}
  <section
    class="home-video-grid max-w-7xl mx-auto w-full px-4 sm:px-6 mt-6 sm:mt-8 mb-2"
    aria-labelledby="home-video-grid-title"
  >
    <div
      class="mb-6 sm:mb-8 mx-auto flex w-full max-w-6xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <h2
        id="home-video-grid-title"
        class="text-3xl sm:text-4xl font-nouvelr-semibold text-slate-900 dark:text-base-50 m-0 tracking-tight"
      >
        Pəncərələr
      </h2>
      <a
        href="/windows"
        class="group inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium font-nouvelr-semibold shrink-0 bg-base-100 dark:bg-base-900 text-base-700 dark:text-base-400 border border-transparent dark:border-base-800 hover:bg-base-200 dark:hover:bg-base-800 hover:text-base-900 dark:hover:text-base-100 transition-colors"
      >
        Daha çox
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          class="home-video-daha-arrow size-3.5 sm:size-4 shrink-0 opacity-70"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
            clip-rule="evenodd"
          />
        </svg>
      </a>
    </div>

    <StreamVideoGridModal {videos} anchorScroll={false} />
  </section>
{/if}

<style>
  :global(.home-video-grid) .home-video-daha-arrow {
    transform: translateX(0);
    transition:
      transform 280ms cubic-bezier(0.4, 0, 0.2, 1),
      opacity 280ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  :global(.home-video-grid) a.group:hover .home-video-daha-arrow,
  :global(.home-video-grid) a.group:focus-visible .home-video-daha-arrow {
    transform: translateX(2px);
    opacity: 1;
  }
</style>
