<script lang="ts">
  import { shareStore } from "@/stores/shareStore";
  import { Image, X, Play } from "lucide-svelte";
  import { generateBlurhashFromFile } from "@/utils/blurhash";

  interface ImagePreview {
    file: File;
    preview: string;
    blurhash: string | null;
  }

  interface Props {
    onShareCreated?: () => void;
  }

  let { onShareCreated }: Props = $props();

  let content = $state("");
  let isLoading = $state(false);
  let error = $state("");
  let images: ImagePreview[] = $state([]);
  let youtubeUrl = $state("");
  let showYoutubeInput = $state(false);

  const extractYoutubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  const handleYoutubeUrlChange = (url: string) => {
    youtubeUrl = url;
    error = "";
  };

  const handleAddYoutubeVideo = () => {
    if (!youtubeUrl.trim()) {
      error = "YouTube URL-i daxil edin";
      return;
    }

    const videoId = extractYoutubeVideoId(youtubeUrl);
    if (!videoId) {
      error = "Etibarsız YouTube URL-i";
      return;
    }

    youtubeUrl = "";
    showYoutubeInput = false;
  };

  const handleRemoveYoutube = () => {
    youtubeUrl = "";
  };

  const handleImageSelect = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (file.size > 5 * 1024 * 1024) {
          error = `"${file.name}" 5MB-dan kiçik olmalıdır`;
          continue;
        }

        if (!file.type.startsWith("image/")) {
          error = `"${file.name}" şəkil faylı deyil`;
          continue;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
          // Blurhash generasiya et
          const blurhash = await generateBlurhashFromFile(file);
          
          images = [
            ...images,
            {
              file,
              preview: reader.result as string,
              blurhash,
            },
          ];
        };
        reader.readAsDataURL(file);
      }

      error = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    images = images.filter((_, i) => i !== index);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    error = "";

    if (!content.trim()) {
      error = "Paylaşım boş olmalı deyil";
      return;
    }

    if (content.length > 500) {
      error = "Paylaşım 500 simvoldan çox olmalı deyil";
      return;
    }

    isLoading = true;

    try {
      // YouTube video ID-ni çıxar
      let videoId: string | null = null;
      if (youtubeUrl) {
        videoId = extractYoutubeVideoId(youtubeUrl);
        if (!videoId) {
          error = "Etibarsız YouTube URL-i";
          isLoading = false;
          return;
        }
      }

      // API endpoint-i istifadə edərək paylaşım əlavə et
      const response = await fetch("/api/shares/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content.trim(),
          imageUrls: null,
          youtubeVideoId: videoId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        error = data.message || "Paylaşım əlavə edilərkən xəta";
        isLoading = false;
        return;
      }

      const shareId = data.data[0]?.id;

      if (!shareId) {
        error = "Paylaşım ID-si alına bilmədi";
        isLoading = false;
        return;
      }

      const imageUrls: string[] = [];
      const imageBlurhashes: (string | null)[] = [];

      // Şəkillər varsa BunnyCDN-ə yüklə (post ID-si ilə)
      if (images.length > 0) {
        for (const image of images) {
          const formData = new FormData();
          formData.append("file", image.file);
          formData.append("shareId", shareId);
          if (image.blurhash) {
            formData.append("blurhash", image.blurhash);
          }

          const uploadResponse = await fetch("/api/upload/share-image", {
            method: "POST",
            body: formData,
          });

          const uploadData = await uploadResponse.json();

          if (!uploadResponse.ok || !uploadData.success) {
            error = uploadData.message || "Şəkil yüklənərkən xəta";
            isLoading = false;
            return;
          }

          imageUrls.push(uploadData.imageUrl);
          imageBlurhashes.push(uploadData.blurhash || image.blurhash);
        }

        // Şəkilləri Supabase-ə yenilə
        const updateResponse = await fetch("/api/shares/update-images", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            shareId,
            imageUrls,
            imageBlurhashes,
          }),
        });

        const updateData = await updateResponse.json();

        if (!updateResponse.ok || !updateData.success) {
          error = updateData.message || "Şəkillər yenilənərkən xəta";
          isLoading = false;
          return;
        }
      }

      content = "";
      images = [];
      youtubeUrl = "";
      showYoutubeInput = false;

      // Refresh timeline
      shareStore.triggerRefresh();
      if (onShareCreated) {
        onShareCreated();
      }
    } catch (err) {
      error = "Xəta baş verdi";
      console.error(err);
    } finally {
      isLoading = false;
    }
  };
</script>

<div class="w-full border-b border-slate-100 dark:border-base-800 p-3 sm:p-4 transition-colors">
  <form onsubmit={handleSubmit} class="space-y-3">
    <textarea
      bind:value={content}
      placeholder="Nə düşünürsən?"
      maxlength={500}
      disabled={isLoading}
      class="w-full p-2 sm:p-3 text-sm border border-slate-200 dark:border-base-800 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-base-50 disabled:opacity-50 text-base-900 dark:text-base-50 bg-white dark:bg-base-950 placeholder:text-slate-400 dark:placeholder:text-base-500 transition-colors"
      rows={2}
    ></textarea>
    {#if images.length > 0}
      <div class="grid grid-cols-3 gap-2">
        {#each images as image, index}
          <div class="relative inline-block">
            <img
              src={image.preview}
              alt={`Preview ${index + 1}`}
              class="max-h-32 w-full object-cover rounded-lg border border-slate-200 dark:border-base-800"
            />
            <button
              type="button"
              onclick={() => handleRemoveImage(index)}
              class="absolute top-1 right-1 p-1 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-colors"
            >
              <X size={14} class="cursor-pointer" /> 
            </button>
          </div>
        {/each}
      </div>
    {/if}
    {#if youtubeUrl}
      <div class="relative w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-900">
        <button
          type="button"
          onclick={handleRemoveYoutube}
          class="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full transition-colors z-10"
          title="Videoyu sil"
        >
          <X size={16} class="text-white" />
        </button>
        <div class="aspect-video">
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${extractYoutubeVideoId(youtubeUrl)}`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>
      </div>
    {/if}

    {#if showYoutubeInput && !youtubeUrl}
      <div class="bg-slate-50 dark:bg-base-800/50 rounded-lg p-3 border border-slate-200 dark:border-base-800 transition-colors">
        <div class="flex items-center gap-2 mb-2">
          <Play size={14} class="text-rose-600 dark:text-rose-500" />
          <span class="text-xs font-medium text-slate-600 dark:text-base-400">
            YouTube Video
          </span>
        </div>
        <div class="flex gap-2">
          <input
            type="text"
            placeholder="youtu.be/... yaxud youtube.com/watch?v=..."
            bind:value={youtubeUrl}
            onchange={(e) => handleYoutubeUrlChange((e.target as HTMLInputElement).value)}
            class="flex-1 p-2 text-sm border border-slate-300 dark:border-base-700 rounded bg-white dark:bg-base-900 text-base-900 dark:text-base-50 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 placeholder:text-slate-400 dark:placeholder:text-base-500 transition-colors"
            disabled={isLoading}
            autofocus
          />
          <button
            type="button"
            onclick={handleAddYoutubeVideo}
            disabled={isLoading || !youtubeUrl.trim()}
            class="cursor-pointer px-3 py-2 text-xs bg-rose-600 dark:bg-rose-500 text-white rounded font-medium hover:bg-rose-700 dark:hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Əlavə et
          </button>
          <button
            type="button"
            onclick={() => {
              showYoutubeInput = false;
              youtubeUrl = "";
            }}
            disabled={isLoading}
            class="cursor-pointer px-3 py-2 text-xs bg-white dark:bg-base-900 text-slate-600 dark:text-base-300 border border-slate-300 dark:border-base-700 rounded font-medium hover:bg-slate-100 dark:hover:bg-base-800 disabled:opacity-50 transition-colors"
          >
            Ləğv et
          </button>
        </div>
      </div>
    {/if}

    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <label class="cursor-pointer p-1.5 hover:bg-slate-100 dark:hover:bg-base-800 rounded-lg transition-colors">
          <Image size={16} class="text-slate-600 dark:text-base-400" />
          <input
            type="file"
            accept="image/*"
            multiple
            onchange={handleImageSelect}
            disabled={isLoading}
            class="hidden"
          />
        </label>

        <button
          type="button"
          onclick={() => (showYoutubeInput = !showYoutubeInput)}
          disabled={isLoading || !!youtubeUrl}
          class="cursor-pointer p-1.5 hover:bg-slate-100 dark:hover:bg-base-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="YouTube video əlavə et"
        >
          <Play size={16} class="text-rose-600 dark:text-rose-500" />
        </button>
      </div>
      <div class="flex items-center gap-4">
        {#if content.length > 0}
          <div class="relative w-8 h-8 flex items-center justify-center">
            <svg
              class="w-8 h-8 transform -rotate-90"
              viewBox="0 0 32 32"
            >
              <!-- Background circle -->
              <circle
                cx="16"
                cy="16"
                r="14"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="text-slate-200 dark:text-base-800"
              />
              <!-- Progress circle -->
              <circle
                cx="16"
                cy="16"
                r="14"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-dasharray={`${(content.length / 500) * 88} 88`}
                class={`transition-all duration-300 ${
                  content.length > 450
                    ? "text-rose-500 dark:text-rose-400"
                    : content.length > 400
                      ? "text-amber-500 dark:text-amber-400"
                      : "text-slate-900 dark:text-base-400"
                }`}
              />
            </svg>
            <span class="absolute text-xs font-medium text-slate-600"></span>
          </div>
        {/if}
        <button
          type="submit"
          disabled={isLoading || !content.trim()}
          class="cursor-pointer px-3 sm:px-4 py-1.5 text-sm bg-slate-900 dark:bg-base-50 text-white dark:text-base-900 rounded-lg font-medium hover:bg-slate-800 dark:hover:bg-base-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {#if isLoading}
            Göndərilir...
          {:else}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="size-5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
              />
            </svg>
          {/if}
        </button>
      </div>
    </div>
    {#if error}
      <div class="p-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-lg text-rose-700 dark:text-rose-400 text-xs mt-3">
        {error}
      </div>
    {/if}
  </form>
</div>
