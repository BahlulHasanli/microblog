/**
 * Authentication ile fetch işlemi yapmak için yardımcı fonksiyon
 */

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Authentication token ile fetch işlemi yapar
 * @param url - İstek yapılacak URL
 * @param options - Fetch options
 * @returns Response
 */
export async function fetchWithAuth(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  // Eğer skipAuth true ise, normal fetch işlemi yap
  if (options.skipAuth) {
    return fetch(url, options);
  }

  // Default headers
  const headers = new Headers(options.headers || {});
  
  // Content-Type header'ı ekle (eğer yoksa)
  if (!headers.has("Content-Type") && options.method !== "GET") {
    headers.set("Content-Type", "application/json");
  }

  // Fetch işlemini yap
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // Cookie'leri gönder
  });

  return response;
}
