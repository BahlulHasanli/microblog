import { useState, useEffect } from "react";

export default function SigninView() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignin = async (e: React.FormEvent<HTMLFormElement>) => {
    // Formun varsayılan davranışını engelle
    e.preventDefault();
    e.stopPropagation();
    console.log("Form gönderiliyor...");

    // Form gönderimini başlat
    setIsSubmitting(true);
    setMessage({ text: "", type: "" });

    try {
      // API isteği gönder
      const response = await fetch("/api/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        credentials: "include", // Cookie'lerin gönderilmesini sağla
      });

      const result = await response.json();
      console.log("API yanıtı:", result);

      if (response.ok) {
        // Başarılı giriş
        setMessage({
          text: result.message || "Uğurla daxil oldunuz!",
          type: "success",
        });

        // Ana sayfaya yönlendir
        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
      } else {
        // Hata
        setMessage({
          text: result.message || "Bir xəta baş verdi",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Giriş hatası:", error);
      setMessage({ text: "Şəbəkə xətası baş verdi", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="max-w-md mx-auto py-12">
      {/* Başlık */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-big-shoulders font-bold text-base-900 mb-2">
          Daxil Ol
        </h1>
        <p className="text-base-600 text-sm">Hesabınıza daxil olun</p>
      </div>

      {/* Form */}
      <form id="signinForm" className="space-y-6" onSubmit={handleSignin}>
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-base-900 mb-2"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="email@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-base-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all duration-200 text-base-900 placeholder-base-400"
          />
        </div>

        {/* Şifre */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-base-900 mb-2"
          >
            Şifre
          </label>
          <input
            type="password"
            id="password"
            name="password"
            placeholder="Şifrənizi daxil edin"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-base-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all duration-200 text-base-900 placeholder-base-400"
          />
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <label htmlFor="remember" className="flex items-center">
            <input
              type="checkbox"
              id="remember"
              name="remember"
              className="w-4 h-4 text-rose-500 bg-white border-base-300 rounded focus:ring-rose-500 focus:ring-2"
            />
            <span className="ml-2 text-sm text-base-600">Məni xatırla</span>
          </label>
          <a
            href="/forgot-password"
            className="text-sm text-rose-500 hover:text-rose-600 transition-colors duration-200"
          >
            Şifrəni unutdun?
          </a>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`cursor-pointer w-full bg-rose-500 hover:bg-rose-600 text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 ${
            isSubmitting ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          {isSubmitting ? "Giriş edilir..." : "Daxil Ol"}
        </button>

        {/* Error/Success Messages */}
        {message.text && (
          <div
            className={`p-3 rounded-xl text-sm font-medium ${
              message.type === "success"
                ? "bg-green-100 text-green-800 border border-green-200"
                : "bg-red-100 text-red-800 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}
      </form>

      {/* Signup Link */}
      <div className="text-center mt-6">
        <p className="text-base-600 text-sm">
          Hesabınız yoxdur?{" "}
          <a
            href="/signup"
            className="text-rose-500 hover:text-rose-600 font-medium transition-colors duration-200"
          >
            Qeydiyyatdan keçin
          </a>
        </p>
      </div>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-base-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-base-500">və ya</span>
        </div>
      </div>

      {/* Social Login Buttons */}
      <div className="space-y-3">
        <button
          type="button"
          className="w-full flex items-center justify-center px-4 py-3 border border-base-200 rounded-xl text-base-700 bg-white hover:bg-base-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google ilə daxil ol
        </button>

        <button
          type="button"
          className="w-full flex items-center justify-center px-4 py-3 border border-base-200 rounded-xl text-base-700 bg-white hover:bg-base-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
        >
          <svg className="w-5 h-5 mr-2" fill="#1877F2" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Facebook ilə daxil ol
        </button>
      </div>
    </section>
  );
}
