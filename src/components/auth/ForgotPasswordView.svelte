<script lang="ts">
import { navigate } from "astro:transitions/client";
import { Toaster, toast } from 'svelte-sonner'

interface Props {
  t: any;
}

let { t }: Props = $props();

const formState = $state.raw({
    email: "",
});

const isSubmitting = $state({
    value: false,
});

const isEmailSent = $state({
    value: false,
});

const handleSubmit = async (e: Event) => {
    e.preventDefault();
    e.stopPropagation();

    isSubmitting.value = true;

    try {
        const response = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              email: formState.email
            }),
        });

        const result = await response.json();

        if (response.ok) {
            toast.success(result.message || t.forms.forgotPassword.successMessage);
            isEmailSent.value = true;
            formState.email = "";
        } else {
            toast.error(result.message || t.forms.forgotPassword.errorMessage);
        }
    } catch (error) {
      console.error("Error:", error);
      toast.error(t.forms.forgotPassword.networkError);
    } finally {
      isSubmitting.value = false;
    }
}

const handleBackToSignIn = () => {
    navigate("/signin");
}

</script>

<Toaster position="top-center"/>
<section class="max-w-md mx-auto py-8 px-4 sm:px-0">
  <div class="bg-white rounded-lg p-4">
    <div class="text-center mb-6">
      <h1 class="text-xl font-big-shoulders font-bold text-base-900 mb-1">
        {t.forms.forgotPassword.title}
      </h1>
      <p class="text-base-600 text-sm">{t.forms.forgotPassword.subtitle}</p>
    </div>

    {#if !isEmailSent.value}
      <form id="forgotPasswordForm" class="space-y-5" onsubmit={handleSubmit}>
        <div> 
          <label  
            for="email"
            class="block text-xs font-medium text-base-700 mb-1"
          >
            {t.forms.forgotPassword.emailLabel}
          </label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder={t.forms.forgotPassword.emailPlaceholder}
            required
            bind:value={formState.email}
            class="w-full px-3 py-1.5 border border-base-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-transparent text-sm text-base-900 placeholder-base-400"
          />
        </div>

        <button 
          type="submit"
          disabled={isSubmitting.value}
          class="cursor-pointer w-full bg-rose-500 hover:bg-rose-600 text-white font-medium py-1.5 px-4 rounded-lg text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {#if isSubmitting.value}
            {t.forms.forgotPassword.submitting}
          {:else}
            {t.forms.forgotPassword.submitButton}
          {/if}
        </button> 
      </form>
    {:else}
      <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <p class="text-green-700 text-sm">
          {t.forms.forgotPassword.successInfo.replace('{email}', formState.email)}
        </p>
      </div>
    {/if}

    <div class="text-center mt-4 pt-3 border-t border-base-100">
      <p class="text-base-600 text-xs">
        <button
          type="button"
          onclick={handleBackToSignIn}
          class="text-rose-500 hover:text-rose-600 font-medium transition-colors cursor-pointer"
        >
          {t.forms.forgotPassword.backToSignIn}
        </button>
      </p>
    </div>
  </div>
</section>
