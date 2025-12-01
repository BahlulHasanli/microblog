<script lang="ts">
  import { ChevronLeft, ChevronRight, X } from "lucide-svelte";

  interface Props {
    images: string[];
  }

  let { images }: Props = $props();

  let isOpen = $state(false);
  let currentIndex = $state(0);

  const handlePrev = () => {
    currentIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
  };

  const handleNext = () => {
    currentIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
  };

  // 4 şəkilə qədər göstər
  const displayImages = images.slice(0, 4);
  const remainingCount = images.length > 4 ? images.length - 4 : 0;

  // Grid layout hesabla
  const getGridClass = () => {
    if (displayImages.length === 1) return "grid-cols-1";
    return "grid-cols-2";
  };

  // Border radius class-ları
  const getBorderRadiusClass = (index: number) => {
    const length = displayImages.length;

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

{#if images.length > 0}
  <!-- Gallery Grid -->
  <div class={`mt-3 grid ${getGridClass()} gap-1`}>
    {#each displayImages as image, index}
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
        <img
          src={image}
          alt={`Gallery image ${index + 1}`}
          class="w-full h-44 object-cover hover:opacity-90 transition-opacity"
        />

        <!-- 4+ overlay -->
        {#if index === 3 && remainingCount > 0}
          <div class="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span class="text-white text-2xl">+{remainingCount}</span>
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
            src={images[currentIndex]}
            alt={`Full view ${currentIndex + 1}`}
            class="w-full h-auto rounded-lg"
          />

          <!-- Navigation buttons -->
          {#if images.length > 1}
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

          <!-- Image counter -->
          <div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        </div>
      </div>
    </div>
  {/if}
{/if}
