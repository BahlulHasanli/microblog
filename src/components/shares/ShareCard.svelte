<script lang="ts">
  import { formatDistanceToNow } from "date-fns";
  import { az } from "date-fns/locale";
  import { Heart, MessageCircle } from "lucide-svelte";
  import ImageGallery from "./ImageGallery.svelte";

  interface User {
    fullname: string;
    username: string;
    avatar: string;
  }

  interface Share {
    id: string;
    user_id: string;
    content: string;
    image_urls?: string[] | null;
    image_blurhashes?: string[] | null;
    youtube_video_id?: string | null;
    created_at: string;
    updated_at: string;
    replies_count: number;
    comments_count?: number;
    user?: User;
    share_likes?: Array<{ id: string; user_id: string }>;
  }

  interface Props {
    share: Share;
    onLikeChange?: (shareId: string, isLiked: boolean) => void;
    isLast?: boolean;
    isAuthenticated?: boolean;
  }

  let { share, onLikeChange, isLast = false, isAuthenticated = false }: Props = $props();

  const user = share.user;
  let isLiked = $state(false);
  let likesCount = $state(0);
  let isLoading = $state(false);
  let currentUserId: string | null = $state(null);

  // Initialize
  $effect(() => {
    const likes = share.share_likes || [];
    likesCount = likes.length;

    const checkCurrentUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();
        if (data.success && data.user) {
          currentUserId = data.user.id;
          const userLiked = likes.some((like) => like.user_id === data.user.id);
          isLiked = userLiked;
        }
      } catch (error) {
        console.error("User məlumatı alınarkən xəta:", error);
      }
    };

    checkCurrentUser();
  });

  const createdDate = new Date(share.created_at);
  const timeAgo = formatDistanceToNow(createdDate, {
    locale: az,
    addSuffix: true,
  });

  // Parse image_urls əgər string olarsa
  let imageUrls = $state<string[]>([]);
  let imageBlurhashes = $state<(string | null)[]>([]);
  
  const normalizeImageUrl = (url: string): string => {
    // Əgər tam URL-i olarsa, olduğu kimi qaytarırıq
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // Əgər yalnız fayl adı olarsa, CDN URL-i əlavə edirik
    return `https://the99.b-cdn.net/${url}`;
  };
  
  $effect(() => {
    if (share.image_urls) {
      if (typeof share.image_urls === "string") {
        try {
          const parsed = JSON.parse(share.image_urls);
          imageUrls = Array.isArray(parsed) ? parsed.map(normalizeImageUrl) : [];
        } catch {
          imageUrls = [];
        }
      } else if (Array.isArray(share.image_urls)) {
        imageUrls = share.image_urls.map(normalizeImageUrl);
      }
    } else {
      imageUrls = [];
    }
    
    // Blurhash-ləri parse et
    if (share.image_blurhashes) {
      if (typeof share.image_blurhashes === "string") {
        try {
          const parsed = JSON.parse(share.image_blurhashes);
          imageBlurhashes = Array.isArray(parsed) ? parsed : [];
        } catch {
          imageBlurhashes = [];
        }
      } else if (Array.isArray(share.image_blurhashes)) {
        imageBlurhashes = share.image_blurhashes;
      }
    } else {
      imageBlurhashes = [];
    }
  });

  const handleLike = async () => {
    if (isLoading) return;

    isLoading = true;
    try {
      const response = await fetch("/api/shares/toggle-like", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shareId: share.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const newIsLiked = data.action === "added";
        isLiked = newIsLiked;
        likesCount = newIsLiked ? likesCount + 1 : Math.max(0, likesCount - 1);

        if (onLikeChange) {
          onLikeChange(share.id, newIsLiked);
        }
      }
    } catch (error) {
      console.error("Like xətası:", error);
    } finally {
      isLoading = false;
    }
  };
</script>

<div class={`p-4 sm:p-6 border-b border-slate-100`}>
  <div class="flex gap-3 sm:gap-4">
    <!-- Avatar -->
    <div class="shrink-0">
      <img
        src={user?.avatar}
        alt={user?.fullname}
        class="squircle w-10! sm:w-12! h-10! sm:h-12! object-cover"
      />
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <!-- Header -->
      <div class="flex items-baseline gap-2 flex-wrap">
        <a
          href={`/user/@${user?.username}`}
          class="font-semibold text-slate-900 hover:underline text-[14px]"
        >
          {user?.fullname}
        </a>
        <span class="text-slate-500 text-[13px]">
          @{user?.username}
        </span>
        <span class="text-slate-500 text-[13px]">·</span>
        <span class="text-slate-500 text-[13px]">{timeAgo}</span>
      </div>

      <!-- Share Content -->
      <p class="mt-2 text-slate-900 text-[13px] wrap-break-word whitespace-pre-wrap">
        {share.content}
      </p>

      <!-- Share Images -->
      {#if imageUrls.length > 0}
        <ImageGallery images={imageUrls} blurhashes={imageBlurhashes} />
      {/if}

      <!-- YouTube Video -->
      {#if share.youtube_video_id}
        <div class="mt-3 aspect-video bg-slate-900 rounded-lg overflow-hidden">
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${share.youtube_video_id}`}
            title="YouTube video"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>
      {/if}

      <!-- Actions -->
      <div class="mt-3 flex justify-between text-slate-500 text-sm transition-opacity">
        <a
          href={`/shares/${share.id}`}
          class="cursor-pointer flex items-center gap-2 hover:text-blue-500 transition-colors"
        >
          <MessageCircle size={16} />
          <span>{share.comments_count || 0}</span>
        </a>
        {#if isAuthenticated}
          <button
            onclick={handleLike}
            disabled={isLoading}
            class={`cursor-pointer flex items-center gap-2 transition-colors ${
              isLiked ? "text-red-500" : "hover:text-red-500"
            } disabled:opacity-50`}
          >
            <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
            <span>{likesCount}</span>
          </button>
        {:else}
          <div class="flex items-center gap-2 text-slate-400 cursor-not-allowed" title="Like etmək üçün daxil olun">
            <Heart size={16} />
            <span>{likesCount}</span>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
