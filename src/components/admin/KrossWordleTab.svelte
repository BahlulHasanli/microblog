<script lang="ts">
  import { onMount } from 'svelte';

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
    if (!confirm(`${level.play_date} tarixindəki level silinsin?`)) return;
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
    if (!confirm(`${emptyDates.length} boş gün üçün (bu gündən etibarən) AI ilə level yaradılsın?`)) return;

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

<div class="p-4 sm:p-6">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
    <div>
      <h2 class="text-xl font-nouvelr-bold text-slate-900">KrossWordle Təqvimi</h2>
      <p class="text-sm text-base-500 mt-1">Hər gün üçün level idarə edin</p>
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
    <div class="bg-white border border-base-200 rounded-xl overflow-hidden">
      <!-- Editor Header -->
      <div class="p-4 border-b border-base-100 flex items-center justify-between">
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
          <div class="mt-4 p-3 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
            <h5 class="text-xs font-semibold text-purple-900 mb-2 uppercase tracking-wide flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              AI ilə Yarat
            </h5>
            <div class="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label class="text-[10px] text-purple-600 font-medium uppercase">Söz sayı</label>
                <select bind:value={aiWordCount} class="w-full px-2.5 py-1.5 text-sm border border-purple-200 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 outline-none">
                  {#each [2,3,4,5,6] as n}
                    <option value={n}>{n} söz</option>
                  {/each}
                </select>
              </div>
              <div>
                <label class="text-[10px] text-purple-600 font-medium uppercase">Mövzu</label>
                <input type="text" bind:value={aiTheme} placeholder="meyvələr..." class="w-full px-2.5 py-1.5 text-sm border border-purple-200 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
            </div>
            <button
              onclick={generateWithAI}
              disabled={isGenerating}
              class="cursor-pointer w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {#if isGenerating}
                <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Yaradılır...
              {:else}
                ✨ AI ilə Yarat
              {/if}
            </button>
            {#if editingLevel.words.length > 0}
              <p class="mt-1.5 text-[10px] text-purple-500 text-center">⚠ Mövcud sözlər əvəz olunacaq</p>
            {/if}
          </div>

          <!-- Söz əlavə/redaktə -->
          <div class="mt-4 p-3 rounded-xl border transition-colors {editingWordIdx >= 0 ? 'bg-amber-50 border-amber-300' : 'bg-base-50 border-base-200'}">
            <div class="flex items-center justify-between mb-2">
              <h5 class="text-xs font-semibold uppercase tracking-wide {editingWordIdx >= 0 ? 'text-amber-800' : 'text-slate-900'}">
                {editingWordIdx >= 0 ? `Söz #${editingWordIdx + 1} Redaktə` : 'Söz Əlavə Et'}
              </h5>
              {#if editingWordIdx >= 0}
                <button onclick={cancelEdit} class="cursor-pointer text-[10px] px-2 py-0.5 rounded bg-amber-200 text-amber-700 hover:bg-amber-300 transition-colors">
                  Ləğv et
                </button>
              {/if}
            </div>
            <div class="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label class="text-[10px] text-base-500 font-medium uppercase">Söz</label>
                <input type="text" bind:value={newWord} placeholder="ALMA" class="w-full px-2.5 py-1.5 text-sm border border-base-200 rounded-lg uppercase focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label class="text-[10px] text-base-500 font-medium uppercase">İpucu</label>
                <input type="text" bind:value={newClue} placeholder="Qırmızı meyvə" class="w-full px-2.5 py-1.5 text-sm border border-base-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div class="grid grid-cols-3 gap-2 mb-3">
              <div>
                <label class="text-[10px] text-base-500 font-medium uppercase">X</label>
                <input type="number" bind:value={newX} min="0" max="6" class="w-full px-2.5 py-1.5 text-sm border border-base-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label class="text-[10px] text-base-500 font-medium uppercase">Y</label>
                <input type="number" bind:value={newY} min="0" max="6" class="w-full px-2.5 py-1.5 text-sm border border-base-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label class="text-[10px] text-base-500 font-medium uppercase">İstiqamət</label>
                <select bind:value={newDirection} class="w-full px-2.5 py-1.5 text-sm border border-base-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="H">→ H</option>
                  <option value="V">↓ V</option>
                </select>
              </div>
            </div>
            {#if editingWordIdx >= 0}
              <div class="grid grid-cols-2 gap-2">
                <button onclick={updateWord} disabled={!newWord.trim() || !newClue.trim()} class="cursor-pointer w-full py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">✓ Yenilə</button>
                <button onclick={cancelEdit} class="cursor-pointer w-full py-2 bg-base-200 text-base-700 text-sm font-medium rounded-lg hover:bg-base-300 transition-colors">Ləğv et</button>
              </div>
            {:else}
              <button onclick={addWord} disabled={!newWord.trim() || !newClue.trim()} class="cursor-pointer w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Əlavə et</button>
            {/if}
          </div>
        </div>

        <!-- Sağ: Sözlər siyahısı -->
        <div class="p-4">
          <h4 class="text-sm font-semibold text-slate-900 mb-3">Sözlər ({editingLevel.words.length})</h4>
          {#if editingLevel.words.length === 0}
            <div class="text-center py-8 text-base-400">
              <p class="text-sm">Hələ söz əlavə edilməyib</p>
              <p class="text-xs mt-1">AI və ya manual əlavə edin</p>
            </div>
          {:else}
            <div class="space-y-1.5 max-h-[500px] overflow-y-auto">
              {#each editingLevel.words as wp, idx}
                <div
                  class="group flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer
                    {outOfBounds.has(idx) ? 'border-red-300 bg-red-50' :
                     editingWordIdx === idx ? 'border-amber-300 bg-amber-50' :
                     selectedWordIdx === idx ? 'border-blue-300 bg-blue-50' :
                     'border-base-200 bg-white hover:bg-base-50'}"
                  onclick={() => editWord(idx)}
                >
                  <span class="w-6 h-6 flex items-center justify-center rounded bg-base-100 text-[10px] font-bold text-base-600 shrink-0">{wp.id}</span>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="font-mono text-sm font-bold text-slate-900">{wp.word}</span>
                      <span class="text-[10px] px-1.5 py-0.5 rounded bg-base-100 text-base-500">
                        {wp.direction === 'H' ? '→' : '↓'} ({wp.x},{wp.y})
                      </span>
                      {#if outOfBounds.has(idx)}
                        <span class="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600">kənarda!</span>
                      {/if}
                    </div>
                    <p class="text-xs text-base-500 truncate">{wp.clue}</p>
                  </div>
                  <button
                    onclick={(e) => { e.stopPropagation(); removeWord(idx); }}
                    class="cursor-pointer p-1 hover:bg-red-100 rounded text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
      <div class="p-4 border-b border-base-100 flex items-center justify-between">
        <button onclick={prevMonth} class="cursor-pointer p-2 hover:bg-base-100 rounded-lg transition-colors">
          <svg class="w-5 h-5 text-base-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div class="text-center">
          <h3 class="text-lg font-semibold text-slate-900">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h3>
          <p class="text-xs text-base-500">
            {levels.length}/{daysInMonth} gün dolu
            {#if emptyDaysCount > 0}
              · <span class="text-amber-600">{emptyDaysCount} boş</span>
            {:else}
              · <span class="text-emerald-600">Tam!</span>
            {/if}
          </p>
        </div>
        <div class="flex items-center gap-1">
          <button onclick={goToToday} class="cursor-pointer px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            Bu gün
          </button>
          <button onclick={nextMonth} class="cursor-pointer p-2 hover:bg-base-100 rounded-lg transition-colors">
            <svg class="w-5 h-5 text-base-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Bulk AI düyməsi -->
      {#if futureEmptyDaysCount > 0}
        <div class="px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-sm">✨</span>
            <div>
              <p class="text-sm font-medium text-purple-900">Gələcək boş günləri doldur</p>
              <p class="text-[10px] text-purple-600">{futureEmptyDaysCount} gün üçün (bu gündən etibarən) AI ilə level yarat</p>
            </div>
          </div>
          <button
            onclick={bulkGenerateMonth}
            disabled={isBulkGenerating}
            class="cursor-pointer px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {#if isBulkGenerating}
              <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              {bulkProgress}/{bulkTotal}
            {:else}
              Hamısını yarat
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
        <div class="grid grid-cols-7 border-b border-base-100">
          {#each WEEKDAYS as day}
            <div class="py-2 text-center text-[10px] font-semibold text-base-500 uppercase">{day}</div>
          {/each}
        </div>

        <!-- Təqvim günləri -->
        <div class="grid grid-cols-7">
          <!-- Boş xanalar (ayın ilk günündən əvvəl) -->
          {#each { length: firstDayOfWeek } as _}
            <div class="aspect-square border-r border-b border-base-50"></div>
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
              class="cursor-pointer aspect-square p-1.5 border-r border-b border-base-50 flex flex-col items-center justify-start gap-0.5 transition-all hover:bg-base-50 relative group
                {isToday ? 'bg-blue-50' : ''}"
            >
              <!-- Gün nömrəsi -->
              <span class="text-sm font-semibold {isToday ? 'text-blue-600' : isPast && !level ? 'text-red-400' : 'text-slate-700'}">
                {day}
              </span>

              <!-- Level statusu -->
              {#if level}
                <div class="w-5 h-5 rounded-full flex items-center justify-center {level.is_active ? 'bg-emerald-500' : 'bg-base-300'}">
                  <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span class="text-[8px] text-base-500 hidden sm:block">{level.words.length} söz</span>
              {:else}
                <div class="w-5 h-5 rounded-full border-2 border-dashed {isPast ? 'border-red-300' : 'border-base-200'} flex items-center justify-center opacity-50 group-hover:opacity-100 transition-opacity">
                  <svg class="w-3 h-3 {isPast ? 'text-red-300' : 'text-base-300'}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              {/if}

              <!-- Bu gün marker -->
              {#if isToday}
                <div class="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-blue-500"></div>
              {/if}
            </button>
          {/each}
        </div>

        <!-- Altdakı legend -->
        <div class="p-3 border-t border-base-100 flex flex-wrap gap-4 text-[10px] text-base-500">
          <span class="flex items-center gap-1.5">
            <span class="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
              <svg class="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width={3} d="M5 13l4 4L19 7" /></svg>
            </span>
            Level var
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-4 h-4 rounded-full border-2 border-dashed border-base-200"></span>
            Boş
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-4 h-4 rounded-full border-2 border-dashed border-red-300"></span>
            Keçmiş (boş)
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-blue-500"></span>
            Bu gün
          </span>
        </div>
      {/if}
    </div>
  {/if}
</div>
