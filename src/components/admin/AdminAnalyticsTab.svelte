<script lang="ts">
  import { onMount, tick } from "svelte";
  import { createRoot } from "react-dom/client";
  import { createElement } from "react";
  import WriterAnalyticsTabs from "../writer/WriterAnalyticsTabs";
  import type {
    AdminAnalyticsAuthorRow,
    AdminAnalyticsOverview,
  } from "@/lib/build-writer-analytics-data";
  import type { WriterAnalyticsData } from "../writer/WriterAnalyticsTabs";

  type ListStatus = "loading" | "error" | "ready";
  type DetailStatus = "idle" | "loading" | "error" | "ready";

  let listStatus = $state<ListStatus>("loading");
  let detailStatus = $state<DetailStatus>("idle");
  let listErr = $state("");
  let detailErr = $state("");
  let overview = $state<AdminAnalyticsOverview | null>(null);

  let view = $state<"list" | "detail">("list");
  let selectedAuthor = $state<{ id: string; label: string } | null>(null);

  let detailHost: HTMLDivElement | undefined = $state();
  let detailRoot: ReturnType<typeof createRoot> | undefined;

  function unmountDetail() {
    detailRoot?.unmount();
    detailRoot = undefined;
  }

  async function loadOverview() {
    listStatus = "loading";
    listErr = "";
    try {
      const res = await fetch("/api/admin/site-analytics");
      if (res.status === 401 || res.status === 403) {
        listStatus = "error";
        listErr =
          res.status === 403
            ? "Bu bölməyə yalnız admin girə bilər."
            : "Giriş tələb olunur.";
        return;
      }
      if (!res.ok) {
        listStatus = "error";
        listErr = "Məlumat alına bilmədi.";
        return;
      }
      overview = (await res.json()) as AdminAnalyticsOverview;
      listStatus = "ready";
    } catch {
      listStatus = "error";
      listErr = "Şəbəkə xətası.";
    }
  }

  async function openAuthor(row: AdminAnalyticsAuthorRow) {
    unmountDetail();
    view = "detail";
    selectedAuthor = { id: row.authorId, label: row.label };
    detailStatus = "loading";
    detailErr = "";
    await tick();
    try {
      const res = await fetch(
        `/api/admin/author-analytics?authorId=${encodeURIComponent(row.authorId)}`,
      );
      if (!res.ok) {
        detailStatus = "error";
        detailErr =
          res.status === 403
            ? "İcazə yoxdur."
            : "Müəllif məlumatı alına bilmədi.";
        return;
      }
      const data = (await res.json()) as WriterAnalyticsData;
      await tick();
      if (!detailHost) {
        detailStatus = "error";
        detailErr = "Komponent yüklənmədi.";
        return;
      }
      detailRoot = createRoot(detailHost);
      detailRoot.render(
        createElement(WriterAnalyticsTabs, {
          data,
          appearance: "admin",
        }),
      );
      detailStatus = "ready";
    } catch {
      detailStatus = "error";
      detailErr = "Şəbəkə xətası.";
    }
  }

  function goBack() {
    unmountDetail();
    view = "list";
    selectedAuthor = null;
    detailStatus = "idle";
    detailErr = "";
  }

  function rowKeyDown(e: KeyboardEvent, row: AdminAnalyticsAuthorRow) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      void openAuthor(row);
    }
  }

  onMount(() => {
    void loadOverview();
    return () => {
      unmountDetail();
    };
  });
</script>

<div class="p-4 lg:p-6">
  {#if view === "list"}
    {#if listStatus === "loading"}
      <div class="flex items-center justify-center py-16">
        <div class="flex flex-col items-center gap-3">
          <div
            class="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin dark:border-slate-100 dark:border-t-transparent"
          ></div>
          <p class="text-sm text-base-600">Yüklənir...</p>
        </div>
      </div>
    {:else if listStatus === "error"}
      <p class="text-base text-red-600 dark:text-red-400 py-6">{listErr}</p>
    {:else if overview}
      <div class="mb-6 sm:mb-8">
        <h2 class="text-lg font-semibold text-slate-900 dark:text-base-50">
          Sayt analitikası
        </h2>
        <p class="mt-1 text-sm text-base-600 dark:text-base-400 max-w-2xl">
          Ümumi göstəricilər və müəlliflər üzrə xülasə. Detallı statistika üçün
          sətirə klikləyin.
        </p>
      </div>

      <div
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8"
      >
        <div
          class="rounded-lg border border-base-200 bg-base-50 dark:bg-base-900/40 px-4 py-4"
        >
          <p
            class="text-xs font-medium text-base-600 dark:text-base-400 uppercase tracking-wide"
          >
            Məqalə
          </p>
          <p
            class="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-base-50"
          >
            {overview.totals.totalPosts.toLocaleString("az-AZ")}
          </p>
        </div>
        <div
          class="rounded-lg border border-base-200 bg-base-50 dark:bg-base-900/40 px-4 py-4"
        >
          <p
            class="text-xs font-medium text-base-600 dark:text-base-400 uppercase tracking-wide"
          >
            Ümumi baxış
          </p>
          <p
            class="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-base-50"
          >
            {overview.totals.totalViews.toLocaleString("az-AZ")}
          </p>
        </div>
        <div
          class="rounded-lg border border-base-200 bg-base-50 dark:bg-base-900/40 px-4 py-4"
        >
          <p
            class="text-xs font-medium text-base-600 dark:text-base-400 uppercase tracking-wide"
          >
            Ümumi şərh
          </p>
          <p
            class="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-base-50"
          >
            {overview.totals.totalComments.toLocaleString("az-AZ")}
          </p>
        </div>
        <div
          class="rounded-lg border border-base-200 bg-base-50 dark:bg-base-900/40 px-4 py-4"
        >
          <p
            class="text-xs font-medium text-base-600 dark:text-base-400 uppercase tracking-wide"
          >
            Aktiv müəllif
          </p>
          <p
            class="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-base-50"
          >
            {overview.totals.authorWithPostsCount.toLocaleString("az-AZ")}
          </p>
        </div>
      </div>

      {#if overview.authors.length === 0}
        <div
          class="flex flex-col items-center justify-center py-16 text-base-500"
        >
          <p class="font-medium">Müəllif üzrə məqalə tapılmadı.</p>
        </div>
      {:else}
        <div class="overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8">
          <div class="inline-block min-w-full align-middle">
            <table class="min-w-full divide-y divide-base-200">
              <thead class="bg-base-50">
                <tr>
                  <th
                    class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-base-600 uppercase tracking-wide"
                  >
                    Müəllif
                  </th>
                  <th
                    class="px-4 sm:px-6 py-3 text-right text-xs font-medium text-base-600 uppercase tracking-wide tabular-nums"
                  >
                    Məqalə
                  </th>
                  <th
                    class="px-4 sm:px-6 py-3 text-right text-xs font-medium text-base-600 uppercase tracking-wide tabular-nums"
                  >
                    Baxış
                  </th>
                  <th
                    class="px-4 sm:px-6 py-3 text-right text-xs font-medium text-base-600 uppercase tracking-wide tabular-nums"
                  >
                    Şərh
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-base-100">
                {#each overview.authors as row (row.authorId)}
                  <tr
                    class="hover:bg-base-50 transition-all duration-200 cursor-pointer"
                    onclick={() => openAuthor(row)}
                    onkeydown={(e) => rowKeyDown(e, row)}
                    role="button"
                    tabindex="0"
                  >
                    <td class="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <span class="text-sm font-medium text-slate-900"
                        >{row.label}</span
                      >
                    </td>
                    <td
                      class="px-4 sm:px-6 py-4 text-right tabular-nums text-sm text-base-700"
                    >
                      {row.postCount.toLocaleString("az-AZ")}
                    </td>
                    <td
                      class="px-4 sm:px-6 py-4 text-right tabular-nums text-sm text-base-700"
                    >
                      {row.viewCount.toLocaleString("az-AZ")}
                    </td>
                    <td
                      class="px-4 sm:px-6 py-4 text-right tabular-nums text-sm text-base-700"
                    >
                      {row.commentCount.toLocaleString("az-AZ")}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}
    {/if}
  {:else if view === "detail" && selectedAuthor}
    <div
      class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
        <button
          type="button"
          onclick={goBack}
          class="cursor-pointer inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium bg-base-100 hover:bg-base-200 dark:bg-base-800 dark:hover:bg-base-700 text-slate-900 dark:text-base-50 border border-base-200 dark:border-base-700 w-fit shrink-0"
        >
          ← Müəlliflər
        </button>
        <div class="min-w-0">
          <p
            class="text-xs text-base-500 dark:text-base-400 uppercase tracking-wide"
          >
            Müəllif analitikası
          </p>
          <p
            class="text-lg font-semibold text-slate-900 dark:text-base-50 truncate"
          >
            {selectedAuthor.label}
          </p>
        </div>
      </div>
    </div>

    {#if detailStatus === "loading"}
      <div class="flex items-center gap-3 py-8">
        <div
          class="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin dark:border-slate-100 dark:border-t-transparent"
        ></div>
        <p class="text-sm text-base-600">Detal yüklənir…</p>
      </div>
    {:else if detailStatus === "error"}
      <p class="text-base text-red-600 dark:text-red-400 py-6">{detailErr}</p>
    {/if}

    <div bind:this={detailHost} class="min-h-[120px]"></div>
  {/if}
</div>
