<script lang="ts">
  import { supabase } from '@/db/supabase';

   let { postSlug, user, parentId, onCommentAdded } = $props<{ postSlug: string; user?: any; parentId?: any; onCommentAdded?: () => void }>();

  let content = $state('');
  let guestName = $state('');
  let guestEmail = $state('');
  let isSubmitting = $state(false);
  let error = $state('');  
  let textareaRef = $state(null);


  async function handleSubmit(e: Event) { 
    e.preventDefault();
    
    if (!content.trim()) {
      error = 'Şərh daxil edin';
      textareaRef?.focus();
      return;
    }

    if (!user) {
      if (!guestName.trim()) {
        error = 'Zəhmət olmasa ad və soyadınızı daxil edin';
        return;
      }
      if (!guestEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) {
        error = 'Düzgün email ünvanı daxil edin';
        return;
      }
    }

    isSubmitting = true;
    error = '';

    try {
      const payload: any = {
        content: content.trim(),
        post_slug: postSlug,
        parent_id: parentId,
      };

      if (user) {
        payload.user_id = user.id;
        payload.user_email = user.email;
        payload.user_name = user.username || user.name;
        payload.user_fullname = user.fullname || user.name;
      } else {
        payload.user_email = guestEmail.trim();
        payload.user_fullname = guestName.trim();
        payload.user_name = guestName.trim();
      }

      const { error: supabaseError } = await supabase
        .from('comments')
        .insert(payload);

      if (supabaseError) throw supabaseError;
      
      content = '';
      guestName = '';
      guestEmail = '';
      
      // Call callback if exists
      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (err: any) {
      console.error('Error submitting comment:', err);
      error = err?.message || 'Şərhiniz göndərilmədi. Xəta baş verdi!';
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="mt-6 mb-8">
  <h3 class="text-base font-nouvelr-semibold text-base-900 dark:text-base-50 mb-3">
    {parentId ? 'Cavab ver' : 'Şərh yaz'}
  </h3>
  
  <form onsubmit={handleSubmit} class="space-y-3">
    {#if !user}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <input
            type="text"
            bind:value={guestName}
            placeholder="Ad və Soyad"
            class="w-full px-3 py-3 border border-zinc-100 dark:border-base-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 font-nouvelr text-base-800 dark:text-base-50 bg-white dark:bg-base-900"
            disabled={isSubmitting}
          />
        </div>
        <div>
          <input
            type="email"
            bind:value={guestEmail}
            placeholder="Email ünvanınız"
            class="w-full px-3 py-3 border border-zinc-100 dark:border-base-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 font-nouvelr text-base-800 dark:text-base-50 bg-white dark:bg-base-900"
            disabled={isSubmitting}
          />
        </div>
      </div>
    {/if}

    <div>
      <textarea
        bind:this={textareaRef}
        bind:value={content}
        placeholder="Nə düşünürsən?"
        class="w-full px-3 py-3 border border-zinc-100 dark:border-base-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 font-nouvelr text-base-800 dark:text-base-50 bg-white dark:bg-base-900"
        rows="3"
        disabled={isSubmitting}
      ></textarea>
      {#if error}
        <p class="mt-1 text-sm text-red-600 font-nouvelr">{error}</p>
      {/if}
    </div>
    
    <div class="flex justify-between items-center gap-3">
      {#if !user}
        <div class="text-xs text-zinc-500 dark:text-zinc-400 font-nouvelr">
          Daxil olaraq daha çox imkandan yararlana bilərsiniz. <a href="/signin" class="font-medium text-blue-500 hover:underline">Daxil ol</a>
        </div>
      {:else}
        <div></div>
      {/if}
      
      <button
        type="submit"
        disabled={isSubmitting}
        class="cursor-pointer px-5 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 text-sm font-nouvelr transition-colors whitespace-nowrap"
      >
        {isSubmitting ? 'Göndərilir...' : 'Paylaş'}
      </button>
    </div>
  </form>
</div>
