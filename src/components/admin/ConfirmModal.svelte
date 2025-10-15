<script lang="ts">
  interface Props {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: 'danger' | 'success' | 'warning' | 'primary';
    onConfirm: () => void;
    onCancel: () => void;
  }

  let { 
    isOpen = $bindable(false),
    title,
    message,
    confirmText = 'Təsdiq et',
    cancelText = 'Ləğv et',
    confirmVariant = 'primary',
    onConfirm,
    onCancel
  }: Props = $props();

  const variantClasses = {
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    success: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
    warning: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    primary: 'bg-slate-900 hover:bg-slate-800 focus:ring-slate-900'
  };

  function handleConfirm() {
    onConfirm();
    isOpen = false;
  }

  function handleCancel() {
    onCancel();
    isOpen = false;
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  }
</script>

{#if isOpen}
  <div 
    class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
    onclick={handleBackdropClick}
    onkeydown={(e) => e.key === 'Escape' && handleCancel()}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="-1"
  >
    <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all animate-in zoom-in-95 duration-200">
      <!-- Header -->
      <div class="px-6 pt-6 pb-4">
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center {
            confirmVariant === 'danger' ? 'bg-red-100' :
            confirmVariant === 'success' ? 'bg-green-100' :
            confirmVariant === 'warning' ? 'bg-yellow-100' :
            'bg-slate-100'
          }">
            {#if confirmVariant === 'danger'}
              <svg class="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            {:else if confirmVariant === 'success'}
              <svg class="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            {:else if confirmVariant === 'warning'}
              <svg class="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            {:else}
              <svg class="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            {/if}
          </div>
          <div class="flex-1 min-w-0">
            <h3 id="modal-title" class="text-lg font-semibold text-slate-900 mb-2">
              {title}
            </h3>
            <p class="text-sm text-base-600 leading-relaxed">
              {message}
            </p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 pb-6 pt-2 flex flex-col-reverse sm:flex-row gap-3">
        <button
          type="button"
          onclick={handleCancel}
          class="flex-1 px-4 py-2.5 text-sm font-medium text-base-700 bg-white border border-base-300 rounded-lg hover:bg-base-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onclick={handleConfirm}
          class="flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors {variantClasses[confirmVariant]}"
        >
          {confirmText}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes zoom-in-95 {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .animate-in {
    animation-fill-mode: both;
  }

  .fade-in {
    animation-name: fade-in;
  }

  .zoom-in-95 {
    animation-name: zoom-in-95;
  }

  .duration-200 {
    animation-duration: 200ms;
  }
</style>
