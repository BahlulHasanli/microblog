<script lang="ts">
import { Toaster, toast } from 'svelte-sonner'

interface Props {
  isLoggedIn: boolean;
  userFullName?: string;
  t: any;
}

let { isLoggedIn = false, userFullName = "", t }: Props = $props();

let formState = $state({
  fullName: userFullName,
  email: "",
  subject: "",
  message: ""
});

const isSubmitting = $state({
  value: false,
});

const handleSubmit = async (e: Event) => {
  e.preventDefault();
  e.stopPropagation();

  // Validation
  if (!isLoggedIn) {
    if (!formState.fullName || formState.fullName.trim() === "") {
      toast.error(t.forms.contact.errorNameRequired);
      return;
    }

    if (!formState.email || formState.email.trim() === "") {
      toast.error(t.forms.contact.errorEmailRequired);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formState.email)) {
      toast.error(t.forms.contact.errorEmailInvalid);
      return;
    }
  }

  if (!formState.subject || formState.subject.trim() === "") {
    toast.error(t.forms.contact.errorSubjectRequired);
    return;
  }

  if (!formState.message || formState.message.trim() === "") {
    toast.error(t.forms.contact.errorMessageRequired);
    return;
  }

  isSubmitting.value = true;

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName: isLoggedIn ? userFullName : formState.fullName,
        email: isLoggedIn ? "" : formState.email,
        subject: formState.subject,
        message: formState.message
      })
    });

    const result = await response.json();

    if (response.ok) {
      toast.success(result.message || t.forms.contact.successMessage);
      // Toast görünəndən sonra formu sıfırla
      setTimeout(() => {
        formState.fullName = userFullName;
        formState.email = "";
        formState.subject = "";
        formState.message = "";
      }, 100);
    } else {
      toast.error(result.message || t.forms.contact.errorMessage);
    }
  } catch (error) {
    console.error("Error:", error);
    toast.error(t.forms.contact.networkError);
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<Toaster position="top-center"/>

<form class="space-y-4" onsubmit={handleSubmit}>
  <!-- Ad Soyad (Yalnız giriş etməyənlər üçün) -->
  {#if !isLoggedIn}
    <div>
      <label for="fullName" class="block text-xs font-medium text-base-700 mb-1">
        {t.forms.contact.nameLabel}
      </label>
      <input
        type="text"
        id="fullName"
        name="fullName"
        placeholder={t.forms.contact.namePlaceholder}
        required
        bind:value={formState.fullName}
        class="w-full px-3 py-1.5 border border-base-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-transparent text-sm text-base-900 placeholder-base-400"
      />
    </div>
  {/if}

  <!-- Email -->
  {#if !isLoggedIn}
    <div>
      <label for="email" class="block text-xs font-medium text-base-700 mb-1">
        {t.forms.contact.emailLabel}
      </label>
      <input
        type="email"
        id="email"
        name="email"
        placeholder={t.forms.contact.emailPlaceholder}
        required
        bind:value={formState.email}
        class="w-full px-3 py-1.5 border border-base-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-transparent text-sm text-base-900 placeholder-base-400"
      />
    </div>
  {/if}

  <!-- Mövzu -->
  <div>
    <label for="subject" class="block text-xs font-medium text-base-700 mb-1">
      {t.forms.contact.subjectLabel}
    </label>
    <select
      id="subject"
      name="subject"
      required
      bind:value={formState.subject}
      class="cursor-pointer w-full px-3 py-1.5 border border-base-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-transparent text-sm text-base-900 bg-white"
    >
      <option value="" disabled>{t.forms.contact.subjectPlaceholder}</option>
      <option value="teklif">{t.forms.contact.subjectSuggestion}</option>
      <option value="shikayet">{t.forms.contact.subjectComplaint}</option>
      <option value="emekdasliq">{t.forms.contact.subjectCollaboration}</option>
      <option value="diger">{t.forms.contact.subjectOther}</option>
    </select>
  </div>

  <!-- Müraciət Mətni -->
  <div>
    <label for="message" class="block text-xs font-medium text-base-700 mb-1">
      {t.forms.contact.messageLabel}
    </label>
    <textarea
      id="message"
      name="message"
      placeholder={t.forms.contact.messagePlaceholder}
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
        {t.forms.contact.submitting}
      {:else}
        {t.forms.contact.submitButton}
      {/if}
    </button>
  </div>
</form>
