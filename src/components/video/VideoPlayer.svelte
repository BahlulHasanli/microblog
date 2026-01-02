<script lang="ts">
  interface Props {
    videoUrl: string;
    title?: string;
    authorName?: string;
    authorAvatar?: string;
  }
  
  let { videoUrl, title = "", authorName = "", authorAvatar = "" }: Props = $props();

  let videoElement: HTMLVideoElement;
  let isPlaying = $state(false);
  let isMuted = $state(true);
  let currentTime = $state(0);
  let duration = $state(0);
  let showControls = $state(false);
  let controlsTimeout: number;
  let hasStarted = $state(false);
  let containerElement: HTMLDivElement;

  function togglePlay() {
    if (isPlaying) {
      videoElement.pause();
    } else {
      videoElement.play();
      hasStarted = true;
    }
    isPlaying = !isPlaying;
  }

  function toggleMute() {
    isMuted = !isMuted;
    videoElement.muted = isMuted;
  }

  function handleTimeUpdate() {
    currentTime = videoElement.currentTime;
    duration = videoElement.duration;
  }

  function handleSeek(e: MouseEvent) {
    const progressBar = e.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoElement.currentTime = pos * duration;
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
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  let progress = $derived(duration > 0 ? (currentTime / duration) * 100 : 0);
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
    src={videoUrl}
    class="video-element"
    ontimeupdate={handleTimeUpdate}
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
