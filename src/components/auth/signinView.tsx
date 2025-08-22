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
          className={`cursor-pointer w-full bg-rose-500 hover:bg-rose-600 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 ${
            isSubmitting ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          {isSubmitting ? (
            <div>
              <span className="loader"></span>
            </div>
          ) : (
            "Daxil Ol"
          )}
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
    </section>
  );
}
