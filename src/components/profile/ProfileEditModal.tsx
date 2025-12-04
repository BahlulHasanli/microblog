import { useState } from "react";
import { supabase } from "@/db/supabase";

interface User {
  id: string;
  fullname: string;
  username: string;
  avatar: string;
  email: string;
}

interface ProfileEditModalProps {
  user: User;
  onClose: () => void;
  onUpdate: (user: User) => void;
}

export default function ProfileEditModal({
  user,
  onClose,
  onUpdate,
}: ProfileEditModalProps) {
  const [formData, setFormData] = useState({
    fullname: user.fullname || "",
    username: user.username || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Kullanıcı adının benzersiz olup olmadığını kontrol et
      if (formData.username !== user.username) {
        const { data: existingUser } = await supabase
          .from("users")
          .select("username")
          .eq("username", formData.username)
          .single();

        if (existingUser) {
          setError("Bu istifadəçi adı artıq istifadə olunur");
          setLoading(false);
          return;
        }
      }

      // Kullanıcı bilgilerini güncelle
      const { data, error } = await supabase
        .from("users")
        .update({
          fullname: formData.fullname,
          username: formData.username,
        })
        .eq("id", user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Başarılı mesajını göster ve ana bileşeni güncelle
      setSuccess(true);
      onUpdate({ ...user, ...data });

      // 1.5 saniye sonra modalı kapat
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Bir xəta baş verdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 relative shadow-2xl animate-slideUp">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 cursor-pointer right-6 text-base-400 hover:text-base-900 transition-colors p-1 hover:bg-base-100 rounded-lg"
          aria-label="Bağla"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="size-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </button>

        <h2 className="text-xl font-semibold text-base-800 mb-8">
          Profili redaktə et
        </h2>

        {success ? (
          <div className="bg-green-50 border border-green-200 text-green-700 px-5 py-4 rounded-xl mb-6 flex items-center gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="size-5 shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            <span className="font-medium text-base">
              Profiliniz uğurla yeniləndi!
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl mb-6 flex items-center gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="size-5 shrink-0"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                  />
                </svg>
                <span className="font-medium text-base">{error}</span>
              </div>
            )}

            <div className="mb-5">
              <label
                htmlFor="fullname"
                className="block text-[13px] font-semibold text-base-900 mb-2"
              >
                Ad Soyad
              </label>
              <input
                type="text"
                id="fullname"
                name="fullname"
                value={formData.fullname}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-base-300 rounded-xl text-sm
                focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all"
                placeholder="Adınızı daxil edin"
                required
              />
            </div>

            <div className="mb-8">
              <label
                htmlFor="username"
                className="block text-[13px] font-semibold text-base-900 mb-2"
              >
                İstifadəçi adı
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center text-sm pl-4 text-base-500 font-medium">
                  @
                </span>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full pl-8 pr-4 py-3 border border-base-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all"
                  placeholder="istifadechi_adi"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-2.5 py-2.5 text-sm cursor-pointer border border-base-300 rounded-xl text-base-700 font-medium hover:bg-base-50 hover:border-base-400 transition-all"
              >
                Ləğv et
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-2.5 py-2.5 text-sm cursor-pointer bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {loading ? "Yenilənir..." : "Yadda saxla"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
