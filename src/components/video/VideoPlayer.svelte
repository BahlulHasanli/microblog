<script lang="ts">
  import Hls from "hls.js";

  interface Props {
    videoUrl: string;
    title?: string;
    authorName?: string;
    authorAvatar?: string;
    fitContain?: boolean;
    streamVideoId?: string | null;
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
  let volume = $state(0.7);
  let currentTime = $state(0);
  let duration = $state(0);
  let buffered = $state(0);
  let showControls = $state(false);
  let controlsTimeout: any;
  let hasStarted = $state(false);
  let containerElement: HTMLDivElement;
  let playbackRate = $state(1);
  let showSpeedMenu = $state(false);
  let isSeeking = $state(false);
  let isLoading = $state(false);
  let isPiP = $state(false);
  let hoverProgress = $state(0);
  let isHoveringProgress = $state(false);
  let skipAnim = $state<"left" | "right" | null>(null);
  let skipAnimTimeout: any;

  const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

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

  function handleVolumeChange(e: Event) {
    const target = e.target as HTMLInputElement;
    volume = parseFloat(target.value);
    if (videoElement) {
      videoElement.volume = volume;
      isMuted = volume === 0;
      videoElement.muted = isMuted;
    }
  }

  function handleTimeUpdate() {
    if (!videoElement) return;
    currentTime = videoElement.currentTime;
    syncDurationFromVideo();
    updateBuffered();
  }

  function updateBuffered() {
    if (!videoElement || !videoElement.buffered.length) return;
    buffered = videoElement.buffered.end(videoElement.buffered.length - 1);
  }

  function handleSeek(e: MouseEvent) {
    if (!videoElement) return;
    const total = Number.isFinite(duration) && duration > 0 ? duration : videoElement.duration;
    if (!Number.isFinite(total) || total <= 0) return;
    const progressBar = e.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoElement.currentTime = pos * total;
  }

  function handleProgressHover(e: MouseEvent) {
    if (!duration) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    hoverProgress = pos * duration;
  }

  function skip(seconds: number) {
    if (!videoElement) return;
    videoElement.currentTime = Math.max(0, Math.min(duration, videoElement.currentTime + seconds));
    skipAnim = seconds < 0 ? "left" : "right";
    clearTimeout(skipAnimTimeout);
    skipAnimTimeout = setTimeout(() => { skipAnim = null; }, 600);
  }

  function setSpeed(rate: number) {
    if (!videoElement) return;
    playbackRate = rate;
    videoElement.playbackRate = rate;
    showSpeedMenu = false;
  }

  async function togglePiP() {
    if (!videoElement) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        isPiP = false;
      } else if (document.pictureInPictureEnabled) {
        await videoElement.requestPictureInPicture();
        isPiP = true;
      }
    } catch {
      /* PiP not supported */
    }
  }

  function handleMouseMove() {
    showControls = true;
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => {
      if (isPlaying) {
        showControls = false;
      }
    }, 2500);
  }

  function handleMouseLeave() {
    if (isPlaying) {
      showControls = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    switch (e.key.toLowerCase()) {
      case " ":
      case "k":
        e.preventDefault();
        togglePlay();
        break;
      case "m":
        toggleMute();
        break;
      case "f":
        toggleFullscreen();
        break;
      case "arrowleft":
        e.preventDefault();
        skip(-10);
        break;
      case "arrowright":
        e.preventDefault();
        skip(10);
        break;
      case "arrowup":
        e.preventDefault();
        volume = Math.min(1, volume + 0.1);
        if (videoElement) videoElement.volume = volume;
        break;
      case "arrowdown":
        e.preventDefault();
        volume = Math.max(0, volume - 0.1);
        if (videoElement) videoElement.volume = volume;
        break;
      case "p":
        togglePiP();
        break;
    }
  }

  function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  function isIOSDevice(): boolean {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent;
    if (/iP(ad|hone|od)/i.test(ua)) return true;
    const nav = navigator as Navigator & { maxTouchPoints?: number };
    return nav.platform === "MacIntel" && (nav.maxTouchPoints ?? 0) > 1;
  }

  function toggleFullscreen() {
    const v = videoElement;
    if (!v || !containerElement) return;

    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      mozFullScreenElement?: Element | null;
      webkitExitFullscreen?: () => void;
      mozCancelFullScreen?: () => void;
    };

    if (document.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement) {
      if (document.exitFullscreen) {
        void document.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      }
      return;
    }

    const wkv = v as HTMLVideoElement & { webkitEnterFullscreen?: () => void };
    if (isIOSDevice() && typeof wkv.webkitEnterFullscreen === "function") {
      try {
        wkv.webkitEnterFullscreen();
      } catch {
        /* iOS bəzən yalnız user gesture + oynatma sonrası qəbul edir */
      }
      return;
    }

    type FsEl = HTMLElement & {
      requestFullscreen?: () => Promise<void>;
      webkitRequestFullscreen?: () => Promise<void>;
      mozRequestFullScreen?: () => Promise<void>;
    };

    function requestFs(el: HTMLElement | HTMLVideoElement): Promise<void> {
      const e = el as FsEl;
      if (e.requestFullscreen) {
        return e.requestFullscreen();
      }
      if (e.webkitRequestFullscreen) {
        const w = e.webkitRequestFullscreen();
        return w ?? Promise.resolve();
      }
      if (e.mozRequestFullScreen) {
        e.mozRequestFullScreen();
        return Promise.resolve();
      }
      return Promise.reject(new Error("no fullscreen"));
    }

    void requestFs(v)
      .catch(() => requestFs(containerElement))
      .catch(() => {});
  }

  let progress = $derived(duration > 0 ? (currentTime / duration) * 100 : 0);
  let bufferedProgress = $derived(duration > 0 ? (buffered / duration) * 100 : 0);

  function supportsNativeHls(el: HTMLVideoElement): boolean {
    return (
      el.canPlayType("application/vnd.apple.mpegurl") !== "" ||
      el.canPlayType("application/x-mpegURL") !== ""
    );
  }

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
      buffered = 0;
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

  $effect(() => {
    if (videoElement) {
      videoElement.volume = volume;
    }
  });

  let viewRecordInFlight = false;

  function recordSiteViewOnce() {
    const id = streamVideoId?.trim();
    if (!id || viewRecordInFlight) return;
    viewRecordInFlight = true;
    fetch("/api/stream-videos/record-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ streamVideoId: id }),
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
  onkeydown={handleKeydown}
  onclick={togglePlay}
  tabindex="0"
>
  <video
    bind:this={videoElement}
    class="video-element"
    class:video-element--contain={fitContain}
    ontimeupdate={handleTimeUpdate}
    onloadedmetadata={syncDurationFromVideo}
    ondurationchange={syncDurationFromVideo}
    onplaying={() => { isLoading = false; recordSiteViewOnce(); }}
    onwaiting={() => { isLoading = true; }}
    oncanplay={() => { isLoading = false; }}
    onended={() => { isPlaying = false; isLoading = false; }}
    onenterpictureinpicture={() => { isPiP = true; }}
    onleavepictureinpicture={() => { isPiP = false; }}
    muted={isMuted}
    loop
    playsinline
    webkit-playsinline=""
  ></video>

  <!-- Loading Spinner -->
  {#if isLoading}
    <div class="loading-overlay">
      <div class="spinner">
        <svg viewBox="0 0 56 56" class="spinner-svg">
          <defs>
            <linearGradient id="spinnerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#8d85ff" />
              <stop offset="100%" stop-color="#ff87e3" />
            </linearGradient>
          </defs>
          <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="3" />
          <circle cx="28" cy="28" r="24" fill="none" stroke="url(#spinnerGrad)" stroke-width="3" stroke-linecap="round" stroke-dasharray="150.8" stroke-dashoffset="113.1" class="spinner-circle" />
        </svg>
      </div>
      <span class="loading-text">Yüklənir...</span>
    </div>
  {/if}

  <!-- Skip Animations -->
  {#if skipAnim === "left"}
    <div class="skip-animation left">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
        <text x="10" y="15.5" font-size="6" text-anchor="middle" fill="currentColor">10</text>
      </svg>
    </div>
  {/if}
  {#if skipAnim === "right"}
    <div class="skip-animation right">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.01 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
        <text x="14" y="15.5" font-size="6" text-anchor="middle" fill="currentColor">10</text>
      </svg>
    </div>
  {/if}

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
    <div class="progress-container" onclick={(e) => { e.stopPropagation(); handleSeek(e); }} onmouseenter={() => isHoveringProgress = true} onmouseleave={() => isHoveringProgress = false} role="slider" tabindex="0" aria-label="Progress">
      <div class="progress-bar">
        <div class="progress-buffered" style="width: {bufferedProgress}%"></div>
        <div class="progress-fill" style="width: {progress}%"></div>
        <div class="progress-thumb" style="left: {progress}%"></div>
      </div>
      {#if isHoveringProgress}
        <div class="progress-tooltip" style="left: {hoverProgress / duration * 100}%">
          {formatTime(hoverProgress)}
        </div>
      {/if}
    </div>

    <!-- Bottom Controls -->
    <div class="bottom-controls">
      <!-- Play/Pause -->
      <button class="control-btn" onclick={(e) => { e.stopPropagation(); togglePlay(); }}>
        {#if isPlaying}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="icon">
            <path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clip-rule="evenodd" />
          </svg>
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="icon">
            <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348c.78.427.78 1.549 0 1.976L6.917 19.33c-.75.412-1.667-.13-1.667-.986V5.653z" clip-rule="evenodd" />
          </svg>
        {/if}
      </button>

      <!-- Skip Backward -->
      <button class="control-btn" onclick={(e) => { e.stopPropagation(); skip(-10); }} aria-label="Back 10s">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="icon">
          <path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
        </svg>
      </button>

      <!-- Skip Forward -->
      <button class="control-btn" onclick={(e) => { e.stopPropagation(); skip(10); }} aria-label="Forward 10s">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="icon">
          <path d="M12.01 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
        </svg>
      </button>

      <!-- Volume -->
      <div class="volume-wrapper" >
        <button class="control-btn" onclick={(e) => { e.stopPropagation(); toggleMute(); }}>
          {#if isMuted || volume === 0}
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
        <div class="volume-slider">
          <input type="range" min="0" max="1" step="0.05" value={volume} oninput={handleVolumeChange} />
        </div>
      </div>

      <!-- Time Display -->
      <span class="time-display">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      <div class="right-controls">
        <!-- Speed -->
        <div class="speed-wrapper">
          <button class="control-btn speed-btn" onclick={(e) => { e.stopPropagation(); showSpeedMenu = !showSpeedMenu; }} aria-label="Playback speed">
            <span class="speed-label">{playbackRate}x</span>
          </button>
          {#if showSpeedMenu}
            <div class="speed-menu-backdrop" onclick={(e) => { e.stopPropagation(); showSpeedMenu = false; }}></div>
            <div class="speed-menu" onclick={(e) => e.stopPropagation()}>
              {#each speeds as speed}
                <button class="speed-option {playbackRate === speed ? 'active' : ''}" onclick={(e) => { e.stopPropagation(); setSpeed(speed); }}>
                  {speed === 1 ? "Normal" : speed + "x"}
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <!-- PiP -->
        <button class="control-btn" onclick={(e) => { e.stopPropagation(); togglePiP(); }} aria-label="Picture in Picture">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="icon">
            <path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/>
          </svg>
        </button>

        <!-- Fullscreen -->
        <button class="control-btn" onclick={(e) => { e.stopPropagation(); toggleFullscreen(); }} aria-label="Fullscreen">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
        </button>
      </div>
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
    border-radius: 16px;
  }

  .video-element {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .video-element.video-element--contain {
    object-fit: contain;
  }

  /* Loading Spinner */
  .loading-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
    z-index: 5;
    animation: fadeIn 0.3s ease;
  }

  .spinner {
    position: relative;
    width: 48px;
    height: 48px;
  }

  .spinner-svg {
    width: 100%;
    height: 100%;
    animation: spin 1.2s linear infinite;
    transform-origin: center;
  }

  .spinner-circle {
    animation: spinnerDash 1.5s cubic-bezier(0.65, 0.05, 0.36, 1) infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @keyframes spinnerDash {
    0% { stroke-dashoffset: 113.1; }
    50% { stroke-dashoffset: 37.7; }
    100% { stroke-dashoffset: 113.1; }
  }

  .loading-text {
    color: rgba(255, 255, 255, 0.7);
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.02em;
  }

  /* Skip Animations */
  .skip-animation {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    z-index: 4;
    animation: skipPulse 0.6s ease-out forwards;
    pointer-events: none;
  }

  .skip-animation.left {
    left: 20%;
  }

  .skip-animation.right {
    right: 20%;
  }

  .skip-animation svg {
    width: 56px;
    height: 56px;
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5));
  }

  @keyframes skipPulse {
    0% { opacity: 0; transform: translateY(-50%) scale(0.8); }
    30% { opacity: 1; transform: translateY(-50%) scale(1.1); }
    100% { opacity: 0; transform: translateY(-50%) scale(1); }
  }

  .play-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.55);
    border: 2px solid rgba(255, 255, 255, 0.25);
    border-radius: 50%;
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 2;
    -webkit-tap-highlight-color: transparent;
  }

  .play-overlay:hover {
    background: rgba(0, 0, 0, 0.7);
    transform: translate(-50%, -50%) scale(1.08);
    border-color: rgba(255, 255, 255, 0.4);
  }

  .play-overlay:active {
    transform: translate(-50%, -50%) scale(0.95);
    background: rgba(0, 0, 0, 0.5);
  }

  .play-icon {
    width: 32px;
    height: 32px;
    color: white;
    margin-left: 3px;
  }

  .play-overlay:hover {
    background: rgba(0, 0, 0, 0.7);
    transform: translate(-50%, -50%) scale(1.08);
    border-color: rgba(255, 255, 255, 0.4);
  }

  .play-overlay:active {
    transform: translate(-50%, -50%) scale(0.95);
    background: rgba(0, 0, 0, 0.5);
  }

  .play-icon {
    width: 32px;
    height: 32px;
    color: white;
    margin-left: 3px;
  }

  .controls {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.5) 60%, transparent 100%);
    padding: 16px 12px 12px;
    opacity: 0;
    transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 3;
  }

  .controls.visible {
    opacity: 1;
  }

  .progress-container {
    margin-bottom: 12px;
    cursor: pointer;
    position: relative;
    padding: 10px 0;
  }

  .progress-bar {
    height: 4px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    overflow: visible;
    position: relative;
    transition: height 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .progress-container:hover .progress-bar {
    height: 6px;
  }

  .progress-buffered {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: rgba(255, 255, 255, 0.25);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .progress-fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: rgba(255, 255, 255, 0.85);
    border-radius: 4px;
    transition: width 0.1s linear;
  }

  .progress-container:hover .progress-fill {
    box-shadow: 0 0 12px rgba(141, 133, 255, 0.4);
  }

  .progress-container:hover .progress-fill {
    box-shadow: 0 0 12px rgba(141, 133, 255, 0.4);
  }

  .progress-thumb {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%) scale(0);
    width: 14px;
    height: 14px;
    background: #fff;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
  }

  .progress-container:hover .progress-thumb {
    transform: translate(-50%, -50%) scale(1);
  }

  .progress-tooltip {
    position: absolute;
    bottom: 24px;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.85);
    color: #fff;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    pointer-events: none;
    white-space: nowrap;
  }

  .bottom-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .right-controls {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
  }

  .control-btn {
    background: rgba(255, 255, 255, 0.08);
    border: none;
    color: white;
    cursor: pointer;
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 8px;
  }

  .control-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }

  .control-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
  }

  .control-btn:active {
    transform: translateY(0);
  }

  .icon {
    width: 20px;
    height: 20px;
  }

  .time-display {
    color: rgba(255, 255, 255, 0.85);
    font-size: 13px;
    font-weight: 500;
    padding: 0 8px;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;
  }

  /* Volume Slider */
  .volume-wrapper {
    display: flex;
    align-items: center;
    gap: 6px;
    position: relative;
  }

  .volume-slider {
    width: 0;
    overflow: hidden;
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
    flex-shrink: 0;
    padding: 4px 0;
    margin-top: -4px;
  }

  .volume-wrapper:hover .volume-slider {
    width: 90px;
    opacity: 1;
    pointer-events: auto;
  }

  .volume-slider input[type="range"] {
    width: 90px;
    height: 4px;
    appearance: none;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    outline: none;
    cursor: pointer;
    margin: 0;
  }

  .volume-slider input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 12px;
    background: #fff;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
    transition: transform 0.15s ease;
  }

  .volume-slider input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }

  .volume-slider input[type="range"]::-moz-range-thumb {
    width: 12px;
    height: 12px;
    background: #fff;
    border-radius: 50%;
    cursor: pointer;
    border: none;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  }

  /* Speed Menu */
  .speed-wrapper {
    position: relative;
  }

  .speed-btn {
    min-width: 44px;
  }

  .speed-label {
    font-size: 12px;
    font-weight: 600;
    color: #fff;
    letter-spacing: 0.02em;
  }

  .speed-menu {
    position: absolute;
    bottom: 100%;
    right: 0;
    transform: translateY(-10px);
    background: rgba(20, 20, 30, 0.95);
    border-radius: 10px;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 95px;
    animation: slideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(-10px); }
  }

  .speed-option {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.75);
    padding: 10px 14px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    text-align: left;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .speed-option:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .speed-option.active {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
    font-weight: 600;
  }

  .title-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 60%, transparent 100%);
    padding: 16px;
    padding-bottom: 36px;
    z-index: 2;
  }

  .video-title {
    color: white;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: 0.01em;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  }

  .author-info {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 12px;
  }

  .author-avatar-wrapper {
    width: 32px;
    height: 32px;
    overflow: hidden;
    flex-shrink: 0;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
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
    letter-spacing: 0.01em;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @media (max-width: 640px) {
    .video-container {
      border-radius: 8px;
    }

    .play-overlay {
      width: 56px;
      height: 56px;
    }

    .play-icon {
      width: 28px;
      height: 28px;
    }

    .controls {
      padding: 12px 8px 8px;
    }

    .progress-container {
      margin-bottom: 8px;
      padding: 4px 0;
    margin-top: -4px;
    }

    .bottom-controls {
      gap: 4px;
    }

    .control-btn {
      padding: 6px;
      border-radius: 6px;
    }

    .icon {
      width: 18px;
      height: 18px;
    }

    .time-display {
      font-size: 11px;
      padding: 0 4px;
    }

    .speed-label {
      font-size: 11px;
    }

    .volume-slider {
      display: none;
    }

    .speed-wrapper {
      position: static;
    }

    .speed-menu-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 99;
      animation: fadeIn 0.2s ease;
    }

    .speed-menu {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      transform: none;
      min-width: unset;
      width: 100%;
      border-radius: 16px 16px 0 0;
      padding: 8px 12px 24px;
      box-shadow: 0 -4px 32px rgba(0, 0, 0, 0.6);
      animation: slideUpMobile 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 100;
    }

    @keyframes slideUpMobile {
      from { opacity: 0; transform: translateY(100%); }
      to { opacity: 1; transform: translateY(0); }
    }

    .speed-option {
      padding: 14px 16px;
      font-size: 15px;
      min-height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
    }

    .title-overlay {
      padding: 10px;
      padding-bottom: 24px;
    }

    .video-title {
      font-size: 13px;
    }

    .author-info {
      gap: 8px;
      margin-top: 6px;
    }

    .author-avatar-wrapper {
      width: 24px;
      height: 24px;
      border-radius: 6px;
    }

    .author-name {
      font-size: 12px;
    }

    .spinner {
      width: 36px;
      height: 36px;
    }

    .loading-text {
      font-size: 12px;
    }

    .skip-animation svg {
      width: 40px;
      height: 40px;
    }

    .progress-tooltip {
      bottom: 20px;
      font-size: 11px;
      padding: 3px 6px;
    }
  }

  @media (max-width: 380px) {
    .right-controls {
      gap: 2px;
    }

    .control-btn {
      padding: 5px;
    }

    .icon {
      width: 16px;
      height: 16px;
    }

    .time-display {
      font-size: 10px;
    }

    .speed-wrapper {
      display: none;
    }
  }
</style>
