<script lang="ts">
  import { formatDistanceToNow } from "date-fns";
  import { az } from "date-fns/locale";
  import { ArrowRight, Heart, MessageCircle } from "lucide-svelte";

  interface User {
    fullname?: string | null;
    username?: string | null;
    avatar?: string | null;
  }

  interface Share {
    id: string;
    content: string;
    image_urls?: string[] | string | null;
    image_blurhashes?: string[] | string | null;
    youtube_video_id?: string | null;
    created_at: string;
    comments_count?: number;
    share_likes?: Array<{ id: string; user_id: string }>;
    user?: User | null;
  }

  let { shares = [] }: { shares?: Share[] } = $props();

  const normalizeImageUrl = (url: string): string => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }

    return `https://the99.b-cdn.net/${url}`;
  };

  const parseImages = (value: Share["image_urls"]): string[] => {
    if (!value) return [];

    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map(normalizeImageUrl) : [];
      } catch {
        return [];
      }
    }

    return Array.isArray(value) ? value.map(normalizeImageUrl) : [];
  };

  const getTimeAgo = (createdAt: string) =>
    formatDistanceToNow(new Date(createdAt), {
      locale: az,
      addSuffix: true,
    });
</script>

{#if shares.length > 0}
  <section
    class="home-share-section max-w-7xl mx-auto w-full px-4 sm:px-6 mt-8 sm:mt-10"
    aria-labelledby="home-share-title"
  >
    <div class="overflow-hidden rounded-2xl border border-slate-100 bg-white  dark:border-base-800 dark:bg-base-900">
      <div class="flex flex-col gap-4 border-b border-slate-100 px-4 py-5 dark:border-base-800 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <p class="mb-2 text-[13px] font-nouvelr-semibold tracking-[0.17em] text-rose-500">
            Dédi-qodu
          </p>
          <h2
            id="home-share-title"
            class="m-0 text-2xl font-nouvelr-semibold text-slate-950 dark:text-base-50 sm:text-3xl"
          >
            Son paylaşımlar
          </h2>
          <p class="mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-base-400">
            Qısa, təmiz və oxunaqlı.
          </p>
        </div>

        <a
          href="/shares"
          class="group inline-flex w-fit items-center gap-2 rounded-full bg-base-950 px-4 py-2 text-sm font-nouvelr-semibold text-white transition-colors hover:bg-base-800 dark:bg-base-50 dark:text-base-950 dark:hover:bg-base-200"
        >
         Daha çox
          <ArrowRight size={16} class="transition-transform group-hover:translate-x-0.5" />
        </a>
      </div>

      <div class="grid gap-0 divide-y divide-slate-100 dark:divide-base-800 md:grid-cols-3 md:divide-x md:divide-y-0">
        {#each shares as share (share.id)}
          {@const images = parseImages(share.image_urls)}
          <article class="flex flex-col p-5 transition-colors hover:bg-slate-50/60 dark:hover:bg-base-800/40 sm:p-6">
            <div class="mb-3 flex items-center gap-2.5">
              <img
                src={share.user?.avatar}
                alt={share.user?.fullname}
                class="squircle w-8! h-8! shrink-0 object-cover"
              />
              <a
                href={`/@${share.user?.username}`}
                class="truncate font-semibold text-slate-900 dark:text-base-50 hover:underline text-[13px]"
              >
                {share.user?.fullname}
              </a>
              <span class="shrink-0 text-slate-400 dark:text-base-500 text-[12px]">·</span>
              <span class="shrink-0 text-slate-400 dark:text-base-500 text-[12px]">{getTimeAgo(share.created_at)}</span>
            </div>

            <a href={`/shares/${share.id}`} class="block flex-1 no-underline">
              <p class="share-preview text-[14px] leading-relaxed text-slate-700 dark:text-base-200">
                {share.content}
              </p>

              {#if images.length > 0}
                <div class="mt-3 overflow-hidden rounded-lg border border-slate-100 bg-slate-100 dark:border-base-800 dark:bg-base-800">
                  <img
                    src={images[0]}
                    alt=""
                    class="h-48 w-full object-cover object-top"
                    loading="lazy"
                  />
                </div>
              {:else if share.youtube_video_id}
                <div class="mt-3 aspect-video overflow-hidden rounded-lg border border-slate-100 bg-slate-950 dark:border-base-800">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${share.youtube_video_id}`}
                    title="YouTube video"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                  ></iframe>
                </div>
              {/if}
            </a>

            <div class="mt-3 flex items-center gap-4 text-xs text-slate-400 dark:text-base-500">
              <a href={`/shares/${share.id}`} class="inline-flex items-center gap-1.5 hover:text-blue-500 transition-colors">
                <MessageCircle size={14} />
                {share.comments_count || 0}
              </a>
              <span class="inline-flex items-center gap-1.5">
                <Heart size={14} />
                {share.share_likes?.length || 0}
              </span>
            </div>
          </article>
        {/each}
      </div>
    </div>
  </section>
{/if}

<style>
  .share-preview {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 4;
    overflow: hidden;
  }
</style>
