<script lang="ts">
  import ShareEditor from "./ShareEditor.svelte";
  import ShareTimeline from "./ShareTimeline.svelte";
</script>

<div class="max-w-3xl h-full mx-auto border border-slate-100 rounded-lg overflow-hidden flex flex-col">
  <ShareEditor />
  <div class="flex-1">
    <ShareTimeline />
  </div>
</div>
