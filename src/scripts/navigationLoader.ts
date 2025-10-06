// Navigation loading indicator
export function initNavigationLoader() {
  let loader: HTMLElement | null = null;
  let timeoutId: number | null = null;

  // Detect mobile devices
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
    || window.innerWidth < 768;

  // Disable view transitions on mobile for better performance
  if (isMobile && 'startViewTransition' in document) {
    // Override the native startViewTransition to make it instant on mobile
    const originalStartViewTransition = (document as any).startViewTransition;
    (document as any).startViewTransition = function(callback: () => void) {
      // Just run the callback without transition on mobile
      if (callback) {
        callback();
      }
      return {
        ready: Promise.resolve(),
        finished: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
      };
    };
  }

  // Create loader element
  function createLoader() {
    if (loader) return;
    
    loader = document.createElement('div');
    loader.id = 'nav-loader';
    loader.innerHTML = `
      <div class="nav-loader-bar"></div>
    `;
    document.body.appendChild(loader);
  }

  // Show loader
  function showLoader() {
    createLoader();
    if (loader) {
      loader.classList.add('active');
    }
  }

  // Hide loader
  function hideLoader() {
    if (loader) {
      loader.classList.remove('active');
    }
  }

  // Listen to navigation events
  document.addEventListener('astro:before-preparation', () => {
    // Delay showing loader to avoid flash for fast navigations
    timeoutId = window.setTimeout(() => {
      showLoader();
    }, 100);
  });

  document.addEventListener('astro:after-swap', () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    hideLoader();
  });

  // Fallback for page load
  document.addEventListener('astro:page-load', () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    hideLoader();
  });
}

// Auto-initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavigationLoader);
} else {
  initNavigationLoader();
}

// Re-initialize on Astro page transitions
document.addEventListener('astro:page-load', initNavigationLoader);
