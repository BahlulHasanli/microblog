<script lang="ts">
  import { onMount } from 'svelte';
  
  export let audioUrl: string;
  export let title: string = '';
  export let artist: string = '';
  export let coverImage: string = '';

  let audio: HTMLAudioElement;
  let isPlaying = false;
  let currentTime = 0;
  let duration = 0;
  let volume = 0.8;
  let isMinimized = true;
  let isLoaded = false;
  let audioSrcLoaded = false;
  let waveformContainer: HTMLElement;
  let isMobile = false;

  onMount(() => {
    // Mobil cihaz yoxlaması
    isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  });

  async function togglePlay() {
    if (!audio) return;
    try {
      // Əgər audio src hələ təyin edilməyibsə, ilk dəfə təyin et
      if (!audioSrcLoaded) {
        audioSrcLoaded = true;
        audio.src = audioUrl;
        audio.load();
        // loadedmetadata gözlə, sonra play et
        await new Promise<void>((resolve) => {
          audio.addEventListener('loadedmetadata', () => resolve(), { once: true });
        });
      }
      if (isPlaying) {
        audio.pause();
      } else {
        await audio.play();
      }
    } catch (error) {
      console.error('Audio play xətası:', error);
    }
  }

  function handlePlay() { isPlaying = true; }
  function handlePause() { isPlaying = false; }
  function handleTimeUpdate() { currentTime = audio.currentTime; }
  function handleLoadedMetadata() { duration = audio.duration; isLoaded = true; }
  function handleCanPlay() { isLoaded = true; }
  function handleEnded() { isPlaying = false; currentTime = 0; }
  function handleVolumeUpdate() { volume = audio.volume; }

  function handleWaveformClick(e: MouseEvent) {
    if (!waveformContainer || !duration) return;
    const rect = waveformContainer.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * duration;
  }

  function handleWaveformTouch(e: TouchEvent) {
    if (!waveformContainer || !duration) return;
    const rect = waveformContainer.getBoundingClientRect();
    const touch = e.touches[0] || e.changedTouches[0];
    const percent = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    audio.currentTime = percent * duration;
  }

  function toggleExpand() {
    isMinimized = !isMinimized;
  }

  function handleVolumeChange(e: Event) {
    const target = e.target as HTMLInputElement;
    volume = parseFloat(target.value);
    audio.volume = volume;
  }

  function formatTime(seconds: number): string {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  $: progress = duration > 0 ? (currentTime / duration) * 100 : 0;
</script>

<div 
  class="fixed bottom-0 left-0 right-0 z-100"
  on:mouseenter={() => { if (!isMobile) isMinimized = false; }}
  on:mouseleave={() => { if (!isMobile) isMinimized = true; }}
  role="region"
  aria-label="Media Player"
>
  <audio
    bind:this={audio}
    on:play={handlePlay}
    on:pause={handlePause}
    on:timeupdate={handleTimeUpdate}
    on:loadedmetadata={handleLoadedMetadata}
    on:canplay={handleCanPlay}
    on:ended={handleEnded}
    on:volumechange={handleVolumeUpdate}
    preload="none"
  ></audio>

  <!-- Blur Background -->
  <div class="absolute inset-0 overflow-hidden">
    {#if coverImage}
      <img 
        src={coverImage} 
        alt="" 
        class="w-full h-[250%] object-cover blur-3xl saturate-150 opacity-50 scale-150 transition-transform duration-1000"
        class:scale-125={isPlaying}
        loading="lazy"
        decoding="async"
      />
    {/if}
    <div class="absolute inset-0 bg-black/60 backdrop-blur-2xl"></div>
  </div>

  <div class="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 py-2.5">
    <!-- Expanded View -->
    <div 
      class="grid transition-[grid-template-rows] duration-500 ease-out"
      style="grid-template-rows: {isMinimized ? '0fr' : '1fr'};"
    >
      <div class="overflow-hidden">
        <div class="flex flex-col sm:flex-row items-center gap-3 sm:gap-5 pb-2">
          <!-- Close button (mobile only) -->
          <button
            class="sm:hidden w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 active:scale-95 transition-transform cursor-pointer"
            on:click={toggleExpand}
            aria-label="Bağla"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 text-white/60">
              <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          
          <!-- Album Cover + Vinyl Disk -->
          <div class="relative h-14 shrink-0" style="width: {isPlaying ? '88px' : '56px'}; transition: width 0.5s ease-out;">
            <!-- Vinyl Disk -->
            <div 
              class="absolute top-0 w-14 h-14 transition-all duration-500 ease-out"
              class:left-8={isPlaying}
              class:left-0={!isPlaying}
              class:opacity-100={isPlaying}
              class:opacity-0={!isPlaying}
            >
              <div class="w-full h-full" class:animate-[spin_3s_linear_infinite]={isPlaying}>
                <div class="w-full h-full rounded-full bg-linear-to-br from-zinc-900 via-zinc-800 to-zinc-900 shadow-xl relative">
                  <div class="absolute inset-1 rounded-full opacity-60" style="background-image: repeating-radial-gradient(circle at center, transparent 0px, transparent 2px, rgba(255,255,255,0.08) 2px, rgba(255,255,255,0.08) 3px);"></div>
                  <div class="absolute inset-0 rounded-full bg-linear-to-br from-white/15 via-transparent to-transparent"></div>
                  <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full overflow-hidden bg-linear-to-br from-rose-500 to-pink-600 shadow">
                    {#if coverImage}
                      <img src={coverImage} alt="" class="w-full h-full object-cover" loading="lazy" decoding="async" />
                    {/if}
                  </div>
                  <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-zinc-900"></div>
                </div>
              </div>
            </div>
            <!-- Album Cover -->
            <div class="absolute top-0 left-0 z-20 w-14 h-14 overflow-hidden shadow-xl">
              {#if coverImage}
                <img src={coverImage} alt={title} class="w-full h-full object-cover" loading="lazy" decoding="async" />
              {:else}
                <div class="w-full h-full bg-linear-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-white/40">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z" />
                  </svg>
                </div>
              {/if}
            </div>
          </div>

          <!-- Track Info -->
          <div class="flex flex-col gap-0.5 min-w-0 max-w-[140px] sm:max-w-[140px] text-center sm:text-left">
            <span class="text-white font-semibold text-sm truncate">{title || 'Naməlum'}</span>
            <span class="text-white/40 text-xs truncate">{artist || 'Naməlum artist'}</span>
          </div>

          <!-- Play Button -->
          <button 
            class="w-10 h-10 rounded-full bg-rose-600 flex items-center justify-center transition-all duration-300 shrink-0 hover:scale-110 active:scale-95 disabled:opacity-50 cursor-pointer"
            aria-label="Play/Pause" 
            on:click={togglePlay} 
            disabled={audioSrcLoaded && !isLoaded}
          >
            {#if isPlaying}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 text-white">
                <path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clip-rule="evenodd" />
              </svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 text-white ml-0.5">
                <path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd" />
              </svg>
            {/if}
          </button>

          <!-- Progress Bar -->
          <div class="w-full sm:flex-1 flex items-center gap-2 sm:gap-3">
            <span class="text-white/40 text-[11px] font-medium tabular-nums min-w-[32px]">{formatTime(currentTime)}</span>
            <div 
              class="flex-1 h-2 relative cursor-pointer group"
              bind:this={waveformContainer}
              on:click={handleWaveformClick}
              on:touchstart|preventDefault={handleWaveformTouch}
              on:touchmove|preventDefault={handleWaveformTouch}
              on:keydown={(e) => {
                if (e.key === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - 5);
                if (e.key === 'ArrowRight') audio.currentTime = Math.min(duration, audio.currentTime + 5);
              }}
              role="slider"
              tabindex="0"
              aria-label="Seek"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={Math.round(progress)}
            >
              <div class="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-white/10 rounded-full group-hover:h-1.5 transition-all"></div>
              <div class="absolute top-1/2 -translate-y-1/2 h-1 bg-rose-600 rounded-full group-hover:h-1.5 transition-all" style="width: {progress}%"></div>
              <div class="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" style="left: calc({progress}% - 6px)"></div>
            </div>
            <span class="text-white/40 text-[11px] font-medium tabular-nums min-w-[32px]">{formatTime(duration)}</span>
          </div>

          <!-- Volume Control -->
          <div class="hidden sm:flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-white/40">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              on:input={handleVolumeChange}
              class="w-16 h-1 bg-white/10 rounded-full cursor-pointer accent-rose-500"
              aria-label="Volume"
            />
          </div>
        </div>
      </div>
    </div>
    
    <!-- Minimized View -->
    <div 
      class="grid transition-[grid-template-rows] duration-500 ease-out"
      style="grid-template-rows: {isMinimized ? '1fr' : '0fr'};"
    >
      <div class="overflow-hidden">
        <div class="flex items-center gap-3 sm:gap-4">
          <!-- Expand button (mobile only) -->
          <button
            class="sm:hidden w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 active:scale-95 transition-transform cursor-pointer"
            on:click={toggleExpand}
            aria-label="Genişlət"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4 text-white/60">
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
            </svg>
          </button>
          
          <!-- Mini vinyl -->
          <div class="relative w-9 h-9 rounded-full bg-linear-to-br from-zinc-900 to-zinc-800 overflow-hidden shrink-0 shadow-lg" class:animate-[spin_3s_linear_infinite]={isPlaying}>
            {#if coverImage}
              <img src={coverImage} alt={title} class="w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full object-cover" loading="lazy" decoding="async" />
            {/if}
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-zinc-900"></div>
          </div>
          
          <!-- Mini play button -->
          <button 
            class="w-8 h-8 rounded-full bg-rose-600 flex items-center justify-center shrink-0 shadow-lg hover:scale-110 active:scale-95 transition-transform disabled:opacity-50 cursor-pointer"
            aria-label="Play/Pause" 
            on:click={togglePlay} 
            disabled={audioSrcLoaded && !isLoaded}
          >
            {#if isPlaying}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3 h-3 text-white">
                <path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clip-rule="evenodd" />
              </svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3 h-3 text-white ml-0.5">
                <path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd" />
              </svg>
            {/if}
          </button>
          
          <span class="text-white text-sm font-medium truncate max-w-[100px] sm:max-w-[140px]">{title || 'Musiqi'}</span>
          
          <!-- Mini progress bar -->
          <div class="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
            <div class="h-full bg-rose-600 rounded-full transition-all duration-150" style="width: {progress}%"></div>
          </div>
          
          <span class="text-white/40 text-xs tabular-nums">{formatTime(currentTime)}</span>
        </div>
      </div>
    </div>
  </div>
</div>
