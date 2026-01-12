<script lang="ts">
import { navigate } from "astro:transitions/client";
import { Toaster, toast } from 'svelte-sonner'
import { createClient } from '@supabase/supabase-js'

const supabaseClient = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL, 
  import.meta.env.PUBLIC_SUPABASE_KEY
);

 const formState = $state.raw({
    email: "",
    password: "",
    remember: false
 });

 const isSubmitting = $state({
    value: false,
 }); 

 const isGoogleLoading = $state({
    value: false,
 });

 const isAppleLoading = $state({
    value: false,
 });

 const handleGoogleSignIn = async () => {
    isGoogleLoading.value = true;
    
    try {
      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error(error.message || "Google ilə giriş xətası");
        isGoogleLoading.value = false;
      }
    } catch (error) {
      console.error("Google sign in error:", error);
      toast.error("Şəbəkə xətası baş verdi");
      isGoogleLoading.value = false;
    }
 };

 const handleAppleSignIn = async () => {
    isAppleLoading.value = true;
    
    try {
      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error(error.message || "Apple ilə giriş xətası");
        isAppleLoading.value = false;
      }
    } catch (error) {
      console.error("Apple sign in error:", error);
      toast.error("Şəbəkə xətası baş verdi");
      isAppleLoading.value = false;
    }
 };

 const handleSubmit = async (e: Event) => {
    e.preventDefault();
    e.stopPropagation();

    // Set isSubmitting to true
    isSubmitting.value = true;

    try {
        const response = await fetch('/api/auth/signin', {
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

<Toaster position="top-center"/>
<section class="max-w-md mx-auto py-8 px-4 sm:px-0">
  <div class="bg-white rounded-lg p-4">
    <div class="text-center mb-6">
      <h1 class="text-xl md:text-3xl font-big-shoulders font-bold text-base-900 mb-1">
        Daxil Ol
      </h1>
      <p class="text-base-600 text-sm">Hesabınıza daxil olun</p>
    </div>

    <form id="signinForm" class="space-y-5" onsubmit={handleSubmit}>
      <div> 
        <label  
          for="email"
          class="block text-xs font-medium text-base-700 mb-1"
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
          class="w-full px-3 py-1.5 border border-base-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-transparent text-sm text-base-900 placeholder-base-400"
        />
      </div>

      <div> 
        <label
          for="password"
          class="block text-xs font-medium text-base-700 mb-1"
        >
          Şifrə
        </label>
        <input
          type="password"
          id="password"
          name="password"
          placeholder="Şifrənizi daxil edin"
          required
          bind:value={formState.password}
          class="w-full px-3 py-1.5 border border-base-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-transparent text-sm text-base-900 placeholder-base-400"
        />
      </div>

      <div class="flex items-center justify-end">
        <a
          href="/forgot-password"
          class="text-xs text-rose-500 hover:text-rose-600 transition-colors"
        >
          Şifrəni unutdun?
        </a>
      </div>

      <button 
        type="submit"
        disabled={isSubmitting.value}
        class="cursor-pointer w-full bg-rose-500 hover:bg-rose-600 text-white font-medium py-1.5 px-4 rounded-lg text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-70 disabled:cursor-not-allowed"
      > 
        {#if isSubmitting.value}
          Daxil olunur...
        {:else}
          Daxil Ol
        {/if}
      </button> 
    </form>

    <div class="relative my-5">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-base-200"></div>
      </div>
      <div class="relative flex justify-center text-xs">
        <span class="bg-white px-2 text-base-500">və ya</span>
      </div>
    </div>

    <button
      type="button"
      onclick={handleGoogleSignIn}
      disabled={isGoogleLoading.value}
      class="cursor-pointer w-full flex items-center justify-center gap-2 bg-white border border-base-200 hover:bg-base-50 text-base-700 font-medium py-1.5 px-4 rounded-lg text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-base-300 disabled:opacity-70 disabled:cursor-not-allowed"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      {#if isGoogleLoading.value}
        Yüklənir...
      {:else}
        Google ilə daxil ol
      {/if}
    </button>

    <button
      type="button"
      onclick={handleAppleSignIn}
      disabled={true}
      class="w-full flex items-center justify-center gap-2 bg-base-300 text-base-500 font-medium py-1.5 px-4 rounded-lg text-sm opacity-50 cursor-not-allowed mt-2"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
      </svg>
      Apple ilə daxil ol (Tezliklə)
    </button>

    <div class="text-center mt-4 pt-3 border-t border-base-100">
      <p class="text-base-600 text-xs">
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