<script lang="ts">
  import { decode } from "blurhash";
  import { onMount } from "svelte";

  interface Props {
    src: string;
    alt: string;
    blurhash?: string | null;
    class?: string;
    width?: number;
    height?: number;
  }

  let {
    src,
    alt,
    blurhash = null,
    class: className = "",
    width = 32,
    height = 32,
  }: Props = $props();

  let isLoaded = $state(false);
  let blurhashDataUrl = $state<string | null>(null);
  let canvasRef: HTMLCanvasElement | null = null;

  onMount(() => {
    if (blurhash) {
      try {
        const pixels = decode(blurhash, width, height);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const imageData = ctx.createImageData(width, height);
          imageData.data.set(pixels);
          ctx.putImageData(imageData, 0, 0);
          blurhashDataUrl = canvas.toDataURL();
        }
      } catch (error) {
        console.error("Blurhash decode xətası:", error);
      }
    }
  });

  const handleLoad = () => {
    isLoaded = true;
  };
</script>

<div class="relative overflow-hidden {className}">
  {#if blurhash && blurhashDataUrl && !isLoaded}
    <img
      src={blurhashDataUrl}
      alt=""
      class="absolute inset-0 w-full h-full object-cover"
      aria-hidden="true"
    />
  {/if}
  <img
    {src}
    {alt}
    class="w-full h-full object-cover transition-opacity duration-300 {isLoaded ? 'opacity-100' : 'opacity-0'}"
    onload={handleLoad}
  />
</div>
