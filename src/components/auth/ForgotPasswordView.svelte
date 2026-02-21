<script lang="ts">
import { navigate } from "astro:transitions/client";
import { Toaster, toast } from 'svelte-sonner'

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
            toast.success(result.message || "Şifirə sıfırlama linki email-ə göndərildi!");
            isEmailSent.value = true;
            formState.email = "";
        } else {
            toast.error(result.message || "Bir xəta baş verdi");
        }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Şəbəkə xətası baş verdi");
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
  <div class="bg-white dark:bg-base-900 rounded-lg p-4">
    <div class="text-center mb-6">
      <h1 class="text-xl font-big-shoulders font-bold text-base-900 dark:text-base-50 mb-1">
        Şifrəni Sıfırla
      </h1>
      <p class="text-base-600 dark:text-base-400 text-sm">Şifrənizi sıfırlamaq üçün email ünvanınızı daxil edin</p>
    </div>

    {#if !isEmailSent.value}
      <form id="forgotPasswordForm" class="space-y-5" onsubmit={handleSubmit}>
        <div> 
          <label  
            for="email"
            class="block text-xs font-medium text-base-700 dark:text-base-300 mb-1"
          >
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

        <button 
          type="submit"
          disabled={isSubmitting.value}
          class="cursor-pointer w-full bg-rose-500 hover:bg-rose-600 text-white font-medium py-1.5 px-4 rounded-lg text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {#if isSubmitting.value}
            Göndərilir...
          {:else}
            Sıfırlama linki göndər
          {/if}
        </button> 
      </form>
    {:else}
      <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-lg p-4 mb-6">
        <p class="text-green-700 dark:text-green-400 text-sm">
          Şifirə sıfırlama linki <strong>{formState.email}</strong> email ünvanına göndərildi. Lütfən email-inizi yoxlayın.
        </p>
      </div>
    {/if}

    <div class="text-center mt-4 pt-3 border-t border-base-100 dark:border-base-800">
      <p class="text-base-600 dark:text-base-400 text-xs">
        <button
          type="button"
          onclick={handleBackToSignIn}
          class="text-rose-500 hover:text-rose-600 font-medium transition-colors cursor-pointer"
        >
          Daxil ol səhifəsinə qayıt
        </button>
      </p>
    </div>
  </div>
</section>
