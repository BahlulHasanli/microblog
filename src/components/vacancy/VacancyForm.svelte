<script lang="ts">
import { Toaster, toast } from 'svelte-sonner'

interface Props {
  isLoggedIn: boolean;
  userFullName?: string;
  t: any;
}

let { isLoggedIn = false, userFullName = "", t }: Props = $props();

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
    toast.error(t.forms.vacancy.errorNameRequired);
    return;
  }

  if (!formState.email || formState.email.trim() === "") {
    toast.error(t.forms.vacancy.errorEmailRequired);
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formState.email)) {
    toast.error(t.forms.vacancy.errorEmailInvalid);
    return;
  }

  if (!formState.message || formState.message.trim() === "") {
    toast.error(t.forms.vacancy.errorMessageRequired);
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
      toast.success(result.message || t.forms.vacancy.successMessage);
      // Toast görünəndən sonra formu sıfırla
      setTimeout(() => {
        formState.name = userFullName;
        formState.email = "";
        formState.message = "";
      }, 100);
    } else {
      toast.error(result.message || t.forms.vacancy.errorMessage);
    }
  } catch (error) {
    console.error("Error:", error);
    toast.error(t.forms.vacancy.networkError);
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
      <label for="name" class="block text-xs font-medium text-base-700 mb-1">
        {t.forms.vacancy.nameLabel}
      </label>
      <input
        type="text"
        id="name"
        name="name"
        placeholder={t.forms.vacancy.namePlaceholder}
        required
        bind:value={formState.name}
        class="w-full px-3 py-1.5 border border-base-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-transparent text-sm text-base-900 placeholder-base-400"
      />
    </div>
  {/if}

  <!-- Email -->
  {#if !isLoggedIn}
    <div>
      <label for="email" class="block text-xs font-medium text-base-700 mb-1">
        {t.forms.vacancy.emailLabel}
      </label>
      <input
        type="email"
        id="email"
        name="email"
        placeholder={t.forms.vacancy.emailPlaceholder}
        required
        bind:value={formState.email}
        class="w-full px-3 py-1.5 border border-base-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-transparent text-sm text-base-900 placeholder-base-400"
      />
    </div>
  {/if}

  <!-- Müraciət -->
  <div>
    <label for="message" class="block text-xs font-medium text-base-700 mb-1">
      {t.forms.vacancy.messageLabel}
    </label>
    <textarea
      id="message"
      name="message"
      placeholder={t.forms.vacancy.messagePlaceholder}
      required
      rows="6"
      bind:value={formState.message}
      class="w-full px-3 py-1.5 border border-base-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-transparent text-sm text-base-900 placeholder-base-400 resize-none"
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
        {t.forms.vacancy.submitting}
      {:else}
        {t.forms.vacancy.submitButton}
      {/if}
    </button>
  </div>
</form>
