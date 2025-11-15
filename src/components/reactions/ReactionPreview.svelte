<script lang="ts">
  import { onMount } from "svelte";

  interface ReactionCounts {
    like: number;
    love: number;
    celebrate: number;
    insightful: number;
    curious: number;
  }

  export let postId: number;

  const reactionIcons: Record<string, string> = {
    like: "/icons/like.png",
    love: "/icons/heart.png",
    celebrate: "/icons/gift.png",
    insightful: "/icons/target.png",
    curious: "/icons/trophy.png",
  };

  let counts: ReactionCounts = {
    like: 0,
    love: 0,
    celebrate: 0,
    insightful: 0,
    curious: 0,
  };
  let total = 0;
  let loading = true;

  onMount(async () => {
    try {
      const response = await fetch(`/api/reactions/get?postId=${postId}`);
      const data = await response.json();

      if (data.success) {
        counts = data.counts;
        total = data.total;
      }
    } catch (error) {
      console.error("Reaction yükləmə xətası:", error);
    } finally {
      loading = false;
    }
  });

  // Ən çox olan 3 reaction-ı göstər
  $: topReactions = Object.entries(counts)
    .filter(([_, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);
</script>

{#if !loading && total > 0}
  <div class="inline-flex items-center gap-1 text-xs text-zinc-500 font-nouvelr">
    <div class="flex items-center -space-x-1">
      {#each topReactions as [type, count]}
        <img
          src={reactionIcons[type]}
          alt=""
          class="w-5 h-5 object-contain opacity-80"
          title={`${count} reaction`}
        />
      {/each}
    </div>
    <span class="font-medium text-zinc-600 tabular-nums ml-1 text-sm">
      {total}
    </span>
  </div>
{/if}
