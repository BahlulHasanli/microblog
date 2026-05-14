<script lang="ts">
  import type { WindowsVideo } from "@/lib/bunny-stream-videos";
  import VideoPlayer from "@/components/video/VideoPlayer.svelte";
  import { formatSimpleDate } from "@/utils/date";

  type StreamUser = {
    id: string;
    fullname: string;
    username: string;
    avatar?: string | null;
  } | null;

  let {
    video,
    user = null,
    showViewCount = false,
  }: {
    video: WindowsVideo;
    user: StreamUser;
    /** Baxış sayı — yalnız admin */
    showViewCount?: boolean;
  } = $props();

  type CommentRow = {
    id: number;
    content: string;
    created_at: string;
    user_id: string | null;
    users?: { fullname?: string; username?: string; avatar?: string | null } | null;
  };

  let comments = $state<CommentRow[]>([]);
  let commentsLoading = $state(true);
  let commentText = $state("");
  let guestName = $state("");
  let guestEmail = $state("");
  let commentSubmitting = $state(false);
  let commentError = $state("");
  let siteViewCount = $state(video.siteViewCount ?? 0);

  const guestEmailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function formatViewCount(n: number | null | undefined): string | null {
    if (n == null || !Number.isFinite(n) || n < 0) return null;
    return new Intl.NumberFormat("az-AZ").format(Math.floor(n));
  }

  function sortCommentsNewestFirst(list: CommentRow[]): CommentRow[] {
    return [...list].sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      if (tb !== ta) return tb - ta;
      return b.id - a.id;
    });
  }

  function onSiteViewRecorded(_streamId: string, count: number) {
    siteViewCount = count;
  }

  async function loadComments() {
    if (!video.streamVideoId) {
      commentsLoading = false;
      return;
    }
    try {
      const r = await fetch(
        `/api/stream-videos/comments?streamVideoId=${encodeURIComponent(video.streamVideoId)}`
      );
      const j = await r.json();
      if (j.success) {
        comments = sortCommentsNewestFirst((j.comments ?? []) as CommentRow[]);
      }
    } catch {
      comments = [];
    } finally {
      commentsLoading = false;
    }
  }

  async function submitComment() {
    if (!video.streamVideoId) return;
    const t = commentText.trim();
    if (!t) {
      commentError = "Şərh daxil edin";
      return;
    }
    if (!user) {
      if (!guestName.trim()) {
        commentError = "Zəhmət olmasa ad və soyadınızı daxil edin";
        return;
      }
      if (!guestEmail.trim() || !guestEmailOk.test(guestEmail.trim())) {
        commentError = "Düzgün email ünvanı daxil edin";
        return;
      }
    }
    commentSubmitting = true;
    commentError = "";
    try {
      const body: Record<string, string> = {
        streamVideoId: video.streamVideoId,
        content: t,
      };
      if (!user) {
        body.guestName = guestName.trim();
        body.guestEmail = guestEmail.trim();
      }
      const r = await fetch("/api/stream-videos/add-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok || !j.success) {
        commentError = j.message || "Xəta baş verdi";
        return;
      }
      commentText = "";
      guestName = "";
      guestEmail = "";
      if (j.comment) comments = sortCommentsNewestFirst([...comments, j.comment as CommentRow]);
    } catch {
      commentError = "Şəbəkə xətası";
    } finally {
      commentSubmitting = false;
    }
  }

  $effect(() => {
    loadComments();
  });
</script>

<div class="stream-video-page flex flex-col w-full max-w-4xl mx-auto">
  <!-- Video player — full width, no overlay title/author -->
  <div class="w-full">
    <div class="relative w-full aspect-video bg-black rounded-none lg:rounded-xl overflow-hidden">
      <div class="absolute inset-0">
        <VideoPlayer
          videoUrl={video.videoUrl}
          fitContain={true}
          streamVideoId={video.streamVideoId ?? null}
          onSiteViewRecorded={showViewCount ? onSiteViewRecorded : undefined}
        />
      </div>
    </div>

    <!-- Video info — YouTube style -->
    <div class="px-4 lg:px-0 mt-3">
      <h1
        class="m-0 text-lg sm:text-xl font-nouvelr-semibold leading-snug tracking-tight text-slate-900 dark:text-base-50"
      >
        {video.title}
      </h1>

      <!-- Author row -->
      <div class="mt-3 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          {#if video.authorAvatar?.trim()}
            <div class="stream-vp-avatar squircle">
              <img src={video.authorAvatar} alt="" class="stream-vp-avatar-img" />
            </div>
          {:else}
            <div
              class="stream-vp-avatar stream-vp-avatar-placeholder squircle flex items-center justify-center text-xs font-nouvelr-semibold text-white"
              aria-hidden="true"
            >
              {video.authorName.charAt(0).toUpperCase() || "?"}
            </div>
          {/if}
          <span class="text-sm font-nouvelr-semibold text-base-900 dark:text-base-100 truncate">{video.authorName}</span>
        </div>

        <div class="flex items-center gap-2 shrink-0">

          {#if video.duration}
          <span
            class="inline-flex items-center gap-1 rounded-full bg-base-100/50 px-3 py-1.5 text-xs tabular-nums text-base-600 dark:bg-base-800 dark:text-base-300 font-nouvelr"
          >
            {video.duration}
          </span>
        {/if}

          {#if showViewCount && video.streamVideoId && formatViewCount(siteViewCount)}
            <span
              class="inline-flex items-center gap-1 rounded-full bg-base-100/50 px-3 py-1.5 text-xs tabular-nums text-base-600 dark:bg-base-800 dark:text-base-300 font-nouvelr"
            >
              <svg class="size-3.5 shrink-0 text-base-400 dark:text-base-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              {formatViewCount(siteViewCount)} baxış
            </span>
          {/if}  
        </div>
      </div>

      <!-- Description box — YouTube style expandable -->
      {#if video.description?.trim() || video.category?.trim()}
        <div class="mt-3 rounded-xl bg-base-100/40 dark:bg-base-800/50 p-3">
          <div class="flex flex-wrap items-center gap-2 text-xs text-base-600 dark:text-base-400 font-nouvelr">
            {#if video.category?.trim()}
              <span class="rounded-full bg-base-200/80 dark:bg-base-700/60 px-2 py-0.5 font-medium">{video.category.trim()}</span>
            {/if}
          </div>
          {#if video.description?.trim()}
            <p
              class="mt-2 text-sm leading-relaxed text-base-700 dark:text-base-300 font-nouvelr whitespace-pre-wrap wrap-anywhere m-0"
            >
              {video.description.trim()}
            </p>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- Comments section -->
  <div
    class="w-full mt-6 flex flex-col"
  >
    <div class="px-4 lg:px-0 pb-3 flex items-center gap-3">
      <h2 class="m-0 text-base font-nouvelr-semibold text-slate-900 dark:text-base-50">
        {#if commentsLoading}
          Şərhlər
        {:else}
          {comments.length} şərh
        {/if}
      </h2>
    </div>

    <!-- Comment form -->
    {#if video.streamVideoId}
      <div class="px-4 lg:px-0 pb-6 border-b border-base-200/40 dark:border-base-800">
        {#if commentError}
          <p class="mb-2 text-xs text-red-600 dark:text-red-400">{commentError}</p>
        {/if}
        {#if !user}
          <div class="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              type="text"
              bind:value={guestName}
              placeholder="Ad və soyad"
              maxlength="200"
              disabled={commentSubmitting}
              class="w-full rounded-lg border border-base-200 bg-white px-3 py-2 text-sm text-base-900 placeholder:text-base-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40 dark:border-base-700 dark:bg-base-900 dark:text-base-50 font-nouvelr"
            />
            <input
              type="text"
              inputmode="email"
              autocomplete="email"
              autocapitalize="off"
              autocorrect="off"
              spellcheck="false"
              bind:value={guestEmail}
              placeholder="Email ünvanınız"
              maxlength="320"
              disabled={commentSubmitting}
              class="w-full rounded-lg border border-base-200 bg-white px-3 py-2 text-sm text-base-900 placeholder:text-base-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40 dark:border-base-700 dark:bg-base-900 dark:text-base-50 font-nouvelr"
            />
          </div>
        {/if}
        <textarea
          bind:value={commentText}
          rows="3"
          maxlength="1000"
          placeholder="Nə düşünürsən?"
          class="mb-2 w-full resize-none rounded-lg border border-base-200 bg-white px-3 py-2 text-sm text-base-900 placeholder:text-base-400 focus:outline-none focus:ring-2 focus:ring-rose-500/40 dark:border-base-700 dark:bg-base-900 dark:text-base-50 font-nouvelr"
          disabled={commentSubmitting}
        ></textarea>
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {#if !user}
            <p class="text-xs text-base-500 dark:text-base-400 font-nouvelr">
              Daxil olaraq daha çox imkandan yararlana bilərsiniz.
              <a href="/signin" class="font-medium text-rose-600 hover:underline dark:text-rose-400">Daxil ol</a>
            </p>
          {:else}
            <span></span>
          {/if}
          <button
            type="button"
            onclick={submitComment}
            disabled={commentSubmitting || !commentText.trim()}
            class="w-full cursor-pointer rounded-full bg-base-900 py-2.5 text-sm font-nouvelr-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50 dark:bg-base-100 dark:text-base-900 sm:w-auto sm:px-6"
          >
            {commentSubmitting ? "Göndərilir..." : "Paylaş"}
          </button>
        </div>
      </div>
    {/if}

    <!-- Comments list -->
    <div class="px-4 lg:px-0 py-4">
      {#if commentsLoading}
        <div
          class="flex items-center gap-3 rounded-xl border border-base-200/80 bg-white/90 px-4 py-5 dark:border-base-700/80 dark:bg-base-900/60"
          role="status"
          aria-live="polite"
        >
          <span
            class="inline-block size-5 shrink-0 animate-spin rounded-full border-2 border-base-200 border-t-rose-500 dark:border-base-700 dark:border-t-rose-400"
            aria-hidden="true"
          ></span>
          <p class="m-0 text-sm text-base-600 dark:text-base-400 font-nouvelr">Şərhlər yüklənir...</p>
        </div>
      {:else if comments.length === 0}
        <div
          class="rounded-2xl border border-dashed border-base-200 bg-white/80 px-4 py-10 text-center dark:border-base-700 dark:bg-base-900/50"
        >
          <p class="m-0 text-sm leading-relaxed text-base-600 dark:text-base-400 font-nouvelr">
            Hələki şərh yoxdur — ilk sən yaz.
          </p>
        </div>
      {:else}
        <ul class="m-0 flex list-none flex-col gap-3 p-0">
          {#each comments as c (c.id)}
            <li
              class="rounded-lg border border-base-200/40 bg-white/90 p-3 dark:border-base-700/90 dark:bg-base-900/70 sm:p-3.5"
            >
              <div class="flex gap-3">
                {#if c.users?.avatar}
                  <img
                    src={c.users.avatar}
                    alt=""
                    class="squircle size-9 shrink-0 object-cover"
                  />
                {:else}
                  <div
                    class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-base-100 text-sm font-nouvelr-semibold text-base-600 dark:bg-base-800 dark:text-base-300"
                  >
                    {(c.users?.fullname || c.users?.username || "?").charAt(0).toUpperCase()}
                  </div>
                {/if}
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span class="text-sm font-nouvelr-semibold text-slate-900 dark:text-base-50">
                      {c.users?.fullname || c.users?.username || "İstifadəçi"}
                    </span>
                    {#if !c.user_id}
                      <span
                        class="rounded-md bg-base-100 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-base-500 dark:bg-base-800 dark:text-base-400 font-nouvelr"
                      >Qonaq</span>
                    {/if}
                    <span class="text-xs text-base-400 font-nouvelr">{formatSimpleDate(c.created_at)}</span>
                  </div>
                  <p class="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-base-700 dark:text-base-300 font-nouvelr">
                    {c.content}
                  </p>
                </div>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
</div>

<style>
  .stream-vp-avatar {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    overflow: hidden;
  }

  .stream-vp-avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  :global(.stream-vp-avatar-placeholder.squircle) {
    background: rgba(0, 0, 0, 0.15) !important;
  }

  :global(.dark) :global(.stream-vp-avatar-placeholder.squircle) {
    background: rgba(255, 255, 255, 0.15) !important;
  }
</style>
