<script lang="ts">
import { Toaster, toast } from 'svelte-sonner'

interface Props {
  isLoggedIn: boolean;
  userFullName?: string;
}

let { isLoggedIn = false, userFullName = "" }: Props = $props();

let formState = $state({
  name: userFullName,
  email: "",
  message: ""
});

const isSubmitting = $state({
  value: false,
});

const handleSubmit = async (e: Event) => {
  e.preventDefault();
  e.stopPropagation();

  // Validation
  if (!formState.name || formState.name.trim() === "") {
    toast.error("Ad soyad xanası boş ola bilməz");
    return;
  }

  if (!formState.email || formState.email.trim() === "") {
    toast.error("Email xanası boş ola bilməz");
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formState.email)) {
    toast.error("Düzgün email ünvanı daxil edin");
    return;
  }

  if (!formState.message || formState.message.trim() === "") {
    toast.error("Müraciət xanası boş ola bilməz");
    return;
  }

  isSubmitting.value = true;

  try {
    const response = await fetch('/api/vacancy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: formState.name,
        email: formState.email,
        message: formState.message
      })
    });

    const result = await response.json();

    if (response.ok) {
      toast.success(result.message || "Müraciətiniz uğurla göndərildi!");
      // Toast görünəndən sonra formu sıfırla
      setTimeout(() => {
        formState.name = userFullName;
        formState.email = "";
        formState.message = "";
      }, 100);
    } else {
      toast.error(result.message || "Bir xəta baş verdi");
    }
  } catch (error) {
    console.error("Error:", error);
    toast.error("Şəbəkə xətası baş verdi");
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<Toaster position="top-center"/>

<form class="mt-8 space-y-4" onsubmit={handleSubmit}>
  <!-- Ad Soyad (Yalnız giriş etməyənlər üçün) -->
  {#if !isLoggedIn}
    <div>
      <label for="name" class="block text-xs font-medium text-base-700 dark:text-base-300 mb-1">
        Ad Soyad
      </label>
      <input
        type="text"
        id="name"
        name="name"
        placeholder="Ad və soyadınızı daxil edin"
        required
        bind:value={formState.name}
        class="w-full px-3 py-1.5 border border-base-200 dark:border-base-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-transparent text-sm text-base-900 dark:text-base-50 placeholder-base-400 dark:placeholder-base-500 dark:bg-base-950"
      />
    </div>
  {/if}

  <!-- Email -->
  {#if !isLoggedIn}
    <div>
      <label for="email" class="block text-xs font-medium text-base-700 dark:text-base-300 mb-1">
        Email
      </label>
      <input
        type="email"
        id="email"
        name="email"
        placeholder="email@the99.az"
        required
        bind:value={formState.email}
        class="w-full px-3 py-1.5 border border-base-200 dark:border-base-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-transparent text-sm text-base-900 dark:text-base-50 placeholder-base-400 dark:placeholder-base-500 dark:bg-base-950"
      />
    </div>
  {/if}

  <!-- Müraciət -->
  <div>
    <label for="message" class="block text-xs font-medium text-base-700 dark:text-base-300 mb-1">
      Müraciət
    </label>
    <textarea
      id="message"
      name="message"
      placeholder="Özünüz haqqında məlumat verin..."
      required
      rows="6"
      bind:value={formState.message}
      class="w-full px-3 py-1.5 border border-base-200 dark:border-base-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-transparent text-sm text-base-900 dark:text-base-50 placeholder-base-400 dark:placeholder-base-500 dark:bg-base-950 resize-none"
    ></textarea>
  </div>

  <!-- Submit Button -->
  <div class="flex justify-end">
    <button
      type="submit"
      disabled={isSubmitting.value}
      class="cursor-pointer bg-rose-500 hover:bg-rose-600 text-white font-medium py-1.5 px-8 rounded-lg text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {#if isSubmitting.value}
        Göndərilir...
      {:else}
        Göndər
      {/if}
    </button>
  </div>
</form>
