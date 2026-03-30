<script lang="ts">
  import Hls from "hls.js";

  interface Props {
    videoUrl: string;
    title?: string;
    authorName?: string;
    authorAvatar?: string;
    /** true: video tam görünsün (letterbox), modal üçün */
    fitContain?: boolean;
    /** Supabase `stream_video.id` — unikal sayım serverdə IP ilə (record-view API) */
    streamVideoId?: string | null;
    /** API uğurlu olduqda — kart/modalda sayı dərhal yenilənsin */
    onSiteViewRecorded?: (streamVideoId: string, count: number) => void;
  }

  let {
    videoUrl,
    title = "",
    authorName = "",
    authorAvatar = "",
    fitContain = false,
    streamVideoId = null,
    onSiteViewRecorded,
  }: Props = $props();

  let videoElement: HTMLVideoElement | undefined;
  let isPlaying = $state(false);
  let isMuted = $state(false);
  let currentTime = $state(0);
  let duration = $state(0);
  let showControls = $state(false);
  let controlsTimeout: any;
  let hasStarted = $state(false);
  let containerElement: HTMLDivElement;

  function syncDurationFromVideo() {
    if (!videoElement) return;
    const d = videoElement.duration;
    if (Number.isFinite(d) && d > 0 && d !== Number.POSITIVE_INFINITY) {
      duration = d;
      return;
    }
    try {
      const sb = videoElement.seekable;
      if (sb.length > 0) {
        const end = sb.end(sb.length - 1);
        if (Number.isFinite(end) && end > 0) {
          duration = end;
        }
      }
    } catch {
      /* seekable bəzən HLS buffer qədərini verir */
    }
  }

  function applyHlsPlaylistDuration(details: { totalduration?: number; live?: boolean } | null | undefined) {
    if (!details || details.live) return;
    const d = details.totalduration;
    if (typeof d === "number" && Number.isFinite(d) && d > 0) {
      duration = d;
    }
  }

  function togglePlay() {
    if (!videoElement) return;
    if (isPlaying) {
      videoElement.pause();
      isPlaying = false;
      return;
    }
    const p = videoElement.play();
    if (p !== undefined) {
      void p
        .then(() => {
          isPlaying = true;
          hasStarted = true;
          recordSiteViewOnce();
        })
        .catch(() => {
          /* play() rədd — avtopley / HLS hazır deyil və s. */
        });
    } else {
      isPlaying = true;
      hasStarted = true;
      recordSiteViewOnce();
    }
  }

  function toggleMute() {
    if (!videoElement) return;
    isMuted = !isMuted;
    videoElement.muted = isMuted;
  }

  function handleTimeUpdate() {
    if (!videoElement) return;
    currentTime = videoElement.currentTime;
    syncDurationFromVideo();
  }

  function handleSeek(e: MouseEvent) {
    if (!videoElement) return;
    const total = Number.isFinite(duration) && duration > 0 ? duration : videoElement.duration;
    if (!Number.isFinite(total) || total <= 0) return;
    const progressBar = e.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoElement.currentTime = pos * total;
  }

  function handleMouseMove() {
    showControls = true;
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => {
      if (isPlaying) {
        showControls = false;
      }
    }, 2000);
  }

  function handleMouseLeave() {
    if (isPlaying) {
      showControls = false;
    }
  }

  function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  let progress = $derived(duration > 0 ? (currentTime / duration) * 100 : 0);

  function supportsNativeHls(el: HTMLVideoElement): boolean {
    return (
      el.canPlayType("application/vnd.apple.mpegurl") !== "" ||
      el.canPlayType("application/x-mpegURL") !== ""
    );
  }

  /** Bunny CDN HLS: playlist.m3u8 — Chrome-da hls.js ilə ABR, Safari-də nativ */
  $effect(() => {
    const el = videoElement;
    const url = videoUrl?.trim();
    if (!el || !url) return;

    let hlsRef: Hls | null = null;

    const teardown = () => {
      if (hlsRef) {
        hlsRef.destroy();
        hlsRef = null;
      }
      el.pause();
      el.removeAttribute("src");
      el.load();
      duration = 0;
      currentTime = 0;
    };

    const isHls = /\.m3u8(\?.*)?$/i.test(url);

    if (isHls) {
      if (supportsNativeHls(el)) {
        el.src = url;
      } else if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          capLevelToPlayerSize: true,
        });
        hls.loadSource(url);
        hls.attachMedia(el);

        hls.on(Hls.Events.LEVEL_LOADED, (_e, data) => {
          applyHlsPlaylistDuration(data.details);
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          for (const level of hls.levels) {
            if (level.details?.totalduration) {
              applyHlsPlaylistDuration(level.details);
              break;
            }
          }
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          }
        });
        hlsRef = hls;
      } else {
        el.src = url;
      }
    } else {
      el.src = url;
    }

    return teardown;
  });

  /** Eyni oynatma anında `playing` + `play().then` iki dəfə çağırmasın deyə */
  let viewRecordInFlight = false;

  const SV_VIEWER_STORAGE = "the99_stream_site_viewer";

  function stableSiteViewerId(): string {
    if (typeof window === "undefined") return "";
    try {
      let v = localStorage.getItem(SV_VIEWER_STORAGE);
      if (
        !v ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
      ) {
        v = crypto.randomUUID();
        localStorage.setItem(SV_VIEWER_STORAGE, v);
      }
      return v;
    } catch {
      return "";
    }
  }

  function recordSiteViewOnce() {
    const id = streamVideoId?.trim();
    if (!id || viewRecordInFlight) return;
    viewRecordInFlight = true;
    const viewerId = stableSiteViewerId();
    fetch("/api/stream-videos/record-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ streamVideoId: id, viewerId }),
    })
      .then(async (r) => {
        const j = await r.json().catch(() => null);
        if (r.ok && j?.success) {
          const raw = j.siteViewCount;
          const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
          if (Number.isFinite(n)) {
            onSiteViewRecorded?.(id, Math.floor(n));
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        viewRecordInFlight = false;
      });
  }
</script>

<div 
  class="video-container"
  bind:this={containerElement}
  onmousemove={handleMouseMove}
  onmouseleave={handleMouseLeave}
  onclick={togglePlay}
  onkeydown={(e) => e.key === 'Enter' || e.key === ' ' ? togglePlay() : null}
  role="button"
  tabindex="0"
>
  <video
    bind:this={videoElement}
    class="video-element"
    class:video-element--contain={fitContain}
    ontimeupdate={handleTimeUpdate}
    onloadedmetadata={syncDurationFromVideo}
    ondurationchange={syncDurationFromVideo}
    onplaying={recordSiteViewOnce}
    onended={() => isPlaying = false}
    muted={isMuted}
    loop
    playsinline
  ></video>

  <!-- Title Overlay -->
  {#if !isPlaying}
    <div class="title-overlay">
      {#if title}
        <span class="video-title">{title}</span>
      {/if}
      {#if authorName}
        <div class="author-info">
          {#if authorAvatar}
            <div class="author-avatar-wrapper squircle">
              <img src={authorAvatar} alt={authorName} class="author-avatar" />
            </div>
          {/if}
          <span class="author-name">{authorName}</span>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Play/Pause Overlay -->
  {#if !isPlaying}
    <button 
      class="play-overlay"
      onclick={(e) => { e.stopPropagation(); togglePlay(); }}
      aria-label="Play"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="play-icon">
        <path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd" />
      </svg>
    </button>
  {/if}

  <!-- Controls -->
  {#if hasStarted}
  <div class="controls {showControls || !isPlaying ? 'visible' : ''}" onclick={(e) => e.stopPropagation()} role="group">
    <!-- Progress Bar -->
    <div class="progress-container" onclick={(e) => { e.stopPropagation(); handleSeek(e); }} role="slider" tabindex="0" aria-label="Progress">
      <div class="progress-bar">
        <div class="progress-fill" style="width: {progress}%"></div>
      </div>
    </div>

    <!-- Bottom Controls -->
    <div class="bottom-controls">
      <button class="control-btn" onclick={(e) => { e.stopPropagation(); togglePlay(); }}>
        {#if isPlaying}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="icon">
            <path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clip-rule="evenodd" />
          </svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="icon">
            <path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd" />
          </svg>
        {/if}
      </button>

      <span class="time-display">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      <button class="control-btn ml-auto" onclick={(e) => { e.stopPropagation(); toggleFullscreen(); }} aria-label="Fullscreen">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
        </svg>
      </button>

      <button class="control-btn" onclick={(e) => { e.stopPropagation(); toggleMute(); }}>
        {#if isMuted}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="icon">
            <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 001.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 101.06-1.06L20.56 12l1.72-1.72a.75.75 0 00-1.06-1.06l-1.72 1.72-1.72-1.72z" />
          </svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="icon">
            <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
            <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
          </svg>
        {/if}
      </button>
    </div>
  </div>
  {/if}
</div>

<style>
  .video-container {
    position: relative;
    width: 100%;
    height: 100%;
    background: #000;
    overflow: hidden;
    cursor: pointer;
  }

  .video-element {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .video-element.video-element--contain {
    object-fit: contain;
  }

  .play-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.6);
    border: none;
    border-radius: 50%;
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    z-index: 2;
  }

  .play-overlay:hover {
    background: rgba(0, 0, 0, 0.8);
    transform: translate(-50%, -50%) scale(1.1);
  }

  .play-icon {
    width: 32px;
    height: 32px;
    color: white;
  }

  .controls {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, transparent 100%);
    padding: 12px;
    opacity: 0;
    transition: opacity 0.3s;
    z-index: 3;
  }

  .controls.visible {
    opacity: 1;
  }

  .progress-container {
    margin-bottom: 8px;
    cursor: pointer;
  }

  .progress-bar {
    height: 3px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: #fff;
    transition: width 0.1s;
  }

  .bottom-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .control-btn {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.2s;
  }

  .control-btn:hover {
    opacity: 0.7;
  }

  .icon {
    width: 20px;
    height: 20px;
  }

  .time-display {
    color: white;
    font-size: 12px;
    font-weight: 500;
  }

  .ml-auto {
    margin-left: auto;
  }

  .title-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.6) 50%, transparent 100%);
    padding: 12px;
    padding-bottom: 24px;
    z-index: 2;
  }

  .video-title {
    color: white;
    font-size: 15px;
    font-weight: 600;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .author-info {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
  }

  .author-avatar-wrapper {
    width: 28px;
    height: 28px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .author-avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .author-name {
    color: rgba(255, 255, 255, 0.9);
    font-size: 14px;
    font-weight: 500;
  }
</style>
