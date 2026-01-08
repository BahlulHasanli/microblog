<script lang="ts">
  import { onMount } from 'svelte';
  import AlertModal from './AlertModal.svelte';
  import { uploadToBunny } from '@/lib/bunny-cdn';
  import { deleteFromBunny } from '@/lib/bunny-delete';

  interface Props {
    canEdit?: boolean;
  }

  const { canEdit = false }: Props = $props();

  interface Settings {
    site_title: string;
    site_description: string;
    site_keywords: string;
    og_image: string;
    x_handle: string;
    facebook_handle: string;
    google_analytics_id: string;
    posts_per_page: number;
    enable_comments: boolean;
    enable_registration: boolean;
  }

  let settings: Settings = $state({
    site_title: '',
    site_description: '',
    site_keywords: '',
    og_image: '',
    x_handle: '',
    facebook_handle: '',
    google_analytics_id: '',
    posts_per_page: 10,
    enable_comments: true,
    enable_registration: true,
  });

  let loading = $state(true);
  let saving = $state(false);
  let uploadingOgImage = $state(false);
  let ogImageUploadProgress = $state(0);
  let deletingOgImage = $state(false);
  let ogMediaFiles: string[] = $state([]);

  // Modal state
  let alertModal = $state({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info' as 'success' | 'error' | 'info' | 'warning'
  });

  onMount(() => {
    loadSettings();
    loadOgMediaFiles();
  });

  async function loadSettings() {
    try {
      loading = true;
      const response = await fetch("/api/admin/settings/get");
      const data = await response.json();

      if (data.success && data.settings) {
        settings = { ...settings, ...data.settings };
      }
    } catch (error) {
      console.error("Nizamlamalar yüklənərkən xəta:", error);
    } finally {
      loading = false;
    }
  }

  async function loadOgMediaFiles() {
    try {
      const response = await fetch("/api/bunny-list-files?folder=og-media");
      const data = await response.json();

      if (data.success && data.files) {
        ogMediaFiles = data.files.map((file: any) => file.url);
      }
    } catch (error) {
      console.error("OG media faylları yüklənərkən xəta:", error);
    }
  }

  function showAlert(message: string, variant: 'success' | 'error' | 'info' | 'warning' = 'info', title?: string) {
    alertModal = {
      isOpen: true,
      title: title || '',
      message,
      variant
    };
  }

  async function handleOgImageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    try {
      uploadingOgImage = true;
      ogImageUploadProgress = 0;

      const imageUrl = await uploadToBunny({
        file,
        folder: 'og-media',
        onProgress: (progress) => {
          ogImageUploadProgress = progress;
        }
      });

      settings.og_image = imageUrl;
      showAlert('OG şəkli uğurla yükləndi', 'success', 'Uğurlu');
      await loadOgMediaFiles();
    } catch (error) {
      console.error('OG şəkli yükləmə xətası:', error);
      showAlert(error instanceof Error ? error.message : 'Şəkil yükləmə xətası', 'error', 'Xəta');
    } finally {
      uploadingOgImage = false;
      ogImageUploadProgress = 0;
      input.value = '';
    }
  }

  async function handleDeleteOgImage(imageUrl: string) {
    try {
      deletingOgImage = true;
      const success = await deleteFromBunny({
        imageUrl,
        onSuccess: () => {
          ogMediaFiles = ogMediaFiles.filter(url => url !== imageUrl);
          if (settings.og_image === imageUrl) {
            settings.og_image = '';
          }
          showAlert('Şəkil uğurla silindi', 'success', 'Uğurlu');
        },
        onError: (error) => {
          showAlert(error || 'Şəkil silmə xətası', 'error', 'Xəta');
        }
      });
    } catch (error) {
      console.error('Şəkil silmə xətası:', error);
      showAlert(error instanceof Error ? error.message : 'Şəkil silmə xətası', 'error', 'Xəta');
    } finally {
      deletingOgImage = false;
    }
  }


  async function handleSave() {
    try {
      saving = true;
      const response = await fetch("/api/admin/settings/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (data.success) {
        showAlert("Nizamlamalar uğurla yadda saxlanıldı", 'success', 'Uğurlu');
      } else {
        showAlert(data.message || "Xəta baş verdi", 'error', 'Xəta');
      }
    } catch (error) {
      console.error("Saxlama xətası:", error);
      showAlert("Xəta baş verdi", 'error', 'Xəta');
    } finally {
      saving = false;
    }
  }
</script>

<div class="p-4 sm:p-6 lg:p-8">
  {#if loading}
    <div class="flex items-center justify-center py-16">
      <div class="flex flex-col items-center gap-3">
        <div class="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm text-base-600">Yüklənir...</p>
      </div>
    </div>
  {:else}
  <div class="w-full grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
    <div class="space-y-4 sm:space-y-6">
      <!-- SEO Bölməsi -->
      <div class="bg-white rounded-xl border border-base-100 p-6 sm:p-8">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <svg
              class="w-5 h-5 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <div>
            <h2 class="text-lg sm:text-xl font-nouvelr-bold text-slate-900">
              SEO Nizamlamaları
            </h2>
            <p class="text-xs sm:text-sm text-base-500 mt-0.5">
              Axtarış motorları üçün optimallaşdırma
            </p>
          </div>
        </div>

        <div class="space-y-5">
          <div>
            <label for="site_title" class="block text-sm font-medium text-base-700 mb-2">
              Sayt Başlığı
            </label>
            <input
              type="text"
              id="site_title"
              bind:value={settings.site_title}
              placeholder="Məsələn: Mənim Blogum"
              class="block w-full border border-base-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label for="site_description" class="block text-sm font-medium text-base-700 mb-2">
              Sayt Təsviri
            </label>
            <textarea
              id="site_description"
              bind:value={settings.site_description}
              rows="3"
              placeholder="Saytınızın qısa təsviri..."
              class="block w-full border border-base-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all resize-none"
            ></textarea>
            <p class="text-xs text-base-500 mt-1.5">
              Axtarış nəticələrində göstəriləcək
            </p>
          </div>

          <div>
            <label for="site_keywords" class="block text-sm font-medium text-base-700 mb-2">
              Açar Sözlər
            </label>
            <input
              type="text"
              id="site_keywords"
              bind:value={settings.site_keywords}
              placeholder="blog, texnologiya, proqramlaşdırma"
              class="block w-full border border-base-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
            />
            <p class="text-xs text-base-500 mt-1.5">
              Vergüllə ayırın
            </p>
          </div>

          <div>
            <label for="og_image" class="block text-sm font-medium text-base-700 mb-2">
              Sosial Media Şəkli (OG Image)
            </label>
            <div class="space-y-3">
              <div class="relative">
                <input
                  type="file"
                  id="og_image"
                  accept="image/*"
                  onchange={handleOgImageUpload}
                  disabled={uploadingOgImage}
                  class="hidden"
                />
                <label
                  for="og_image"
                  class="flex items-center justify-center w-full border-2 border-dashed border-base-300 rounded-lg px-4 py-6 cursor-pointer hover:border-slate-900 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  class:opacity-50={uploadingOgImage}
                  class:cursor-not-allowed={uploadingOgImage}
                >
                  <div class="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="mx-auto h-8 w-8 text-base-400 mb-2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15" />
                    </svg>

                    <p class="text-sm font-medium text-slate-900">
                      {#if uploadingOgImage}
                        Yüklənir... {ogImageUploadProgress}%
                      {:else}
                        Şəkil seçmək üçün klikləyin
                      {/if}
                    </p>
                    <p class="text-xs text-base-500 mt-1">PNG, JPG, GIF (Max 5MB)</p>
                  </div>
                </label>
              </div>

              {#if settings.og_image}
                <div class="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <img
                    src={settings.og_image}
                    alt=""
                    class="w-16 h-16 object-cover rounded-lg border border-base-200"
                  />
                  <div class="flex-1">
                    <p class="text-xs font-medium text-base-700 mb-1">Seçilmiş şəkil:</p>
                    <p class="text-xs text-base-500 break-all">{settings.og_image}</p>
                    <button
                      type="button"
                      onclick={() => { settings.og_image = ''; }}
                      class="text-xs text-red-600 hover:text-red-700 mt-2 font-medium"
                    >
                      Seçimi Sil
                    </button>
                  </div>
                </div>
              {/if}

              {#if ogMediaFiles.length > 0}
                <div class="mt-4">
                  <p class="text-xs font-medium text-base-700 mb-3">Yüklənmiş Şəkillər:</p>
                  <div class="grid grid-cols-3 gap-3">
                    {#each ogMediaFiles as imageUrl (imageUrl)}
                      <div class="relative group">
                        <button
                          type="button"
                          class="w-full h-24 p-0 border-0 rounded-lg overflow-hidden cursor-pointer hover:border-slate-900 transition-all"
                          class:ring-2={settings.og_image === imageUrl}
                          class:ring-blue-500={settings.og_image === imageUrl}
                        >
                          <img
                            src={imageUrl}
                            alt=""
                            class="w-full h-full object-cover"
                          />
                        </button>
                        <div class="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a
                            href={imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Blank səhifədə aç"
                            class="bg-blue-500 text-white p-1 rounded hover:bg-blue-600 transition-colors"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                          <button
                            type="button"
                            onclick={() => handleDeleteOgImage(imageUrl)}
                            disabled={deletingOgImage}
                            title="Şəkili sil"
                            aria-label="Şəkili sil"
                            class="bg-red-500 text-white p-1 rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                            </svg>
                          </button>
                        </div>
                        {#if settings.og_image === imageUrl}
                          <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg pointer-events-none">
                            <svg class="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                            </svg>
                          </div>
                        {/if}
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
            <p class="text-xs text-base-500 mt-1.5">
              Facebook, X və s. paylaşımlarda göstəriləcək
            </p>
          </div>
        </div>
      </div>

      <!-- Sosial Media Bölməsi -->
      <div class="bg-white rounded-xl border border-base-100 p-6 sm:p-8">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
            <svg
              class="w-5 h-5 text-purple-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
          </div>
          <div>
            <h2 class="text-lg sm:text-xl font-nouvelr-bold text-slate-900">
              Sosial Media
            </h2>
            <p class="text-xs sm:text-sm text-base-500 mt-0.5">
              Sosial media inteqrasiyaları
            </p>
          </div>
        </div>

        <div class="space-y-5">
          <div>
            <label for="x_handle" class="block text-sm font-medium text-base-700 mb-2">
              X.com İstifadəçi Adı
            </label>
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-base-500">
                @
              </span>
              <input
                type="text"
                id="x_handle"
                bind:value={settings.x_handle}
                placeholder="username"
                class="block w-full border border-base-300 rounded-lg pl-8 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label for="facebook_handle" class="block text-sm font-medium text-base-700 mb-2">
              Facebook İstifadəçi Adı
            </label>
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-base-500">
                @
              </span>
              <input
                type="text"
                id="facebook_handle"
                bind:value={settings.facebook_handle}
                placeholder="username"
                class="block w-full border border-base-300 rounded-lg pl-8 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>
      </div>

    </div>

    <div class="space-y-4 sm:space-y-6">
        <!-- Ümumi Nizamlamalar -->
      <div class="bg-white rounded-xl border border-base-100 p-6 sm:p-8">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
            <svg
              class="w-5 h-5 text-orange-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <div>
            <h2 class="text-lg sm:text-xl font-nouvelr-bold text-slate-900">
              Ümumi Nizamlamalar
            </h2>
            <p class="text-xs sm:text-sm text-base-500 mt-0.5">
              Sayt funksiyaları
            </p>
          </div>
        </div>

        <div class="space-y-5">
          <div>
            <label for="posts_per_page" class="block text-sm font-medium text-base-700 mb-2">
              Səhifə başına post sayı
            </label>
            <input
              type="number"
              id="posts_per_page"
              bind:value={settings.posts_per_page}
              min="1"
              max="50"
              class="block w-full sm:w-48 border border-base-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
            />
          </div>

          <div class="pt-2">
            <label class="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                bind:checked={settings.enable_comments}
                class="w-5 h-5 text-slate-900 border-base-300 rounded focus:ring-slate-900 cursor-pointer"
              />
              <div>
                <span class="text-sm font-medium text-slate-900 group-hover:text-slate-700">
                  Şərhləri aktiv et
                </span>
                <p class="text-xs text-base-500">
                  İstifadəçilər postlara şərh yaza bilərlər
                </p>
              </div>
            </label>
          </div>

          <div class="pt-2">
            <label class="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                bind:checked={settings.enable_registration}
                class="w-5 h-5 text-slate-900 border-base-300 rounded focus:ring-slate-900 cursor-pointer"
              />
              <div>
                <span class="text-sm font-medium text-slate-900 group-hover:text-slate-700">
                  Qeydiyyatı aktiv et
                </span>
                <p class="text-xs text-base-500">
                  Yeni istifadəçilər qeydiyyatdan keçə bilərlər
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>

            <!-- Analitika Bölməsi -->
            <div class="bg-white rounded-xl border border-base-100 p-6 sm:p-8">
              <div class="flex items-center gap-3 mb-6">
                <div class="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <svg
                    class="w-5 h-5 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 class="text-lg sm:text-xl font-nouvelr-bold text-slate-900">
                    Analitika
                  </h2>
                  <p class="text-xs sm:text-sm text-base-500 mt-0.5">
                    Ziyarətçi statistikası
                  </p>
                </div>
              </div>
      
              <div class="space-y-5">
                <div>
                  <label for="google_analytics_id" class="block text-sm font-medium text-base-700 mb-2">
                    Google Analytics ID
                  </label>
                  <input
                    type="text"
                    id="google_analytics_id"
                    bind:value={settings.google_analytics_id}
                    placeholder="G-XXXXXXXXXX"
                    class="block w-full border border-base-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>

    </div>
  </div>

  <!-- Saxla Düyməsi -->
  {#if canEdit}
    <div class="mt-6 flex justify-end">
      <button
        onclick={handleSave}
        disabled={saving}
        class="inline-flex cursor-pointer text-[13px] items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {#if saving}
          <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          Saxlanılır...
        {:else}
          Dəyişiklikləri Saxla
        {/if}
      </button>
    </div>
  {/if}

  {/if}
</div>

<!-- Modal -->
<AlertModal
  bind:isOpen={alertModal.isOpen}
  title={alertModal.title}
  message={alertModal.message}
  variant={alertModal.variant}
  onClose={() => {}}
/>
