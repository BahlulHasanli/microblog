<script lang="ts">
  import { onMount } from 'svelte';
  import CommentList from './CommentList.svelte';

  let { postSlug } = $props(); 

  let user: {
    id: string;
    email: string;
    name: string;
    fullname?: string;
  } | null = $state(null);

  onMount(async () => {
    // Check if user is logged in
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        if (userData && userData.user) {
          user = {
            id: userData.user.id,
            email: userData.user.email,
            name: userData.user.name || userData.user.email.split('@')[0],
            fullname: userData.user.fullname || userData.user.name || userData.user.email.split('@')[0]
          };
        }
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
    }
  });
</script>

<div id="comments-section" class="max-w-2xl mx-auto mt-12 px-4">
  <div class="border-t border-zinc-100 pt-6">
    <CommentList {postSlug} {user} />
  </div>
</div>
