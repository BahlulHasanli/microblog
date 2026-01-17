<script lang="ts">
  import { onMount } from "svelte";
  import { format } from "date-fns";
  import { az } from "date-fns/locale";
  import { Sparkles, Plus, Wrench, Bug } from "lucide-svelte";
  import changelogData from "@/data/changelog.json";

  interface Change {
    type: "feature" | "improvement" | "fix";
    text: string;
  }

  interface ChangelogEntry {
    version: string;
    date: string;
    title: string;
    changes: Change[];
  }

  let showModal = $state(false);
  let latestChangelog: ChangelogEntry | null = $state(null);

  const STORAGE_KEY = "lastSeenVersion";

  onMount(() => {
    // Ən son changelog-u al
    if (changelogData && changelogData.length > 0) {
      latestChangelog = changelogData[0] as ChangelogEntry;
      
      // Əgər changelog boşdursa (changes yoxdursa), modal göstərmə
      if (!latestChangelog.changes || latestChangelog.changes.length === 0) {
        return;
      }
      
      // localStorage-dan son görülən versiyanı yoxla
      const lastSeenVersion = localStorage.getItem(STORAGE_KEY);
      
      // Əgər yeni versiya varsa, köhnə localStorage məlumatını sil və modal-ı göstər
      if (!lastSeenVersion || lastSeenVersion !== latestChangelog.version) {
        // Yeni versiya olduqda köhnə localStorage-i təmizlə
        if (lastSeenVersion && lastSeenVersion !== latestChangelog.version) {
          localStorage.removeItem(STORAGE_KEY);
        }
        showModal = true;
      }
    }
  });

  const closeModal = () => {
    if (latestChangelog) {
      localStorage.setItem(STORAGE_KEY, latestChangelog.version);
    }
    showModal = false;
  };

  const handleReload = () => {
    // Səhifə yenilənməsindən əvvəl localStorage-ə yaz
    if (latestChangelog) {
      localStorage.setItem(STORAGE_KEY, latestChangelog.version);
    }
    window.location.reload();
  };

  const getChangeIcon = (type: string) => {
    switch (type) {
      case "feature":
        return Plus;
      case "improvement":
        return Wrench;
      case "fix":
        return Bug;
      default:
        return Sparkles;
    }
  };

  const getChangeColor = (type: string) => {
    switch (type) {
      case "feature":
        return "text-green-600 bg-green-50";
      case "improvement":
        return "text-blue-600 bg-blue-50";
      case "fix":
        return "text-orange-600 bg-orange-50";
      default:
        return "text-slate-600 bg-slate-50";
    }
  };

  const getChangeLabel = (type: string) => {
    switch (type) {
      case "feature":
        return "Yeni";
      case "improvement":
        return "Təkmilləşdirmə";
      case "fix":
        return "Düzəliş";
      default:
        return "";
    }
  };
</script>

{#if showModal && latestChangelog}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
  >
    <!-- Modal -->
    <div
      class="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="Changelog"
      tabindex="-1"
    >
      <!-- Header -->
      <div class="p-6 pb-4 border-b border-slate-100">
        <div class="flex items-center gap-3 mb-2">
          <div class="p-2 bg-slate-100 rounded-lg">
            <Sparkles size={20} class="text-slate-700" />
          </div>
          <div>
            <h2 class="text-xl font-nouvelr-semibold text-slate-900">{latestChangelog.title}</h2>
            <p class="text-sm text-slate-500">Versiya {latestChangelog.version}</p>
          </div>
        </div>
        
        <p class="text-xs text-slate-500 mt-2">
          {format(new Date(latestChangelog.date), "d MMMM yyyy", { locale: az })}
        </p>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
        <div class="space-y-4">
          {#each latestChangelog.changes as change}
            {@const Icon = getChangeIcon(change.type)}
            <div class="flex gap-3 items-start">
              <div class={`p-2 rounded-lg shrink-0 ${getChangeColor(change.type)}`}>
                <Icon size={16} />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class={`text-xs font-medium px-2 py-0.5 rounded-md ${getChangeColor(change.type)}`}>
                    {getChangeLabel(change.type)}
                  </span>
                </div>
                <p class="text-sm text-slate-600 leading-relaxed">{change.text}</p>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Footer -->
      <div class="p-6 pt-4 border-t border-slate-100">
        <button
          onclick={handleReload}
          class="cursor-pointer w-full px-4 py-3 bg-slate-900 text-white rounded-lg font-nouvelr-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
          </svg>
          Səhifəni yenilə
        </button>
      </div>
    </div>
  </div>
{/if}
