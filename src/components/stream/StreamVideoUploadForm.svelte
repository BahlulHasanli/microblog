<script lang="ts">
  type Category = { id: string; name: string; slug: string; sort_order: number };

  type Mode = "file" | "url";

  let categories = $state<Category[]>([]);
  let categoriesError = $state("");
  let mode = $state<Mode>("file");
  let title = $state("");
  let description = $state("");
  let categoryId = $state("");
  let file = $state<File | null>(null);
  let fileInput = $state<HTMLInputElement | null>(null);
  let playlistUrl = $state("");
  let submitting = $state(false);
  let message = $state("");
  let success = $state(false);

  async function loadCategories() {
    try {
      const r = await fetch("/api/stream-video/categories");
      const j = await r.json();
      if (j.success && Array.isArray(j.categories)) {
        categories = j.categories;
        if (categories.length > 0 && !categoryId) {
          categoryId = categories[0].id;
        }
      } else {
        categoriesError = j.message || "Kateqoriyalar yüklənmədi";
      }
    } catch {
      categoriesError = "Şəbəkə xətası";
    }
  }

  $effect(() => {
    loadCategories();
  });

  function onFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const f = input.files?.[0];
    file = f ?? null;
    message = "";
    success = false;
  }

  function setMode(m: Mode) {
    mode = m;
    message = "";
    success = false;
  }

  async function onSubmit(e: Event) {
    e.preventDefault();
    message = "";
    success = false;

    if (!title.trim()) {
      message = "Başlıq daxil edin";
      return;
    }
    if (!categoryId) {
      message = "Kateqoriya seçin";
      return;
    }

    if (mode === "file") {
      if (!file) {
        message = "Video faylı seçin";
        return;
      }
      submitting = true;
      try {
        const fd = new FormData();
        fd.set("file", file);
        fd.set("title", title.trim());
        fd.set("description", description.trim());
        fd.set("categoryId", categoryId);

        const r = await fetch("/api/stream-video/upload", {
          method: "POST",
          body: fd,
          credentials: "include",
        });
        const j = await r.json();
        if (!r.ok || !j.success) {
          message = j.message || "Yükləmə uğursuz oldu";
          return;
        }
        success = true;
        message = "Video yükləndi. Bunny encode bitəndən sonra siyahıda görünəcək.";
        title = "";
        description = "";
        file = null;
        if (fileInput) fileInput.value = "";
      } catch {
        message = "Şəbəkə xətası";
      } finally {
        submitting = false;
      }
      return;
    }

    /* HLS URL */
    if (!playlistUrl.trim()) {
      message = "HLS playlist URL daxil edin";
      return;
    }

    submitting = true;
    try {
      const r = await fetch("/api/stream-video/register-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          playlistUrl: playlistUrl.trim(),
          title: title.trim(),
          description: description.trim(),
          categoryId,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) {
        message = j.message || "Əlavə etmə uğursuz oldu";
        return;
      }
      success = true;
      message = "Video linki qeydə alındı — ana səhifə və Pəncərələrdə görünəcək.";
      title = "";
      description = "";
      playlistUrl = "";
    } catch {
      message = "Şəbəkə xətası";
    } finally {
      submitting = false;
    }
  }
</script>

<div class="mx-auto w-full max-w-lg rounded-xl border border-base-200 bg-white p-6 shadow-sm dark:border-base-800 dark:bg-base-900">
  <h1 class="text-xl font-nouvelr-semibold text-base-900 dark:text-base-50 mb-1">Video əlavə et</h1>
  <p class="text-sm text-base-500 dark:text-base-400 mb-4 font-nouvelr">
    Fayl birbaşa yükləyin və ya videonu Bunny paneldə yükləyib HLS
    <code class="text-xs bg-base-100 dark:bg-base-800 px-1 rounded">playlist.m3u8</code> linkini yapışdırın.
    Məlumat <code class="text-xs bg-base-100 dark:bg-base-800 px-1 rounded">stream_video</code> cədvəlinə yazılır.
  </p>

  <div
    class="mb-6 flex rounded-lg border border-base-200 p-1 dark:border-base-700 bg-base-50 dark:bg-base-950/80"
    role="tablist"
    aria-label="Yükləmə üsulu"
  >
    <button
      type="button"
      role="tab"
      aria-selected={mode === "file"}
      class="flex-1 rounded-md py-2 text-sm font-nouvelr-semibold transition-colors {mode === 'file'
        ? 'bg-white dark:bg-base-900 text-base-900 dark:text-base-50 shadow-sm'
        : 'text-base-500 dark:text-base-400 hover:text-base-800 dark:hover:text-base-200'}"
      onclick={() => setMode("file")}
    >
      Fayl yüklə
    </button>
    <button
      type="button"
      role="tab"
      aria-selected={mode === "url"}
      class="flex-1 rounded-md py-2 text-sm font-nouvelr-semibold transition-colors {mode === 'url'
        ? 'bg-white dark:bg-base-900 text-base-900 dark:text-base-50 shadow-sm'
        : 'text-base-500 dark:text-base-400 hover:text-base-800 dark:hover:text-base-200'}"
      onclick={() => setMode("url")}
    >
      HLS linki
    </button>
  </div>

  {#if categoriesError}
    <p class="mb-4 text-sm text-amber-700 dark:text-amber-400 font-nouvelr">{categoriesError}</p>
  {/if}

  <form class="space-y-4" onsubmit={onSubmit}>
    <div>
      <label for="sv-title" class="mb-1 block text-sm font-medium text-base-800 dark:text-base-200 font-nouvelr"
        >Başlıq</label
      >
      <input
        id="sv-title"
        type="text"
        bind:value={title}
        maxlength="200"
        class="w-full rounded-lg border border-base-200 bg-white px-3 py-2 text-sm text-base-900 focus:outline-none focus:ring-2 focus:ring-rose-500/30 dark:border-base-700 dark:bg-base-950 dark:text-base-50 font-nouvelr"
        disabled={submitting}
      />
    </div>

    <div>
      <label for="sv-desc" class="mb-1 block text-sm font-medium text-base-800 dark:text-base-200 font-nouvelr"
        >Təsvir <span class="font-normal text-base-400">(istəyə bağlı)</span></label
      >
      <textarea
        id="sv-desc"
        bind:value={description}
        maxlength="8000"
        rows="3"
        placeholder="Video haqqında qısa mətn…"
        class="w-full resize-y rounded-lg border border-base-200 bg-white px-3 py-2 text-sm text-base-900 placeholder:text-base-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 dark:border-base-700 dark:bg-base-950 dark:text-base-50 font-nouvelr"
        disabled={submitting}
      ></textarea>
    </div>

    <div>
      <label for="sv-cat" class="mb-1 block text-sm font-medium text-base-800 dark:text-base-200 font-nouvelr"
        >Kateqoriya</label
      >
      <select
        id="sv-cat"
        bind:value={categoryId}
        class="w-full rounded-lg border border-base-200 bg-white px-3 py-2 text-sm text-base-900 focus:outline-none focus:ring-2 focus:ring-rose-500/30 dark:border-base-700 dark:bg-base-950 dark:text-base-50 font-nouvelr"
        disabled={submitting || categories.length === 0}
      >
        {#each categories as c (c.id)}
          <option value={c.id}>{c.name}</option>
        {/each}
      </select>
    </div>

    {#if mode === "file"}
      <div>
        <label for="sv-file" class="mb-1 block text-sm font-medium text-base-800 dark:text-base-200 font-nouvelr"
          >Video faylı</label
        >
        <input
          id="sv-file"
          bind:this={fileInput}
          type="file"
          accept="video/*"
          class="block w-full text-sm text-base-600 file:mr-3 file:rounded-full file:border-0 file:bg-base-900 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white dark:file:bg-base-100 dark:file:text-base-900"
          disabled={submitting}
          onchange={onFileChange}
        />
        <p class="mt-1 text-xs text-base-400 font-nouvelr">
          Maks. təxmin 500 MB (hostinq / Cloudflare limiti ayrıca tətbiq oluna bilər).
        </p>
      </div>
    {:else}
      <div>
        <label for="sv-hls" class="mb-1 block text-sm font-medium text-base-800 dark:text-base-200 font-nouvelr"
          >HLS playlist URL</label
        >
        <input
          id="sv-hls"
          type="url"
          bind:value={playlistUrl}
          placeholder="https://vz-xxxx.b-cdn.net/VIDEO-GUID/playlist.m3u8"
          autocomplete="off"
          class="w-full rounded-lg border border-base-200 bg-white px-3 py-2 text-sm text-base-900 placeholder:text-base-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 dark:border-base-700 dark:bg-base-950 dark:text-base-50 font-nouvelr"
          disabled={submitting}
        />
        <p class="mt-1 text-xs text-base-400 font-nouvelr">
          Bunny-də yüklədikdən sonra video üzərindəki embed və ya CDN ünvanından
          <span class="font-medium">…/VIDEO_ID/playlist.m3u8</span> linkini kopyalayın.
        </p>
      </div>
    {/if}

    {#if message}
      <p
        class="text-sm font-nouvelr rounded-lg px-3 py-2 {success
          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
          : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200'}"
      >
        {message}
      </p>
    {/if}

    <button
      type="submit"
      disabled={submitting}
      class="w-full rounded-full bg-base-900 py-3 text-sm font-nouvelr-semibold text-white transition-opacity disabled:opacity-50 dark:bg-base-100 dark:text-base-900"
    >
      {submitting ? (mode === "file" ? "Yüklənir…" : "Yadda saxlanır…") : mode === "file" ? "Yüklə" : "Linki qeydə al"}
    </button>
  </form>
</div>
