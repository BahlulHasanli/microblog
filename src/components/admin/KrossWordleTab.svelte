<script lang="ts">
  import { onMount } from 'svelte';
  import { confirmDialog } from '@/dialogs';

  const GRID_SIZE = 7;
  const WEEKDAYS = ['B.e.', 'Ç.a.', 'Ç.', 'C.a.', 'C.', 'Ş.', 'B.'];
  const MONTH_NAMES = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];

  interface WordEntry {
    id: string;
    word: string;
    x: number;
    y: number;
    direction: 'H' | 'V';
    clue: string;
  }

  interface LevelData {
    id?: number;
    level_number: number;
    words: WordEntry[];
    is_active: boolean;
    play_date: string;
  }

  // State
  let levels: LevelData[] = $state([]);
  let isLoading = $state(true);
  let isSaving = $state(false);
  let message = $state('');
  let messageType: 'success' | 'error' = $state('success');

  // Təqvim state
  let currentYear = $state(new Date().getFullYear());
  let currentMonth = $state(new Date().getMonth()); // 0-based
  const today = new Date().toISOString().split('T')[0];

  // Editor state
  let editingLevel: LevelData | null = $state(null);
  let showEditor = $state(false);
  let editingDate = $state('');

  // Söz formu
  let newWord = $state('');
  let newClue = $state('');
  let newX = $state(0);
  let newY = $state(0);
  let newDirection: 'H' | 'V' = $state('H');
  let editingWordIdx: number = $state(-1);

  // AI generasiya
  let isGenerating = $state(false);
  let aiWordCount = $state(4);
  let aiTheme = $state('');

  // Toplu AI generasiya
  let isBulkGenerating = $state(false);
  let bulkProgress = $state(0);
  let bulkTotal = $state(0);

  // Seçili söz
  let selectedWordIdx: number | null = $state(null);

  // Təqvim hesablaması
  const daysInMonth = $derived(new Date(currentYear, currentMonth + 1, 0).getDate());
  const firstDayOfWeek = $derived((new Date(currentYear, currentMonth, 1).getDay() + 6) % 7); // Monday=0
  const monthKey = $derived(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`);

  // Level-ləri tarixə görə map
  const levelsByDate = $derived.by(() => {
    const map = new Map<string, LevelData>();
    levels.forEach(l => {
      if (l.play_date) map.set(l.play_date, l);
    });
    return map;
  });

  // Boş günlərin sayı (ümumi)
  const emptyDaysCount = $derived.by(() => {
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${monthKey}-${String(d).padStart(2, '0')}`;
      if (!levelsByDate.has(dateStr)) count++;
    }
    return count;
  });

  // Gələcək boş günlərin sayı (bu gündən etibarən)
  const futureEmptyDaysCount = $derived.by(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${monthKey}-${String(d).padStart(2, '0')}`;
      if (dateStr < todayStr) continue;
      if (!levelsByDate.has(dateStr)) count++;
    }
    return count;
  });

  // Grid hesablaması
  const grid = $derived.by(() => {
    if (!editingLevel) return [];
    const g: (string | null)[][] = Array.from({ length: GRID_SIZE }, () =>
      Array.from({ length: GRID_SIZE }, () => null)
    );
    editingLevel.words.forEach((wp) => {
      for (let i = 0; i < wp.word.length; i++) {
        const nx = wp.direction === 'H' ? wp.x + i : wp.x;
        const ny = wp.direction === 'V' ? wp.y + i : wp.y;
        if (nx < GRID_SIZE && ny < GRID_SIZE) {
          g[ny][nx] = wp.word[i].toUpperCase();
        }
      }
    });
    return g;
  });

  // Preview xanaları
  const previewCells = $derived.by(() => {
    if (!newWord.trim()) return new Map<string, string>();
    const word = newWord.trim().toUpperCase();
    const cells = new Map<string, string>();
    for (let i = 0; i < word.length; i++) {
      const nx = newDirection === 'H' ? newX + i : newX;
      const ny = newDirection === 'V' ? newY + i : newY;
      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
        cells.set(`${nx}-${ny}`, word[i]);
      }
    }
    return cells;
  });

  const previewOutOfBounds = $derived.by(() => {
    if (!newWord.trim()) return false;
    const word = newWord.trim();
    const endX = newDirection === 'H' ? newX + word.length - 1 : newX;
    const endY = newDirection === 'V' ? newY + word.length - 1 : newY;
    return endX >= GRID_SIZE || endY >= GRID_SIZE || newX < 0 || newY < 0;
  });

  // Seçili söz xanaları
  const selectedCells = $derived.by(() => {
    if (selectedWordIdx === null || !editingLevel) return new Set<string>();
    const wp = editingLevel.words[selectedWordIdx];
    if (!wp) return new Set<string>();
    const cells = new Set<string>();
    for (let i = 0; i < wp.word.length; i++) {
      const nx = wp.direction === 'H' ? wp.x + i : wp.x;
      const ny = wp.direction === 'V' ? wp.y + i : wp.y;
      cells.add(`${nx}-${ny}`);
    }
    return cells;
  });

  // Conflict yoxlanışı
  const conflicts = $derived.by(() => {
    if (!editingLevel) return new Set<string>();
    const cellMap = new Map<string, { letter: string; wordIdx: number }[]>();
    const conflictCells = new Set<string>();
    editingLevel.words.forEach((wp, idx) => {
      for (let i = 0; i < wp.word.length; i++) {
        const nx = wp.direction === 'H' ? wp.x + i : wp.x;
        const ny = wp.direction === 'V' ? wp.y + i : wp.y;
        const key = `${nx}-${ny}`;
        if (!cellMap.has(key)) cellMap.set(key, []);
        cellMap.get(key)!.push({ letter: wp.word[i].toUpperCase(), wordIdx: idx });
      }
    });
    cellMap.forEach((entries, key) => {
      if (entries.length > 1) {
        const letters = new Set(entries.map(e => e.letter));
        if (letters.size > 1) conflictCells.add(key);
      }
    });
    return conflictCells;
  });

  // Out-of-bounds
  const outOfBounds = $derived.by(() => {
    if (!editingLevel) return new Set<number>();
    const oob = new Set<number>();
    editingLevel.words.forEach((wp, idx) => {
      const endX = wp.direction === 'H' ? wp.x + wp.word.length - 1 : wp.x;
      const endY = wp.direction === 'V' ? wp.y + wp.word.length - 1 : wp.y;
      if (endX >= GRID_SIZE || endY >= GRID_SIZE || wp.x < 0 || wp.y < 0) oob.add(idx);
    });
    return oob;
  });

  onMount(() => { loadLevels(); });

  // Ay dəyişəndə yenidən yüklə
  $effect(() => {
    monthKey; // reactive dependency
    loadLevels();
  });

  async function loadLevels() {
    isLoading = true;
    try {
      const response = await fetch(`/api/krosswordle/levels?admin=true&month=${monthKey}`);
      const data = await response.json();
      if (data.levels) levels = data.levels;
    } catch (error) {
      console.error('Levels yüklənərkən xəta:', error);
      showMessage('Levels yüklənmədi', 'error');
    }
    isLoading = false;
  }

  function showMessage(msg: string, type: 'success' | 'error') {
    message = msg;
    messageType = type;
    setTimeout(() => { message = ''; }, 4000);
  }

  function openDayEditor(day: number) {
    const dateStr = `${monthKey}-${String(day).padStart(2, '0')}`;
    editingDate = dateStr;
    const existing = levelsByDate.get(dateStr);
    if (existing) {
      editingLevel = JSON.parse(JSON.stringify(existing));
    } else {
      editingLevel = {
        level_number: day,
        words: [],
        is_active: true,
        play_date: dateStr,
      };
    }
    showEditor = true;
    selectedWordIdx = null;
    resetWordForm();
  }

  function closeEditor() {
    showEditor = false;
    editingLevel = null;
    editingDate = '';
    resetWordForm();
  }

  function resetWordForm() {
    newWord = '';
    newClue = '';
    newX = 0;
    newY = 0;
    newDirection = 'H';
    editingWordIdx = -1;
  }

  function editWord(idx: number) {
    if (!editingLevel) return;
    const wp = editingLevel.words[idx];
    if (!wp) return;
    newWord = wp.word;
    newClue = wp.clue;
    newX = wp.x;
    newY = wp.y;
    newDirection = wp.direction;
    editingWordIdx = idx;
    selectedWordIdx = idx;
  }

  function updateWord() {
    if (!editingLevel || editingWordIdx < 0 || !newWord.trim() || !newClue.trim()) return;
    const word = newWord.trim().toUpperCase();
    editingLevel.words = editingLevel.words.map((w, i) => {
      if (i === editingWordIdx) {
        return { ...w, word, x: newX, y: newY, direction: newDirection, clue: newClue.trim() };
      }
      return w;
    });
    resetWordForm();
  }

  function cancelEdit() {
    resetWordForm();
    selectedWordIdx = null;
  }

  function addWord() {
    if (!editingLevel || !newWord.trim() || !newClue.trim()) return;
    const word = newWord.trim().toUpperCase();
    const id = String(editingLevel.words.length + 1);
    editingLevel.words = [
      ...editingLevel.words,
      { id, word, x: newX, y: newY, direction: newDirection, clue: newClue.trim() },
    ];
    resetWordForm();
  }

  function removeWord(idx: number) {
    if (!editingLevel) return;
    editingLevel.words = editingLevel.words.filter((_, i) => i !== idx).map((w, i) => ({
      ...w, id: String(i + 1),
    }));
    if (selectedWordIdx === idx) selectedWordIdx = null;
    if (editingWordIdx === idx) resetWordForm();
  }

  async function saveLevel() {
    if (!editingLevel) return;
    if (editingLevel.words.length === 0) { showMessage('Ən azı 1 söz əlavə edin', 'error'); return; }
    if (conflicts.size > 0) { showMessage('Kəsişmə konfliktlərini həll edin', 'error'); return; }
    if (outOfBounds.size > 0) { showMessage('Bəzi sözlər grid-dən kənardadır', 'error'); return; }

    isSaving = true;
    try {
      const response = await fetch('/api/krosswordle/levels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingLevel.id,
          levelNumber: editingLevel.level_number,
          words: editingLevel.words,
          isActive: editingLevel.is_active,
          playDate: editingLevel.play_date,
        }),
      });
      const data = await response.json();
      if (data.success) {
        showMessage(`${editingDate} tarixinə level saxlanıldı!`, 'success');
        closeEditor();
        await loadLevels();
      } else {
        showMessage(data.error || 'Xəta baş verdi', 'error');
      }
    } catch (error) {
      showMessage('Server xətası', 'error');
    }
    isSaving = false;
  }

  async function deleteLevel(level: LevelData) {
    if (!level.id) return;
    const ok = await confirmDialog({
      title: 'Level silinsin?',
      message: `${level.play_date} tarixindəki level silinsin?`,
      confirmLabel: 'Sil',
      cancelLabel: 'Ləğv et',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      const response = await fetch('/api/krosswordle/levels', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: level.id }),
      });
      const data = await response.json();
      if (data.success) {
        showMessage('Level silindi', 'success');
        await loadLevels();
      } else {
        showMessage(data.error || 'Xəta baş verdi', 'error');
      }
    } catch (error) {
      showMessage('Server xətası', 'error');
    }
  }

  function handleGridClick(x: number, y: number) {
    newX = x;
    newY = y;
  }

  async function generateWithAI() {
    if (!editingLevel || isGenerating) return;
    isGenerating = true;
    try {
      const response = await fetch('/api/krosswordle/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wordCount: aiWordCount,
          theme: aiTheme.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (data.success && data.words) {
        editingLevel.words = data.words;
        selectedWordIdx = null;
        showMessage(`AI ${data.words.length} söz yaratdı!`, 'success');
      } else {
        showMessage(data.error || 'AI xətası baş verdi', 'error');
      }
    } catch (error) {
      showMessage('AI serverlə əlaqə qurula bilmədi', 'error');
    }
    isGenerating = false;
  }

  async function bulkGenerateMonth() {
    if (isBulkGenerating) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const emptyDates: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${monthKey}-${String(d).padStart(2, '0')}`;
      // Keçmiş günləri keç — yalnız bu gün və gələcək günlər üçün yarat
      if (dateStr < todayStr) continue;
      if (!levelsByDate.has(dateStr)) emptyDates.push(dateStr);
    }
    if (emptyDates.length === 0) {
      showMessage('Gələcək günlər üçün boş gün yoxdur!', 'success');
      return;
    }
    const okBulk = await confirmDialog({
      title: 'AI ilə toplu yaradılma',
      message: `${emptyDates.length} boş gün üçün (bu gündən etibarən) AI ilə level yaradılsın?`,
      confirmLabel: 'Yarat',
      cancelLabel: 'Ləğv et',
      variant: 'neutral',
    });
    if (!okBulk) return;
    isBulkGenerating = true;
    bulkTotal = emptyDates.length;
    bulkProgress = 0;
    let successCount = 0;

    for (const dateStr of emptyDates) {
      try {
        // AI ilə söz yarat
        const genRes = await fetch('/api/krosswordle/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wordCount: 4 }),
        });
        const genData = await genRes.json();
        if (genData.success && genData.words) {
          // Level-i saxla
          const day = parseInt(dateStr.split('-')[2]);
          const saveRes = await fetch('/api/krosswordle/levels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              levelNumber: day,
              words: genData.words,
              isActive: true,
              playDate: dateStr,
            }),
          });
          const saveData = await saveRes.json();
          if (saveData.success) successCount++;
        }
      } catch (e) {
        console.error(`${dateStr} üçün xəta:`, e);
      }
      bulkProgress++;
    }

    await loadLevels();
    showMessage(`${successCount}/${emptyDates.length} gün üçün level yaradıldı!`, successCount > 0 ? 'success' : 'error');
    isBulkGenerating = false;
  }

  function prevMonth() {
    if (currentMonth === 0) { currentMonth = 11; currentYear--; }
    else currentMonth--;
  }

  function nextMonth() {
    if (currentMonth === 11) { currentMonth = 0; currentYear++; }
    else currentMonth++;
  }

  function goToToday() {
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth();
  }
</script>

<div class="p-4 sm:p-6 lg:p-8">
  <!-- Header -->
  <div class="sm:flex sm:items-center sm:justify-between mb-8">
    <div>
      <h2 class="text-xl sm:text-2xl font-nouvelr-bold text-slate-900">KrossWordle Təqvimi</h2>
      <p class="mt-1 text-sm text-base-500">Hər gün üçün level idarə edin</p>
    </div>
  </div>

  <!-- Message -->
  {#if message}
    <div class="mb-4 p-3 rounded-lg text-sm font-medium {messageType === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}">
      {message}
    </div>
  {/if}

  {#if showEditor && editingLevel}
    <!-- Level Editor -->
    <div class="bg-white rounded-xl border border-base-200 overflow-hidden shadow-sm">
      <!-- Editor Header -->
      <div class="px-4 py-5 sm:px-6 border-b border-base-200 bg-base-50/50 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <button
            onclick={closeEditor}
            class="cursor-pointer p-1.5 hover:bg-base-100 rounded-lg transition-colors"
          >
            <svg class="w-5 h-5 text-base-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h3 class="text-lg font-semibold text-slate-900">
              📅 {editingDate}
              {#if editingLevel.id}
                <span class="text-xs text-base-400 font-normal">(redaktə)</span>
              {:else}
                <span class="text-xs text-emerald-500 font-normal">(yeni)</span>
              {/if}
            </h3>
            <p class="text-xs text-base-500">{editingLevel.words.length} söz</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <label class="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" bind:checked={editingLevel.is_active} class="rounded border-base-300" />
            <span class="text-base-600">Aktiv</span>
          </label>
          <button
            onclick={saveLevel}
            disabled={isSaving || editingLevel.words.length === 0 || conflicts.size > 0 || outOfBounds.size > 0}
            class="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {#if isSaving}
              <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            {:else}
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M5 13l4 4L19 7" />
              </svg>
            {/if}
            Saxla
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-base-100">
        <!-- Sol: Grid + Formlar -->
        <div class="p-4">
          <h4 class="text-sm font-semibold text-slate-900 mb-3">Grid (7×7)</h4>
          <div class="inline-grid gap-1 bg-base-100 p-2 rounded-xl" style="grid-template-columns: repeat({GRID_SIZE}, 1fr);">
            {#each { length: GRID_SIZE } as _, y}
              {#each { length: GRID_SIZE } as _, x}
                {@const letter = grid[y]?.[x]}
                {@const cellKey = `${x}-${y}`}
                {@const isSelected = selectedCells.has(cellKey)}
                {@const isConflict = conflicts.has(cellKey)}
                {@const isStartPos = newX === x && newY === y && !newWord.trim()}
                {@const previewLetter = previewCells.get(cellKey)}
                {@const isPreview = !!previewLetter}
                {@const isPreviewConflict = isPreview && letter && letter !== previewLetter}
                <button
                  onclick={() => handleGridClick(x, y)}
                  class="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-lg text-sm font-bold uppercase transition-all cursor-pointer
                    {isConflict ? 'bg-red-500 text-white ring-2 ring-red-300' :
                     isPreviewConflict ? 'bg-orange-400 text-white ring-2 ring-orange-300 border-2 border-dashed border-orange-500' :
                     isPreview && !letter ? 'bg-violet-100 text-violet-600 border-2 border-dashed border-violet-400' :
                     isPreview && letter ? 'bg-violet-200 text-violet-700 border-2 border-dashed border-violet-400' :
                     isSelected ? 'bg-blue-500 text-white ring-2 ring-blue-300' :
                     isStartPos ? 'bg-amber-100 border-2 border-amber-400 text-amber-700' :
                     letter ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' :
                     'bg-white border border-base-200 text-base-300 hover:border-base-400'}"
                >
                  {previewLetter || letter || ''}
                </button>
              {/each}
            {/each}
          </div>

          {#if conflicts.size > 0}
            <p class="mt-2 text-xs text-red-600 font-medium">⚠ {conflicts.size} xanada hərf konflikti var!</p>
          {/if}
          {#if previewOutOfBounds}
            <p class="mt-2 text-xs text-orange-600 font-medium">⚠ Söz grid-dən kənara çıxır!</p>
          {/if}

          <!-- AI Generasiya -->
          <div class="mt-6 p-4 bg-white border border-base-200 rounded-xl shadow-sm">
            <h5 class="text-sm font-medium text-slate-900 mb-4 flex items-center gap-2">
              <span class="p-1 bg-purple-50 text-purple-600 rounded-md">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </span>
              Süni İntellektlə Yarat
            </h5>
            <div class="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label for="ai-count" class="block text-xs font-medium text-base-700 mb-1">Söz sayı</label>
                <select id="ai-count" bind:value={aiWordCount} class="block w-full border border-base-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none bg-white">
                  {#each [2,3,4,5,6] as n}
                    <option value={n}>{n} söz</option>
                  {/each}
                </select>
              </div>
              <div>
                <label for="ai-theme" class="block text-xs font-medium text-base-700 mb-1">Mövzu</label>
                <input id="ai-theme" type="text" bind:value={aiTheme} placeholder="Məsələn: meyvələr..." class="block w-full border border-base-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none bg-white" />
              </div>
            </div>
            <button
              onclick={generateWithAI}
              disabled={isGenerating}
              class="cursor-pointer w-full py-2 bg-slate-100 text-slate-800 text-sm font-medium rounded-lg hover:bg-slate-200 focus:ring-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {#if isGenerating}
                <div class="w-4 h-4 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin"></div>
                Yaradılır...
              {:else}
                Süni İntellektlə Yarat
              {/if}
            </button>
            {#if editingLevel.words.length > 0}
              <p class="mt-2 text-xs text-amber-600 font-medium text-center">⚠ Mövcud sözlər əvəz olunacaq</p>
            {/if}
          </div>

          <!-- Söz əlavə/redaktə -->
          <div class="mt-4 p-4 rounded-xl border shadow-sm transition-colors {editingWordIdx >= 0 ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-base-200'}">
            <div class="flex items-center justify-between mb-4">
              <h5 class="text-sm font-medium {editingWordIdx >= 0 ? 'text-amber-800' : 'text-slate-900'}">
                {editingWordIdx >= 0 ? `Söz #${editingWordIdx + 1} Redaktə edilir` : 'Yeni Söz Əlavə Et'}
              </h5>
              {#if editingWordIdx >= 0}
                <button onclick={cancelEdit} class="cursor-pointer text-xs px-2.5 py-1 rounded-md bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 shadow-sm transition-colors">
                  Ləğv et
                </button>
              {/if}
            </div>
            <div class="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label for="new-word" class="block text-xs font-medium text-base-700 mb-1">Söz</label>
                <input id="new-word" type="text" bind:value={newWord} placeholder="ALMA" class="block w-full border border-base-300 rounded-lg px-3 py-2 text-sm uppercase focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none bg-white" />
              </div>
              <div>
                <label for="new-clue" class="block text-xs font-medium text-base-700 mb-1">İpucu Yazısı</label>
                <input id="new-clue" type="text" bind:value={newClue} placeholder="Qırmızı meyvə" class="block w-full border border-base-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none bg-white" />
              </div>
            </div>
            <div class="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label for="new-x" class="block text-xs font-medium text-base-700 mb-1">X Mövqeyi</label>
                <input id="new-x" type="number" bind:value={newX} min="0" max="6" class="block w-full border border-base-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none bg-white" />
              </div>
              <div>
                <label for="new-y" class="block text-xs font-medium text-base-700 mb-1">Y Mövqeyi</label>
                <input id="new-y" type="number" bind:value={newY} min="0" max="6" class="block w-full border border-base-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none bg-white" />
              </div>
              <div>
                <label for="new-dir" class="block text-xs font-medium text-base-700 mb-1">İstiqamət</label>
                <select id="new-dir" bind:value={newDirection} class="block w-full border border-base-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none bg-white">
                  <option value="H">→ Üfüqi</option>
                  <option value="V">↓ Şaquli</option>
                </select>
              </div>
            </div>
            {#if editingWordIdx >= 0}
              <div class="grid grid-cols-2 gap-3">
                <button onclick={updateWord} disabled={!newWord.trim() || !newClue.trim()} class="cursor-pointer w-full py-2 bg-amber-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Yenilə</button>
                <button onclick={cancelEdit} class="cursor-pointer w-full py-2 bg-white border border-base-300 text-base-700 text-sm font-medium rounded-lg shadow-sm hover:bg-base-50 transition-colors">Ləğv et</button>
              </div>
            {:else}
              <button onclick={addWord} disabled={!newWord.trim() || !newClue.trim()} class="cursor-pointer w-full py-2 bg-slate-900 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Siyahıya Əlavə Et</button>
            {/if}
          </div>
        </div>

        <!-- Sağ: Sözlər siyahısı -->
        <div class="p-4 sm:p-6 bg-base-50/30">
          <h4 class="text-base font-semibold text-slate-900 mb-4 flex items-center justify-between">
            Sözlərin Siyahısı
            <span class="bg-base-200 text-base-600 text-xs px-2 py-1 rounded-md font-medium">{editingLevel.words.length} <span class="hidden sm:inline">söz</span></span>
          </h4>
          {#if editingLevel.words.length === 0}
            <div class="text-center py-10 bg-white rounded-xl border border-dashed border-base-300">
              <svg class="mx-auto h-10 w-10 text-base-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <p class="text-sm font-medium text-slate-700">Hələ söz əlavə edilməyib</p>
              <p class="text-xs text-base-500 mt-1">AI ilə yaradın və ya özünüz əlavə edin</p>
            </div>
          {:else}
            <div class="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {#each editingLevel.words as wp, idx}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                  class="group flex items-start gap-3 p-3.5 rounded-xl border shadow-sm transition-all cursor-pointer bg-white
                    {outOfBounds.has(idx) ? 'border-red-200 bg-red-50/50' :
                     editingWordIdx === idx ? 'border-amber-300 bg-amber-50/50' :
                     selectedWordIdx === idx ? 'border-slate-400 bg-slate-50' :
                     'border-base-200 hover:border-slate-300 hover:shadow-md'}"
                  onclick={() => editWord(idx)}
                >
                  <span class="w-7 h-7 flex items-center justify-center rounded-lg {editingWordIdx === idx || selectedWordIdx === idx ? 'bg-slate-900 text-white' : 'bg-base-100 text-base-600'} text-xs font-semibold shrink-0 transition-colors">{wp.id}</span>
                  <div class="flex-1 min-w-0 pt-0.5">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="font-mono text-[14px] font-bold text-slate-900 tracking-wide">{wp.word}</span>
                      <span class="text-[11px] px-2 py-0.5 rounded-md {wp.direction === 'H' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'} font-medium">
                        {wp.direction === 'H' ? '→ Üfüqi' : '↓ Şaquli'} <span class="opacity-60 ml-0.5">({wp.x},{wp.y})</span>
                      </span>
                      {#if outOfBounds.has(idx)}
                        <span class="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">Kənarda!</span>
                      {/if}
                    </div>
                    <p class="text-sm text-base-600 truncate">{wp.clue}</p>
                  </div>
                  <button
                    onclick={(e) => { e.stopPropagation(); removeWord(idx); }}
                    class="cursor-pointer p-1.5 focus:outline-none focus:ring-2 focus:ring-red-500 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 transition-all self-center"
                    title="Sil"
                    aria-label="Sözü sil"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>

  {:else}
    <!-- Təqvim Görünüşü -->
    <div class="bg-white border border-base-200 rounded-xl overflow-hidden">
      <!-- Ay naviqasiyası -->
      <div class="px-5 py-5 sm:px-6 border-b border-base-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button onclick={prevMonth} class="cursor-pointer p-2 bg-white border border-base-200 hover:bg-base-50 rounded-lg transition-colors shadow-sm" aria-label="Əvvəlki ay">
          <svg class="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div class="text-center">
          <h3 class="text-lg font-semibold text-slate-900 tracking-tight">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h3>
          <p class="text-xs text-base-500 font-medium mt-1">
            {levels.length}/{daysInMonth} gün dolu
            {#if emptyDaysCount > 0}
              <span class="mx-1">•</span> <span class="text-amber-600">{emptyDaysCount} boş</span>
            {:else}
              <span class="mx-1">•</span> <span class="text-emerald-600">Tam!</span>
            {/if}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick={goToToday} class="cursor-pointer px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-base-300 hover:bg-base-50 rounded-lg transition-colors shadow-sm">
            Bu gün
          </button>
          <button onclick={nextMonth} class="cursor-pointer p-2 bg-white border border-base-200 hover:bg-base-50 rounded-lg transition-colors shadow-sm" aria-label="Növbəti ay">
            <svg class="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Bulk AI düyməsi -->
      {#if futureEmptyDaysCount > 0}
        <div class="px-5 py-4 bg-slate-50 border-b border-base-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-white border border-base-200 shadow-sm flex items-center justify-center shrink-0">
              <span class="text-sm">✨</span>
            </div>
            <div>
              <p class="text-sm font-semibold text-slate-900">Avtomatik Doldurma</p>
              <p class="text-xs text-slate-600 mt-0.5"><span class="font-medium text-slate-900">{futureEmptyDaysCount} boş günü</span> (bugündən etibarən) AI ilə yarat</p>
            </div>
          </div>
          <button
            onclick={bulkGenerateMonth}
            disabled={isBulkGenerating}
            class="cursor-pointer w-full sm:w-auto px-5 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {#if isBulkGenerating}
              <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              {bulkProgress}/{bulkTotal} Yüklənir
            {:else}
              Hamısını Yarat
            {/if}
          </button>
        </div>
      {/if}

      {#if isLoading}
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
      {:else}
        <!-- Həftə günləri -->
        <div class="grid grid-cols-7 border-b border-base-200 bg-base-50/50">
          {#each WEEKDAYS as day}
            <div class="py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{day}</div>
          {/each}
        </div>

        <!-- Təqvim günləri -->
        <div class="grid grid-cols-7 bg-base-200 gap-px border-b border-base-200">
          <!-- Boş xanalar (ayın ilk günündən əvvəl) -->
          {#each { length: firstDayOfWeek } as _}
            <div class="aspect-square bg-base-50/50"></div>
          {/each}

          <!-- Ayın günləri -->
          {#each { length: daysInMonth } as _, i}
            {@const day = i + 1}
            {@const dateStr = `${monthKey}-${String(day).padStart(2, '0')}`}
            {@const level = levelsByDate.get(dateStr)}
            {@const isToday = dateStr === today}
            {@const isPast = dateStr < today}
            <button
              onclick={() => openDayEditor(day)}
              class="cursor-pointer aspect-square p-2 bg-white flex flex-col items-center justify-start gap-1 transition-all hover:bg-slate-50 relative group
                {isToday ? 'ring-inset ring-2 ring-slate-900 z-10' : ''}"
            >
              <!-- Gün nömrəsi -->
              <span class="text-sm font-semibold {isToday ? 'text-slate-900' : isPast && !level ? 'text-red-400' : 'text-slate-700'}">
                {day}
              </span>

              <!-- Level statusu -->
              <div class="flex-1 flex flex-col items-center justify-center w-full">
                {#if level}
                  <div class="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center {level.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-base-100 text-base-500'} group-hover:scale-110 transition-transform">
                    <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span class="text-[9px] font-medium text-base-500 mt-1 hidden sm:block bg-base-50 px-1.5 py-0.5 rounded">{level.words.length} söz</span>
                {:else}
                  <div class="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-dashed {isPast ? 'border-red-200 bg-red-50/30 text-red-400' : 'border-base-200 text-base-300'} flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                    <svg class="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                {/if}
              </div>

              <!-- Bu gün marker -->
              {#if isToday}
                <div class="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-slate-900"></div>
              {/if}
            </button>
          {/each}
        </div>

        <!-- Altdakı legend -->
        <div class="px-5 py-4 bg-white flex flex-wrap gap-5 text-[11px] font-medium text-slate-600">
          <span class="flex items-center gap-2">
            <span class="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg class="w-2.5 h-2.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
            </span>
            Dolu Gün
          </span>
          <span class="flex items-center gap-2">
            <span class="w-4 h-4 rounded-full border-2 border-dashed border-base-200"></span>
            Boş Gün
          </span>
          <span class="flex items-center gap-2">
            <span class="w-4 h-4 rounded-full border-2 border-dashed border-red-200 bg-red-50/30"></span>
            Keçmiş Boş
          </span>
          <span class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-slate-900 ring-2 ring-slate-100 ring-offset-1"></span>
            Bu Gün
          </span>
        </div>
      {/if}
    </div>
  {/if}
</div>
