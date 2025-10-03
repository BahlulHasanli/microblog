<script lang="ts">
import { navigate } from "astro:transitions/client";
import toast, { Toaster } from 'svelte-french-toast';

 const formState = $state.raw({
    email: "",
    password: "",
    remember: false
 });

 const isSubmitting = $state({
    value: false,
 }); 

 const handleSubmit = async (e: Event) => {
    e.preventDefault();
    e.stopPropagation();

    // Set isSubmitting to true
    isSubmitting.value = true;

    try {
        const response = await fetch('http://localhost:4321/api/auth/signin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              email: formState.email, 
              password: formState.password,
              remember: formState.remember
            }),
        });

        const result = await response.json();

        if (response.ok) {
            toast.success(result.message || "Uğurla daxil oldunuz!");

            setTimeout(() => {
                navigate("/"); 
            }, 500);
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

  
</script>

<Toaster />
<section class="max-w-md mx-auto py-12 px-4 sm:px-0">
  <div class="bg-white rounded-lg p-6">
    <div class="text-center mb-6">
      <h1 class="text-2xl font-big-shoulders font-bold text-base-900 mb-1">
        Daxil Ol
      </h1>
      <p class="text-base-600 text-sm">Hesabınıza daxil olun</p>
    </div>

    <form id="signinForm" class="space-y-5" onsubmit={handleSubmit}>
      <div> 
        <label  
          for="email"
          class="block text-sm font-medium text-base-700 mb-1"
        >
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          placeholder="email@example.com"
          required
          bind:value={formState.email}
          class="w-full px-4 py-2 border border-base-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-transparent text-base-900 placeholder-base-400"
        />
      </div>

      <div> 
        <label
          for="password"
          class="block text-sm font-medium text-base-700 mb-1"
        >
          Şifre
        </label>
        <input
          type="password"
          id="password"
          name="password"
          placeholder="Şifrənizi daxil edin"
          required
          bind:value={formState.password}
          class="w-full px-4 py-2 border border-base-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-transparent text-base-900 placeholder-base-400"
        />
      </div>

      <div class="flex items-center justify-between">
        <label for="remember" class="flex items-center cursor-pointer">
          <input
            type="checkbox"
            id="remember"
            name="remember"
            bind:checked={formState.remember}
            class="w-4 h-4 text-rose-500 bg-white border-base-300 rounded focus:ring-1 focus:ring-rose-500"
          />
          <span class="ml-2 text-sm text-base-600">Məni xatırla</span>
        </label> 
        <a
          href="/forgot-password"
          class="text-sm text-rose-500 hover:text-rose-600 transition-colors"
        >
          Şifrəni unutdun?
        </a>
      </div>

      <button 
        type="submit"
        disabled={isSubmitting.value}
        class="w-full bg-rose-500 hover:bg-rose-600 text-white font-medium py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {#if isSubmitting.value}
          Daxil olunur...
        {:else}
          Daxil Ol
        {/if}
      </button> 
    </form>

    <div class="text-center mt-6 pt-5 border-t border-base-100">
      <p class="text-base-600 text-sm">
        Hesabınız yoxdur?
        <a
          href="/signup"
          class="text-rose-500 hover:text-rose-600 font-medium transition-colors"
        >
          Qeydiyyatdan keçin
        </a>
      </p>
    </div>
  </div>
</section>