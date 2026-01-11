<script lang="ts">
  import { onMount } from 'svelte';

  let { hasMediaPlayer = false } = $props<{ hasMediaPlayer?: boolean }>();
  
  let isVisible = $state(true)

  function scrollToComments() {
    const commentsSection = document.getElementById('comments-section');
    if (commentsSection) {
      commentsSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function handleScroll() {
    const commentsSection = document.getElementById('comments-section');
    if (!commentsSection) return;

    const commentsSectionRect = commentsSection.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    
    if (commentsSectionRect.top < windowHeight * 0.3 && commentsSectionRect.bottom > 0) {
      isVisible = false;
    } else {
      isVisible = true;
    }
  }

  onMount(() => {
    // Initial check
    handleScroll();

    // Add scroll event listener 
    window.addEventListener('scroll', handleScroll); 
    
    // Cleanup
      return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  });
</script> 

{#if isVisible} 
  <button
    onclick={scrollToComments}
    class="fixed cursor-pointer right-6 w-12 h-12 bg-base-800 text-white rounded-full flex items-center justify-center hover:bg-base-900 focus:outline-none z-50 transition-all duration-300"
    class:bottom-6={!hasMediaPlayer}
    class:bottom-20={hasMediaPlayer}
    aria-label="Yorumlara git"
  >
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
    <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
  </svg>
  
  </button>
{/if}
