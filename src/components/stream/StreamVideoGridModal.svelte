<script lang="ts">
  import type { WindowsVideo } from "@/lib/bunny-stream-videos";
  import VideoPlayer from "@/components/video/VideoPlayer.svelte";
  import { formatSimpleDate } from "@/utils/date";
  import { cubicOut } from "svelte/easing";
  import { fade, fly } from "svelte/transition";

  type StreamUser = {
    id: string;
    fullname: string;
    username: string;
    avatar?: string | null;
  } | null;

  let {
    videos = [],
    user = null,
    anchorScroll = false,
  }: {
    videos: WindowsVideo[];
    user: StreamUser;
    /** /windows üçün #video-guid ilə scroll */
    anchorScroll?: boolean;
  } = $props();

  let modalOpen = $state(false);
  let selectedGuid = $state<string | null>(null);

  const selected = $derived(videos.find((v) => v.guid === selectedGuid) ?? null);

  type CommentRow = {
    id: number;
    content: string;
    created_at: string;
    user_id: string | null;
    users?: { fullname?: string; username?: string; avatar?: string | null } | null;
  };

  let comments = $state<CommentRow[]>([]);
  let commentsLoading = $state(false);
  let commentText = $state("");
  let guestName = $state("");
  let guestEmail = $state("");
  let commentSubmitting = $state(false);
  let commentError = $state("");
  /** Mobil/tablet: şərh formu altdan sheet */
  let commentSheetOpen = $state(false);
  /** record-view cavabı — kart/modal dərhal yenilənsin */
  let siteViewCountById = $state<Record<string, number>>({});

  const guestEmailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function siteViewCountFor(video: WindowsVideo): number {
    const id = video.streamVideoId;
    if (!id) return 0;
    const o = siteViewCountById[id];
    if (o != null) return o;
    return video.siteViewCount ?? 0;
  }

  function onStreamSiteViewRecorded(streamId: string, count: number) {
    siteViewCountById = { ...siteViewCountById, [streamId]: count };
  }

  function formatViewCount(n: number | null | undefined): string | null {
    if (n == null || !Number.isFinite(n) || n < 0) return null;
    return new Intl.NumberFormat("az-AZ").format(Math.floor(n));
  }

  $effect(() => {
    if (!modalOpen) return;
    document.documentElement.classList.add("overflow-hidden");
    return () => {
      document.documentElement.classList.remove("overflow-hidden");
    };
  });

  function sortCommentsNewestFirst(list: CommentRow[]): CommentRow[] {
    return [...list].sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      if (tb !== ta) return tb - ta;
      return b.id - a.id;
    });
  }

  async function loadComments(streamVideoId: string | null | undefined) {
    commentsLoading = true;
    comments = [];
    if (!streamVideoId) {
      commentsLoading = false;
      return;
    }
    try {
      const r = await fetch(
        `/api/stream-videos/comments?streamVideoId=${encodeURIComponent(streamVideoId)}`
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

  function openModal(guid: string) {
    selectedGuid = guid;
    modalOpen = true;
    commentSheetOpen = false;
    commentText = "";
    guestName = "";
    guestEmail = "";
    commentError = "";
    const v = videos.find((x) => x.guid === guid);
    loadComments(v?.streamVideoId ?? null);
  }

  function closeModal() {
    commentSheetOpen = false;
    modalOpen = false;
    selectedGuid = null;
  }

  function closeCommentSheet() {
    commentSheetOpen = false;
  }

  function backdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) closeModal();
  }

  async function submitComment() {
    if (!selected?.streamVideoId) return;
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
        streamVideoId: selected.streamVideoId,
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
      commentSheetOpen = false;
    } catch {
      commentError = "Şəbəkə xətası";
    } finally {
      commentSubmitting = false;
    }
  }

  function modalKeydown(e: KeyboardEvent) {
    if (e.key !== "Escape") return;
    if (commentSheetOpen) {
      commentSheetOpen = false;
      return;
    }
    closeModal();
  }

  function commentSheetBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) closeCommentSheet();
  }
</script>

<svelte:window onkeydown={modalKeydown} />

{#snippet streamCommentForm()}
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
      {commentSubmitting ? "Göndərilir…" : "Paylaş"}
    </button>
  </div>
{/snippet}

{#if videos.length > 0}
  <ul class="stream-video-card-grid grid list-none grid-cols-1 gap-6 p-0 md:grid-cols-2 lg:grid-cols-4">
    {#each videos as video (video.guid)}
      <li id={anchorScroll ? video.guid : undefined} class={anchorScroll ? "scroll-mt-24" : ""}>
        <button
          type="button"
          class="group relative block w-full cursor-pointer overflow-hidden rounded-lg text-left outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-base-200 dark:ring-offset-base-950"
          onclick={() => openModal(video.guid)}
        >
          <div class="relative h-[min(70vh,420px)] w-full sm:h-[480px] lg:h-[500px]">
            <img
              src={video.thumbnail}
              alt={video.title}
              width="800"
              height="1000"
              loading="lazy"
              decoding="async"
              class="absolute inset-0 h-full w-full object-cover"
            />

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

            <div
              class="pointer-events-none absolute bottom-4 right-4 z-30 rounded bg-black/60 px-2 py-1 text-sm text-white tabular-nums font-nouvelr"
            >
              {video.duration}
            </div>
          </div>
        </button>
      </li>
    {/each}
  </ul>
{/if}

{#if modalOpen && selected}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- Blur ayrı qatdadır: bütün wrapper-də backdrop-filter fixed uşaqlarda (xüsusən dark) klik/z-index qarışmasına səbəb ola bilər -->
  <div
    class="fixed inset-0 z-[1000] flex items-stretch justify-center sm:items-center sm:p-4 isolate"
  >
    <div
      class="absolute inset-0 z-0 bg-black/85 backdrop-blur-sm dark:bg-black/92 dark:backdrop-blur-none"
      onclick={backdropClick}
      role="presentation"
      aria-hidden="true"
    ></div>
    <div
      class="relative z-10 flex h-dvh max-h-dvh w-full max-w-6xl flex-col overflow-hidden bg-white shadow-2xl outline-none ring-1 ring-black/5 dark:bg-base-900 dark:shadow-black/50 dark:ring-white/10 lg:h-[min(92dvh,880px)] lg:max-h-[min(92dvh,880px)] lg:flex-row lg:items-stretch sm:rounded-xl pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stream-modal-title"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        class="absolute right-3 top-3 z-110 flex size-9 cursor-pointer items-center justify-center rounded-xl border border-base-200/90 bg-white/95 text-base-600 backdrop-blur-md transition-all duration-200 hover:border-rose-200 hover:bg-base-50 hover:text-rose-600 active:scale-[0.97] dark:border-base-600 dark:bg-base-800/95 dark:text-base-300 dark:hover:border-rose-500/40 dark:hover:bg-base-700 dark:hover:text-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-base-900 sm:right-4 sm:top-4 sm:size-10"
        onclick={closeModal}
        aria-label="Bağla"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="size-[18px] sm:size-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>

      <div
        class="relative w-full shrink-0 bg-black max-lg:h-[min(38dvh,280px)] max-lg:min-h-[180px] max-lg:max-h-[42vh] lg:relative lg:min-h-0 lg:h-auto lg:max-h-none lg:flex-6 lg:basis-0 lg:shrink"
      >
        <div class="absolute inset-0">
          {#key selected.guid}
            <VideoPlayer
              videoUrl={selected.videoUrl}
              title={selected.title}
              authorName={selected.authorName}
              authorAvatar={selected.authorAvatar || ""}
              fitContain={true}
              streamVideoId={selected.streamVideoId ?? null}
              onSiteViewRecorded={onStreamSiteViewRecorded}
            />
          {/key}
        </div>
      </div>

      <div
        class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-t border-base-200 bg-base-50/40 dark:border-base-800 dark:bg-base-950/40 lg:max-w-[440px] lg:basis-[40%] lg:flex-[4] lg:border-l lg:border-t-0"
      >
        <header
          class="shrink-0 border-b border-base-200/40 bg-white/90 px-4 pb-4 pt-3 backdrop-blur-md dark:border-base-800 dark:bg-base-900/90 sm:px-5 sm:pb-5 sm:pt-4"
        >
          <!-- lg+: bağla (sm:top-4, sm:size-10) ilə eyni şaquli xətt; sağda düymə üçün boşluq -->
          <div
            class="flex min-h-9 items-center gap-2 sm:min-h-10 lg:pr-19"
          >
            <h2
              id="stream-modal-title"
              class="m-0 min-w-0 flex-1 text-lg font-nouvelr-semibold leading-snug tracking-tight text-slate-900 sm:text-xl dark:text-base-50"
            >
              {selected.title}
            </h2>
          </div>

          <div class="mt-3 flex flex-wrap items-center gap-2">
            {#if selected.category?.trim()}
              <span
                class="inline-flex max-w-full items-center rounded-full border border-base-200/90 bg-base-100 px-2.5 py-0.5 text-xs font-medium text-base-700 dark:border-base-700 dark:bg-base-800 dark:text-base-200 font-nouvelr truncate"
              >
                {selected.category.trim()}
              </span>
            {/if}
            {#if selected.streamVideoId && formatViewCount(siteViewCountFor(selected))}
              <span
                class="inline-flex items-center gap-1 rounded-full border border-base-200/90 bg-white px-2.5 py-0.5 text-xs tabular-nums text-base-600 dark:border-base-700 dark:bg-base-800/80 dark:text-base-300 font-nouvelr"
              >
                <svg class="size-3.5 shrink-0 text-base-400 dark:text-base-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
                {formatViewCount(siteViewCountFor(selected))}
              </span>
            {/if}
          </div>

          {#if selected.description?.trim()}
            <div
              class="mt-4"
            >
              <p
                class="m-0 text-[12px] leading-relaxed text-base-500 dark:text-base-200 font-display whitespace-pre-wrap wrap-anywhere"
              >
                {selected.description.trim()}
              </p>
            </div>
          {/if}
        </header>

        <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div
              class="shrink-0 border-b border-base-200/40  px-4 pb-3 pt-4 dark:border-base-800/90 dark:bg-base-950/30 sm:px-5"
            >
              <div class="flex items-center justify-between gap-2">
                <h3 class="m-0 text-sm font-nouvelr-semibold text-slate-900 dark:text-base-50">Şərhlər</h3>
                {#if !commentsLoading}
                  <span
                    class="rounded-full bg-base-200/90 px-2 py-0.5 text-xs font-medium tabular-nums text-base-600 dark:bg-base-800 dark:text-base-400 font-nouvelr"
                  >
                    {comments.length}
                  </span>
                {/if}
              </div>
            </div>

            <div
              class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3 sm:px-5 sm:pb-5"
            >
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
                  <p class="m-0 text-sm text-base-600 dark:text-base-400 font-nouvelr">Şərhlər yüklənir…</p>
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
                                >Qonaq</span
                              >
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

        <footer
          class="shrink-0 border-t border-base-200/40 bg-base-50/95 px-4 py-3 backdrop-blur-md dark:border-base-800 dark:bg-base-950/90 sm:px-5"
        >
          {#if selected.streamVideoId}
            <button
              type="button"
              class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-base-900 py-3 text-sm font-nouvelr-semibold text-white transition-opacity active:opacity-90 dark:bg-base-100 dark:text-base-900 lg:hidden"
              onclick={() => (commentSheetOpen = true)}
            >
              <svg class="size-4 shrink-0 opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Şərh yaz
            </button>
            <div class="hidden lg:block">
              <h3 class="mb-2 text-sm font-nouvelr-semibold text-base-900 dark:text-base-50">Şərh yaz</h3>
              {@render streamCommentForm()}
            </div>
          {/if}
        </footer>
      </div>
    </div>

    {#if commentSheetOpen && selected?.streamVideoId}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="fixed inset-0 z-[1010] flex items-end justify-center bg-black/50 dark:bg-black/70 lg:hidden pointer-events-auto"
        onclick={commentSheetBackdropClick}
        role="presentation"
        transition:fade={{ duration: 260, easing: cubicOut }}
      >
        <div
          class="max-h-[min(88dvh,640px)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-2xl bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_40px_-4px_rgba(0,0,0,0.18)] dark:bg-base-900 dark:shadow-[0_-12px_40px_-4px_rgba(0,0,0,0.45)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stream-comment-sheet-title"
          tabindex="-1"
          transition:fly={{ y: 320, duration: 260, opacity: 1, easing: cubicOut }}
          onclick={(e) => e.stopPropagation()}
        >
          <div class="sticky top-0 z-10 -mx-4 mb-3 bg-white px-4 pb-3 pt-2 dark:bg-base-900">
            <div class="flex min-h-10 items-center gap-2">
              <h3
                id="stream-comment-sheet-title"
                class="m-0 min-w-0 flex-1 text-base font-nouvelr-semibold leading-snug text-base-900 dark:text-base-50"
              >
                Şərh yaz
              </h3>
              <button
                type="button"
                class="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-base-500 transition-colors hover:bg-base-100 dark:text-base-400 dark:hover:bg-base-800"
                onclick={closeCommentSheet}
                aria-label="Bağla"
              >
                <svg class="size-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          {@render streamCommentForm()}
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .stream-modal-author-avatar {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
  }

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
