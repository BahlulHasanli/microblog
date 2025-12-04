/**
 * Client-side authentication yoxlaması
 * Səhifə yüklənəndə və hər 5 dəqiqədə bir session-ı yoxlayır
 */

let checkInterval: NodeJS.Timeout | null = null;

async function checkAuthStatus() {
  try {
    const response = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      // Session bitibsə, səhifəni yenilə
      if (response.status === 401) {
        console.log("Session expired, reloading page...");
        window.location.reload();
      }
    }
  } catch (error) {
    console.error("Auth check error:", error);
  }
}

// Səhifə yüklənəndə yoxla
if (typeof window !== "undefined") {
  // İlk yoxlama 2 saniyə sonra
  setTimeout(checkAuthStatus, 2000);

  // Hər 5 dəqiqədə bir yoxla
  checkInterval = setInterval(checkAuthStatus, 5 * 60 * 1000);

  // Səhifə bağlananda interval-ı təmizlə
  window.addEventListener("beforeunload", () => {
    if (checkInterval) {
      clearInterval(checkInterval);
    }
  });
}
