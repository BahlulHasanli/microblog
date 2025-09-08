<script lang="ts">
import { navigate } from "astro:transitions/client";
import toast, { Toaster } from 'svelte-french-toast';

 const formState = $state.raw({
    email: "",
    password: "",
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
            body: JSON.stringify({ email: formState.email, password: formState.password }),
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
<section class="max-w-md mx-auto py-12">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-big-shoulders font-bold text-base-900 mb-2">
        Daxil Ol
      </h1>
      <p class="text-base-600 text-sm">Hesabınıza daxil olun</p>
    </div>

    <form id="signinForm" class="space-y-6" onsubmit={handleSubmit}>
      <div> 
        <label  
          for="email"
          class="block text-sm font-medium text-base-900 mb-2"
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
          class="w-full px-4 py-3 border border-base-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all duration-200 text-base-900 placeholder-base-400"
        />
      </div>

      <div> 
        <label
          for="password"
          class="block text-sm font-medium text-base-900 mb-2"
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
          class="w-full px-4 py-3 border border-base-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all duration-200 text-base-900 placeholder-base-400"
        />
      </div>

      <div class="flex items-center justify-between">
        <label for="remember" class="flex items-center">
          <input
            type="checkbox"
            id="remember"
            name="remember"
            class="w-4 h-4 text-rose-500 bg-white border-base-300 rounded focus:ring-rose-500 focus:ring-2"
          />
          <span class="ml-2 text-sm text-base-600">Məni xatırla</span>
        </label> 
        <a
          href="/forgot-password"
          class="text-sm text-rose-500 hover:text-rose-600 transition-colors duration-200"
        >
          Şifrəni unutdun?
        </a>
      </div>

      <button 
        type="submit"
        disabled={isSubmitting.value}
        class="cursor-pointer w-full bg-rose-500 hover:bg-rose-600 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
      >
        {#if isSubmitting.value}
            <div>
                <span class="loader"></span>
            </div>
        {:else}
            Daxil Ol
        {/if}
      </button> 
    </form>

    <div class="text-center mt-6">
      <p class="text-base-600 text-sm">
        Hesabınız yoxdur?
        <a
          href="/signup"
          class="text-rose-500 hover:text-rose-600 font-medium transition-colors duration-200"
        >
          Qeydiyyatdan keçin
        </a>
      </p>
    </div>
  </section>