<script lang="ts">
  import { onMount } from 'svelte';
  import AlertModal from './AlertModal.svelte';
  import { uploadToBunny } from '@/lib/bunny-cdn';
  import { deleteFromBunny } from '@/lib/bunny-delete';

  interface Props {
    canEdit?: boolean;
  }

  const { canEdit = false }: Props = $props();

  interface SponsorBanner {
    id?: number;
    title: string;
    description: string;
    image_url: string;
    banner_url: string;
    is_active: boolean;
    click_count: number;
  }

  let banners: SponsorBanner[] = $state([]);
  let newBanner: SponsorBanner = $state({
    title: '',
    description: '',
    image_url: '',
    banner_url: '',
    is_active: true,
    click_count: 0,
  });

  let loading = $state(true);
  let saving = $state(false);
  let uploadingImage = $state(false);
  let uploadProgress = $state(0);
  let editingId: number | null = $state(null);

  let alertModal = $state({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info' as 'success' | 'error' | 'info' | 'warning'
  });

  onMount(() => {
    loadBanners();
  });

  function showAlert(message: string, variant: 'success' | 'error' | 'info' | 'warning' = 'info', title?: string) {
    alertModal = {
      isOpen: true,
      title: title || '',
      message,
      variant
    };
  }

  async function loadBanners() {
    try {
      loading = true;
      const response = await fetch('/api/admin/sponsor-banners/list');
      const data = await response.json();

      if (data.success && Array.isArray(data.banners)) {
        banners = data.banners;
      } else {
        showAlert('Bannerləri yükləmə xətası: ' + (data.message || 'Bilinməyən xəta'), 'error', 'Xəta');
      }
    } catch (error) {
      showAlert('Reklam bannerləri yüklənərkən xəta baş verdi', 'error', 'Xəta');
    } finally {
      loading = false;
    }
  }

  async function handleImageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    try {
      uploadingImage = true;
      uploadProgress = 0;

      const imageUrl = await uploadToBunny({
        file,
        folder: 'sponsor-banner',
        onProgress: (progress) => {
          uploadProgress = progress;
        }
      });

      newBanner.image_url = imageUrl;
      showAlert('Reklam şəkli uğurla yükləndi', 'success', 'Uğurlu');
    } catch (error) {
      console.error('Reklam şəkli yükləmə xətası:', error);
      showAlert(error instanceof Error ? error.message : 'Şəkil yükləmə xətası', 'error', 'Xəta');
    } finally {
      uploadingImage = false;
      uploadProgress = 0;
      input.value = '';
    }
  }

  async function handleDeleteImage() {
    if (!newBanner.image_url) return;

    try {
      uploadingImage = true;
      const success = await deleteFromBunny({
        imageUrl: newBanner.image_url,
        onSuccess: () => {
          newBanner.image_url = '';
        }
      });

      if (success) {
        showAlert('Reklam şəkli uğurla silindi', 'success', 'Uğurlu');
      }
    } catch (error) {
      console.error('Reklam şəkli silmə xətası:', error);
      showAlert(error instanceof Error ? error.message : 'Şəkil silmə xətası', 'error', 'Xəta');
    } finally {
      uploadingImage = false;
    }
  }

  async function handleAddBanner() {
    if (!newBanner.title || !newBanner.image_url || !newBanner.banner_url) {
      showAlert('Başlıq, şəkil və URL doldurulmalıdır', 'error', 'Xəta');
      return;
    }

    try {
      saving = true;
      const response = await fetch('/api/admin/sponsor-banners/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBanner),
      });

      const data = await response.json();

      if (data.success) {
        showAlert('Reklam banneri uğurla əlavə edildi', 'success', 'Uğurlu');
        newBanner = {
          title: '',
          description: '',
          image_url: '',
          banner_url: '',
          is_active: true,
          position: 0,
        };
        loadBanners();
      } else {
        showAlert(data.message || 'Xəta baş verdi', 'error', 'Xəta');
      }
    } catch (error) {
      console.error('Reklam banneri əlavə xətası:', error);
      showAlert('Xəta baş verdi', 'error', 'Xəta');
    } finally {
      saving = false;
    }
  }

  function copyBannerUrl(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      showAlert('Link kopyalandı', 'success', 'Uğurlu');
    }).catch(() => {
      showAlert('Link kopyalama xətası', 'error', 'Xəta');
    });
  }

  async function handleDeleteBanner(id: number) {
    try {
      saving = true;
      const response = await fetch('/api/admin/sponsor-banners/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (data.success) {
        showAlert('Reklam banneri uğurla silindi', 'success', 'Uğurlu');
        loadBanners();
      } else {
        showAlert(data.message || 'Xəta baş verdi', 'error', 'Xəta');
      }
    } catch (error) {
      console.error('Reklam banneri silmə xətası:', error);
      showAlert('Xəta baş verdi', 'error', 'Xəta');
    } finally {
      saving = false;
    }
  }

  async function handleToggleBanner(id: number, isActive: boolean) {
    try {
      const response = await fetch('/api/admin/sponsor-banners/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !isActive }),
      });

      const data = await response.json();

      if (data.success) {
        loadBanners();
      }
    } catch (error) {
      console.error('Reklam banneri yeniləmə xətası:', error);
    }
  }
</script>

<div class="p-6 sm:p-8">
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="inline-block">
          <div class="w-8 h-8 border-4 border-base-200 border-t-slate-900 rounded-full animate-spin"></div>
        </div>
        <p class="mt-4 text-sm text-base-600">Yüklənir...</p>
      </div>
    </div>
  {:else}
    <div class="max-w-6xl">
      <div class="mb-8">
        <h2 class="text-2xl font-nouvelr-bold text-slate-900 mb-2">Sponsor Bannerləri</h2>
        <p class="text-base-600">Saytın ana səhifəsində post siyahısında göstərilən sponsorlu reklam bannerləri idarə edin.</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Yeni Banner Əlavə Et -->
        <div class="lg:col-span-1">
          <div class="bg-white rounded-xl border border-base-100 p-6 sticky top-6">
            <h3 class="text-lg font-medium text-slate-900 mb-4">Yeni Banner</h3>
            
            <div class="space-y-4">
              <div>
                <label for="new_title" class="block text-xs font-medium text-base-700 mb-1">
                  Başlıq
                </label>
                <input
                  type="text"
                  id="new_title"
                  bind:value={newBanner.title}
                  placeholder="Sponsor adı"
                  class="block w-full border border-base-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label for="new_description" class="block text-xs font-medium text-base-700 mb-1">
                  Açıqlama
                </label>
                <textarea
                  id="new_description"
                  bind:value={newBanner.description}
                  placeholder="Bannerin açıqlaması"
                  rows="2"
                  class="block w-full border border-base-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all resize-none"
                ></textarea>
              </div>

              <div>
                <label for="new_url" class="block text-xs font-medium text-base-700 mb-1">
                  URL
                </label>
                <input
                  type="url"
                  id="new_url"
                  bind:value={newBanner.banner_url}
                  placeholder="https://example.com"
                  class="block w-full border border-base-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label for="new_image" class="block text-xs font-medium text-base-700 mb-2">
                  Şəkil
                </label>
                <input
                  type="file"
                  id="new_image"
                  accept="image/*"
                  onchange={handleImageUpload}
                  disabled={uploadingImage}
                  class="hidden"
                />
                <label
                  for="new_image"
                  class="flex items-center justify-center w-full border-2 border-dashed border-base-300 rounded-lg px-3 py-4 cursor-pointer hover:border-slate-900 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  class:opacity-50={uploadingImage}
                  class:cursor-not-allowed={uploadingImage}
                >
                  <div class="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="mx-auto h-6 w-6 text-base-400 mb-1">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15" />
                    </svg>
                    <p class="text-xs font-medium text-slate-900">
                      {#if uploadingImage}
                        Yüklənir... {uploadProgress}%
                      {:else}
                        Şəkil seçin
                      {/if}
                    </p>
                  </div>
                </label>
              </div>

              {#if newBanner.image_url}
                <div class="flex items-start gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <img
                    src={newBanner.image_url}
                    alt=""
                    class="w-12 h-12 object-cover rounded border border-base-200"
                  />
                  <div class="flex-1 min-w-0">
                    <p class="text-xs text-base-600 truncate">{newBanner.image_url.split('/').pop()}</p>
                    <button
                      type="button"
                      onclick={handleDeleteImage}
                      disabled={uploadingImage}
                      class="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              {/if}

              <!-- <div class="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-blue-600 flex-shrink-0">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                </svg>
                <p class="text-blue-700">Kliklənmə sayı avtomatik olaraq artacaq</p>
              </div> -->

              <button
                type="button"
                onclick={handleAddBanner}
                disabled={saving || !canEdit}
                class="cursor-pointer w-full px-4 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {#if saving}
                  Əlavə edilir...
                {:else}
                  Əlavə Et
                {/if}
              </button>
            </div>
          </div>
        </div>

        <!-- Bannerlərin Siyahısı -->
        <div class="lg:col-span-2">
          {#if banners.length === 0}
            <div class="bg-base-50 rounded-xl border border-base-100 p-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="mx-auto h-12 w-12 text-base-400 mb-3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p class="text-base-600">Hələ ki, sponsor banneri yoxdur</p>
            </div>
          {:else}
            <div class="space-y-4">
              {#each banners as banner (banner.id)}
                <div class="bg-white rounded-xl border border-base-100 p-4 flex gap-4">
                  <img
                    src={banner.image_url}
                    alt={banner.title}
                    class="w-20 h-20 object-cover rounded-lg border border-base-200"
                  />
                  
                  <div class="flex-1">
                    <div class="flex items-start justify-between mb-2">
                      <div>
                        <h4 class="font-medium text-slate-900">{banner.title}</h4>
                        {#if banner.description}
                          <p class="text-xs text-base-600 mt-1 line-clamp-2">{banner.description}</p>
                        {/if}
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onclick={() => copyBannerUrl(banner.banner_url)}
                      class="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium mb-2 block cursor-pointer"
                    >
                      Linki kopyala
                    </button>
                    
                    <div class="flex items-center gap-4 mb-3">
                      <div class="flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6 text-base-400">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59" />
                        </svg>
                        <span class="text-xs font-medium text-base-600">{banner.click_count} kliklənmə</span>
                      </div>
                    </div>
                    
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        onclick={() => handleToggleBanner(banner.id || 0, banner.is_active)}
                        class="px-3 py-1 cursor-pointer rounded-lg text-xs font-medium transition-colors"
                        class:bg-green-100={!banner.is_active}
                        class:text-green-700={!banner.is_active}
                        class:bg-slate-300={banner.is_active}
                        class:text-slate-700={banner.is_active}
                      >
                        {banner.is_active ? 'Deaktiv et' : 'Aktiv et'}
                      </button>
                      <button
                        type="button"
                        onclick={() => handleDeleteBanner(banner.id || 0)}
                        disabled={saving}
                        class="cursor-pointer text-xs bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50 px-3 py-1 rounded-lg"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<AlertModal
  bind:isOpen={alertModal.isOpen}
  title={alertModal.title}
  message={alertModal.message}
  variant={alertModal.variant}
  onClose={() => {}}
/>
