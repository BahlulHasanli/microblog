<script lang="ts">
  import { ChevronLeft, ChevronRight, X } from "lucide-svelte";
  import { decode } from "blurhash";
  import { onMount } from "svelte";

  interface ImageWithBlurhash {
    url: string;
    blurhash?: string | null;
  }

  interface Props {
    images: string[] | ImageWithBlurhash[];
    blurhashes?: (string | null)[];
  }

  let { images, blurhashes = [] }: Props = $props();

  // Normalize images to always have url and optional blurhash
  const normalizedImages = $derived(() => {
    if (images.length === 0) return [];
    
    // Check if first item is string or object
    if (typeof images[0] === 'string') {
      return (images as string[]).map((url, index) => ({
        url,
        blurhash: blurhashes[index] || null
      }));
    }
    return images as ImageWithBlurhash[];
  });

  let blurhashDataUrls = $state<Map<number, string>>(new Map());

  onMount(() => {
    const imgs = normalizedImages();
    imgs.forEach((img, index) => {
      if (img.blurhash) {
        try {
          const width = 32;
          const height = 32;
          const pixels = decode(img.blurhash, width, height);
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const imageData = ctx.createImageData(width, height);
            imageData.data.set(pixels);
            ctx.putImageData(imageData, 0, 0);
            blurhashDataUrls.set(index, canvas.toDataURL());
            blurhashDataUrls = new Map(blurhashDataUrls);
          }
        } catch (error) {
          console.error('Blurhash decode xətası:', error);
        }
      }
    });
  });

  let loadedImages = $state<Set<number>>(new Set());

  const handleImageLoad = (index: number) => {
    loadedImages.add(index);
    loadedImages = new Set(loadedImages);
  };

  let isOpen = $state(false);
  let currentIndex = $state(0);

  const handlePrev = () => {
    const imgs = normalizedImages();
    currentIndex = currentIndex === 0 ? imgs.length - 1 : currentIndex - 1;
  };

  const handleNext = () => {
    const imgs = normalizedImages();
    currentIndex = currentIndex === imgs.length - 1 ? 0 : currentIndex + 1;
  };

  // 4 şəkilə qədər göstər
  const displayImages = $derived(() => normalizedImages().slice(0, 4));
  const remainingCount = $derived(() => {
    const imgs = normalizedImages();
    return imgs.length > 4 ? imgs.length - 4 : 0;
  });

  // Grid layout hesabla
  const getGridClass = () => {
    const imgs = displayImages();
    if (imgs.length === 1) return "grid-cols-1";
    return "grid-cols-2";
  };

  // Border radius class-ları
  const getBorderRadiusClass = (index: number) => {
    const length = displayImages().length;

    if (length === 1) return "rounded-lg";
    if (length === 2) {
      return index === 0 ? "rounded-l-lg" : "rounded-r-lg";
    }
    if (length === 3) {
      if (index === 0) return "rounded-tl-lg";
      if (index === 1) return "rounded-tr-lg";
      if (index === 2) return "rounded-bl-lg rounded-br-lg";
      return "";
    }
    // 4 şəkil
    if (index === 0) return "rounded-tl-lg";
    if (index === 1) return "rounded-tr-lg";
    if (index === 2) return "rounded-bl-lg";
    return "rounded-br-lg";
  };
</script>

{#if normalizedImages().length > 0}
  <!-- Gallery Grid -->
  <div class={`mt-3 grid ${getGridClass()} gap-1`}>
    {#each displayImages() as image, index} 
      <button
        type="button"
        class={`relative cursor-pointer bg-slate-100 overflow-hidden ${getBorderRadiusClass(
          index
        )} border-0 p-0`}
        onclick={() => {
          currentIndex = index;
          isOpen = true;
        }}
      >
        {#if image.blurhash && blurhashDataUrls.get(index) && !loadedImages.has(index)}
          <img
            src={blurhashDataUrls.get(index)}
            alt=""
            class="absolute inset-0 w-full h-full object-cover"
            aria-hidden="true"
          />
        {/if}
        <img
          src={image.url}
          alt={`Gallery image ${index + 1}`}
          class={`w-full object-cover aspect-auto transition-opacity ${loadedImages.has(index) ? 'opacity-100' : 'opacity-0'}`}
          onload={() => handleImageLoad(index)}
        />

        <!-- 4+ overlay -->
        {#if index === 3 && remainingCount() > 0}
          <div class="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span class="text-white text-2xl">+{remainingCount()}</span>
          </div>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Slider Modal -->
  {#if isOpen}
    <div class="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center">
      <div class="relative w-full h-full flex items-center justify-center">
        <!-- Close button -->
        <button
          onclick={() => (isOpen = false)}
          class="cursor-pointer absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-slate-100 transition-colors z-10"
        >
          <X size={24} class="text-black" />
        </button>

        <!-- Main image -->
        <div class="relative w-full max-w-2xl px-4">
          <img
            src={normalizedImages()[currentIndex]?.url}
            alt={`Full view ${currentIndex + 1}`}
            class="w-full h-auto rounded-lg"
          />

          <!-- Navigation buttons -->
          {#if normalizedImages().length > 1}
            <button
              onclick={handlePrev}
              class="cursor-pointer absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16 p-2 bg-white rounded-full hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft size={24} class="text-black" />
            </button>

            <button
              onclick={handleNext}
              class="cursor-pointer absolute right-0 top-1/2 -translate-y-1/2 translate-x-16 p-2 bg-white rounded-full hover:bg-slate-100 transition-colors"
            >
              <ChevronRight size={24} class="text-black" />
            </button>
          {/if}

          <!-- Dots indicator -->
          {#if normalizedImages().length > 1}
            <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full">
              {#each normalizedImages() as _, index}
                <button
                  type="button"
                  onclick={() => (currentIndex = index)}
                  class={`w-2 h-2 rounded-full cursor-pointer transition-all ${
                    index === currentIndex ? 'bg-white w-6' : 'bg-white bg-opacity-50 hover:bg-opacity-75'
                  }`}
                  aria-label={`Go to image ${index + 1}`}
                ></button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
{/if}
