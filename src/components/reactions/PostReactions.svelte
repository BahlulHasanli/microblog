<script lang="ts">
  import { onMount } from "svelte";
  import { Toaster, toast } from 'svelte-sonner'

  interface ReactionCounts {
    like: number;
    love: number;
    celebrate: number;
    insightful: number;
    curious: number;
  }

  export let postId: number;
  export let userEmail: string | undefined = undefined;

  const reactionIcons: Record<string, string> = {
    like: "/icons/like.png",
    love: "/icons/heart.png",
    celebrate: "/icons/gift.png",
    insightful: "/icons/target.png",
    curious: "/icons/trophy.png",
  };

  const reactionLabels: Record<string, string> = {
    like: "Bəyən",
    love: "Sevdim",
    celebrate: "Təbrik",
    insightful: "Faydalı",
    curious: "Maraqlı",
  };

  let counts: ReactionCounts = {
    like: 0,
    love: 0,
    celebrate: 0,
    insightful: 0,
    curious: 0,
  };
  let userReactions: string[] = [];
  let loading = false;

  // Reaction-ları yüklə
  const loadReactions = async () => {
    try {
      const params = new URLSearchParams({
        postId: postId.toString(),
      });

      if (userEmail) {
        params.append("userEmail", userEmail);
      }

      const response = await fetch(`/api/reactions/get?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        counts = data.counts;
        userReactions = data.userReactions || [];
      }
    } catch (error) {
      console.error("Reaction yükləmə xətası:", error);
    }
  };

  onMount(() => {
    loadReactions();
  });

  // Reaction toggle
  const handleReactionClick = async (reactionType: string) => {
    if (!userEmail) {
      toast.error("Reaksiya vermək üçün daxil olmalısınız");
      return;
    }

    if (loading) return;

    loading = true;

    try {
      const response = await fetch("/api/reactions/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId,
          reactionType,
          userEmail,
        }),
      });

      const data = await response.json();

      if (data.success) {
        await loadReactions();
      } else {
        console.error("Reaction toggle xətası:", data.message);
      }
    } catch (error) {
      console.error("Reaction toggle xətası:", error);
    } finally {
      loading = false;
    }
  };
</script>

<Toaster position="top-center"/>
<div class="max-w-2xl mx-auto my-8 sm:my-12 px-3 sm:px-4">
  <div class="mt-2">
    <p class="text-center mb-3 sm:mb-5 font-display font-medium text-sm sm:text-base">
      Nə düşünürsən?
    </p>
    <div class="flex flex-wrap gap-1 sm:gap-2 justify-center">
      {#each Object.entries(reactionIcons) as [type, iconPath]}
        {@const isActive = userReactions.includes(type)}
        {@const count = counts[type as keyof ReactionCounts]}
        <button
          class={`
            group relative inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-full text-xs sm:text-sm
            transition-all duration-200 font-nouvelr select-none overflow-hidden
            ${isActive ? "bg-rose-50 text-rose-600 dark:bg-rose-900/30" : "bg-zinc-50 dark:bg-zinc-800"}
            ${
              loading
                ? "opacity-40 cursor-not-allowed"
                : "cursor-pointer active:scale-95"
            }
          `}
          onclick={() => handleReactionClick(type)}
          disabled={loading}
          title={reactionLabels[type]}
          aria-label={`${reactionLabels[type]} - ${count} reaction`}
          aria-pressed={isActive}
        >
          <span
            class="reaction-icon-wrapper"
            data-active={isActive ? "true" : "false"}
          >
            <img
              src={iconPath}
              alt={reactionLabels[type]}
              class={`size-6 sm:size-11 object-contain transition-all duration-300 ${
                isActive ? "scale-110 opacity-100" : "opacity-70"
              }`}
            />
          </span>
          {#if count > 0}
            <span
              class={`text-sm sm:text-lg font-semibold tabular-nums ${
                isActive ? "text-rose-600" : "text-(--text-secondary)"
              }`}
            >
              {count}
            </span>
          {/if}
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  :global(.reaction-icon-wrapper) {
    display: inline-block;
  }

  :global(.group:hover .reaction-icon-wrapper[data-active="false"]) {
    animation: float 2s ease-in-out infinite;
  }

  :global(.group:hover .reaction-icon-wrapper[data-active="false"] img) {
    opacity: 1;
    transform: scale(1.1);
  }

  @keyframes float {
    0%,
    100% {
      transform: translateY(0px) scale(1.1);
    }
    50% {
      transform: translateY(-6px) scale(1.1);
    }
  }
</style>
