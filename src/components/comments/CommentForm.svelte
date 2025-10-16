<script lang="ts">
  import { supabase } from '@/db/supabase';

   let { postSlug, user, parentId, onCommentAdded } = $props<{ postSlug: string; user: any; parentId?: any; onCommentAdded?: () => void }>();

  let content = $state('');
  let isSubmitting = $state(false);
  let error = $state('');  
  let textareaRef = $state(null);


  async function handleSubmit(e: Event) { 
    e.preventDefault();
    
    if (!content.trim()) {
      textareaRef?.focus();

      return;
    }

    if (!user) {
      error = 'Şərh bildirmək üçün daxil olmalısınız';
      return;
    }

    isSubmitting = true;
    error = '';

    try {
      const { error: supabaseError } = await supabase
        .from('comments')
        .insert({
          content: content.trim(),
          user_id: user.id,
          post_slug: postSlug,
          parent_id: parentId,
          user_email: user.email,
          user_name: user.name,
          user_fullname: user.fullname || user.name
        });

      if (supabaseError) throw supabaseError;
      
      content = '';
      
      // Call callback if exists
      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (err) {
      console.error('Error submitting comment:', err);
      error = 'Şərhiniz göndərilmədi. Xəta baş verdi!';
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="mt-6 mb-8">
  <h3 class="text-base font-nouvelr-semibold text-base-900 mb-3">
    {parentId ? 'Cavab ver' : 'Şərh yaz'}
  </h3>
  
  {#if !user}
    <div class="p-3 mb-4 border border-zinc-100 text-zinc-600 rounded-md">
      Şərh yazmaq üçün <a href="/signin" class="font-medium text-blue-500 hover:underline">daxil olun</a>
    </div>
  {/if}
  
  {#if user}
    <form onsubmit={handleSubmit} class="space-y-3">
      <div>
        <textarea
          bind:this={textareaRef}
          bind:value={content}
          placeholder="Nə düşünürsən?"
          class="w-full px-3 py-3 border border-zinc-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 font-nouvelr text-base-800"
          rows="3"
          disabled={isSubmitting}
        ></textarea>
        {#if error}
          <p class="mt-1 text-sm text-red-600 font-nouvelr">{error}</p>
        {/if}
      </div>
      
      <div class="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          class="cursor-pointer px-5 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 text-sm font-nouvelr transition-colors"
        >
          {isSubmitting ? 'Göndərilir...' : 'Paylaş'}
        </button>
      </div>
    </form>
  {/if}
</div>
