<script lang="ts">
  import { supabase } from "@/db/supabase";
  import { shareStore } from "@/stores/shareStore";
  import ShareCard from "./ShareCard.svelte";
  import { onMount } from "svelte";

  interface Share {
    id: string;
    user_id: string;
    content: string;
    image_urls?: string[] | null;
    created_at: string;
    updated_at: string;
    likes_count: number;
    replies_count: number;
    comments_count?: number;
    user?: {
      fullname: string;
      username: string;
      avatar: string;
    };
  }

  interface Props {
    refreshTrigger?: number;
  }

  let { refreshTrigger = 0 }: Props = $props();
  let storeRefreshTrigger = $state(0);

  // Store-u subscribe et
  const unsubscribe = shareStore.subscribe(value => {
    storeRefreshTrigger = value;
  });

  let shares: Share[] = $state([]);
  let isLoading = $state(true);
  let isLoadingMore = $state(false);
  let error = $state("");
  let isInitialLoad = $state(true);
  let offset = $state(0);
  let hasMore = $state(true);
  let scrollTimeoutRef: NodeJS.Timeout | null = null;

  const LIMIT = 10;

  const fetchShares = async (isLoadMore = false) => {
    if (isLoadMore) {
      isLoadingMore = true;
    } else if (isInitialLoad) {
      isLoading = true;
    }
    error = "";

    try {
      const currentOffset = isLoadMore ? offset : 0;
      const { data, error: fetchError } = await supabase
        .from("shares")
        .select("*, share_likes(id, user_id)")
        .order("created_at", { ascending: false })
        .range(currentOffset, currentOffset + LIMIT - 1);

      if (fetchError) {
        error = "Paylaşımlar yüklənərkən xəta: " + fetchError.message;
        console.error(fetchError);
        return;
      }

      // Get user data and comment count for each share
      if (data && data.length > 0) {
        const sharesWithUsers = await Promise.all(
          data.map(async (share) => {
            const { data: userData } = await supabase
              .from("users")
              .select("fullname, username, avatar")
              .eq("id", share.user_id)
              .single();

            // Fetch comment count for this share
            const { data: comments } = await supabase
              .from("share_comments")
              .select("id")
              .eq("share_id", share.id);

            return {
              ...share,
              user: userData,
              comments_count: (comments || []).length,
            };
          })
        );

        if (isLoadMore) {
          shares = [...shares, ...sharesWithUsers];
          offset = offset + LIMIT;
        } else {
          shares = sharesWithUsers;
          offset = LIMIT;
        }

        // Daha az məlumat varsa, daha çox yoxdur
        if (data.length < LIMIT) {
          hasMore = false;
        } else {
          hasMore = true;
        }
      } else {
        if (!isLoadMore) {
          shares = [];
        }
        hasMore = false;
      }
    } catch (err) {
      error = "Xəta baş verdi";
      console.error(err);
    } finally {
      if (isInitialLoad && !isLoadMore) {
        isLoading = false;
        isInitialLoad = false;
      }
      if (isLoadMore) {
        isLoadingMore = false;
      }
    }
  };

  const handleScroll = () => {
    if (scrollTimeoutRef) {
      clearTimeout(scrollTimeoutRef);
    }

    scrollTimeoutRef = setTimeout(() => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const isNearBottom = documentHeight - scrollTop - windowHeight < 500;

      if (isNearBottom && hasMore && !isLoadingMore && !isLoading) {
        fetchShares(true);
      }
    }, 150);
  };

  onMount(() => {
    fetchShares();

    window.addEventListener("scroll", handleScroll, { passive: true });

    // Real-time subscription
    const channel = supabase
      .channel("public:shares", {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "shares",
        },
        async (payload) => {
          console.log("Real-time update:", payload);
          // Yeni paylaşım əlavə olundu - birbaşa listə əlavə et
          if (payload.new) {
            const newShare = payload.new as any;
            
            // User məlumatını al
            const { data: userData } = await supabase
              .from("users")
              .select("fullname, username, avatar")
              .eq("id", newShare.user_id)
              .single();

            // Comment sayını al
            const { data: comments } = await supabase
              .from("share_comments")
              .select("id")
              .eq("share_id", newShare.id);

            // Likes sayını al
            const { data: likes } = await supabase
              .from("share_likes")
              .select("id")
              .eq("share_id", newShare.id);

            const shareWithData = {
              ...newShare,
              user: userData,
              comments_count: comments?.length || 0,
              likes_count: likes?.length || 0,
            };

            // Listənin əvvəlinə əlavə et
            shares = [shareWithData, ...shares];
          }
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef) {
        clearTimeout(scrollTimeoutRef);
      }
      supabase.removeChannel(channel);
      unsubscribe();
    };
  });

  $effect(() => {
    if (refreshTrigger || storeRefreshTrigger) {
      fetchShares();
    }
  });
</script>

{#if isLoading}
  <div class="w-full py-12 flex items-center justify-center">
    <div class="flex flex-col items-center gap-3">
      <div class="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
      <p class="text-sm text-slate-500">Paylaşımlar yüklənir...</p>
    </div>
  </div>
{:else if error}
  <div class="w-full py-8 px-4">
    <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-sm">
      <p class="font-medium mb-1">Xəta baş verdi</p>
      <p class="text-slate-500">{error}</p>
    </div>
  </div>
{:else if shares.length === 0}
  <div class="w-full py-16 flex items-center justify-center">
    <div class="text-center">
      <div class="mb-4 inline-flex p-3 rounded-xl bg-slate-50">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="size-6 text-slate-400"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
          />
        </svg>
      </div>
      <p class="text-slate-900 font-nouvelr-semibold text-base mb-1">
        Paylaşım yoxdur
      </p>
      <p class="text-slate-500 text-sm">
        Hələki paylaşım edilməyib
      </p>
    </div>
  </div>
{:else}
  <div class="w-full">
    {#each shares as share, index (share.id)}
      <ShareCard {share} isLast={index === shares.length - 1} />
    {/each}

    <!-- Loading more indicator -->
    {#if isLoadingMore}
      <div class="w-full py-4 flex items-center justify-center">
        <div class="flex flex-col items-center gap-2">
          <div class="w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
          <p class="text-xs text-slate-500">
            Daha çox paylaşım yüklənir...
          </p>
        </div>
      </div>
    {/if}

    <!-- End of list -->
    {#if !hasMore && shares.length > 0}
      <div class="w-full py-4 flex items-center justify-center">
        <p class="text-xs text-slate-400">Daha çox paylaşım yoxdur</p>
      </div>
    {/if}
  </div>
{/if}
